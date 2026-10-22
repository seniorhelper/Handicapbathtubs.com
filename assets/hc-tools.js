/* HandicapBathtubs.com interactive tools. Everything runs in the browser; nothing is sent anywhere. */
(function () {
  function val(form, name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function num(form, name) { var v = parseFloat(form.elements[name].value); return isNaN(v) ? null : v; }
  function list(items) { return '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }

  /* 1. VA housing grant finder (SAH / SHA / TRA / HISA), based on VA.gov rules for FY 2026 */
  var gf = document.getElementById('gf');
  if (gf) gf.addEventListener('submit', function (e) {
    e.preventDefault();
    var sc = val(gf, 'sc'), dx = val(gf, 'dx'), home = val(gf, 'home'), out = gf.querySelector('.gf-out');
    if (!sc || !dx || !home) { out.innerHTML = '<p class="bad">Please answer all three questions.</p>'; return; }
    var r = [];
    if (sc === 'no') {
      r.push('<strong>SAH and SHA are unlikely</strong>: both require a service-connected disability.');
      r.push('If you are a veteran enrolled in VA health care, ask about <strong>HISA</strong> ($2,000 lifetime for a disability that is not service-connected, with a VA prescription).');
      r.push('Also look at Medicaid waivers and vocational rehabilitation in our <a href="/blog-ways-to-pay-for-a-handicap-bathtub.html">funding guide</a>.');
    } else {
      var grant = '';
      if (dx === 'sah' || dx === 'sah911') grant = 'SAH';
      else if (dx === 'sha') grant = 'SHA';
      else if (dx === 'burn') grant = 'SAH or SHA';
      if (!grant) {
        r.push('<strong>SAH and SHA cover specific disabilities</strong> that are not in your answer, so they may not apply.');
        r.push('A service-connected disability may still qualify for <strong>HISA</strong> (up to $6,800 lifetime, with a VA prescription).');
      } else {
        if (home === 'temp') {
          r.push('<strong>TRA</strong> may fit: it adapts a family member\'s home where you are living for a while. FY 2026 maximum: $50,961 if SAH-eligible, $9,100 if SHA-eligible.');
        } else if (home === 'family' && grant === 'SAH') {
          r.push('<strong>SAH</strong> requires that you own or will own the home. If the home stays a family member\'s, ask the VA whether <strong>SHA</strong> or <strong>TRA</strong> applies.');
        } else {
          r.push('<strong>' + grant + '</strong> may fit. FY 2026 maximums: SAH $126,526, SHA $25,350, usable up to six times.');
        }
        if (dx === 'sah911') r.push('The single-leg category after September 11, 2001 is capped at 120 approvals a fiscal year.');
        if (grant.indexOf('SAH') > -1) r.push('An SAH home needs an adapted bathroom with a roll-in shower. Use the plan checker below.');
        r.push('You may also be able to use <strong>HISA</strong> for medically necessary changes; it is a separate VA health care benefit.');
      }
    }
    r.push('Apply with VA Form 26-4555 at <a href="https://www.va.gov/housing-assistance/disability-housing-grants/">VA.gov</a>. Only the VA decides eligibility.');
    out.innerHTML = list(r);
  });

  /* 2. SAH primary bathroom plan checker (VA Pamphlet 26-13 minimums) */
  var mc = document.getElementById('mc');
  if (mc) {
    mc.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = mc.querySelector('.mc-out'), rows = [], fails = 0, missing = 0;
      function check(label, ok, need) {
        if (ok === null) { missing++; rows.push('<li class="na"><strong>Not entered:</strong> ' + label + ' (' + need + ')</li>'); return; }
        if (!ok) fails++;
        rows.push('<li class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Meets' : 'Short') + ':</strong> ' + label + ' (' + need + ')</li>');
      }
      var w = num(mc, 'w'), d = num(mc, 'd'), o = num(mc, 'o'), f = num(mc, 'f'), door = num(mc, 'door'), turn = num(mc, 'turn');
      check('Shower inside width' + (w !== null ? ' ' + w + ' in' : ''), w === null ? null : w >= 48, 'need 48 in or more');
      check('Shower inside depth' + (d !== null ? ' ' + d + ' in' : ''), d === null ? null : d >= 48, 'need 48 in or more');
      check('Shower opening' + (o !== null ? ' ' + o + ' in' : ''), o === null ? null : o >= 36, 'need 36 in or more');
      if (f !== null && d !== null) {
        var maxFall = d / 48;
        check('Shower floor fall ' + f + ' in over ' + d + ' in', f <= maxFall + 0.001, 'no more than 1/4 in per 12 in, so ' + (Math.round(maxFall * 100) / 100) + ' in for this depth');
      } else check('Shower floor fall', null, 'no more than 1/4 in per 12 in');
      check('Bathroom door' + (door !== null ? ' ' + door + ' in' : ''), door === null ? null : door >= 36, 'need a 36 in opening or more');
      check('Turning circle' + (turn !== null ? ' ' + turn + ' in' : ''), turn === null ? null : turn >= 60, 'need 5 ft (60 in) across; it may extend into the shower');
      [['gb', 'Grab bar on every shower wall'], ['hh', 'Hand-held shower head'], ['tv', 'Thermostatic or pressure-balance controls'], ['sl', 'Slip-resistant floor, DCOF 0.42 or more'], ['ds', 'Door swings out or slides'], ['tt', 'Toilet transfer space and grab bar'], ['sk', 'Accessible sink with pipes covered']].forEach(function (c) {
        var on = mc.elements[c[0]].checked; if (!on) fails++;
        rows.push('<li class="' + (on ? 'ok' : 'bad') + '"><strong>' + (on ? 'Included' : 'Not ticked') + ':</strong> ' + c[1] + '</li>');
      });
      var head = fails === 0 && missing === 0 ? '<p class="ok"><strong>Every minimum you entered is met.</strong> Confirm with your SAH agent; waivers and site conditions can change the plan.</p>'
        : '<p><strong>' + fails + ' item' + (fails === 1 ? '' : 's') + ' to fix' + (missing ? ', ' + missing + ' not entered' : '') + '.</strong> Minimums from VA Pamphlet 26-13 (revised June 2019).</p>';
      out.innerHTML = head + '<ul class="checks">' + rows.join('') + '</ul>';
    });
    var pr = document.getElementById('mc-print');
    if (pr) pr.addEventListener('click', function () { window.print(); });
  }

  /* 3. Bath setup planner (spinal cord injury), summarized from Toronto Rehab Spinal Cord Essentials */
  var sp = document.getElementById('sp');
  if (sp) sp.addEventListener('submit', function (e) {
    e.preventDefault();
    var hand = val(sp, 'hand'), bal = val(sp, 'bal'), room = val(sp, 'room'), out = sp.querySelector('.sp-out');
    if (!hand || !bal || !room) { out.innerHTML = '<p class="bad">Please choose one option in each group.</p>'; return; }
    var r = ['Water heater set to 120&deg;F (49&deg;C), scald guards on faucets, non-slip surfaces in and outside the bathing area.'];
    var rollin = hand === 'low' || bal === 'poor';
    if (rollin) {
      r.push('<strong>Main setup:</strong> a rolling shower commode in a roll-in shower, usually with a helper.' + (hand === 'low' ? ' Ask about a tilt-in-space commode if your blood pressure drops when upright.' : ''));
      if (room !== 'rollin') r.push('<strong>Bathroom change:</strong> a roll-in shower. Plan the size for the commode and a helper; see the roll-in shower size table on this page.');
      if (bal === 'poor' && room === 'tub') r.push('If soaking matters, ask about a <a href="https://www.agingsafelybaths.com/transfer-bathtubs/">lift-ready or reclining transfer tub</a> used with a lift and a trained caregiver.');
    } else if (hand === 'reduced') {
      r.push('<strong>Main setup:</strong> a padded bath bench may work if your therapist confirms your balance and arm strength; otherwise a roll-in shower with a shower commode.');
      r.push('<strong>Hand aids:</strong> non-slip grips on the hand-held shower and soap containers, lever faucets, wall-mounted soap.');
    } else {
      r.push('<strong>Main setup:</strong> a padded tub transfer bench or shower bench with a hand-held shower and grab bars.');
      r.push('<strong>Aids:</strong> long-handled sponge; cross the ankles to wash the soles; lean to the side on the bench with a grab bar to wash.');
      if (room === 'tub') r.push('Want to soak? A <a href="/wheelchair-transfer-tubs/">wheelchair transfer walk-in tub</a> opens to seat height. Pad the seat and protect skin during the transfer.');
    }
    r.push('Pad every seat, keep a dry towel on your wheelchair cushion, and transfer in short lifts rather than dragging skin.');
    r.push('Take this list to your occupational therapist before buying anything.');
    out.innerHTML = list(r);
  });
})();
