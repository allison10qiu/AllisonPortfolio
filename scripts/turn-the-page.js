/* Turn the Page prototype. The motion is in styles/turn-the-page.css.
   The white-wing cursor is a CSS cursor, so it does not jump to 0,0.
   This only keeps the existing "View project" label from flashing at the origin
   if it is still on screen across the swap. The /#my-work landing lives in an
   inline pagereveal script in index.html so it runs before the new snapshot. */
(function () {
  var KEY = "tp:cursor";

  window.addEventListener("pointermove", function (e) {
    window.__tpX = e.clientX;
    window.__tpY = e.clientY;
  }, { passive: true });

  window.addEventListener("pageswap", function () {
    if (window.__tpX == null) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify([window.__tpX, window.__tpY]));
    } catch (err) {}
  });

  window.addEventListener("pagereveal", function () {
    var raw;
    try { raw = sessionStorage.getItem(KEY); } catch (err) { return; }
    if (!raw) return;
    var point;
    try { point = JSON.parse(raw); } catch (err) { return; }
    var x = point[0];
    var y = point[1];
    document.dispatchEvent(new CustomEvent("tp:cursor", { detail: { x: x, y: y } }));
    var label = document.querySelector(".project-cursor.is-on");
    if (!label) return;
    label.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0)";
  });
})();
