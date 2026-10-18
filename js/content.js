/* ============================================================
   الأهلي مصر — طبقة المحتوى
   تجلب المحتوى المحفوظ في قاعدة البيانات وتطبّقه على الصفحة.
   تُحمَّل بعد content-default.js وقبل main.js.
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    url: 'https://lxtuzvbtxajmmblocsmo.supabase.co',
    /* المفتاح العام (anon) — الكتابة محميّة بسياسات RLS، الحماية الفعلية عبر تسجيل الدخول */
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dHV6dmJ0eGFqbW1ibG9jc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTUwMDgsImV4cCI6MjEwNzg5MTAwOH0.VlJMQwYK7Up7TsOtMen6XWCj5qXPht5KK5FXYuccsPA'
  };

  /* ---------- أدوات مساعدة ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* يسمح فقط بوسوم بسيطة آمنة: strong, b, em, i, br, span */
  var ALLOWED_TAGS = { STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, SPAN: 1 };
  function sanitize(html) {
    var root = document.createElement('div');
    root.innerHTML = String(html == null ? '' : html);
    (function clean(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) {
          clean(child);
          if (!ALLOWED_TAGS[child.tagName]) {
            var frag = document.createDocumentFragment();
            while (child.firstChild) frag.appendChild(child.firstChild);
            node.replaceChild(frag, child);
          } else {
            Array.prototype.slice.call(child.attributes || []).forEach(function (a) {
              child.removeAttribute(a.name);
            });
          }
        } else if (child.nodeType !== 3) {
          node.removeChild(child);
        }
      });
    })(root);
    return root.innerHTML;
  }

  function txt(el, val) { if (el) el.textContent = val == null ? '' : String(val); }
  function rich(el, val) { if (el) el.innerHTML = sanitize(val); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeHref(h) {
    h = String(h == null ? '' : h).trim();
    if (!h) return '';
    if (/^(https?:|mailto:|tel:|\/\/)/i.test(h) || h.charAt(0) === '#') return h;
    return '';
  }

  function icon(name) {
    return '<svg class="ico" aria-hidden="true"><use href="#' +
      (/^i-[a-z0-9-]+$/.test(String(name)) ? name : 'i-file') + '"/></svg>';
  }

  /* دمج المحتوى المحفوظ فوق الافتراضي (القوائم تستبدل بالكامل) */
  function merge(base, over) {
    if (!over || typeof over !== 'object') return base;
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) &&
          out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = merge(out[k], v);
      } else {
        out[k] = v;
      }
    });
    return out;
  }

  /* ---------- عناصر الصفحة الثابتة ---------- */

  var els = {};
  function cacheEls() {
    els.navLinks = qa('#nav .nav__link');
    els.headerCta = q('.header__cta');
    els.heroEyebrow = q('.hero__eyebrow');
    els.heroTitle = q('.hero__title');
    els.heroTagline = q('.hero__tagline');
    els.heroLead = q('.hero__lead');
    els.heroActions = q('.hero__actions');
    els.heroTrust = q('.hero__trust');
    els.heroVisual = q('.hero__visual');
    els.statsGrid = q('.stats__grid');
    els.about = q('#about');
    els.aboutHighlights = q('.about__highlights');
    els.servicesCards = q('#services .cards');
    els.processList = q('ol.process');
    els.whyCards = q('#why .cards');
    els.goalsCards = q('#goals .cards');
    els.chips = q('#audience .chips');
    els.quote = q('#audience .quote');
    els.ctaInner = q('.cta-band__inner');
    els.ctaBtn = q('.cta-band__inner .btn');
    els.contactInfo = q('.contact__info');
    els.serviceSelect = q('#f-service');
    els.formNote = q('#formNote');
    els.footerCols = qa('.footer__col');
    els.footerBrandP = q('.footer__brand p');
    els.footerSlogan = q('.footer__slogan');
    els.footerBottom = q('.footer__bottom p');
    els.waFab = q('.wa-fab');
  }

  /* ---------- رسامو القوائم ---------- */

  var NAV_KEYS = ['home', 'about', 'services', 'process', 'why', 'contact'];

  function renderNav(nav) {
    els.navLinks.forEach(function (a) {
      var key = String(a.getAttribute('href') || '').replace('#', '');
      if (nav && nav[key]) txt(a, nav[key]);
    });
    if (els.headerCta && nav && nav.cta) txt(els.headerCta, nav.cta);
  }

  function renderHero(hero) {
    if (els.heroEyebrow) els.heroEyebrow.innerHTML = '<span class="dot"></span> ' + esc(hero.eyebrow);
    txt(els.heroTitle, hero.title);
    txt(els.heroTagline, hero.tagline);
    rich(els.heroLead, hero.lead);
    var btns = qa('a', els.heroActions);
    if (btns[0]) txt(btns[0], hero.ctaPrimary);
    if (btns[1]) txt(btns[1], hero.ctaSecondary);
    if (els.heroTrust) {
      els.heroTrust.innerHTML = (hero.trust || []).map(function (t) {
        return '<li><span class="check" aria-hidden="true">✓</span> ' + esc(t) + '</li>';
      }).join('');
    }
    if (els.heroVisual) {
      qa('.float-card', els.heroVisual).forEach(function (c) { c.parentNode.removeChild(c); });
      (hero.floats || []).slice(0, 3).forEach(function (f, i) {
        var d = document.createElement('div');
        d.className = 'float-card float-card--' + (i + 1);
        d.innerHTML = '<span class="float-card__icon">' + icon(f.icon) + '</span>' +
          '<span class="float-card__text">' + esc(f.text) + '</span>';
        els.heroVisual.appendChild(d);
      });
    }
  }

  function renderStats(stats) {
    if (!els.statsGrid) return;
    els.statsGrid.innerHTML = (stats || []).map(function (s) {
      var v = String(s.value == null ? '' : s.value).trim();
      var suf = String(s.suffix == null ? '' : s.suffix);
      var n = parseInt(v, 10);
      var numAttr = isNaN(n) ? '' : ' data-count="' + n + '"';
      return '<div class="stat" data-reveal>' +
        '<span class="stat__num"' + numAttr + ' data-suffix="' + esc(suf) + '" dir="ltr">' + esc(v + suf) + '</span>' +
        '<span class="stat__label">' + esc(s.label) + '</span></div>';
    }).join('');
  }

  function renderAbout(about) {
    if (!els.about) return;
    var eb = q('.section__eyebrow', els.about);
    var h2 = q('.section__title', els.about);
    txt(eb, about.eyebrow);
    txt(h2, about.title);
    var ps = qa('.about__p', els.about);
    if (ps[0]) rich(ps[0], about.p1);
    if (ps[1]) rich(ps[1], about.p2);
    if (els.aboutHighlights) {
      els.aboutHighlights.innerHTML = (about.highlights || []).map(function (h) {
        return '<div class="highlight">' + icon(h.icon) +
          '<div><h3>' + esc(h.title) + '</h3><p>' + esc(h.text) + '</p></div></div>';
      }).join('');
    }
    var cards = qa('.side-card', els.about);
    if (cards[0]) {
      txt(q('.side-card__badge', cards[0]), about.vision.badge);
      txt(q('p', cards[0]), about.vision.text);
    }
    if (cards[1]) {
      txt(q('.side-card__badge', cards[1]), about.mission.badge);
      txt(q('p', cards[1]), about.mission.text);
    }
  }

  function renderCards(container, items, extraClass) {
    if (!container) return;
    container.innerHTML = (items || []).map(function (it) {
      return '<article class="card' + (extraClass ? ' ' + extraClass : '') + '" data-reveal>' +
        '<span class="card__icon">' + icon(it.icon) + '</span>' +
        '<h3 class="card__title">' + esc(it.title) + '</h3>' +
        '<p class="card__text">' + esc(it.text) + '</p></article>';
    }).join('');
  }

  function renderProcess(proc) {
    if (!els.processList) return;
    els.processList.innerHTML = (proc.items || []).map(function (it, i) {
      var num = (i + 1 < 10 ? '0' : '') + (i + 1);
      return '<li class="process__item" data-reveal>' +
        '<span class="process__num">' + num + '</span>' +
        '<h3>' + esc(it.title) + '</h3><p>' + esc(it.text) + '</p></li>';
    }).join('');
  }

  function renderAudience(aud) {
    if (!els.chips) return;
    els.chips.innerHTML = (aud.chips || []).map(function (c) {
      return '<li class="chip">' + esc(c) + '</li>';
    }).join('');
    if (els.quote) {
      txt(q('p', els.quote), aud.quote);
      txt(q('footer', els.quote), aud.quoteFooter);
    }
  }

  function renderContact(contact) {
    if (els.contactInfo) {
      els.contactInfo.innerHTML = (contact.info || []).map(function (it) {
        var href = safeHref(it.href);
        var tag = href ? 'a' : 'div';
        var attrs = href ? ' href="' + esc(href) + '"' +
          (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '') : '';
        var isLtr = /^[\x20-\x7E]+$/.test(String(it.value || '').trim());
        return '<' + tag + ' class="info-item"' + attrs + '>' +
          '<span class="info-item__icon">' + icon(it.icon) + '</span>' +
          '<span class="info-item__body"><small>' + esc(it.label) + '</small>' +
          '<b' + (isLtr ? ' dir="ltr"' : '') + '>' + esc(it.value) + '</b></span></' + tag + '>';
      }).join('');
    }
    if (els.serviceSelect) {
      els.serviceSelect.innerHTML =
        '<option value="" selected disabled>اختر نوع الخدمة</option>' +
        (contact.serviceOptions || []).map(function (o) {
          return '<option>' + esc(o) + '</option>';
        }).join('');
    }
    if (els.formNote && contact.note) txt(els.formNote, contact.note);
    /* رقم واتساب ورابط الزر العائم */
    var waItem = (contact.info || []).filter(function (i) { return i.icon === 'i-whatsapp'; })[0];
    var waHref = waItem ? safeHref(waItem.href) : '';
    var m = waHref.match(/wa\.me\/(\d+)/);
    if (els.waFab && m) els.waFab.setAttribute('href', 'https://wa.me/' + m[1]);
    var mailItem = (contact.info || []).filter(function (i) { return i.icon === 'i-mail'; })[0];
    window.AH_RUNTIME = window.AH_RUNTIME || {};
    if (m) window.AH_RUNTIME.wa = m[1];
    if (mailItem) window.AH_RUNTIME.mail = String(mailItem.value || '').trim();
  }

  function renderFooter(footer) {
    if (els.footerBrandP) txt(els.footerBrandP, footer.brand);
    if (els.footerSlogan) txt(els.footerSlogan, footer.slogan);
    var cols = els.footerCols;
    if (cols[0]) {
      txt(q('h3', cols[0]), footer.titles.quick);
      q('ul', cols[0]).innerHTML = (footer.quickLinks || []).map(function (l) {
        return '<li><a href="' + esc(safeHref(l.href) || '#') + '">' + esc(l.label) + '</a></li>';
      }).join('');
    }
    if (cols[1]) {
      txt(q('h3', cols[1]), footer.titles.services);
      q('ul', cols[1]).innerHTML = (footer.serviceLinks || []).map(function (l) {
        return '<li><a href="' + esc(safeHref(l.href) || '#') + '">' + esc(l.label) + '</a></li>';
      }).join('');
    }
    if (cols[2]) {
      txt(q('h3', cols[2]), footer.titles.contact);
      var ul = q('ul', cols[2]);
      ul.innerHTML = (footer.contact || []).map(function (c) {
        var href = safeHref(c.href);
        var isLtr = /^[\x20-\x7E]+$/.test(String(c.text || '').trim());
        var body = href
          ? '<a href="' + esc(href) + '"' + (/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '') +
            (isLtr ? ' dir="ltr"' : '') + '>' + esc(c.text) + '</a>'
          : '<span>' + esc(c.text) + '</span>';
        return '<li>' + icon(c.icon) + body + '</li>';
      }).join('');
    }
    if (els.footerBottom) {
      els.footerBottom.innerHTML = '© <span id="year">' + new Date().getFullYear() + '</span> ' + esc(footer.copyright);
    }
  }

  function renderMeta(meta) {
    if (meta.title) document.title = meta.title;
    var md = q('meta[name="description"]');
    if (md && meta.description) md.setAttribute('content', meta.description);
    var ot = q('meta[property="og:title"]');
    if (ot && meta.title) ot.setAttribute('content', meta.title);
    var od = q('meta[property="og:description"]');
    if (od && meta.description) od.setAttribute('content', meta.description);
  }

  /* ---------- التطبيق الكامل ---------- */

  function applyContent(c) {
    try {
      renderMeta(c.meta);
      renderNav(c.nav);
      renderHero(c.hero);
      renderStats(c.stats);
      renderAbout(c.about);
      txt(q('#services .section__eyebrow'), c.services.eyebrow);
      txt(q('#services .section__title'), c.services.title);
      txt(q('#services .section__desc'), c.services.desc);
      renderCards(els.servicesCards, c.services.items);
      txt(q('#process .section__eyebrow'), c.process.eyebrow);
      txt(q('#process .section__title'), c.process.title);
      txt(q('#process .section__desc'), c.process.desc);
      renderProcess(c.process);
      txt(q('#why .section__eyebrow'), c.why.eyebrow);
      txt(q('#why .section__title'), c.why.title);
      txt(q('#why .section__desc'), c.why.desc);
      renderCards(els.whyCards, c.why.items);
      txt(q('#goals .section__eyebrow'), c.goals.eyebrow);
      txt(q('#goals .section__title'), c.goals.title);
      renderCards(els.goalsCards, c.goals.items, 'card--goal');
      txt(q('#audience .section__eyebrow'), c.audience.eyebrow);
      txt(q('#audience .section__title'), c.audience.title);
      txt(q('#audience .section__desc'), c.audience.desc);
      renderAudience(c.audience);
      if (els.ctaInner) {
        txt(q('h2', els.ctaInner), c.cta.title);
        txt(q('p', els.ctaInner), c.cta.text);
        if (els.ctaBtn) txt(els.ctaBtn, c.cta.button);
      }
      txt(q('#contact .section__eyebrow'), c.contact.eyebrow);
      txt(q('#contact .section__title'), c.contact.title);
      txt(q('#contact .section__desc'), c.contact.desc);
      renderContact(c.contact);
      renderFooter(c.footer);
      window.AH_CONTENT = c;
      document.dispatchEvent(new CustomEvent('ah:content-applied'));
    } catch (e) {
      /* أي خطأ في التطبيق لا يمنع عرض المحتوى الافتراضي */
      if (window.console && console.warn) console.warn('content apply failed:', e);
    }
  }

  /* ---------- نقطة البدء ---------- */

  function start() {
    cacheEls();
    var defaults = window.AH_DEFAULTS || null;
    if (!defaults) return;
    /* طبّق الافتراضي فورًا (يطابق HTML الأصلي) ثم اجلب التعديلات إن وُجدت */
    applyContent(defaults);
    fetch(CFG.url + '/rest/v1/site_content?id=eq.1&select=data', {
      headers: { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key }
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        var data = rows && rows[0] && rows[0].data;
        if (data && typeof data === 'object' && Object.keys(data).length) {
          applyContent(merge(defaults, data));
        }
      })
      .catch(function () { /* الاحتفاظ بالافتراضي عند فشل الشبكة */ });
  }

  /* السكربتات في نهاية body — عناصر الصفحة موجودة، نطبّق فورًا
     حتى يربط main.js الرسّامات على العناصر النهائية */
  if (q('.hero__title')) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
