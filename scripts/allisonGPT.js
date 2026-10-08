/**
 * Alli Widget
 * Faithful rebuild of the approved AllisonGPT-preview design, wired to the real Claude API.
 *
 * Temporary hide. Set this to true to restore the peek, welcome, chat, and mobile note.
 */
const ALLI_BOT_VISIBLE = false;

class AllisonGPT {
  constructor() {
    this.state = 'welcome';
    this.isLoading = false;
    this.conversationHistory = [];
    this.apiEndpoint = '/api/allisonGPT';

    this.init();
  }

  init() {
    if (!ALLI_BOT_VISIBLE) return;
    if (document.documentElement.classList.contains('figma-capture')) return;

    // Phones only get the swipe-away note. Chat stays on a computer.
    if (window.matchMedia('(max-width: 640px)').matches) {
      this.createMobileNotice();
      return;
    }

    this.createWidget();
    this.attachListeners();

    // The welcome greeting only ever plays on the homepage, and only once per
    // browser session there (sessionStorage remembers it was dismissed).
    // Every other page just shows Alli peeking on the edge, ready to open on click.
    const isHomePage = document.body.classList.contains('home-page');

    let welcomed = false;
    try { welcomed = sessionStorage.getItem('allisongpt-welcomed') === 'yes'; } catch (e) {}

    this.show(isHomePage && !welcomed ? 'welcome' : 'peek', false);
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
        <canvas class="alison-gpt-peek-wave" id="ag-peek-canvas" width="408" height="528" role="img" aria-label="Alli peeking around the edge"></canvas>
        <span class="alison-gpt-peek-label">Ask Alli <span class="alison-gpt-arrow">&#8599;</span></span>
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

  createMobileNotice() {
    const notice = document.createElement('div');
    notice.id = 'ag-mobile';
    notice.className = 'alison-gpt-mobile';
    notice.innerHTML = `
      <p class="alison-gpt-mobile-label">Hi! I'm Alli, chat with me on the computer! <em>(swipe right to hide me)</em></p>
      <canvas class="alison-gpt-mobile-avatar" width="408" height="528" aria-label="Alli"></canvas>
    `;
    document.body.appendChild(notice);

    const canvas = notice.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const sheet = new Image();
    sheet.onload = () => {
      ctx.drawImage(sheet, 0, 0, 408, 528, 0, 0, canvas.width, canvas.height);
    };
    sheet.src = '/assets/alli/alli-peek-sprite.webp?v=wave1';

    let startX = 0;
    let delta = 0;
    let dragging = false;

    notice.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      delta = 0;
      notice.style.transition = 'none';
      notice.setPointerCapture(e.pointerId);
    });

    notice.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      delta = e.clientX - startX;
      notice.style.transform = delta > 0 ? `translateX(${delta}px)` : '';
    });

    notice.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      notice.style.transition = '';
      void notice.offsetWidth;
      if (delta > 60) {
        notice.style.transform = 'translateX(150%)';
        notice.classList.add('alison-gpt-mobile--dismissed');
        const remove = () => {
          notice.removeEventListener('transitionend', remove);
          if (notice.parentNode) notice.remove();
        };
        notice.addEventListener('transitionend', remove);
        setTimeout(remove, 400);
      } else {
        notice.style.transform = '';
      }
    });

    notice.addEventListener('pointercancel', () => {
      dragging = false;
      notice.style.transition = '';
      notice.style.transform = '';
    });
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

    this.attachPeekAnimationListeners();
  }

  // Idle-peek → raise → wave-loop → return animation, driven by an 8-frame
  // sprite sheet drawn to a single fixed canvas (no swapping between
  // separate image assets, so there's nothing to visually "slide").
  attachPeekAnimationListeners() {
    const button = this.$('ag-peek');
    const canvas = this.$('ag-peek-canvas');
    const ctx = canvas.getContext('2d');
    const sheet = new Image();
    const frameW = 408;
    const frameH = 528;
    const loop = [4, 5, 4, 7, 6, 7];

    let loopPosition = 0;
    let hovered = false;
    let focused = false;
    let wanted = false;
    let loaded = false;
    let waving = false;
    let frame = 0;
    let last = 0;
    let raf = 0;
    let reducedQuery = null;
    let reduced = false;

    try {
      reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      reduced = reducedQuery.matches;
    } catch (e) {}

    const paint = () => {
      if (!loaded) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sheet, frame * frameW, 0, frameW, frameH, 0, 0, canvas.width, canvas.height);
    };

    const tick = (t) => {
      raf = 0;
      // Frames 1–4 are the lift (85ms). The wrist-wave loop starts after that
      // raised pose has been shown, including when a wave frame snaps back to it.
      const duration = waving ? 125 : 85;
      if (!last) last = t;
      if (t - last >= duration) {
        last = t;
        if (wanted) {
          if (frame < 4) {
            frame++;
            loopPosition = 0;
            waving = false;
          } else {
            waving = true;
            loopPosition = (loopPosition + 1) % loop.length;
            frame = loop[loopPosition];
          }
        } else if (frame > 4) {
          frame = 4;
          loopPosition = 0;
          waving = false;
        } else if (frame > 0) {
          frame--;
          loopPosition = 0;
          waving = false;
        }
        paint();
      }
      if (wanted || frame > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        last = 0;
      }
    };

    const update = () => {
      wanted = hovered || focused;

      if (reduced) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        frame = wanted ? 4 : 0;
        paint();
        return;
      }

      if (loaded && !raf && (wanted || frame > 0)) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    sheet.onload = () => { loaded = true; paint(); };
    sheet.src = '/assets/alli/alli-peek-sprite.webp?v=wave1';

    button.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') { hovered = true; update(); }
    });
    button.addEventListener('pointerleave', () => { hovered = false; update(); });
    button.addEventListener('focus', () => {
      if (button.matches(':focus-visible')) { focused = true; update(); }
    });
    button.addEventListener('blur', () => { focused = false; update(); });
    // Touch is intentionally left out of `wanted`: pointerenter is skipped for
    // touch above, and we don't wire touchstart either, so tapping just opens
    // the chat via the existing click handler with no lingering hover state.

    if (reducedQuery) {
      reducedQuery.addEventListener('change', () => { reduced = reducedQuery.matches; update(); });
    }
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

}

function initAllisonGPT() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AllisonGPT());
  } else {
    new AllisonGPT();
  }
}

initAllisonGPT();
