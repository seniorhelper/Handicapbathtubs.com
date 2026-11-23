/* Quote forms. Posts straight to the Eye To Ad lead server (clients.eyetoad.com/lead/send.php),
   which saves the lead first and then emails the alert. No third-party form service is used.
   Spam guards: honeypot (_honey) and a minimum 3 seconds on the page. Success is shown only when the
   lead server answers {ok:true}; anything else shows the phone number. Details travel in the POST body only. */
(function () {
  'use strict';
  var LEAD = 'https://clients.eyetoad.com/lead/send.php';
  var PHONE = '1-888-779-2284';
  var shown = Date.now();
  var SITE = location.hostname.replace(/^www\./, '');
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  function post(fd) {
    return fetch(LEAD, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok && j && j.ok === true) { return j; }
          throw new Error('lead-server ' + r.status);
        });
      });
  }

  document.querySelectorAll('form.qform').forEach(function (form) {
    var status = form.querySelector('.qstatus');
    var btn = form.querySelector('button[type="submit"]');
    var busy = false;
    function say(cls, msg) { status.className = 'qstatus ' + cls; status.textContent = msg; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var el = form.elements;
      var name = el['name'], phone = el['phone'], zip = el['zip'], email = el['email'];
      [name, phone, zip, email].forEach(function (i) { i.removeAttribute('aria-invalid'); });
      var bad = [];
      if (name.value.trim().length < 2) bad.push(name);
      if (phone.value.replace(/\D/g, '').length < 10) bad.push(phone);
      var z = zip.value.trim();
      if (!/^\d{5}(-\d{4})?$/.test(z) && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(z)) bad.push(zip);
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) bad.push(email);
      if (bad.length) {
        bad.forEach(function (i) { i.setAttribute('aria-invalid', 'true'); });
        bad[0].focus();
        say('bad', 'Please check the highlighted fields: your name, a 10-digit phone number and a U.S. ZIP or Canadian postal code.');
        return;
      }
      if (el['_honey'].value.trim()) { say('ok', 'Thank you. Your request was sent.'); form.reset(); return; }
      if (Date.now() - shown < 3000) { say('bad', 'Please take a moment to check your details, then send again.'); return; }

      var fd = new FormData();
      fd.append('user_name', name.value.trim());
      fd.append('user_phone', phone.value.trim());
      fd.append('user_zip', z);
      if (email.value.trim()) fd.append('user_email', email.value.trim());
      fd.append('mobility', el['mobility'].value);
      fd.append('bath_help', el['bath_help'].value);
      fd.append('message', el['notes'].value.trim());
      fd.append('form_location', form.getAttribute('data-where') || '');
      fd.append('site', SITE);
      fd.append('page', location.pathname.slice(0, 300));
      fd.append('_t', String(shown));
      fd.append('_subject', 'New lead - ' + SITE);
      try {
        var q = new URLSearchParams(location.search);
        ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'].forEach(function (k) {
          var v = q.get(k); if (v) fd.append('lead_' + k, v.slice(0, 120));
        });
        var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer.slice(0, 200) : '';
        if (ref) fd.append('lead_referrer', ref);
      } catch (err) { /* ignore */ }
      fd.append('lead_device', window.innerWidth < 760 ? 'phone' : 'desktop');

      busy = true; btn.disabled = true; btn.textContent = 'Sending...'; say('', '');
      post(fd).catch(function () { return new Promise(function (res) { setTimeout(res, 1200); }).then(function () { return post(fd); }); })
        .then(function () {
          say('ok', 'Thank you. Your request was delivered and a specialist will call you, usually within one business day. Need us sooner? Call ' + PHONE + '.');
          form.reset();
          if (window.gtag) { try { window.gtag('event', 'generate_lead', { form_id: form.id || 'quote' }); } catch (err) { /* ignore */ } }
        })
        .catch(function () { say('bad', 'Sorry, your request did not go through. Please call ' + PHONE + ' and we will take it by phone.'); })
        .then(function () { busy = false; btn.disabled = false; btn.textContent = 'Send my request'; });
    });
  });
})();
