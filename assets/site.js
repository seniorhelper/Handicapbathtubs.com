/* Quote form: one FormSubmit AJAX request per submission to sales@agingsafelybaths.com,
   with a honeypot, a time trap and an engagement check.
   A request counts as delivered only when FormSubmit answers with success "true". */
(function () {
  var PHONE = '1-888-779-2284';
  var ENDPOINT = 'https://formsubmit.co/ajax/sales@agingsafelybaths.com';
  var loadedAt = Date.now();
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  document.querySelectorAll('form.qform').forEach(function (form) {
    var engaged = false;
    ['keydown', 'pointerdown', 'input'].forEach(function (ev) {
      form.addEventListener(ev, function () { engaged = true; }, { passive: true });
    });
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
      if (el['_honey'].value) return;
      if (Date.now() - loadedAt < 3000) { say('bad', 'Please take a moment to check your details, then send again.'); return; }
      if (!engaged) { say('bad', 'Please check your details, then send again, or call ' + PHONE + '.'); return; }

      var data = {
        name: name.value.trim(), phone: phone.value.trim(), zip: z, email: email.value.trim(),
        mobility: el['mobility'].value, bath_help: el['bath_help'].value, notes: el['notes'].value.trim(),
        page: location.pathname, form_location: form.getAttribute('data-where'),
        _subject: 'Quote request from handicapbathtubs.com', _template: 'table', _captcha: 'false'
      };
      busy = true; btn.disabled = true; btn.textContent = 'Sending...'; say('', '');
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j && String(j.success) === 'true') {
            say('ok', 'Thank you. Your request was delivered and a specialist will call you, usually within one business day. Need us sooner? Call ' + PHONE + '.');
            form.reset();
          } else {
            say('bad', 'Sorry, your request did not go through. Please call ' + PHONE + ' and we will take it by phone.');
          }
        })
        .catch(function () {
          say('bad', 'Sorry, your request could not be sent. Please call ' + PHONE + ' and we will take it by phone.');
        })
        .then(function () { busy = false; btn.disabled = false; btn.textContent = 'Send my request'; });
    });
  });
})();
