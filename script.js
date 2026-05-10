/* ============================================================
   SUMMIT CITY CLIMBING CO. — script.js
   ============================================================ */
(() => {
  'use strict';

  // ---- LOADER ---------------------------------------------------
  window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('loader').classList.add('gone'), 1500);
  });

  // ---- CUSTOM CURSOR -------------------------------------------
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    const animate = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(animate);
    };
    animate();

    document.querySelectorAll('a, button, .hold, [data-open-book], summary, input, select, textarea')
      .forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
      });
  }

  // ---- NAV TOGGLE ----------------------------------------------
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- CLIMBING WALL: HOLD INTERACTION -------------------------
  const holds = document.querySelectorAll('.hold');
  const routeLine = document.getElementById('route-line');
  let tagged = new Set();
  holds.forEach(h => {
    const trigger = () => {
      const idx = h.dataset.hold;
      tagged.add(idx);
      h.classList.add('tagged');
      if (tagged.size >= 3) routeLine?.classList.add('drawn');
      if (tagged.size === holds.length) {
        const cap = document.querySelector('.wall-caption .hint');
        if (cap) { cap.textContent = 'YOU SENT IT'; cap.style.background = 'var(--lime)'; }
      }
    };
    h.addEventListener('mouseenter', trigger);
    h.addEventListener('focus', trigger);
    h.addEventListener('click', () => {
      // play a quick chalk-pop using Web Audio (only after first user gesture)
      try {
        const ctx = window.__audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 220 + parseInt(h.dataset.hold || 0) * 80;
        osc.type = 'triangle';
        gain.gain.value = 0.06;
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
      } catch (e) { /* silent */ }
    });
  });

  // ---- COUNT UP ON VIEW ----------------------------------------
  const numEls = document.querySelectorAll('[data-count]');
  const numObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || e.target.dataset.done) return;
      const target = parseInt(e.target.dataset.count, 10);
      const dur = 1400;
      const start = performance.now();
      const initial = parseInt(e.target.textContent, 10) || 0;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        e.target.textContent = Math.round(initial + (target - initial) * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      e.target.dataset.done = '1';
    });
  }, { threshold: 0.5 });
  numEls.forEach(el => numObs.observe(el));

  // ---- DISCOUNT TOGGLE -----------------------------------------
  const dButtons = document.querySelectorAll('.d-btn');
  dButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.disc;
      document.querySelectorAll('.plan-price .amount').forEach(a => {
        const v = a.dataset[mode];
        if (v) {
          a.style.transition = 'transform 200ms ease, color 200ms ease';
          a.style.transform = 'scale(1.1)';
          a.style.color = mode === 'hero' ? 'var(--lime)' : 'var(--chalk)';
          setTimeout(() => {
            a.textContent = v;
            a.style.transform = '';
          }, 100);
        }
      });
    });
  });

  // ---- LIVE STATUS (open / closed now) -------------------------
  const liveStatus = document.getElementById('live-status');
  const liveStatusText = document.getElementById('live-status-text');
  // Hours: M-F 12-21, Sat 10-18, Sun 13-18
  const HOURS = [
    { open: 13, close: 18 }, // Sun
    { open: 12, close: 21 }, // Mon
    { open: 12, close: 21 }, // Tue
    { open: 12, close: 21 }, // Wed
    { open: 12, close: 21 }, // Thu
    { open: 12, close: 21 }, // Fri
    { open: 10, close: 18 }, // Sat
  ];
  function updateStatus() {
    const now = new Date();
    const day = now.getDay();
    const h = now.getHours() + now.getMinutes() / 60;
    const t = HOURS[day];
    const isOpen = h >= t.open && h < t.close;
    if (liveStatus) {
      liveStatus.classList.toggle('open', isOpen);
      const closeFmt = (n) => {
        const ampm = n >= 12 ? 'PM' : 'AM';
        const v = n > 12 ? n - 12 : n === 0 ? 12 : n;
        return `${v} ${ampm}`;
      };
      if (isOpen) {
        liveStatusText.textContent = `OPEN — closes ${closeFmt(t.close)}`;
      } else if (h < t.open) {
        liveStatusText.textContent = `CLOSED — opens at ${closeFmt(t.open)}`;
      } else {
        const next = HOURS[(day + 1) % 7];
        liveStatusText.textContent = `CLOSED — opens tomorrow at ${closeFmt(next.open)}`;
      }
    }
    document.querySelectorAll('.hours ul li').forEach((li, i) => {
      // li order: Mon=0 ... Sun=6 in our HTML
      const dayIdx = (i + 1) % 7;
      li.classList.toggle('today', dayIdx === day);
    });
  }
  updateStatus();
  setInterval(updateStatus, 60_000);

  // ---- TICKER: PAUSE ON HOVER ----------------------------------
  const tickerTrack = document.getElementById('ticker-track');
  if (tickerTrack) {
    tickerTrack.parentElement.addEventListener('mouseenter', () => {
      tickerTrack.style.animationPlayState = 'paused';
    });
    tickerTrack.parentElement.addEventListener('mouseleave', () => {
      tickerTrack.style.animationPlayState = 'running';
    });
  }

  // ---- SECTION REVEAL ON SCROLL --------------------------------
  const revealEls = document.querySelectorAll('.section-title, .lede, .pillar, .fac-card, .plan, .prog, .party, .goat, .impact-stat, .map-card, .pull-quote, .video-card, .comp-video-card, .comp-stat, .g-card, .origin-photo, .tour-list');
  const reveal = (el) => {
    el.style.opacity = '1';
    el.style.transform = '';
  };
  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 700ms ease, transform 700ms cubic-bezier(.2,.7,.3,1)';
  });
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        reveal(e.target);
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -10% 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  // Failsafe: if user hasn't scrolled, reveal everything in viewport on load
  // and reveal everything else after a short fallback delay.
  const revealInView = () => {
    revealEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        reveal(el);
      }
    });
  };
  revealInView();
  // Also: if for any reason an element never gets observed (e.g. headless screenshots),
  // make sure all elements eventually become visible.
  setTimeout(() => revealEls.forEach(reveal), 4000);

  // ---- BOOKING MODAL -------------------------------------------
  const shade = document.getElementById('modal-shade');
  const closeBtn = document.getElementById('modal-close');
  const stepBack = document.getElementById('step-back');
  const stepNext = document.getElementById('step-next');
  const progressDots = document.querySelectorAll('.modal-progress .dot');
  const steps = document.querySelectorAll('.step');
  const expCards = document.querySelectorAll('.exp-card');

  let currentStep = 1;
  let booking = { exp: null, expLabel: null, date: null, time: null, people: 1, name: '', email: '', phone: '', notes: '', total: 0 };

  // Price table — single source of truth. Admin can override via localStorage.
  const DEFAULT_PRICES = {
    'day-pass':       { unit: 17,  per: 'person', label: 'Day Pass' },
    'weekly':         { unit: 20,  per: 'person', label: 'Weekly Pass' },
    'monthly':        { unit: 75,  per: 'person', label: 'Monthly Membership' },
    'punch-pass':     { unit: 150, per: 'order',  label: '10-Punch Pass' },
    'annual':         { unit: 750, per: 'person', label: 'Annual Membership' },
    'gift':           { unit: 50,  per: 'order',  label: 'Gift Card' },
    'class-beginner': { unit: 25,  per: 'person', label: 'Beginner Class' },
    'class-womens':   { unit: 17,  per: 'person', label: "Women's Climb (day pass)" },
    'class-yac':      { unit: 17,  per: 'person', label: 'Young Adult Climb' },
    'class-college':  { unit: 12,  per: 'person', label: 'College Climb' },
    'class-homeschool':{unit: 17,  per: 'person', label: 'Homeschool Climb' },
    'class-yoga':     { unit: 12,  per: 'person', label: 'Yoga' },
    'class-run':      { unit: 0,   per: 'order',  label: 'Run Club (free)' },
    'class-youth':    { unit: 30,  per: 'person', label: 'Youth Program' },
    'party-birthday': { unit: 200, per: 'order',  label: 'Birthday Party' },
    'party-corporate':{ unit: 350, per: 'order',  label: 'Group / Corporate' },
    'party-buyout':   { unit: 500, per: 'order',  label: 'Buyout Night' },
  };
  function getPrices() {
    try {
      const stored = JSON.parse(localStorage.getItem('scc-prices') || 'null');
      return stored ? { ...DEFAULT_PRICES, ...stored } : DEFAULT_PRICES;
    } catch (e) { return DEFAULT_PRICES; }
  }
  function calcTotal() {
    const p = getPrices()[booking.exp];
    if (!p) return 0;
    const qty = p.per === 'person' ? Math.max(1, booking.people || 1) : 1;
    booking.total = p.unit * qty;
    return booking.total;
  }
  function fmtMoney(n) {
    return '$' + (n || 0).toFixed(2).replace(/\.00$/, '');
  }

  function openModal(preset) {
    shade.hidden = false;
    requestAnimationFrame(() => shade.classList.add('open'));
    document.body.style.overflow = 'hidden';
    if (preset && preset !== '') {
      const card = document.querySelector(`.exp-card[data-exp="${preset}"]`);
      if (card) {
        expCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        booking.exp = preset;
        booking.expLabel = card.dataset.label;
      }
    }
    setStep(1);
  }
  function closeModal() {
    shade.classList.remove('open');
    setTimeout(() => { shade.hidden = true; document.body.style.overflow = ''; }, 280);
  }

  document.querySelectorAll('[data-open-book]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.openBook));
  });
  closeBtn?.addEventListener('click', closeModal);
  shade?.addEventListener('click', e => {
    if (e.target === shade) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !shade.hidden) closeModal();
  });

  expCards.forEach(card => {
    card.addEventListener('click', () => {
      expCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      booking.exp = card.dataset.exp;
      booking.expLabel = card.dataset.label;
    });
  });

  function setStep(n) {
    currentStep = n;
    steps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === n));
    progressDots.forEach((d, i) => {
      d.classList.toggle('active', i + 1 === n);
      d.classList.toggle('complete', i + 1 < n);
    });
    stepBack.disabled = n === 1;
    if (n === 5)      stepNext.textContent = 'PAY & SEND IT 🚀';
    else if (n === 4) stepNext.textContent = 'Pay →';
    else if (n === 3) stepNext.textContent = 'Review →';
    else              stepNext.textContent = 'Next →';
    if (n === 4) populateConfirm();
    if (n === 4 || n === 5) {
      const t = fmtMoney(calcTotal());
      const a1 = document.getElementById('total-amount-1');
      const a2 = document.getElementById('total-amount-2');
      if (a1) a1.textContent = t;
      if (a2) a2.textContent = t;
    }
  }

  stepBack?.addEventListener('click', () => { if (currentStep > 1) setStep(currentStep - 1); });

  stepNext?.addEventListener('click', () => {
    if (currentStep === 1) {
      if (!booking.exp) { shake(stepNext); return; }
      generateTimeSlots();
      setStep(2);
    } else if (currentStep === 2) {
      const date = document.getElementById('book-date').value;
      const time = document.getElementById('book-time').value;
      const people = parseInt(document.getElementById('book-people').value, 10) || 1;
      if (!date || !time) { shake(stepNext); return; }
      booking.date = date; booking.time = time; booking.people = people;
      setStep(3);
    } else if (currentStep === 3) {
      const name = document.getElementById('book-name').value.trim();
      const email = document.getElementById('book-email').value.trim();
      const phone = document.getElementById('book-phone').value.trim();
      const notes = document.getElementById('book-notes').value.trim();
      if (!name || !email || !email.includes('@')) { shake(stepNext); return; }
      booking.name = name; booking.email = email; booking.phone = phone; booking.notes = notes;
      setStep(4);
    } else if (currentStep === 4) {
      setStep(5);
    } else if (currentStep === 5) {
      // Validate payment fields
      const card = document.getElementById('book-card').value.replace(/\s/g, '');
      const exp  = document.getElementById('book-cardexp').value.trim();
      const cvc  = document.getElementById('book-cardcvc').value.trim();
      const zip  = document.getElementById('book-cardzip').value.trim();
      if (booking.total > 0 && (!card || card.length < 12 || !exp || !cvc || !zip)) {
        shake(stepNext); return;
      }
      booking.cardLast4 = card.slice(-4) || '0000';
      submitBooking();
    }
  });

  function generateTimeSlots() {
    const dateInput = document.getElementById('book-date');
    const timeSelect = document.getElementById('book-time');
    while (timeSelect.firstChild) timeSelect.removeChild(timeSelect.firstChild);
    const placeholder = document.createElement('option');
    placeholder.value = ''; placeholder.textContent = 'Pick a time';
    timeSelect.appendChild(placeholder);

    const date = dateInput.value ? new Date(dateInput.value + 'T12:00') : new Date();
    const day = date.getDay();
    const t = HOURS[day];
    for (let h = t.open; h < t.close; h++) {
      [0, 30].forEach(min => {
        if (h === t.close - 1 && min === 30) return;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const v = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const lbl = `${v}:${String(min).padStart(2,'0')} ${ampm}`;
        const opt = document.createElement('option');
        opt.value = lbl; opt.textContent = lbl;
        timeSelect.appendChild(opt);
      });
    }
    if (!dateInput.value) {
      const today = new Date();
      const tmw = new Date(today.getTime() + 86400000);
      dateInput.value = tmw.toISOString().split('T')[0];
      dateInput.min = today.toISOString().split('T')[0];
    }
    if (!dateInput.dataset.bound) {
      dateInput.addEventListener('change', generateTimeSlots);
      dateInput.dataset.bound = '1';
    }
  }

  function populateConfirm() {
    const c = document.getElementById('confirm-summary');
    while (c.firstChild) c.removeChild(c.firstChild);
    const rows = [
      ['Type', booking.expLabel || booking.exp],
      ['Date', booking.date],
      ['Time', booking.time],
      ['People', String(booking.people)],
      ['Name', booking.name],
      ['Email', booking.email],
    ];
    if (booking.phone) rows.push(['Phone', booking.phone]);
    if (booking.notes) rows.push(['Notes', booking.notes]);
    rows.forEach(([k, v]) => {
      const dl = document.createElement('dl');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
      c.appendChild(dl);
    });
  }

  function submitBooking() {
    const order = {
      id: 'SCC-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 999),
      ...booking,
      status: 'paid',
      ts: Date.now(),
    };
    try {
      const stored = JSON.parse(localStorage.getItem('scc-bookings') || '[]');
      stored.push(order);
      localStorage.setItem('scc-bookings', JSON.stringify(stored));
    } catch (e) { /* ignore */ }

    closeModal();
    const confirmed = document.getElementById('confirmed-shade');
    const summary = document.getElementById('confirmed-summary');
    const total = fmtMoney(booking.total);
    const summaryParts = [
      booking.expLabel,
      booking.date + ' @ ' + booking.time,
      'party of ' + booking.people,
      total,
    ];
    if (booking.cardLast4 && booking.total > 0) summaryParts.push('card ••••' + booking.cardLast4);
    summary.textContent = summaryParts.join(' · ') + ' · order ' + order.id;
    confirmed.hidden = false;
    requestAnimationFrame(() => confirmed.classList.add('open'));
    document.body.style.overflow = 'hidden';
    confetti();
  }

  document.getElementById('confirmed-close')?.addEventListener('click', () => {
    const confirmed = document.getElementById('confirmed-shade');
    confirmed.classList.remove('open');
    setTimeout(() => { confirmed.hidden = true; document.body.style.overflow = ''; resetBooking(); }, 280);
  });

  function resetBooking() {
    booking = { exp: null, expLabel: null, date: null, time: null, people: 1, name: '', email: '', phone: '', notes: '', total: 0 };
    expCards.forEach(c => c.classList.remove('selected'));
    ['book-date','book-time','book-people','book-name','book-email','book-phone','book-notes',
     'book-card','book-cardexp','book-cardcvc','book-cardzip'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = id === 'book-people' ? '1' : '';
    });
    setStep(1);
  }

  // Card-number formatter: groups of 4
  document.getElementById('book-card')?.addEventListener('input', e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
    e.target.value = digits.replace(/(\d{4})/g, '$1 ').trim();
  });
  document.getElementById('book-cardexp')?.addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d;
  });

  function shake(el) {
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'shake 320ms ease';
    setTimeout(() => el.style.animation = '', 360);
  }
  // inject shake + confetti keyframes once (no user input ever flows here)
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-6px);} 40%{transform:translateX(6px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(4px);} }
    @keyframes scc-fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
  `;
  document.head.appendChild(styleEl);

  // ---- CONFETTI -------------------------------------------------
  function confetti() {
    const colors = ['#FF6B1A', '#D4E84A', '#E13159', '#5BA8E8', '#F5F0E5'];
    const count = 80;
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' });
    document.body.appendChild(wrap);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const c = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 6;
      Object.assign(p.style, {
        position: 'absolute',
        left: Math.random() * 100 + '%',
        top: '-20px',
        width: size + 'px',
        height: size + 'px',
        background: c,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `scc-fall ${1.6 + Math.random() * 1.4}s cubic-bezier(.3,.5,.5,1) forwards`,
        animationDelay: (Math.random() * 0.4) + 's',
      });
      wrap.appendChild(p);
    }
    setTimeout(() => wrap.remove(), 3500);
  }

  // ---- NEWSLETTER -----------------------------------------------
  const newsForm = document.getElementById('news-form');
  const newsMsg = document.getElementById('news-msg');
  newsForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('news-email').value.trim();
    if (!email.includes('@')) { newsMsg.textContent = 'Need a real email, partner.'; return; }
    newsMsg.textContent = 'Subscribed. Welcome to the chalk dust.';
    newsForm.reset();
    confetti();
  });

  // ---- KONAMI ---------------------------------------------------
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konIdx = 0;
  document.addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KONAMI[konIdx]) {
      konIdx++;
      if (konIdx === KONAMI.length) {
        const knode = document.getElementById('konami');
        knode.hidden = false;
        confetti();
        setTimeout(() => knode.hidden = true, 6000);
        konIdx = 0;
      }
    } else {
      konIdx = (k === KONAMI[0]) ? 1 : 0;
    }
  });

  // ---- SET YEAR -------------------------------------------------
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- HEADLINE PARALLAX ON SCROLL -----------------------------
  const headline = document.querySelector('.hero-headline h1');
  if (headline) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < 800) {
        headline.style.transform = `translateY(${y * 0.15}px)`;
        headline.style.opacity = String(Math.max(0, 1 - y / 600));
      }
    }, { passive: true });
  }

})();
