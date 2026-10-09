/* ============================================================
   الأهلي مصر لإدارة الأصول العقارية — سكربت الموقع
   ============================================================ */
(function () {
  'use strict';

  var WA_NUMBER = '201111035345';
  var MAIL = 'info@alahlymisr.net';

  /* ---------- الهيدر وزر العودة للأعلى ---------- */
  var header = document.getElementById('header');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 550);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- القائمة للجوال ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'فتح القائمة');
    document.body.style.overflow = '';
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
      document.body.style.overflow = open ? 'hidden' : '';
    });

    nav.addEventListener('click', function (e) {
      if (e.target === nav || (e.target.tagName === 'A' && e.target.classList.contains('nav__link'))) {
        closeNav();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 920) closeNav();
    });
  }

  /* ---------- تمرير سلس مع مراعاة ارتفاع الهيدر ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- إبراز الرابط النشط ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = navLinks
    .map(function (l) { return document.querySelector(l.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- ظهور العناصر عند التمرير ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- عدّاد الأرقام ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObs.observe(el); });
  }

  /* ---------- نموذج التواصل ---------- */
  var form = document.getElementById('leadForm');
  var note = document.getElementById('formNote');
  var NOTE_DEFAULT = note ? note.textContent : '';

  function setNote(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.className = 'form__note' + (kind ? ' is-' + kind : '');
  }

  function validate() {
    var ok = true;
    var fields = form.querySelectorAll('[required]');
    fields.forEach(function (f) {
      var valid = f.value && f.value.trim().length > 0;
      if (f.name === 'phone' && valid) {
        valid = /^[+0-9\s\-()]{8,}$/.test(f.value.trim());
      }
      if (f.name === 'name' && valid) {
        valid = f.value.trim().length >= 2;
      }
      f.classList.toggle('is-invalid', !valid);
      if (!valid && ok) { f.focus(); ok = false; }
    });
    return ok;
  }

  form.querySelectorAll('input, select, textarea').forEach(function (f) {
    f.addEventListener('input', function () { f.classList.remove('is-invalid'); });
    f.addEventListener('change', function () { f.classList.remove('is-invalid'); });
  });

  function collect() {
    var d = new FormData(form);
    var name = (d.get('name') || '').toString().trim();
    var phone = (d.get('phone') || '').toString().trim();
    var company = (d.get('company') || '').toString().trim();
    var service = (d.get('service') || '').toString().trim();
    var message = (d.get('message') || '').toString().trim();
    return { name: name, phone: phone, company: company, service: service, message: message };
  }

  function buildText(v) {
    return [
      'طلب استشارة عقارية — من موقع «الأهلي مصر لإدارة الأصول العقارية»',
      'الاسم: ' + v.name,
      'الهاتف: ' + v.phone,
      'الشركة/الجهة: ' + (v.company || '—'),
      'نوع الخدمة: ' + v.service,
      'التفاصيل: ' + v.message
    ].join('\n');
  }

  if (form) {
    var btnWa = document.getElementById('sendWa');
    var btnMail = document.getElementById('sendMail');

    if (btnWa) {
      btnWa.addEventListener('click', function () {
        if (!validate()) { setNote('من فضلك أكمل الحقول المطلوبة بشكل صحيح.', 'error'); return; }
        var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildText(collect()));
        window.open(url, '_blank', 'noopener');
        setNote('تم فتح واتساب لإرسال طلبك — شكرًا لتواصلك معنا.', 'success');
      });
    }

    if (btnMail) {
      btnMail.addEventListener('click', function () {
        if (!validate()) { setNote('من فضلك أكمل الحقول المطلوبة بشكل صحيح.', 'error'); return; }
        var v = collect();
        var subject = 'طلب استشارة عقارية من ' + v.name;
        var url = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildText(v));
        window.location.href = url;
        setNote('تم تجهيز رسالتك في تطبيق البريد الإلكتروني.', 'success');
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }

  /* ---------- سنة الحقوق ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- بديل: رسالة افتراضية إن لم يُرسل شيء ---------- */
  if (note && !form) note.textContent = NOTE_DEFAULT;
})();
