/* Ghost Math – Aufgaben-Generator (Thema Drehung, 8. Klasse) */
(function (root) {
  'use strict';

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const round = (v) => Math.round(v * 1000) / 1000;

  // Punkt p um Zentrum z mit Winkel deg drehen (mathematisch positiv = gegen den Uhrzeigersinn)
  function rot(p, z, deg) {
    const r = (deg * Math.PI) / 180;
    const dx = p[0] - z[0], dy = p[1] - z[1];
    return [round(z[0] + dx * Math.cos(r) - dy * Math.sin(r)), round(z[1] + dx * Math.sin(r) + dy * Math.cos(r))];
  }
  const rotPoly = (pts, z, deg) => pts.map((p) => rot(p, z, deg));
  const inGrid = (pts, max = 10) => pts.every(([x, y]) => x >= 0 && y >= 0 && x <= max && y <= max);
  const norm = (a) => ((a % 360) + 360) % 360;
  const fmt = (a) => (a > 0 ? '+' : a < 0 ? '−' : '') + Math.abs(a) + '°';

  // Multiple-Choice: Antwort-Optionen mischen und Index der richtigen merken
  function mc(lvl, text, correct, wrong, extra = {}) {
    const opts = shuffle([correct, ...wrong.slice(0, 3)]);
    return Object.assign({ lvl, type: 'mc', time: 20, text, options: opts, answer: opts.indexOf(correct) }, extra);
  }

  /* ---------------- Level 1: Kürbis (Grundbegriffe) ---------------- */
  const L1 = [
    () => mc(1, 'Welche Drehrichtung ist die positive Drehrichtung?', 'Gegen den Uhrzeigersinn',
      ['Mit dem Uhrzeigersinn', 'Immer nach rechts', 'Es gibt keine positive Richtung'],
      { explain: 'Positiv (φ > 0°) dreht man entgegen dem Uhrzeigersinn.' }),
    () => mc(1, 'Welcher Punkt bleibt bei einer Drehung als einziger an seiner Stelle?', 'Das Drehzentrum Z',
      ['Der Urpunkt P', 'Der Bildpunkt P\'', 'Kein einziger Punkt'],
      { explain: 'Das Drehzentrum Z ist der einzige Fixpunkt.' }),
    () => mc(1, 'Urpunkt P und Bildpunkt P\' liegen immer …', 'auf einem Kreis um Z',
      ['auf einer Geraden durch Z', 'genau übereinander', 'auf einer Parallelen zur x-Achse'],
      { explain: 'Bei einer Drehung bewegt sich jeder Punkt auf einem Kreis um Z.' }),
    () => mc(1, 'Was braucht man, um eine Drehung festzulegen?', 'Drehzentrum, Winkelmaß und Drehrichtung',
      ['Nur das Drehzentrum', 'Eine Spiegelachse', 'Zwei Punkte und eine Gerade'],
      { explain: 'Eine Drehung wird durch Z, φ und die Drehrichtung festgelegt.' }),
    () => mc(1, 'Wie liest man  P ↦ P\'  (Z; φ)?', 'P wird durch Drehung um Z mit φ auf P\' abgebildet',
      ['P\' wird um den Punkt P gedreht', 'Z wird auf P abgebildet', 'P wird um φ Kästchen verschoben'],
      { explain: 'Lies: P wird abgebildet auf P\' durch Drehung um Z mit dem Winkelmaß φ.' }),
    () => {
      const a = pick([30, 45, 60, 90, 120]);
      return mc(1, `Was bedeutet φ = −${a}°?`, `Drehung um ${a}° im Uhrzeigersinn`,
        [`Drehung um ${a}° gegen den Uhrzeigersinn`, `Verschiebung um ${a} Kästchen nach links`, 'Es wird gar nicht gedreht'],
        { explain: 'Ein negatives Winkelmaß bedeutet: Drehung im Uhrzeigersinn.' });
    },
    () => mc(1, 'Ist die Bildfigur nach einer Drehung genauso groß wie die Originalfigur?', 'Ja, sie ist deckungsgleich',
      ['Nein, sie wird größer', 'Nein, sie wird kleiner', 'Nur bei einer Drehung um 180°'],
      { explain: 'Beim Drehen ändern sich Längen und Winkel nicht – die Figur bleibt deckungsgleich.' }),
    () => mc(1, 'Wie viele Fixpunkte hat eine Drehung um Z mit φ = 90°?', 'Genau einen: Z',
      ['Keinen', 'Zwei', 'Unendlich viele'],
      { explain: 'Nur Z bleibt liegen – alle anderen Punkte wandern auf ihrem Kreis.' }),
    () => {
      const a = pick([40, 75, 110]);
      return mc(1, `Ein Punkt P wird um Z mit φ = ${a}° gedreht. Wie groß ist der Winkel ∢PZP'?`, `${a}°`,
        [`${180 - a}°`, `${360 - a}°`, `${a * 2}°`],
        { explain: `Der Winkel zwischen [ZP] und [ZP'] ist genau das Drehwinkelmaß: ${a}°.` });
    },
  ];

  /* ---------------- Level 2: Geist (Winkel & Richtung) ---------------- */
  function angleSwap() {
    const a = pick([-90, -60, -120, -45, -30, -150, 90, 60, 120, 45, 30, 150, 270, -270, 300, -300, 240, -240]);
    const correct = a > 0 ? a - 360 : a + 360;
    const pool = [-a, 180 - Math.abs(a), a > 0 ? 360 - a : -(360 + a), a * 2, correct > 0 ? -correct + 360 : correct - 180]
      .filter((v) => v !== correct && v !== a && Math.abs(v) <= 360 && v !== 0);
    const wrong = [...new Set(pool)].slice(0, 3);
    while (wrong.length < 3) {
      const v = pick([45, 135, 210, -210, 315, -315, 15, -15]);
      if (v !== correct && v !== a && !wrong.includes(v)) wrong.push(v);
    }
    return mc(2, `Eine Drehung mit φ = ${fmt(a)} führt zum gleichen Ergebnis wie eine Drehung mit …`, `φ = ${fmt(correct)}`,
      wrong.map((w) => `φ = ${fmt(w)}`),
      { explain: `${Math.abs(a)}° ${a > 0 ? 'gegen' : 'mit dem'} Uhrzeigersinn ist dasselbe wie ${Math.abs(correct)}° ${correct > 0 ? 'gegen' : 'mit dem'} Uhrzeigersinn, denn ${Math.abs(a)}° + ${Math.abs(correct)}° = 360°.` });
  }

  function clockQ() {
    const m = pick([15, 30, 45, 10, 20, 5]);
    const deg = m * 6;
    const correct = `φ = −${deg}°`;
    const wrong = [`φ = +${deg}°`, `φ = −${deg * 2 > 360 ? deg / 2 : deg * 2}°`, `φ = −${m}°`];
    return mc(2, `🕰️ Der Minutenzeiger einer Uhr dreht sich um die Mitte. Welches Winkelmaß gehört zu ${m} Minuten?`, correct, wrong,
      { fig: { kind: 'clock', min: m }, explain: `In 60 Minuten dreht der Zeiger 360°, also 6° pro Minute: ${m} · 6° = ${deg}°. Er dreht im Uhrzeigersinn → negativ.` });
  }

  function directionQ() {
    // Punkt P auf dem Gitter, Drehung um ±a; Bogenpfeil zeigt die Richtung
    for (let t = 0; t < 50; t++) {
      const a = pick([90, 90, 180, 45, 135]);
      const sign = a === 180 ? 1 : pick([1, -1]);
      const phi = a * sign;
      const z = [5, 5];
      const r = pick([3, 4]);
      const startAng = pick([0, 90, 180, 270, 45, 135]);
      const p = rot([z[0] + r, z[1]], z, startAng);
      const q = rot(p, z, phi);
      if (!inGrid([p, q])) continue;
      const correct = a === 180 ? 'φ = 180°' : `φ = ${fmt(phi)}`;
      const wrongAll = a === 180 ? ['φ = 90°', 'φ = −90°', 'φ = 360°'] : [`φ = ${fmt(-phi)}`, `φ = ${fmt(sign * (180 - a) || 180)}`, `φ = ${fmt(sign * (360 - a))}`];
      const wrong = [...new Set(wrongAll)].filter((w) => w !== correct);
      while (wrong.length < 3) wrong.push(pick(['φ = 30°', 'φ = −60°', 'φ = 270°']));
      return mc(2, 'Der Pfeil zeigt, wie P um Z auf P\' gedreht wurde. Welches Winkelmaß stimmt?', correct, wrong,
        { fig: { kind: 'arc', z, p, q, phi }, explain: `Der Pfeil läuft ${phi >= 0 ? 'gegen' : 'mit dem'} Uhrzeigersinn um ${a}° → ${correct}.` });
    }
    return angleSwap();
  }

  const L2 = [
    angleSwap,
    angleSwap,
    clockQ,
    directionQ,
    directionQ,
    () => mc(2, 'Du drehst eine Figur um 360°. Was passiert?', 'Sie liegt wieder genau auf ihrer Ausgangslage',
      ['Sie liegt spiegelverkehrt da', 'Sie steht auf dem Kopf', 'Sie ist doppelt so groß'],
      { explain: '360° ist eine volle Umdrehung – alles liegt wieder am Anfang.' }),
    () => {
      const a = pick([60, 90, 120]);
      return mc(2, `Erst drehst du um Z mit φ = +${a}°, danach nochmal um Z mit φ = −${a}°. Wo landet die Figur?`, 'Wieder an der Ausgangslage',
        [`Um ${2 * a}° gedreht`, `Um ${a}° im Uhrzeigersinn gedreht`, 'Gespiegelt an Z'],
        { explain: `+${a}° und −${a}° heben sich auf: ${a}° − ${a}° = 0°.` });
    },
  ];

  /* ---------------- Level 3: Fledermaus (zum Selbermachen) ---------------- */
  const SHAPES = [
    [[0, 0], [3, 0], [0, 2]],
    [[0, 0], [2, 0], [1, 3]],
    [[0, 0], [3, 1], [1, 2]],
    [[0, 0], [2, 0], [2, 2], [0, 1]],
  ];

  function placeShape(phis, max = 10) {
    for (let t = 0; t < 400; t++) {
      const base = pick(SHAPES);
      const z = [rnd(3, 7), rnd(3, 7)];
      const ang = pick([0, 90, 180, 270]);
      const off = [rnd(-3, 3), rnd(-3, 3)];
      let pts = base.map((p) => rot(p, [0, 0], ang)).map(([x, y]) => [x + z[0] + off[0], y + z[1] + off[1]]);
      // Z soll nicht in der Figur liegen und Figur nicht zu nah
      if (pts.some(([x, y]) => x === z[0] && y === z[1])) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (Math.hypot(cx - z[0], cy - z[1]) < 1.8) continue;
      if (!inGrid(pts, max)) continue;
      if (!phis.every((f) => inGrid(rotPoly(pts, z, f), max))) continue;
      return { z, pts };
    }
    return { z: [5, 5], pts: [[6, 5], [8, 5], [6, 7]] };
  }

  function pointQ() {
    for (let t = 0; t < 200; t++) {
      const phi = pick([90, -90, 180, 90, -90]);
      const z = [rnd(3, 7), rnd(3, 7)];
      const a = [z[0] + rnd(-3, 3), z[1] + rnd(-3, 3)];
      if (a[0] === z[0] && a[1] === z[1]) continue;
      if (Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) < 2) continue;
      const b = rot(a, z, phi);
      if (!inGrid([a, b])) continue;
      return {
        lvl: 3, type: 'point', time: 30, z, a, phi, answer: b,
        text: `📍 Drehe A um Z mit φ = ${phi === 180 ? '180°' : fmt(phi)}. Tippe auf die Stelle, wo A' landet!`,
        explain: `A' liegt auf dem Kreis um Z durch A, und ∢AZA' = ${Math.abs(phi)}° ${phi > 0 ? 'gegen den' : phi < 0 ? 'im' : ''} Uhrzeigersinn${phi === 180 ? ' (genau gegenüber)' : ''}.`,
      };
    }
  }

  function dialShadowQ() {
    const phi = pick([90, -90, 180, 60, -60, 120, -45, 45, -120]);
    const { z, pts } = placeShape([phi]);
    return {
      lvl: 3, type: 'dial', time: 35, z, pts, target: phi, shadow: true,
      text: '🌀 Dreh das Dreieck mit dem Drehrad um Z, bis es genau auf dem Geister-Schatten liegt!',
      explain: `Der Schatten ist die Bildfigur bei φ = ${fmt(phi)}${Math.abs(phi) !== 180 ? ` (oder ${fmt(phi > 0 ? phi - 360 : phi + 360)})` : ''}.`,
    };
  }

  const sameShape = (a, b) => {
    const key = (pts) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).sort().join(';');
    return key(a) === key(b);
  };

  function mcFigQ() {
    for (let t = 0; t < 60; t++) {
      const phi = pick([90, -90, 180, 90, -90, 60, -60]);
      const cands = [-phi, 180, phi + (phi > 0 ? 90 : -90), 90, -90];
      const others = [];
      for (const c of cands) {
        if (norm(c) !== norm(phi) && !others.some((o) => norm(o) === norm(c))) others.push(c);
        if (others.length === 2) break;
      }
      const { z, pts } = placeShape([phi, ...others]);
      const variants = [
        { pts: rotPoly(pts, z, phi), ok: true },
        ...others.map((f) => ({ pts: rotPoly(pts, z, f), ok: false })),
        // gespiegelt an der senkrechten Geraden durch Z (keine Drehung!)
        { pts: rotPoly(pts, z, phi).map(([x, y]) => [round(2 * z[0] - x), y]), ok: false },
      ];
      const distinct = variants.every((v, i) => variants.every((w, j) => i === j || !sameShape(v.pts, w.pts)));
      if (!distinct || !variants.every((v) => inGrid(v.pts))) continue;
      const opts = shuffle(variants);
    return {
      lvl: 3, type: 'mcfig', time: 30, z, pts, phi,
      text: `🦇 Welches Bild zeigt die Drehung um Z mit φ = ${phi === 180 ? '180°' : fmt(phi)}?`,
      options: opts.map((o) => o.pts), answer: opts.findIndex((o) => o.ok),
      explain: phi === 180
        ? 'Richtig ist die Figur, bei der jeder Punkt genau gegenüber auf der anderen Seite von Z liegt (180°).'
        : `Richtig ist die Figur, bei der jeder Punkt um ${Math.abs(phi)}° ${phi > 0 ? 'gegen den' : 'im'} Uhrzeigersinn um Z gewandert ist.`,
      };
    }
    return pointQ();
  }

  const L3 = [pointQ, pointQ, dialShadowQ, dialShadowQ, mcFigQ, mcFigQ];

  /* ---------------- Level 4: Endboss ---------------- */
  function centerQ() {
    for (let t = 0; t < 400; t++) {
      const w = rnd(2, 4), h = rnd(1, 2);
      const ax = rnd(1, 5), ay = rnd(1, 5);
      const rect = [[ax, ay], [ax + w, ay], [ax + w, ay + h], [ax, ay + h]]; // A B C D
      const phi = pick([90, -90, 180, 90, -90]);
      let z;
      const mode = pick(['vertex', 'vertex', 'mid']);
      if (mode === 'vertex') z = pick(rect);
      else if (phi === 180) z = [rect[2][0] - 0.5, rect[2][1] - 0.5]; // Mitte des überdeckten Kästchens (wie S. 37/2 d)
      else z = [ax + w, ay + h + 1]; // Punkt außerhalb des Rechtecks
      const img = rotPoly(rect, z, phi);
      if (!inGrid(rect) || !inGrid(img)) continue;
      return {
        lvl: 4, type: 'center', time: 45, rect, img, z, phi,
        text: '🎯 Das Rechteck ABCD wurde gedreht (hell = Original, rot = Bild). Tippe auf das Drehzentrum Z und wähle das Winkelmaß!',
        choices: [90, -90, 180],
        explain: `Z = (${z[0]}|${z[1]}), φ = ${phi === 180 ? '180°' : fmt(phi) + ' (oder ' + fmt(phi > 0 ? phi - 360 : phi + 360) + ')'}.`,
      };
    }
  }

  function measureQ() {
    const a = pick([35, 40, 50, 55, 65, 70, 80, 100, 110, 125, 130, 145]);
    const sign = pick([1, -1]);
    const phi = a * sign;
    const start = rnd(0, 11) * 30;
    const r = 4;
    const z = [5, 5];
    const p = rot([z[0] + r, z[1]], z, start);
    const q = rot(p, z, phi);
    return {
      lvl: 4, type: 'measure', time: 45, z, p, q, phi, answer: phi, tol: 4,
      text: '📐 Leg das Geodreieck an und miss: Mit welchem Winkelmaß wurde P um Z auf P\' gedreht? (Vorzeichen beachten!)',
      explain: `∢PZP' = ${a}°, gedreht ${sign > 0 ? 'gegen den' : 'im'} Uhrzeigersinn → φ = ${fmt(phi)}.`,
    };
  }

  function dialFreeQ() {
    const phi = pick([-90, 120, -135, 150, -60, 135, -150, 90, -120]);
    const { z, pts } = placeShape([phi]);
    return {
      lvl: 4, type: 'dial', time: 40, z, pts, target: phi, shadow: false,
      text: `🌀 Ohne Schatten! Dreh das Dreieck um Z mit φ = ${fmt(phi)}.`,
      explain: `${Math.abs(phi)}° ${phi > 0 ? 'gegen den' : 'im'} Uhrzeigersinn${` (gleichwertig: ${fmt(phi > 0 ? phi - 360 : phi + 360)})`}.`,
    };
  }

  const L4 = [centerQ, centerQ, measureQ, measureQ, dialFreeQ];

  function takeFrom(pool, n) {
    const out = [];
    let bag = shuffle(pool);
    const seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      if (!bag.length) bag = shuffle(pool);
      const q = bag.pop()();
      const key = q.type + q.text;
      if (seen.has(key) && guard < 60) continue;
      seen.add(key);
      out.push(q);
    }
    return out;
  }

  function buildQuestions(total = 16) {
    const per = Math.max(1, Math.round(total / 4));
    const n4 = Math.max(1, total - 3 * per);
    return [
      ...takeFrom(L1, per),
      ...takeFrom(L2, per),
      ...takeFrom(L3, per),
      ...takeFrom(L4, n4),
    ];
  }

  // Antwort prüfen (gleiche Logik für alle Geräte)
  function check(q, ans) {
    if (ans == null) return false;
    switch (q.type) {
      case 'mc':
      case 'mcfig':
        return ans === q.answer;
      case 'point':
        return Math.abs(ans[0] - q.answer[0]) < 0.01 && Math.abs(ans[1] - q.answer[1]) < 0.01;
      case 'dial':
        return norm(Math.round(ans)) === norm(q.target);
      case 'center': {
        const [zx, zy, f] = ans;
        if (Math.abs(zx - q.z[0]) > 0.01 || Math.abs(zy - q.z[1]) > 0.01) return false;
        return norm(f) === norm(q.phi);
      }
      case 'measure':
        return Math.sign(ans) === Math.sign(q.answer) && Math.abs(ans - q.answer) <= q.tol;
    }
    return false;
  }

  const api = { buildQuestions, check, rot, rotPoly, norm, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GMQ = api;
})(typeof window !== 'undefined' ? window : globalThis);
