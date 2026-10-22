/* TT Brush Writing: the headless check. BW.check() returns { ok, fails, stats }; node runs it too (tools/check.js).
     strokes  every character's strokes agree with the standard stroke order (BW.STD): the same count, the same
              names in the same order, and each drawn stroke really is the shape its name says (a 横 goes right,
              a 撇 sweeps down to the left, a 竖钩 goes down and hooks up-left...). On top of that, the stroke-order
              rules the school charts teach hold everywhere: across before down where they cross (十), sweep left
              before sweep right where they meet (人), top line before the one under it (三), left before right (川),
              and a box is closed last, after what's inside it (日 国).
     tracing  for every stroke at both levels: the stroke's own path (a little shaky and off-centre, like a kid's)
              is accepted; the same path drawn backwards is rejected as 'backwards'; another stroke's path is
              rejected.
     speech   the voice follows the sound switch: nothing reaches speechSynthesis while it's off, and switching it
              off stops a word on its way (a pretend speechSynthesis and a pretend switch: never the real sound).
   BW.check({ sabotage: name }) breaks one thing on purpose (a copy of the data, or a looser or stricter judge),
   to prove the check can fail: each of BW.check.SABOTAGE must come back with ok: false. */
(function () {
  'use strict';
  const BW = (typeof window !== 'undefined' ? window : globalThis).BW;

  const SABOTAGE = ['swap-ten', 'drop-wood', 'reverse-one', 'swap-three', 'ren-na-first', 'ri-close-early', 'std-wrong',
    'judge-any-way', 'judge-loose', 'judge-strict', 'speak-muted', 'mute-no-cancel'];

  // a copy of the characters with one thing broken
  function broken(name) {
    const chars = BW.CHARS.map((ch) => Object.assign({}, ch, { s: ch.s.map((s) => ({ t: s.t, p: s.p.slice() })) }));
    const std = Object.assign({}, BW.STD);
    const get = (c) => chars.find((ch) => ch.c === c);
    const swap = (c, i, j) => {
      const s = get(c).s;
      [s[i], s[j]] = [s[j], s[i]];
    };
    if (name === 'swap-ten') swap('十', 0, 1); // the 竖 before the 横
    if (name === 'drop-wood') get('木').s.pop(); // 木 with three strokes
    if (name === 'reverse-one') {
      const p = get('一').s[0].p; // 一 drawn right to left
      get('一').s[0].p = [p[2], p[3], p[0], p[1]];
    }
    if (name === 'swap-three') swap('三', 0, 1); // the middle line first
    if (name === 'ren-na-first') swap('人', 0, 1); // 捺 before 撇
    if (name === 'ri-close-early') swap('日', 2, 3); // the box shut before the line inside it
    if (name === 'std-wrong') std['木'] = '横 竖 捺 撇'; // a wrong "standard" no drawing matches
    return { chars, std };
  }

  // ---------------------------------------------------------------- the strokes against the standard

  const pts = (s) => BW.ink.points(s);
  const ends = (s) => {
    const p = pts(s);
    return [p[0], p[p.length - 1]];
  };
  // do two strokes cross properly (not just touch at an end)?
  function cross(s1, s2) {
    const a = pts(s1), b = pts(s2);
    for (let i = 1; i < a.length; i++)
      for (let j = 1; j < b.length; j++) {
        const hit = segHit(a[i - 1], a[i], b[j - 1], b[j]);
        if (!hit) continue;
        const near = (q, s) => ends(s).some((e) => Math.hypot(q.x - e.x, q.y - e.y) < 3.5);
        if (!near(hit, s1) && !near(hit, s2)) return true;
      }
    return false;
  }
  function segHit(p, q, r, s) {
    const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
    const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) };
  }
  // do two strokes meet (touch or cross)?
  function meet(s1, s2) {
    const b = BW.ink.build(s2).pts;
    return BW.ink.build(s1).pts.some((q) => BW.ink.nearest(q, b) < 4);
  }
  const midY = (s) => {
    const p = pts(s);
    return p.reduce((t, q) => t + q.y, 0) / p.length;
  };
  const midX = (s) => {
    const p = pts(s);
    return p.reduce((t, q) => t + q.x, 0) / p.length;
  };

  function checkStrokes(chars, std, fails, stats) {
    const seen = new Set();
    for (const ch of chars) {
      const tag = `${ch.c}:`;
      if (seen.has(ch.c)) fails.push(`${tag} listed twice`);
      seen.add(ch.c);
      if (!std[ch.c]) {
        fails.push(`${tag} not in the standard table`);
        continue;
      }
      const want = std[ch.c].split(' ');
      const got = ch.s.map((s) => s.t);
      if (want.length !== got.length) fails.push(`${tag} ${got.length} strokes, the standard has ${want.length}`);
      want.forEach((w, i) => {
        if (got[i] && got[i] !== w) fails.push(`${tag} stroke ${i + 1} is ${got[i]}, the standard says ${w}`);
      });
      if (!ch.py || !ch.en || !ch.emoji || !ch.word || !ch.wpy) fails.push(`${tag} card incomplete`);
      if (ch.lv === 1 ? ch.s.length > 4 : ch.s.length < 4 || ch.s.length > 8) fails.push(`${tag} ${ch.s.length} strokes on level ${ch.lv}`);
      ch.s.forEach((s, i) => {
        stats.strokes++;
        if (s.p.length < 4 || s.p.length % 2) fails.push(`${tag} stroke ${i + 1} has a broken path`);
        if (s.p.some((v) => v < 0 || v > 100)) fails.push(`${tag} stroke ${i + 1} leaves the box`);
        if (!BW.ink.looksLike(s)) fails.push(`${tag} stroke ${i + 1} (${s.t}) doesn't look like a ${s.t}: it goes ${BW.ink.shape(s).sig}`);
      });
      // the stroke-order rules
      const S = ch.s;
      for (let i = 0; i < S.length; i++)
        for (let j = i + 1; j < S.length; j++) {
          // across before down: a 竖 that crosses a 横 comes after it (十 木 王)
          if (S[i].t === '竖' && S[j].t === '横' && cross(S[i], S[j])) fails.push(`${tag} stroke ${i + 1} (竖) crosses stroke ${j + 1} (横) but comes first`);
          // sweep left before sweep right where they meet (人 大 文)
          if (S[i].t === '捺' && S[j].t === '撇' && meet(S[i], S[j])) fails.push(`${tag} stroke ${i + 1} (捺) meets stroke ${j + 1} (撇) but comes first`);
        }
      for (let i = 1; i < S.length; i++) {
        // top before bottom: two 横 in a row go downwards (三 目), two 竖 in a row go rightwards (耳)
        if (S[i - 1].t === '横' && S[i].t === '横' && midY(S[i]) <= midY(S[i - 1])) fails.push(`${tag} 横 ${i + 1} is above 横 ${i}`);
        if (S[i - 1].t === '竖' && S[i].t === '竖' && midX(S[i]) <= midX(S[i - 1])) fails.push(`${tag} 竖 ${i + 1} is left of 竖 ${i}`);
      }
      // a box (竖, then 横折 across the top and down the right) closes last: what's inside it comes before the 横 that shuts it
      S.forEach((s, i) => {
        if (s.t !== '横折' || i === 0 || S[i - 1].t !== '竖') return;
        const p = pts(s), x0 = p[0].x, y0 = p[0].y, x1 = p[1].x, y1 = p[2].y;
        const close = S.findIndex((o, k) => k > i && o.t === '横' && Math.abs(midY(o) - y1) < 4.5 && pts(o)[0].x <= x0 + 4 && pts(o)[1].x >= x1 - 4);
        if (close < 0) return fails.push(`${tag} the box from stroke ${i + 1} is never closed`);
        stats.boxes++;
        S.forEach((o, k) => {
          if (k === i || k === i - 1 || k === close) return;
          const inside = pts(o).every((q) => q.x >= x0 - 3 && q.x <= x1 + 3 && q.y >= y0 - 3 && q.y <= y1 + 3);
          if (inside && k > close) fails.push(`${tag} stroke ${k + 1} is inside the box but comes after it's closed (stroke ${close + 1})`);
        });
      });
    }
    for (const c in std) if (!seen.has(c)) fails.push(`${c}: in the standard table but not drawn`);
    stats.chars = chars.length;
  }

  // ---------------------------------------------------------------- tracing

  // a kid-like copy of a path: shaky, off-centre, uneven speed (a seeded wobble, the same every run)
  function shaky(line, amp, seed, off) {
    let x = seed * 9301 + 49297;
    const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280) * 2 - 1;
    const pts = BW.ink.resampleN(line, Math.max(8, Math.round(BW.ink.lengthOf(line) / 1.6)));
    let wx = 0, wy = 0;
    return pts.map((q) => {
      wx = wx * 0.7 + rnd() * amp * 0.5;
      wy = wy * 0.7 + rnd() * amp * 0.5;
      return { x: q.x + off.x + wx, y: q.y + off.y + wy };
    });
  }

  function checkTracing(chars, judge, fails, stats) {
    let seed = 1;
    for (const level of ['easy', 'normal']) {
      const amp = level === 'easy' ? 4 : 2.5, off = level === 'easy' ? { x: 4, y: -3 } : { x: 2.5, y: 2 };
      for (const ch of chars)
        ch.s.forEach((s, i) => {
          const med = BW.ink.build(s).pts;
          const others = ch.s.filter((o) => o !== s);
          const good = shaky(med, amp, seed++, off);
          const g = judge(s, good, level, { others });
          stats.good++;
          if (!g.ok) fails.push(`trace ${level}: ${ch.c} stroke ${i + 1} (${s.t}) traced well was rejected (${g.why})`);
          const back = judge(s, good.slice().reverse(), level, { others });
          stats.backwards++;
          if (back.ok) fails.push(`trace ${level}: ${ch.c} stroke ${i + 1} (${s.t}) drawn backwards was accepted`);
          else if (back.why !== 'backwards') stats.backOther++;
          ch.s.forEach((o, j) => {
            if (j === i) return;
            const other = BW.ink.build(o).pts;
            // strokes that sit on top of each other (the 口 in 中 vs its 横) can't be told apart by shape: skip those
            if (BW.ink.judge(s, other, level, { anyWay: true }).ok) return;
            stats.wrong++;
            if (judge(s, shaky(other, amp, seed++, off), level, { others }).ok) fails.push(`trace ${level}: ${ch.c} stroke ${i + 1} (${s.t}) accepted stroke ${j + 1}'s path`);
          });
        });
    }
  }

  // ---------------------------------------------------------------- speech

  function checkSpeech(fails, stats) {
    const S = BW.speech;
    if (!S) return; // node without the voice file: skipped
    const log = [];
    const fake = {
      getVoices: () => [{ name: 'Tingting', lang: 'zh-CN', localService: true }],
      speak: (u) => log.push(['speak', u.text]),
      cancel: () => log.push(['cancel']),
      addEventListener() {},
    };
    const listeners = [];
    let m = false;
    const sound = { isMuted: () => m, onMute: (cb) => listeners.push(cb), set(v) { m = v; listeners.forEach((cb) => cb(v)); } };
    S.attach(fake, { now: true });
    const undo = S.follow(sound);
    const speaks = () => log.filter((x) => x[0] === 'speak' && x[1].trim()).length;
    try {
      sound.set(true);
      S.say('山');
      S.unlock();
      if (speaks()) fails.push(`speech: ${speaks()} words said with the sound off`);
      if (log.some((x) => x[0] === 'speak')) fails.push('speech: speechSynthesis.speak called with the sound off');
      sound.set(false);
      S.say('山');
      if (speaks() !== 1) fails.push(`speech: ${speaks()} words said with the sound on (want 1)`);
      S.attach(fake, { now: false });
      S.say('水');
      const mid = log.length;
      sound.set(true);
      if (!log.slice(mid).some((x) => x[0] === 'cancel')) fails.push("speech: switching the sound off didn't stop the voice");
      stats.speech = { said: speaks(), calls: log.length };
    } finally {
      S.cancel();
      undo();
      S.attach(null);
    }
  }

  // ---------------------------------------------------------------- run it

  function check(o = {}) {
    const fails = [];
    const stats = { chars: 0, strokes: 0, boxes: 0, good: 0, backwards: 0, backOther: 0, wrong: 0 };
    const name = o.sabotage || null;
    const sab = (BW.sab = BW.sab || {});
    if (name === 'speak-muted') sab.speakMuted = true;
    if (name === 'mute-no-cancel') sab.noCancel = true;
    let judge = BW.ink.judge;
    if (name === 'judge-any-way') judge = (s, p, l, x) => { // a judge that doesn't mind which way the brush went
      const r = BW.ink.judge(s, p, l, x);
      return r.ok ? r : BW.ink.judge(s, p.slice().reverse(), l, x);
    };
    if (name === 'judge-loose') judge = (s, p, l) => BW.ink.judge(s, p, l, { tol: { start: 99, end: 99, avg: 99, far: 99 } });
    if (name === 'judge-strict') judge = (s, p, l, x) => BW.ink.judge(s, p, l, Object.assign({ tol: { start: 3, end: 3, avg: 2, far: 3 } }, x));
    try {
      const { chars, std } = name ? broken(name) : { chars: BW.CHARS, std: BW.STD };
      checkStrokes(chars, std, fails, stats);
      checkTracing(chars, judge, fails, stats);
      checkSpeech(fails, stats);
    } catch (e) {
      fails.push('crash: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
    } finally {
      for (const k in sab) delete sab[k];
    }
    return { ok: fails.length === 0, fails, stats, sabotage: name };
  }
  check.SABOTAGE = SABOTAGE;
  BW.check = check;
})();
