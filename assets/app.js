/* Organizer pack: menu, theme, the pinned method scene, contact form, assistant.
 * The method scene is CSS 3D (no WebGL, no library): a cabinet whose contents follow the four steps as you scroll.
 * Empty: everything comes out onto the floor. Categorise: like things group together. Sort: some leave for reuse,
 * sale or the tip. Organise: the rest goes back, one category per shelf. Reduced motion shows the end state and the four steps as a list. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* menu + theme */
  const burger = $('.burger'), nav = $('#nav');
  burger?.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  nav?.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); } });
  $('.theme-t')?.addEventListener('click', () => {
    const root = document.documentElement, cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('eo-theme', root.dataset.theme); } catch (e) {}
  });

  /* ---------- method scene ---------- */
  const sec = $('.method'), pin = $('#pin'), scene = $('#scene'), cab = $('#cab');
  if (sec && scene) {
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
    const clamp = v => Math.max(0, Math.min(1, v)), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const dots = $$('.dot', sec), steps = $$('.st', sec);
    let lastStep = -1;
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
      const step = T.reduce((n, w, i) => p >= w[0] - .02 ? i : n, 0);
      if (step !== lastStep) {
        lastStep = step; sec.dataset.step = step;
        dots.forEach((d, i) => d.classList.toggle('on', i === step));
        steps.forEach((s, i) => s.classList.toggle('on', i === step));
      }
    };
    const fit = () => {
      const st = $('.stage', sec).getBoundingClientRect();
      scene.style.setProperty('--sc', Math.min(1.25, st.width / 560, st.height / 540).toFixed(3));
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = pin.getBoundingClientRect(), total = r.height - innerHeight;
        draw(clamp(-r.top / total));
      });
    };
    const setup = () => {
      if (reduce.matches) { sec.classList.add('static'); fit(); draw(1); steps.forEach(s => s.classList.add('on')); removeEventListener('scroll', onScroll); return; }
      sec.classList.remove('static'); fit(); onScroll(); addEventListener('scroll', onScroll, { passive: true });
    };
    addEventListener('resize', () => { fit(); onScroll(); });
    reduce.addEventListener?.('change', setup);
    setup();
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
  const close = () => { box.hidden = true; btn?.classList.remove('away'); btn?.setAttribute('aria-expanded', 'false'); };
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
  const say = (t, who) => { const p = document.createElement('p'); p.className = 'msg ' + who; p.textContent = t; log.appendChild(p); log.scrollTop = log.scrollHeight; };
  const ask = q => { if (!q.trim()) return; say(q, 'me'); setTimeout(() => say(answer(q), 'bot'), 250); };
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });
  $$('.chip', box).forEach(c => c.addEventListener('click', () => ask(c.textContent)));
})();
