/* ============================================================
   الأهلي مصر — لوحة التحكم
   تسجيل دخول + محرّر محتوى يحفظ في Supabase (REST مباشرة)
   لا يعتمد على أي مكتبة خارجية.
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    url: 'https://lxtuzvbtxajmmblocsmo.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dHV6dmJ0eGFqbW1ibG9jc21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTUwMDgsImV4cCI6MjEwNzg5MTAwOH0.VlJMQwYK7Up7TsOtMen6XWCj5qXPht5KK5FXYuccsPA'
  };

  var STORE_KEY = 'ah_admin_session';

  /* ---------- أدوات ---------- */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }

  function setPath(obj, path, val) {
    var parts = path.split('.');
    var last = parts.pop();
    var target = parts.reduce(function (o, k) {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
      return o[k];
    }, obj);
    target[last] = val;
  }

  function mergeDefaults(base, over) {
    if (!over || typeof over !== 'object') return base;
    var out = deepClone(base);
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) &&
          out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = mergeDefaults(out[k], v);
      } else {
        out[k] = v;
      }
    });
    return out;
  }

  /* ---------- الجلسة ---------- */

  function getSession() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  function saveSession(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(STORE_KEY); }

  function sessionExpired(s) { return !s || !s.expires_at || Date.now() / 1000 >= s.expires_at - 30; }

  function api(path, opts, retry) {
    opts = opts || {};
    var session = getSession();
    opts.headers = Object.assign({
      apikey: CFG.key,
      Authorization: 'Bearer ' + (session ? session.access_token : CFG.key),
      'Content-Type': 'application/json'
    }, opts.headers || {});

    return fetch(CFG.url + path, opts).then(function (r) {
      if (r.status === 401 && !retry) {
        return refreshSession().then(function () { return api(path, opts, true); });
      }
      return r;
    });
  }

  function refreshSession() {
    var s = getSession();
    if (!s || !s.refresh_token) { logout(); return Promise.reject(); }
    return fetch(CFG.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: CFG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) {
      if (!r.ok) { logout(); throw new Error('refresh failed'); }
      return r.json();
    }).then(function (d) {
      saveSession({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at,
        email: (d.user && d.user.email) || s.email
      });
    });
  }

  function login(email, pass) {
    return fetch(CFG.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: CFG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.msg || 'فشل تسجيل الدخول'); });
      return r.json();
    }).then(function (d) {
      saveSession({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at,
        email: (d.user && d.user.email) || email
      });
    });
  }

  function logout() {
    clearSession();
    showLogin();
  }

  /* ---------- واجهة الأقسام (المخطط) ---------- */

  var ICONS = [
    ['i-file', 'ملف / مستندات'], ['i-clipboard', 'قائمة / تعريفات'], ['i-pin', 'موقع / رفع مسمى'],
    ['i-building', 'عمارة / شهر عقاري'], ['i-seal', 'ختم / تراخيص'], ['i-tool', 'أدوات / هدم'],
    ['i-key', 'مفاتيح / إيجار'], ['i-settings', 'إعدادات / مرافق'], ['i-shield', 'درع / ثقة'],
    ['i-landmark', 'مبنى بنكي'], ['i-layers', 'طبقات / حلول'], ['i-trend', 'نمو / تطور'],
    ['i-target', 'هدف'], ['i-check-circle', 'إنجاز'], ['i-users', 'عملاء'],
    ['i-award', 'جائزة / تميّز'], ['i-phone', 'هاتف'], ['i-mail', 'بريد'],
    ['i-whatsapp', 'واتساب'], ['i-clock', 'ساعات العمل']
  ];

  var SECTIONS = [
    {
      id: 'hero', label: 'الواجهة الرئيسية',
      desc: 'أول ما يراه الزائر: العنوان الرئيسي والدعوة لاتخاذ إجراء.',
      fields: [
        { path: 'hero.eyebrow', type: 'text', label: 'السطر العلوي الصغير' },
        { path: 'hero.title', type: 'text', label: 'العنوان الرئيسي' },
        { path: 'hero.tagline', type: 'text', label: 'العبارة الفرعية' },
        { path: 'hero.lead', type: 'textarea', label: 'الفقرة التعريفية', hint: 'يمكن استخدام وسم <strong> للتأكيد' },
        { path: 'hero.ctaPrimary', type: 'text', label: 'نص الزر الأساسي' },
        { path: 'hero.ctaSecondary', type: 'text', label: 'نص الزر الثانوي' },
        { path: 'hero.trust', type: 'list', label: 'نقاط الثقة (تحت الأزرار)', itemLabel: 'نقطة', fields: [
          { path: 'text', type: 'text', label: 'النص' }
        ]},
        { path: 'hero.floats', type: 'list', label: 'البطاقات العائمة (بجانب الشعار)', itemLabel: 'بطاقة', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'text', type: 'text', label: 'النص' }
        ]}
      ]
    },
    {
      id: 'stats', label: 'الأرقام',
      desc: 'شريط الأرقام الظاهرة أسفل الواجهة الرئيسية.',
      fields: [
        { path: 'stats', type: 'list', label: 'القيم', itemLabel: 'رقم', fields: [
          { path: 'value', type: 'text', label: 'الرقم' },
          { path: 'suffix', type: 'text', label: 'اللاحقة ( + أو % أو فارغة )' },
          { path: 'label', type: 'text', label: 'الوصف أسفل الرقم' }
        ]}
      ]
    },
    {
      id: 'about', label: 'من نحن',
      desc: 'قسم التعريف بالشركة والرؤية والرسالة.',
      fields: [
        { path: 'about.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'about.title', type: 'text', label: 'العنوان' },
        { path: 'about.p1', type: 'textarea', label: 'الفقرة الأولى', hint: 'يمكن استخدام وسم <strong>' },
        { path: 'about.p2', type: 'textarea', label: 'الفقرة الثانية', hint: 'يمكن استخدام وسم <strong>' },
        { path: 'about.highlights', type: 'list', label: 'أبرز المزايا', itemLabel: 'ميزة', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'title', type: 'text', label: 'العنوان' },
          { path: 'text', type: 'text', label: 'النص' }
        ]},
        { path: 'about.vision.badge', type: 'text', label: 'شارة الرؤية' },
        { path: 'about.vision.text', type: 'textarea', label: 'نص الرؤية' },
        { path: 'about.mission.badge', type: 'text', label: 'شارة الرسالة' },
        { path: 'about.mission.text', type: 'textarea', label: 'نص الرسالة' }
      ]
    },
    {
      id: 'services', label: 'خدماتنا',
      desc: 'بطاقات الخدمات — أضف خدمة جديدة أو احذف أو عدّل.',
      fields: [
        { path: 'services.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'services.title', type: 'text', label: 'عنوان القسم' },
        { path: 'services.desc', type: 'textarea', label: 'الوصف' },
        { path: 'services.items', type: 'list', label: 'الخدمات', itemLabel: 'خدمة', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'title', type: 'text', label: 'عنوان الخدمة' },
          { path: 'text', type: 'textarea', label: 'وصف الخدمة' }
        ]}
      ]
    },
    {
      id: 'process', label: 'مراحل العمل',
      desc: 'خطوات دورة حياة الأصل العقاري (تُرقم تلقائيًا 01، 02…).',
      fields: [
        { path: 'process.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'process.title', type: 'text', label: 'عنوان القسم' },
        { path: 'process.desc', type: 'textarea', label: 'الوصف' },
        { path: 'process.items', type: 'list', label: 'المراحل', itemLabel: 'مرحلة', fields: [
          { path: 'title', type: 'text', label: 'عنوان المرحلة' },
          { path: 'text', type: 'textarea', label: 'وصف المرحلة' }
        ]}
      ]
    },
    {
      id: 'why', label: 'لماذا نحن',
      desc: 'مزايا الشركة التنافسية.',
      fields: [
        { path: 'why.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'why.title', type: 'text', label: 'عنوان القسم' },
        { path: 'why.desc', type: 'textarea', label: 'الوصف' },
        { path: 'why.items', type: 'list', label: 'المزايا', itemLabel: 'ميزة', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'title', type: 'text', label: 'العنوان' },
          { path: 'text', type: 'textarea', label: 'النص' }
        ]}
      ]
    },
    {
      id: 'goals', label: 'أهداف الشركة',
      desc: 'بطاقات الأهداف.',
      fields: [
        { path: 'goals.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'goals.title', type: 'text', label: 'عنوان القسم' },
        { path: 'goals.items', type: 'list', label: 'الأهداف', itemLabel: 'هدف', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'title', type: 'text', label: 'عنوان الهدف' },
          { path: 'text', type: 'textarea', label: 'النص' }
        ]}
      ]
    },
    {
      id: 'audience', label: 'الفئة المستهدفة',
      desc: 'من نخدم + شعار الشركة.',
      fields: [
        { path: 'audience.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'audience.title', type: 'text', label: 'عنوان القسم' },
        { path: 'audience.desc', type: 'textarea', label: 'الوصف' },
        { path: 'audience.chips', type: 'list', label: 'الفئات (الوسوم)', itemLabel: 'فئة', fields: [
          { path: 'text', type: 'text', label: 'النص' }
        ]},
        { path: 'audience.quote', type: 'text', label: 'نص الشعار' },
        { path: 'audience.quoteFooter', type: 'text', label: 'أسفل الشعار' }
      ]
    },
    {
      id: 'cta', label: 'شريط الدعوة',
      desc: 'الشريط البرتقالي/الأخضر قبل قسم التواصل.',
      fields: [
        { path: 'cta.title', type: 'text', label: 'العنوان' },
        { path: 'cta.text', type: 'textarea', label: 'النص' },
        { path: 'cta.button', type: 'text', label: 'نص الزر' }
      ]
    },
    {
      id: 'contact', label: 'تواصل معنا',
      desc: 'بيانات التواصل وخيارات نموذج الخدمة.',
      fields: [
        { path: 'contact.eyebrow', type: 'text', label: 'السطر العلوي' },
        { path: 'contact.title', type: 'text', label: 'عنوان القسم' },
        { path: 'contact.desc', type: 'textarea', label: 'الوصف' },
        { path: 'contact.info', type: 'list', label: 'بيانات التواصل', itemLabel: 'بيان', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'label', type: 'text', label: 'الوصف المختصر' },
          { path: 'value', type: 'text', label: 'القيمة الظاهرة' },
          { path: 'href', type: 'text', label: 'الرابط', hint: 'tel: أو mailto: أو https:// — اتركه فارغًا لعدم عمله رابطًا' }
        ]},
        { path: 'contact.serviceOptions', type: 'list', label: 'خيارات قائمة "نوع الخدمة" في النموذج', itemLabel: 'خيار', fields: [
          { path: 'text', type: 'text', label: 'الخيار' }
        ]},
        { path: 'contact.note', type: 'textarea', label: 'ملاحظة أسفل النموذج' }
      ]
    },
    {
      id: 'footer', label: 'الفوتر',
      desc: 'أعمدة أسفل الصفحة.',
      fields: [
        { path: 'footer.titles.quick', type: 'text', label: 'عنوان عمود الروابط السريعة' },
        { path: 'footer.titles.services', type: 'text', label: 'عنوان عمود الخدمات' },
        { path: 'footer.titles.contact', type: 'text', label: 'عنوان عمود التواصل' },
        { path: 'footer.brand', type: 'textarea', label: 'نبذة بجانب الشعار' },
        { path: 'footer.slogan', type: 'text', label: 'الشعار أسفل النبذة' },
        { path: 'footer.quickLinks', type: 'list', label: 'الروابط السريعة', itemLabel: 'رابط', fields: [
          { path: 'label', type: 'text', label: 'النص' },
          { path: 'href', type: 'text', label: 'الرابط', hint: 'مثال: #services' }
        ]},
        { path: 'footer.serviceLinks', type: 'list', label: 'روابط الخدمات', itemLabel: 'رابط', fields: [
          { path: 'label', type: 'text', label: 'النص' },
          { path: 'href', type: 'text', label: 'الرابط' }
        ]},
        { path: 'footer.contact', type: 'list', label: 'بيانات التواصل بالفوتر', itemLabel: 'بيان', fields: [
          { path: 'icon', type: 'icon', label: 'الأيقونة' },
          { path: 'text', type: 'text', label: 'النص' },
          { path: 'href', type: 'text', label: 'الرابط', hint: 'اتركه فارغًا لبيانات بدون رابط (العنوان مثلًا)' }
        ]},
        { path: 'footer.copyright', type: 'text', label: 'سطر الحقوق' }
      ]
    },
    {
      id: 'meta', label: 'إعدادات عامة',
      desc: 'عنوان الصفحة ووصفها في نتائج البحث. رقم واتساب والبريد يُعدَّلون من قسم «تواصل معنا».',
      fields: [
        { path: 'meta.title', type: 'text', label: 'عنوان الصفحة (Title)' },
        { path: 'meta.description', type: 'textarea', label: 'وصف الصفحة (Description)' }
      ]
    }
  ];

  /* ---------- الحالة ---------- */

  var draft = null;      /* نسخة العمل من المحتوى */
  var saved = null;      /* آخر نسخة محفوظة */
  var currentSection = 0;

  /* ---------- بناء الحقول ---------- */

  function iconSelect(value) {
    var opts = ICONS.map(function (ic) {
      return '<option value="' + ic[0] + '"' + (ic[0] === value ? ' selected' : '') + '>' + esc(ic[1]) + '</option>';
    }).join('');
    return '<select>' + opts + '</select>';
  }

  function renderField(f, basePath) {
    var fullPath = basePath ? basePath + '.' + f.path : f.path;
    var val = getPath(draft, fullPath);
    var hint = f.hint ? '<p class="field__hint">' + esc(f.hint) + '</p>' : '';

    if (f.type === 'text') {
      return '<label class="field"><span>' + esc(f.label) + '</span>' +
        '<input type="text" data-path="' + esc(fullPath) + '" value="' + esc(val) + '">' + hint + '</label>';
    }
    if (f.type === 'textarea') {
      return '<label class="field"><span>' + esc(f.label) + '</span>' +
        '<textarea data-path="' + esc(fullPath) + '" rows="3">' + esc(val) + '</textarea>' + hint + '</label>';
    }
    if (f.type === 'icon') {
      return '<label class="field"><span>' + esc(f.label) + '</span>' +
        '<span data-icon-wrap data-path="' + esc(fullPath) + '">' + iconSelect(val) + '</span>' + hint + '</label>';
    }
    return '';
  }

  function isStringList(items) {
    return items.length > 0 && typeof items[0] !== 'object';
  }

  function renderList(f) {
    var items = getPath(draft, f.path) || [];

    /* قوائم النصوص البسيطة (strings[]) */
    if (isStringList(items) || (items.length === 0 && f.fields.length === 1 && f.fields[0].path === 'text' && f.stringList)) {
      var bodyStr = items.map(function (item, i) {
        return '<div class="list__item" data-index="' + i + '">' +
          '<div class="list__item-head"><b>' + esc(f.itemLabel || 'عنصر') + ' ' + (i + 1) + '</b>' +
          '<span class="list__item-tools">' +
          '<button type="button" data-move="up" title="تحريك لأعلى">↑</button>' +
          '<button type="button" data-move="down" title="تحريك لأسفل">↓</button>' +
          '<button type="button" class="del" data-del title="حذف">حذف</button>' +
          '</span></div>' +
          '<label class="field"><span>النص</span>' +
          '<input type="text" data-path="' + esc(f.path + '.' + i) + '" value="' + esc(item) + '"></label>' +
          '</div>';
      }).join('');
      return '<div class="field"><span>' + esc(f.label) + '</span>' +
        (items.length ? '' : '<p class="list-empty">لا توجد عناصر بعد.</p>') +
        '<div class="list" data-list="' + esc(f.path) + '" data-string-list="1" data-item-label="' + esc(f.itemLabel || 'عنصر') + '">' +
        bodyStr + '</div>' +
        '<button type="button" class="list__add" data-add="' + esc(f.path) + '">+ إضافة ' + esc(f.itemLabel || 'عنصر') + '</button></div>';
    }

    var body = items.map(function (item, i) {
      var fieldsHtml = f.fields.map(function (sub) {
        var p = f.path + '.' + i + '.' + sub.path;
        var v = getPath(draft, p);
        var hint = sub.hint ? '<p class="field__hint">' + esc(sub.hint) + '</p>' : '';
        if (sub.type === 'textarea') {
          return '<label class="field"><span>' + esc(sub.label) + '</span>' +
            '<textarea data-path="' + esc(p) + '" rows="2">' + esc(v) + '</textarea>' + hint + '</label>';
        }
        if (sub.type === 'icon') {
          return '<label class="field"><span>' + esc(sub.label) + '</span>' +
            '<span data-icon-wrap data-path="' + esc(p) + '">' + iconSelect(v) + '</span>' + hint + '</label>';
        }
        return '<label class="field"><span>' + esc(sub.label) + '</span>' +
          '<input type="text" data-path="' + esc(p) + '" value="' + esc(v) + '">' + hint + '</label>';
      }).join('');

      return '<div class="list__item" data-index="' + i + '">' +
        '<div class="list__item-head"><b>' + esc(f.itemLabel || 'عنصر') + ' ' + (i + 1) + '</b>' +
        '<span class="list__item-tools">' +
        '<button type="button" data-move="up" title="تحريك لأعلى">↑</button>' +
        '<button type="button" data-move="down" title="تحريك لأسفل">↓</button>' +
        '<button type="button" class="del" data-del title="حذف">حذف</button>' +
        '</span></div>' + fieldsHtml + '</div>';
    }).join('');

    return '<div class="field"><span>' + esc(f.label) + '</span>' +
      (items.length ? '' : '<p class="list-empty">لا توجد عناصر بعد.</p>') +
      '<div class="list" data-list="' + esc(f.path) + '" data-item-label="' + esc(f.itemLabel || 'عنصر') + '">' +
      body + '</div>' +
      '<button type="button" class="list__add" data-add="' + esc(f.path) + '">+ إضافة ' + esc(f.itemLabel || 'عنصر') + '</button></div>';
  }

  function defaultItem(listField) {
    var item = {};
    listField.fields.forEach(function (sub) {
      if (sub.type === 'icon') item[sub.path] = 'i-file';
      else item[sub.path] = '';
    });
    return item;
  }

  /* الحقول التي قوائمها نصوص بسيطة */
  var STRING_LISTS = { 'hero.trust': 1, 'audience.chips': 1, 'contact.serviceOptions': 1 };
  SECTIONS.forEach(function (s) {
    s.fields.forEach(function (f) {
      if (f.type === 'list' && STRING_LISTS[f.path]) f.stringList = true;
    });
  });

  function renderSection(idx) {
    currentSection = idx;
    var sec = SECTIONS[idx];
    $('sectionTitle').textContent = sec.label;
    $('sectionDesc').textContent = sec.desc || '';

    var html = sec.fields.map(function (f) {
      return f.type === 'list' ? renderList(f) : renderField(f, '');
    }).join('');
    $('sectionFields').innerHTML = html;

    qa('#sectionNav button').forEach(function (b, i) {
      b.classList.toggle('is-active', i === idx);
    });
  }

  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ---------- أحداث المحرّر ---------- */

  function bindEditorEvents() {
    var fieldsEl = $('sectionFields');

    fieldsEl.addEventListener('input', function (e) {
      var el = e.target;
      if (el.dataset && el.dataset.path) {
        setPath(draft, el.dataset.path, el.value);
        markDirty();
      }
    });

    fieldsEl.addEventListener('change', function (e) {
      var wrap = e.target.closest ? e.target.closest('[data-icon-wrap]') : null;
      if (wrap && e.target.tagName === 'SELECT') {
        setPath(draft, wrap.dataset.path, e.target.value);
        markDirty();
      }
    });

    fieldsEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;

      if (btn.dataset.add) {
        var listPath = btn.dataset.add;
        var listField = findListField(listPath);
        var arr = getPath(draft, listPath);
        if (!Array.isArray(arr)) arr = [];
        arr.push(isStringList(arr) || listField.stringList ? '' : defaultItem(listField));
        setPath(draft, listPath, arr);
        markDirty();
        renderSection(currentSection);
        return;
      }

      if (btn.hasAttribute('data-del') || btn.dataset.move) {
        var itemEl = btn.closest('.list__item');
        var listEl = btn.closest('[data-list]');
        if (!itemEl || !listEl) return;
        var path = listEl.dataset.list;
        var i = parseInt(itemEl.dataset.index, 10);
        var arr = getPath(draft, path);
        if (!Array.isArray(arr)) return;

        if (btn.hasAttribute('data-del')) {
          if (!window.confirm('هل تريد حذف هذا العنصر؟')) return;
          arr.splice(i, 1);
        } else if (btn.dataset.move === 'up' && i > 0) {
          arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
        } else if (btn.dataset.move === 'down' && i < arr.length - 1) {
          arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
        } else {
          return;
        }
        setPath(draft, path, arr);
        markDirty();
        renderSection(currentSection);
      }
    });
  }

  function findListField(path) {
    var found = null;
    SECTIONS.forEach(function (s) {
      s.fields.forEach(function (f) { if (f.type === 'list' && f.path === path) found = f; });
    });
    return found || { fields: [{ path: 'text', type: 'text' }] };
  }

  function markDirty() {
    $('saveStatus').textContent = 'تعديلات غير محفوظة…';
    $('saveStatus').className = 'savebar__status';
  }

  /* ---------- الحفظ ---------- */

  function bindSave() {
    $('saveBtn').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      $('saveStatus').textContent = 'جارٍ الحفظ…';
      $('saveStatus').className = 'savebar__status';

      api('/rest/v1/site_content?id=eq.1', {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ data: draft })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        saved = deepClone(draft);
        $('saveStatus').textContent = '✓ تم الحفظ — التغييرات ظاهرة على الموقع مباشرة';
        $('saveStatus').className = 'savebar__status ok';
        $('lastSaved').textContent = 'آخر حفظ: ' + new Date().toLocaleString('ar-EG');
      }).catch(function (err) {
        $('saveStatus').textContent = 'تعذّر الحفظ (' + err.message + ') — حاول مرة أخرى';
        $('saveStatus').className = 'savebar__status err';
      }).then(function () { btn.disabled = false; });
    });
  }

  /* ---------- تغيير كلمة المرور ---------- */

  function bindPasswordModal() {
    $('pwBtn').addEventListener('click', function () {
      $('pwModal').hidden = false;
      $('pwNote').textContent = '';
    });
    $('pwCancel').addEventListener('click', function () { $('pwModal').hidden = true; });
    $('pwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('pwNew').value, c = $('pwConfirm').value;
      var note = $('pwNote');
      if (n.length < 8) { note.textContent = 'كلمة المرور يجب ألا تقل عن 8 أحرف.'; return; }
      if (n !== c) { note.textContent = 'كلمتا المرور غير متطابقتين.'; return; }
      var session = getSession();
      api('/auth/v1/user', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ password: n })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        note.textContent = '✓ تم تغيير كلمة المرور';
        note.className = 'auth__note is-ok';
        $('pwForm').reset();
        setTimeout(function () { $('pwModal').hidden = true; }, 1200);
      }).catch(function () {
        note.textContent = 'تعذّر تغيير كلمة المرور — سجّل الخروج ثم الدخول مرة أخرى.';
      });
    });
  }

  /* ---------- التنقل بين الأقسام ---------- */

  function buildNav() {
    $('sectionNav').innerHTML = SECTIONS.map(function (s, i) {
      return '<button type="button" data-sec="' + i + '">' + esc(s.label) + '</button>';
    }).join('');
    $('sectionNav').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-sec]') : null;
      if (b) renderSection(parseInt(b.dataset.sec, 10));
    });
  }

  /* ---------- بدء التشغيل ---------- */

  function showLogin() {
    $('loginView').hidden = false;
    $('editorView').hidden = true;
  }

  function showEditor() {
    $('loginView').hidden = true;
    $('editorView').hidden = false;
  }

  function loadContent() {
    $('saveStatus').textContent = 'جارٍ تحميل المحتوى…';
    return api('/rest/v1/site_content?id=eq.1&select=data,updated_at').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (rows) {
      var defaults = window.AH_DEFAULTS_FULL || null;
      if (!defaults) throw new Error('defaults missing');
      var data = rows && rows[0] && rows[0].data;
      draft = (data && Object.keys(data).length) ? mergeDefaults(defaults, data) : deepClone(defaults);
      saved = deepClone(draft);
      if (rows && rows[0] && rows[0].updated_at) {
        $('lastSaved').textContent = 'آخر حفظ: ' + new Date(rows[0].updated_at).toLocaleString('ar-EG');
      }
      $('saveStatus').textContent = '';
    });
  }

  function start() {
    buildNav();
    bindEditorEvents();
    bindSave();
    bindPasswordModal();

    $('logoutBtn').addEventListener('click', logout);

    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('loginNote');
      var btn = $('loginBtn');
      note.textContent = '';
      btn.disabled = true;
      login($('loginEmail').value.trim(), $('loginPass').value).then(function () {
        note.textContent = '✓ تم تسجيل الدخول';
        note.className = 'auth__note is-ok';
        $('loginPass').value = '';
        return enterEditor();
      }).catch(function (err) {
        note.textContent = err.message === 'Invalid login credentials'
          ? 'بيانات الدخول غير صحيحة.'
          : 'تعذّر تسجيل الدخول — تحقق من الاتصال.';
      }).then(function () { btn.disabled = false; });
    });

    var session = getSession();
    if (session && !sessionExpired(session)) {
      enterEditor();
    } else if (session) {
      refreshSession().then(enterEditor).catch(showLogin);
    } else {
      showLogin();
    }
  }

  function enterEditor() {
    loadContent().then(function () {
      showEditor();
      renderSection(0);
    }).catch(function () {
      showLogin();
      $('loginNote').textContent = 'انتهت الجلسة — سجّل الدخول مرة أخرى.';
    });
  }

  /* المحتوى الافتراضي الكامل يُحمَّل من الصفحة (نفس ملف الموقع) */
  var script = document.createElement('script');
  script.src = '../js/content-default.js';
  script.onload = start;
  script.onerror = function () {
    $('loginNote').textContent = 'تعذّر تحميل المحتوى الافتراضي.';
  };
  document.body.appendChild(script);

  /* تسمية differently: لوحة التحكم تقرأ window.AH_DEFAULTS */
  Object.defineProperty(window, 'AH_DEFAULTS_FULL', {
    get: function () { return window.AH_DEFAULTS; }
  });
})();
