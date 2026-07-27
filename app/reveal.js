/* reveal.js — a calm fade-and-rise as elements enter the viewport. Pure progressive enhancement:
   with no JS, no IntersectionObserver, or reduced-motion preferred, NOTHING is hidden — everything just shows.
   Only when it's safe to animate do we tag <html class="reveal-on"> (which the CSS uses to hide-then-reveal).
   Shared by the home + the tour; targets .reveal / .beat / .card (all static on those pages). */
(function () {
  'use strict';
  var D = document.documentElement;
  if (!('IntersectionObserver' in window)) return;
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  D.classList.add('reveal-on');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  function bind() { var els = document.querySelectorAll('.reveal, .beat, .card'); for (var i = 0; i < els.length; i++) io.observe(els[i]); }
  if (document.readyState !== 'loading') bind(); else document.addEventListener('DOMContentLoaded', bind);
})();
