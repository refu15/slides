/* ============================================================
   ENGINE JS — Scale, Navigate, Print, Overview
   ============================================================ */

(function () {
  'use strict';

  const DESIGN_W = 1920;
  const DESIGN_H = 1080;

  let current = 0;
  let slides = [];
  let overviewOpen = false;

  /* --- Init --- */
  function init() {
    slides = Array.from(document.querySelectorAll('.sd-slide'));
    if (!slides.length) return;

    // inject page numbers
    slides.forEach((s, i) => {
      if (!s.querySelector('.sd-page-num')) {
        const pn = document.createElement('span');
        pn.className = 'sd-page-num';
        pn.textContent = i + 1;
        s.appendChild(pn);
      }
    });

    // build nav
    buildNav();
    buildProgress();
    buildOverview();

    // initial state
    goTo(getHashIndex());
    fitScale();

    // events
    window.addEventListener('resize', fitScale);
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => goTo(getHashIndex()));

    // touch swipe
    let touchX = 0;
    document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
    });
  }

  /* --- Viewport Scale --- */
  function fitScale() {
    const deck = document.querySelector('.sd-deck');
    if (!deck) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / DESIGN_W, vh / DESIGN_H);
    deck.style.setProperty('--sd-scale', scale);
  }

  /* --- Navigation --- */
  function goTo(idx) {
    idx = Math.max(0, Math.min(slides.length - 1, idx));
    slides.forEach((s, i) => {
      s.setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
    current = idx;
    updateNav();
    updateProgress();
    window.location.hash = '#' + (idx + 1);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function getHashIndex() {
    const h = parseInt(window.location.hash.replace('#', ''), 10);
    return isNaN(h) ? 0 : h - 1;
  }

  /* --- Keyboard --- */
  function onKey(e) {
    if (overviewOpen && e.key === 'Escape') { toggleOverview(); return; }
    if (overviewOpen) return;

    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home':  e.preventDefault(); goTo(0); break;
      case 'End':   e.preventDefault(); goTo(slides.length - 1); break;
      case 'o': case 'O': toggleOverview(); break;
      case 'p': case 'P': if (e.ctrlKey || e.metaKey) { /* allow print */ } break;
      case 'f': case 'F':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          document.documentElement.requestFullscreen?.();
        }
        break;
    }
  }

  /* --- Nav HUD --- */
  let navCounter, navEl;
  function buildNav() {
    navEl = document.createElement('nav');
    navEl.className = 'sd-nav';
    navEl.innerHTML = `
      <button data-action="prev" aria-label="Previous">&#9664;</button>
      <span class="sd-nav-counter"></span>
      <button data-action="next" aria-label="Next">&#9654;</button>
      <button data-action="overview" aria-label="Overview" style="margin-left:8px">&#9638;</button>
    `;
    document.body.appendChild(navEl);
    navCounter = navEl.querySelector('.sd-nav-counter');
    navEl.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const a = btn.dataset.action;
      if (a === 'prev') prev();
      else if (a === 'next') next();
      else if (a === 'overview') toggleOverview();
    });
  }
  function updateNav() {
    if (navCounter) navCounter.textContent = `${current + 1} / ${slides.length}`;
  }

  /* --- Progress --- */
  let progressEl;
  function buildProgress() {
    progressEl = document.createElement('div');
    progressEl.className = 'sd-progress';
    document.body.appendChild(progressEl);
  }
  function updateProgress() {
    if (!progressEl) return;
    const pct = slides.length > 1 ? ((current) / (slides.length - 1)) * 100 : 100;
    progressEl.style.width = pct + '%';
  }

  /* --- Overview --- */
  let overviewEl;
  function buildOverview() {
    overviewEl = document.createElement('div');
    overviewEl.className = 'sd-overview';
    const grid = document.createElement('div');
    grid.className = 'sd-overview-grid';

    slides.forEach((s, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'sd-overview-thumb';
      // Clone slide content as thumbnail
      const clone = s.cloneNode(true);
      clone.style.cssText = 'position:relative;width:100%;height:100%;opacity:1;pointer-events:none;transform:none;';
      clone.removeAttribute('aria-current');
      // Scale down inside thumbnail
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `width:${DESIGN_W}px;height:${DESIGN_H}px;transform:scale(${320/DESIGN_W});transform-origin:top left;pointer-events:none;`;
      wrapper.appendChild(clone);
      thumb.appendChild(wrapper);
      thumb.addEventListener('click', () => { goTo(i); toggleOverview(); });
      grid.appendChild(thumb);
    });

    overviewEl.appendChild(grid);
    document.body.appendChild(overviewEl);
  }

  function toggleOverview() {
    overviewOpen = !overviewOpen;
    overviewEl.classList.toggle('active', overviewOpen);
    // Update current highlight
    const thumbs = overviewEl.querySelectorAll('.sd-overview-thumb');
    thumbs.forEach((t, i) => t.classList.toggle('current', i === current));
  }

  /* --- Boot --- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
