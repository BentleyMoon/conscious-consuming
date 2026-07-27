/* One minimal line-icon language for every Conscious Consuming surface.
   24 grid, single 1.75 stroke, round caps and joins, currentColor, no fill. Active and
   saved states come from CSS (fill: currentColor), never a second glyph. This file is the
   source of truth: the static tab bar in index.html inlines the same paths so it paints
   before scripts run, and everything the app renders at runtime calls CC.icon(name). */
(function (global) {
  var P = {
    home: 'M3.5 11.2 12 4l8.5 7.2M6 9.6V20h4.2v-5.2h3.6V20H18V9.6',
    explore: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM15.3 8.7l-1.6 4.6-4.6 1.6 1.6-4.6z',
    scan: 'M4 8V5.6A1.6 1.6 0 0 1 5.6 4H8M16 4h2.4A1.6 1.6 0 0 1 20 5.6V8M20 16v2.4a1.6 1.6 0 0 1-1.6 1.6H16M8 20H5.6A1.6 1.6 0 0 1 4 18.4V16M7.5 12h9',
    guides: 'M12 6.4C10.6 5.2 8.8 4.6 6 4.6c-.9 0-1.6.1-2 .2v13c.4-.1 1.1-.2 2-.2 2.8 0 4.6.6 6 1.8M12 6.4c1.4-1.2 3.2-1.8 6-1.8.9 0 1.6.1 2 .2v13c-.4-.1-1.1-.2-2-.2-2.8 0-4.6.6-6 1.8M12 6.4v13',
    you: 'M12 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM5.5 19.6c.7-3.1 3.3-5 6.5-5s5.8 1.9 6.5 5',
    theme: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 3.5v17',
    menu: 'M4 7h16M4 12h16M4 17h16',
    back: 'M14.5 5.5 8 12l6.5 6.5',
    up: 'M12 19V5M5.5 11.5 12 5l6.5 6.5',
    recent: 'M4.5 9.5A8 8 0 1 1 4 13M4.5 9.5h4M4.5 9.5v-4M12 8.5V12l2.6 1.8',
    scales: 'M12 4.5V19M8 19h8M6 7.5h12M6 7.5 3.5 13a2.5 2.5 0 0 0 5 0zM18 7.5 15.5 13a2.5 2.5 0 0 0 5 0zM9 6l3-1.5L15 6',
    close: 'M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5',
    check: 'M5 12.5 9.5 17 19 7',
    heart: 'M12 20C7 16.7 4 13.7 4 10.3 4 8 5.9 6.2 8.2 6.2c1.5 0 2.9.8 3.8 2 .9-1.2 2.3-2 3.8-2C20 6.2 20 8 20 10.3 20 13.7 17 16.7 12 20Z',
    edit: 'M14.5 6.5 17.5 9.5M5 19l.9-3.4L15 6.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8.4 18.1z',
    spark: 'M12 4c.5 3.6 1.4 4.5 5 5-3.6.5-4.5 1.4-5 5-.5-3.6-1.4-4.5-5-5 3.6-.5 4.5-1.4 5-5Z',
    leaf: 'M5.5 18.5C5 12 9 6.5 19 6c.5 8.5-4 12.5-10 12.5a5 5 0 0 1-3.5-1.2ZM8 16c2.5-4 5-6 8.5-7.5',
    map: 'M9 4 3.5 6.2v13.3L9 17.3l6 2.5 5.5-2.2V4.3L15 6.5zM9 4v13.3M15 6.5v13.3',
    grid: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
    external: 'M9 6h9v9M18 6 9 15M6 9v9h9',
    sun: 'M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2ZM12 2.6v2.2M12 19.2v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6',
    moon: 'M20 14.4A8 8 0 1 1 9.6 4 6.4 6.4 0 0 0 20 14.4Z',
    monitor: 'M4.5 5.5h15v9h-15zM9 19.5h6M12 14.5v5',
    globe: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.6 12h16.8M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5Z',
    tag: 'M4.5 12 12 4.5h6.5a1 1 0 0 1 1 1V12L12 19.5zM15.8 8.2h.01',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c.6-2.9 2.9-4.6 6-4.6M15.6 5.4a3 3 0 0 1 0 5.9M15.4 14.5c2.9.2 5 1.9 5.6 4.5',
    clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.4V12l3.1 2',
    plus: 'M12 5v14M5 12h14',
    apple: 'M12 8.5c-1.3-1.8-5-1.6-5 2 0 3.2 2.6 8 5 8s5-4.8 5-8c0-3.6-3.7-3.8-5-2ZM12 8.5c-.2-1.6.6-3.2 2.4-3.7',
    bank: 'M4 9.5 12 4l8 5.5M6.4 10.8V17M10.1 10.8V17M13.9 10.8V17M17.6 10.8V17M4.5 19.5h15',
    droplet: 'M12 3.6c2.9 3.9 5.4 6.6 5.4 9.8a5.4 5.4 0 0 1-10.8 0c0-3.2 2.5-5.9 5.4-9.8Z',
    shirt: 'M8.2 4 5 6.6 3.4 10.2 6 12.1V20h12v-7.9l2.6-1.9L19 6.6 15.8 4c-.5 1.4-1.6 2.2-3.8 2.2S8.7 5.4 8.2 4Z',
    sprout: 'M12 20v-6.5M12 13.5c-3.2 0-5.3-2.1-5.3-5.3 3.2 0 5.3 2.1 5.3 5.3ZM12 13c0-2.7 1.8-4.6 4.8-4.6 0 2.7-1.8 4.6-4.8 4.6Z',
    mail: 'M4.5 6h15v12h-15zM4.5 7 12 12.5 19.5 7',
    flag: 'M6 21V4.5M6 5c3-1.6 6 1.4 9 0v7.5c-3 1.4-6-1.6-9 0',
    bolt: 'M13 3 5 13.5h5.5L10 21l8-11h-5.5z'
  };
  function icon(name, opts) {
    var d = P[name];
    if (!d) return '';
    opts = opts || {};
    var cls = 'ic ic-' + name + (opts.cls ? ' ' + opts.cls : '');
    var label = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"' : ' aria-hidden="true"';
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"' + label + '><path d="' + d + '"/></svg>';
  }
  var CC = global.CC = global.CC || {};
  CC.iconPaths = P;
  CC.icon = icon;
})(typeof window !== 'undefined' ? window : this);
