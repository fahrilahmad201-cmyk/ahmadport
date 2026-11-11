/* Ahmad Fahril — portfolio interactions.
   Keep content and image paths in index.html; this file handles behavior only. */
(() => {
  "use strict";

  const html = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const themeButton = document.getElementById("theme-toggle");
  const themeIcon = themeButton?.querySelector(".theme-toggle__icon");
  const themeLabel = themeButton?.querySelector(".theme-toggle__label");
  const STORE_KEY = "portfolio-theme";

  function storedTheme() {
    try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; }
  }

  function setTheme(theme, persist = false) {
    const next = theme === "light" ? "light" : "dark";
    html.dataset.theme = next;
    document.getElementById("space-background")?.setAttribute("data-scene", next === "dark" ? "night" : "day");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0f172a" : "#eff6fa");
    if (themeButton) {
      themeButton.disabled = false;
      themeButton.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
      themeButton.setAttribute("aria-pressed", String(next === "light"));
    }
    if (themeIcon) themeIcon.textContent = next === "dark" ? "☀" : "☾";
    if (themeLabel) themeLabel.textContent = next === "dark" ? "Light mode" : "Dark mode";
    if (persist) {
      try { localStorage.setItem(STORE_KEY, next); } catch (_) { /* Private mode is fine. */ }
    }
    window.dispatchEvent(new CustomEvent("portfolio:themechange", { detail: { theme: next } }));
  }

  setTheme(storedTheme() || "dark");
  themeButton?.addEventListener("click", () => setTheme(html.dataset.theme === "dark" ? "light" : "dark", true));

  // Navigation stays usable with JavaScript turned off.
  const navLinks = [...document.querySelectorAll('.site-navigation__link[href^="#"]')];
  const sections = navLinks.map(a => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach(link => {
        if (link.getAttribute("href") === `#${visible.target.id}`) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-18% 0px -55% 0px", threshold: [0, .1, .25] });
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Fade-in sections appear just once, or immediately for people avoiding motion.
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const showAll = () => {
    html.classList.remove("reveal-ready");
    reveals.forEach(el => el.classList.add("is-visible"));
  };
  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .06, rootMargin: "0px 0px 0px 0px" });
    html.classList.add("reveal-ready");
    reveals.forEach(el => revealObserver.observe(el));
  } else showAll();
  reducedMotion.addEventListener?.("change", event => { if (event.matches) showAll(); });

  // Project gallery: the data attributes in HTML are the single source of truth.
  const tabs = [...document.querySelectorAll(".project-gallery__tab")];
  const galleryImage = document.getElementById("project-gallery-image");
  const galleryCaption = document.getElementById("project-gallery-caption");
  const galleryPanel = document.getElementById("gallery-panel");
  let galleryRequest = 0;
  function selectTab(tab, shouldFocus = false) {
    if (!tab || !galleryImage || !galleryPanel) return;
    const request = ++galleryRequest;
    const src = tab.dataset.galleryImage;
    if (!src) return;
    tabs.forEach(candidate => {
      const selected = candidate === tab;
      candidate.classList.toggle("is-active", selected);
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });
    galleryPanel.setAttribute("aria-labelledby", tab.id);
    if (shouldFocus) tab.focus();
    // Preload: a missing image never leaves a broken icon in the gallery.
    const temp = new Image();
    temp.onload = () => {
      if (request !== galleryRequest) return;
      galleryImage.hidden = false;
      galleryImage.src = src;
      galleryImage.alt = tab.dataset.galleryAlt || tab.textContent.trim();
      if (galleryCaption) galleryCaption.textContent = tab.dataset.galleryCaption || "";
    };
    temp.onerror = () => {
      if (request === galleryRequest && galleryCaption) galleryCaption.textContent = "Image not available in the assets folder.";
    };
    temp.src = src;
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else next = (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(tabs[next], true);
    });
  });

  // If an asset was deleted, remove that photo card rather than leaving a gap.
  document.querySelectorAll(".moment-card img").forEach(image => {
    image.addEventListener("error", () => image.closest(".moment-card")?.remove(), { once: true });
    if (image.complete && image.naturalWidth === 0) image.closest(".moment-card")?.remove();
  });

  // Simple keyboard-friendly photo viewer. The links still work without JS.
  const photoLinks = [...document.querySelectorAll("[data-lightbox]")];
  let viewer = null;
  let returnFocus = null;
  function closeViewer() {
    if (!viewer) return;
    viewer.remove();
    viewer = null;
    document.body.classList.remove("lightbox-open");
    returnFocus?.focus();
    returnFocus = null;
  }
  function openViewer(link) {
    if (viewer) closeViewer();
    returnFocus = link;
    const figure = link.closest("figure");
    viewer = document.createElement("div");
    viewer.className = "lightbox";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Photo viewer");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "lightbox__close";
    close.setAttribute("aria-label", "Close photo");
    close.textContent = "×";
    const img = document.createElement("img");
    img.className = "lightbox__image";
    img.src = link.getAttribute("href");
    img.alt = link.querySelector("img")?.alt || "Portfolio photo";
    img.addEventListener("error", closeViewer, { once: true });
    const caption = document.createElement("p");
    caption.className = "lightbox__caption";
    caption.textContent = figure?.querySelector("figcaption")?.textContent || "";
    viewer.append(close, img, caption);
    document.body.append(viewer);
    document.body.classList.add("lightbox-open");
    close.addEventListener("click", closeViewer);
    viewer.addEventListener("click", e => { if (e.target === viewer) closeViewer(); });
    close.focus();
  }
  photoLinks.forEach(link => link.addEventListener("click", e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openViewer(link);
  }));
  document.addEventListener("keydown", event => {
    if (!viewer) return;
    if (event.key === "Escape") { event.preventDefault(); closeViewer(); }
    if (event.key === "Tab") { event.preventDefault(); viewer.querySelector("button")?.focus(); }
  });

  // Contact: enabling this requires a real Web3Forms access key. Never pretend a message was sent.
  const form = document.getElementById("contact-form");
  const submitButton = document.getElementById("contact-submit");
  const note = document.getElementById("contact-form-note");
  const status = document.getElementById("contact-form-status");
  const canSubmit = form?.dataset.contactService === "web3forms" && /^[a-z0-9-]{20,}$/i.test(form.dataset.accessKey || "");
  if (canSubmit && submitButton && note) {
    submitButton.disabled = false;
    note.textContent = "Your message will be sent through the contact form.";
  }
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canSubmit || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.access_key = form.dataset.accessKey;
    data.from_name = "Ahmad Fahril Portfolio";
    data.botcheck = "";
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    status.textContent = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data), signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Contact service rejected the message");
      status.textContent = "Thanks for your message! I'll get back to you soon.";
      form.reset();
    } catch (_) {
      status.textContent = "Something went wrong. Please try again or email me directly.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });

  // Optional cursor. Only on mouse-based devices, never on touchscreens.
  const cursor = document.getElementById("custom-cursor");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (cursor && finePointer.matches && !reducedMotion.matches) {
    let x = -100, y = -100, targetX = -100, targetY = -100, running = false;
    const drawCursor = () => {
      if (!running) return;
      x += (targetX - x) * .24; y += (targetY - y) * .24;
      cursor.style.left = `${x}px`; cursor.style.top = `${y}px`;
      requestAnimationFrame(drawCursor);
    };
    window.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse") return;
      targetX = event.clientX; targetY = event.clientY;
      if (!running) { running = true; html.classList.add("has-custom-cursor"); drawCursor(); }
      cursor.classList.toggle("is-hovering", !!event.target.closest("a,button,input,textarea,[role=tab]"));
    }, { passive: true });
    document.addEventListener("mouseleave", () => { html.classList.remove("has-custom-cursor"); running = false; });
    reducedMotion.addEventListener?.("change", event => { if (event.matches) { running = false; html.classList.remove("has-custom-cursor"); } });
  }
})();
