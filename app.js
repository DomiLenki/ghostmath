/* Ghost Math – Spiel-Logik */
(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const app = $('#app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));
  const mkStore = (kind) => ({
    get(k) { try { const v = window[kind].getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { window[kind].setItem(k, JSON.stringify(v)); } catch (e) { /* egal */ } },
    del(k) { try { window[kind].removeItem(k); } catch (e) { /* egal */ } },
  });
  const sess = mkStore('sessionStorage');
  const keep = mkStore('localStorage');
  const { rot, rotPoly, norm, fmt } = window.GMQ;

  /* ================================================================== */
  /*  Avatare                                                            */
  /* ================================================================== */
  const CHARS = ['🎃', '👻', '🧙', '🧛', '💀', '🧟', '🦇', '🕷️', '🐈‍⬛', '🧌', '👽', '🤖', '🦉', '🐺', '🧞', '🦄'];
  const COLORS = ['#ff7a1a', '#8a4dff', '#18b26b', '#e8344f', '#39c6ff', '#ffd23f', '#ff5fc8', '#5b6478'];
  const ACCS = [{ e: '', p: '' }, { e: '🎩', p: 'top' }, { e: '👑', p: 'top' }, { e: '🎀', p: 'top' }, { e: '🕶️', p: 'mid' }, { e: '🍭', p: 'neck' }, { e: '🕯️', p: 'neck' }, { e: '🍬', p: 'neck' }];
  const NAMES = ['Kürbiskopf', 'Spuki', 'Nebelgeist', 'Grusel', 'Mitternacht', 'Knochi', 'Flatterfee', 'Hexenbesen', 'Schattenfuchs', 'Mondlicht', 'Gruftie', 'Zauberkessel'];
  const ri = (n) => Math.floor(Math.random() * n);
  const randAvatar = () => ({ c: ri(CHARS.length), k: ri(COLORS.length), a: ri(ACCS.length) });
  function avatarHTML(av, size = '') {
    av = av || {};
    const ch = CHARS[av.c] || CHARS[0];
    const col = COLORS[av.k] || COLORS[0];
    const acc = ACCS[av.a] || ACCS[0];
    return `<span class="avatar ${size}" style="--c:${col}"><span class="ch">${ch}</span>${acc.e ? `<span class="acc ${acc.p}">${acc.e}</span>` : ''}</span>`;
  }

  const LEVELS = {
    1: { name: 'Kürbis', em: '🎃', sub: 'Grundbegriffe' },
    2: { name: 'Geist', em: '👻', sub: 'Winkel & Drehrichtung' },
    3: { name: 'Fledermaus', em: '🦇', sub: 'Jetzt wird selbst gedreht!' },
    4: { name: 'Endboss', em: '💀', sub: 'Zentrum finden & messen' },
  };
  const OPT_ICONS = ['🎃', '👻', '🦇', '💀'];

  /* ================================================================== */
  /*  Sound (WebAudio)                                                   */
  /* ================================================================== */
  const Sound = {
    on: keep.get('gm_sound') !== false,
    ctx: null,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    },
    tone(f, d = 0.12, type = 'sine', v = 0.12, at = 0) {
      if (!this.on || !this.ctx) return;
      try {
        const t = this.ctx.currentTime + at;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.02);
      } catch (e) { /* egal */ }
    },
    click() { this.tone(660, 0.05, 'triangle', 0.06); },
    tick() { this.tone(1200, 0.03, 'square', 0.03); },
    ok() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, i * 0.09)); },
    bad() { [300, 220].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.07, i * 0.16)); },
    spooky() { [196, 233, 277, 330].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.08, i * 0.12)); },
    fanfare() { [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, i * 0.13)); },
  };
  const soundBtn = $('#soundBtn');
  const paintSound = () => { soundBtn.textContent = Sound.on ? '🔊' : '🔇'; };
  paintSound();
  soundBtn.addEventListener('click', () => { Sound.init(); Sound.on = !Sound.on; keep.set('gm_sound', Sound.on); paintSound(); });
  document.addEventListener('pointerdown', () => Sound.init(), { once: true });

  /* ================================================================== */
  /*  Toast + Konfetti                                                   */
  /* ================================================================== */
  let toastT;
  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms);
  }
  function confetti(ms = 4500) {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const em = ['🎃', '🍬', '👻', '🦇', '⭐', '🍭', '🕸️'];
    const parts = Array.from({ length: 70 }, () => ({
      x: Math.random() * cv.width, y: -Math.random() * cv.height * 0.6, vy: (2 + Math.random() * 3) * dpr, vx: (Math.random() - 0.5) * 2 * dpr,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.1, s: (18 + Math.random() * 18) * dpr, e: em[ri(em.length)],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.font = `${p.s}px serif`; ctx.fillText(p.e, 0, 0); ctx.restore();
      });
      if (t - t0 < ms) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* ================================================================== */
  /*  SVG-Gitter                                                         */
  /* ================================================================== */
  const N = 10, C = 10, P = 6, W = P * 2 + N * C;
  const X = (x) => +(P + x * C).toFixed(2);
  const Y = (y) => +(P + (N - y) * C).toFixed(2);
  const COL = {
    orig: '#ff7a1a', origFill: 'rgba(255,122,26,.35)',
    img: '#c48bff', imgFill: 'rgba(162,107,255,.4)',
    ghost: '#e9e0ff', ghostFill: 'rgba(233,224,255,.12)',
    ok: '#7dff5a', okFill: 'rgba(125,255,90,.3)',
    bad: '#ff4d6d', z: '#ff3355', yel: '#ffd23f',
  };
  let svgId = 0;
  function svgWrap(inner, extraCls = '') {
    const id = 'm' + (++svgId);
    return `<svg viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" class="${extraCls}" data-mid="${id}">
      <defs>
        <marker id="${id}y" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COL.yel}"/></marker>
        <marker id="${id}g" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COL.ok}"/></marker>
      </defs>
      ${inner.replace(/MARK_Y/g, `url(#${id}y)`).replace(/MARK_G/g, `url(#${id}g)`)}
    </svg>`;
  }
  function gridLines(nums = true, faint = false) {
    let s = '';
    for (let i = 0; i <= N; i++) {
      s += `<line class="g-line" x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(N)}"/><line class="g-line" x1="${X(0)}" y1="${Y(i)}" x2="${X(N)}" y2="${Y(i)}"/>`;
    }
    s += `<line class="g-axis" x1="${X(0)}" y1="${Y(0)}" x2="${X(N)}" y2="${Y(0)}"/><line class="g-axis" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(N)}"/>`;
    if (nums) for (let i = 0; i <= N; i += 1) {
      s += `<text class="g-num" x="${X(i)}" y="${Y(0) + 4}" text-anchor="middle">${i}</text>`;
      if (i) s += `<text class="g-num" x="${X(0) - 2.2}" y="${Y(i) + 1}" text-anchor="end">${i}</text>`;
    }
    return `<g opacity="${faint ? 0.45 : 1}">${s}</g>`;
  }
  const pAttr = (pts) => pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ');
  const poly = (pts, stroke, fill, extra = '') => `<polygon points="${pAttr(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-linejoin="round" ${extra}/>`;
  const dot = (p, col, r = 1.4) => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${r}" fill="${col}" stroke="#0f0819" stroke-width=".4"/>`;
  const label = (x, y, t, col) => `<text class="lab" x="${x}" y="${y}" fill="${col}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`;
  function labelsFor(pts, names, col) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return pts.map((p, i) => {
      let dx = p[0] - cx, dy = p[1] - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      return label(X(p[0]) + dx * 4.2, Y(p[1]) - dy * 4.2, names[i], col);
    }).join('');
  }
  const vNames = (n, prime = '') => ['A', 'B', 'C', 'D'].slice(0, n).map((s) => s + prime);
  function zMark(z, col = COL.z, txt = 'Z') {
    const x = X(z[0]), y = Y(z[1]);
    return `<g><line x1="${x - 2}" y1="${y - 2}" x2="${x + 2}" y2="${y + 2}" stroke="${col}" stroke-width="1"/><line x1="${x - 2}" y1="${y + 2}" x2="${x + 2}" y2="${y - 2}" stroke="${col}" stroke-width="1"/>${label(x + 3.6, y - 3.4, txt, col)}</g>`;
  }
  // Bogen von p um z mit Winkel phi (math. positiv = gegen den Uhrzeigersinn)
  function arc(z, p, phi, col = COL.yel, mark = 'MARK_Y', rScale = 1, dash = '1.6 1.2') {
    if (!phi) return '';
    const pp = [z[0] + (p[0] - z[0]) * rScale, z[1] + (p[1] - z[1]) * rScale];
    const q = rot(pp, z, phi);
    const r = Math.hypot(pp[0] - z[0], pp[1] - z[1]) * C;
    const large = Math.abs(phi) > 180 ? 1 : 0;
    const sweep = phi > 0 ? 0 : 1;
    if (Math.abs(phi) % 360 === 0) return '';
    return `<path d="M${X(pp[0])},${Y(pp[1])} A${r},${r} 0 ${large} ${sweep} ${X(q[0])},${Y(q[1])}" fill="none" stroke="${col}" stroke-width=".7" stroke-dasharray="${dash}" marker-end="${mark}"/>`;
  }
  const circle = (z, r, col = '#9fe3ff', dash = '1.5 1.5') => `<circle cx="${X(z[0])}" cy="${Y(z[1])}" r="${r * C}" fill="none" stroke="${col}" stroke-width=".5" stroke-dasharray="${dash}"/>`;
  function svgPoint(svg, ev) {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse()); return { x: r.x, y: r.y };
  }
  const toGrid = (s) => [(s.x - P) / C, N - (s.y - P) / C];
  const snap = (v, st) => Math.round(v / st) * st;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtNum = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));
  const fmtPt = (p) => `(${fmtNum(p[0])}|${fmtNum(p[1])})`;
  const phiText = (phi) => (norm(phi) === 180 ? '180°' : fmt(phi));
  const dirText = (phi) => (phi > 0 ? 'gegen den Uhrzeigersinn' : phi < 0 ? 'im Uhrzeigersinn' : 'keine Drehung');

  /* ================================================================== */
  /*  Zustand                                                            */
  /* ================================================================== */
  const S = {
    view: 'home', role: null, code: null, hostId: null, playerId: null, hostPlays: false,
    room: null, players: [], answers: [], unsub: null, poll: null, viewKey: '',
    myAns: {}, results: {}, seenMe: false, autoRevealed: {}, round: 0, busy: false, lastLvl: 0, netErrAt: 0,
    jokers: { fifty: true, hint: true, double: true }, armDouble: null, ranks: {}, react: null, lastReact: 0,
  };
  const freshJokers = () => ({ fifty: true, hint: true, double: true });
  const DIFF_UI = {
    leicht: { em: '🍬', name: 'Leicht', sub: 'Mehr Zeit, einfache Winkel' },
    normal: { em: '🎃', name: 'Normal', sub: 'Wie im Unterricht' },
    schwierig: { em: '💀', name: 'Schwierig', sub: 'Weniger Zeit, krumme Winkel' },
  };
  const roomDiff = () => (S.room && S.room.questions && S.room.questions[0] && S.room.questions[0].diff) || 'normal';
  function saveSession() {
    if (!S.code) return sess.del('gm_session');
    sess.set('gm_session', { role: S.role, code: S.code, hostId: S.hostId, playerId: S.playerId, hostPlays: S.hostPlays, myAns: S.myAns, results: S.results, round: S.round, jokers: S.jokers, ranks: S.ranks });
  }
  function resetGame() {
    if (S.unsub) S.unsub(); if (S.poll) clearInterval(S.poll);
    if (S.react) S.react.close();
    Object.assign(S, { role: null, code: null, hostId: null, playerId: null, hostPlays: false, room: null, players: [], answers: [], unsub: null, poll: null, viewKey: '', myAns: {}, results: {}, seenMe: false, autoRevealed: {}, round: 0, jokers: freshJokers(), armDouble: null, ranks: {}, react: null });
    removeReactBar();
    sess.del('gm_session');
    $('#roomTag').classList.add('hidden');
  }

  /* ================================================================== */
  /*  Startseite                                                         */
  /* ================================================================== */
  function goHome(msg) {
    resetGame();
    S.view = 'home';
    app.innerHTML = `
      <section class="home">
        <div class="hero">
          <svg class="hero-demo" viewBox="0 0 120 120" aria-hidden="true">
            ${Array.from({ length: 13 }, (_, k) => `<line x1="${k * 10}" y1="0" x2="${k * 10}" y2="120" class="g-line"/><line x1="0" y1="${k * 10}" x2="120" y2="${k * 10}" class="g-line"/>`).join('')}
            <circle cx="60" cy="60" r="36" fill="none" stroke="#4b3474" stroke-width=".8" stroke-dasharray="2 2"/>
            <polygon points="60,30 90,30 60,10" transform="rotate(-90 60 60)" fill="rgba(233,224,255,.1)" stroke="#e9e0ff" stroke-width=".8" stroke-dasharray="2 1.5"/>
            <text x="23" y="53" font-size="9" text-anchor="middle" dominant-baseline="central" opacity=".85">👻</text>
            <g class="hero-spin"><polygon points="60,30 90,30 60,10" fill="rgba(255,122,26,.45)" stroke="#ff7a1a" stroke-width="1.2" stroke-linejoin="round"/>
              <circle cx="90" cy="30" r="1.8" fill="#ffd23f"/></g>
            <g stroke="#ff3355" stroke-width="1.4"><line x1="57" y1="57" x2="63" y2="63"/><line x1="57" y1="63" x2="63" y2="57"/></g>
            <text x="67" y="55" class="lab" fill="#ff3355" style="font-size:8px">Z</text>
          </svg>
          <h1 class="hero-title">Ghost Math</h1>
          <p class="hero-sub">Dreh das Dreieck um Z auf seinen Geist – live gegen deine ganze Klasse.</p>
        </div>
        <div class="role-grid">
          <button class="role t" id="toTeacher"><span class="em">🧙</span><span>Ich bin Lehrer<br><small>Raum erstellen</small></span></button>
          <button class="role s" id="toStudent"><span class="em">🎃</span><span>Ich bin Schüler<br><small>Mit Code beitreten</small></span></button>
        </div>
        ${Net.mode === 'local' ? '<p class="muted small">🧪 Testmodus: Alles läuft nur in diesem Browser (mehrere Tabs).</p>' : ''}
      </section>`;
    $('#toTeacher').onclick = () => { Sound.click(); teacherSetup(); };
    $('#toStudent').onclick = () => { Sound.click(); studentJoin(); };
    if (msg) toast(msg, 4000);
  }
  $('#logoBtn').addEventListener('click', () => {
    if (S.code && S.room && S.room.status !== 'final') {
      if (!window.confirm('Willst du das Spiel wirklich verlassen?')) return;
      if (S.playerId && S.role === 'player') Net.leave(S.playerId);
    }
    goHome();
  });

  /* ---------- Avatar-Auswahl ---------- */
  function avatarPicker(container, state, onChange) {
    function paint() {
      container.innerHTML = `
        <div class="av-picker">
          <div class="av-preview">${avatarHTML(state.av, 'xl bounce')}
            <button class="btn small ghost" type="button" data-rand>🎲 Zufall</button></div>
          <div><label class="lbl">Figur</label><div class="chip-row">${CHARS.map((c, i) => `<button type="button" class="chip ${state.av.c === i ? 'on' : ''}" data-c="${i}" aria-label="Figur ${i + 1}">${c}</button>`).join('')}</div></div>
          <div><label class="lbl">Farbe</label><div class="chip-row">${COLORS.map((c, i) => `<button type="button" class="chip color ${state.av.k === i ? 'on' : ''}" data-k="${i}" style="background:${c}" aria-label="Farbe ${i + 1}"></button>`).join('')}</div></div>
          <div><label class="lbl">Extra</label><div class="chip-row">${ACCS.map((a, i) => `<button type="button" class="chip ${state.av.a === i ? 'on' : ''}" data-a="${i}" aria-label="Extra ${i + 1}">${a.e || '🚫'}</button>`).join('')}</div></div>
        </div>`;
      container.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { state.av.c = +b.dataset.c; Sound.click(); paint(); onChange && onChange(); }));
      container.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { state.av.k = +b.dataset.k; Sound.click(); paint(); onChange && onChange(); }));
      container.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { state.av.a = +b.dataset.a; Sound.click(); paint(); onChange && onChange(); }));
      container.querySelector('[data-rand]').onclick = () => { state.av = randAvatar(); Sound.spooky(); paint(); onChange && onChange(); };
    }
    paint();
  }
  const cleanName = (s) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

  /* ================================================================== */
  /*  Lehrer: Raum erstellen                                             */
  /* ================================================================== */
  function teacherSetup() {
    S.view = 'teacherSetup';
    const st = { plays: false, count: 16, diff: keep.get('gm_diff') || 'normal', name: keep.get('gm_name_t') || 'Lehrer', av: keep.get('gm_av_t') || { c: 2, k: 1, a: 1 } };
    app.innerHTML = `
      <div class="form-wrap stack">
        <h2 class="title-font center" style="font-size:44px;color:var(--purple)">🧙 Raum erstellen</h2>
        <div class="card stack">
          <div><label class="lbl">Willst du selbst mitspielen?</label>
            <div class="seg" id="segPlay">
              <button type="button" data-v="0" class="on"><span class="em">📺</span>Nur leiten</button>
              <button type="button" data-v="1"><span class="em">🎮</span>Mitspielen</button>
            </div></div>
          <div><label class="lbl">Wie schwer soll es sein?</label>
            <div class="seg three diff-seg" id="segDiff">
              ${Object.entries(DIFF_UI).map(([k, d]) => `<button type="button" data-v="${k}" class="${st.diff === k ? 'on' : ''}"><span class="em">${d.em}</span>${d.name}<small>${d.sub}</small></button>`).join('')}
            </div></div>
          <div><label class="lbl">Wie viele Fragen?</label>
            <div class="seg three" id="segCount">
              <button type="button" data-v="12"><span class="em">⚡</span>12 · kurz</button>
              <button type="button" data-v="16" class="on"><span class="em">🎃</span>16 · normal</button>
              <button type="button" data-v="20"><span class="em">💀</span>20 · lang</button>
            </div></div>
          <p class="muted small" style="margin:0">Die Fragen werden immer schwieriger: 🎃 Kürbis → 👻 Geist → 🦇 Fledermaus (selbst drehen!) → 💀 Endboss.</p>
        </div>
        <div class="card stack hidden" id="hostPlayer">
          <div><label class="lbl" for="tName">Dein Spielername</label><input class="input" id="tName" maxlength="16" value="${esc(st.name)}"></div>
          <div id="tAv"></div>
        </div>
        <button class="btn orange big wide" id="create">🪄 Raum erstellen</button>
      </div>`;
    const seg = (id, key, conv) => $$(`#${id} button`).forEach((b) => (b.onclick = () => {
      $$(`#${id} button`).forEach((x) => x.classList.remove('on')); b.classList.add('on'); st[key] = conv(b.dataset.v); Sound.click();
      $('#hostPlayer').classList.toggle('hidden', !st.plays);
    }));
    seg('segPlay', 'plays', (v) => v === '1');
    seg('segCount', 'count', (v) => +v);
    seg('segDiff', 'diff', (v) => v);
    avatarPicker($('#tAv'), st);
    $('#create').onclick = async () => {
      const btn = $('#create');
      const name = cleanName($('#tName').value) || 'Lehrer';
      btn.disabled = true; btn.textContent = '⏳ Erstelle Raum …';
      try {
        const hostId = uuid();
        keep.set('gm_diff', st.diff);
        const questions = GMQ.buildQuestions(st.count, st.diff);
        let code = null;
        for (let i = 0; i < 8 && !code; i++) {
          const c = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[ri(32)]).join('');
          if (await Net.createRoom({ code: c, hostId, hostPlays: st.plays, questions })) code = c;
        }
        if (!code) throw new Error('Kein freier Code gefunden');
        Object.assign(S, { role: 'host', code, hostId, hostPlays: st.plays, playerId: null });
        if (st.plays) {
          S.playerId = uuid();
          keep.set('gm_name_t', name); keep.set('gm_av_t', st.av);
          await Net.joinPlayer({ id: S.playerId, code, name, avatar: st.av, isHost: true });
        }
        saveSession();
        await enterRoom();
      } catch (e) {
        btn.disabled = false; btn.textContent = '🪄 Raum erstellen';
        toast('😱 Fehler: ' + e.message, 5000);
      }
    };
  }

  /* ================================================================== */
  /*  Schüler: beitreten                                                 */
  /* ================================================================== */
  function studentJoin(prefill = '') {
    S.view = 'studentJoin';
    const st = { name: keep.get('gm_name') || '', av: keep.get('gm_av') || randAvatar() };
    app.innerHTML = `
      <div class="form-wrap stack">
        <h2 class="title-font center" style="font-size:44px;color:var(--orange)">🎃 Mitspielen</h2>
        <div class="card stack">
          <div><label class="lbl" for="code">Raum-Code</label>
            <input class="input code-input" id="code" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="•••••" value="${esc(prefill)}"></div>
          <div><label class="lbl" for="name">Dein Name</label>
            <div class="row" style="flex-wrap:nowrap"><input class="input" id="name" maxlength="16" placeholder="z. B. ${esc(NAMES[ri(NAMES.length)])}" value="${esc(st.name)}" autocomplete="off">
            <button class="btn ghost" type="button" id="randName" title="Zufallsname" style="padding:12px 14px">🎲</button></div></div>
        </div>
        <div class="card"><div id="sAv"></div></div>
        <button class="btn orange big wide" id="join">👻 Beitreten</button>
      </div>`;
    avatarPicker($('#sAv'), st);
    $('#randName').onclick = () => { $('#name').value = NAMES[ri(NAMES.length)] + ' ' + (ri(90) + 10); Sound.click(); };
    const codeEl = $('#code');
    codeEl.addEventListener('input', () => { codeEl.value = codeEl.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    if (!prefill) codeEl.focus();
    const go = async () => {
      const code = codeEl.value.trim().toUpperCase();
      const name = cleanName($('#name').value);
      if (code.length !== 5) return toast('Der Code hat 5 Zeichen 🔢');
      if (!name) return toast('Bitte gib einen Namen ein ✏️');
      const btn = $('#join');
      btn.disabled = true; btn.textContent = '⏳ Suche Raum …';
      try {
        const room = await Net.getRoom(code);
        if (!room) throw new Error('Diesen Raum gibt es nicht 👀');
        if (room.status === 'final') throw new Error('Dieses Spiel ist schon vorbei 🏁');
        const players = await Net.listPlayers(code);
        if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new Error('Den Namen gibt es schon – nimm einen anderen 🙃');
        const id = uuid();
        await Net.joinPlayer({ id, code, name, avatar: st.av });
        keep.set('gm_name', name); keep.set('gm_av', st.av);
        Object.assign(S, { role: 'player', code, playerId: id, hostId: null, room });
        saveSession();
        Sound.spooky();
        await enterRoom();
      } catch (e) {
        btn.disabled = false; btn.textContent = '👻 Beitreten';
        toast(e.message, 4000);
      }
    };
    $('#join').onclick = go;
    $$('input', app).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }));
  }

  /* ================================================================== */
  /*  Im Raum: Daten aktuell halten                                      */
  /* ================================================================== */
  async function enterRoom() {
    S.view = 'game'; S.viewKey = '';
    $('#roomTag').textContent = '🔑 ' + S.code; $('#roomTag').classList.remove('hidden');
    if (!S.room || !S.room.questions) S.room = await Net.getRoom(S.code);
    if (!S.room) return goHome('Der Raum existiert nicht mehr.');
    S.round = S.room.round || 0;
    const tables = S.role === 'host' ? ['rooms', 'players', 'answers'] : ['rooms', 'players'];
    if (S.unsub) S.unsub();
    S.unsub = Net.subscribe(S.code, tables, (kind) => {
      if (S.role !== 'host' && kind === 'players' && S.room && S.room.status === 'question') return;
      queueRefresh();
    });
    if (S.poll) clearInterval(S.poll);
    S.poll = setInterval(() => refresh(), 2500);
    if (S.react) S.react.close();
    try { S.react = Net.reactions(S.code, showReaction); } catch (e) { S.react = null; }
    await refresh();
  }
  let refreshing = false, pending = false, qTimer = null;
  function queueRefresh() { clearTimeout(qTimer); qTimer = setTimeout(refresh, 120); }
  async function refresh() {
    if (!S.code) return;
    if (refreshing) { pending = true; return; }
    refreshing = true;
    try {
      const lite = await Net.getRoomLite(S.code);
      if (!S.code) return;
      if (!lite) { goHome('Der Raum existiert nicht mehr 👻'); return; }
      if ((lite.round || 0) !== S.round || !S.room || !S.room.questions) {
        S.room = await Net.getRoom(S.code);
        if ((S.room.round || 0) !== S.round) { S.round = S.room.round || 0; S.myAns = {}; S.results = {}; S.autoRevealed = {}; S.jokers = freshJokers(); S.ranks = {}; saveSession(); }
      } else Object.assign(S.room, lite);
      const st = S.room.status;
      if (S.role === 'host' || st !== 'question') S.players = await Net.listPlayers(S.code);
      if (S.role === 'host' && S.room.q_index >= 0 && st !== 'lobby') S.answers = await Net.listAnswers(S.code, S.room.q_index);
      if (S.role === 'player' && st !== 'question') {
        if (S.players.some((p) => p.id === S.playerId)) S.seenMe = true;
        else if (S.seenMe) { goHome('Du wurdest aus dem Raum entfernt 🚪'); return; }
      }
      S.netErrAt = 0;
    } catch (e) {
      if (!S.netErrAt) S.netErrAt = Date.now();
      if (Date.now() - S.netErrAt > 6000) { toast('📡 Verbindung wackelt … ich versuche es weiter.'); S.netErrAt = Date.now(); }
    } finally {
      refreshing = false;
      if (pending) { pending = false; setTimeout(refresh, 50); }
    }
    tick();
  }

  /* ================================================================== */
  /*  Phasen & Ticker                                                    */
  /* ================================================================== */
  const curQ = () => (S.room && S.room.q_index >= 0 ? S.room.questions[S.room.q_index] : null);
  function phase() {
    const r = S.room;
    if (!r) return 'none';
    if (r.status === 'question') {
      const start = Date.parse(r.q_started_at);
      return Net.now() < start ? 'ready' : 'play';
    }
    return r.status;
  }
  function timeLeft() {
    const q = curQ(); if (!q) return 0;
    const end = Date.parse(S.room.q_started_at) + q.time * 1000;
    return Math.max(0, (end - Net.now()) / 1000);
  }
  const iPlay = () => !!S.playerId;
  const players = () => S.players.slice().sort((a, b) => b.score - a.score || Date.parse(a.joined_at) - Date.parse(b.joined_at));

  let lastTickSec = -1;
  function tick() {
    if (S.view !== 'game' || !S.room) return;
    const ph = phase();
    const sub = ph === 'play' && iPlay() && S.myAns[S.room.q_index] != null ? 'done' : '';
    const key = `${S.round}:${S.room.status}:${S.room.q_index}:${ph}:${sub}`;
    if (key !== S.viewKey) { S.viewKey = key; renderGame(ph); }
    updateLive(ph);
    // Host: automatisch auflösen
    if (S.role === 'host' && ph === 'play' && !S.autoRevealed[S.room.q_index]) {
      const answered = S.answers.length, total = S.players.length;
      if (timeLeft() <= 0 || (total > 0 && answered >= total)) {
        S.autoRevealed[S.room.q_index] = true;
        setTimeout(() => hostReveal(), timeLeft() <= 0 ? 500 : 900);
      }
    }
  }
  setInterval(tick, 150);

  function updateLive(ph) {
    const q = curQ();
    if (ph === 'play' && q) {
      const tl = timeLeft();
      const tm = $('#timer');
      if (tm) {
        tm.style.setProperty('--p', (tl / q.time).toFixed(3));
        tm.querySelector('span').textContent = Math.ceil(tl);
        tm.classList.toggle('low', tl <= 5 && tl > 0);
        const sec = Math.ceil(tl);
        if (sec !== lastTickSec) { lastTickSec = sec; if (sec <= 5 && sec > 0 && iPlay() && S.myAns[S.room.q_index] == null) Sound.tick(); }
      }
      if (tl <= 0 && iPlay() && S.myAns[S.room.q_index] == null) {
        const ui = $('#playArea');
        if (ui && !ui.dataset.closed) { ui.dataset.closed = '1'; ui.style.pointerEvents = 'none'; ui.style.opacity = '.45'; const tu = $('#timeUp'); if (tu) tu.classList.remove('hidden'); }
      }
    }
    if (ph === 'ready') {
      const start = Date.parse(S.room.q_started_at);
      const left = Math.max(0, start - Net.now());
      const total = (S.room.__delay || 4000);
      const bar = $('#readyBar'); if (bar) bar.style.width = (100 - Math.min(100, (left / total) * 100)) + '%';
      const n = $('#readyNum');
      if (n) {
        const sec = String(Math.ceil(left / 1000));
        if (n.textContent !== sec) { n.textContent = sec; if (sec !== '0') { Sound.tick(); popAnim(n); } }
      }
    }
    const ac = $('#answeredCount');
    if (ac) ac.textContent = `${S.answers.length} / ${S.players.length}`;
    const ap = $('#answeredBar');
    if (ap) ap.style.width = (S.players.length ? (S.answers.length / S.players.length) * 100 : 0) + '%';
    if (S.room.status === 'lobby') paintLobbyPlayers();
  }

  /* ================================================================== */
  /*  Rendering pro Phase                                                */
  /* ================================================================== */
  function renderGame(ph) {
    lastTickSec = -1;
    if (ph === 'lobby' || ph === 'reveal' || ph === 'final' || S.room.status === 'lobby') addReactBar(); else removeReactBar();
    if (S.room.status === 'lobby') return renderLobby();
    if (ph === 'ready') return renderReady();
    if (ph === 'play') return renderPlay();
    if (ph === 'reveal') return renderReveal();
    if (ph === 'final') return renderFinal();
  }

  /* ---------- Lobby ---------- */
  function joinUrl() {
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('code', S.code);
    if (Net.mode === 'local') u.searchParams.set('local', '1');
    return u.toString();
  }
  function renderLobby() {
    const isHost = S.role === 'host';
    if (isHost) {
      let qr = '';
      try { const q = qrcode(0, 'M'); q.addData(joinUrl()); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { qr = ''; }
      app.innerHTML = `
        <div class="stack host">
          <div class="lobby-head">
            <div class="card code-box">
              <div class="muted">Geht auf diese Seite und gebt den Code ein:</div>
              <div class="big-code" id="bigCode">${esc(S.code)}</div>
              <div class="muted small" style="word-break:break-all">${esc(joinUrl().replace(/^https?:\/\//, ''))}</div>
              <div class="row center" style="margin-top:12px">
                <button class="btn small ghost" id="copyLink">🔗 Link kopieren</button>
              </div>
            </div>
            <div class="card center stack" style="align-items:center;justify-content:center">
              ${qr ? `<div class="qr">${qr}</div><div class="muted small">📱 QR-Code scannen</div>` : ''}
            </div>
          </div>
          <div class="card stack">
            <div class="row" style="justify-content:space-between">
              <span class="count-pill">👥 <b id="pCount">0</b> Spieler</span>
              <span class="muted small">${DIFF_UI[roomDiff()].em} ${DIFF_UI[roomDiff()].name} · ${S.room.questions.length} Fragen · ${S.hostPlays ? '🎮 du spielst mit' : '📺 du leitest'}</span>
            </div>
            <div class="players" id="pList"></div>
            <p class="muted small center" style="margin:0">Tipp: Auf ✕ tippen, um jemanden zu entfernen.</p>
          </div>
          <button class="btn green big wide" id="startBtn">🚀 Spiel starten</button>
        </div>`;
      $('#copyLink').onclick = async () => { try { await navigator.clipboard.writeText(joinUrl()); toast('Link kopiert 📋'); } catch (e) { toast(joinUrl(), 5000); } };
      $('#startBtn').onclick = () => hostGoTo(0);
    } else {
      const me = S.players.find((p) => p.id === S.playerId);
      app.innerHTML = `
        <div class="stack">
          <div class="card center stack" style="align-items:center">
            ${avatarHTML(me ? me.avatar : keep.get('gm_av'), 'xl bounce')}
            <h2 style="font-size:28px">Du bist drin, ${esc(me ? me.name : keep.get('gm_name') || '')}! 🎉</h2>
            <p class="muted" style="margin:0">Warte, bis dein Lehrer das Spiel startet …</p>
            <span class="count-pill">${DIFF_UI[roomDiff()].em} Schwierigkeit: ${DIFF_UI[roomDiff()].name}</span>
            <p class="small muted" style="margin:0">Du hast 3 Joker: ✂️ 50:50 · 🔮 Tipp${Net.hasDouble ? ' · ⚡ Doppelte Punkte' : ''} – jeden einmal pro Spiel.</p>
            <button class="btn small ghost" id="editAv">✏️ Avatar ändern</button>
          </div>
          <div class="card stack">
            <span class="count-pill" style="align-self:center">👥 <b id="pCount">0</b> Spieler im Raum</span>
            <div class="players" id="pList"></div>
          </div>
        </div>`;
      $('#editAv').onclick = () => editAvatar();
    }
    lobbyPaintKey = '';
    paintLobbyPlayers();
  }
  let lobbyPaintKey = '';
  function paintLobbyPlayers() {
    const list = $('#pList'); if (!list) return;
    const key = S.players.map((p) => p.id + JSON.stringify(p.avatar) + p.name).join('|');
    if (key === lobbyPaintKey) return;
    lobbyPaintKey = key;
    const isHost = S.role === 'host';
    $('#pCount').textContent = S.players.length;
    list.innerHTML = S.players.length ? S.players.map((p) => `
      <div class="pchip ${p.id === S.playerId ? 'me' : ''}">
        ${avatarHTML(p.avatar, 'lg')}<span class="nm">${esc(p.name)}${p.is_host ? ' 🧙' : ''}</span>
        ${isHost && p.id !== S.playerId ? `<button class="kick" data-kick="${esc(p.id)}" title="Entfernen" aria-label="${esc(p.name)} entfernen">✕</button>` : ''}
      </div>`).join('') : '<p class="muted">Noch niemand da … 🕸️</p>';
    $$('[data-kick]', list).forEach((b) => (b.onclick = async () => {
      try { await Net.kick(S.code, S.hostId, b.dataset.kick); toast('Spieler entfernt'); refresh(); } catch (e) { toast(e.message); }
    }));
    const sb = $('#startBtn'); if (sb) sb.disabled = S.players.length === 0;
  }
  function editAvatar() {
    const me = S.players.find((p) => p.id === S.playerId);
    const st = { av: Object.assign({}, (me && me.avatar) || keep.get('gm_av') || randAvatar()) };
    app.innerHTML = `<div class="form-wrap stack"><div class="card"><div id="eAv"></div></div>
      <button class="btn orange big wide" id="saveAv">💾 Speichern</button></div>`;
    avatarPicker($('#eAv'), st);
    $('#saveAv').onclick = async () => {
      try { await Net.updatePlayer(S.playerId, { avatar: st.av }); keep.set('gm_av', st.av); } catch (e) { toast(e.message); }
      S.viewKey = ''; await refresh();
    };
  }

  /* ---------- Host-Steuerung ---------- */
  async function hostGoTo(i) {
    if (S.busy) return;
    S.busy = true;
    try {
      const qs = S.room.questions;
      if (i >= qs.length) {
        await Net.hostSet(S.code, S.hostId, 'final', qs.length - 1, 0);
      } else {
        const lvlChange = i === 0 || qs[i].lvl !== qs[i - 1].lvl;
        const d = lvlChange ? 5500 : 4000;
        await Net.hostSet(S.code, S.hostId, 'question', i, d);
      }
      await refresh();
    } catch (e) { toast('😱 ' + e.message); } finally { S.busy = false; }
  }
  async function hostReveal() {
    if (S.role !== 'host' || !S.room || S.room.status !== 'question') return;
    try { await Net.hostSet(S.code, S.hostId, 'reveal', S.room.q_index, 0); await refresh(); } catch (e) { toast('😱 ' + e.message); }
  }

  /* ---------- Bereit ---------- */
  function renderReady() {
    const i = S.room.q_index, q = curQ(), qs = S.room.questions;
    const lvl = LEVELS[q.lvl];
    const lvlChange = i === 0 || q.lvl !== qs[i - 1].lvl;
    S.room.__delay = lvlChange ? 5500 : 4000;
    if (lvlChange) Sound.spooky(); else Sound.click();
    app.innerHTML = `
      <div class="ready">
        ${lvlChange ? `<div class="lvl-em">${lvl.em}</div><div class="lvl-big lvl${q.lvl}" style="background:none">Level ${q.lvl}: ${lvl.name}</div><div class="muted" style="font-size:20px">${lvl.sub}</div>`
          : `<span class="lvl lvl${q.lvl}">${lvl.em} Level ${q.lvl} · ${lvl.name}</span>`}
        <div class="muted">Frage ${i + 1} von ${qs.length}</div>
        <div class="qtext" style="max-width:820px">${esc(q.text)}</div>
        <div style="width:min(420px,90%)" class="progress"><div id="readyBar" style="width:0%"></div></div>
        <div class="ready-num" id="readyNum"></div>
        ${q.blitz ? '<div class="blitz-tag">⚡ Blitzrunde – nur ' + q.time + ' Sekunden!</div>' : ''}
      </div>`;
  }

  /* ---------- Frage ---------- */
  function hostBarHTML(showReveal = true) {
    if (S.role !== 'host') return '';
    return `<div class="hostbar">
      <div style="flex:1;min-width:160px"><div class="small muted">Antworten: <b id="answeredCount" style="color:var(--text)">0 / 0</b></div>
        <div class="progress" style="margin-top:6px"><div id="answeredBar" style="width:0%"></div></div></div>
      ${showReveal ? '<button class="btn small purple" id="revealNow">⏭ Auflösen</button>' : ''}
    </div>`;
  }
  function qHeadHTML(q) {
    const lvl = LEVELS[q.lvl];
    return `<div class="qhead">
      <span class="lvl lvl${q.lvl}">${lvl.em} Level ${q.lvl} · Frage ${S.room.q_index + 1}/${S.room.questions.length}</span>
      <div class="timer" id="timer"><span>${q.time}</span></div>
    </div>`;
  }
  function renderPlay() {
    const q = curQ(), i = S.room.q_index;
    const done = iPlay() && S.myAns[i] != null;
    let body;
    if (done) {
      const tips = ['Wusstest du? Das Drehzentrum Z ist der einzige Fixpunkt 📌', '−90° und +270° führen zum selben Bild 🔄', 'Urpunkt und Bildpunkt liegen immer auf einem Kreis um Z ⭕', 'Positiv = gegen den Uhrzeigersinn ↺', 'Eine Drehung verändert weder Längen noch Winkel 📏'];
      body = `<div class="card waiting"><span class="em bounce">🔒</span><h2>Antwort eingeloggt!</h2>
        <p class="muted">Warte auf die anderen … 👀</p><p class="small muted">${tips[i % tips.length]}</p></div>`;
    } else if (iPlay()) {
      body = `${jokerBarHTML(q)}<div id="hintBox" class="hint hidden"></div><div id="playArea"></div><div id="timeUp" class="card center hidden" style="margin-top:12px"><b style="font-size:22px">⏰ Zeit abgelaufen!</b></div>`;
    } else {
      body = `<div id="showArea"></div>`;
    }
    app.innerHTML = `${hostBarHTML(true)}<div class="card">${qHeadHTML(q)}<p class="qtext">${esc(q.text)}</p>${body}</div>`;
    const rv = $('#revealNow'); if (rv) rv.onclick = () => hostReveal();
    if (!done && iPlay()) { mountQuestion($('#playArea'), q, 'play'); mountJokers(q); }
    if (!iPlay()) mountQuestion($('#showArea'), q, 'show');
    updateLive('play');
  }

  async function submitAnswer(ans) {
    const i = S.room.q_index, q = curQ();
    if (S.myAns[i] != null) return;
    if (timeLeft() <= 0) { toast('⏰ Zu spät!'); return; }
    const correct = GMQ.check(q, ans);
    const dbl = S.armDouble === i;
    if (dbl) { S.jokers.double = false; S.armDouble = null; }
    S.myAns[i] = ans;
    saveSession();
    Sound.click();
    tick();
    try {
      const res = await Net.submit(S.code, S.playerId, i, correct, dbl);
      S.results[i] = res && res.ok ? { correct, points: (res.points || 0) + (res.bonus || 0), bonus: res.bonus || 0, streak: res.streak || 0, double: !!res.double } : { correct: false, points: 0, late: true, reason: res && res.reason };
    } catch (e) {
      S.results[i] = { correct, points: 0, err: true };
      toast('📡 Antwort konnte nicht gesendet werden.');
    }
    saveSession();
  }

  /* ================================================================== */
  /*  Fragetypen                                                         */
  /* ================================================================== */
  function mountQuestion(el, q, mode) {
    const fn = { mc: mountMC, mcfig: mountMCFig, point: mountPoint, dial: mountDial, center: mountCenter, measure: mountMeasure }[q.type];
    fn(el, q, mode);
  }

  /* ---------- Zusatzbilder für Multiple Choice ---------- */
  function figClock(q) {
    const m = q.fig.min, a = -m * 6; // im Uhrzeigersinn
    const c = 50, r = 40;
    let s = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="44" fill="#1a1029" stroke="#ffb057" stroke-width="2"/>`;
    for (let k = 0; k < 60; k++) {
      const t = (k * 6 * Math.PI) / 180, l = k % 5 ? 2 : 5;
      s += `<line x1="${c + Math.sin(t) * r}" y1="${c - Math.cos(t) * r}" x2="${c + Math.sin(t) * (r - l)}" y2="${c - Math.cos(t) * (r - l)}" stroke="#bba9d9" stroke-width="${k % 5 ? 0.5 : 1.2}"/>`;
    }
    const t2 = (m * 6 * Math.PI) / 180;
    const rr = 22, large = m * 6 > 180 ? 1 : 0;
    s += `<defs><marker id="clk" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffd23f"/></marker></defs>`;
    s += `<path d="M50,${50 - rr} A${rr},${rr} 0 ${large} 1 ${50 + Math.sin(t2) * rr},${50 - Math.cos(t2) * rr}" fill="none" stroke="#ffd23f" stroke-width="1.6" stroke-dasharray="3 2" marker-end="url(#clk)"/>`;
    s += `<line x1="50" y1="50" x2="50" y2="14" stroke="#ffffff55" stroke-width="2.5" stroke-linecap="round"/>`;
    s += `<line x1="50" y1="50" x2="${50 + Math.sin(t2) * 34}" y2="${50 - Math.cos(t2) * 34}" stroke="#ff7a1a" stroke-width="3" stroke-linecap="round"/>`;
    s += `<circle cx="50" cy="50" r="3" fill="#ff3355"/><text x="50" y="66" text-anchor="middle" font-size="7" fill="#bba9d9" font-family="Nunito" font-weight="900">${m} min</text></svg>`;
    void a;
    return s;
  }
  function figArc(q, solved) {
    const { z, p, q: pq, phi } = q.fig;
    return svgWrap(gridLines(true, true) + circle(z, Math.hypot(p[0] - z[0], p[1] - z[1]), '#4b3474') +
      `<line x1="${X(z[0])}" y1="${Y(z[1])}" x2="${X(p[0])}" y2="${Y(p[1])}" stroke="#ffb057" stroke-width=".5"/>` +
      `<line x1="${X(z[0])}" y1="${Y(z[1])}" x2="${X(pq[0])}" y2="${Y(pq[1])}" stroke="#c48bff" stroke-width=".5"/>` +
      arc(z, p, phi, COL.yel, 'MARK_Y', 0.55, '0') + arc(z, p, phi, COL.yel, 'MARK_Y', 1) +
      dot(p, COL.orig) + dot(pq, COL.img) + label(X(p[0]) + 3.5, Y(p[1]) - 3, 'P', COL.orig) + label(X(pq[0]) + 3.5, Y(pq[1]) - 3, "P'", COL.img) + zMark(z) +
      (solved ? label(X(z[0]), Y(z[1]) + 6, phiText(phi), COL.ok) : ''));
  }
  function mcFigure(q, solved) {
    if (!q.fig) return '';
    if (q.fig.kind === 'clock') return `<div class="fig small" style="max-width:320px;margin:0 auto">${figClock(q)}</div>`;
    if (q.fig.kind === 'arc') return `<div class="fig small" style="max-width:420px;margin:0 auto">${figArc(q, solved)}</div>`;
    return '';
  }

  /* ---------- Multiple Choice ---------- */
  function mountMC(el, q, mode, sol) {
    const picked = sol ? sol.picked : null;
    el.innerHTML = `<div class="stack">${mcFigure(q, !!sol)}
      <div class="opts ${q.options.length === 2 ? 'tf' : ''}">${q.options.map((o, k) => {
        let cls = `opt c${k}`;
        if (sol) { cls += k === q.answer ? ' right' : ' dim'; if (k === picked && k !== q.answer) cls += ' wrong'; }
        const ic = q.options.length === 2 ? (k === 0 ? '✅' : '❌') : OPT_ICONS[k];
        return `<button class="${cls}" data-k="${k}" style="--i:${k}" ${mode !== 'play' ? 'tabindex="-1"' : ''}><span class="ic">${ic}</span>${esc(o)}${sol && k === picked ? ' ← du' : ''}</button>`;
      }).join('')}</div></div>`;
    if (mode === 'play') $$('[data-k]', el).forEach((b) => (b.onclick = () => submitAnswer(+b.dataset.k)));
    else $$('.opt', el).forEach((b) => (b.style.cursor = 'default'));
  }

  /* ---------- Welches Bild ist richtig? ---------- */
  function shapeFig(q, extra = '', faint = false) {
    const names = vNames(q.pts.length);
    return gridLines(true, faint) + poly(q.pts, COL.orig, COL.origFill) + labelsFor(q.pts, names, COL.orig) + extra + zMark(q.z);
  }
  function mountMCFig(el, q, mode, sol) {
    const picked = sol ? sol.picked : null;
    const tile = (pts) => svgWrap(gridLines(false, true) + poly(q.pts, COL.orig, 'none', 'stroke-dasharray="1.5 1.2" opacity=".7"') +
      poly(pts, COL.img, COL.imgFill) + labelsFor(pts, vNames(pts.length, "'"), COL.img) + zMark(q.z));
    el.innerHTML = `<div class="qwrap split">
      <div class="fig small">${svgWrap(shapeFig(q))}</div>
      <div class="opts figs">${q.options.map((pts, k) => {
        let cls = `opt optfig c${k}`;
        if (sol) { cls += k === q.answer ? ' right' : ' dim'; if (k === picked && k !== q.answer) cls += ' wrong'; }
        return `<button class="${cls}" data-k="${k}"><span class="ic">${OPT_ICONS[k]}${sol && k === picked ? ' du' : ''}</span>${tile(pts)}</button>`;
      }).join('')}</div></div>`;
    if (mode === 'play') $$('[data-k]', el).forEach((b) => (b.onclick = () => submitAnswer(+b.dataset.k)));
  }

  /* ---------- Bildpunkt setzen ---------- */
  function pointBase(q, showCircle) {
    const r = Math.hypot(q.a[0] - q.z[0], q.a[1] - q.z[1]);
    return gridLines(true) + (showCircle ? circle(q.z, r) : '') +
      `<line x1="${X(q.z[0])}" y1="${Y(q.z[1])}" x2="${X(q.a[0])}" y2="${Y(q.a[1])}" stroke="#ffb05788" stroke-width=".5" stroke-dasharray="1 1"/>` +
      dot(q.a, COL.orig, 1.6) + label(X(q.a[0]) + 3.6, Y(q.a[1]) - 3.4, 'A', COL.orig) + zMark(q.z);
  }
  function mountPoint(el, q, mode, sol) {
    if (sol) {
      const mine = sol.picked;
      const wrong = mine && !GMQ.check(q, mine);
      el.innerHTML = `<div class="fig">${svgWrap(pointBase(q, true) + arc(q.z, q.a, q.phi, COL.ok, 'MARK_G') +
        (wrong ? dot(mine, COL.bad, 1.6) + label(X(mine[0]) + 4, Y(mine[1]) - 3.4, 'du', COL.bad) : '') +
        dot(q.answer, COL.ok, 1.8) + label(X(q.answer[0]) + 3.8, Y(q.answer[1]) - 3.4, "A'", COL.ok))}</div>`;
      return;
    }
    const st = { pick: null, circle: false };
    el.innerHTML = `<div class="qwrap split">
      <div class="fig" id="pFig"></div>
      <div class="answer-panel">
        <div class="card" style="padding:14px"><div class="muted small">Dein Bildpunkt</div><div style="font-size:28px;font-weight:900" id="pTxt">– tippe ins Gitter –</div></div>
        ${mode === 'play' ? `<div class="tools"><button class="btn small ghost" id="tCirc">⭕ Zirkel</button></div>
        <button class="btn orange big wide" id="pGo" disabled>✅ Abgeben</button>` : ''}
      </div></div>`;
    const draw = () => {
      $('#pFig', el).innerHTML = svgWrap(pointBase(q, st.circle) +
        (st.pick ? dot(st.pick, COL.yel, 1.8) + label(X(st.pick[0]) + 3.8, Y(st.pick[1]) - 3.4, "A'", COL.yel) : '') +
        (mode === 'play' ? `<rect class="tap-target" x="0" y="0" width="${W}" height="${W}"/>` : ''));
      if (mode !== 'play') return;
      const svg = $('#pFig svg', el);
      svg.addEventListener('pointerdown', (ev) => {
        const g = toGrid(svgPoint(svg, ev));
        st.pick = [clamp(snap(g[0], 1), 0, N), clamp(snap(g[1], 1), 0, N)];
        Sound.click(); draw();
        $('#pTxt', el).textContent = "A' " + fmtPt(st.pick);
        $('#pGo', el).disabled = false;
      });
    };
    draw();
    if (mode === 'play') {
      $('#tCirc', el).onclick = (e) => { st.circle = !st.circle; e.currentTarget.classList.toggle('on', st.circle); draw(); };
      $('#pGo', el).onclick = () => st.pick && submitAnswer(st.pick);
    }
  }

  /* ---------- Drehrad ---------- */
  function dialFig(q, phi, opts = {}) {
    const names = vNames(q.pts.length);
    let s = gridLines(true);
    if (q.shadow || opts.showTarget) {
      const t = rotPoly(q.pts, q.z, q.target);
      s += poly(t, opts.showTarget ? COL.ok : COL.ghost, opts.showTarget ? COL.okFill : COL.ghostFill, opts.showTarget ? '' : 'stroke-dasharray="1.6 1.2"');
      if (!opts.showTarget) {
        const cx = t.reduce((a, p) => a + p[0], 0) / t.length, cy = t.reduce((a, p) => a + p[1], 0) / t.length;
        s += `<text x="${X(cx)}" y="${Y(cy)}" font-size="6" text-anchor="middle" dominant-baseline="central" opacity=".8">👻</text>`;
      } else s += labelsFor(t, vNames(t.length, "'"), COL.ok);
    }
    s += poly(q.pts, COL.orig, 'none', 'stroke-dasharray="1 1" opacity=".55"') + labelsFor(q.pts, names, '#ffb05799');
    const cur = rotPoly(q.pts, q.z, phi);
    s += `<g id="dialLive">${dialLive(q, phi, cur, opts.mineCol)}</g>` + zMark(q.z);
    return s;
  }
  function dialLive(q, phi, cur, col) {
    cur = cur || rotPoly(q.pts, q.z, phi);
    const c = col || COL.orig;
    return (phi ? arc(q.z, q.pts[0], phi, COL.yel) : '') + poly(cur, c, col ? 'rgba(255,77,109,.3)' : COL.origFill) + labelsFor(cur, vNames(cur.length, phi ? "'" : ''), c) +
      cur.map((p) => dot(p, c, 0.9)).join('');
  }
  function knobSVG(phi) {
    let s = `<svg class="dial" id="knob" viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle r="47" fill="#1a1029" stroke="#4b3474" stroke-width="2"/>`;
    for (let a = 0; a < 360; a += 15) {
      const t = (a * Math.PI) / 180, l = a % 90 ? 4 : 8;
      s += `<line x1="${Math.cos(t) * 44}" y1="${Math.sin(t) * 44}" x2="${Math.cos(t) * (44 - l)}" y2="${Math.sin(t) * (44 - l)}" stroke="#7d68a6" stroke-width="${a % 90 ? 1 : 2}"/>`;
    }
    s += `<g id="knobRot" transform="rotate(${-phi})">
        <circle r="30" fill="url(#kg)" stroke="#ff7a1a" stroke-width="2"/>
        <line x1="0" y1="-8" x2="0" y2="-27" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
        <text y="-30" font-size="14" text-anchor="middle" dominant-baseline="central">🎃</text>
      </g>
      <text y="5" font-size="9" text-anchor="middle" fill="#bba9d9" font-family="Nunito" font-weight="900">ziehen</text>
      <defs><radialGradient id="kg"><stop offset="0" stop-color="#3b2460"/><stop offset="1" stop-color="#21133a"/></radialGradient></defs></svg>`;
    return s;
  }
  function mountDial(el, q, mode, sol) {
    if (sol) {
      const mine = sol.picked;
      const ok = mine != null && GMQ.check(q, mine);
      el.innerHTML = `<div class="qwrap split"><div class="fig">${svgWrap(dialFig(q, mine == null ? 0 : mine, { showTarget: true, mineCol: ok ? null : COL.bad }))}</div>
        <div class="answer-panel"><div class="card center"><div class="muted small">Richtig</div><div class="phi-display">φ = ${phiText(q.target)}<small>${dirText(q.target)}</small></div>
        ${mine != null ? `<div class="muted small" style="margin-top:8px">Du: φ = ${phiText(mine)}</div>` : ''}</div></div></div>`;
      return;
    }
    const st = { phi: 0, raw: 0, last: null };
    el.innerHTML = `<div class="qwrap split">
      <div class="fig" id="dFig">${svgWrap(dialFig(q, 0))}</div>
      <div class="answer-panel">
        <div class="phi-display" id="phiTxt">φ = 0°<small>noch nicht gedreht</small></div>
        ${mode === 'play' ? `${knobSVG(0)}
        <div class="tools">
          <button class="btn small ghost" data-d="15">↺ +15°</button><button class="btn small ghost" data-d="5">↺ +5°</button>
          <button class="btn small ghost" data-d="-5">↻ −5°</button><button class="btn small ghost" data-d="-15">↻ −15°</button>
          <button class="btn small ghost" data-d="0">⟲ 0°</button>
        </div>
        <button class="btn orange big wide" id="dGo" disabled>✅ Abgeben</button>` : `<p class="muted center">Die Schüler drehen jetzt am Drehrad 🌀</p>`}
      </div></div>`;
    if (mode !== 'play') return;
    const live = () => $('#dialLive', el);
    const set = (phi) => {
      phi = clamp(phi, -360, 360);
      if (phi === st.phi) return;
      if (Math.floor(phi / 15) !== Math.floor(st.phi / 15)) Sound.tick();
      st.phi = phi;
      $('#knobRot', el).setAttribute('transform', `rotate(${-phi})`);
      $('#phiTxt', el).innerHTML = `φ = ${phi === 0 ? '0°' : fmt(phi)}<small>${dirText(phi)}</small>`;
      $('#dGo', el).disabled = phi === 0;
    };
    // Re-Marker im Live-Bereich: Pfeilspitzen-ID des umgebenden SVG verwenden
    const mid = $('#dFig svg', el).dataset.mid;
    const origLive = dialLive;
    const fixMarks = (html) => html.replace(/MARK_Y/g, `url(#${mid}y)`);
    const setLive = (phi) => { live().innerHTML = fixMarks(origLive(q, phi)); };
    const knob = $('#knob', el);
    const angAt = (ev) => {
      const r = knob.getBoundingClientRect();
      return (Math.atan2(-(ev.clientY - (r.top + r.height / 2)), ev.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    knob.addEventListener('pointerdown', (ev) => { knob.setPointerCapture(ev.pointerId); st.last = angAt(ev); st.raw = st.phi; });
    knob.addEventListener('pointermove', (ev) => {
      if (st.last == null) return;
      const a = angAt(ev);
      let d = a - st.last; if (d > 180) d -= 360; if (d < -180) d += 360;
      st.last = a; st.raw = clamp(st.raw + d, -360, 360);
      set(snap(st.raw, 5)); setLive(st.phi);
    });
    const up = () => { st.last = null; };
    knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
    $$('[data-d]', el).forEach((b) => (b.onclick = () => { const d = +b.dataset.d; set(d === 0 ? 0 : st.phi + d); st.raw = st.phi; setLive(st.phi); }));
    $('#dGo', el).onclick = () => submitAnswer(st.phi);
    setLive(0);
  }

  /* ---------- Drehzentrum finden ---------- */
  function centerBase(q) {
    return gridLines(true) + poly(q.rect, COL.orig, COL.origFill) + labelsFor(q.rect, vNames(4), COL.orig) +
      poly(q.img, '#ff4d6d', 'rgba(255,77,109,.35)') + labelsFor(q.img, vNames(4, "'"), '#ff8da1');
  }
  function mountCenter(el, q, mode, sol) {
    if (sol) {
      const mine = sol.picked;
      const zOk = mine && Math.abs(mine[0] - q.z[0]) < 0.01 && Math.abs(mine[1] - q.z[1]) < 0.01;
      el.innerHTML = `<div class="qwrap split"><div class="fig">${svgWrap(centerBase(q) + arc(q.z, q.rect[0], q.phi, COL.ok, 'MARK_G') +
        (mine && !zOk ? zMark(mine, '#ffffff', 'du') : '') + zMark(q.z, COL.ok, 'Z'))}</div>
        <div class="answer-panel"><div class="card center"><div class="muted small">Richtig</div>
          <div class="phi-display">Z ${fmtPt(q.z)}</div><div class="phi-display">φ = ${phiText(q.phi)}<small>${dirText(q.phi)}</small></div>
          ${mine ? `<div class="muted small" style="margin-top:8px">Du: Z ${fmtPt(mine)}, φ = ${phiText(mine[2])}</div>` : ''}</div></div></div>`;
      return;
    }
    const st = { z: null, phi: null };
    el.innerHTML = `<div class="qwrap split">
      <div class="fig" id="cFig"></div>
      <div class="answer-panel">
        <div class="card" style="padding:14px"><div class="muted small">Dein Drehzentrum</div><div style="font-size:26px;font-weight:900" id="cTxt">– tippe ins Gitter –</div>
        <div class="muted small">Tipp: Z kann auch auf einer Kästchenmitte liegen.</div></div>
        ${mode === 'play' ? `<div><label class="lbl">Winkelmaß</label><div class="seg three" id="cPhi">
          ${q.choices.map((c) => `<button type="button" data-v="${c}">${phiText(c)}<br><small class="muted">${c === 180 ? 'halbe Drehung' : dirText(c).replace('den ', '')}</small></button>`).join('')}
        </div></div>
        <button class="btn orange big wide" id="cGo" disabled>✅ Abgeben</button>` : ''}
      </div></div>`;
    const ready = () => { const b = $('#cGo', el); if (b) b.disabled = !(st.z && st.phi != null); };
    const draw = () => {
      $('#cFig', el).innerHTML = svgWrap(centerBase(q) + (st.z ? zMark(st.z, COL.yel, 'Z?') : '') +
        (mode === 'play' ? `<rect class="tap-target" x="0" y="0" width="${W}" height="${W}"/>` : ''));
      if (mode !== 'play') return;
      const svg = $('#cFig svg', el);
      svg.addEventListener('pointerdown', (ev) => {
        const g = toGrid(svgPoint(svg, ev));
        st.z = [clamp(snap(g[0], 0.5), 0, N), clamp(snap(g[1], 0.5), 0, N)];
        Sound.click(); draw(); $('#cTxt', el).textContent = 'Z ' + fmtPt(st.z); ready();
      });
    };
    draw();
    if (mode === 'play') {
      $$('#cPhi button', el).forEach((b) => (b.onclick = () => {
        $$('#cPhi button', el).forEach((x) => x.classList.remove('on')); b.classList.add('on'); st.phi = +b.dataset.v; Sound.click(); ready();
      }));
      $('#cGo', el).onclick = () => submitAnswer([st.z[0], st.z[1], st.phi]);
    }
  }

  /* ---------- Messen mit dem Geodreieck ---------- */
  function measureBase(q, solved) {
    const ext = (p) => [q.z[0] + (p[0] - q.z[0]) * 1.22, q.z[1] + (p[1] - q.z[1]) * 1.22];
    const e1 = ext(q.p), e2 = ext(q.q);
    return gridLines(false, true) + circle(q.z, 4, '#4b3474') +
      `<line x1="${X(q.z[0])}" y1="${Y(q.z[1])}" x2="${X(e1[0])}" y2="${Y(e1[1])}" stroke="#ffb057" stroke-width=".6"/>` +
      `<line x1="${X(q.z[0])}" y1="${Y(q.z[1])}" x2="${X(e2[0])}" y2="${Y(e2[1])}" stroke="#c48bff" stroke-width=".6"/>` +
      arc(q.z, q.p, q.phi, solved ? COL.ok : COL.yel, solved ? 'MARK_G' : 'MARK_Y', 0.3, '0') +
      arc(q.z, q.p, q.phi, '#ffd23f99', 'MARK_Y', 1, '1.2 1.2') +
      dot(q.p, COL.orig, 1.6) + dot(q.q, COL.img, 1.6) +
      label(X(q.p[0]) + 3.6, Y(q.p[1]) - 3.6, 'P', COL.orig) + label(X(q.q[0]) + 3.6, Y(q.q[1]) - 3.6, "P'", COL.img) + zMark(q.z) +
      (solved ? label(X(q.z[0]), Y(q.z[1]) + 6, phiText(q.phi), COL.ok) : '');
  }
  function geoSVG() {
    const L = 50;
    let s = `<g id="geo" style="cursor:grab">
      <polygon id="geoBody" points="${-L},0 ${L},0 0,${-L}" fill="rgba(170,255,210,.18)" stroke="#bfffe0" stroke-width=".5"/>`;
    for (let a = 0; a <= 180; a += 1) {
      const t = (a * Math.PI) / 180;
      const len = a % 10 === 0 ? 4.5 : a % 5 === 0 ? 3 : 1.6;
      const r1 = 33, r0 = r1 - len;
      s += `<line x1="${Math.cos(t) * r0}" y1="${-Math.sin(t) * r0}" x2="${Math.cos(t) * r1}" y2="${-Math.sin(t) * r1}" stroke="#e8fff4" stroke-width="${a % 10 ? 0.12 : 0.25}" pointer-events="none"/>`;
      if (a % 10 === 0) {
        s += `<text x="${Math.cos(t) * 26}" y="${-Math.sin(t) * 26}" font-size="2.5" fill="#e8fff4" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="800" pointer-events="none">${a}</text>`;
        if (a % 30 === 0) s += `<text x="${Math.cos(t) * 21.5}" y="${-Math.sin(t) * 21.5}" font-size="2" fill="#9fe3ff" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="800" pointer-events="none">${180 - a}</text>`;
      }
    }
    for (let x = -L + 2; x <= L - 2; x += 1) {
      const big = x % 10 === 0;
      s += `<line x1="${x}" y1="0" x2="${x}" y2="${big ? -3 : x % 5 === 0 ? -2 : -1}" stroke="#e8fff4" stroke-width="${big ? 0.25 : 0.1}" pointer-events="none"/>`;
      if (big && x) s += `<text x="${x}" y="-4.6" font-size="2.2" fill="#e8fff4" text-anchor="middle" font-family="Nunito" pointer-events="none">${Math.abs(x / 10)}</text>`;
    }
    s += `<circle r="1.2" fill="none" stroke="#ff3355" stroke-width=".4" pointer-events="none"/><line x1="0" y1="-3" x2="0" y2="0" stroke="#ff3355" stroke-width=".4" pointer-events="none"/>
      <text x="0" y="${-L + 18}" font-size="3" fill="#bfffe0" text-anchor="middle" font-family="Nunito" font-weight="900" pointer-events="none">Geodreieck</text>
      <g id="geoRotH" style="cursor:alias"><circle cx="0" cy="${-L + 9}" r="4.2" fill="#ff7a1a" stroke="#fff" stroke-width=".5"/><text x="0" y="${-L + 9}" font-size="4.5" text-anchor="middle" dominant-baseline="central" pointer-events="none">🔄</text></g>
    </g>`;
    return s;
  }
  function mountMeasure(el, q, mode, sol) {
    if (sol) {
      const mine = sol.picked;
      el.innerHTML = `<div class="qwrap split"><div class="fig">${svgWrap(measureBase(q, true))}</div>
        <div class="answer-panel"><div class="card center"><div class="muted small">Richtig</div><div class="phi-display">φ = ${phiText(q.phi)}<small>${dirText(q.phi)}</small></div>
        ${mine != null ? `<div class="muted small" style="margin-top:8px">Du: φ = ${phiText(mine)} (±${q.tol}° war erlaubt)</div>` : ''}</div></div></div>`;
      return;
    }
    const st = { x: X(q.z[0]) - 4, y: Y(q.z[1]) + 34, r: 0, sign: null };
    el.innerHTML = `<div class="qwrap split">
      <div class="fig" id="mFig">${svgWrap(measureBase(q, false) + (mode === 'play' ? geoSVG() : ''))}</div>
      <div class="answer-panel">
        ${mode === 'play' ? `
        <div class="tools">
          <button class="btn small ghost" data-r="-15">⟲ 15°</button><button class="btn small ghost" data-r="-1">⟲ 1°</button>
          <button class="btn small ghost" data-r="1">⟳ 1°</button><button class="btn small ghost" data-r="15">⟳ 15°</button>
          <button class="btn small purple" id="geoZ">🧲 an Z anlegen</button>
        </div>
        <p class="muted small center" style="margin:0">Geodreieck verschieben: ziehen · Drehen: 🔄 ziehen</p>
        <div><label class="lbl">In welche Richtung wurde gedreht?</label>
          <div class="seg sign-seg" id="mSign">
            <button type="button" data-v="1">↺ gegen den<br>Uhrzeigersinn (+)</button>
            <button type="button" data-v="-1">↻ im<br>Uhrzeigersinn (−)</button>
          </div></div>
        <div><label class="lbl" for="mVal">Gemessener Winkel in Grad</label>
          <input class="input" id="mVal" type="number" inputmode="numeric" min="0" max="360" placeholder="z. B. 70"></div>
        <button class="btn orange big wide" id="mGo" disabled>✅ Abgeben</button>` : `<p class="muted center">Die Schüler messen jetzt mit dem Geodreieck 📐</p>`}
      </div></div>`;
    if (mode !== 'play') return;
    const svg = $('#mFig svg', el), geo = $('#geo', el);
    const apply = () => geo.setAttribute('transform', `translate(${st.x.toFixed(2)},${st.y.toFixed(2)}) rotate(${st.r.toFixed(1)})`);
    apply();
    let drag = null;
    const zx = X(q.z[0]), zy = Y(q.z[1]);
    $('#geoBody', el).addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); svg.setPointerCapture(ev.pointerId);
      const p = svgPoint(svg, ev); drag = { mode: 'move', dx: p.x - st.x, dy: p.y - st.y };
    });
    $('#geoRotH', el).addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation(); svg.setPointerCapture(ev.pointerId);
      drag = { mode: 'rot' };
    });
    svg.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      const p = svgPoint(svg, ev);
      if (drag.mode === 'move') { st.x = p.x - drag.dx; st.y = p.y - drag.dy; }
      else { st.r = Math.round(((Math.atan2(p.y - st.y, p.x - st.x) * 180) / Math.PI + 90) * 2) / 2; }
      apply();
    });
    const up = () => {
      if (drag && drag.mode === 'move' && Math.hypot(st.x - zx, st.y - zy) < 3.5) { st.x = zx; st.y = zy; apply(); toast('🧲 Angelegt!', 1200); Sound.click(); }
      drag = null;
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    $$('[data-r]', el).forEach((b) => (b.onclick = () => { st.r += +b.dataset.r; apply(); }));
    $('#geoZ', el).onclick = () => { st.x = zx; st.y = zy; apply(); Sound.click(); };
    const ready = () => { const v = parseFloat($('#mVal', el).value); $('#mGo', el).disabled = !(st.sign && v > 0 && v <= 360); };
    $$('#mSign button', el).forEach((b) => (b.onclick = () => {
      $$('#mSign button', el).forEach((x) => x.classList.remove('on')); b.classList.add('on'); st.sign = +b.dataset.v; Sound.click(); ready();
    }));
    $('#mVal', el).addEventListener('input', ready);
    $('#mGo', el).onclick = () => submitAnswer(st.sign * Math.abs(parseFloat($('#mVal', el).value)));
  }

  /* ================================================================== */
  /*  Joker                                                              */
  /* ================================================================== */
  function jokerBarHTML(q) {
    const j = S.jokers;
    const can50 = q.type === 'mc' && q.options.length === 4;
    const b = (id, em, name, ok, title) => `<button class="joker" id="${id}" ${ok ? '' : 'disabled'} title="${esc(title)}"><span>${em}</span>${name}</button>`;
    return `<div class="joker-bar" role="group" aria-label="Joker">
      ${b('jFifty', '✂️', '50:50', j.fifty && can50, can50 ? 'Zwei falsche Antworten verschwinden' : 'Nur bei Fragen mit 4 Antworten')}
      ${b('jHint', '🔮', 'Tipp', j.hint && !!(q.hint || q.explain), 'Ein Geist flüstert dir einen Tipp')}
      ${Net.hasDouble ? b('jDouble', '⚡', '×2', j.double, 'Doppelte Punkte bei dieser Frage (wenn richtig)') : ''}
    </div>`;
  }
  function mountJokers(q) {
    const i = S.room.q_index;
    const f = $('#jFifty'), h = $('#jHint'), d = $('#jDouble');
    if (f) f.onclick = () => {
      S.jokers.fifty = false; f.disabled = true; saveSession(); Sound.spooky();
      const wrong = [0, 1, 2, 3].filter((k) => k !== q.answer).sort(() => Math.random() - 0.5).slice(0, 2);
      wrong.forEach((k) => { const o = $(`#playArea [data-k="${k}"]`); if (o) { o.classList.add('gone'); o.disabled = true; } });
    };
    if (h) h.onclick = () => {
      S.jokers.hint = false; h.disabled = true; saveSession(); Sound.spooky();
      const box = $('#hintBox');
      box.textContent = '🔮 ' + (q.hint || hintFromExplain(q));
      box.classList.remove('hidden');
    };
    if (d) d.onclick = () => {
      if (!S.jokers.double) return;
      S.armDouble = S.armDouble === i ? null : i;
      d.classList.toggle('armed', S.armDouble === i); Sound.click();
      toast(S.armDouble === i ? '⚡ Doppelte Punkte aktiv – wenn du richtig liegst!' : 'Joker wieder weggelegt', 1800);
    };
  }
  function hintFromExplain(q) {
    if (q.blitz) return 'Denk an die Merksätze aus dem Heft: Z bleibt liegen, positiv = gegen den Uhrzeigersinn.';
    if (q.fig && q.fig.kind === 'clock') return 'Eine volle Stunde sind 360°. Wie viel Grad sind dann 1 Minute?';
    if (q.fig && q.fig.kind === 'arc') return 'Schau, in welche Richtung der Pfeil läuft: gegen den Uhrzeigersinn = positiv.';
    if (/gleichen Ergebnis/.test(q.text)) return 'Zwei Drehungen führen zum gleichen Bild, wenn ihre Beträge zusammen 360° ergeben.';
    if (q.type === 'mcfig') return 'Verfolge eine einzige Ecke: Wohin wandert sie bei dieser Drehung um Z?';
    return 'Lies die Frage nochmal ganz genau – auf das Vorzeichen kommt es an!';
  }

  /* ================================================================== */
  /*  Emoji-Reaktionen                                                   */
  /* ================================================================== */
  const REACTS = ['🎃', '👻', '💀', '😱', '🔥', '👏', '🤯', '🍬'];
  function addReactBar() {
    if (!S.react || $('#reactBar')) return;
    const bar = document.createElement('div');
    bar.id = 'reactBar'; bar.className = 'react-bar';
    bar.innerHTML = REACTS.map((e) => `<button type="button" data-e="${e}" aria-label="Reaktion ${e}">${e}</button>`).join('');
    document.body.appendChild(bar);
    bar.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => {
      const t = Date.now();
      if (t - S.lastReact < 700) return;
      S.lastReact = t;
      const me = S.players.find((p) => p.id === S.playerId);
      const who = me ? me.name : (S.role === 'host' ? 'Lehrer' : '');
      try { S.react.send({ e: b.dataset.e, n: who.slice(0, 16) }); } catch (e) { /* egal */ }
    }));
  }
  function removeReactBar() { const b = $('#reactBar'); if (b) b.remove(); }
  function showReaction(p) {
    if (!p || !REACTS.includes(p.e)) return;
    const el = document.createElement('div');
    el.className = 'react-float';
    el.innerHTML = `<span class="re">${p.e}</span>${p.n ? `<span class="rn">${esc(String(p.n).slice(0, 16))}</span>` : ''}`;
    el.style.left = (8 + Math.random() * 84) + 'vw';
    document.body.appendChild(el);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const drift = (Math.random() - 0.5) * 80;
    const anim = el.animate(reduce
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : [{ transform: 'translate(-50%, 0) scale(0.9)', opacity: 0 }, { transform: `translate(calc(-50% + ${drift / 2}px), -18vh) scale(1.1)`, opacity: 1, offset: 0.2 }, { transform: `translate(calc(-50% + ${drift}px), -62vh) scale(1)`, opacity: 0 }],
      { duration: 2600, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
    anim.onfinish = () => el.remove();
  }

  /* ---------- kleine Effekte ---------- */
  function popAnim(el) {
    if (!el.animate) return;
    el.animate([{ transform: 'scale(0.8)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
  function countUp(el, to) {
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || to <= 0) { el.textContent = '+' + to; return; }
    const t0 = performance.now(), dur = 900;
    (function f(t) {
      const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = '+' + Math.round(to * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ================================================================== */
  /*  Auflösung                                                          */
  /* ================================================================== */
  function leaderboardHTML(limit = 5) {
    const list = players();
    const meIdx = list.findIndex((p) => p.id === S.playerId);
    const medal = ['🥇', '🥈', '🥉'];
    const row = (p, i) => `<div class="lb-row ${p.id === S.playerId ? 'me' : ''}"><span class="rk">${medal[i] || i + 1}</span>${avatarHTML(p.avatar, 'sm')}
      <span class="nm">${esc(p.name)}${p.streak >= 3 ? ' 🔥' : ''}</span><span class="sc">${p.score}</span></div>`;
    let s = list.slice(0, limit).map(row).join('');
    if (meIdx >= limit) s += `<div class="muted center small">…</div>` + row(list[meIdx], meIdx);
    return `<div class="lb">${s || '<p class="muted">Noch keine Spieler</p>'}</div>`;
  }
  async function renderReveal() {
    const i = S.room.q_index, q = curQ(), qs = S.room.questions;
    let res = S.results[i];
    const mine = S.myAns[i];
    app.innerHTML = `<div class="stack"><div class="card center"><div class="muted">Lade Auflösung … 👻</div></div></div>`;
    if (iPlay() && !res && mine != null) {
      try { const a = await Net.myAnswer(S.code, i, S.playerId); if (a) res = S.results[i] = { correct: a.correct, points: a.points }; } catch (e) { /* egal */ }
    }
    if (S.room.q_index !== i || S.room.status !== 'reveal') return;
    let banner = '';
    if (iPlay()) {
      if (mine == null) { banner = `<div class="result-banner late">⏰ Zu langsam!<span class="pts">+0</span></div>`; Sound.bad(); }
      else if (res && res.correct) {
        banner = `<div class="result-banner ok">✅ Richtig!<span class="pts" data-count="${res.points}">+0</span>${res.double ? '<div class="small">⚡ Doppelte Punkte!</div>' : ''}${res.bonus ? `<div class="small">🔥 ${res.streak}er-Serie: +${res.bonus} Bonus</div>` : ''}</div>`;
        Sound.ok(); if (res.streak >= 3) confetti(1800);
      } else { banner = `<div class="result-banner no">❌ Leider falsch<span class="pts">+0</span></div>`; Sound.bad(); }
    }
    let stats = '';
    if (S.role === 'host') {
      const ok = S.answers.filter((a) => a.correct).length, wr = S.answers.length - ok, none = Math.max(0, S.players.length - S.answers.length);
      const mx = Math.max(1, ok, wr, none);
      const bar = (n, col, em) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div class="bar" style="height:${20 + (n / mx) * 90}px;background:${col}">${n}</div><span>${em}</span></div>`;
      stats = `<div class="card"><div class="dist">${bar(ok, '#18b26b', '✅')}${bar(wr, '#e8344f', '❌')}${bar(none, '#5b6478', '⏰')}</div></div>`;
    }
    const last = i >= qs.length - 1;
    const nextLvl = !last && qs[i + 1].lvl !== q.lvl ? LEVELS[qs[i + 1].lvl] : null;
    const me = S.players.find((p) => p.id === S.playerId);
    const rank = me ? players().findIndex((p) => p.id === S.playerId) + 1 : 0;
    const prev = S.ranks[i - 1];
    if (rank) { S.ranks[i] = rank; saveSession(); }
    const move = rank && prev ? prev - rank : 0;
    const moveTxt = move > 0 ? `<span class="move up">▲ ${move} ${move === 1 ? 'Platz' : 'Plätze'} hoch</span>` : move < 0 ? `<span class="move down">▼ ${-move}</span>` : '';
    app.innerHTML = `
      <div class="stack">
        ${banner}
        <div class="qwrap split">
          <div class="card stack">
            <div class="qhead" style="margin:0"><span class="lvl lvl${q.lvl}">${LEVELS[q.lvl].em} Frage ${i + 1}/${qs.length}</span></div>
            <p class="qtext" style="margin:0;font-size:20px">${esc(q.text)}</p>
            <div id="solArea"></div>
            <div class="explain">💡 ${esc(q.explain || '')}</div>
          </div>
          <div class="stack">
            ${stats}
            <div class="card stack"><h3>🏆 Rangliste</h3>${leaderboardHTML(5)}
              ${rank ? `<div class="center muted">Du bist auf Platz <b style="color:var(--text)">${rank}</b> von ${S.players.length} ${moveTxt}</div>` : ''}</div>
            ${nextLvl ? `<div class="card center"><b>Achtung!</b> Als Nächstes: ${nextLvl.em} Level ${qs[i + 1].lvl} · ${nextLvl.name}</div>` : ''}
            ${S.role === 'host' ? `<button class="btn green big wide" id="nextBtn">${last ? '🏆 Zum Siegerpodest' : '▶ Nächste Frage'}</button>` : '<p class="muted center">Gleich geht\'s weiter … 👀</p>'}
          </div>
        </div>
      </div>`;
    const sol = { picked: mine == null ? null : mine };
    const area = $('#solArea');
    if (q.type === 'mc') mountMC(area, q, 'show', sol);
    else if (q.type === 'mcfig') mountMCFig(area, q, 'show', sol);
    else if (q.type === 'point') mountPoint(area, q, 'show', sol);
    else if (q.type === 'dial') mountDial(area, q, 'show', sol);
    else if (q.type === 'center') mountCenter(area, q, 'show', sol);
    else if (q.type === 'measure') mountMeasure(area, q, 'show', sol);
    const nb = $('#nextBtn'); if (nb) nb.onclick = () => hostGoTo(i + 1);
    const cnt = $('[data-count]'); if (cnt) countUp(cnt, +cnt.dataset.count);
  }

  /* ================================================================== */
  /*  Siegerpodest                                                       */
  /* ================================================================== */
  function renderFinal() {
    const list = players();
    const pod = (p, place) => p ? `<div class="pod p${place}">${place === 1 ? '<div class="crown">👑</div>' : ''}${avatarHTML(p.avatar, place === 1 ? 'xl' : 'lg')}
      <div class="nm">${esc(p.name)}</div><div class="block"><span class="place">${place}</span><span>${p.score}</span></div></div>` : `<div class="pod p${place}" style="visibility:hidden"><div class="block"></div></div>`;
    const meIdx = list.findIndex((p) => p.id === S.playerId);
    const rest = list.slice(3, 5);
    app.innerHTML = `
      <div class="stack center">
        <h1 class="hero-title" style="font-size:clamp(46px,10vw,90px)">Siegerehrung</h1>
        <div class="podium">${pod(list[1], 2)}${pod(list[0], 1)}${pod(list[2], 3)}</div>
        ${rest.length ? `<div class="card lb" style="max-width:520px;margin:10px auto 0;width:100%">${rest.map((p, k) => `<div class="lb-row ${p.id === S.playerId ? 'me' : ''}"><span class="rk">${k + 4}</span>${avatarHTML(p.avatar, 'sm')}<span class="nm" style="text-align:left">${esc(p.name)}</span><span class="sc">${p.score}</span></div>`).join('')}</div>` : ''}
        ${meIdx >= 0 ? `<div class="card" style="max-width:520px;margin:0 auto;width:100%"><b style="font-size:22px">Du bist auf Platz ${meIdx + 1}! ${meIdx === 0 ? '🏆 Champion!' : meIdx < 3 ? '🎉 Aufs Podest geschafft!' : '💪 Stark gekämpft!'}</b>
          <div class="muted">${list[meIdx].score} Punkte</div></div>` : ''}
        <div class="row center">
          ${S.role === 'host' ? '<button class="btn orange big" id="again">🔁 Nochmal spielen (neue Fragen)</button>' : ''}
          <button class="btn ghost" id="homeBtn">🏠 Startseite</button>
        </div>
      </div>`;
    Sound.fanfare(); setTimeout(() => confetti(5000), 1500);
    $('#homeBtn').onclick = () => goHome();
    const ag = $('#again');
    if (ag) ag.onclick = async () => {
      ag.disabled = true;
      try { await Net.reset(S.code, S.hostId, GMQ.buildQuestions(S.room.questions.length, roomDiff())); await refresh(); }
      catch (e) { ag.disabled = false; toast(/host_reset|function/i.test(e.message) ? 'Nochmal spielen klappt erst nach dem Datenbank-Update. Erstell einfach einen neuen Raum 🪄' : '😱 ' + e.message, 6000); }
    };
  }

  /* ================================================================== */
  /*  Start                                                              */
  /* ================================================================== */
  (async function boot() {
    app.innerHTML = `<div class="home"><div style="font-size:70px" class="bounce">👻</div><div class="muted">Verbinde mit der Geisterwelt …</div></div>`;
    try { await Net.init(); } catch (e) { toast('📡 Keine Verbindung: ' + e.message, 6000); }
    const saved = sess.get('gm_session');
    if (saved && saved.code) {
      try {
        const room = await Net.getRoom(saved.code);
        if (room) {
          Object.assign(S, { role: saved.role, code: saved.code, hostId: saved.hostId, playerId: saved.playerId, hostPlays: saved.hostPlays, myAns: saved.myAns || {}, results: saved.results || {}, round: saved.round || 0, jokers: saved.jokers || freshJokers(), ranks: saved.ranks || {}, room });
          if ((room.round || 0) !== S.round) { S.myAns = {}; S.results = {}; S.jokers = freshJokers(); S.ranks = {}; }
          if (S.role === 'player') S.seenMe = true;
          await enterRoom();
          return;
        }
      } catch (e) { /* weiter zur Startseite */ }
      sess.del('gm_session');
    }
    let code = '';
    try { code = (new URLSearchParams(location.search).get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); } catch (e) { /* egal */ }
    if (code) studentJoin(code); else goHome();
  })();

  // Debug-/Testzugriff
  window.__gm = { S, refresh, showReaction };
})();
