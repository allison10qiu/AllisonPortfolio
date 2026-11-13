/* Homepage layout (see styles/home-layout.css). Runs before the puzzle scripts so they lay out
   the board wherever it ends up. Layout options come from <body data-hv data-hvm data-hvs>. */
(function () {
  var v = document.body.getAttribute("data-hv");
  var hero = document.querySelector(".home-hero--puzzle");
  var games = document.querySelector(".pz-games");
  var work = document.getElementById("my-work");
  var links = document.querySelector(".home-hero__links");
  var rows = work.querySelectorAll(".work-row");
  var mq = matchMedia("(max-width: 760px)"), mqS = matchMedia("(max-width: 860px)");
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function relayout() { window.dispatchEvent(new Event("resize")); setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 350); }
  var thumb = '<img src="/assets/bag/bag.png?v=tight" alt="" draggable="false">';

  // A teaser that shows the real board, clipped, with a Play button. Playing opens it in place.
  function teaser(label, extra) {
    var wrap = el("div", "hv-teaser is-closed");
    games.parentNode.insertBefore(wrap, games); wrap.appendChild(games);
    var cover = el("div", "hv-cover", '<button type="button" class="hv-play">' + label + '</button>' + (extra || ""));
    wrap.appendChild(cover);
    cover.querySelector(".hv-play").addEventListener("click", function () {
      wrap.classList.remove("is-closed"); relayout();
      setTimeout(function () { wrap.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    });
    return wrap;
  }
  // An overlay that holds the board; opened from any [data-hv-open].
  function overlay() {
    var dlg = el("div", "hv-dialog"); dlg.hidden = true; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", "Puzzles");
    var close = el("button", "hv-close pz-act", '<svg class="pz-act__ico" viewBox="0 0 17 17" aria-hidden="true"><path d="M4.5 4.5l8 8M12.5 4.5l-8 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg><span class="pz-act__text"><span class="pz-tl__sizer" aria-hidden="true">close</span><span class="pz-tl__label">close</span></span>');
    close.type = "button"; close.setAttribute("aria-label", "Close puzzle");
    dlg.appendChild(close); dlg.appendChild(games); document.body.appendChild(dlg);
    // In the sheet each puzzle reads: title (with close beside it), its line, then the two actions
    // centred underneath. The board's title lives inside its stage, so it moves up first.
    games.querySelectorAll(".home-puzzle").forEach(function (p) {
      var head = p.querySelector(".pz-head"), bar = p.querySelector(":scope > .pz-bar");
      if (!head || !bar) return;
      if (head.parentNode !== p) p.insertBefore(head, p.firstChild);
      head.insertAdjacentElement("afterend", bar);
    });
    function placeClose() {
      if (dlg.hidden) return;
      var h = games.querySelector("[data-game]:not([hidden]) .pz-heading");
      if (!h) return;
      var hr = h.getBoundingClientRect(), dr = dlg.getBoundingClientRect();
      var line = parseFloat(getComputedStyle(h).lineHeight) || hr.height;
      close.style.top = Math.round(hr.top - dr.top + dlg.scrollTop + Math.min(line, hr.height) / 2 - 22) + "px";
    }
    window.addEventListener("resize", placeClose);
    window.addEventListener("hashchange", function () { [0, 300, 700].forEach(function (ms) { setTimeout(placeClose, ms); }); });
    var opener = null;
    function open(e) { opener = e && e.currentTarget; var g = opener && opener.getAttribute("data-hv-game"); if (g) showGame(g); dlg.hidden = false; document.documentElement.classList.add("hv-locked"); relayout(); [0, 120, 400].forEach(function (ms) { setTimeout(placeClose, ms); }); close.focus(); }
    function shut() { dlg.hidden = true; document.documentElement.classList.remove("hv-locked"); if (opener) opener.focus(); }
    close.addEventListener("click", shut);
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape") shut(); });
    document.querySelectorAll("[data-hv-open]").forEach(function (b) { b.addEventListener("click", open); });
  }

  var m = document.body.getAttribute("data-hvm");
  // Intro classes go on first, so gutters measured below already reflect the intro's layout.
  var svEarly = document.body.getAttribute("data-hvs");
  if (svEarly && mqS.matches) document.documentElement.classList.add("hv-s", "hv-s" + svEarly);
  function showGame(name) {
    try { history.replaceState(null, "", name === "bag" ? location.pathname + location.search : "#" + name); } catch (e) {}
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  var tiles = [["bag", "/assets/bag/bag.png?v=tight", "Organize the items", "What’s in my bag"],
               ["board", "/assets/home/board/board.jpg", "Decorate the board", "Pin up a few favorites"],
               ["words", "/assets/home/words/star-felt.png", "Find the hidden words", "A small word search"]];
  function tileHtml(t) {
    return '<button type="button" class="hv-tile" data-hv-open data-hv-game="' + t[0] + '"><span class="hv-tile__art">' + (t[0] === "board" ? '<span class="hv-pol" aria-hidden="true"><img class="hv-pol__photo" src="/assets/home/board/photo-02.jpg" alt="" draggable="false"><img class="hv-pol__clip" src="/assets/home/board/clip-red.png" alt="" draggable="false"></span>' : t[0] === "words" ? '<span class="hv-ws" aria-hidden="true"><img class="hv-ws__lace" src="/assets/home/words/star-lace.png" alt="" draggable="false"><img class="hv-ws__felt" src="/assets/home/words/star-felt.png" alt="" draggable="false"><span class="hv-ws__g"><i></i><i></i><i>m</i><i>d</i><i></i><i>t</i><i>e</i><i>a</i><i>g</i><i>k</i><i>c</i><i>r</i><i>o</i><i>c</i><i>h</i><i>n</i><i>b</i><i>l</i><i>e</i><i>k</i><i></i><i>a</i><i>s</i><i>k</i><i></i></span></span>' : '<img src="' + t[1] + '" alt="" draggable="false">') + '</span><span class="hv-tile__txt"><b>' + t[2] + '</b><span>' + t[3] + '</span><em class="hv-tile__go">play <span aria-hidden="true">→</span></em></span></button>';
  }

  if (v === "a" && m && mqS.matches) {
    document.documentElement.classList.add("hv-m" + m);
    if (m === "1") {
      // Hidden: phones get the intro and the work, nothing else.
      games.remove();
    }
    if (m === "2") {
      // A quiet text link among the intro links opens the puzzle full screen.
      var l2 = el("button", "gem-link hv-textlink", '<span aria-hidden="true">✦</span> Play a puzzle');
      l2.type = "button"; l2.setAttribute("data-hv-open", ""); links.appendChild(l2);
      overlay();
    }
    if (m === "3") {
      // A pill that only appears once the intro has scrolled away.
      var p3 = el("button", "hv-pill hv-pill--late", '✦ Play a puzzle'); p3.type = "button"; p3.setAttribute("data-hv-open", "");
      document.body.appendChild(p3);
      new IntersectionObserver(function (es) { p3.classList.toggle("is-on", !es[0].isIntersecting); }).observe(links);
      overlay();
    }
    if (m === "4") {
      // A shelf after the work: pick one of the three puzzles.
      var shelf = el("section", "hv-shelf", '<p class="hv-eyebrow">Take a break</p><h2 class="hv-h2">Play a puzzle</h2><div class="hv-tiles">' + tiles.map(tileHtml).join("") + '</div>');
      work.parentNode.insertBefore(shelf, work.nextSibling);
      shelf.style.setProperty("--hv-gut", (parseFloat(getComputedStyle(work).paddingLeft) || 20) + "px");
      overlay();
    }
    if (m === "5") {
      // An inline drawer: one row under the intro that opens the board in place.
      var drawer = el("div", "hv-drawer");
      var tog = el("button", "hv-drawer__toggle", '<span><span aria-hidden="true">✦</span> Take a puzzle break</span><span class="hv-drawer__chev" aria-hidden="true">+</span>');
      tog.type = "button"; tog.setAttribute("aria-expanded", "false");
      var body = el("div", "hv-drawer__body"); body.hidden = true;
      games.parentNode.insertBefore(drawer, games); drawer.appendChild(tog); drawer.appendChild(body); body.appendChild(games);
      var gut = parseFloat(getComputedStyle(work).paddingLeft) || 20; drawer.style.setProperty("--hv-gut", gut + "px");
      tog.addEventListener("click", function () {
        var open = body.hidden; body.hidden = !open; tog.setAttribute("aria-expanded", String(open));
        drawer.classList.toggle("is-open", open); if (open) relayout();
      });
    }
    if (m === "6") {
      // Three small tiles in a sideways row right under the intro; each opens its puzzle.
      var PC = {
        bag: ["01", "", "My bag", "pack it up"],
        board: ["02", "", "The board", "pin up photos"],
        words: ["03", "", "Word search", "find 10 words"]
      };
      var row6 = el("div", "hv-pcards", tiles.map(function (t) {
        var c = PC[t[0]], art = tileHtml(t).match(/<span class="hv-tile__art">[\s\S]*?<\/span><span class="hv-tile__txt">/)[0].replace('<span class="hv-tile__txt">', "");
        return '<button type="button" class="hv-pcard hv-tile" data-hv-open data-hv-game="' + t[0] + '" aria-label="Play ' + c[2] + '">' +
          art.replace('class="hv-tile__art"', 'class="hv-tile__art hv-pcard__media"') +
          '<span class="hv-pcard__text">' +
          '<span class="hv-pcard__name">' + c[2] + '</span><span class="hv-pcard__desc">' + c[3] + '</span></span></button>';
      }).join(""));
      var lab6 = el("div", "hv-tiles-label", '<h2 class="hv-tiles-label__h">Take a puzzle break</h2>');
      links.parentNode.insertBefore(row6, links.nextSibling); links.parentNode.insertBefore(lab6, row6);
      overlay();
    }
  } else if (v === "a") {
    // Desktop: same side-by-side layout, shorter board. Phone: compact preview + Play + path to work.
    if (mq.matches) {
      teaser("Play puzzle", '<a class="hv-skip" href="#my-work">See selected work ↓</a>');
    }
  }

  if (v === "b") {
    links.appendChild(el("a", "gem-link hv-jump", '<span aria-hidden="true">✦</span> Play a puzzle ↓'));
    links.lastChild.href = "#hv-puzzles";
    var sec = el("section", "hv-section", '<div class="hv-section__head"><p class="hv-eyebrow">Take a break</p><h2 class="hv-h2">Play a puzzle</h2><p class="hv-sub">Three small puzzles about me. Drag the pieces, or tap “fill it for me”.</p></div>');
    sec.id = "hv-puzzles"; sec.appendChild(games);
    work.parentNode.insertBefore(sec, work.nextSibling);
  }

  if (v === "c") {
    var pause = el("section", "hv-pause", '<div class="hv-pause__head"><p class="hv-eyebrow">A short break</p><h2 class="hv-h2">Play a puzzle, then keep browsing</h2></div>');
    pause.id = "hv-puzzles";
    rows[1].parentNode.insertBefore(pause, rows[2]);
    pause.appendChild(games);
    teaser(mq.matches ? "Play the puzzle" : "Play here", '<a class="hv-skip" href="#hv-more">Skip to more work ↓</a>');
    var more = el("div", "hv-more", '<span class="hv-eyebrow">More work</span><span class="hv-more__count">04 more projects</span>');
    more.id = "hv-more";
    rows[2].parentNode.insertBefore(more, rows[2]);
  }

  if (v === "d") {
    // Extra: an invitation card in the intro; the board opens in an overlay, so work moves up.
    var card = el("button", "hv-card", '<span class="hv-card__art">' + thumb + '</span><span class="hv-card__txt"><b>Play a puzzle</b><span>Help me find what’s missing from my bag</span></span><span class="hv-card__go" aria-hidden="true">→</span>');
    card.type = "button"; card.setAttribute("data-hv-open", "");
    links.parentNode.insertBefore(card, links.nextSibling);
    overlay();
  }

  if (v === "e") {
    // Extra: a launcher that stays with you: a card at the foot of the sticky sidebar on desktop,
    // a floating pill on phones. The board opens in the same overlay.
    var side = document.querySelector(".pz-side");
    var mini = el("button", "hv-card hv-card--side", '<span class="hv-card__art">' + thumb + '</span><span class="hv-card__txt"><b>Take a puzzle break</b><span>Three small games about me</span></span>');
    mini.type = "button"; mini.setAttribute("data-hv-open", ""); side.appendChild(mini);
    var pill = el("button", "hv-pill", '✦ Play a puzzle'); pill.type = "button"; pill.setAttribute("data-hv-open", "");
    document.body.appendChild(pill);
    overlay();
  }
  // ---------- Mobile intro (sidebar) redesigns: <body data-hvs="1…5"> ----------
  var sv = document.body.getAttribute("data-hvs");
  if (sv && mqS.matches) {
    var side = document.querySelector(".pz-side"), facts = side.querySelector(".sb-facts");
    document.documentElement.classList.add("hv-s", "hv-s" + sv);
    side.style.setProperty("--hv-gut", (parseFloat(getComputedStyle(work).paddingLeft) || 20) + "px");
    var dd = Array.prototype.map.call(facts.querySelectorAll("dd"), function (d) { return d.textContent.trim(); });
    if (sv === "2") {
      facts.insertAdjacentElement("afterend", el("p", "hv-oneline", "Info Sciences at UIUC <span>·</span> prev. IBM design intern <span>·</span> building puzzles"));
    }
    if (sv === "3") {
      facts.insertAdjacentElement("afterend", el("p", "hv-prose", "Studying Information Sciences at <b>UIUC</b>. Previously a product design intern at <b>IBM</b>. Lately, building my personal puzzles."));
    }
    if (sv === "4") {
      var bar = el("div", "hv-minibar", '<a href="#home-title" class="hv-minibar__name">Allison Qiu</a><span class="hv-minibar__links"></span>');
      side.querySelectorAll(".home-hero__links a").forEach(function (a) {
        var c = el("a", "hv-minibar__ico"); c.href = a.href; if (a.target) { c.target = a.target; c.rel = a.rel; }
        c.setAttribute("aria-label", a.textContent.trim().indexOf("@") > -1 ? "Email" : a.querySelector(".gem-link__label").textContent.trim());
        c.innerHTML = a.querySelector("svg").outerHTML; bar.lastChild.appendChild(c);
      });
      document.body.appendChild(bar);
      var hdr = document.querySelector(".site-header");
      bar.style.top = (hdr ? Math.round(hdr.getBoundingClientRect().height) : 64) + "px";
      new IntersectionObserver(function (es) { bar.classList.toggle("is-on", !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(links);
    }
  }
  document.documentElement.classList.add("hv-" + v);
})();
