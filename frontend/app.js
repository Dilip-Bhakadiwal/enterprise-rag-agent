/**
 * Enterprise RAG — Frontend Application
 * ======================================
 * Handles: question submission, SSE streaming (future), message rendering,
 * source accordion, example prompts, sidebar toggle, health check.
 */

'use strict';

/* ── API ──────────────────────────────────────────────────────────────────── */
const API_BASE = '';  // same-origin: frontend served by FastAPI

async function askQuestion(question) {
  const response = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/* ── State ───────────────────────────────────────────────────────────────── */
const state = {
  isLoading: false,
  messageCount: 0,
};

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const els = {
  chatArea:       $('chatArea'),
  messages:       $('messages'),
  welcomeScreen:  $('welcomeScreen'),
  questionInput:  $('questionInput'),
  sendBtn:        $('sendBtn'),
  clearChatBtn:   $('clearChatBtn'),
  statusDot:      $('statusDot'),
  statusText:     $('statusText'),
  sidebar:        $('sidebar'),
  mobileMenuBtn:  $('mobileMenuBtn'),
  sidebarToggle:  $('sidebarToggle'),
  toastContainer: $('toastContainer'),
};

/* ── Source type metadata ─────────────────────────────────────────────────── */
const SOURCE_META = {
  confluence:   { label: 'Confluence',  icon: '📖', cls: 'confluence' },
  github:       { label: 'GitHub',      icon: '🐙', cls: 'github' },
  jira:         { label: 'Jira',        icon: '📋', cls: 'jira' },
  slack:        { label: 'Slack',       icon: '💬', cls: 'slack' },
  gmail:        { label: 'Gmail',       icon: '📧', cls: 'gmail' },
  email:        { label: 'Email',       icon: '📧', cls: 'email' },
  notion:       { label: 'Notion',      icon: '📝', cls: 'notion' },
  google_drive: { label: 'Drive',       icon: '💾', cls: 'github' },
  onedrive:     { label: 'OneDrive',    icon: '☁️',  cls: 'notion' },
  sharepoint:   { label: 'SharePoint',  icon: '🔷', cls: 'jira' },
  teams:        { label: 'Teams',       icon: '👥', cls: 'jira' },
  discord:      { label: 'Discord',     icon: '🎮', cls: 'slack' },
  unknown:      { label: 'Unknown',     icon: '📄', cls: 'unknown' },
};

function getSourceMeta(sourceType) {
  return SOURCE_META[sourceType?.toLowerCase()] || SOURCE_META.unknown;
}

/* ── Toast ───────────────────────────────────────────────────────────────── */
function showToast(message, type = 'info', durationMs = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

/* ── Text formatting ─────────────────────────────────────────────────────── */
function formatAnswerText(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Markdown Headings (e.g. ### Heading)
  html = html.replace(/^### (.*$)/gim, '<h4 class="msg-h4">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="msg-h3">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="msg-h2">$1</h2>');

  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered list items: - item or * item
  html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="msg-li">$1</li>');

  // Numbered citations [1], [2], [1][2], [1, 2]
  html = html.replace(/\[(\d+(?:,\s*\d+)*)\]/g, '<span class="citation">[$1]</span>');
  // Handle [doc_id=...] legacy citations if present
  html = html.replace(/\[doc_id=([^\]]+)\]/g, '<span class="citation citation--doc">$1</span>');

  // Convert line breaks and group paragraphs/lists
  const lines = html.split('\n');
  let result = '';
  let inList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      continue;
    }

    if (line.startsWith('<li class="msg-li">')) {
      if (!inList) {
        result += '<ul class="msg-ul">';
        inList = true;
      }
      result += line;
    } else if (line.startsWith('<h2') || line.startsWith('<h3') || line.startsWith('<h4')) {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      result += line;
    } else {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      result += `<p class="msg-p">${line}</p>`;
    }
  }

  if (inList) {
    result += '</ul>';
  }

  return `<div class="msg-content">${result}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ── Message rendering ───────────────────────────────────────────────────── */
function createUserMessage(question) {
  const id = `msg-${++state.messageCount}`;
  const el = document.createElement('div');
  el.className = 'message message--user';
  el.id = id;
  el.setAttribute('aria-label', `You asked: ${question}`);
  el.innerHTML = `
    <div class="message__avatar message__avatar--user">You</div>
    <div class="message__body">
      <div class="message__bubble">${formatAnswerText(question)}</div>
    </div>
  `;
  return { el, id };
}

function createLoadingMessage() {
  const id = `msg-${++state.messageCount}`;
  const el = document.createElement('div');
  el.className = 'message message--loading';
  el.id = id;
  el.setAttribute('aria-label', 'Assistant is thinking…');
  el.innerHTML = `
    <div class="message__avatar message__avatar--bot">🤖</div>
    <div class="message__body">
      <div class="message__bubble">
        <div class="loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <span style="font-size:13px;color:var(--clr-text-2);margin-left:4px;">
          Searching knowledge base…
        </span>
      </div>
    </div>
  `;
  return { el, id };
}

function createBotMessage(result, question) {
  const id = `msg-${++state.messageCount}`;
  const el = document.createElement('div');
  el.className = 'message message--bot';
  el.id = id;

  const timeStr = `${result.response_time_ms.toFixed(0)}ms`;
  const intentLabel = result.intent ? result.intent.replace(/_/g, ' ') : '';
  const fallbackNote = result.used_fallback
    ? `<span class="meta-chip meta-chip--fallback" title="Unfiltered fallback retrieval was used">⚡ fallback retrieval</span>`
    : '';

  // ── Sources HTML ────────────────────────────────────────────────────────
  let sourcesHtml = '';
  if (result.sources && result.sources.length > 0) {
    const sourceItems = result.sources.map((src, i) => {
      const meta = getSourceMeta(src.source_type);
      const ts = src.timestamp ? `<span class="source-item__timestamp">${escapeHtml(src.timestamp)}</span>` : '';
      return `
        <div class="source-item">
          <span class="source-item__badge source-item__badge--${meta.cls}">
            ${meta.icon} ${meta.label}
          </span>
          <div class="source-item__info">
            <span class="source-item__doc-id">${escapeHtml(src.doc_id)}</span>
            ${ts}
          </div>
        </div>
      `;
    }).join('');

    const accordionId = `sources-${id}`;
    sourcesHtml = `
      <div class="sources-section">
        <button class="sources-toggle" aria-expanded="false" aria-controls="${accordionId}"
                onclick="toggleSources(this, '${accordionId}')">
          <span class="sources-toggle__left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            ${result.sources.length} source${result.sources.length !== 1 ? 's' : ''} cited
          </span>
          <svg class="sources-toggle__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="sources-list" id="${accordionId}" role="list">
          ${sourceItems}
        </div>
      </div>
    `;
  }

  el.setAttribute('aria-label', `Assistant answer`);
  el.innerHTML = `
    <div class="message__avatar message__avatar--bot">🤖</div>
    <div class="message__body">
      <div class="message__bubble">${formatAnswerText(result.answer)}</div>
      <div class="message__meta">
        ${intentLabel ? `<span class="meta-chip meta-chip--intent">🎯 ${escapeHtml(intentLabel)}</span>` : ''}
        ${fallbackNote}
        <span class="meta-chip meta-chip--time">⏱ ${timeStr}</span>
        <span class="meta-chip" title="LLM provider used">${escapeHtml(result.provider_used || 'unknown')}</span>
      </div>
      ${sourcesHtml}
    </div>
  `;
  return { el, id };
}

function createErrorMessage(errorText) {
  const id = `msg-${++state.messageCount}`;
  const el = document.createElement('div');
  el.className = 'message message--bot';
  el.id = id;
  el.setAttribute('aria-label', 'Error from assistant');
  el.innerHTML = `
    <div class="message__avatar message__avatar--bot">⚠️</div>
    <div class="message__body">
      <div class="message__bubble message__bubble--error">
        <strong>Something went wrong:</strong> ${escapeHtml(errorText)}
        <br><small style="opacity:0.7;">Please try again or check the API server.</small>
      </div>
    </div>
  `;
  return { el, id };
}

/* ── Sources accordion ───────────────────────────────────────────────────── */
function toggleSources(button, listId) {
  const list = document.getElementById(listId);
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!isOpen));
  list.classList.toggle('is-open', !isOpen);
}

// Make toggleSources accessible globally (used in onclick attributes)
window.toggleSources = toggleSources;

/* ── Chat logic ──────────────────────────────────────────────────────────── */
function hideWelcomeScreen() {
  if (els.welcomeScreen && els.welcomeScreen.style.display !== 'none') {
    els.welcomeScreen.style.transition = 'opacity 0.3s ease';
    els.welcomeScreen.style.opacity = '0';
    setTimeout(() => {
      if (els.welcomeScreen) els.welcomeScreen.style.display = 'none';
    }, 300);
  }
}

function appendMessage(el) {
  els.messages.appendChild(el);
  scrollToBottom();
}

function replaceMessage(oldId, newEl) {
  const old = document.getElementById(oldId);
  if (old) old.replaceWith(newEl);
  else els.messages.appendChild(newEl);
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    els.chatArea.scrollTop = els.chatArea.scrollHeight;
  });
}

function setLoading(loading) {
  state.isLoading = loading;
  els.sendBtn.disabled = loading || !els.questionInput.value.trim();
  els.questionInput.disabled = loading;
  if (!loading) {
    els.questionInput.focus();
  }
}

async function submitQuestion() {
  const question = els.questionInput.value.trim();
  if (!question || state.isLoading) return;

  // Clear input
  els.questionInput.value = '';
  els.questionInput.style.height = 'auto';
  els.sendBtn.disabled = true;

  hideWelcomeScreen();
  setLoading(true);

  // Add user message
  const { el: userEl } = createUserMessage(question);
  appendMessage(userEl);

  // Add loading indicator
  const { el: loadingEl, id: loadingId } = createLoadingMessage();
  appendMessage(loadingEl);

  try {
    const result = await askQuestion(question);
    const { el: botEl } = createBotMessage(result, question);
    replaceMessage(loadingId, botEl);
  } catch (err) {
    console.error('API error:', err);
    const { el: errEl } = createErrorMessage(err.message || 'Unknown error');
    replaceMessage(loadingId, errEl);
    showToast('Request failed — see message above', 'error');
  } finally {
    setLoading(false);
  }
}

/* ── Input auto-resize ───────────────────────────────────────────────────── */
function autoResizeTextarea(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  els.sendBtn.disabled = !ta.value.trim() || state.isLoading;
}

/* ── Health check ────────────────────────────────────────────────────────── */
async function runHealthCheck() {
  try {
    await checkHealth();
    els.statusDot.className = 'status-dot status-dot--ok';
    els.statusText.textContent = 'System online';
  } catch {
    els.statusDot.className = 'status-dot status-dot--error';
    els.statusText.textContent = 'API unreachable';
    showToast('Could not reach the API server — is it running?', 'error', 5000);
  }
}

/* ── Sidebar (mobile) ────────────────────────────────────────────────────── */
let overlay = null;

function openSidebar() {
  els.sidebar.classList.add('is-open');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeSidebar);
  }
  overlay.classList.add('is-active');
}

function closeSidebar() {
  els.sidebar.classList.remove('is-open');
  if (overlay) overlay.classList.remove('is-active');
}

/* ── Clear chat ──────────────────────────────────────────────────────────── */
function clearChat() {
  if (state.isLoading) return;
  els.messages.innerHTML = '';
  state.messageCount = 0;
  if (els.welcomeScreen) {
    els.welcomeScreen.style.display = '';
    els.welcomeScreen.style.opacity = '1';
  }
  showToast('Conversation cleared', 'success', 2000);
}

/* ── Event listeners ─────────────────────────────────────────────────────── */
function attachEventListeners() {
  // Send on Enter (not Shift+Enter)
  els.questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  });

  // Auto-resize textarea
  els.questionInput.addEventListener('input', () => {
    autoResizeTextarea(els.questionInput);
  });

  // Send button
  els.sendBtn.addEventListener('click', submitQuestion);

  // Clear chat
  els.clearChatBtn.addEventListener('click', clearChat);

  // Sidebar toggles
  if (els.mobileMenuBtn) {
    els.mobileMenuBtn.addEventListener('click', openSidebar);
  }
  if (els.sidebarToggle) {
    els.sidebarToggle.addEventListener('click', closeSidebar);
  }

  // Example prompts
  document.querySelectorAll('.example-prompt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (!prompt || state.isLoading) return;
      els.questionInput.value = prompt;
      autoResizeTextarea(els.questionInput);
      closeSidebar();
      // Slight delay so the sidebar animation doesn't clash
      setTimeout(submitQuestion, 150);
    });
  });
}

/* ── Init ────────────────────────────────────────────────────────────────── */
function init() {
  attachEventListeners();
  runHealthCheck();

  // Focus input on load
  setTimeout(() => els.questionInput.focus(), 200);

  console.log('🚀 Enterprise RAG UI initialized');
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
