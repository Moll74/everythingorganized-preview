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
    let ticking = false;
    const onScroll = () => { if (ticking) return; ticking = true;
      requestAnimationFrame(() => { ticking = false; const r = pinEl.getBoundingClientRect(); draw(clamp(-r.top / (r.height - innerHeight))); }); };
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
    const F = $$('.fr', el).map(f => ({ el: f, ax: +f.dataset.ax, ay: +f.dataset.ay, w: +f.dataset.w }));
    const intro = el.dataset.intro === '1';
    const IW = +el.dataset.w, IH = +el.dataset.h, [sx, sy, sz] = el.dataset.sort.split(',').map(Number);
    let SW = 0, SH = 0, cover = 1, SEG = [];
    const natural = (i, push = 1) => { const k = cover * push; return { i, k, x: (SW - IW * k) / 2, y: (SH - IH * k) / 2 }; };
    const focus = (i, px, py, z) => { const k = cover * z; return { i, k, x: SW * .62 - px * k, y: SH * .62 - py * k }; };
    const toFrame = (c, j) => { if (c.i === j) return c; const a = F[c.i], b = F[j], k = c.k * a.w / b.w;
      return { i: j, k, x: a.ax * c.k + c.x - b.ax * k, y: a.ay * c.k + c.y - b.ay * k }; };
    const fit = c => { const k = Math.max(c.k, cover), x = Math.min(0, Math.max(SW - IW * k, c.x + (IW * (c.k - k)) / 2)), y = Math.min(0, Math.max(SH - IH * k, c.y + (IH * (c.k - k)) / 2)); return { ...c, k, x, y }; };
    const mix = (a, b, t) => ({ i: b.i, k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t), x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const plan = () => {
      const r = el.getBoundingClientRect(); SW = r.width; SH = r.height; cover = Math.max(SW / IW, SH / IH);
      const n = i => natural(i), np = i => natural(i, 1.06), F_ = focus(2, sx, sy, sz), F2 = focus(2, sx, sy, sz * 1.04);
      SEG = intro ? [
        [0, .06, n(3), np(3)], [.06, .16, np(3), n(0), 1], [.16, .2, n(0), np(0)], [.2, .34, np(0), n(1), 1], [.34, .39, n(1), np(1)],
        [.39, .53, np(1), n(2), 1], [.53, .56, n(2), np(2)], [.56, .68, np(2), F_], [.68, .73, F_, F2], [.73, .9, F2, n(3), 1], [.9, 1.01, n(3), np(3)]]
      : [                                                            // [from p, to p, camera A, camera B, crossfade?]
        [0, .06, n(0), np(0)], [.06, .24, np(0), n(1), 1], [.24, .3, n(1), np(1)],
        [.3, .48, np(1), n(2), 1], [.48, .52, n(2), np(2)], [.52, .66, np(2), F_], [.66, .72, F_, F2],
        [.72, .92, F2, n(3), 1], [.92, 1.01, n(3), np(3)]];
    };
    const place = (f, c, o) => { const q = fit(c); f.el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,0) scale(${q.k.toFixed(4)})`; f.el.style.opacity = o; };
    const draw = p => {
      if (!SW) plan();
      const s = SEG.find(g => p < g[1]) || SEG[SEG.length - 1], t = ease(clamp((p - s[0]) / (s[1] - s[0])));
      const A = s[2], B = s[3], cam = mix(toFrame(A, B.i), B, t);
      F.forEach((f, j) => { if (j === B.i) place(f, cam, s[4] ? t : 1); else if (s[4] && j === A.i) place(f, toFrame(cam, j), 1); else f.el.style.opacity = 0; });
      F[B.i].el.style.zIndex = 2; if (s[4]) F[A.i].el.style.zIndex = 1;
      el.dataset.sorting = intro ? +(p >= .54 && p < .73) : +(p >= .5 && p < .72);
      onP(p, intro);
    };
    draw.resize = plan;
    F.forEach(f => f.el.addEventListener('load', () => { SW = 0; }, { once: true }));
    return draw;
  };
  /* which of the four steps a progress value belongs to (-1 = the opening "result" shot, -0.5 = the mess before step 1) */
  const stepOf = (p, intro) => intro ? (p < .11 ? -1 : p < .2 ? -.5 : p < .37 ? 0 : p < .54 ? 1 : p < .72 ? 2 : 3) : (p < .27 ? 0 : p < .5 ? 1 : p < .71 ? 2 : 3);

  if (sec && photo) pinned(photoScene(photo, (p, intro) => setStep(Math.max(0, stepOf(p, intro)))));

  const hpin = $('#hpin'), hph = $('#heroPhoto');
  if (hpin && hph) {
    const labels = JSON.parse(hph.dataset.labels), chipH = $('.hv-chip', hph), bar = $('.hv-bar i', hph), hint = $('.hhint');
    let label = '';
    const draw = photoScene(hph, (p, intro) => {
      const st = stepOf(p, intro), l = st === -1 ? labels[0] : st === -.5 ? labels[1] : labels[2 + st];
      if (l !== label) { label = l; chipH.textContent = l; chipH.classList.remove('pop'); void chipH.offsetWidth; chipH.classList.add('pop'); chipH.classList.toggle('after', st === -1 || st === 3); }
      bar.style.transform = `scaleX(${p.toFixed(3)})`;
      if (hint) hint.style.opacity = p > .04 ? 0 : 1;
    });
    bindPin(hpin, draw, () => hpin.classList.add('static'));
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
  $$('.vcard').forEach(c => {
    const v = $('video', c), b = $('.vplay', c);
    b.addEventListener('click', () => { vids.forEach(o => { if (o !== v) o.pause(); }); v.controls = true; c.classList.add('playing'); v.play().catch(() => {}); });
    v.addEventListener('pause', () => c.classList.toggle('playing', !v.ended && v.currentTime > 0 && !v.paused));
    v.addEventListener('ended', () => { c.classList.remove('playing'); v.controls = false; });
  });

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
