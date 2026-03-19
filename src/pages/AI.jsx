import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaRobot, FaCog, FaPaperPlane, FaEye, FaEyeSlash, FaChevronDown, FaChevronRight, FaWrench, FaTimes } from 'react-icons/fa';
import { streamChat, DEFAULT_SYSTEM_PROMPT } from '../services/aiService';
import { AI_TOOLS, executeTool } from '../services/aiTools';
import './AI.css';

const MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-chat',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'stepfun/step-3.5-flash:free',
  'minimax/minimax-m2.5:free',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToolCallBlock({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
  } catch {
    args = toolCall.function.arguments;
  }

  return (
    <div className="ai-tool-block">
      <button className="ai-tool-header" onClick={() => setExpanded(v => !v)}>
        <FaWrench className="ai-tool-icon" />
        <span className="ai-tool-name">{toolCall.function.name}</span>
        {expanded ? <FaChevronDown className="ai-tool-chevron" /> : <FaChevronRight className="ai-tool-chevron" />}
      </button>
      {expanded && (
        <div className="ai-tool-body">
          <div className="ai-tool-section-label">Arguments</div>
          <pre className="ai-tool-pre">{JSON.stringify(args, null, 2)}</pre>
          {toolCall.result !== undefined && (
            <>
              <div className="ai-tool-section-label">Result</div>
              <pre className="ai-tool-pre ai-tool-result">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';

  if (!isUser && !isAssistant) return null;

  return (
    <div className={`ai-message ai-message--${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="ai-message-avatar">
          <FaRobot />
        </div>
      )}
      <div className="ai-message-bubble">
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="ai-tool-calls">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallBlock key={tc.id || i} toolCall={tc} />
            ))}
          </div>
        )}
        {msg.content && (
          isUser
            ? <div className="ai-message-text">{msg.content}</div>
            : <div className="ai-message-text">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
        )}
        {msg.isStreaming && !msg.content && (
          <div className="ai-typing">
            <span /><span /><span />
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [systemPrompt, setSystemPrompt] = useState(
    settings.systemPrompt || DEFAULT_SYSTEM_PROMPT
  );
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave({ apiKey, model, systemPrompt });
  };

  return (
    <div className="ai-settings-backdrop" onClick={onClose}>
      <div className="ai-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="ai-settings-header">
          <h3>AI Settings</h3>
          <button className="ai-settings-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="ai-settings-body">
          <label className="ai-settings-label">
            OpenRouter API Key
            <div className="ai-settings-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="ai-settings-input"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-..."
              />
              <button
                className="ai-settings-eye"
                onClick={() => setShowKey(v => !v)}
                type="button"
              >
                {showKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </label>

          <label className="ai-settings-label">
            Model
            <select
              className="ai-settings-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="ai-settings-label">
            System Prompt
            <textarea
              className="ai-settings-textarea"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={5}
            />
          </label>
        </div>

        <div className="ai-settings-footer">
          <button className="ai-settings-save" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AI Page
// ---------------------------------------------------------------------------

export default function AI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    apiKey: localStorage.getItem('ai-openrouter-key') || '',
    model: localStorage.getItem('ai-model') || 'anthropic/claude-3.5-sonnet',
    systemPrompt: localStorage.getItem('ai-system-prompt') || DEFAULT_SYSTEM_PROMPT,
  });
  const [showSettings, setShowSettings] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ai-openrouter-key', newSettings.apiKey);
    localStorage.setItem('ai-model', newSettings.model);
    localStorage.setItem('ai-system-prompt', newSettings.systemPrompt);
    setShowSettings(false);
  };

  // Run one turn of the conversation (may loop for tool calls)
  const runConversation = useCallback(async (conversationMessages) => {
    if (!settings.apiKey) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Please configure your OpenRouter API key in settings (gear icon) to get started.',
        },
      ]);
      setIsLoading(false);
      return;
    }

    // Build API messages (strip UI-only fields)
    const apiMessages = [
      { role: 'system', content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ...conversationMessages.map(m => {
        if (m.role === 'assistant') {
          const msg = { role: 'assistant', content: m.content || '' };
          if (m.toolCalls && m.toolCalls.length > 0) {
            msg.tool_calls = m.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.function.name, arguments: tc.function.arguments },
            }));
          }
          return msg;
        }
        return { role: m.role, content: m.content, tool_call_id: m.tool_call_id };
      }),
    ];

    // Add a streaming assistant message placeholder
    const assistantMsgId = Date.now();
    setMessages(prev => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    let accContent = '';
    let finalToolCalls = [];

    try {
      const result = await streamChat({
        apiKey: settings.apiKey,
        model: settings.model,
        messages: apiMessages,
        tools: AI_TOOLS,
        signal: controller.signal,
        onChunk: (chunk) => {
          accContent += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: accContent }
                : m
            )
          );
        },
        onToolCall: (tcs) => {
          finalToolCalls = tcs;
        },
      });

      // Finalize the assistant message
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: result.content, toolCalls: finalToolCalls, isStreaming: false }
            : m
        )
      );

      // If there are tool calls, execute them and continue
      if (finalToolCalls.length > 0) {
        const toolResults = [];

        // Execute each tool and collect results
        for (const tc of finalToolCalls) {
          let toolResult;
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            toolResult = await executeTool(tc.function.name, args);
          } catch (err) {
            toolResult = { error: err.message };
          }

          // Attach result to the tool call for display
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    toolCalls: m.toolCalls?.map(t =>
                      t.id === tc.id ? { ...t, result: toolResult } : t
                    ),
                  }
                : m
            )
          );

          toolResults.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }

        // Build updated conversation with tool results and recurse
        const updatedConversation = [
          ...conversationMessages,
          {
            role: 'assistant',
            content: result.content || '',
            toolCalls: finalToolCalls,
          },
          ...toolResults,
        ];

        await runConversation(updatedConversation);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    await runConversation(updatedMessages);
  }, [input, isLoading, messages, runConversation]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const hasApiKey = Boolean(settings.apiKey);

  return (
    <div className="ai-page">
      {/* Top bar */}
      <div className="ai-topbar">
        <div className="ai-topbar-title">
          <FaRobot className="ai-topbar-icon" />
          <span>AI Assistant</span>
        </div>
        <div className="ai-topbar-controls">
          <select
            className="ai-model-select"
            value={settings.model}
            onChange={e => {
              const m = e.target.value;
              setSettings(s => ({ ...s, model: m }));
              localStorage.setItem('ai-model', m);
            }}
          >
            {MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            className={`ai-settings-btn ${!hasApiKey ? 'ai-settings-btn--warn' : ''}`}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <FaCog />
            {!hasApiKey && <span className="ai-settings-badge">!</span>}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="ai-chat">
        {messages.length === 0 && (
          <div className="ai-empty">
            <FaRobot className="ai-empty-icon" />
            <p className="ai-empty-title">PVE Portal AI</p>
            <p className="ai-empty-sub">
              {hasApiKey
                ? 'Ask me anything about your infrastructure — VMs, containers, Kubernetes, networking, and more.'
                : 'Click the gear icon to configure your OpenRouter API key to get started.'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="ai-input-area">
        <div className="ai-input-row">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your infrastructure… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button className="ai-send-btn ai-send-btn--stop" onClick={handleStop} title="Stop">
              <span className="ai-stop-icon" />
            </button>
          ) : (
            <button
              className="ai-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send"
            >
              <FaPaperPlane />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
