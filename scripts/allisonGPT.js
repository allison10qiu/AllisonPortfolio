/**
 * Alli Widget
 * Faithful rebuild of the approved AllisonGPT-preview design, wired to the real Claude API.
 */

class AllisonGPT {
  constructor() {
    this.state = 'welcome';
    this.isLoading = false;
    this.conversationHistory = [];
    this.apiEndpoint = '/api/allisonGPT';
    this.storageKey = 'allisonGPT_conversation';

    this.init();
  }

  init() {
    this.loadConversation();
    this.createWidget();
    this.attachListeners();

    let welcomed = false;
    try { welcomed = sessionStorage.getItem('allisongpt-welcomed') === 'yes'; } catch (e) {}

    this.show(welcomed ? 'peek' : 'welcome', false);
  }

  createWidget() {
    const container = document.createElement('div');
    container.id = 'alison-gpt-container';

    container.innerHTML = `
      <div class="alison-gpt-welcome-wrap" id="ag-welcome">
        <div class="alison-gpt-bubble">
          <button class="alison-gpt-bubble-close" id="ag-dismiss" aria-label="Minimize Alli">&times;</button>
          <strong>Hi, I'm Alli!</strong>
          <p>Allison's online persona. Ask me any questions you have!</p>
          <button class="alison-gpt-primary" id="ag-start">Let's chat <span class="alison-gpt-arrow">&#8599;</span></button>
        </div>
        <div class="alison-gpt-wave" role="img" aria-label="Alli waving"></div>
      </div>

      <button class="alison-gpt-peek" id="ag-peek" aria-label="Open Alli chat" hidden>
        <img class="alison-gpt-peek-static-img" src="/assets/alli/alli-peek.webp" alt="Alli peeking around the edge">
        <div class="alison-gpt-peek-wave-img" aria-hidden="true"></div>
        <span>Ask Alli <span class="alison-gpt-arrow">&#8599;</span></span>
      </button>

      <div id="ag-chat-avatar" class="alison-gpt-chat-avatar" hidden>
        <span class="alison-gpt-thought" aria-hidden="true"><i></i><i></i><i></i></span>
        <img class="alison-gpt-chat-think" src="/assets/alli/alli-think.webp" alt="Alli thinking">
        <img class="alison-gpt-chat-peek" src="/assets/alli/alli-peek.webp" alt="Alli peeking beside the chat">
      </div>

      <section class="alison-gpt-panel" id="ag-chat" aria-label="Alli conversation" hidden>
        <div class="alison-gpt-header">
          <h2 class="alison-gpt-title">Alli</h2>
          <p class="alison-gpt-subtitle">Allison's online persona</p>
          <button class="alison-gpt-close" id="ag-closechat" aria-label="Minimize chat">&times;</button>
        </div>
        <div class="alison-gpt-messages" id="ag-messages" role="log" aria-live="polite"></div>
        <div class="alison-gpt-suggestions" id="ag-suggestions">
          <button type="button">What did you do at IBM?</button>
          <button type="button">How do you approach design?</button>
          <button type="button">Tell me about yourself</button>
        </div>
        <div class="alison-gpt-input-area">
          <form class="alison-gpt-form" id="ag-form">
            <input class="alison-gpt-input" id="ag-question" aria-label="Your question" placeholder="Ask about Allison…" maxlength="500" autocomplete="off">
            <button class="alison-gpt-send" type="submit" aria-label="Send question">&uarr;</button>
          </form>
          <div class="alison-gpt-notice">Replies come from Alli, an AI persona — always verify anything important with Allison directly.</div>
        </div>
      </section>
    `;

    document.body.appendChild(container);

    if (this.conversationHistory.length === 0) {
      this.addMessage('assistant', "Hi! I'm Alli, Allison's online persona. Ask me anything about her work, projects, or experience.");
    } else {
      this.conversationHistory.forEach(m => this.addMessage(m.role, m.content));
    }
  }

  $(id) { return document.getElementById(id); }

  attachListeners() {
    this.$('ag-dismiss').addEventListener('click', () => this.show('peek'));
    this.$('ag-start').addEventListener('click', () => this.show('chat'));
    this.$('ag-peek').addEventListener('click', () => this.show('chat'));
    this.$('ag-closechat').addEventListener('click', () => this.show('peek'));
    this.$('ag-form').addEventListener('submit', (e) => this.handleSubmit(e));

    this.$('ag-suggestions').querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => this.sendSuggestion(btn.textContent));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state !== 'peek' && this.state !== 'welcome') {
        this.show('peek');
      }
    });
  }

  show(next, focus = true) {
    this.state = next;

    this.$('ag-chat-avatar').hidden = next !== 'chat';
    this.$('ag-welcome').hidden = next !== 'welcome';
    this.$('ag-peek').hidden = next !== 'peek';
    this.$('ag-chat').hidden = next !== 'chat';

    if (next !== 'welcome') {
      try { sessionStorage.setItem('allisongpt-welcomed', 'yes'); } catch (e) {}
    }

    if (focus) {
      if (next === 'peek') this.$('ag-peek').focus();
      if (next === 'chat') setTimeout(() => this.$('ag-question').focus(), 300);
    }
  }

  async sendSuggestion(text) {
    if (this.isLoading) return;
    this.addMessage('user', text);
    this.setLoading(true);
    try {
      const response = await this.sendMessage(text);
      this.addMessage('assistant', response);
    } catch (error) {
      this.addMessage('assistant', 'Sorry, I had trouble responding. Please try again, or email Allison directly at allisonqiu10@gmail.com.');
      console.error('Alli error:', error);
    } finally {
      this.setLoading(false);
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const input = this.$('ag-question');
    const message = input.value.trim();

    if (!message || this.isLoading) return;

    input.value = '';
    this.addMessage('user', message);
    this.setLoading(true);

    try {
      const response = await this.sendMessage(message);
      this.addMessage('assistant', response);
    } catch (error) {
      this.addMessage('assistant', 'Sorry, I had trouble responding. Please try again, or email Allison directly at allisonqiu10@gmail.com.');
      console.error('Alli error:', error);
    } finally {
      this.setLoading(false);
      input.focus();
    }
  }

  async sendMessage(message) {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: this.conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    this.conversationHistory = data.conversationHistory;
    this.saveConversation();

    return data.message;
  }

  addMessage(role, content) {
    const messages = this.$('ag-messages');
    const wrap = document.createElement('div');
    wrap.className = `alison-gpt-message alison-gpt-message--${role}`;
    wrap.innerHTML = `<div class="alison-gpt-message-content"></div>`;
    wrap.querySelector('.alison-gpt-message-content').textContent = content;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  setLoading(loading) {
    this.isLoading = loading;
    const button = this.$('ag-form').querySelector('.alison-gpt-send');
    const input = this.$('ag-question');
    const avatar = this.$('ag-chat-avatar');
    const messages = this.$('ag-messages');

    button.disabled = loading;
    input.disabled = loading;
    this.$('ag-suggestions').querySelectorAll('button').forEach((b) => { b.disabled = loading; });

    if (loading) {
      avatar.classList.add('thinking');
      const indicator = document.createElement('div');
      indicator.className = 'alison-gpt-typing';
      indicator.id = 'ag-typing-indicator';
      indicator.setAttribute('role', 'status');
      indicator.innerHTML = '<span>Alli is thinking</span><i></i><i></i><i></i>';
      messages.appendChild(indicator);
      messages.scrollTop = messages.scrollHeight;
    } else {
      avatar.classList.remove('thinking');
      const indicator = this.$('ag-typing-indicator');
      if (indicator) indicator.remove();
    }
  }

  saveConversation() {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.conversationHistory));
    } catch (e) {
      console.warn('Could not save conversation:', e);
    }
  }

  loadConversation() {
    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (saved) this.conversationHistory = JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load conversation:', e);
    }
  }
}

function initAllisonGPT() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AllisonGPT());
  } else {
    new AllisonGPT();
  }
}

initAllisonGPT();
