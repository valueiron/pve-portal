import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FaRobot, FaCog, FaPaperPlane, FaEye, FaEyeSlash,
  FaChevronDown, FaChevronRight, FaWrench, FaTimes,
  FaPlus, FaCopy, FaCheck, FaTerminal,
} from 'react-icons/fa';
import { streamChat, DEFAULT_SYSTEM_PROMPT } from '../services/aiService';
import { AI_TOOLS, executeTool } from '../services/aiTools';
import './AI.css';

const MODELS = [
  'stepfun/step-3.5-flash:free',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-flash-preview-20251217',
  'openai/gpt-5-mini-2025-08-07',
  'openai/gpt-5-nano-2025-08-07',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'deepseek/deepseek-v3.2-20251201',
  'minimax/minimax-m2.5',
  'xiaomi/mimo-v2-flash-20251210',
  'openrouter/hunter-alpha',
  'openrouter/healer-alpha',
];

const SUGGESTED_PROMPTS = [
  { icon: '⚡', text: 'List all running virtual machines' },
  { icon: '🐳', text: 'Show me all Docker containers and their status' },
  { icon: '☸️', text: 'How many Kubernetes pods are running?' },
  { icon: '🌐', text: 'Show my VyOS network devices and interfaces' },
  { icon: '💾', text: 'What storage resources are available?' },
  { icon: '🧪', text: 'List all available labs' },
];

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button className={`ai-copy-btn ${copied ? 'ai-copy-btn--copied' : ''}`} onClick={handleCopy} title="Copy">
      {copied ? <FaCheck /> : <FaCopy />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ToolCallBlock
// ---------------------------------------------------------------------------

function ToolCallBlock({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
  } catch {
    args = toolCall.function.arguments;
  }

  const hasResult = toolCall.result !== undefined;

  return (
    <div className={`ai-tool-block ${hasResult ? 'ai-tool-block--done' : 'ai-tool-block--running'}`}>
      <button className="ai-tool-header" onClick={() => setExpanded(v => !v)}>
        <span className="ai-tool-status-dot" />
        <FaTerminal className="ai-tool-icon" />
        <span className="ai-tool-name">{toolCall.function.name.replace(/_/g, ' ')}</span>
        <span className="ai-tool-fn-raw">{toolCall.function.name}</span>
        {expanded ? <FaChevronDown className="ai-tool-chevron" /> : <FaChevronRight className="ai-tool-chevron" />}
      </button>
      {expanded && (
        <div className="ai-tool-body">
          <div className="ai-tool-section">
            <div className="ai-tool-section-label">Arguments</div>
            <pre className="ai-tool-pre">{JSON.stringify(args, null, 2)}</pre>
          </div>
          {hasResult && (
            <div className="ai-tool-section">
              <div className="ai-tool-section-label ai-tool-section-label--result">Result</div>
              <pre className="ai-tool-pre ai-tool-result">
                {typeof toolCall.result === 'string'
                  ? toolCall.result
                  : JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

function Message({ msg, isLatest }) {
  const isUser = msg.role === 'user';
  const isAssistant = msg.role === 'assistant';

  if (!isUser && !isAssistant) return null;

  return (
    <div className={`ai-message ai-message--${isUser ? 'user' : 'assistant'} ${isLatest ? 'ai-message--latest' : ''}`}>
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
          <div className="ai-message-text-wrap">
            <div className="ai-message-text">
              {isUser
                ? msg.content
                : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>}
            </div>
            {!msg.isStreaming && (
              <CopyButton text={msg.content} />
            )}
          </div>
        )}
        {msg.isStreaming && !msg.content && (
          <div className="ai-typing">
            <span /><span /><span />
          </div>
        )}
        {msg.isStreaming && msg.content && (
          <span className="ai-stream-cursor" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------

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
          <div className="ai-settings-header-title">
            <FaCog className="ai-settings-header-icon" />
            <h3>AI Settings</h3>
          </div>
          <button className="ai-settings-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="ai-settings-body">
          <div className="ai-settings-field">
            <label className="ai-settings-label">OpenRouter API Key</label>
            <div className="ai-settings-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="ai-settings-input"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                spellCheck={false}
              />
              <button
                className="ai-settings-eye"
                onClick={() => setShowKey(v => !v)}
                type="button"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <p className="ai-settings-hint">Get a key at openrouter.ai/keys</p>
          </div>

          <div className="ai-settings-field">
            <label className="ai-settings-label">Model</label>
            <select
              className="ai-settings-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="ai-settings-field">
            <label className="ai-settings-label">System Prompt</label>
            <textarea
              className="ai-settings-textarea"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={6}
            />
          </div>
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
    model: localStorage.getItem('ai-model') || 'stepfun/step-3.5-flash:free',
    systemPrompt: localStorage.getItem('ai-system-prompt') || DEFAULT_SYSTEM_PROMPT,
  });
  const [showSettings, setShowSettings] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ai-openrouter-key', newSettings.apiKey);
    localStorage.setItem('ai-model', newSettings.model);
    localStorage.setItem('ai-system-prompt', newSettings.systemPrompt);
    setShowSettings(false);
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setIsLoading(false);
  };

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
              m.id === assistantMsgId ? { ...m, content: accContent } : m
            )
          );
        },
        onToolCall: (tcs) => {
          finalToolCalls = tcs;
        },
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: result.content, toolCalls: finalToolCalls, isStreaming: false }
            : m
        )
      );

      if (finalToolCalls.length > 0) {
        const toolResults = [];

        for (const tc of finalToolCalls) {
          let toolResult;
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            toolResult = await executeTool(tc.function.name, args);
          } catch (err) {
            toolResult = { error: err.message };
          }

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

        const updatedConversation = [
          ...conversationMessages,
          { role: 'assistant', content: result.content || '', toolCalls: finalToolCalls },
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

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
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
  const modelShort = settings.model.split('/').pop();

  return (
    <div className="ai-page">
      {/* Top bar */}
      <div className="ai-topbar">
        <div className="ai-topbar-left">
          <div className="ai-topbar-title">
            <div className="ai-topbar-avatar">
              <FaRobot />
            </div>
            <div className="ai-topbar-title-text">
              <span className="ai-topbar-name">AI Assistant</span>
              <span className="ai-topbar-model">{modelShort}</span>
            </div>
          </div>
        </div>

        <div className="ai-topbar-right">
          <select
            className="ai-model-select"
            value={settings.model}
            onChange={e => {
              const m = e.target.value;
              setSettings(s => ({ ...s, model: m }));
              localStorage.setItem('ai-model', m);
            }}
            title="Select model"
          >
            {MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {messages.length > 0 && (
            <button
              className="ai-topbar-btn"
              onClick={handleNewChat}
              title="New chat"
            >
              <FaPlus />
              <span>New</span>
            </button>
          )}

          <button
            className={`ai-topbar-btn ai-settings-btn ${!hasApiKey ? 'ai-settings-btn--warn' : ''}`}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <FaCog />
            {!hasApiKey && <span className="ai-settings-badge" />}
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="ai-chat">
        {messages.length === 0 && (
          <div className="ai-empty">
            <div className="ai-empty-glow" />
            <div className="ai-empty-icon-wrap">
              <FaRobot className="ai-empty-icon" />
            </div>
            <p className="ai-empty-title">PVE Portal AI</p>
            <p className="ai-empty-sub">
              {hasApiKey
                ? 'Ask about your infrastructure or choose a suggestion below.'
                : 'Click the gear icon to configure your OpenRouter API key.'}
            </p>
            {hasApiKey && (
              <div className="ai-suggestions">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="ai-suggestion-chip"
                    onClick={() => handleSend(p.text)}
                  >
                    <span className="ai-suggestion-icon">{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <Message
            key={i}
            msg={msg}
            isLatest={i === messages.length - 1}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="ai-input-area">
        <div className={`ai-input-row ${isLoading ? 'ai-input-row--loading' : ''}`}>
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your infrastructure…"
            rows={1}
            disabled={isLoading}
          />
          <div className="ai-input-actions">
            {isLoading ? (
              <button className="ai-send-btn ai-send-btn--stop" onClick={handleStop} title="Stop generating">
                <span className="ai-stop-icon" />
              </button>
            ) : (
              <button
                className="ai-send-btn"
                onClick={() => handleSend()}
                disabled={!input.trim()}
                title="Send (Enter)"
              >
                <FaPaperPlane />
              </button>
            )}
          </div>
        </div>
        <p className="ai-input-hint">Enter to send · Shift+Enter for newline</p>
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
