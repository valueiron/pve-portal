/**
 * AI Service — OpenRouter streaming API wrapper
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_SYSTEM_PROMPT =
  'You are an AI assistant embedded in PVE Portal, an infrastructure management platform. ' +
  'You have access to tools to manage virtual machines, Docker containers, Kubernetes workloads, ' +
  'VyOS networking, DNS, labs, storage, networking resources, tickets, and Kanban boards. ' +
  'Always confirm destructive actions before executing them. ' +
  'Present data in clean tables or lists when appropriate.';

export function modelSupportsTools() {
  return true;
}

/**
 * Parse <tool_call> XML blocks that some models emit as plain text instead of
 * structured delta.tool_calls.
 *
 * Handles:
 *   <tool_call>{"name": "fn", "arguments": {...}}</tool_call>
 *   <tool_call><function=name><parameter=key>value</parameter></function></tool_call>
 *   <tool_call><function=pve.vm.list></function></tool_call>   (dot-notation names)
 */
function resolveToolName(raw, knownNames) {
  if (knownNames.includes(raw)) return raw;

  // Normalize dots/hyphens to underscores and try direct match
  const normalized = raw.replace(/[.\-]/g, '_').toLowerCase();
  if (knownNames.includes(normalized)) return normalized;

  // Word-level matching — split on both '.' and '_'
  const rawWords = raw.split(/[._]/).filter(Boolean);
  let bestName = null;
  let bestScore = 0;
  for (const name of knownNames) {
    const nameWords = name.split('_');
    // Count words that match exactly or are substrings of each other (e.g. vm ↔ vms)
    const overlap = rawWords.filter(rw =>
      nameWords.some(nw => nw === rw || nw.startsWith(rw) || rw.startsWith(nw))
    ).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      bestName = name;
    }
  }
  return bestName || raw;
}

function parseTextToolCalls(content, tools = []) {
  const toolCalls = [];
  const knownNames = tools.map(t => t.function?.name).filter(Boolean);

  const cleanContent = content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, (match) => {
      // JSON body: <tool_call>{"name":..., "arguments":...}</tool_call>
      const jsonMatch = match.match(/<tool_call>\s*(\{[\s\S]*\})\s*<\/tool_call>/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const rawName = parsed.name || parsed.function || '';
          if (rawName) {
            toolCalls.push({
              id: `tc_text_${Date.now()}_${toolCalls.length}`,
              type: 'function',
              function: {
                name: resolveToolName(rawName, knownNames),
                arguments: JSON.stringify(parsed.arguments ?? parsed.parameters ?? {}),
              },
            });
          }
        } catch { /* ignore malformed JSON */ }
        return '';
      }

      // XML attribute format: <function=name><parameter=key>value</parameter></function>
      const funcMatch = match.match(/<function=([^>\s/]+)/);
      if (!funcMatch) return '';
      const rawName = funcMatch[1].trim();

      const args = {};
      const paramRegex = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;
      let pm;
      while ((pm = paramRegex.exec(match)) !== null) {
        const key = pm[1].trim();
        const val = pm[2].trim();
        if (val === 'true') args[key] = true;
        else if (val === 'false') args[key] = false;
        else if (val !== '' && !isNaN(val)) args[key] = Number(val);
        else args[key] = val;
      }

      toolCalls.push({
        id: `tc_text_${Date.now()}_${toolCalls.length}`,
        type: 'function',
        function: {
          name: resolveToolName(rawName, knownNames),
          arguments: JSON.stringify(args),
        },
      });
      return '';
    })
    .trim();

  return { cleanContent, toolCalls };
}

async function doStreamRequest({ apiKey, model, messages, tools, onChunk, onToolCall, signal }) {
  const useTools = tools && tools.length > 0 && modelSupportsTools(model);
  const body = {
    model,
    messages,
    stream: true,
    ...(useTools ? { tools, tool_choice: 'auto' } : {}),
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'PVE Portal AI',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = err.error?.metadata?.raw || err.error?.message || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullContent = '';
  let displayedLength = 0; // track how many chars have been forwarded to onChunk
  const toolCallMap = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      // Surface errors embedded in the SSE stream
      if (parsed.error) {
        const detail = parsed.error?.metadata?.raw || parsed.error?.message || JSON.stringify(parsed.error);
        throw new Error(detail);
      }

      const delta = parsed.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        fullContent += delta.content;

        // Stop forwarding content once a <tool_call> block starts streaming in —
        // we'll parse and execute it properly at the end instead of showing raw XML.
        const toolCallPos = fullContent.indexOf('<tool_call>');
        const displayUpTo = toolCallPos >= 0 ? toolCallPos : fullContent.length;
        if (displayUpTo > displayedLength) {
          onChunk?.(fullContent.slice(displayedLength, displayUpTo));
          displayedLength = displayUpTo;
        }
      }

      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index ?? 0;
          if (!toolCallMap[idx]) {
            toolCallMap[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          }
          const tc = toolCallMap[idx];
          if (tcDelta.id) tc.id += tcDelta.id;
          if (tcDelta.function?.name) tc.function.name += tcDelta.function.name;
          if (tcDelta.function?.arguments) tc.function.arguments += tcDelta.function.arguments;
        }
      }
    }
  }

  // Prefer structured (OpenAI-format) tool calls
  const structuredToolCalls = Object.values(toolCallMap);
  if (structuredToolCalls.length > 0) {
    onToolCall?.(structuredToolCalls);
    return { content: fullContent, toolCalls: structuredToolCalls };
  }

  // Fallback: parse <tool_call> XML emitted as text content
  if (fullContent.includes('<tool_call>')) {
    const { cleanContent, toolCalls: textToolCalls } = parseTextToolCalls(fullContent, tools ?? []);
    if (textToolCalls.length > 0) {
      onToolCall?.(textToolCalls);
      return { content: cleanContent, toolCalls: textToolCalls };
    }
  }

  return { content: fullContent, toolCalls: [] };
}

/**
 * Stream a chat completion from OpenRouter.
 *
 * @param {object} opts
 * @param {string}   opts.apiKey       OpenRouter API key
 * @param {string}   opts.model        Model ID (e.g. "anthropic/claude-3.5-sonnet")
 * @param {Array}    opts.messages     Full conversation history
 * @param {Array}    [opts.tools]      OpenAI function-calling tool definitions
 * @param {Function} opts.onChunk      Called with each text delta string
 * @param {Function} opts.onToolCall   Called with completed tool call objects
 * @param {AbortSignal} [opts.signal]  Optional abort signal
 * @returns {Promise<{content: string, toolCalls: Array}>}
 */
export async function streamChat({ apiKey, model, messages, tools, onChunk, onToolCall, signal }) {
  try {
    return await doStreamRequest({ apiKey, model, messages, tools, onChunk, onToolCall, signal });
  } catch (err) {
    // If the error looks like a tool-calling incompatibility, retry without tools
    const msg = err.message || '';
    const isToolError =
      msg.includes('tool') ||
      msg.includes('function') ||
      msg.includes('Provider returned error') ||
      msg.includes('not supported');

    if (isToolError && tools && tools.length > 0 && modelSupportsTools(model)) {
      // Mark model as not supporting tools for this session and retry
      NO_TOOLS_MODELS.add(model);
      onChunk?.('\n\n*Note: this model does not support tool use — answering without portal API access.*\n\n');
      return await doStreamRequest({ apiKey, model, messages, tools: [], onChunk, onToolCall, signal });
    }

    throw err;
  }
}
