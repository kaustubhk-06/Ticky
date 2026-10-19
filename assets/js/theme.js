/**
 * Applies a resolved theme from the backend to any page.
 *
 * Background types:
 *   default  — the slow drifting colour wash (built in)
 *   image    — a static URL (jpg, png, webp, svg, or animated gif)
 *   pattern  — built-in repeating SVG textures (stars, grain, dots)
 */
(function (global) {
  'use strict';

  var FONT_LINK_ID = 'osdays-theme-fonts';
  var SPACE_LINK_ID = 'osdays-space-css';
  var STYLE_ID = 'osdays-theme-vars';

  var COLOR_MAP = {
    bg: '--bg',
    surface: '--surface',
    surfaceSunk: '--surface-sunk',
    ink: '--ink',
    inkMuted: '--ink-muted',
    inkFaint: '--ink-faint',
    hair: '--hair',
    accent: '--accent',
    accentWash: '--accent-wash',
    ok: '--ok',
    bad: '--bad',
    headerBg: '--header-bg',
    headerText: '--header-text',
    btnPrimaryBg: '--btn-primary-bg',
    btnPrimaryText: '--btn-primary-text',
    glowA: '--glow-a',
    glowB: '--glow-b'
  };

  var PRESET_PALETTES = {
    day: {
      fonts: { display: 'Fraunces', body: 'Instrument Sans', mono: 'IBM Plex Mono' },
      colors: {
        bg: '#f7f3eb', surface: '#fffdf8', ink: '#191512', accent: '#b4441f',
        headerBg: '#191512', headerText: '#f7f3eb', btnPrimaryBg: '#191512', btnPrimaryText: '#f7f3eb'
      }
    },
    night: {
      fonts: { display: 'Fraunces', body: 'Instrument Sans', mono: 'IBM Plex Mono' },
      colors: {
        bg: '#141210', surface: '#1d1916', ink: '#f2ece2', accent: '#f0733f',
        headerBg: '#0e0c0b', headerText: '#f2ece2', btnPrimaryBg: '#f2ece2', btnPrimaryText: '#141210'
      }
    },
    space: {
      fonts: { display: 'Fraunces', body: 'Instrument Sans', mono: 'IBM Plex Mono' },
      colors: {
        bg: '#0b0e1a', surface: '#141a2e', ink: '#f3efe4', accent: '#ff6a3d',
        headerBg: '#080a13', headerText: '#f3efe4', btnPrimaryBg: '#f3efe4', btnPrimaryText: '#0b0e1a'
      }
    }
  };

  var PATTERN_SVGS = {
    stars: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cg fill='%23F3EFE4'%3E%3Ccircle cx='23' cy='48' r='0.9' opacity='0.8'/%3E%3Ccircle cx='142' cy='63' r='1.3' opacity='0.9'/%3E%3Ccircle cx='255' cy='88' r='1.0' opacity='0.7'/%3E%3Ccircle cx='220' cy='195' r='1.5' opacity='0.9'/%3E%3Ccircle cx='130' cy='290' r='1.0' opacity='0.7'/%3E%3Ccircle cx='290' cy='350' r='1.4' opacity='0.9'/%3E%3C/g%3E%3C/svg%3E\")",
    grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
    dots: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='4' cy='4' r='1.2' fill='%23000' fill-opacity='0.08'/%3E%3C/svg%3E\")"
  };

  function fontHref(fonts) {
    var families = [
      encodeURIComponent(fonts.display) + ':wght@400;500;600',
      encodeURIComponent(fonts.body) + ':wght@400;500;600',
      encodeURIComponent(fonts.mono) + ':wght@400;500'
    ];
    if (fonts.display === 'Fraunces') {
      families[0] = 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600';
    }
    return 'https://fonts.googleapis.com/css2?family=' + families.join('&family=') + '&display=swap';
  }

  function loadFonts(fonts) {
    if (!fonts) return;
    var link = document.getElementById(FONT_LINK_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = fontHref(fonts);
  }

  function toggleSpaceCss(preset, surface) {
    var link = document.getElementById(SPACE_LINK_ID);
    var want = preset === 'space' && surface === 'register';
    if (want && !link) {
      link = document.createElement('link');
      link.id = SPACE_LINK_ID;
      link.rel = 'stylesheet';
      link.href = 'assets/css/space.css';
      document.head.appendChild(link);
    } else if (!want && link) {
      link.remove();
    }
  }

  function normalizeBgUrl(url) {
    var s = String(url || '');
    var m = s.match(/(?:[?&]id=|^\/d\/)([\w-]+)/);
    if (/drive\.google\.com/.test(s) && m) {
      return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1920';
    }
    return s;
  }

  function buildBackgroundCss(bg) {
    var type = (bg && bg.type) || 'default';
    var lines = [];
    var position = bgPositionCss_(bg && bg.position);

    if (type === 'image' && bg.imageUrl) {
      var imageUrl = normalizeBgUrl(bg.imageUrl);
      var overlay = typeof bg.overlayOpacity === 'number' ? bg.overlayOpacity : 0.35;
      lines.push('background-image: linear-gradient(rgba(0,0,0,' + overlay + '), rgba(0,0,0,' + overlay + ')), url("' + imageUrl.replace(/"/g, '\\"') + '");');
      lines.push('background-size: cover;');
      lines.push('background-position: ' + position + ';');
      lines.push('background-repeat: no-repeat;');
      lines.push('opacity: 1;');
      return lines.join('\n');
    }

    if (type === 'pattern' && bg.pattern && PATTERN_SVGS[bg.pattern]) {
      lines.push('background-image: ' + PATTERN_SVGS[bg.pattern] + ';');
      lines.push('background-size: 400px 400px;');
      lines.push('background-repeat: repeat;');
      lines.push('opacity: 0.65;');
      return lines.join('\n');
    }

    lines.push('background-image: none;');
    lines.push('opacity: 0.04;');
    return lines.join('\n');
  }

  function bgPositionCss_(value) {
    if (value === 'top') return 'center top';
    if (value === 'bottom') return 'center bottom';
    return 'center center';
  }

  function applyColorsToRoot(surface) {
    var root = document.documentElement;
    root.style.setProperty('--font-display', '"' + surface.fonts.display + '", Georgia, serif');
    root.style.setProperty('--font-body', '"' + surface.fonts.body + '", system-ui, sans-serif');
    root.style.setProperty('--font-mono', '"' + surface.fonts.mono + '", ui-monospace, monospace');
    Object.keys(COLOR_MAP).forEach(function (key) {
      if (surface.colors && surface.colors[key]) {
        root.style.setProperty(COLOR_MAP[key], surface.colors[key]);
      }
    });
  }

  function apply(resolved, surfaceKey) {
    if (!resolved) return;
    var surface = resolved[surfaceKey === 'register' ? 'register' : 'staff'];
    if (!surface) return;

    document.documentElement.setAttribute('data-theme', surface.preset || 'day');
    document.documentElement.setAttribute('data-bg-type', (surface.background && surface.background.type) || 'default');
    document.documentElement.setAttribute('data-bg-animate', surface.background && surface.background.animate === false ? 'off' : 'on');

    loadFonts(surface.fonts);
    toggleSpaceCss(surface.preset, surfaceKey);

    // Inline on <html> so we beat [data-theme='day'] in tokens.css. The admin
    // preview already did this; the live pages were losing the fight.
    applyColorsToRoot(surface);

    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent =
      'body::after {\n  ' + buildBackgroundCss(surface.background) + '\n}\n' +
      (surface.background && surface.background.animate === false
        ? 'body::before { animation: none !important; }\n'
        : '');

    if (surface.meta && surface.meta.themeColor) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = surface.meta.themeColor;
    }
  }

  /** Preview inside admin.html — scoped to one container, not the whole page. */
  function applyToElement(el, surface) {
    if (!el || !surface) return;
    el.setAttribute('data-theme', surface.preset || 'day');
    el.style.setProperty('--font-display', '"' + surface.fonts.display + '", Georgia, serif');
    el.style.setProperty('--font-body', '"' + surface.fonts.body + '", system-ui, sans-serif');
    el.style.setProperty('--font-mono', '"' + surface.fonts.mono + '", ui-monospace, monospace');
    Object.keys(COLOR_MAP).forEach(function (key) {
      if (surface.colors && surface.colors[key]) {
        el.style.setProperty(COLOR_MAP[key], surface.colors[key]);
      }
    });
  }

  function resolveForPreview(rawSurface) {
    if (!rawSurface) return null;
    var preset = rawSurface.preset || 'day';
    var base = PRESET_PALETTES[preset] || PRESET_PALETTES.day;
    return {
      preset: preset,
      colors: Object.assign({}, base.colors, rawSurface.colors || {}),
      fonts: Object.assign({}, base.fonts, rawSurface.fonts || {}),
      background: rawSurface.background || {}
    };
  }

  global.Theme = {
    apply: apply,
    applyToElement: applyToElement,
    resolveForPreview: resolveForPreview,
    PRESET_PALETTES: PRESET_PALETTES
  };
})(window);
