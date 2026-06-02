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
    users:    'scc-users',
    shifts:   'scc-shifts',
    currentUser: 'scc-current-user',
  };

  // ---------- Permission model (RBAC) ---------------------------
  // Edit this matrix to change what each role can do. The Users
  // tab shows it in plain English; here's the machine version.
  const ROLE_PERMS = {
    admin:   ['*'],
    manager: [
      'dashboard.view','schedule.view','schedule.edit','schedule.edit-others',
      'orders.view','orders.refund','analytics.view','accounting.view','accounting.edit',
      'events.view','events.edit','members.view','members.edit',
      'pricing.edit','routes.view','routes.edit',
    ],
    setter: [
      'dashboard.view','schedule.view','schedule.edit-own',
      'routes.view','routes.edit',
      'orders.view','members.view','analytics.view',
    ],
    staff: [
      'dashboard.view','schedule.view','schedule.edit-own',
      'orders.view','members.view',
    ],
  };
  const ROLE_LABELS = { admin:'Admin', manager:'Manager', setter:'Setter', staff:'Staff' };

  function can(perm, role) {
    role = role || (getCurrentUser()?.role) || 'admin';
    const list = ROLE_PERMS[role] || [];
    return list.includes('*') || list.includes(perm);
  }
  function getCurrentUser() {
    const id = load(STORAGE.currentUser, null);
    const users = load(STORAGE.users, []);
    return users.find(u => u.id === id) || users[0] || null;
  }
  function setCurrentUser(id) {
    save(STORAGE.currentUser, id);
    applyPermissions();
    renderUserSwitcher();
    // Re-render whichever tab is active
    const active = $$('.tab.active')[0]?.dataset.panel;
    if (active && renderers[active]) renderers[active]();
  }

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
  const SEED_VERSION = 2; // bump when seed shape changes
  function seedAll(force=false) {
    const seededVersion = load(STORAGE.seeded, 0);
    const alreadyFresh = seededVersion >= SEED_VERSION;
    if (alreadyFresh && !force) return;

    // MIGRATION-SAFE: only initialize tables that are missing.
    // `force` (from "Reseed Demo" button) wipes everything first.
    if (force) {
      Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
    }
    const hasBookings = !force && load(STORAGE.bookings, null) !== null;
    const hasExpenses = !force && load(STORAGE.expenses, null) !== null;
    const hasEvents   = !force && load(STORAGE.events, null) !== null;
    const hasRoutes   = !force && load(STORAGE.routes, null) !== null;
    const hasMembers  = !force && load(STORAGE.members, null) !== null;
    const hasUsers    = !force && load(STORAGE.users, null) !== null;
    const hasShifts   = !force && load(STORAGE.shifts, null) !== null;

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
    if (!hasBookings) save(STORAGE.bookings, orders);

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
    if (!hasExpenses) save(STORAGE.expenses, expensesSeed);

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
    if (!hasEvents) save(STORAGE.events, events);

    // Routes / walls
    const walls = [
      { id:'w1', name:'Main Slab', cycle: 14, lastSet: daysAgoIso(3) },
      { id:'w2', name:'24° Vert',  cycle: 14, lastSet: daysAgoIso(8) },
      { id:'w3', name:'40° Steep', cycle: 14, lastSet: daysAgoIso(15) },
      { id:'w4', name:'The Cave',  cycle: 21, lastSet: daysAgoIso(18) },
      { id:'w5', name:'Kid Wall',  cycle: 21, lastSet: daysAgoIso(11) },
    ];
    if (!hasRoutes) save(STORAGE.routes, walls);

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
    if (!hasMembers) save(STORAGE.members, members);

    // Users / staff accounts
    const users = [
      { id:'u1', name:'Edwin Chow',   email:'edwin@scc.co',   role:'admin',   color:'#FF6B1A', avatar:'EC', status:'active', lastActive: now },
      { id:'u2', name:'Collin Jester',email:'collin@scc.co',  role:'admin',   color:'#D4E84A', avatar:'CJ', status:'active', lastActive: now - 30*60*1000 },
      { id:'u3', name:'Ryan Perkins', email:'ryan@scc.co',    role:'manager', color:'#5BA8E8', avatar:'RP', status:'active', lastActive: now - 2*60*60*1000 },
      { id:'u4', name:'Maya Holm',    email:'maya@scc.co',    role:'staff',   color:'#E13159', avatar:'MH', status:'active', lastActive: now - 1*86400000 },
      { id:'u5', name:'Sam Cole',     email:'sam@scc.co',     role:'staff',   color:'#9D7BE8', avatar:'SC', status:'active', lastActive: now - 3*86400000 },
      { id:'u6', name:'Jordan Reed',  email:'jordan@scc.co',  role:'staff',   color:'#4ECDC4', avatar:'JR', status:'active', lastActive: now - 4*60*60*1000 },
      { id:'u7', name:'Nico Park',    email:'nico@scc.co',    role:'setter',  color:'#F5C242', avatar:'NP', status:'active', lastActive: now - 6*86400000 },
    ];
    if (!hasUsers) save(STORAGE.users, users);
    if (!load(STORAGE.currentUser, null)) save(STORAGE.currentUser, 'u1');

    // Shifts — 14 days back, 14 days forward
    const SHIFT_ROLES = ['Floor','Front Desk','Setting','Coaching','Manager on Duty'];
    const shifts = [];
    for (let d = -14; d <= 14; d++) {
      const date = new Date(now + d * 86400000);
      const iso = date.toISOString().slice(0, 10);
      const dow = date.getDay();
      // Sat=6: 10-18, Sun=0: 13-18, M-F: 12-21
      const open  = dow === 6 ? 10 : dow === 0 ? 13 : 12;
      const close = dow === 6 ? 18 : dow === 0 ? 18 : 21;
      // 2-4 shifts per day
      const numShifts = irand(2, 4);
      const used = new Set();
      for (let s = 0; s < numShifts; s++) {
        const user = pick(users.filter(u => !used.has(u.id)));
        if (!user) break;
        used.add(user.id);
        // shift starts within first half of day, lasts 4-6 hours
        const start = open + irand(0, Math.max(1, Math.floor((close - open) / 2)));
        const end   = Math.min(close, start + irand(4, 6));
        const role  = pick(SHIFT_ROLES);
        shifts.push({
          id: 'sh-' + iso + '-' + user.id + '-' + s,
          userId: user.id,
          date: iso,
          start: pad2(start) + ':00',
          end:   pad2(end) + ':00',
          role,
          notes: '',
        });
      }
    }
    if (!hasShifts) save(STORAGE.shifts, shifts);
    function pad2(n) { return String(n).padStart(2,'0'); }

    // Settings defaults
    if (!load(STORAGE.settings, null)) {
      save(STORAGE.settings, {
        name: 'Summit City Climbing Co.',
        address: '1331 E Berry St, Fort Wayne, IN 46803',
        email: 'summitcityclimbingco@gmail.com',
        phone: '(260) 555-0142',
      });
    }

    save(STORAGE.seeded, SEED_VERSION);

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
    dashboard:'Dashboard', schedule:'Schedule', orders:'Orders', analytics:'Analytics',
    accounting:'Accounting', events:'Events & Programs', pricing:'Pricing & Plans',
    members:'Members', users:'Users & Permissions', routes:'Route Setting', settings:'Settings',
  };
  function activateTab(name) {
    // Permission gate: redirect if user lacks access
    const btn = tabBtns.find(b => b.dataset.tab === name);
    const perm = btn?.dataset.perm;
    if (perm && !can(perm)) {
      // pick the first visible tab as a fallback
      const visible = tabBtns.find(b => !b.classList.contains('hidden'));
      if (visible && visible.dataset.tab !== name) {
        activateTab(visible.dataset.tab);
        return;
      }
    }
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

  // Apply permissions: hide tabs the current user can't see + lock gated buttons
  function applyPermissions() {
    tabBtns.forEach(b => {
      const perm = b.dataset.perm;
      const ok = !perm || can(perm);
      b.classList.toggle('hidden', !ok);
    });
    $$('[data-gate]').forEach(el => {
      const ok = can(el.dataset.gate);
      el.classList.toggle('locked', !ok);
    });
  }

  // ---------- View switcher (top-right dropdown) ----------------
  function renderUserSwitcher() {
    const me = getCurrentUser();
    if (!me) return;
    $('#user-avatar-pill').textContent = me.avatar;
    $('#user-avatar-pill').style.background = me.color;
    $('#user-name-pill').textContent = me.name;
    $('#user-role-pill').textContent = ROLE_LABELS[me.role] || me.role;

    const list = $('#user-menu-list');
    while (list.firstChild) list.removeChild(list.firstChild);
    load(STORAGE.users, []).forEach(u => {
      const li = document.createElement('li');
      if (u.id === me.id) li.classList.add('active');
      const av = document.createElement('span');
      av.className = 'user-avatar'; av.textContent = u.avatar;
      av.style.background = u.color;
      const meta = document.createElement('span');
      meta.style.display = 'flex'; meta.style.flexDirection = 'column';
      const n = document.createElement('span'); n.className = 'um-name'; n.textContent = u.name;
      const r = document.createElement('span'); r.className = 'um-role'; r.textContent = ROLE_LABELS[u.role];
      meta.appendChild(n); meta.appendChild(r);
      li.appendChild(av); li.appendChild(meta);
      li.onclick = () => {
        setCurrentUser(u.id);
        $('#user-menu').hidden = true;
        toast('Viewing as ' + u.name + ' (' + ROLE_LABELS[u.role] + ')');
      };
      list.appendChild(li);
    });
  }
  $('#user-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('#user-menu');
    menu.hidden = !menu.hidden;
    $('#user-trigger').setAttribute('aria-expanded', String(!menu.hidden));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#user-switcher')) {
      const menu = $('#user-menu');
      if (menu && !menu.hidden) menu.hidden = true;
    }
  });

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
    seedAll(true);  // force: wipes and reseeds everything
    renderUserSwitcher();
    applyPermissions();
    toast('Demo reseeded.', 'warn');
    activateTab('dashboard');
  });

  // ============================================================
  // SCHEDULE TAB
  // ============================================================
  let selectedDate = new Date().toISOString().slice(0, 10);
  // Timeline starts at 8 AM, runs 14 hours → 9 PM (latest gym close).
  const TIMELINE_START_HOUR = 8;
  const TIMELINE_HOURS = 14;

  function renderSchedule() {
    renderDaySlider();
    renderTimelineFor(selectedDate);
    renderWeekSummary();
    renderCoverageAlerts();
    const me = getCurrentUser();
    $('#sched-sub').textContent = can('schedule.edit')
      ? "Who's on the floor. Tap a day to see the whole crew."
      : "Viewing as " + me.name + " — everyone's schedule. Tap a shift to see details.";
    // Today's shift count → sidebar badge
    const todayIso = new Date().toISOString().slice(0,10);
    const todayCount = load(STORAGE.shifts, []).filter(s => s.date === todayIso).length;
    $('#badge-schedule').textContent = todayCount;
  }

  function renderDaySlider() {
    const slider = $('#day-slider');
    while (slider.firstChild) slider.removeChild(slider.firstChild);
    const todayIso = new Date().toISOString().slice(0,10);
    const shifts = load(STORAGE.shifts, []);
    // Show 21 days centered on today (7 past, today, 13 future)
    for (let i = -7; i <= 13; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayCount = shifts.filter(s => s.date === iso).length;

      const pill = document.createElement('button');
      pill.className = 'day-pill';
      if (iso === todayIso) pill.classList.add('today');
      if (iso === selectedDate) pill.classList.add('selected');
      pill.setAttribute('role', 'tab');
      pill.setAttribute('aria-selected', String(iso === selectedDate));

      const day = document.createElement('span'); day.className = 'dp-day';
      day.textContent = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase();
      const num = document.createElement('span'); num.className = 'dp-num';
      num.textContent = d.getDate();
      const count = document.createElement('span'); count.className = 'dp-count';
      count.textContent = dayCount ? dayCount + ' shift' + (dayCount === 1 ? '' : 's') : '·';

      pill.appendChild(day); pill.appendChild(num); pill.appendChild(count);
      pill.onclick = () => {
        selectedDate = iso;
        renderDaySlider();
        renderTimelineFor(iso);
        // Center the pill on mobile
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      };
      slider.appendChild(pill);
    }
    // Auto-center today/selected pill on mount
    setTimeout(() => {
      const sel = slider.querySelector('.day-pill.selected');
      sel?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    }, 0);
  }

  $('#day-prev')?.addEventListener('click', () => shiftDay(-1));
  $('#day-next')?.addEventListener('click', () => shiftDay(1));
  $('#sched-today')?.addEventListener('click', () => {
    selectedDate = new Date().toISOString().slice(0,10);
    renderSchedule();
  });
  function shiftDay(delta) {
    const d = new Date(selectedDate + 'T12:00');
    d.setDate(d.getDate() + delta);
    selectedDate = d.toISOString().slice(0,10);
    renderSchedule();
  }

  function renderTimelineFor(iso) {
    const timeline = $('#timeline');
    while (timeline.firstChild) timeline.removeChild(timeline.firstChild);

    // Hour labels (left column)
    for (let i = 0; i < TIMELINE_HOURS; i++) {
      const h = TIMELINE_START_HOUR + i;
      const label = document.createElement('div');
      label.className = 'timeline-hour';
      label.style.gridRow = (i + 1).toString();
      label.textContent = formatHour(h);
      timeline.appendChild(label);
    }

    // Lane (right column, spans all rows)
    const lane = document.createElement('div');
    lane.className = 'timeline-lane';
    lane.style.gridColumn = '2';
    lane.style.gridRow = '1 / span ' + TIMELINE_HOURS;
    timeline.appendChild(lane);

    // Build shifts for this day
    const allShifts = load(STORAGE.shifts, []).filter(s => s.date === iso);
    const users = load(STORAGE.users, []);
    const me = getCurrentUser();

    // Day label / count
    const date = new Date(iso + 'T12:00');
    $('#sched-day-label').textContent = date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    $('#sched-day-count').textContent = allShifts.length
      ? allShifts.length + ' ' + (allShifts.length === 1 ? 'shift' : 'shifts') + ' scheduled'
      : 'Nobody scheduled.';

    // Empty state
    if (allShifts.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = 'No shifts on this day. Tap + to add one.';
      timeline.appendChild(empty);
      $('#sched-legend').replaceChildren();
      return;
    }

    // Sort by start time
    allShifts.sort((a, b) => a.start.localeCompare(b.start));

    // Render each shift as absolutely-positioned block in the lane
    const rowHeight = 56; // matches CSS
    allShifts.forEach(sh => {
      const user = users.find(u => u.id === sh.userId) || { name: '—', color: '#888', avatar: '?' };
      const startH = toFloatHour(sh.start);
      const endH = toFloatHour(sh.end);
      const topPx = (startH - TIMELINE_START_HOUR) * rowHeight;
      const heightPx = Math.max(50, (endH - startH) * rowHeight - 4);

      const block = document.createElement('div');
      block.className = 'shift';
      if (user.id === me.id) block.classList.add('is-me');
      block.style.top = topPx + 'px';
      block.style.height = heightPx + 'px';
      block.style.setProperty('--shift-color', user.color);

      const head = document.createElement('div'); head.className = 's-head';
      const av = document.createElement('span'); av.className = 's-avatar'; av.textContent = user.avatar;
      const nm = document.createElement('span'); nm.textContent = user.name;
      head.appendChild(av); head.appendChild(nm);

      const time = document.createElement('div'); time.className = 's-time';
      time.textContent = formatTimeRange(sh.start, sh.end);

      const role = document.createElement('div'); role.className = 's-role'; role.textContent = sh.role;

      block.appendChild(head); block.appendChild(time); block.appendChild(role);

      // Click to edit (gated by permission)
      const canEditThis = can('schedule.edit-others') || can('schedule.edit') ||
                          (can('schedule.edit-own') && user.id === me.id);
      if (canEditThis) {
        block.onclick = () => openShiftEdit(sh.id);
        block.title = 'Click to edit';
      } else {
        block.style.cursor = 'default';
        block.title = user.name + ' · ' + sh.role + ' · ' + formatTimeRange(sh.start, sh.end);
      }
      lane.appendChild(block);
    });

    // Legend (unique users on this day)
    const legend = $('#sched-legend');
    while (legend.firstChild) legend.removeChild(legend.firstChild);
    const seen = new Set();
    allShifts.forEach(sh => {
      if (seen.has(sh.userId)) return;
      seen.add(sh.userId);
      const u = users.find(x => x.id === sh.userId);
      if (!u) return;
      const item = document.createElement('div'); item.className = 'sched-legend-item';
      const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = u.color;
      const label = document.createElement('span'); label.textContent = u.name.split(' ')[0];
      item.appendChild(sw); item.appendChild(label);
      legend.appendChild(item);
    });
  }

  function renderWeekSummary() {
    const ul = $('#week-summary');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    const todayIso = new Date().toISOString().slice(0,10);
    const startOfWeek = (() => {
      const d = new Date(); d.setHours(0,0,0,0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Mon
      return d;
    })();
    const shifts = load(STORAGE.shifts, []);
    const users = load(STORAGE.users, []);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const day = shifts.filter(s => s.date === iso);
      const li = document.createElement('li');
      const lbl = document.createElement('span'); lbl.className = 'ws-day';
      lbl.textContent = d.toLocaleDateString(undefined, { weekday:'short' }).toUpperCase() + ' ' + d.getDate();
      if (iso === todayIso) lbl.style.color = 'var(--orange)';
      const stack = document.createElement('span'); stack.className = 'ws-stack';
      const ids = [...new Set(day.map(s => s.userId))];
      ids.slice(0, 4).forEach(id => {
        const u = users.find(x => x.id === id);
        if (!u) return;
        const av = document.createElement('span'); av.className = 'user-avatar';
        av.textContent = u.avatar; av.style.background = u.color; av.style.color = '#0F0E13';
        stack.appendChild(av);
      });
      const count = document.createElement('span'); count.className = 'ws-count';
      count.textContent = day.length || '—';
      li.appendChild(lbl); li.appendChild(stack); li.appendChild(count);
      li.style.cursor = 'pointer';
      li.onclick = () => { selectedDate = iso; renderSchedule(); };
      ul.appendChild(li);
    }
  }

  function renderCoverageAlerts() {
    const ul = $('#coverage-alerts');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    const shifts = load(STORAGE.shifts, []);
    const todayIso = new Date().toISOString().slice(0,10);
    const alerts = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0,10);
      const count = shifts.filter(s => s.date === iso).length;
      if (count === 0) alerts.push({ kind:'bad', text: dayName(d) + ' has nobody scheduled.' });
      else if (count === 1) alerts.push({ kind:'warn', text: dayName(d) + ' is single-staffed.' });
    }
    if (alerts.length === 0) {
      alerts.push({ kind:'ok', text:'Next 7 days are fully covered.' });
    }
    alerts.forEach(a => {
      const li = document.createElement('li');
      const dot = document.createElement('span'); dot.className = 'ca-dot ' + a.kind;
      const text = document.createElement('span'); text.className = 'ca-text';
      text.textContent = a.text;
      li.appendChild(dot); li.appendChild(text);
      ul.appendChild(li);
    });
    function dayName(d) {
      return d.toLocaleDateString(undefined, { weekday:'long' });
    }
  }

  function openShiftEdit(id) {
    const shifts = load(STORAGE.shifts, []);
    const me = getCurrentUser();
    const sh = id ? shifts.find(x => x.id === id) : {
      id: 'sh-' + Date.now().toString(36),
      userId: me.id,
      date: selectedDate,
      start: '12:00',
      end: '17:00',
      role: 'Floor',
      notes: '',
    };

    // Permission check
    if (id) {
      const canEdit = can('schedule.edit-others') || can('schedule.edit') ||
                      (can('schedule.edit-own') && sh.userId === me.id);
      if (!canEdit) {
        toast('You don\'t have permission to edit this shift.', 'warn');
        return;
      }
    } else if (!can('schedule.edit') && !can('schedule.edit-own')) {
      toast('You can\'t create shifts.', 'warn');
      return;
    }

    const users = load(STORAGE.users, []);

    openAModal((body) => {
      const h = document.createElement('h3');
      h.textContent = id ? 'Edit Shift' : 'New Shift';
      body.appendChild(h);

      const form = document.createElement('form');
      form.className = 'form-stack';

      // Staff select
      const sLab = document.createElement('label'); sLab.textContent = 'Staff';
      const sSel = document.createElement('select'); sSel.id = 'sh-user';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.name + ' (' + ROLE_LABELS[u.role] + ')';
        if (u.id === sh.userId) opt.selected = true;
        sSel.appendChild(opt);
      });
      // Lock to self if user only has schedule.edit-own
      if (!can('schedule.edit') && !can('schedule.edit-others') && can('schedule.edit-own')) {
        sSel.value = me.id; sSel.disabled = true;
      }
      sLab.appendChild(sSel);
      form.appendChild(sLab);

      // Date
      const dLab = document.createElement('label'); dLab.textContent = 'Date';
      const dInp = document.createElement('input');
      dInp.type = 'date'; dInp.id = 'sh-date'; dInp.value = sh.date;
      dLab.appendChild(dInp);
      form.appendChild(dLab);

      // Start + End in a row
      const row = document.createElement('div');
      row.style.display = 'grid'; row.style.gridTemplateColumns = '1fr 1fr'; row.style.gap = '10px';
      ['Start','End'].forEach((label, i) => {
        const id = i === 0 ? 'sh-start' : 'sh-end';
        const val = i === 0 ? sh.start : sh.end;
        const l = document.createElement('label'); l.textContent = label;
        const inp = document.createElement('input');
        inp.type = 'time'; inp.id = id; inp.value = val;
        l.appendChild(inp); row.appendChild(l);
      });
      form.appendChild(row);

      // Role
      const rLab = document.createElement('label'); rLab.textContent = 'Role';
      const rSel = document.createElement('select'); rSel.id = 'sh-role';
      ['Floor','Front Desk','Setting','Coaching','Manager on Duty','Cleaning','Pro Shop'].forEach(r => {
        const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
        if (r === sh.role) opt.selected = true;
        rSel.appendChild(opt);
      });
      rLab.appendChild(rSel);
      form.appendChild(rLab);

      // Notes
      const nLab = document.createElement('label'); nLab.textContent = 'Notes';
      const nTxt = document.createElement('textarea');
      nTxt.id = 'sh-notes'; nTxt.rows = 2; nTxt.value = sh.notes || '';
      nLab.appendChild(nTxt);
      form.appendChild(nLab);

      // Action row
      const actions = document.createElement('div');
      actions.style.display = 'flex'; actions.style.gap = '8px';
      actions.style.justifyContent = 'space-between'; actions.style.marginTop = '8px';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-prim'; saveBtn.type = 'submit';
      saveBtn.textContent = id ? 'Save Shift' : 'Create Shift';

      if (id) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-ghost'; del.textContent = 'Delete';
        del.style.color = 'var(--coral)'; del.style.borderColor = 'rgba(225,49,89,0.3)';
        del.onclick = () => {
          if (!confirm('Delete this shift?')) return;
          const all = load(STORAGE.shifts, []);
          save(STORAGE.shifts, all.filter(x => x.id !== sh.id));
          toast('Shift deleted.', 'warn');
          closeAModal();
          renderSchedule();
        };
        actions.appendChild(del);
      } else {
        actions.appendChild(document.createElement('span'));
      }
      actions.appendChild(saveBtn);
      form.appendChild(actions);

      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          id: sh.id,
          userId: $('#sh-user').value,
          date: $('#sh-date').value,
          start: $('#sh-start').value,
          end: $('#sh-end').value,
          role: $('#sh-role').value,
          notes: $('#sh-notes').value.trim(),
        };
        if (data.start >= data.end) { toast('End time must be after start.', 'warn'); return; }
        const all = load(STORAGE.shifts, []);
        const idx = all.findIndex(x => x.id === sh.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
        save(STORAGE.shifts, all);
        toast(id ? 'Shift saved.' : 'Shift created.');
        closeAModal();
        // Jump to that day if user picked a different date
        selectedDate = data.date;
        renderSchedule();
      };

      body.appendChild(form);
    });
  }

  $('#sched-add')?.addEventListener('click', () => openShiftEdit(null));
  $('#sched-add-fab')?.addEventListener('click', () => openShiftEdit(null));

  function toFloatHour(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h + (m || 0) / 60;
  }
  function formatHour(h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const v = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return v + ' ' + ampm;
  }
  function formatTimeRange(s, e) {
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const fmt = (h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const v = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return v + (m ? ':' + String(m).padStart(2,'0') : '') + ampm;
    };
    return fmt(sh, sm) + ' – ' + fmt(eh, em);
  }

  // ============================================================
  // USERS TAB
  // ============================================================
  function renderUsers() {
    const all = load(STORAGE.users, []);
    const search = $('#users-search').value.trim().toLowerCase();
    const filter = $('#users-filter').value;
    const list = all.filter(u => {
      if (filter && u.role !== filter) return false;
      if (!search) return true;
      return u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
    });
    const me = getCurrentUser();
    const tb = $('#users-body');
    while (tb.firstChild) tb.removeChild(tb.firstChild);

    list.forEach(u => {
      const tr = document.createElement('tr');

      // Avatar
      const avTd = document.createElement('td'); avTd.style.width = '50px';
      const av = document.createElement('div'); av.className = 'users-row-avatar';
      av.textContent = u.avatar; av.style.background = u.color;
      avTd.appendChild(av); tr.appendChild(avTd);

      // Name (with "you" marker)
      const nTd = document.createElement('td');
      const nn = document.createElement('div'); nn.style.fontWeight = '500';
      nn.textContent = u.name + (u.id === me.id ? ' (you)' : '');
      nTd.appendChild(nn);
      tr.appendChild(nTd);

      // Email
      const eTd = document.createElement('td');
      eTd.style.fontFamily = 'var(--font-mono)';
      eTd.style.fontSize = '12px';
      eTd.style.color = 'var(--chalk-dim)';
      eTd.textContent = u.email;
      tr.appendChild(eTd);

      // Role tag
      const rTd = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = 'tag role-tag-' + u.role;
      tag.textContent = ROLE_LABELS[u.role];
      rTd.appendChild(tag);
      tr.appendChild(rTd);

      // Last Active
      const laTd = document.createElement('td');
      laTd.style.fontFamily = 'var(--font-mono)';
      laTd.style.fontSize = '12px';
      laTd.style.color = 'var(--chalk-dim)';
      laTd.textContent = relativeTime(u.lastActive);
      tr.appendChild(laTd);

      // Status
      const sTd = document.createElement('td');
      const st = document.createElement('span');
      st.className = 'tag tag-' + u.status;
      st.textContent = u.status;
      sTd.appendChild(st);
      tr.appendChild(sTd);

      // Actions
      const aTd = document.createElement('td');
      aTd.style.textAlign = 'right';
      const edit = document.createElement('button');
      edit.className = 'btn-tiny'; edit.textContent = 'Edit';
      edit.onclick = () => openUserEdit(u.id);
      aTd.appendChild(edit);
      tr.appendChild(aTd);

      tb.appendChild(tr);
    });
  }
  $('#users-search')?.addEventListener('input', renderUsers);
  $('#users-filter')?.addEventListener('change', renderUsers);
  $('#users-add')?.addEventListener('click', () => openUserEdit(null));

  function openUserEdit(id) {
    const users = load(STORAGE.users, []);
    const u = id ? users.find(x => x.id === id) : {
      id: 'u-' + Date.now().toString(36),
      name: '', email: '', role: 'staff',
      color: pick(['#FF6B1A','#D4E84A','#5BA8E8','#E13159','#9D7BE8','#4ECDC4','#F5C242']),
      avatar: 'NN', status: 'active', lastActive: Date.now(),
    };
    openAModal((body) => {
      const h = document.createElement('h3');
      h.textContent = id ? 'Edit User' : 'New User';
      body.appendChild(h);

      const form = document.createElement('form');
      form.className = 'form-stack';

      [['Name','text','u-name', u.name],
       ['Email','email','u-email', u.email]].forEach(([label, type, fid, val]) => {
        const l = document.createElement('label'); l.textContent = label;
        const i = document.createElement('input'); i.type = type; i.id = fid; i.value = val;
        l.appendChild(i); form.appendChild(l);
      });

      // Role
      const rLab = document.createElement('label'); rLab.textContent = 'Role';
      const rSel = document.createElement('select'); rSel.id = 'u-role';
      Object.keys(ROLE_PERMS).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r; opt.textContent = ROLE_LABELS[r];
        if (r === u.role) opt.selected = true;
        rSel.appendChild(opt);
      });
      rLab.appendChild(rSel);
      form.appendChild(rLab);

      // Color
      const cLab = document.createElement('label'); cLab.textContent = 'Schedule color';
      const cInp = document.createElement('input');
      cInp.type = 'color'; cInp.id = 'u-color'; cInp.value = u.color;
      cLab.appendChild(cInp);
      form.appendChild(cLab);

      // Initials
      const aLab = document.createElement('label'); aLab.textContent = 'Initials (2 letters)';
      const aInp = document.createElement('input');
      aInp.type = 'text'; aInp.id = 'u-avatar'; aInp.value = u.avatar; aInp.maxLength = 2;
      aLab.appendChild(aInp);
      form.appendChild(aLab);

      // Status
      const sLab = document.createElement('label'); sLab.textContent = 'Status';
      const sSel = document.createElement('select'); sSel.id = 'u-status';
      ['active','inactive'].forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        if (s === u.status) opt.selected = true;
        sSel.appendChild(opt);
      });
      sLab.appendChild(sSel);
      form.appendChild(sLab);

      // Show role permissions read-out
      const permHead = document.createElement('div');
      permHead.className = 'perm-section-h';
      permHead.textContent = 'Permissions for this role';
      form.appendChild(permHead);

      const permList = document.createElement('div');
      permList.style.fontFamily = 'var(--font-mono)';
      permList.style.fontSize = '12px';
      permList.style.color = 'var(--chalk-dim)';
      permList.style.padding = '8px 12px';
      permList.style.background = 'var(--bg-3)';
      permList.style.borderRadius = '8px';
      const renderPerms = () => {
        const role = rSel.value;
        const perms = ROLE_PERMS[role] || [];
        permList.textContent = perms.includes('*')
          ? '* — full access (admin can do everything)'
          : perms.join(', ');
      };
      renderPerms();
      rSel.onchange = renderPerms;
      form.appendChild(permList);

      // Action row
      const actions = document.createElement('div');
      actions.style.display = 'flex'; actions.style.gap = '8px';
      actions.style.justifyContent = 'space-between'; actions.style.marginTop = '12px';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-prim'; saveBtn.type = 'submit';
      saveBtn.textContent = id ? 'Save' : 'Create';

      if (id && u.id !== getCurrentUser().id) {
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'btn-ghost'; del.textContent = 'Delete';
        del.style.color = 'var(--coral)'; del.style.borderColor = 'rgba(225,49,89,0.3)';
        del.onclick = () => {
          if (!confirm('Delete ' + u.name + '? Their shifts will be unassigned.')) return;
          const all = load(STORAGE.users, []);
          save(STORAGE.users, all.filter(x => x.id !== u.id));
          // Also unassign their shifts
          const allShifts = load(STORAGE.shifts, []);
          save(STORAGE.shifts, allShifts.filter(s => s.userId !== u.id));
          toast('User deleted.', 'warn');
          closeAModal();
          renderUsers();
        };
        actions.appendChild(del);
      } else {
        actions.appendChild(document.createElement('span'));
      }
      actions.appendChild(saveBtn);
      form.appendChild(actions);

      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          id: u.id,
          name: $('#u-name').value.trim(),
          email: $('#u-email').value.trim(),
          role: $('#u-role').value,
          color: $('#u-color').value,
          avatar: ($('#u-avatar').value.trim() || u.name.slice(0,2)).toUpperCase().slice(0,2),
          status: $('#u-status').value,
          lastActive: u.lastActive || Date.now(),
        };
        const all = load(STORAGE.users, []);
        const idx = all.findIndex(x => x.id === u.id);
        if (idx >= 0) all[idx] = data; else all.push(data);
        save(STORAGE.users, all);
        toast(id ? 'User saved.' : 'User created.');
        closeAModal();
        renderUsers();
        renderUserSwitcher();
      };

      body.appendChild(form);
    });
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const days = Math.floor(hr / 24);
    return days + 'd ago';
  }

  // ---------- Renderers map -------------------------------------
  const renderers = {
    dashboard: renderDashboard,
    schedule: renderSchedule,
    orders: renderOrders,
    analytics: renderAnalytics,
    accounting: renderAccounting,
    events: renderEvents,
    pricing: renderPricing,
    members: renderMembers,
    users: renderUsers,
    routes: renderRoutes,
    settings: renderSettings,
  };

  // ---------- Boot ----------------------------------------------
  seedAll();
  renderUserSwitcher();
  applyPermissions();
  const initialTab = (location.hash || '#dashboard').slice(1);
  // If user doesn't have permission for hashed tab, fall back to dashboard
  const initBtn = tabBtns.find(b => b.dataset.tab === initialTab);
  const initOk = !initBtn?.dataset.perm || can(initBtn.dataset.perm);
  activateTab(renderers[initialTab] && initOk ? initialTab : 'dashboard');
  // re-render dashboard every minute so live data feels alive
  setInterval(() => {
    if ($('.tab[data-panel="dashboard"]').classList.contains('active')) renderDashboard();
  }, 60_000);

})();
