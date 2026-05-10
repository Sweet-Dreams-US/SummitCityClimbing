/* ============================================================
   SCC ADMIN — admin.js
   All state in localStorage. No backend.
   ============================================================ */
(() => {
  'use strict';

  // ---------- Constants & defaults ------------------------------
  const PRICE_DEFAULTS = {
    'day-pass':       { unit: 17,  per: 'person', label: 'Day Pass' },
    'weekly':         { unit: 20,  per: 'person', label: 'Weekly Pass' },
    'monthly':        { unit: 75,  per: 'person', label: 'Monthly Membership' },
    'punch-pass':     { unit: 150, per: 'order',  label: '10-Punch Pass' },
    'annual':         { unit: 750, per: 'person', label: 'Annual Membership' },
    'gift':           { unit: 50,  per: 'order',  label: 'Gift Card' },
    'class-beginner': { unit: 25,  per: 'person', label: 'Beginner Class' },
    'class-womens':   { unit: 17,  per: 'person', label: "Women's Climb" },
    'class-yac':      { unit: 17,  per: 'person', label: 'Young Adult Climb' },
    'class-college':  { unit: 12,  per: 'person', label: 'College Climb' },
    'class-homeschool':{unit: 17,  per: 'person', label: 'Homeschool Climb' },
    'class-yoga':     { unit: 12,  per: 'person', label: 'Yoga' },
    'class-run':      { unit: 0,   per: 'order',  label: 'Run Club' },
    'class-youth':    { unit: 30,  per: 'person', label: 'Youth Program' },
    'party-birthday': { unit: 200, per: 'order',  label: 'Birthday Party' },
    'party-corporate':{ unit: 350, per: 'order',  label: 'Group / Corporate' },
    'party-buyout':   { unit: 500, per: 'order',  label: 'Buyout Night' },
  };

  const FIRST_NAMES = ['Avery','Blake','Cami','Dee','Elliot','Fin','Gigi','Harper','Iris','Jude','Kai','Lex','Mara','Nico','Ozzy','Piper','Quinn','Riley','Sage','Tate','Uri','Vega','Wren','Xan','Yusuf','Zion','Cole','Edwin','Collin','Ryan','Maya','Sam','Jordan','Casey','Logan','Reese','Drew','Hayden','Kai','Jamie'];
  const LAST_NAMES  = ['Chow','Jester','Perkins','Harper','Ruiz','Park','Patel','Nguyen','Brooks','Vance','Holm','Stark','West','Cole','Reed','Bell','Knox','Hale','Pace','Drake','Marsh','Sloane','Webb','Quinn','Vega','Carr','Lin','Fox','Stone','Beck'];

  const STORAGE = {
    bookings: 'scc-bookings',
    prices:   'scc-prices',
    expenses: 'scc-expenses',
    events:   'scc-events',
    routes:   'scc-routes',
    members:  'scc-members',
    settings: 'scc-settings',
    seeded:   'scc-seeded',
  };

  // ---------- Helpers -------------------------------------------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const fmtMoney = (n) => '$' + Math.round(n || 0).toLocaleString();
  const fmtMoneyDec = (n) => '$' + Number(n||0).toFixed(2);
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month:'short', day:'numeric' });
  const fmtDateTime = (ts) => new Date(ts).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  const startOfDay = (d=new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const irand = (a, b) => Math.floor(rand(a, b + 1));

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
  function getPrices() { return { ...PRICE_DEFAULTS, ...load(STORAGE.prices, {}) }; }

  // ---------- Toast ---------------------------------------------
  function toast(msg, kind='info') {
    const host = $('#toast-host');
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'warn' ? ' warn' : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 240ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 2400);
  }

  // ---------- Modal ---------------------------------------------
  function openAModal(buildFn) {
    const shade = $('#amodal');
    const body = $('#amodal-body');
    while (body.firstChild) body.removeChild(body.firstChild);
    buildFn(body);
    shade.hidden = false;
    requestAnimationFrame(() => shade.classList.add('open'));
  }
  function closeAModal() {
    const shade = $('#amodal');
    shade.classList.remove('open');
    setTimeout(() => { shade.hidden = true; }, 220);
  }
  $('#amodal-close')?.addEventListener('click', closeAModal);
  $('#amodal')?.addEventListener('click', (e) => { if (e.target.id === 'amodal') closeAModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAModal(); });

  // ---------- Seed mock data ------------------------------------
  function seedAll(force=false) {
    if (load(STORAGE.seeded, false) && !force) return;

    // Orders: 60 over the last 30 days
    const PLANS = Object.keys(PRICE_DEFAULTS);
    const orders = [];
    const now = Date.now();
    for (let i = 0; i < 60; i++) {
      const exp = pick(PLANS);
      const cfg = PRICE_DEFAULTS[exp];
      const daysBack = irand(0, 30);
      const minsBack = irand(0, 24*60);
      const ts = now - daysBack * 86400000 - minsBack * 60000;
      const people = cfg.per === 'person' ? irand(1, 4) : 1;
      const total  = cfg.unit * people;
      const fname = pick(FIRST_NAMES);
      const lname = pick(LAST_NAMES);
      const date = new Date(ts);
      orders.push({
        id: 'SCC-' + ts.toString(36).toUpperCase().slice(-7) + '-' + irand(100,999),
        exp, expLabel: cfg.label,
        date: date.toISOString().slice(0, 10),
        time: (irand(12,20)) + ':' + pick(['00','30']),
        people,
        name: fname + ' ' + lname,
        email: (fname + '.' + lname).toLowerCase().replace(/[^a-z.]/g,'') + '@example.com',
        phone: '',
        notes: '',
        total,
        cardLast4: String(irand(0,9999)).padStart(4, '0'),
        status: Math.random() < 0.04 ? 'refunded' : 'paid',
        ts,
      });
    }
    orders.sort((a,b) => b.ts - a.ts);
    save(STORAGE.bookings, orders);

    // Expenses (last 60 days)
    const expCats = ['Rent','Utilities','Route Setting','Equipment','Marketing','Insurance','Wages','Pro Shop COGS','Software'];
    const expVendors = {
      'Rent': ['Indiana Realty Group'],
      'Utilities': ['NIPSCO','Frontier'],
      'Route Setting': ['Route Setter Pro','Element Setting Co.'],
      'Equipment': ['So Ill','Tension Climbing','Friction Labs'],
      'Marketing': ['Meta Ads','Google Ads','Print Vendor'],
      'Insurance': ['ClimbCo Insurance'],
      'Wages': ['ADP Payroll'],
      'Pro Shop COGS': ['Black Diamond','Petzl','La Sportiva'],
      'Software': ['Stripe','Mailchimp','Quickbooks'],
    };
    const expensesSeed = [];
    for (let i = 0; i < 24; i++) {
      const cat = pick(expCats);
      const vendor = pick(expVendors[cat]);
      const amount = cat === 'Rent' ? 4200 :
                     cat === 'Wages' ? irand(1800, 3500) :
                     cat === 'Pro Shop COGS' ? irand(150, 800) :
                     irand(40, 600);
      expensesSeed.push({
        id: 'EXP-' + irand(10000,99999),
        date: new Date(now - irand(0, 60) * 86400000).toISOString().slice(0,10),
        category: cat,
        vendor,
        amount,
      });
    }
    expensesSeed.sort((a,b) => b.date.localeCompare(a.date));
    save(STORAGE.expenses, expensesSeed);

    // Events (mix past + future)
    const events = [
      { id:'ev1', name:'Beginner Bouldering 101', date: addDays(2),  time:'6:00 PM', cat:'Class', desc:'Two-hour first-time intro. Falling, footwork, language.' , capacity: 12, signups: 8 },
      { id:'ev2', name:"Women's Climb",          date: addDays(5),  time:'10:00 AM',cat:'Community', desc:'Designated session for women, femmes, and nonbinary climbers.', capacity: 20, signups: 14 },
      { id:'ev3', name:'Spring Send Open',       date: addDays(12), time:'5:00 PM', cat:'Competition', desc:'Open comp. Beginner / Intermediate / Open. Prize purse $1,000.', capacity: 60, signups: 41 },
      { id:'ev4', name:'Yoga on the Pads',       date: addDays(1),  time:'9:00 AM', cat:'Class', desc:'Pre-climb stretch with Mara. Pay what you can.', capacity: 16, signups: 11 },
      { id:'ev5', name:'Run Club',               date: addDays(3),  time:'7:00 AM', cat:'Community', desc:'Easy 3-mile loop. Coffee after.', capacity: 30, signups: 22 },
      { id:'ev6', name:'Birthday Party — Riley', date: addDays(6),  time:'1:00 PM', cat:'Private', desc:'Riley turns 8. 12 guests, party room booked.', capacity: 12, signups: 12 },
      { id:'ev7', name:'College Climb Night',    date: addDays(7),  time:'7:00 PM', cat:'Community', desc:'Show your student ID. Discounted entry, free coffee.', capacity: 40, signups: 27 },
      { id:'ev8', name:'BASECAMP 2 Members Preview', date: addDays(21), time:'6:00 PM', cat:'Members Only', desc:'Sneak peek of the new location for Annual & Monthly members.', capacity: 80, signups: 53 },
    ];
    save(STORAGE.events, events);

    // Routes / walls
    const walls = [
      { id:'w1', name:'Main Slab', cycle: 14, lastSet: daysAgoIso(3) },
      { id:'w2', name:'24° Vert',  cycle: 14, lastSet: daysAgoIso(8) },
      { id:'w3', name:'40° Steep', cycle: 14, lastSet: daysAgoIso(15) },
      { id:'w4', name:'The Cave',  cycle: 21, lastSet: daysAgoIso(18) },
      { id:'w5', name:'Kid Wall',  cycle: 21, lastSet: daysAgoIso(11) },
    ];
    save(STORAGE.routes, walls);

    // Members
    const memberPlans = ['monthly','monthly','monthly','annual','monthly-hero','annual'];
    const members = [];
    for (let i = 0; i < 32; i++) {
      const plan = pick(memberPlans);
      const fname = pick(FIRST_NAMES);
      const lname = pick(LAST_NAMES);
      members.push({
        id: 'M-' + (1000 + i),
        name: fname + ' ' + lname,
        email: (fname + '.' + lname).toLowerCase() + '@example.com',
        plan,
        joined: new Date(now - irand(7, 720) * 86400000).toISOString().slice(0,10),
        lastVisit: new Date(now - irand(0, 14) * 86400000).toISOString().slice(0,10),
        visitsMTD: irand(1, 18),
        status: Math.random() < 0.92 ? 'active' : 'expired',
      });
    }
    save(STORAGE.members, members);

    // Settings defaults
    if (!load(STORAGE.settings, null)) {
      save(STORAGE.settings, {
        name: 'Summit City Climbing Co.',
        address: '1331 E Berry St, Fort Wayne, IN 46803',
        email: 'summitcityclimbingco@gmail.com',
        phone: '(260) 555-0142',
      });
    }

    save(STORAGE.seeded, true);

    function addDays(n) {
      const d = new Date(); d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    }
    function daysAgoIso(n) {
      const d = new Date(); d.setDate(d.getDate() - n);
      return d.toISOString().slice(0, 10);
    }
  }

  // ---------- Tabs ----------------------------------------------
  const tabBtns = $$('.sb-link[data-tab]');
  const tabPanels = $$('.tab[data-panel]');
  const titles = {
    dashboard: 'Dashboard', orders: 'Orders', analytics: 'Analytics', accounting: 'Accounting',
    events: 'Events & Programs', pricing: 'Pricing & Plans', members: 'Members',
    routes: 'Route Setting', settings: 'Settings',
  };
  function activateTab(name) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    tabPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    $('#topbar-title').textContent = titles[name] || name;
    if (history.replaceState) history.replaceState(null, '', '#' + name);
    // Render-on-activate so charts/tables get correct dimensions
    const renderer = renderers[name];
    if (renderer) renderer();
    // close mobile sidebar
    $('.sidebar').classList.remove('open');
  }
  tabBtns.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));
  $$('[data-jump]').forEach(el => el.addEventListener('click', () => activateTab(el.dataset.jump)));
  $('#burger')?.addEventListener('click', () => $('.sidebar').classList.toggle('open'));

  // ---------- Dashboard -----------------------------------------
  function renderDashboard() {
    const orders = load(STORAGE.bookings, []).filter(o => o.status === 'paid');
    const today0 = startOfDay().getTime();
    const yest0  = today0 - 86400000;
    const week0  = today0 - 7 * 86400000;
    const prevWeek0 = week0 - 7 * 86400000;
    const month0 = today0 - 30 * 86400000;
    const prevMonth0 = month0 - 30 * 86400000;

    const sumWhere = (lo, hi=Infinity) => orders
      .filter(o => o.ts >= lo && o.ts < hi)
      .reduce((s, o) => s + (o.total || 0), 0);
    const countWhere = (lo, hi=Infinity) => orders.filter(o => o.ts >= lo && o.ts < hi).length;

    const revToday = sumWhere(today0);
    const revYest  = sumWhere(yest0, today0);
    const revWeek  = sumWhere(week0);
    const revPrevWk= sumWhere(prevWeek0, week0);
    const revMonth = sumWhere(month0);
    const revPrevMo= sumWhere(prevMonth0, month0);
    const ordersToday = countWhere(today0);
    const ordersYest  = countWhere(yest0, today0);

    $('#k-rev-today').textContent = fmtMoney(revToday);
    $('#k-rev-week').textContent = fmtMoney(revWeek);
    $('#k-rev-month').textContent = fmtMoney(revMonth);
    $('#k-orders-today').textContent = ordersToday;

    setDelta('#k-rev-today-d', revToday, revYest, 'vs. yesterday');
    setDelta('#k-rev-week-d', revWeek, revPrevWk, 'vs. prev. 7d');
    setDelta('#k-rev-month-d', revMonth, revPrevMo, 'vs. prev. 30d');
    setDelta('#k-orders-today-d', ordersToday, ordersYest, 'vs. yesterday', true);

    const members = load(STORAGE.members, []).filter(m => m.status === 'active');
    $('#k-members').textContent = members.length;

    const passes = orders.filter(o => o.exp === 'day-pass' && o.ts >= week0).length;
    const passesPrev = orders.filter(o => o.exp === 'day-pass' && o.ts >= prevWeek0 && o.ts < week0).length;
    $('#k-passes-week').textContent = passes;
    setDelta('#k-passes-week-d', passes, passesPrev, 'vs. prev. 7d', true);

    // Revenue chart (14 days)
    const days = 14;
    const buckets = new Array(days).fill(0);
    orders.forEach(o => {
      const i = Math.floor((o.ts - (today0 - (days - 1) * 86400000)) / 86400000);
      if (i >= 0 && i < days) buckets[i] += o.total || 0;
    });
    drawLineChart('#chart-revenue', buckets);

    // Recent orders
    const recent = orders.slice(0, 6);
    const ul = $('#recent-orders');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    if (recent.length === 0) {
      const li = document.createElement('li'); li.textContent = 'No orders yet — go book one on the public site!';
      ul.appendChild(li);
    }
    recent.forEach(o => {
      const li = document.createElement('li');
      const who = document.createElement('div');
      const what = document.createElement('div');
      const amt = document.createElement('div');
      who.className = 'who'; who.textContent = o.name;
      what.className = 'what'; what.textContent = o.expLabel + ' · ' + fmtDate(o.ts);
      amt.className = 'amt'; amt.textContent = fmtMoney(o.total);
      const left = document.createElement('div');
      left.appendChild(who); left.appendChild(what);
      li.appendChild(left); li.appendChild(amt);
      ul.appendChild(li);
    });

    // Today's schedule (events on today)
    const events = load(STORAGE.events, []);
    const todayIso = new Date().toISOString().slice(0,10);
    const todayEvents = events.filter(e => e.date === todayIso);
    const sched = $('#today-schedule');
    while (sched.firstChild) sched.removeChild(sched.firstChild);
    $('#today-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
    if (todayEvents.length === 0) {
      const li = document.createElement('li');
      li.style.gridTemplateColumns = '1fr';
      li.textContent = 'No events scheduled today. Floor is open hours-only.';
      sched.appendChild(li);
    } else {
      todayEvents.sort((a,b) => a.time.localeCompare(b.time));
      todayEvents.forEach((e, i) => {
        const li = document.createElement('li');
        li.className = ['lime','sky','coral',''][i % 4];
        const t = document.createElement('span'); t.className = 'time'; t.textContent = e.time;
        const w = document.createElement('span'); w.className = 'what'; w.textContent = e.name;
        const c = document.createElement('span'); c.className = 'who'; c.textContent = (e.signups||0) + '/' + (e.capacity||0) + ' signed';
        li.appendChild(t); li.appendChild(w); li.appendChild(c);
        sched.appendChild(li);
      });
    }

    // Top plans
    const tally = {};
    orders.filter(o => o.ts >= month0).forEach(o => {
      tally[o.expLabel] = (tally[o.expLabel] || 0) + 1;
    });
    const ranked = Object.entries(tally).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const tp = $('#top-plans');
    while (tp.firstChild) tp.removeChild(tp.firstChild);
    ranked.forEach(([name, count]) => {
      const li = document.createElement('li');
      const n = document.createElement('span'); n.className = 'name'; n.textContent = name;
      const c = document.createElement('span'); c.className = 'count'; c.textContent = count + ' × ';
      li.appendChild(n); li.appendChild(c);
      tp.appendChild(li);
    });

    // Sidebar badge
    const todayCount = orders.filter(o => o.ts >= today0).length;
    $('#badge-orders').textContent = todayCount;
    $('#topbar-date').textContent = new Date().toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  }

  function setDelta(sel, val, prev, suffix, integer=false) {
    const el = $(sel);
    if (!el) return;
    el.classList.remove('up','down');
    if (prev === 0 && val === 0) {
      el.textContent = '— ' + suffix; return;
    }
    if (prev === 0) {
      el.classList.add('up');
      el.textContent = (integer ? '+' + val : '+' + fmtMoney(val)) + ' ' + suffix; return;
    }
    const pct = Math.round(((val - prev) / prev) * 100);
    el.classList.add(pct >= 0 ? 'up' : 'down');
    el.textContent = (pct >= 0 ? '+' : '') + pct + '% ' + suffix;
  }

  // ---------- Line chart drawer ---------------------------------
  function drawLineChart(sel, data) {
    const svg = $(sel);
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const w = 600, h = 200, pad = 24;
    if (sel.includes('big')) { /* width auto-stretches via viewBox */ }
    const W = sel.includes('big') ? 800 : 600;
    const H = sel.includes('big') ? 240 : 200;
    const max = Math.max(1, ...data);

    // Grid
    for (let g = 0; g <= 4; g++) {
      const y = pad + (H - 2*pad) * (g/4);
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', pad); ln.setAttribute('x2', W - pad);
      ln.setAttribute('y1', y); ln.setAttribute('y2', y);
      ln.setAttribute('class', 'grid');
      svg.appendChild(ln);
    }

    // Path
    const xs = data.map((_, i) => pad + (W - 2*pad) * (i / (data.length - 1)));
    const ys = data.map(v => H - pad - (H - 2*pad) * (v / max));
    const dLine = xs.map((x, i) => (i === 0 ? 'M' : 'L') + x + ' ' + ys[i]).join(' ');
    const dArea = dLine + ' L' + xs[xs.length-1] + ' ' + (H - pad) + ' L' + xs[0] + ' ' + (H - pad) + ' Z';

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', dArea); area.setAttribute('class', 'area');
    svg.appendChild(area);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', dLine); line.setAttribute('class', 'line');
    svg.appendChild(line);

    data.forEach((v, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', xs[i]); c.setAttribute('cy', ys[i]); c.setAttribute('r', 3);
      c.setAttribute('class', 'dot');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = '$' + Math.round(v);
      c.appendChild(t);
      svg.appendChild(c);
    });

    // X labels every 2nd day
    const today = startOfDay();
    data.forEach((_, i) => {
      if (i % Math.ceil(data.length / 7) !== 0) return;
      const d = new Date(today.getTime() - (data.length - 1 - i) * 86400000);
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', xs[i]); lbl.setAttribute('y', H - 6);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('class', 'label');
      lbl.textContent = (d.getMonth()+1) + '/' + d.getDate();
      svg.appendChild(lbl);
    });
  }

  // ---------- Orders --------------------------------------------
  let orderSort = { by: 'ts', dir: -1 };
  function renderOrders() {
    const orders = load(STORAGE.bookings, []).slice();
    const search = $('#orders-search').value.trim().toLowerCase();
    const filter = $('#orders-filter').value;
    let list = orders.filter(o => {
      if (filter && o.status !== filter) return false;
      if (!search) return true;
      return (o.name || '').toLowerCase().includes(search) ||
             (o.email || '').toLowerCase().includes(search) ||
             (o.id || '').toLowerCase().includes(search) ||
             (o.expLabel || '').toLowerCase().includes(search);
    });
    list.sort((a,b) => {
      const A = a[orderSort.by], B = b[orderSort.by];
      if (typeof A === 'number') return (A - B) * orderSort.dir;
      return String(A || '').localeCompare(String(B || '')) * orderSort.dir;
    });

    const body = $('#orders-body');
    while (body.firstChild) body.removeChild(body.firstChild);
    $('#orders-empty').hidden = list.length > 0;

    list.slice(0, 200).forEach(o => {
      const tr = document.createElement('tr');
      const cells = [
        fmtDateTime(o.ts),
        o.id,
        nameCell(o),
        o.expLabel,
        String(o.people || 1),
        { text: fmtMoneyDec(o.total), cls: 'num' },
        { html: tag(o.status) },
        actionCell(o),
      ];
      cells.forEach(c => {
        const td = document.createElement('td');
        if (typeof c === 'string') td.textContent = c;
        else if (c instanceof HTMLElement) td.appendChild(c);
        else if (c.html instanceof HTMLElement) td.appendChild(c.html);
        else if (c.text) { td.textContent = c.text; if (c.cls) td.className = c.cls; }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    $('#badge-orders').textContent = orders.filter(o => o.ts >= startOfDay().getTime()).length;
  }
  function nameCell(o) {
    const div = document.createElement('div');
    const n = document.createElement('div'); n.style.fontWeight = '500'; n.textContent = o.name || '—';
    const e = document.createElement('div'); e.style.fontSize = '11px'; e.style.color = 'var(--chalk-mute)'; e.textContent = o.email || '';
    div.appendChild(n); div.appendChild(e);
    return div;
  }
  function tag(status) {
    const span = document.createElement('span');
    span.className = 'tag tag-' + status;
    span.textContent = status;
    return span;
  }
  function actionCell(o) {
    const div = document.createElement('div');
    div.style.display = 'flex'; div.style.gap = '6px'; div.style.justifyContent = 'flex-end';
    if (o.status === 'paid') {
      const refund = document.createElement('button');
      refund.className = 'btn-tiny danger'; refund.textContent = 'Refund';
      refund.onclick = () => refundOrder(o.id);
      div.appendChild(refund);
    }
    return div;
  }
  function refundOrder(id) {
    const orders = load(STORAGE.bookings, []);
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    orders[idx].status = 'refunded';
    save(STORAGE.bookings, orders);
    toast('Order refunded.', 'warn');
    renderOrders();
    if ($('.tab[data-panel="dashboard"]').classList.contains('active')) renderDashboard();
  }

  $('#orders-search')?.addEventListener('input', renderOrders);
  $('#orders-filter')?.addEventListener('change', renderOrders);
  $('#orders-export')?.addEventListener('click', exportOrdersCSV);
  $$('#orders-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const by = th.dataset.sort;
      orderSort.dir = (orderSort.by === by) ? -orderSort.dir : -1;
      orderSort.by = by;
      renderOrders();
    });
  });

  function exportOrdersCSV() {
    const orders = load(STORAGE.bookings, []);
    const rows = [
      ['ID','Date','Customer','Email','Type','Qty','Total','Status'],
      ...orders.map(o => [
        o.id, new Date(o.ts).toISOString(),
        o.name || '', o.email || '',
        o.expLabel || o.exp,
        o.people || 1, o.total || 0, o.status,
      ]),
    ];
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'scc-orders-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exported.');
  }

  // ---------- Analytics -----------------------------------------
  function renderAnalytics() {
    const range = parseInt($('#analytics-range').value, 10) || 30;
    const orders = load(STORAGE.bookings, []).filter(o => o.status === 'paid');
    const today0 = startOfDay().getTime();
    const start = today0 - (range - 1) * 86400000;

    // Revenue by day chart
    const buckets = new Array(range).fill(0);
    orders.forEach(o => {
      const i = Math.floor((o.ts - start) / 86400000);
      if (i >= 0 && i < range) buckets[i] += o.total || 0;
    });
    drawLineChart('#chart-revenue-big', buckets);

    // Revenue by plan
    const tally = {};
    orders.filter(o => o.ts >= start).forEach(o => {
      tally[o.expLabel] = (tally[o.expLabel] || 0) + (o.total || 0);
    });
    const ranked = Object.entries(tally).sort((a,b) => b[1] - a[1]);
    const max = ranked[0]?.[1] || 1;
    const ul = $('#revenue-by-plan');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    ranked.slice(0, 8).forEach(([name, val]) => {
      const li = document.createElement('li');
      const row = document.createElement('div'); row.className = 'bar-row';
      const n = document.createElement('div'); n.className = 'bar-name';
      const ns = document.createElement('span'); ns.textContent = name;
      const vs = document.createElement('span'); vs.textContent = fmtMoney(val);
      n.appendChild(ns); n.appendChild(vs);
      const t = document.createElement('div'); t.className = 'bar-track';
      const f = document.createElement('div'); f.className = 'bar-fill'; f.style.width = (val/max*100) + '%';
      t.appendChild(f);
      row.appendChild(n); row.appendChild(t);
      li.appendChild(row);
      ul.appendChild(li);
    });

    // Hours heatmap
    const hm = $('#hours-heatmap');
    while (hm.firstChild) hm.removeChild(hm.firstChild);
    const HOURS = ['10A','12P','2P','4P','6P','8P'];
    const DAYS  = ['M','T','W','T','F','S','S'];
    // header row
    hm.appendChild(cell('hh-label',''));
    DAYS.forEach(d => hm.appendChild(cell('hh-day', d)));
    // counts: dayOfWeek × hourBucket
    const counts = {};
    orders.filter(o => o.ts >= start).forEach(o => {
      const d = new Date(o.ts);
      const dow = (d.getDay() + 6) % 7; // M=0
      const h = d.getHours();
      const hb = Math.max(0, Math.floor((h - 10) / 2));
      const k = dow + ':' + hb;
      counts[k] = (counts[k] || 0) + 1;
    });
    const maxCount = Math.max(1, ...Object.values(counts));
    HOURS.forEach((label, hb) => {
      hm.appendChild(cell('hh-label', label));
      for (let d = 0; d < 7; d++) {
        const c = counts[d + ':' + hb] || 0;
        const cellEl = cell('hh-cell', '');
        const intensity = c / maxCount;
        cellEl.style.background = intensity > 0
          ? `rgba(255, 107, 26, ${0.1 + intensity * 0.85})`
          : 'var(--bg-3)';
        cellEl.title = `${DAYS[d]} ${label} · ${c} orders`;
        hm.appendChild(cellEl);
      }
    });
    function cell(cls, text) {
      const el = document.createElement('div');
      el.className = cls; el.textContent = text;
      return el;
    }

    // Repeat vs new donut
    const seen = {};
    orders.filter(o => o.ts >= start).forEach(o => {
      seen[o.email] = (seen[o.email] || 0) + 1;
    });
    const newCount = Object.values(seen).filter(c => c === 1).length;
    const repeatCount = Object.values(seen).filter(c => c > 1).length;
    drawDonut('#repeat-donut', [
      { label: 'New', value: newCount, color: 'var(--sky)' },
      { label: 'Repeat', value: repeatCount, color: 'var(--orange)' },
    ]);
    const legend = $('#repeat-legend');
    while (legend.firstChild) legend.removeChild(legend.firstChild);
    [
      { label: 'New customers', value: newCount, color: '#5BA8E8' },
      { label: 'Repeat customers', value: repeatCount, color: '#FF6B1A' },
    ].forEach(s => {
      const li = document.createElement('li');
      const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = s.color;
      const tx = document.createElement('span'); tx.textContent = s.label + ' · ' + s.value;
      li.appendChild(sw); li.appendChild(tx);
      legend.appendChild(li);
    });
  }
  $('#analytics-range')?.addEventListener('change', renderAnalytics);

  function drawDonut(sel, segments) {
    const host = $(sel);
    while (host.firstChild) host.removeChild(host.firstChild);
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.style.width = '100%'; svg.style.height = '100%';
    const cx = 50, cy = 50, r = 40, sw = 14;
    let acc = 0;
    segments.forEach(s => {
      const startA = acc / total * Math.PI * 2 - Math.PI / 2;
      acc += s.value;
      const endA = acc / total * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA);
      const x2 = cx + r * Math.cos(endA),   y2 = cy + r * Math.sin(endA);
      const large = (endA - startA) > Math.PI ? 1 : 0;
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
      path.setAttribute('stroke', s.color);
      path.setAttribute('stroke-width', sw);
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    });
    const center = document.createElementNS(svgNs, 'text');
    center.setAttribute('x', cx); center.setAttribute('y', cy + 4);
    center.setAttribute('text-anchor', 'middle');
    center.setAttribute('font-family', 'Archivo Black');
    center.setAttribute('font-size', '14');
    center.setAttribute('fill', '#F5F0E5');
    center.textContent = total;
    svg.appendChild(center);
    host.appendChild(svg);
  }

  // ---------- Accounting ----------------------------------------
  function renderAccounting() {
    // populate month select
    const sel = $('#acct-month');
    if (!sel.options.length) {
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const v = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = d.toLocaleDateString(undefined, { month:'long', year:'numeric' });
        sel.appendChild(opt);
      }
      sel.addEventListener('change', renderAccounting);
    }
    const ymKey = sel.value || sel.options[0].value;
    sel.value = ymKey;
    const [yr, mo] = ymKey.split('-').map(Number);
    const start = new Date(yr, mo - 1, 1).getTime();
    const end   = new Date(yr, mo, 1).getTime();

    const orders = load(STORAGE.bookings, []).filter(o => o.status === 'paid' && o.ts >= start && o.ts < end);
    const expenses = load(STORAGE.expenses, []).filter(e => {
      const t = new Date(e.date).getTime();
      return t >= start && t < end;
    });

    const rev = orders.reduce((s,o) => s + (o.total||0), 0);
    const exp = expenses.reduce((s,e) => s + Number(e.amount||0), 0);
    const net = rev - exp;
    const margin = rev > 0 ? Math.round((net/rev)*100) : 0;
    $('#pnl-rev').textContent = fmtMoney(rev);
    $('#pnl-exp').textContent = fmtMoney(exp);
    $('#pnl-net').textContent = fmtMoney(net);
    $('#pnl-rev-orders').textContent = orders.length + ' orders';
    $('#pnl-exp-count').textContent = expenses.length + ' line items';
    $('#pnl-margin').textContent = margin + '% margin';

    // Expenses table
    const tb = $('#expenses-body');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    expenses.slice().sort((a,b) => b.date.localeCompare(a.date)).forEach(e => {
      const tr = document.createElement('tr');
      [e.date, e.category, e.vendor, fmtMoneyDec(e.amount)].forEach((v, i) => {
        const td = document.createElement('td');
        if (i === 3) td.className = 'num';
        td.textContent = v;
        tr.appendChild(td);
      });
      const td = document.createElement('td');
      const del = document.createElement('button');
      del.className = 'btn-tiny danger'; del.textContent = 'Delete';
      del.onclick = () => {
        const all = load(STORAGE.expenses, []);
        save(STORAGE.expenses, all.filter(x => x.id !== e.id));
        toast('Expense deleted.', 'warn');
        renderAccounting();
      };
      td.appendChild(del);
      tr.appendChild(td);
      tb.appendChild(tr);
    });
  }
  $('#add-expense-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const all = load(STORAGE.expenses, []);
    all.push({
      id: 'EXP-' + Date.now().toString(36).toUpperCase().slice(-6),
      date: $('#exp-date').value,
      category: $('#exp-cat').value,
      vendor: $('#exp-vendor').value.trim(),
      amount: Number($('#exp-amount').value),
    });
    save(STORAGE.expenses, all);
    e.target.reset();
    toast('Expense added.');
    renderAccounting();
  });

  // ---------- Events --------------------------------------------
  function renderEvents() {
    const events = load(STORAGE.events, []).slice().sort((a,b) => a.date.localeCompare(b.date));
    const grid = $('#events-grid');
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    events.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'event-card';

      const when = document.createElement('div');
      when.className = 'e-when';
      when.textContent = new Date(ev.date + 'T12:00').toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }).toUpperCase() + ' · ' + ev.time;
      const h = document.createElement('h4'); h.textContent = ev.name;
      const desc = document.createElement('p'); desc.className = 'e-desc'; desc.textContent = ev.desc;

      const foot = document.createElement('div'); foot.className = 'e-foot';
      const meta = document.createElement('span');
      meta.textContent = (ev.signups||0) + '/' + (ev.capacity||0) + ' · ' + (ev.cat||'');
      const acts = document.createElement('div'); acts.className = 'actions';
      const edit = document.createElement('button'); edit.className = 'btn-tiny'; edit.textContent = 'Edit';
      edit.onclick = () => openEventEdit(ev.id);
      const del = document.createElement('button'); del.className = 'btn-tiny danger'; del.textContent = 'Delete';
      del.onclick = () => {
        const all = load(STORAGE.events, []);
        save(STORAGE.events, all.filter(x => x.id !== ev.id));
        toast('Event deleted.', 'warn');
        renderEvents();
      };
      acts.appendChild(edit); acts.appendChild(del);
      foot.appendChild(meta); foot.appendChild(acts);

      card.appendChild(when); card.appendChild(h); card.appendChild(desc); card.appendChild(foot);
      grid.appendChild(card);
    });
  }
  function openEventEdit(id) {
    const events = load(STORAGE.events, []);
    const ev = id ? events.find(e => e.id === id) : { id: 'ev-' + Date.now().toString(36), name:'', date: new Date().toISOString().slice(0,10), time:'6:00 PM', cat:'Class', desc:'', capacity: 20, signups: 0 };
    openAModal((body) => {
      const h = document.createElement('h3'); h.textContent = id ? 'Edit Event' : 'New Event';
      body.appendChild(h);
      const form = document.createElement('form'); form.className = 'form-stack';
      const fields = [
        { id:'name', label:'Name', type:'text', val: ev.name },
        { id:'date', label:'Date', type:'date', val: ev.date },
        { id:'time', label:'Time (e.g. 6:00 PM)', type:'text', val: ev.time },
        { id:'cat', label:'Category', type:'text', val: ev.cat },
        { id:'capacity', label:'Capacity', type:'number', val: ev.capacity },
        { id:'signups', label:'Signups', type:'number', val: ev.signups },
        { id:'desc', label:'Description', type:'textarea', val: ev.desc },
      ];
      fields.forEach(f => {
        const lab = document.createElement('label');
        lab.textContent = f.label;
        const inp = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
        if (f.type !== 'textarea') inp.type = f.type;
        inp.id = 'em-' + f.id;
        inp.value = f.val ?? '';
        lab.appendChild(inp);
        form.appendChild(lab);
      });
      const btn = document.createElement('button');
      btn.className = 'btn-prim'; btn.type = 'submit'; btn.textContent = id ? 'Save' : 'Create';
      form.appendChild(btn);
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          id: ev.id,
          name: $('#em-name').value.trim(),
          date: $('#em-date').value,
          time: $('#em-time').value.trim(),
          cat: $('#em-cat').value.trim(),
          capacity: Number($('#em-capacity').value),
          signups: Number($('#em-signups').value),
          desc: $('#em-desc').value.trim(),
        };
        const all = load(STORAGE.events, []);
        const idx = all.findIndex(x => x.id === ev.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
        save(STORAGE.events, all);
        toast(id ? 'Event saved.' : 'Event created.');
        closeAModal();
        renderEvents();
      };
      body.appendChild(form);
    });
  }
  $('#add-event')?.addEventListener('click', () => openEventEdit(null));

  // ---------- Pricing -------------------------------------------
  function renderPricing() {
    const wrap = $('#prices-list');
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    const overrides = load(STORAGE.prices, {});
    const all = getPrices();
    Object.entries(all).forEach(([key, val]) => {
      const row = document.createElement('div');
      row.className = 'price-row';

      const k = document.createElement('div'); k.className = 'p-key'; k.textContent = key;
      const n = document.createElement('div'); n.className = 'p-name'; n.textContent = val.label;

      const priceInput = document.createElement('input');
      priceInput.type = 'number'; priceInput.step = '0.01'; priceInput.min = '0';
      priceInput.value = val.unit;
      priceInput.addEventListener('change', () => {
        overrides[key] = { ...val, unit: Number(priceInput.value) };
        save(STORAGE.prices, overrides);
        toast(val.label + ' updated to ' + fmtMoneyDec(priceInput.value));
      });

      const perSel = document.createElement('select');
      ['person','order'].forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = '/ ' + p;
        if (p === val.per) opt.selected = true;
        perSel.appendChild(opt);
      });
      perSel.addEventListener('change', () => {
        overrides[key] = { ...val, per: perSel.value, unit: Number(priceInput.value) };
        save(STORAGE.prices, overrides);
      });

      row.appendChild(k); row.appendChild(n); row.appendChild(priceInput); row.appendChild(perSel);
      wrap.appendChild(row);
    });
  }
  $('#prices-reset')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE.prices);
    toast('Pricing reset to defaults.');
    renderPricing();
  });

  // ---------- Members -------------------------------------------
  function renderMembers() {
    const all = load(STORAGE.members, []);
    const search = $('#members-search').value.trim().toLowerCase();
    const filter = $('#members-filter').value;
    const list = all.filter(m => {
      if (filter === 'monthly' && !m.plan.startsWith('monthly')) return false;
      if (filter === 'annual' && m.plan !== 'annual') return false;
      if (filter === 'hero' && !m.plan.includes('hero')) return false;
      if (!search) return true;
      return m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search);
    });
    const tb = $('#members-body');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    list.forEach(m => {
      const tr = document.createElement('tr');
      const cells = [
        { name: m.name, email: m.email },
        m.plan.includes('hero') ? 'Monthly (Hero)' : (m.plan === 'annual' ? 'Annual' : 'Monthly'),
        m.joined,
        m.lastVisit,
        { text: String(m.visitsMTD), cls: 'num' },
        { tag: m.status },
      ];
      cells.forEach(c => {
        const td = document.createElement('td');
        if (c.tag) {
          const t = document.createElement('span'); t.className = 'tag tag-' + c.tag; t.textContent = c.tag;
          td.appendChild(t);
        } else if (c.name) {
          const n = document.createElement('div'); n.style.fontWeight = '500'; n.textContent = c.name;
          const e = document.createElement('div'); e.style.fontSize = '11px'; e.style.color = 'var(--chalk-mute)'; e.textContent = c.email;
          td.appendChild(n); td.appendChild(e);
        } else if (c.text) {
          td.textContent = c.text; td.className = c.cls || '';
        } else {
          td.textContent = c;
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  }
  $('#members-search')?.addEventListener('input', renderMembers);
  $('#members-filter')?.addEventListener('change', renderMembers);

  // ---------- Routes / walls ------------------------------------
  function renderRoutes() {
    const walls = load(STORAGE.routes, []);
    const grid = $('#walls-grid');
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    const todayMs = startOfDay().getTime();
    walls.forEach(w => {
      const lastMs = new Date(w.lastSet + 'T12:00').getTime();
      const sinceDays = Math.floor((todayMs - lastMs) / 86400000);
      const fresh = sinceDays < w.cycle * 0.5;
      const due = sinceDays >= w.cycle;
      const pct = Math.min(100, (sinceDays / w.cycle) * 100);

      const card = document.createElement('article');
      card.className = 'wall-card' + (due ? ' due' : fresh ? ' fresh' : '');

      const name = document.createElement('div'); name.className = 'w-name'; name.textContent = w.name;
      const meta = document.createElement('div'); meta.className = 'w-meta';
      meta.textContent = 'Cycle: ' + w.cycle + ' days · Last set ' + w.lastSet;

      const since = document.createElement('div'); since.className = 'w-since';
      const num = document.createElement('span'); num.textContent = sinceDays;
      const em = document.createElement('em'); em.textContent = sinceDays === 1 ? 'DAY AGO' : 'DAYS AGO';
      since.appendChild(num); since.appendChild(em);

      const status = document.createElement('div');
      status.style.fontFamily = 'var(--font-mono)';
      status.style.fontSize = '11px';
      status.style.letterSpacing = '0.06em';
      status.textContent = due ? '⚠ DUE FOR FRESH SET' : fresh ? '✓ FRESH' : '· ' + (w.cycle - sinceDays) + ' days until due';
      status.style.color = due ? 'var(--coral)' : fresh ? 'var(--lime)' : 'var(--chalk-dim)';

      const bar = document.createElement('div'); bar.className = 'w-bar';
      const fill = document.createElement('div'); fill.className = 'w-bar-fill'; fill.style.width = pct + '%';
      bar.appendChild(fill);

      const setBtn = document.createElement('button');
      setBtn.className = 'btn-tiny'; setBtn.textContent = 'Mark set today';
      setBtn.style.alignSelf = 'flex-start';
      setBtn.onclick = () => {
        const all = load(STORAGE.routes, []);
        const idx = all.findIndex(x => x.id === w.id);
        if (idx >= 0) {
          all[idx].lastSet = new Date().toISOString().slice(0,10);
          save(STORAGE.routes, all);
          toast(w.name + ' marked as freshly set.');
          renderRoutes();
        }
      };

      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(since);
      card.appendChild(status);
      card.appendChild(bar);
      card.appendChild(setBtn);
      grid.appendChild(card);
    });
  }
  $('#mark-set-today')?.addEventListener('click', () => {
    const all = load(STORAGE.routes, []);
    const todayMs = startOfDay().getTime();
    let oldest = null;
    all.forEach(w => {
      const since = (todayMs - new Date(w.lastSet + 'T12:00').getTime()) / 86400000;
      if (!oldest || since > oldest._since) oldest = { ...w, _since: since };
    });
    if (!oldest) return;
    const idx = all.findIndex(x => x.id === oldest.id);
    all[idx].lastSet = new Date().toISOString().slice(0,10);
    save(STORAGE.routes, all);
    toast(oldest.name + ' marked as freshly set.');
    renderRoutes();
  });

  // ---------- Settings ------------------------------------------
  function renderSettings() {
    const s = load(STORAGE.settings, {});
    $('#s-name').value = s.name || '';
    $('#s-address').value = s.address || '';
    $('#s-email').value = s.email || '';
    $('#s-phone').value = s.phone || '';
  }
  $('#settings-form')?.addEventListener('submit', e => {
    e.preventDefault();
    save(STORAGE.settings, {
      name: $('#s-name').value.trim(),
      address: $('#s-address').value.trim(),
      email: $('#s-email').value.trim(),
      phone: $('#s-phone').value.trim(),
    });
    toast('Settings saved.');
  });

  // ---------- Reseed --------------------------------------------
  $('#seed-reset')?.addEventListener('click', () => {
    if (!confirm('Wipe all admin data and reseed with fresh demo data?')) return;
    Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
    seedAll(true);
    toast('Demo reseeded.', 'warn');
    activateTab('dashboard');
  });

  // ---------- Renderers map -------------------------------------
  const renderers = {
    dashboard: renderDashboard,
    orders: renderOrders,
    analytics: renderAnalytics,
    accounting: renderAccounting,
    events: renderEvents,
    pricing: renderPricing,
    members: renderMembers,
    routes: renderRoutes,
    settings: renderSettings,
  };

  // ---------- Boot ----------------------------------------------
  seedAll();
  const initialTab = (location.hash || '#dashboard').slice(1);
  activateTab(renderers[initialTab] ? initialTab : 'dashboard');
  // re-render dashboard every minute so live data feels alive
  setInterval(() => {
    if ($('.tab[data-panel="dashboard"]').classList.contains('active')) renderDashboard();
  }, 60_000);

})();
