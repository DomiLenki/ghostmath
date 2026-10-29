/* Ghost Math – Verbindung zur Datenbank (Supabase) + lokaler Testmodus (?local=1) */
(function (root) {
  'use strict';

  const SUPABASE_URL = 'https://iqtcvrjyooexlisqnezc.supabase.co';
  // Öffentlicher "anon"-Schlüssel – darf im Browser stehen, die Datenbank ist per RLS geschützt.
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGN2cmp5b29leGxpc3FuZXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODU3ODIsImV4cCI6MjEwODg2MTc4Mn0.d9JMuwx0SrwjEtb_o9TpY9qknZoJktX9zXEq6ZaLs0I';

  let offset = 0; // Serverzeit - lokale Zeit
  const now = () => Date.now() + offset;

  /* ------------------------------------------------------------------ */
  /*  Supabase                                                           */
  /* ------------------------------------------------------------------ */
  function supa() {
    const sb = root.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
    const must = ({ data, error }) => {
      if (error) throw new Error(error.message || 'Netzwerkfehler');
      return data;
    };
    return {
      mode: 'online',
      async init() {
        const samples = [];
        for (let i = 0; i < 3; i++) {
          const t0 = Date.now();
          const { data, error } = await sb.rpc('server_now');
          const t1 = Date.now();
          if (error) throw new Error(error.message);
          samples.push({ rtt: t1 - t0, off: new Date(data).getTime() - (t0 + t1) / 2 });
        }
        samples.sort((a, b) => a.rtt - b.rtt);
        offset = samples[0].off;
        // Gibt es schon den Doppel-Joker auf dem Server?
        try {
          const t = await sb.rpc('submit_answer2', { p_room: '-----', p_player: '00000000-0000-0000-0000-000000000000', p_q: 0, p_correct: false, p_double: false });
          this.hasDouble = !t.error;
        } catch (e) { this.hasDouble = false; }
      },
      hasDouble: false,
      async createRoom(room) {
        const { error } = await sb.from('rooms').insert({
          code: room.code, host_id: room.hostId, host_plays: room.hostPlays, questions: room.questions,
        });
        if (error) {
          if (String(error.code) === '23505') return false; // Code schon vergeben
          throw new Error(error.message);
        }
        return true;
      },
      async getRoom(code) {
        return must(await sb.from('rooms').select('*').eq('code', code).maybeSingle());
      },
      async getRoomLite(code) {
        const r = await sb.from('rooms').select('code,status,q_index,q_started_at,host_plays,round').eq('code', code).maybeSingle();
        if (r.error && /round/.test(r.error.message || '')) {
          // Datenbank noch ohne "round"-Spalte: ohne weitermachen
          return must(await sb.from('rooms').select('code,status,q_index,q_started_at,host_plays').eq('code', code).maybeSingle());
        }
        return must(r);
      },
      async joinPlayer(p) {
        must(await sb.from('players').insert({
          id: p.id, room_code: p.code, name: p.name, avatar: p.avatar, is_host: !!p.isHost,
        }));
      },
      async updatePlayer(id, fields) {
        must(await sb.from('players').update(fields).eq('id', id));
      },
      async listPlayers(code) {
        return must(await sb.from('players').select('id,name,avatar,score,streak,is_host,joined_at').eq('room_code', code).order('joined_at'));
      },
      async listAnswers(code, q) {
        return must(await sb.from('answers').select('player_id,correct,points,ms').eq('room_code', code).eq('q_index', q));
      },
      async myAnswer(code, q, playerId) {
        return must(await sb.from('answers').select('correct,points,ms').eq('room_code', code).eq('q_index', q).eq('player_id', playerId).maybeSingle());
      },
      async hostSet(code, hostId, status, q, delayMs = 0) {
        return must(await sb.rpc('host_set', { p_code: code, p_host: hostId, p_status: status, p_q: q, p_delay_ms: delayMs }));
      },
      async submit(code, playerId, q, correct, dbl = false) {
        if (this.hasDouble) return must(await sb.rpc('submit_answer2', { p_room: code, p_player: playerId, p_q: q, p_correct: correct, p_double: !!dbl }));
        return must(await sb.rpc('submit_answer', { p_room: code, p_player: playerId, p_q: q, p_correct: correct }));
      },
      reactions(code, onReact) {
        const ch = sb.channel('gm-react-' + code, { config: { broadcast: { self: true } } });
        ch.on('broadcast', { event: 'r' }, (m) => onReact(m.payload));
        ch.subscribe();
        return { send: (payload) => ch.send({ type: 'broadcast', event: 'r', payload }), close: () => { try { sb.removeChannel(ch); } catch (e) { /* egal */ } } };
      },
      async kick(code, hostId, playerId) {
        return must(await sb.rpc('kick_player', { p_code: code, p_host: hostId, p_player: playerId }));
      },
      async reset(code, hostId, questions) {
        return must(await sb.rpc('host_reset', { p_code: code, p_host: hostId, p_questions: questions }));
      },
      async leave(playerId) {
        try { await sb.rpc('leave_room', { p_player: playerId }); } catch (e) { /* egal */ }
      },
      subscribe(code, tables, onChange) {
        const ch = sb.channel('gm-' + code + '-' + Math.random().toString(36).slice(2, 7));
        if (tables.includes('rooms')) ch.on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'code=eq.' + code }, () => onChange('rooms'));
        if (tables.includes('players')) ch.on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: 'room_code=eq.' + code }, () => onChange('players'));
        if (tables.includes('answers')) ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: 'room_code=eq.' + code }, () => onChange('answers'));
        ch.subscribe();
        return () => { try { sb.removeChannel(ch); } catch (e) { /* egal */ } };
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Lokaler Testmodus – alles im Browser (mehrere Tabs)                */
  /* ------------------------------------------------------------------ */
  function local() {
    const KEY = 'gm_local_db';
    let bc = null;
    try { bc = new BroadcastChannel('gm_local'); } catch (e) { /* egal */ }
    const listeners = new Set();
    if (bc) bc.onmessage = (ev) => listeners.forEach((l) => l(ev.data));
    window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((l) => l('all')); });
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { rooms: {}, players: [], answers: [] }; } catch (e) { return { rooms: {}, players: [], answers: [] }; } };
    const save = (db, kind) => {
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* egal */ }
      if (bc) bc.postMessage(kind);
      listeners.forEach((l) => l(kind));
    };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const delay = () => new Promise((r) => setTimeout(r, 20));
    return {
      mode: 'local',
      hasDouble: true,
      async init() { offset = 0; },
      reactions(code, onReact) {
        let rc = null;
        try { rc = new BroadcastChannel('gm_react_' + code); rc.onmessage = (e) => onReact(e.data); } catch (e) { /* egal */ }
        return { send: (p) => { onReact(p); if (rc) rc.postMessage(p); }, close: () => { if (rc) rc.close(); } };
      },
      async createRoom(room) {
        await delay();
        const db = load();
        if (db.rooms[room.code]) return false;
        db.rooms[room.code] = { code: room.code, host_id: room.hostId, host_plays: room.hostPlays, status: 'lobby', q_index: -1, q_started_at: null, questions: room.questions, round: 0, created_at: new Date().toISOString() };
        save(db, 'rooms');
        return true;
      },
      async getRoom(code) { await delay(); const r = load().rooms[code]; return r ? clone(r) : null; },
      async getRoomLite(code) { return this.getRoom(code); },
      async joinPlayer(p) {
        await delay();
        const db = load();
        if (!db.rooms[p.code]) throw new Error('Raum nicht gefunden');
        db.players.push({ id: p.id, room_code: p.code, name: p.name, avatar: p.avatar, score: 0, streak: 0, is_host: !!p.isHost, joined_at: new Date().toISOString() });
        save(db, 'players');
      },
      async updatePlayer(id, fields) {
        const db = load();
        const p = db.players.find((x) => x.id === id);
        if (p) Object.assign(p, fields);
        save(db, 'players');
      },
      async listPlayers(code) { await delay(); return clone(load().players.filter((p) => p.room_code === code)); },
      async listAnswers(code, q) { await delay(); return clone(load().answers.filter((a) => a.room_code === code && a.q_index === q)); },
      async myAnswer(code, q, pid) { await delay(); return clone(load().answers.find((a) => a.room_code === code && a.q_index === q && a.player_id === pid) || null); },
      async hostSet(code, hostId, status, q, delayMs = 0) {
        await delay();
        const db = load();
        const r = db.rooms[code];
        if (!r || r.host_id !== hostId) return { ok: false };
        r.status = status; r.q_index = q;
        if (status === 'question') r.q_started_at = new Date(Date.now() + Math.min(10000, Math.max(0, delayMs))).toISOString();
        save(db, 'rooms');
        return { ok: true };
      },
      async submit(code, pid, q, correct, dbl = false) {
        await delay();
        const db = load();
        const r = db.rooms[code];
        if (!r || r.status !== 'question' || r.q_index !== q) return { ok: false, reason: 'closed' };
        const p = db.players.find((x) => x.id === pid && x.room_code === code);
        if (!p) return { ok: false, reason: 'noplayer' };
        if (db.answers.some((a) => a.player_id === pid && a.q_index === q)) return { ok: false, reason: 'dup' };
        const lim = (r.questions[q] && r.questions[q].time) || 20;
        let el = (Date.now() - new Date(r.q_started_at).getTime()) / 1000;
        if (el > lim + 1.5) return { ok: false, reason: 'late' };
        el = Math.max(0, Math.min(el, lim));
        let pts = 0, bonus = 0, streak = 0;
        const d2 = !!dbl && !p.used_double;
        if (correct) { pts = Math.round(1000 * (1 - 0.5 * el / lim)); streak = p.streak + 1; if (streak >= 3) bonus = 100; if (d2) pts *= 2; }
        db.answers.push({ room_code: code, player_id: pid, q_index: q, correct, points: pts + bonus, ms: Math.round(el * 1000) });
        p.score += pts + bonus; p.streak = streak; p.used_double = p.used_double || d2;
        save(db, 'answers');
        return { ok: true, points: pts, bonus, streak, double: d2 };
      },
      async kick(code, hostId, pid) {
        const db = load();
        if (!db.rooms[code] || db.rooms[code].host_id !== hostId) return { ok: false };
        db.players = db.players.filter((p) => p.id !== pid);
        save(db, 'players');
        return { ok: true };
      },
      async reset(code, hostId, questions) {
        const db = load();
        const r = db.rooms[code];
        if (!r || r.host_id !== hostId) return { ok: false };
        db.answers = db.answers.filter((a) => a.room_code !== code);
        db.players.forEach((p) => { if (p.room_code === code) { p.score = 0; p.streak = 0; p.used_double = false; } });
        Object.assign(r, { status: 'lobby', q_index: -1, q_started_at: null, questions, round: (r.round || 0) + 1 });
        save(db, 'rooms');
        return { ok: true };
      },
      async leave(pid) { const db = load(); db.players = db.players.filter((p) => p.id !== pid); save(db, 'players'); },
      subscribe(code, tables, onChange) {
        const l = (kind) => onChange(kind === 'all' ? 'rooms' : kind);
        listeners.add(l);
        return () => listeners.delete(l);
      },
    };
  }

  let isLocal = false;
  try { isLocal = new URLSearchParams(location.search).has('local'); } catch (e) { /* egal */ }
  const impl = isLocal || !root.supabase ? local() : supa();
  impl.now = now;
  root.Net = impl;
})(window);
