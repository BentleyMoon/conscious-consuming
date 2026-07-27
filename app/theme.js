/* Shared theme switch for the Values Commons constellation.
   Persists to localStorage 'cc.theme' — the SAME key the app reads — so one
   choice follows a person across every page and into Conscious Consuming.
   The no-flash line is inline in each page's <head>; this file adds the control. */
(function () {
  'use strict';
  var KEY = 'cc.theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function effective() {
    var set = root.getAttribute('data-theme');
    if (set === 'dark' || set === 'light') return set;
    return (mq && mq.matches) ? 'dark' : 'light';
  }

  var SUN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>';
  var MOON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M13.2 9.6A5.2 5.2 0 1 1 6.4 2.8 4.1 4.1 0 0 0 13.2 9.6z"/></svg>';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vc-theme';

  function paint() {
    var e = effective();
    // show the destination: a moon while light (click for dark), a sun while dark
    btn.innerHTML = e === 'dark' ? SUN : MOON;
    var label = e === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  btn.addEventListener('click', function () {
    var next = effective() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  });

  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (!root.getAttribute('data-theme')) paint(); });
  }

  var style = document.createElement('style');
  style.textContent =
    '.vc-theme{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;' +
    'border:1px solid var(--line-strong,var(--line,rgba(0,0,0,.16)));border-radius:3px;background:transparent;' +
    'color:var(--muted,#5b6570);cursor:pointer;vertical-align:middle;transition:border-color .15s,color .15s,box-shadow .2s}' +
    '.vc-theme:hover,.vc-theme:focus-visible{border-color:var(--accent);color:var(--accent);box-shadow:var(--glow,0 0 12px rgba(29,122,90,.22));outline:none}' +
    '.vc-theme svg{width:1rem;height:1rem;display:block}';

  function mount() {
    document.head.appendChild(style);
    var host = document.querySelector('.topnav') || document.querySelector('.links') ||
               document.querySelector('.navlinks') || document.querySelector('.fi-nav') ||
               document.querySelector('.top') || document.querySelector('nav');
    if (host) { paint(); host.appendChild(btn); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
