/* Mobile case-study chrome. Desktop sidebar stays in place above 640px. */
(function () {
  var query = window.matchMedia("(max-width: 640px)");
  var layout = document.querySelector(".bf-layout");
  var rail = document.querySelector(".bf-rail");
  if (!layout || !rail) return;

  var titleEl = rail.querySelector(".bf-rail__title");
  var title = titleEl ? titleEl.textContent.trim() : "Case study";
  var links = Array.prototype.slice.call(rail.querySelectorAll(".bf-rail__link"));

  var bar = document.createElement("div");
  bar.className = "m-casebar";

  var row = document.createElement("div");
  row.className = "m-casebar__row";

  var back = document.createElement("a");
  back.className = "m-casebar__back";
  back.href = "/";
  back.setAttribute("data-scroll-to", "my-work");
  back.setAttribute("aria-label", "Back to work");
  back.textContent = "←";

  var id = document.createElement("div");
  id.className = "m-casebar__id";
  var eyebrow = document.createElement("span");
  eyebrow.textContent = "Case study";
  var name = document.createElement("strong");
  name.textContent = title;
  id.appendChild(eyebrow);
  id.appendChild(name);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "m-casebar__contents";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "m-contents");
  button.innerHTML = 'Contents <span aria-hidden="true">▼</span>';

  var track = document.createElement("div");
  track.className = "m-casebar__track";
  track.setAttribute("aria-hidden", "true");
  var fill = document.createElement("span");
  fill.className = "m-casebar__fill";
  track.appendChild(fill);

  var menu = document.createElement("div");
  menu.className = "m-casebar__menu";
  menu.id = "m-contents";
  menu.hidden = true;
  menu.setAttribute("role", "navigation");
  menu.setAttribute("aria-label", "Case study sections");

  links.forEach(function (link) {
    var item = document.createElement("a");
    item.href = link.getAttribute("href") || "#";
    var label = link.querySelector("span:last-child");
    item.textContent = label ? label.textContent.trim() : link.textContent.trim();
    var scroll = link.getAttribute("data-bf-scroll");
    if (scroll) item.setAttribute("data-bf-scroll", scroll);
    menu.appendChild(item);
  });

  row.appendChild(back);
  row.appendChild(id);
  row.appendChild(button);
  bar.appendChild(row);
  bar.appendChild(track);
  bar.appendChild(menu);
  layout.insertBefore(bar, layout.firstChild);

  function setOpen(open) {
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.innerHTML = open
      ? 'Contents <span aria-hidden="true">▲</span>'
      : 'Contents <span aria-hidden="true">▼</span>';
    menu.hidden = !open;
    if (open) {
      var first = menu.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function closeToButton() {
    var wasOpen = button.getAttribute("aria-expanded") === "true";
    setOpen(false);
    if (wasOpen) button.focus({ preventScroll: true });
  }

  button.addEventListener("click", function () {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) return;
    var idName = (link.getAttribute("href") || "").replace("#", "");
    var target = idName ? document.getElementById(idName) : null;
    setOpen(false);
    if (!target) return;
    event.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
    button.focus({ preventScroll: true });
  });

  document.addEventListener("click", function (event) {
    if (menu.hidden) return;
    if (bar.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || menu.hidden) return;
    event.preventDefault();
    closeToButton();
  });

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function progress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.transform = "scaleX(" + ratio + ")";
  }

  progress();
  window.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);

  if (reduced) fill.style.transition = "none";
})();
