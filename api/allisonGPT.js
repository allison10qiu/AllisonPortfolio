/**
 * AllisonGPT Widget
 * An interactive AI assistant for the Allison Qiu portfolio
 *
 * Usage: Include this script in your HTML and call initAllisonGPT()
 */

class AllisonGPT {
  constructor() {
    this.isOpen = false;
    this.isLoading = false;
    this.conversationHistory = [];
    this.apiEndpoint = '/api/allisonGPT';
    this.storageKey = 'allisonGPT_conversation';

    this.init();
  }

  init() {
    // Load conversation from storage
    this.loadConversation();

    // Create DOM elements
    this.createWidget();

    // Show welcome message on first visit
    this.showWelcome();

    // Attach event listeners
    this.attachListeners();
  }

  createWidget() {
    // Container
    const container = document.createElement('div');
    container.id = 'alison-gpt-container';
    container.className = 'alison-gpt-container';

    // Widget HTML
    container.innerHTML = `
      <!-- Launcher (peeking avatar) -->
      <button class="alison-gpt-launcher" id="alison-gpt-launcher" aria-label="Open AllisonGPT chat">
        <div class="alison-gpt-avatar alison-gpt-avatar--peeking" id="alison-gpt-avatar">
          <svg viewBox="0 0 200 280" class="alison-gpt-avatar-svg">
            <!-- Head -->
            <circle cx="100" cy="80" r="45" fill="#1a3a52"/>
            <!-- Hair -->
            <path d="M 55 80 Q 55 35 100 35 Q 145 35 145 80" fill="#1a3a52"/>
            <!-- Eyes -->
            <circle cx="85" cy="75" r="5" fill="#ffffff"/>
            <circle cx="115" cy="75" r="5" fill="#ffffff"/>
            <!-- Smile -->
            <path d="M 85 90 Q 100 100 115 90" stroke="#ffffff" stroke-width="3" fill="none"/>
            <!-- Body -->
            <rect x="70" y="130" width="60" height="80" fill="#7eb3d4" rx="10"/>
            <!-- Hand under chin (thinking pose) -->
            <circle cx="50" cy="180" r="12" fill="#c9b8a3"/>
          </svg>
        </div>
      </button>

      <!-- Chat Panel -->
      <div class="alison-gpt-panel" id="alison-gpt-panel">
        <!-- Header -->
        <div class="alison-gpt-header">
          <div class="alison-gpt-header-content">
            <h2 class="alison-gpt-title">Alli</h2>
            <p class="alison-gpt-subtitle">Allison's online persona</p>
          </div>
          <button class="alison-gpt-close" id="alison-gpt-close" aria-label="Close chat">×</button>
        </div>

        <!-- Messages -->
        <div class="alison-gpt-messages" id="alison-gpt-messages">
          <div class="alison-gpt-welcome">
            <div class="alison-gpt-avatar-large">
              <svg viewBox="0 0 200 280" class="alison-gpt-avatar-svg">
                <circle cx="100" cy="80" r="45" fill="#1a3a52"/>
                <path d="M 55 80 Q 55 35 100 35 Q 145 35 145 80" fill="#1a3a52"/>
                <circle cx="85" cy="75" r="5" fill="#ffffff"/>
                <circle cx="115" cy="75" r="5" fill="#ffffff"/>
                <path d="M 85 90 Q 100 100 115 90" stroke="#ffffff" stroke-width="3" fill="none"/>
                <rect x="70" y="130" width="60" height="80" fill="#7eb3d4" rx="10"/>
                <path d="M 100 140 Q 85 155 70 165" stroke="#ffffff" stroke-width="4" fill="none"/>
              </svg>
            </div>
            <p class="alison-gpt-welcome-text">Hi, I'm Alli! Ask me anything about Allison.</p>
          </div>
        </div>

        <!-- Input -->
        <div class="alison-gpt-input-area">
          <form class="alison-gpt-form" id="alison-gpt-form">
            <input
              type="text"
              class="alison-gpt-input"
              id="alison-gpt-input"
              placeholder="Ask me something..."
              aria-label="Message input"
            >
            <button type="submit" class="alison-gpt-send" aria-label="Send message">
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  attachListeners() {
    const launcher = document.getElementById('alison-gpt-launcher');
    const closeBtn = document.getElementById('alison-gpt-close');
    const form = document.getElementById('alison-gpt-form');

    launcher.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.close());
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const panel = document.getElementById('alison-gpt-panel');
    const launcher = document.getElementById('alison-gpt-launcher');
    const input = document.getElementById('alison-gpt-input');

    panel.classList.add('alison-gpt-panel--open');
    launcher.classList.add('alison-gpt-launcher--minimized');
    this.isOpen = true;

    setTimeout(() => input.focus(), 300);
  }

  close() {
    const panel = document.getElementById('alison-gpt-panel');
    const launcher = document.getElementById('alison-gpt-launcher');

    panel.classList.remove('alison-gpt-panel--open');
    launcher.classList.remove('alison-gpt-launcher--minimized');
    this.isOpen = false;
  }

  showWelcome() {
    const hasVisited = sessionStorage.getItem('alison-gpt-visited');
    if (!hasVisited) {
      this.open();
      sessionStorage.setItem('alison-gpt-visited', 'true');
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('alison-gpt-input');
    const message = input.value.trim();

    if (!message || this.isLoading) return;

    input.value = '';
    this.addMessage('user', message);
    this.setLoading(true);

    try {
      const response = await this.sendMessage(message);
      this.addMessage('assistant', response);
    } catch (error) {
      this.addMessage('assistant', 'Sorry, I had trouble responding. Please try again.');
      console.error('Error:', error);
    } finally {
      this.setLoading(false);
      input.focus();
    }
  }

  async sendMessage(message) {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const messagesContainer = document.getElementById('alison-gpt-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `alison-gpt-message alison-gpt-message--${role}`;

    if (role === 'assistant') {
      messageEl.innerHTML = `
        <div class="alison-gpt-message-avatar"></div>
        <div class="alison-gpt-message-content">${this.escapeHTML(content)}</div>
      `;
    } else {
      messageEl.innerHTML = `<div class="alison-gpt-message-content">${this.escapeHTML(content)}</div>`;
    }

    // Remove welcome message if this is the first real message
    const welcome = messagesContainer.querySelector('.alison-gpt-welcome');
    if (welcome && role === 'assistant') {
      welcome.remove();
    }

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  setLoading(loading) {
    this.isLoading = loading;
    const button = document.querySelector('.alison-gpt-send');
    const input = document.getElementById('alison-gpt-input');

    if (loading) {
      button.disabled = true;
      input.disabled = true;
      const avatar = document.getElementById('alison-gpt-avatar');
      avatar?.classList.add('alison-gpt-avatar--thinking');
    } else {
      button.disabled = false;
      input.disabled = false;
      const avatar = document.getElementById('alison-gpt-avatar');
      avatar?.classList.remove('alison-gpt-avatar--thinking');
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
      if (saved) {
        this.conversationHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load conversation:', e);
    }
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize on DOM ready
function initAllisonGPT() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new AllisonGPT();
    });
  } else {
    new AllisonGPT();
  }
}

// Auto-initialize if script is included
if (document.currentScript?.getAttribute('data-auto-init') !== 'false') {
  initAllisonGPT();
}
