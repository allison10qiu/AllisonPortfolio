/* Work grid: every browser screen gets the same 16:10 frame so all the cards line up. Each screen's
   own contents (screenshots, tap rings, cursor) move into a wrapper that keeps the screenshot's
   original shape, fills the frame width from the top, so the walkthrough cursor still lands on
   the right spot. The walkthroughs are built by a module script, so this waits for them. */
(function () {
  var work = document.querySelector(".work.work--grid");
  if (!work) return;
  function fit() {
    var screens = work.querySelectorAll(".pw-desk .pw-screen");
    var pending = 0;
    screens.forEach(function (sc) {
      if (sc.querySelector(":scope > .pw-fit")) return;
      var img = sc.querySelector("img.pw-layer");
      if (!img || !img.naturalWidth) { pending++; return; }
      var ratio = img.naturalWidth / img.naturalHeight;
      var wrap = document.createElement("div");
      wrap.className = "pw-fit " + (ratio > 1.6 ? "pw-fit--wide" : "pw-fit--tall");
      wrap.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
      while (sc.firstChild) wrap.appendChild(sc.firstChild);
      sc.appendChild(wrap);
    });
    if (pending || !screens.length) setTimeout(fit, 150);
    else if (typeof sizeScreens === "function") sizeScreens(); // frames exist now: size them
  }
  if (document.readyState === "complete") fit(); else addEventListener("load", fit);

  // Bento (wide screens): every browser screen takes the height a half-width tile would give it
  // (16:10), so frames in wide and half tiles are exactly the same height.
  var wide = matchMedia("(min-width: 1101px)");
  function sizeScreens() {
    if (!wide.matches) { work.classList.remove("has-sh"); return; }
    var cols = getComputedStyle(work).gridTemplateColumns.split(" ").map(parseFloat);
    var gap = parseFloat(getComputedStyle(work).columnGap) || 0;
    var half = cols.slice(0, 6).reduce(function (a, b) { return a + b; }, 0) + gap * 5;
    work.style.setProperty("--sh", (half * 10 / 16).toFixed(1) + "px");
    work.style.setProperty("--dw", half.toFixed(1) + "px"); // browser frames never wider than a half tile
    work.classList.add("has-sh");
    // in the wide tiles, the frame ends where the description's text ends (never past it)
    
  }
  sizeScreens();
  addEventListener("resize", sizeScreens);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeScreens);
  addEventListener("load", sizeScreens);
})();
