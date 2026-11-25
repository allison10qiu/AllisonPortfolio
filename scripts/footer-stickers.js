/* Homepage footer stickers (see styles/footer-stickers.css). Each visit (browser session) you can peel
   one sticker (click, tap, Enter or Space) to record it, revealing the item underneath. Peeled stickers
   are remembered in this browser only. The greeting thanks first-time and returning visitors. */
(function () {
  var peels = Array.prototype.slice.call(document.querySelectorAll(".peel"));
  var count = document.querySelector("[data-peel-count]");
  var greeting = document.querySelector("[data-visit-greeting]");
  var hint = document.querySelector("[data-peel-hint]");

  // greeting: first visit vs. coming back
  try {
    var visits = parseInt(localStorage.getItem("aq-visits") || "0", 10) || 0;
    if (!sessionStorage.getItem("aq-visit-counted")) {
      visits += 1;
      localStorage.setItem("aq-visits", String(visits));
      sessionStorage.setItem("aq-visit-counted", "1");
    }
    if (greeting) greeting.textContent = visits > 1 ? "Thanks for visiting again!" : "Thank you for visiting!";
  } catch (e) {}

  if (!peels.length) return;
  // each sticker's size in px, for the corner-curl geometry in the CSS
  function measure() { peels.forEach(function (b) { var r = b.getBoundingClientRect(); b.style.setProperty("--w", r.width.toFixed(1) + "px"); b.style.setProperty("--h", r.height.toFixed(1) + "px"); }); }
  measure(); addEventListener("resize", measure); addEventListener("load", measure);
  var peeled = [];
  try { peeled = JSON.parse(localStorage.getItem("aq-peeled") || "[]") || []; } catch (e) { peeled = []; }
  function save() { try { localStorage.setItem("aq-peeled", JSON.stringify(peeled)); } catch (e) {} }
  var usedThisVisit = false;
  try { usedThisVisit = !!sessionStorage.getItem("aq-peeled-this-visit"); } catch (e) {}
  function update() {
    if (count) count.textContent = peeled.length + " / " + peels.length;
    var done = peeled.length >= peels.length;
    // after this visit's peel, the remaining stickers wait for the next visit
    peels.forEach(function (b) { if (!b.classList.contains("is-peeled")) b.classList.toggle("is-locked", usedThisVisit && !b.classList.contains("is-peeling")); });
    if (hint) hint.textContent = done ? "All nine visits recorded! Thank you!" :
      usedThisVisit ? "Visit recorded! Come back to peel another!" : "Peel off a sticker to record your visit!";
  }

  peels.forEach(function (btn) {
    var id = btn.getAttribute("data-peel");
    var label = btn.getAttribute("aria-label").replace(/^Peel sticker \d+: /, "");
    if (peeled.indexOf(id) > -1) { btn.classList.add("is-peeled"); btn.setAttribute("aria-label", label); btn.setAttribute("aria-disabled", "true"); }
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-peeled") || btn.classList.contains("is-peeling") || usedThisVisit) return;
      btn.classList.add("is-peeling");
      usedThisVisit = true;
      try { sessionStorage.setItem("aq-peeled-this-visit", "1"); } catch (e) {}
      peeled.push(id); save(); update();
      btn.setAttribute("aria-label", label); btn.setAttribute("aria-disabled", "true");
      setTimeout(function () { btn.classList.remove("is-peeling"); btn.classList.add("is-peeled"); }, 1100);
    });
  });
  update();
})();
