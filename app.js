/* ============================================================
   Vietnam Airlines PTFS — Data-driven Engine
   Consumes content.json as the single source of truth.
   Public site: hash-routed SPA in the .site-root shell.
   ------------------------------------------------------------
   Section types: hero, statsRow, featureCards, divider,
   ctaBanner, accordion, richText, socialLinks, imageText,
   table, buttonRow.
   ============================================================ */

window.VNA = (function () {
  'use strict';

  var CONTENT_PATH = 'content.json';
  var STORE_KEY = 'vna_admin_draft_v1';
  var LOCK_KEY = 'vna_admin_unlocked';

  // Built-in defaults when content.json is empty/absent
  var EMPTY_CONTENT = {
    meta: { version: 1 },
    identity: { siteName: 'Vietnam Airlines PTFS', tagline: 'Fly With the Golden Lotus', logo: { image: '', alt: 'Vietnam Airlines PTFS' } },
    theme: {
      fontPresetId: 'titillium-open-sans',
      colors: {
        primary: '#005F6E', primaryDark: '#003C46', secondary: '#E6B441',
        creme: '#FAFAEB', background: '#FFFFFF', surface: '#F4F6F7',
        text: '#0B1F24', textMuted: '#5B7075', border: '#E1E7EA'
      },
      radius: 'soft', headerStyle: 'solid', backgroundImage: ''
    },
    pages: {}
  };

  var state = {
    content: null,
    draft: null,     // local edits overlay
    currentRoute: null,
    globalBound: false,
    scrollBound: false,
    headerTMode: false
  };

  /* ================= LOADING ================= */
  function loadContent() {
    // Local draft first (if any), else content.json
    try {
      var draft = localStorage.getItem(STORE_KEY);
      if (draft) {
        var parsed = JSON.parse(draft);
        if (parsed && parsed.theme) { state.draft = parsed; }
      }
    } catch (e) {}
    return new Promise(function (resolve) {
      fetch(CONTENT_PATH + '?v=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (json) { state.content = json; resolve(json); })
        .catch(function () { state.content = JSON.parse(JSON.stringify(EMPTY_CONTENT)); resolve(state.content); });
    });
  }

  function theme() {
    var base = (state.content && state.content.theme) || EMPTY_CONTENT.theme;
    var draftTheme = state.draft && state.draft.theme;
    var merged = merge(base, draftTheme || {});
    return merged;
  }
  function identity() {
    var base = (state.content && state.content.identity) || EMPTY_CONTENT.identity;
    return merge(base, (state.draft && state.draft.identity) || {});
  }
  function allPages() {
    var base = (state.content && state.content.pages) || {};
    return merge(base, (state.draft && state.draft.pages) || {});
  }
  function navOverrides() {
    return merge((state.content && state.content.navOverrides) || {}, (state.draft && state.draft.navOverrides) || {});
  }

  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      var bv = out[k], ov = over[k];
      if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
        out[k] = merge(bv, ov);
      } else {
        out[k] = ov;
      }
    });
    return out;
  }

  /* ================= NAV MODEL ================= */
  // route slug -> { parent, base, defaultLabel }
  var PAGES_META = {
    'home': { parent: null, label: 'Home' },
    'rules': { parent: null, label: 'Rules' },
    'about': { parent: 'about', label: 'About us' },
    'about-server': { parent: 'about', label: 'Our Server' },
    'about-socials': { parent: 'about', label: 'Socials' },
    'about-fleet': { parent: 'about', label: 'Fleet' },
    'about-pacific': { parent: 'about', label: 'Pacific Airlines' },
    'about-vasco': { parent: 'about', label: 'VASCO' },
    'lotusmiles': { parent: 'lotusmiles', label: 'Lotusmiles' },
    'lotusmiles-intro': { parent: 'lotusmiles', label: 'Introduction' },
    'lotusmiles-about': { parent: 'lotusmiles', label: 'Lotusmiles Tiers' },
    'lotusmiles-howto': { parent: 'lotusmiles', label: 'How To Get Lotusmiles' },
    'affiliates': { parent: 'affiliates', label: 'Affiliates' },
    'affiliates-intro': { parent: 'affiliates', label: 'Introduction' },
    'affiliates-skyteam': { parent: 'affiliates', label: 'SkyTeam' },
    'affiliates-requirements': { parent: 'affiliates', label: 'Requirements & Benefits' },
    'affiliates-tiers': { parent: 'affiliates', label: 'Partnership Tiers' },
    'affiliates-ours': { parent: 'affiliates', label: 'Our Affiliates' },
    'support': { parent: null, label: 'Support' },
    'careers': { parent: 'careers', label: 'Careers' },
    'careers-intro': { parent: 'careers', label: 'Introduction' },
    'careers-positions': { parent: 'careers', label: 'Positions' },
    'careers-results': { parent: 'careers', label: 'Results' },
    'careers-direct-entry': { parent: 'careers', label: 'Direct Entry' },
    'news': { parent: null, label: 'News' },
    'flight-info': { parent: 'flight-info', label: 'Flight Information' },
    'flights': { parent: 'flight-info', label: 'Flights' },
    'skyteam-flights': { parent: 'flight-info', label: 'SkyTeam Flights' },
    'partner-flights': { parent: 'flight-info', label: 'Partner Flights' },
    'flight-board': { parent: 'flight-info', label: 'Flight Board' },
    'meals-drinks': { parent: 'flight-info', label: 'Meals & Drinks' }
  };

  function topLevel() { return ['home', 'rules', 'about', 'lotusmiles', 'affiliates', 'support', 'careers', 'news', 'flight-info']; }

  function labelFor(route) {
    var ov = navOverrides()[route];
    if (ov && ov.label) return ov.label;
    var meta = PAGES_META[route];
    if (meta && meta.label) return meta.label;
    // fall back to page title override
    var p = allPages()[route];
    if (p && p.titleOverride) return p.titleOverride;
    return route.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function isHidden(route) {
    var ov = navOverrides()[route];
    return !!(ov && ov.hidden);
  }

  function childRoutes(parent) {
    var out = [];
    Object.keys(PAGES_META).forEach(function (r) {
      if (PAGES_META[r].parent === parent && !isHidden(r)) out.push(r);
    });
    return out;
  }

  function buildNav(currentRoute) {
    var ident = identity();
    var header = '<a class="brand" href="#/home" data-od-id="brand"><img class="brand-logo" src="' + logoSource() + '" alt="' + esc(ident.siteName) + ' logo"><span><span class="brand-name">' + esc(ident.siteName) + '</span><br><span class="brand-tag">' + esc(ident.tagline) + '</span></span></a>';
    var h = header;
    h += '<nav class="main-nav" id="mainNav" aria-label="Primary">';
    topLevel().forEach(function (route) {
      if (isHidden(route)) return;
      var label = labelFor(route);
      var children = childRoutes(route);
      var active = currentRoute === route || (PAGES_META[currentRoute] && PAGES_META[currentRoute].parent === route);
      if (children.length) {
        h += '<div class="nav-item' + (active ? ' open' : '') + '" data-od-id="nav-' + route + '">';
        h += '<a class="nav-link" href="#/' + route + '" data-nav-toplevel data-route="' + route + '">' + esc(label) + '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></a>';
        h += '<div class="nav-dropdown">';
        children.forEach(function (c) {
          h += '<a class="nav-link" href="#/' + c + '" data-od-id="nav-' + c + '">' + esc(labelFor(c)) + '</a>';
        });
        h += '</div></div>';
      } else {
        h += '<a class="nav-link' + (active ? ' active' : '') + '" href="#/' + route + '" data-od-id="nav-' + route + '">' + esc(label) + '</a>';
      }
    });
    h += '<a class="nav-link nav-cta" href="#/support" data-od-id="nav-discord">Join Us</a>';
    h += '</nav>';
    h += '<button class="nav-toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="mainNav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
    return h;
  }

  /* ================= LOGO / ICONS ================= */
  function logoSource() {
    var id = identity();
    if (id.logo && id.logo.image) return id.logo.image;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#005F6E"/><g fill="#E6B441"><path d="M32 12c2 7-3 11-3 11 5-2 8 1 8 1s3-3 8-1c0 0-5-4-3-11-2 4-5 4-5 4s-3 0-5-4z"/><path d="M32 21c1 7-4 12-4 12 6-1 9 3 9 3s3-4 9-3c0 0-5-5-4-12-2 6-5 6-5 6s-3 0-5-6z"/><path d="M32 30c1 6-4 11-4 11 6-1 9 2 9 2s3-3 9-2c0 0-5-5-4-11-2 5-5 5-5 5s-3 0-5-5z"/></g></svg>'
    );
  }

  var ICONS = {
    'award': '<circle cx="12" cy="8" r="6"/><path d="M15.5 13l1.5 8-5-3-5 3 1.5-8"/>',
    'briefcase': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    'calendar': '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18"/>',
    'handshake': '<path d="M11 17l2 2a1 1 0 0 0 1.4 0l4-4a1.6 1.6 0 0 0-2.3-2.3l-3 3M17 11l3-3"/><path d="M3 17l6-6 3 3M14 14l4-4a1.6 1.6 0 0 1 2.3 2.3"/>',
    'headphones': '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>',
    'map': '<path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15"/>',
    'megaphone': '<path d="M3 11l14-6v14L3 13z"/><path d="M17 8a3 3 0 0 1 0 8M8 20V11"/>',
    'message-circle': '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-5.2a8.4 8.4 0 0 1-1-4.3 8.4 8.4 0 1 1 17 0z"/>',
    'monitor': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    'plane': '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    'plane-takeoff': '<path d="M2 20h20M6 9.5l10.5 3.5 4-1.5 1 .8-3.5 4.2-11-4M3 9c1.6 0 2.6.6 4 1"/><path d="M2 16l2.5-2.5M6 12l4-3"/>',
    'shield-check': '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    'trophy': '<path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>',
    'user-plus': '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 5.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-6-6.9"/>',
    'utensils': '<path d="M4 3v8a2 2 0 0 0 4 0V3M6 3v18M18 3c-1.5 1.5-2 3.5-2 6 0 2 0 4 2 4v8"/>',
    'chevron': '<path d="M6 9l6 6 6-6"/>',
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'menus': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'link': '<path d="M10 14a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
    'discord': '<path d="M20 5.5C18.6 4.6 16.9 4.1 15.2 4l-.4 1a11 11 0 0 0-5.6 0L8.8 4c-1.7.1-3.4.6-4.8 1.5C2 9.4 1.5 13.2 2 17c1.8 1.3 3.8 2.2 6 2.5l.9-1.5a8 8 0 0 1-2-1l.5-.4a11 11 0 0 0 9 0l.5.4a8 8 0 0 1-2 1l.9 1.5c2.2-.3 4.2-1.2 6-2.5.6-4 .1-7.7-1.8-11.5z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1">',
    'youtube': '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
    'x': '<path d="M4 4l16 16M20 4L4 20"/>',
    'instagram': '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/>'
  };
  function icon(name) {
    var p = ICONS[name] || ICONS['link'];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ================= THEME BINDING ================= */
  function applyTheme() {
    var t = theme();
    var c = t.colors;
    var root = document.documentElement;
    root.style.setProperty('--vna-primary', c.primary);
    root.style.setProperty('--vna-primary-dark', c.primaryDark || '#003C46');
    root.style.setProperty('--vna-gold', c.secondary || '#E6B441');
    root.style.setProperty('--vna-creme', c.creme || '#FAFAEB');
    root.style.setProperty('--bg', c.background);
    root.style.setProperty('--surface', c.surface);
    root.style.setProperty('--fg', c.text);
    root.style.setProperty('--muted', c.textMuted);
    root.style.setProperty('--border', c.border);
    root.style.setProperty('--accent', c.primary);
    root.style.setProperty('--accent-dark', c.primaryDark || '#003C46');
    root.style.setProperty('--accent-2', c.secondary || '#E6B441');
    var radius = t.radius;
    if (radius === 'sharp') {
      root.style.setProperty('--r-sm', '2px'); root.style.setProperty('--r-md', '4px'); root.style.setProperty('--r-lg', '6px');
    } else if (radius === 'round') {
      root.style.setProperty('--r-sm', '10px'); root.style.setProperty('--r-md', '16px'); root.style.setProperty('--r-lg', '24px');
    } else {
      root.style.setProperty('--r-sm', '6px'); root.style.setProperty('--r-md', '10px'); root.style.setProperty('--r-lg', '16px');
    }
    // Font preset
    var fp = FONT_PRESETS[t.fontPresetId] || FONT_PRESETS['titillium-open-sans'];
    root.style.setProperty('--font-display', fp.display);
    root.style.setProperty('--font-body', fp.body);
    // Header style class
    var header = document.getElementById('siteHeader');
    if (header) {
      header.classList.remove('solid');
      header.style.background = '';
      if (t.headerStyle === 'solid') header.classList.add('solid');
      else header.classList.add('transparent');
      header.dataset.headerStyle = t.headerStyle || 'transparent';
    }
  }

  var FONT_PRESETS = {
    'titillium-open-sans': { display: '"Titillium Web", "Segoe UI", Arial, sans-serif', body: '"Open Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif', google: 'Titillium+Web:400,600,700|Open+Sans:400,600,700' },
    'montserrat-inter': { display: '"Montserrat", "Segoe UI", Arial, sans-serif', body: '"Inter", "Segoe UI", Arial, sans-serif', google: 'Montserrat:400,600,700|Inter:400,500,600,700' },
    'poppins-lato': { display: '"Poppins", "Segoe UI", Arial, sans-serif', body: '"Lato", "Segoe UI", Arial, sans-serif', google: 'Poppins:400,500,600,700|Lato:400,700' },
    'playfair-open-sans': { display: '"Playfair Display", Georgia, serif', body: '"Open Sans", "Segoe UI", Arial, sans-serif', google: 'Playfair+Display:600,700|Open+Sans:400,600,700' }
  };

  /* ================= MARKDOWN (lightweight) ================= */
  function md(text) {
    if (!text) return '';
    var s = esc(text);
    // code spans
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // inline bold/italic
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
    // links
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // blockquote lines
    var lines = s.split('\n');
    var html = '';
    var inList = null, inQuote = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var qm = line.match(/^&gt;\s?(.*)$/);
      if (qm) { if (!inQuote) { html += '<blockquote>'; inQuote = true; } html += '<p>' + qm[1] + '</p>'; continue; }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
      // heading
      var hm = line.match(/^###\s+(.*)$/);
      if (hm) { if (inList) { html += closeList(inList); inList = null; } html += '<h4>' + hm[1] + '</h4>'; continue; }
      // ordered list
      var ol = line.match(/^\d+\.\s+(.*)$/);
      if (ol) { if (!inList) { html += '<ol>'; inList = 'ol'; } html += '<li>' + ol[1] + '</li>'; continue; }
      // bullet
      var ul = line.match(/^[-•]\s+(.*)$/);
      if (ul) { if (!inList) { html += '<ul>'; inList = 'ul'; } html += '<li>' + ul[1] + '</li>'; continue; }
      if (inList) { html += closeList(inList); inList = null; }
      if (line.trim()) html += '<p>' + line.replace(/<br>/g, ' ') + '</p>';
    }
    if (inQuote) html += '</blockquote>';
    if (inList) html += closeList(inList);
    return html;
  }
  function closeList(type) { return '</' + type + '>'; }

  /* ================= SECTION RENDERER ================= */
  function renderSection(sec, page) {
    if (!sec || !sec.data) return '';
    var d = sec.data;
    var id = 'sec-' + sec.id;
    switch (sec.type) {
      case 'hero': return heroHTML(id, d);
      case 'statsRow': return statsHTML(id, d);
      case 'featureCards': return cardsHTML(id, d);
      case 'divider': return dividerHTML(id, d);
      case 'ctaBanner': return ctaHTML(id, d);
      case 'accordion': return accordionHTML(id, d);
      case 'richText': return richHTML(id, d);
      case 'socialLinks': return socialHTML(id, d);
      case 'imageText': return imageTextHTML(id, d);
      case 'table': return tableHTML(id, d);
      case 'buttonRow': return buttonRowHTML(id, d);
      default: return '';
    }
  }

  function buttonsHTML(btns) {
    if (!btns || !btns.length) return '';
    var h = '<div class="hero-actions">';
    btns.forEach(function (b) {
      var cls = b.style === 'primary' ? 'btn btn-primary' : 'btn btn-ghost';
      var href = b.link ? routeHref(b.link) : '#';
      h += '<a class="' + cls + '" href="' + href + '">' + esc(b.label) + '</a>';
    });
    h += '</div>';
    return h;
  }

  function heroHTML(id, d) {
    var size = d.height || 'medium';
    var align = d.align || 'left';
    var wrap = d.overlay ? '' : ' no-overlay';
    var bgStyle = d.backgroundImage
      ? 'background-color:#003C46;background-image:url(' + d.backgroundImage + ');'
      : 'background-color:#003C46;background-image:url(' + heroFallback() + ');';
    var h = '<section class="hero-section size-' + size + ' align-' + align + wrap + '" data-od-id="' + id + '">';
    h += '<div class="hero-bg" style="' + bgStyle + '"></div>';
    if (d.overlay !== false) h += '<div class="hero-tint"></div>';
    h += '<div class="container hero-content"><div class="hero-inner">';
    if (d.eyebrow) h += '<span class="hero-eyebrow">' + esc(d.eyebrow) + '</span>';
    if (d.heading) h += '<h1>' + esc(d.heading) + '</h1>';
    if (d.subheading) h += '<div class="hero-sub">' + md(d.subheading) + '</div>';
    h += buttonsHTML(d.buttons);
    h += '</div></div></section>';
    return h;
  }

  var HERO_GRADS = [
    'linear-gradient(135deg,#003C46,#005F6E 55%,#0a505f)',
    'linear-gradient(120deg,#0a2f3a,#005F6E)',
    'linear-gradient(135deg,#005F6E,#0a3f4c)'
  ];
  function heroFallback() { return HERO_GRADS[Math.floor(Math.random() * HERO_GRADS.length)]; }

  function statsHTML(id, d) {
    var items = d.items || [];
    var h = '<section class="stats-section" data-od-id="' + id + '__section">';
    h += '<div class="container"><div class="stats-grid">';
    items.forEach(function (it) {
      h += '<div class="stat-card reveal" data-od-id="' + id + '-stat"><span class="stat-value">' + esc(it.value) + '</span><span class="stat-label">' + esc(it.label) + '</span></div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function cardsHTML(id, d) {
    var items = d.items || [];
    var width = d.columns === '2' ? 2 : 3;
    if (items.some(function (i) { return i.featured; })) width = '';
    var h = '<section class="band" data-od-id="' + id + '__section">';
    h += '<div class="container">';
    if (d.heading) {
      h += '<div class="sec-head"><span class="eyebrow">' + esc(d.heading.split(' ')[0]) + '</span><h2 class="sec-title">' + esc(d.heading) + '</h2></div>';
    }
    if (d.layout === 'list') {
      h += '<div class="cards-list">';
      items.forEach(function (it, i) {
        h += '<div class="list-card reveal" data-od-id="' + id + '-card' + i + '">';
        if (it.icon) h += '<div class="card-icon">' + icon(it.icon) + '</div>';
        h += '<div><h3>' + esc(it.title) + '</h3>';
        if (it.text) h += '<p>' + md(it.text) + '</p>';
        if (it.link) h += '<a class="card-link" href="' + routeHref(it.link) + '">' + esc(it.linkLabel || 'Learn more') + svgArrow() + '</a>';
        h += '</div></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="cards-grid cols-' + width + '">';
      items.forEach(function (it, i) {
        h += '<div class="feature-card' + (it.featured ? ' featured' : '') + ' reveal" data-od-id="' + id + '-card' + i + '">';
        if (it.icon) h += '<div class="card-icon">' + icon(it.icon) + '</div>';
        h += '<h3>' + esc(it.title) + '</h3>';
        if (it.text) h += '<p>' + md(it.text) + '</p>';
        if (it.link) h += '<a class="card-link" href="' + routeHref(it.link) + '">' + esc(it.linkLabel || 'Learn more') + svgArrow() + '</a>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div></section>';
    return h;
  }
  function svgArrow() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'; }

  function dividerHTML(id, d) {
    var size = d.size || 'small';
    return '<div class="space-divider ' + size + '" data-od-id="' + id + '"></div>';
  }

  function ctaHTML(id, d) {
    var tone = d.tone || 'brand';
    var btn = d.button;
    var h = '<section class="cta-section" data-od-id="' + id + '__section">';
    h += '<div class="container"><div class="cta-banner tone-' + tone + ' reveal">';
    h += '<div><h3>' + esc(d.heading) + '</h3>';
    if (d.body) h += '<p>' + md(d.body) + '</p>';
    h += '</div>';
    if (btn && btn.label) {
      var cls = tone === 'gold' ? 'btn btn-light' : 'btn btn-light';
      h += '<a class="btn ' + cls + '" href="' + routeHref(btn.link) + '">' + esc(btn.label) + '</a>';
    }
    h += '</div></div></section>';
    return h;
  }

  function accordionHTML(id, d) {
    var items = d.items || [];
    var h = '<section class="accordion-section band" data-od-id="' + id + '__section">';
    h += '<div class="container">';
    if (d.heading) h += '<div class="sec-head"><h2 class="sec-title">' + esc(d.heading) + '</h2></div>';
    h += '<div class="accordion" data-owl>';
    items.forEach(function (it, i) {
      h += '<div class="acc-item" data-acc-item data-od-id="' + id + '-item' + i + '">';
      h += '<button class="acc-head" data-acc-head aria-expanded="false" aria-controls="' + id + '-body' + i + '" id="' + id + '-btn' + i + '">' + esc(it.question) + ' <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></button>';
      h += '<div class="acc-body" id="' + id + '-body' + i + '" role="region" aria-labelledby="' + id + '-btn' + i + '"><div class="acc-body-inner">' + md(it.answer) + '</div></div>';
      h += '</div>';
    });
    h += '</div></div></section>';
    return h;
  }

  function richHTML(id, d) {
    var align = d.align || 'left';
    var width = d.width || 'full';
    var h = '<section class="rich-section band" data-od-id="' + id + '__section">';
    h += '<div class="container"><div class="rich-block ' + width + ' ' + (align === 'center' ? 'center' : '') + '">';
    if (d.heading) h += '<h3>' + esc(d.heading) + '</h3>';
    h += md(d.body);
    h += '</div></div></section>';
    return h;
  }

  function socialHTML(id, d) {
    var items = d.items || [];
    var h = '<section class="social-section band" data-od-id="' + id + '__section">';
    h += '<div class="container">';
    if (d.heading) h += '<div class="sec-head"><h2 class="sec-title">' + esc(d.heading) + '</h2></div>';
    h += '<div class="social-grid">';
    items.forEach(function (it, i) {
      h += '<a class="social-tile reveal" href="' + esc(it.url) + '" target="_blank" rel="noopener" data-od-id="' + id + '-tile' + i + '">' + icon(it.platform) + ' ' + esc(it.label) + '</a>';
    });
    h += '</div></div></section>';
    return h;
  }

  function imageTextHTML(id, d) {
    var rev = d.imagePosition === 'right' ? ' reverse' : '';
    var btns = d.buttons || [];
    var h = '<section class="band" data-od-id="' + id + '__section">';
    h += '<div class="container"><div class="imageText-row' + rev + ' reveal">';
    h += '<div class="img-side" data-img-slot="' + id + '">' + (d.image ? '<img src="' + d.image + '" alt="' + esc(d.heading || '') + '">' : '<span class="img-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg></span>') + '</div>';
    h += '<div class="text-side"><span class="eyebrow">' + esc((d.eyebrow) || '') + '</span>';
    if (d.heading) h += '<h3>' + esc(d.heading) + '</h3>';
    h += md(d.body);
    if (btns.length) {
      h += '<div class="imageText-buttons">';
      btns.forEach(function (b) {
        h += '<a class="btn ' + (b.style === 'primary' ? 'btn-primary' : 'btn-outline') + '" href="' + routeHref(b.link) + '">' + esc(b.label) + '</a>';
      });
      h += '</div>';
    }
    h += '</div></div></div></section>';
    return h;
  }

  function tableHTML(id, d) {
    var cols = d.columns || [];
    var rows = d.rows || [];
    var h = '<section class="table-section band" data-od-id="' + id + '__section">';
    h += '<div class="container">';
    if (d.heading) h += '<div class="sec-head"><h2 class="sec-title">' + esc(d.heading) + '</h2></div>';
    h += '<div class="table-wrap"><table>';
    h += '<thead><tr>';
    cols.forEach(function (c) { h += '<th>' + esc(c.label) + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr data-od-id="' + id + '-row' + i + '">';
      (r.cells || []).forEach(function (cell) { h += '<td>' + esc(cell.value) + '</td>'; });
      h += '</tr>';
    });
    h += '</tbody></table></div></div></section>';
    return h;
  }

  function buttonRowHTML(id, d) {
    var btns = d.buttons || [];
    var align = d.align || 'center';
    var h = '<section class="band" data-od-id="' + id + '__section">';
    h += '<div class="container"><div class="btn-row-center align-' + align + '">';
    btns.forEach(function (b) {
      var cls = b.style === 'primary' ? 'btn btn-primary' : 'btn btn-outline';
      h += '<a class="' + cls + '" href="' + routeHref(b.link) + '">' + esc(b.label) + '</a>';
    });
    h += '</div></div></section>';
    return h;
  }

  /* ================= ROUTING ================= */
  function routeSlug() {
    var h = location.hash || '#/home';
    if (h === '#' || h === '#/' || !h) return 'home';
    return h.replace(/^#\//, '').split('?')[0];
  }
  function routeHref(link) {
    if (!link) return '#';
    if (/^(https?:|mailto:|javascript:)/.test(link)) { return link; }
    // internal path like /flight-information/flights or /about/server
    var slug = link.replace(/^\/+/, '').replace(/\/+$/, '');
    var parts = slug.split('/');
    // try full slug first, then last segment
    var keys = Object.keys(allPages());
    if (keys.indexOf(slug) > -1) return '#/' + slug;
    // map nested path to page key
    var combined = parts.join('-');
    if (keys.indexOf(combined) > -1) return '#/' + combined;
    // try mapping last parts
    var found = keys.indexOf(parts[parts.length - 1]);
    if (found > -1) return '#/' + parts[parts.length - 1];
    return '#/' + slug;
  }

  function renderPage() {
    var route = routeSlug();
    state.currentRoute = route;
    var pages = allPages();
    var page = pages[route];
    var headerEl = document.getElementById('siteHeader');
    var body = document.getElementById('pageBody');
    if (!body) return;

    // Clear the initial loading placeholder (first paint only)
    var loadingEl = document.getElementById('pageLoading');
    if (loadingEl) loadingEl.remove();

    // Header inner (brand + nav + toggle)
    var nav = buildNav(route);
    headerEl.innerHTML = '<div class="header-inner">' + nav + '</div>';
    applyTheme();
    bindNav();

    // Page title band for pages without a leading hero
    var hasHeroFirst = page && page.sections && page.sections[0] && page.sections[0].type === 'hero';

    if (!page || !page.sections || !page.sections.length) {
      body.innerHTML = '<section class="page-title-band"><div class="container"><span class="eyebrow">' + esc(labelFor(route)) + '</span><h1>' + esc(labelFor(route)) + '</h1></div></section><div class="container" style="padding-top:var(--s7)"><div class="empty-state">This page has no content yet. Add sections from the Admin Panel.</div></div>';
      document.title = labelFor(route) + ' — ' + identity().siteName;
      bindScrollHeader(hasHeroFirst && theme().headerStyle !== 'solid');
      bindReveal();
      return;
    }

    // Title
    var title = page.titleOverride || labelFor(route);
    document.title = title + ' — ' + identity().siteName;

    // Build sections
    var html = '';
    page.sections.forEach(function (sec) { html += renderSection(sec); });
    body.innerHTML = html;
    bindAccordions();
    bindReveal();

    // Header style depends on first hero
    headerEl.classList.remove('solid');
    headerEl.style.background = '';
    if (!hasHeroFirst || theme().headerStyle === 'solid') headerEl.classList.add('solid');

    // Footer
    renderFooter();

    // Scroll to top
    window.scrollTo(0, 0);
    bindScrollHeader(hasHeroFirst && theme().headerStyle !== 'solid');
  }

  function renderFooter() {
    var grid = document.getElementById('footerGrid');
    var copy = document.getElementById('footerCopy');
    if (grid) grid.innerHTML = buildFooter();
    if (copy) copy.textContent = '© ' + new Date().getFullYear() + ' ' + identity().siteName + '. Not affiliated with Vietnam Airlines ©.';
  }

  /* ================= NAV BEHAVIOUR ================= */
  function bindNav() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mainNav');
    if (toggle && menu) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.classList.toggle('open');
        var ex = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!ex));
      });
    }
    document.querySelectorAll('[data-nav-toplevel]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var item = a.closest('.nav-item');
        if (window.innerWidth <= 920 && item && a.getAttribute('data-route') && childRoutes(a.getAttribute('data-route')).length) {
          e.preventDefault();
          var open = item.classList.contains('open');
          document.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
          if (!open) item.classList.add('open');
          e.stopPropagation();
        }
      });
    });
    // mark top-level active for dropdown parents
    var route = routeSlug();
    document.querySelectorAll('.nav-item').forEach(function (item) {
      var a = item.querySelector('[data-route]');
      if (a) {
        var r = a.getAttribute('data-route');
        var currentParent = PAGES_META[route] ? PAGES_META[route].parent : null;
        if (r === route || currentParent === r) item.classList.add('open');
      }
    });
  }

  /* One-time global listeners (registered once, not per render) */
  function bindGlobals() {
    if (state.globalBound) return;
    state.globalBound = true;
    // close menus on outside click
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-item')) return;
      if (window.innerWidth > 920) {
        document.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
      } else {
        var menu = document.getElementById('mainNav');
        if (menu && !e.target.closest('#mainNav')) menu.classList.remove('open');
      }
    });
    ensureScrollHeader();
  }

  /* Single shared scroll listener for the header (no accumulation) */
  function ensureScrollHeader() {
    if (state.scrollBound) return;
    state.scrollBound = true;
    window.addEventListener('scroll', onHeaderScroll, { passive: true });
  }
  function onHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    if (window.scrollY > 30) header.classList.add('solid');
    else if (state.headerTMode) header.classList.remove('solid');
  }

  function bindAccordions() {
    document.querySelectorAll('[data-acc-head]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc-item');
        var open = item.classList.contains('open');
        item.classList.toggle('open', !open);
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  function bindScrollHeader(transparentMode) {
    state.headerTMode = transparentMode !== undefined ? transparentMode : theme().headerStyle !== 'solid';
    ensureScrollHeader();
    onHeaderScroll();
  }

  function bindReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  /* ================= FOOTER ================= */
  function buildFooter() {
    var ident = identity();
    var h = '<div class="footer-brand"><img class="brand-logo" src="' + logoSource() + '" alt=""><div>' + esc(ident.siteName) + '</div></div>';
    h += '<div class="footer-col" data-od-id="footer-about"><h4>About</h4>';
    childRoutes('about').forEach(function (c) { h += '<a href="#/' + c + '">' + esc(labelFor(c)) + '</a>'; });
    h += '</div>';
    h += '<div class="footer-col" data-od-id="footer-info"><h4>Explore</h4>';
    ['rules', 'lotusmiles', 'affiliates', 'careers', 'news'].forEach(function (c) {
      if (!isHidden(c)) h += '<a href="#/' + c + '">' + esc(labelFor(c)) + '</a>';
    });
    h += '</div>';
    return h;
  }

  /* ================= AUTH (admin) ================= */
  function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function storageDel(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function isUnlocked() { return storageGet(LOCK_KEY) === '1'; }
  function unlock() { storageSet(LOCK_KEY, '1'); }
  function lock() { storageDel(LOCK_KEY); }
  function setPasswordHash(hash) {
    var content = state.content || {};
    content.admin = content.admin || {};
    content.admin.passwordHash = hash;
    state.content = content;
  }
  function getPasswordHash() {
    var c = state.content || {};
    return (c.admin && c.admin.passwordHash) || '';
  }

  /* ================= DRAFT HELPERS ================= */
  function getDraft() { return state.draft; }
  function getContent() { return state.content; }
  function saveDraft() {
    try {
      if (state.draft) localStorage.setItem(STORE_KEY, JSON.stringify(state.draft));
    } catch (e) {}
  }
  function setDraftPath(path, value) {
    if (!state.draft) state.draft = {};
    var parts = path.split('.');
    var cur = state.draft;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    saveDraft();
  }
  function getDraftPath(path) {
    if (!state.draft) return undefined;
    var parts = path.split('.');
    var cur = state.draft;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function clearDraft() { storageDel(STORE_KEY); state.draft = null; }
  function exportJSON() {
    var base = state.content ? JSON.parse(JSON.stringify(state.content)) : JSON.parse(JSON.stringify(EMPTY_CONTENT));
    if (state.draft) base = merge(base, state.draft);
    return JSON.stringify(base, null, 2);
  }

  /* ================= UTIL ================= */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    var t = document.getElementById('adminToast');
    if (!t) { t = document.createElement('div'); t.id = 'adminToast'; t.className = 'admin-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__vnaToast);
    window.__vnaToast = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ================= INIT (public) ================= */
  function initSite() {
    loadContent().then(function () {
      var host = document.getElementById('siteHeader');
      var root = document.getElementById('appContent');
      if (!root) return;
      // ensure header + body exist
      applyTheme();
      bindGlobals();
      bindRouter();
      // initial render
      renderPage();
    });
  }

  function bindRouter() {
    window.addEventListener('hashchange', function () {
      renderPage();
      window.scrollTo(0, 0);
    });
    window.addEventListener('resize', function () {
      var menu = document.getElementById('mainNav');
      if (menu && window.innerWidth > 920) menu.classList.remove('open');
    });
  }

  return {
    loadContent: loadContent,
    renderPage: renderPage,
    applyTheme: applyTheme,
    theme: theme,
    identity: identity,
    allPages: allPages,
    navOverrides: navOverrides,
    labelFor: labelFor,
    buildNav: buildNav,
    buildFooter: buildFooter,
    renderSection: renderSection,
    routeSlug: routeSlug,
    routeHref: routeHref,
    md: md,
    esc: esc,
    icon: icon,
    logoSource: logoSource,
    isUnlocked: isUnlocked,
    unlock: unlock,
    lock: lock,
    getPasswordHash: getPasswordHash,
    setPasswordHash: setPasswordHash,
    getContent: getContent,
    getDraft: getDraft,
    setDraftPath: setDraftPath,
    getDraftPath: getDraftPath,
    clearDraft: clearDraft,
    saveDraft: saveDraft,
    exportJSON: exportJSON,
    toast: toast,
    initSite: initSite
  };
})();
