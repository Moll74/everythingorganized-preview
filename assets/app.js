/* Organizer pack: menu, theme, the pinned method scene, contact form, assistant.
 * The method scene is CSS 3D (no WebGL, no library): a cabinet whose contents follow the four steps as you scroll.
 * Empty: everything comes out onto the floor. Categorise: like things group together. Sort: some leave for reuse,
 * sale or the tip. Organise: the rest goes back, one category per shelf. Reduced motion shows the end state and the four steps as a list. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* the sticky top (ribbon + header) height, so pinned scenes sit exactly below it and never shift */
  const tw = $('#topwrap'), setHH = () => document.documentElement.style.setProperty('--hh', (tw ? tw.offsetHeight : 64) + 'px');
  setHH(); addEventListener('resize', setHH);

  /* menu + theme */
  const burger = $('.burger'), nav = $('#nav');
  burger?.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); } });
  $('.theme-t')?.addEventListener('click', () => {
    const root = document.documentElement, cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('eo-theme', root.dataset.theme); } catch (e) {}
  });

  /* ---------- scroll scenes ---------- */
  const sec = $('.method:not(.method-cards)'), pin = $('#pin'), scene = $('#scene'), cab = $('#cab'), photo = $('#photo');
  const clamp = v => Math.max(0, Math.min(1, v)), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const steps = sec ? $$('.st', sec) : [], dots = sec ? $$('.dot', sec) : [];
  let lastStep = -1;
  const setStep = step => { if (!sec || step === lastStep) return; lastStep = step; sec.dataset.step = step;
    dots.forEach((d, i) => d.classList.toggle('on', i === step)); steps.forEach((s, i) => s.classList.toggle('on', i === step)); };
  /* progress 0..1 of a tall pinned block -> draw(p); reduced motion: the end state, no pin */
  const bindPin = (pinEl, draw, onStatic) => {
    /* the picture glides after the scroll position (eases ~10% of the way per frame) instead of jumping with every flick */
    let cur = -1, target = 0, running = false;
    const frame = () => {
      const d = target - cur; cur = Math.abs(d) < .0004 ? target : cur + d * .1; draw(cur);
      running = cur !== target; if (running) requestAnimationFrame(frame);
    };
    const onScroll = () => { const r = pinEl.getBoundingClientRect(); target = clamp(-r.top / (r.height - innerHeight));
      if (cur < 0) { cur = target; draw(cur); return; } if (!running) { running = true; requestAnimationFrame(frame); } };
    const setup = () => {
      if (reduce.matches) { onStatic?.(); draw(1); removeEventListener('scroll', onScroll); return; }
      pinEl.classList.remove('static'); onScroll(); addEventListener('scroll', onScroll, { passive: true });
    };
    addEventListener('resize', () => { draw.resize?.(); onScroll(); });
    reduce.addEventListener?.('change', setup);
    setup();
  };
  const pinned = draw => bindPin(pin, draw, () => { sec.classList.add('static'); steps.forEach(s => s.classList.add('on')); });

  /* photo scene: camera = {k, x, y}: image pixel p shows at screen p*k + (x, y). Every frame has an anchor (a subject point)
     and the subject width w, so one camera can be expressed in any frame's pixels: the subject stays put while frames crossfade.
     intro = open on the finished state (frame 3), then mess -> emptied -> sorted -> finished. */
  const photoScene = (el, onP) => {
    const F = $$('.fr:not(.ap)', el).map(f => ({ el: f, ax: +f.dataset.ax, ay: +f.dataset.ay, w: +f.dataset.w }));
    const apEl = $('.fr.ap', el), AP = apEl && { el: apEl, ax: +apEl.dataset.ax, ay: +apEl.dataset.ay, w: +apEl.dataset.w, iw: +apEl.dataset.iw, ih: +apEl.dataset.ih };
    const A0 = AP ? .2 : 0;                                          // share of the scroll used to move into the room
    const intro = el.dataset.intro === '1';
    const IW = +el.dataset.w, IH = +el.dataset.h, [sx, sy, sz] = el.dataset.sort.split(',').map(Number);
    let SW = 0, SH = 0, cover = 1, SEG = [], CAM = null;
    const shift = +(el.dataset.shift || 0), whole = el.dataset.fit === 'whole';
    const [, VY, , VH] = el.dataset.view ? el.dataset.view.split(',').map(Number) : [0, 0, 0, +el.dataset.h];   // the close framing inside a bigger photo
    /* whole = show the entire subject (a full-screen hero): wide screens fit the photo's height and put the subject right of
       centre; narrow screens fit the subject's width at the top. A blurred copy fills the rest (CSS .hv-bg). */
    const natural = (i, push = 1) => {
      if (whole && !(SW / SH > 1.15) && el.querySelector('.fr.ap')) {   // phone hero: the room photo covers the stage, centred on the subject
        const k = Math.max(SW / IW, SH / IH) * 1.06 * push; return { i, k, x: SW / 2 - F[i].ax * k, y: (SH - IH * k) / 2 }; }
      if (whole) { const wide = SW / SH > 1.15, k = (wide ? SH / VH : Math.min(SH / VH, SW / (F[i].w * 1.62))) * push;
        return { i, k, x: wide ? SW * (.5 + shift) - F[i].ax * k : SW / 2 - F[i].ax * k, y: (wide ? (SH - VH * k) / 2 : Math.max(0, (SH * .52 - VH * k) / 2)) - VY * k }; }
      const k = cover * push; return { i, k, x: (SW - IW * k) / 2, y: (SH - IH * k) / 2 }; };
    const focus = (i, px, py, z) => { const k = cover * z; return whole ? { i, k, x: SW * (SW / SH > 1.15 ? .7 : .55) - px * k, y: SH * (SW / SH > 1.15 ? .6 : .3) - py * k } : { i, k, x: SW * .62 - px * k, y: SH * .62 - py * k }; };
    const toFrame = (c, j) => { if (c.i === j) return c; const a = F[c.i], b = F[j], k = c.k * a.w / b.w;
      return { i: j, k, x: a.ax * c.k + c.x - b.ax * k, y: a.ay * c.k + c.y - b.ay * k }; };
    const fit = c => { if (whole) return c; const k = Math.max(c.k, cover), x = Math.min(0, Math.max(SW - IW * k, c.x + (IW * (c.k - k)) / 2)), y = Math.min(0, Math.max(SH - IH * k, c.y + (IH * (c.k - k)) / 2)); return { ...c, k, x, y }; };
    const mix = (a, b, t) => ({ i: b.i, k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t), x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    /* one fixed camera for the whole scene: the subject never moves or zooms, only what is in it changes.
       It is the finished frame's framing, zoomed just enough that every other frame (scaled to the same subject size)
       still covers the stage; each frame is then shown through that same camera. */
    const plan = () => {
      const r = el.getBoundingClientRect(); SW = r.width; SH = r.height; cover = Math.max(SW / IW, SH / IH);
      const R = F.length - 1, n0 = natural(R);
      let k = n0.k;
      if (!whole) k = Math.max(k, ...F.map(f => cover * f.w / F[R].w));
      const C = { i: R, k, x: F[R].ax * n0.k + n0.x - F[R].ax * k, y: F[R].ay * n0.k + n0.y - F[R].ay * k };
      CAM = C;
      const c = i => toFrame(C, i), hold = (a, b, i) => [a, b, c(i), c(i)], fade = (a, b, i, j) => [a, b, c(i), c(j), 1];
      /* long, even crossfades (about a screen of scrolling each), short rests on each picture */
      SEG = intro
        ? [hold(0, .04, 3), fade(.04, .2, 3, 0), hold(.2, .24, 0), fade(.24, .41, 0, 1), hold(.41, .45, 1),
           fade(.45, .61, 1, 2), hold(.61, .74, 2), fade(.74, .93, 2, 3), hold(.93, 1.01, 3)]
        : [hold(0, .05, 0), fade(.05, .27, 0, 1), hold(.27, .31, 1), fade(.31, .52, 1, 2), hold(.52, .68, 2),
           fade(.68, .92, 2, 3), hold(.92, 1.01, 3)];
    };
    const place = (f, c, o) => { const q = fit(c); f.el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0) scale(${q.k.toFixed(4)})`; f.el.style.opacity = o; };
    /* the approach: from the wide room shot (covering the stage, subject a bit right of centre on wide screens) to the camera
       where its subject matches the locked close-up exactly, then a crossfade into that close-up */
    const apDraw = p => {
      const R = F.length - 1, kA = CAM.k * F[R].w / AP.w;
      const end = { k: kA, x: F[R].ax * CAM.k + CAM.x - AP.ax * kA, y: F[R].ay * CAM.k + CAM.y - AP.ay * kA };
      /* walking towards it: start with the whole room covering the stage, end at the locked close view. Zoom is
         exponential (constant speed through the room) and the subject's screen point follows the same eased curve. */
      const fx = AP.ax * end.k + end.x, fy = AP.ay * end.k + end.y;
      const kS = Math.max(SW / AP.iw, SH / AP.ih) * 1.001, xS = (SW - AP.iw * kS) / 2, yS = (SH - AP.ih * kS) / 2;
      const sx0 = xS + AP.ax * kS, sy0 = yS + AP.ay * kS;
      const u = clamp((p - .02) / (.86 - .02)), t = (1 - Math.cos(Math.PI * u)) / 2, fadeT = clamp((p - .86) / .14);
      const k = Math.exp(Math.log(kS) + (Math.log(end.k) - Math.log(kS)) * t);
      const cx = (v, room) => Math.min(0, Math.max(room, v));                  // never show an edge of the room photo
      const x = cx(sx0 + (fx - sx0) * t - AP.ax * k, SW - AP.iw * k), y = cx(sy0 + (fy - sy0) * t - AP.ay * k, SH - AP.ih * k);
      AP.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${k.toFixed(4)})`;
      AP.el.style.opacity = 1; AP.el.style.zIndex = 2;
      F.forEach((f, j) => { if (j === R) { const q = fit(CAM); f.el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0) scale(${q.k.toFixed(4)})`;
        f.el.style.opacity = fadeT * fadeT * (3 - 2 * fadeT); f.el.style.zIndex = 3; } else f.el.style.opacity = 0; });
    };
    const draw = p => {
      if (!SW) plan();
      if (AP) { if (p < A0) { apDraw(p / A0); el.dataset.sorting = 0; onP(-1, intro); return; } AP.el.style.opacity = 0; p = (p - A0) / (1 - A0); }
      const s = SEG.find(g => p < g[1]) || SEG[SEG.length - 1], u = clamp((p - s[0]) / (s[1] - s[0])), t = u * u * (3 - 2 * u);
      const A = s[2], B = s[3], cam = mix(toFrame(A, B.i), B, t);
      F.forEach((f, j) => { if (j === B.i) place(f, cam, s[4] ? t : 1); else if (s[4] && j === A.i) place(f, toFrame(cam, j), 1); else f.el.style.opacity = 0; });
      F[B.i].el.style.zIndex = 2; if (s[4]) F[A.i].el.style.zIndex = 1;
      el.dataset.sorting = intro ? +(p >= .59 && p < .76) : +(p >= .5 && p < .71);
      onP(p, intro);
    };
    draw.resize = plan;
    F.forEach(f => f.el.addEventListener('load', () => { SW = 0; }, { once: true }));
    return draw;
  };
  /* which of the four steps a progress value belongs to (-1 = the opening "result" shot, -0.5 = the mess before step 1) */
  const stepOf = (p, intro) => intro ? (p < .12 ? -1 : p < .23 ? -.5 : p < .44 ? 0 : p < .6 ? 1 : p < .75 ? 2 : 3) : (p < .29 ? 0 : p < .51 ? 1 : p < .69 ? 2 : 3);

  if (sec && photo) pinned(photoScene(photo, (p, intro) => setStep(Math.max(0, stepOf(p, intro)))));

  const hpin = $('#hpin'), hph = $('#heroPhoto');
  if (hpin && hph) {
    const labels = JSON.parse(hph.dataset.labels), chipH = $('.hv-chip', hph), bar = $('.hv-bar i', hph), hint = $('.hhint');
    let label = '';
    const draw = photoScene(hph, (p, intro) => {
      const st = p < 0 ? -1 : stepOf(p, intro), l = st === -1 ? labels[0] : st === -.5 ? labels[1] : labels[2 + st];
      if (l !== label) { label = l; chipH.textContent = l; chipH.classList.remove('pop'); void chipH.offsetWidth; chipH.classList.add('pop'); chipH.classList.toggle('after', st === -1 || st === 3); }
      bar.style.transform = `scaleX(${Math.max(0, p).toFixed(3)})`;
      if (hint) hint.style.opacity = p > .04 ? 0 : 1;
    });
    bindPin(hpin, draw, () => hpin.classList.add('static'));
    /* invite to scroll: the picture breathes very slightly and an arrow bounces until the visitor starts scrolling */
    const idle = () => { if (scrollY < 8) hpin.classList.add('idle'); };
    setTimeout(idle, 900);
    addEventListener('scroll', () => { if (scrollY > 8) hpin.classList.remove('idle'); else idle(); }, { passive: true });
  }
  if (sec && scene && !photo) {
    const CX = 160, CW = 240, CH = 310, D = 80, ROW = CH / 4, FLOOR = CH;
    const panel = (css) => { const p = document.createElement('div'); p.className = 'pnl'; p.style.cssText = css; cab.appendChild(p); };
    panel(`left:0;top:0;width:${CW}px;height:${CH}px;transform:translateZ(-${D}px)`);
    panel(`left:0;top:0;width:${D}px;height:${CH}px;transform-origin:left;transform:rotateY(90deg)`);
    panel(`left:${CW}px;top:0;width:${D}px;height:${CH}px;transform-origin:left;transform:rotateY(90deg)`);
    for (let k = 0; k <= 4; k++) panel(`left:0;top:${k * ROW}px;width:${CW}px;height:${D}px;transform-origin:top;transform:rotateX(-90deg);background:var(--shelf)`);

    /* 4 categories x 4 things; "out" = which exit it leaves by in the Sort step (-1 stays) */
    const kinds = [
      { cls: 'book', w: [15, 18, 14, 17], h: [62, 56, 60, 52], d: 44, c: ['var(--i4)', '#7c93a6', '#a5b6c4', '#6f8597'], out: [-1, -1, 0, -1] },
      { cls: 'jar', w: [30, 26, 30, 28], h: [40, 46, 36, 42], d: 28, c: ['var(--i1)', '#97aa8d', '#bccab4', '#a3b499'], out: [-1, 1, -1, -1] },
      { cls: 'box', w: [56, 48, 52, 60], h: [40, 34, 44, 38], d: 50, c: ['var(--i2)', '#cdb28f', '#e3d1b8', '#c7aa86'], out: [-1, -1, -1, 2] },
      { cls: 'tex', w: [64, 60, 62, 58], h: [14, 16, 13, 15], d: 46, c: ['var(--i3)', '#dca5b6', '#efcad6', '#d395a8'], out: [0, -1, -1, -1] },
    ];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const items = [];
    kinds.forEach((k, ci) => k.w.forEach((w, j) => {
      const el = document.createElement('div'); el.className = 'it ' + k.cls;
      const h = k.h[j]; el.style.cssText = `width:${w}px;height:${h}px;--c:${k.c[j]};--d:${k.d}px`;
      el.innerHTML = '<i class="s"></i><i class="t"></i><i class="f"></i>';
      scene.appendChild(el); items.push({ el, w, h, ci, j, out: k.out[j] });
    }));
    const exitX = [80, 250, 410];
    /* key states: [x, y, z, rotZ, opacity] */
    items.forEach((it, n) => {
      const { w, h, ci, j } = it;
      const row = Math.floor(rnd() * 4), x0 = CX + 6 + rnd() * (CW - w - 12);
      it.K = [];
      it.K[0] = [x0, (row + 1) * ROW - h, -D / 2 + rnd() * 20, (rnd() - .5) * (ci === 0 ? 50 : 24), 1];                // messy, inside
      it.K[1] = [20 + rnd() * (520 - w), FLOOR - h, 40 + rnd() * 170, (rnd() - .5) * 40, 1];                            // out on the floor
      const gx = [40, 175, 310, 445][ci];                                                                                // grouped by kind
      it.K[2] = ci === 3 ? [gx, FLOOR - h * (j + 1) - j * 2, 130, 0, 1] : [gx + j * (w + 4) * (ci === 0 ? 1 : .55), FLOOR - h, 130 + (ci ? (j % 2) * 34 : 0), 0, 1];
      it.K[3] = it.out >= 0 ? [exitX[it.out] + (n % 2) * 26, FLOOR - 10 - h, 255, 0, 1] : it.K[2];                      // sorted out
      const keep = items.filter(o => o.ci === ci && o.out < 0);                                                           // organised, one shelf per kind
      const idx = items.filter(o => o.ci === ci && o.out < 0).indexOf(it);
      if (it.out >= 0) it.K[4] = [exitX[it.out], FLOOR - h, 320, 0, 0];
      else if (ci === 3) it.K[4] = [CX + 40, (ci + 1) * ROW - h * (idx + 1) - idx, -D / 2 + 6, 0, 1];
      else { const wsum = keep.reduce((a, o) => a + o.w + 8, 0); it.K[4] = [CX + (CW - wsum) / 2 + keep.slice(0, idx).reduce((a, o) => a + o.w + 8, 0), (ci + 1) * ROW - h, -D / 2 + 6, 0, 1]; }
      it.order = rnd();
    });

    const T = [[.05, .26], [.31, .5], [.55, .7], [.76, .95]];               // scroll windows for the four moves
    const draw = p => {
      items.forEach(it => {
        let k = 0, t = 0;
        for (let s = 0; s < 4; s++) { const [a, b] = T[s], st = a + it.order * (b - a) * .35, en = st + (b - a) * .65; if (p >= st) { k = s; t = clamp((p - st) / (en - st)); } }
        if (p < T[0][0]) { k = 0; t = 0; }
        const A = it.K[k], B = it.K[k + 1], e = ease(t), lift = Math.sin(Math.PI * e) * (k === 1 ? 30 : 60);
        const v = A.map((a, i) => a + (B[i] - a) * e);
        it.el.style.transform = `translate3d(${v[0]}px,${v[1] - lift}px,${v[2]}px) rotateZ(${v[3]}deg)`;
        it.el.style.opacity = v[4];
      });
      scene.style.setProperty('--ry', (-20 + p * 16) + 'deg');
      setStep(T.reduce((n, w, i) => p >= w[0] - .02 ? i : n, 0));
    };
    const fit = () => {
      const st = $('.stage', sec).getBoundingClientRect();
      scene.style.setProperty('--sc', Math.min(1.25, st.width / 560, st.height / 540).toFixed(3));
    };
    draw.resize = fit; fit();
    pinned(draw);
  }

  /* ---------- video cards: poster + play button; one plays at a time, muted until the viewer turns sound on ---------- */
  const vids = $$('.vcard video');
  $$('.vcard:not(.vslot)').forEach(c => {
    const v = $('video', c), b = $('.vplay', c);
    b.addEventListener('click', () => { vids.forEach(o => { if (o !== v) o.pause(); }); v.controls = true; c.classList.add('playing'); v.play().catch(() => {}); });
    v.addEventListener('pause', () => c.classList.toggle('playing', !v.ended && v.currentTime > 0 && !v.paused));
    v.addEventListener('ended', () => { c.classList.remove('playing'); v.controls = false; });
  });

  /* ---------- cookie consent: stored for 12 months; optional categories stay off until accepted.
     Future optional scripts read window.eoConsent or listen for the 'eo-consent' event before they load. ---------- */
  const cc = $('#cc');
  if (cc) {
    const KEY = 'eo-consent', YEAR = 365 * 864e5, set = $('.cc-set', cc), save = $('.cc-save', cc);
    const read = () => { try { const c = JSON.parse(localStorage.getItem(KEY)); return c && Date.now() - c.ts < YEAR ? c : null; } catch (e) { return null; } };
    const apply = c => { window.eoConsent = c; document.dispatchEvent(new CustomEvent('eo-consent', { detail: c })); };
    const store = c => { c = { v: 1, stats: !!c.stats, marketing: !!c.marketing, ts: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} apply(c); cc.hidden = true; };
    const open = withSettings => { const c = read() || {}; $$('input', set).forEach(i => { i.checked = !!c[i.name]; });
      set.hidden = !withSettings; save.hidden = !withSettings; cc.hidden = false; $('button', cc).focus(); };
    cc.addEventListener('click', e => { const a = e.target.closest('[data-cc]')?.dataset.cc; if (!a) return;
      if (a === 'reject') store({}); else if (a === 'accept') store({ stats: true, marketing: true });
      else if (a === 'settings') { set.hidden = false; save.hidden = false; }
      else if (a === 'save') store(Object.fromEntries($$('input', set).map(i => [i.name, i.checked]))); });
    $$('[data-consent-open]').forEach(b => b.addEventListener('click', () => open(true)));
    const c = read(); if (c) apply(c); else setTimeout(() => { cc.hidden = false; }, 600);
  }

  /* ---------- contact form: opens the visitor's mail app (mockup; production posts to SpiderPublish forms) ---------- */
  const f = $('#cform');
  f?.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(f), lines = [['', d.get('msg')], ['Type', d.get('type')], ['Rum/opgave', d.get('room')], ['Navn', d.get('name')], ['E-mail', d.get('email')], ['Telefon', d.get('phone')]];
    const body = lines.filter(([, v]) => v).map(([k, v]) => (k ? k + ': ' : '') + v).join('\n');
    location.href = `mailto:${f.dataset.to}?subject=${encodeURIComponent(f.dataset.subject + (d.get('room') ? ': ' + d.get('room') : ''))}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- assistant: answers from window.KB (built from site.json); below the threshold it hands over ---------- */
  const btn = $('#hostBtn'), box = $('#host');
  if (!box) return;
  const log = $('#hostLog'), form = $('#hostForm'), input = $('#hostIn');
  const open = () => { box.hidden = false; btn?.classList.add('away'); btn?.setAttribute('aria-expanded', 'true'); setTimeout(() => input.focus(), 50); };
  const close = () => { try { speechSynthesis.cancel(); } catch (e) {} box.hidden = true; btn?.classList.remove('away'); btn?.setAttribute('aria-expanded', 'false'); };
  btn?.addEventListener('click', open);
  $$('[data-open-host]').forEach(b => b.addEventListener('click', open));
  $('.host-x', box).addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  const fold = s => s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const STOP = new Set('hvad hvor hvordan hvilke hvilken hvornaar kan jeg du det den en et og i paa for med til af om har er som at fra man mig dig der skal vil the a an is are do does i you it to of for in on and what how much can my your'.split(' '));
  const toks = s => fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w));
  const stem = w => w.replace(/(erne|ene|er|en|et|e|s)$/, '');
  const answer = q => {
    const K = window.KB || { items: [] }, qt = toks(q).map(stem);
    let best = null, bs = 0;
    K.items.forEach(it => {
      const a = new Set(toks(it.q).map(stem)), b = new Set(toks(it.a).map(stem));
      const s = qt.reduce((n, w) => n + (a.has(w) ? 2 : b.has(w) ? .6 : 0), 0) / Math.max(1, qt.length);
      if (s > bs) { bs = s; best = it; }
    });
    return bs >= .55 ? best.a : K.fallback;
  };
  const say = (t, who) => { const p = document.createElement('p'); p.className = 'msg ' + who; p.textContent = t; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; };

  /* voice: the browser's own speech recognition (Chrome, Edge, Safari) in, speechSynthesis out, in the page language.
     Nothing is recorded or sent anywhere by this page. Production: same flow, answers from an LLM grounded on the same KB. */
  const LANG = box.dataset.lang, spkBtn = $('.host-spk', box), micBtn = $('.host-mic', box);
  let speakOn = true; try { speakOn = localStorage.getItem('eo-speak') !== '0'; } catch (e) {}
  const syncSpk = () => spkBtn.setAttribute('aria-pressed', speakOn);
  syncSpk();
  spkBtn.addEventListener('click', () => { speakOn = !speakOn; syncSpk(); if (!speakOn) speechSynthesis?.cancel(); try { localStorage.setItem('eo-speak', speakOn ? '1' : '0'); } catch (e) {} });
  const pickVoice = () => { const vs = window.speechSynthesis?.getVoices() || [], l = LANG.slice(0, 2);
    return vs.find(v => v.lang === LANG && /sara|natural|premium|enhanced/i.test(v.name)) || vs.find(v => v.lang === LANG) || vs.find(v => v.lang.startsWith(l)); };
  const speak = t => { if (!speakOn || !window.speechSynthesis) return; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = LANG; const v = pickVoice(); if (v) u.voice = v; u.rate = 1.02; speechSynthesis.speak(u); };
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});
  const ask = (q, voice) => { if (!q.trim()) return; say(q, 'me'); setTimeout(() => { const a = answer(q); say(a, 'bot'); if (voice || speakOn) speak(a); }, 250); };
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });
  $$('.chip', box).forEach(c => c.addEventListener('click', () => ask(c.textContent)));

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  const stopListen = () => { listening = false; box.classList.remove('listening'); input.placeholder = input.dataset.ph || input.placeholder; };
  const listen = () => {
    if (!SR) { say(box.dataset.noMic, 'bot'); return; }
    if (listening) { rec?.stop(); return; }
    speechSynthesis?.cancel();
    rec = new SR(); rec.lang = LANG; rec.interimResults = true; rec.maxAlternatives = 1;
    input.dataset.ph = input.dataset.ph || input.placeholder; input.placeholder = box.dataset.micOn; input.value = '';
    listening = true; box.classList.add('listening');
    rec.onresult = e => { const r = e.results[e.results.length - 1]; input.value = r[0].transcript; if (r.isFinal) { const q = input.value; input.value = ''; ask(q, true); } };
    rec.onerror = e => { stopListen(); if (e.error === 'not-allowed' || e.error === 'service-not-allowed') say(box.dataset.noMic, 'bot'); };
    rec.onend = stopListen;
    try { rec.start(); } catch (e) { stopListen(); }
  };
  micBtn.addEventListener('click', listen);
  $$('[data-voice]').forEach(b => b.addEventListener('click', () => setTimeout(listen, 200)));
})();
