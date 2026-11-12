(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function lang() { return root.dataset.lang === 'th' ? 'th' : 'en'; }

  /* ---------- background: straight lines slowly drifting along the screen edges (same as v1) ---------- */
  var cv = document.getElementById('blobs'), ctx = cv.getContext('2d');
  var W = 0, H = 0, lines = [];
  var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (var i = 0; i < 34; i++) lines.push({ a: rnd() * 4, b: rnd() * 4, va: (rnd() - .5) * 0.00016, vb: (rnd() - .5) * 0.00016 });
  function edgePoint(p) {
    p = ((p % 4) + 4) % 4; var t = p % 1;
    if (p < 1) return [t * W, -2];
    if (p < 2) return [W + 2, t * H];
    if (p < 3) return [(1 - t) * W, H + 2];
    return [-2, (1 - t) * H];
  }
  function size() { var d = devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  function paint(dt) {
    ctx.clearRect(0, 0, W, H); ctx.strokeStyle = root.dataset.theme === 'dark' ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; ctx.lineWidth = 1; ctx.beginPath();
    lines.forEach(function (l) {
      l.a += l.va * dt; l.b += l.vb * dt;
      var p1 = edgePoint(l.a), p2 = edgePoint(l.b);
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
    });
    ctx.stroke();
  }
  size(); addEventListener('resize', function () { size(); paint(0); });
  var last = 0;
  if (reduce) paint(0); else (function loop(t) { var dt = last ? Math.min(t - last, 50) : 16; last = t; paint(dt); requestAnimationFrame(loop); })(0);

  /* ---------- hero words rise in, one after another ---------- */
  function staggerHero() {
    document.querySelectorAll('.hero .w').forEach(function (w, i) { w.style.animationDelay = (0.08 * i + 0.1) + 's'; });
  }
  staggerHero();

  /* ---------- light / dark ---------- */
  document.querySelectorAll('.theme-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('sk2-theme', next); } catch (e) {}
    });
  });

  /* ---------- typed role on the profile card ---------- */
  var roles = {
    en: ['AI & Web Technology', 'SEO Specialist', 'Web & App Builder', 'AI Workflow Design'],
    th: ['AI & Web Technology', 'ผู้เชี่ยวชาญ SEO', 'สร้างเว็บและเว็บแอป', 'ออกแบบเวิร์กโฟลว์ AI']
  };
  var typedEls = document.querySelectorAll('[data-typed]'), tTimer, ri = 0, ci = 0, del = false;
  function tick() {
    var list = roles[lang()], word = list[ri % list.length];
    if (reduce) { typedEls.forEach(function (e) { e.textContent = list[0]; }); return; }
    ci += del ? -1 : 1;
    var txt = Array.from(word).slice(0, ci).join('');
    typedEls.forEach(function (e) { e.textContent = txt; });
    var wait = del ? 45 : 95;
    if (!del && ci >= Array.from(word).length) { del = true; wait = 1600; }
    else if (del && ci <= 0) { del = false; ri++; wait = 350; }
    tTimer = setTimeout(tick, wait);
  }
  function restartTyped() { clearTimeout(tTimer); ri = 0; ci = 0; del = false; tick(); }
  restartTyped();

  /* ---------- language ---------- */
  document.querySelectorAll('.lang').forEach(function (btn) { btn.addEventListener('click', function () {
    var l = lang() === 'th' ? 'en' : 'th';
    root.dataset.lang = l; root.lang = l;
    try { localStorage.setItem('sk2-lang', l); } catch (e) {}
    restartTyped();
  }); });

  /* ---------- Chiang Mai clock ---------- */
  function tickClock() {
    var s;
    try { s = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(new Date()); }
    catch (e) { s = ''; }
    ['clock', 'clock2'].forEach(function (id) { var el = document.getElementById(id); if (el) el.textContent = s + ' (GMT+7)'; });
  }
  tickClock(); setInterval(tickClock, 15000);

  /* ---------- nav highlight ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  function markNav() {
    var cur = links[0];
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < 160) cur = a; });
    links.forEach(function (a) { a.classList.toggle('active', a === cur); });
  }
  addEventListener('scroll', markNav, { passive: true });
  document.querySelector('.main').addEventListener('scroll', markNav, { passive: true });
  markNav();

  /* ---------- reveal on scroll (items already on screen stay visible) ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('show'); e.target.classList.remove('pre'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach(function (el, i) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); el.style.transitionDelay = (i % 4) * 0.07 + 's'; io.observe(el); }
    });
  }

  /* ---------- mobile parallax: profile cover shrinks, photo drifts, content sheet slides over ---------- */
  var card = document.querySelector('.card-profile'), photoImg = document.querySelector('.card-profile .photo img');
  var mq = matchMedia('(max-width:720px)'), ticking = false;
  function parallax() {
    ticking = false;
    if (!mq.matches || reduce) { card.style.transform = ''; card.style.opacity = ''; card.style.filter = ''; photoImg.style.transform = ''; return; }
    var h = card.offsetHeight || 1, p = Math.min(Math.max(scrollY / h, 0), 1);
    card.style.transform = 'scale(' + (1 - p * 0.1) + ')';
    card.style.opacity = String(1 - p * 0.75);
    card.style.filter = 'blur(' + (p * 3).toFixed(1) + 'px)';
    photoImg.style.transform = 'translateY(' + (p * 60) + 'px) scale(' + (1 + p * 0.12) + ')';
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
  addEventListener('resize', parallax); parallax();

  /* ---------- mobile hamburger drawer (slides in from the right) ---------- */
  var burger = document.querySelector('.m-burger'), scrim = document.querySelector('.m-scrim');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    scrim.hidden = !open;
  }
  burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  scrim.addEventListener('click', function () { setMenu(false); });
  document.querySelector('.drawer-x').addEventListener('click', function () { setMenu(false); });
  document.querySelectorAll('.rail a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- works: swipe cards with dots (mobile) ---------- */
  var works = document.querySelector('.works'), wdots = document.querySelector('.works-dots');
  if (works && wdots) {
    var cardsW = works.querySelectorAll('.work');
    cardsW.forEach(function (c, i) {
      var d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Project ' + (i + 1));
      d.addEventListener('click', function () { works.scrollTo({ left: c.offsetLeft - works.offsetLeft - 20, behavior: 'smooth' }); });
      wdots.appendChild(d);
    });
    function syncW() {
      var mid = works.scrollLeft + works.clientWidth / 2, best = 0, bd = 1e9;
      cardsW.forEach(function (c, i) { var cx = c.offsetLeft - works.offsetLeft + c.offsetWidth / 2, dd = Math.abs(cx - mid); if (dd < bd) { bd = dd; best = i; } });
      wdots.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === best); });
      cardsW.forEach(function (c, i) { c.classList.toggle('is-current', i === best); });
    }
    works.addEventListener('scroll', function () { requestAnimationFrame(syncW); }, { passive: true });
    addEventListener('resize', syncW); syncW();
  }

  /* ---------- tech stack arrows ---------- */
  var row = document.getElementById('stack-row');
  document.querySelectorAll('.sn').forEach(function (b) {
    b.addEventListener('click', function () {
      var first = row.querySelector('.tool:not([hidden])'); var step = (first ? first.offsetWidth : 200) + 16;
      row.scrollBy({ left: b.classList.contains('next') ? step : -step });
    });
  });

  /* ---------- tech stack filter ---------- */
  document.querySelectorAll('.stack-filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.stack-filter button').forEach(function (x) { x.classList.toggle('on', x === b); });
      var f = b.dataset.f;
      row.querySelectorAll('.tool').forEach(function (t) { t.hidden = f !== 'all' && t.dataset.cat !== f; t.classList.remove('pre'); t.classList.add('show'); });
      row.scrollTo({ left: 0 });
    });
  });

  /* ---------- "Hello, I'm ___" swaps between name and role ---------- */
  if (!reduce) {
    var swaps = document.querySelectorAll('.swap'), wi = 0;
    setInterval(function () {
      wi++;
      swaps.forEach(function (el) {
        var words = el.dataset.words.split('|');
        el.classList.add('out');
        setTimeout(function () {
          el.textContent = words[wi % words.length];
          el.classList.remove('out'); el.classList.add('pre');
          void el.offsetWidth;
          el.classList.remove('pre');
        }, 350);
      });
    }, 3200);
  }

  /* ---------- counters ---------- */
  if (!reduce) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0;
      (function step(t) {
        if (!t0) t0 = t; var p = Math.min((t - t0) / 1500, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.innerHTML = (pre ? '<small>' + pre + '</small>' : '') + v + (suf ? '<sup>' + suf + '</sup>' : '');
        if (p < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }

  /* ---------- services: one open at a time ---------- */
  var svcs = document.querySelectorAll('.svc');
  svcs.forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) svcs.forEach(function (o) { if (o !== d) o.open = false; }); });
  });

  /* ---------- case details ---------- */
  var T = function (en, th) { return '<span class="en">' + en + '</span><span class="th">' + th + '</span>'; };
  var kpi = function (v, en, th) { return '<div><b>' + v + '</b><span>' + T(en, th) + '</span></div>'; };
  var head = function (c) { return '<thead><tr><th>' + T('Top query', 'คำค้นหา') + '</th><th class="n">' + T('Clicks', 'คลิก') + '</th><th class="n">' + c[0] + '</th><th class="n">' + c[1] + '</th></tr></thead>'; };
  var cases = {
    ai: '<h3>' + T('AI Agent Platform for SEO', 'แพลตฟอร์ม AI Agent สำหรับ SEO') + '</h3><p class="period">' + T('In development', 'กำลังพัฒนา') + '</p>' +
      '<p class="lead">' + T('A manager agent hands work to SEO, content, technical SEO and analytics agents. A QA agent checks the output, and nothing is published until a person approves it. Progress shows on a dashboard.',
        'เอเจนต์ผู้จัดการแจกงานให้เอเจนต์ SEO, คอนเทนต์, Technical SEO และ Analytics มีเอเจนต์ QA ตรวจผลงาน และจะไม่เผยแพร่อะไรจนกว่าคนจะอนุมัติ ติดตามความคืบหน้าได้บนแดชบอร์ด') + '</p>' +
      '<div class="flow"><span class="hl">Manager / Orchestrator</span><i>→</i><span>SEO</span><span>Content</span><span>Technical SEO</span><span>Analytics</span><i>→</i><span>QA</span><i>→</i><span class="hl">' + T('Human approval', 'คนอนุมัติ') + '</span></div>',
    agency: '<h3>' + T('Marketing agency website', 'เว็บเอเจนซี่การตลาด') + '</h3><p class="period">' + T('May 2024 – Apr 2025 · 12 months · Google Search Console', 'พ.ค. 2567 – เม.ย. 2568 · 12 เดือน · Google Search Console') + '</p>' +
      '<div class="kpis">' + kpi('31.5K', 'clicks', 'คลิก') + kpi('1.78M', 'impressions', 'การแสดงผล') + kpi('1.8%', 'avg. CTR', 'CTR เฉลี่ย') + kpi('30.2', 'avg. position', 'อันดับเฉลี่ย') + '</div>' +
      '<div class="tbl"><table>' + head([T('Impressions', 'การแสดงผล'), 'CTR']) + '<tbody>' +
      '<tr><td>marketing agency</td><td class="n">198</td><td class="n">13,036</td><td class="n">1.5%</td></tr>' +
      '<tr><td>แผนการตลาด</td><td class="n">167</td><td class="n">12,225</td><td class="n">1.4%</td></tr>' +
      '<tr><td>feasibility</td><td class="n">123</td><td class="n">23,606</td><td class="n">0.5%</td></tr>' +
      '<tr><td>feasibility คือ</td><td class="n">84</td><td class="n">10,509</td><td class="n">0.8%</td></tr></tbody></table></div>',
    home: '<h3>' + T('Home design &amp; extension', 'ออกแบบและต่อเติมบ้าน') + '</h3><p class="period">' + T('Jun 2024 – Apr 2025 · 10 months · Google Search Console', 'มิ.ย. 2567 – เม.ย. 2568 · 10 เดือน · Google Search Console') + '</p>' +
      '<div class="kpis">' + kpi('3.02K', 'clicks', 'คลิก') + kpi('92.5K', 'impressions', 'การแสดงผล') + kpi('3.3%', 'avg. CTR', 'CTR เฉลี่ย') + kpi('17.9', 'avg. position', 'อันดับเฉลี่ย') + '</div>' +
      '<div class="tbl"><table>' + head(['CTR', T('Position', 'อันดับ')]) + '<tbody>' +
      '<tr><td>หลังคาโรงรถแบบประหยัด</td><td class="n">23</td><td class="n">1.1%</td><td class="n pos">8.2</td></tr>' +
      '<tr><td>แบบครัวหลังบ้าน ราคาประหยัด</td><td class="n">11</td><td class="n">1.4%</td><td class="n pos">8.0</td></tr>' +
      '<tr><td>ความเชื่อโบราณ ต่อ เติม บ้าน</td><td class="n">11</td><td class="n">3%</td><td class="n pos">6.7</td></tr>' +
      '<tr><td>ต่อเติมหลังคา</td><td class="n">12</td><td class="n">1.2%</td><td class="n pos">10.4</td></tr></tbody></table></div>',
    dental: '<h3>' + T('Dental clinic, Chiang Mai', 'คลินิกทันตกรรม เชียงใหม่') + '</h3><p class="period">' + T('May 2024 – Apr 2025 · 12 months · Google Search Console', 'พ.ค. 2567 – เม.ย. 2568 · 12 เดือน · Google Search Console') + '</p>' +
      '<div class="kpis">' + kpi('2.45K', 'clicks', 'คลิก') + kpi('146K', 'impressions', 'การแสดงผล') + kpi('1.7%', 'avg. CTR', 'CTR เฉลี่ย') + kpi('27.2', 'avg. position', 'อันดับเฉลี่ย') + '</div>' +
      '<div class="tbl"><table>' + head(['CTR', T('Position', 'อันดับ')]) + '<tbody>' +
      '<tr><td>ผ่าตัดขากรรไกร เชียงใหม่</td><td class="n">54</td><td class="n">26%</td><td class="n pos">2.0</td></tr>' +
      '<tr><td>การผ่าตัดปุ่มกระดูกในปาก</td><td class="n">56</td><td class="n">9.9%</td><td class="n pos">3.3</td></tr>' +
      '<tr><td>ตัดปุ่มกระดูกฟัน</td><td class="n">12</td><td class="n">4.6%</td><td class="n pos">4.1</td></tr>' +
      '<tr><td>คลินิกทันตกรรมเชียงใหม่</td><td class="n">20</td><td class="n">4.4%</td><td class="n pos">9.9</td></tr></tbody></table></div>'
  };
  var dlg = document.getElementById('dlg'), body = document.getElementById('dlg-body');
  document.querySelectorAll('.work').forEach(function (w) {
    w.tabIndex = 0;
    function open() { body.innerHTML = cases[w.dataset.case] || ''; dlg.showModal(); }
    w.addEventListener('click', open);
    w.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
  });
  dlg.querySelector('.dlg-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  /* ---------- contact form: opens the visitor's email app ---------- */
  document.getElementById('c-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (id) { return document.getElementById(id).value.trim(); }, st = document.getElementById('f-status'), th = lang() === 'th';
    if (!g('f-name') || !g('f-email') || !g('f-msg')) { st.textContent = th ? 'กรอกชื่อ อีเมล และข้อความให้ครบก่อน' : 'Fill in your name, email and message first.'; return; }
    var subj = g('f-topic') + ' enquiry from ' + g('f-name');
    location.href = 'mailto:somrutai.kongsri@gmail.com?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(g('f-msg') + '\n\n' + g('f-name') + '\n' + g('f-email'));
    st.textContent = th ? 'กำลังเปิดแอปอีเมลของคุณ' : 'Opening your email app.';
  });
})();
