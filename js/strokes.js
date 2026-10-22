/* TT Brush Writing: the brush. Everything about one stroke, in the 100 x 100 box of js/chars.js:
   - BW.ink.build(stroke): the brush's path, smoothed (corners stay sharp) and spaced 1 unit apart, with the brush's
     width along it: pressed at the start and at each corner, a 撇 tapering to a point, a 捺 swelling to its foot,
     a 点 a little teardrop, a hook flicking off sharp.
   - BW.ink.shape(stroke): which way the brush goes, as compass runs ("E S NW" for 横折钩), for the check.
   - BW.ink.judge(stroke, path, level): does a traced path match the stroke? It must start at the right end, go the
     right way and follow the shape; a path drawn backwards gets its own answer ('backwards').
   - BW.ink.draw / drawPart / stamp: paint on a 2D canvas.
   No DOM here: node runs this file for the check (tools/check.js). */
(function () {
  'use strict';
  const BW = (typeof window !== 'undefined' ? window : globalThis).BW || ((typeof window !== 'undefined' ? window : globalThis).BW = {});

  const WIDTH = 7.4; // the brush's width in box units
  const TURN = (50 * Math.PI) / 180; // a sharper turn than this is a corner (折)
  const SECT = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

  const P = (x, y) => ({ x, y });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  function points(stroke) {
    const out = [];
    for (let i = 0; i + 1 < stroke.p.length; i += 2) out.push(P(stroke.p[i], stroke.p[i + 1]));
    return out;
  }

  function turnAt(a, b, c) {
    const a1 = Math.atan2(b.y - a.y, b.x - a.x), a2 = Math.atan2(c.y - b.y, c.x - b.x);
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  }

  // a Catmull-Rom curve through the points of one piece (no corners inside)
  function curve(pts) {
    if (pts.length < 3) return pts.slice();
    const out = [pts[0]];
    const ext = [P(2 * pts[0].x - pts[1].x, 2 * pts[0].y - pts[1].y)].concat(pts, [P(2 * pts[pts.length - 1].x - pts[pts.length - 2].x, 2 * pts[pts.length - 1].y - pts[pts.length - 2].y)]);
    for (let i = 1; i < ext.length - 2; i++) {
      const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
      const n = Math.max(2, Math.ceil(dist(p1, p2) / 0.6));
      for (let k = 1; k <= n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push(P(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        ));
      }
    }
    return out;
  }

  // points spaced `step` apart along a polyline (the first and last kept)
  function resample(line, step) {
    let len = 0;
    for (let i = 1; i < line.length; i++) len += dist(line[i - 1], line[i]);
    const n = Math.max(1, Math.round(len / step));
    return resampleN(line, n + 1, len);
  }
  function resampleN(line, count, len) {
    if (len == null) {
      len = 0;
      for (let i = 1; i < line.length; i++) len += dist(line[i - 1], line[i]);
    }
    if (line.length < 2 || len === 0) return Array.from({ length: count }, () => P(line[0].x, line[0].y));
    const out = [P(line[0].x, line[0].y)];
    const step = len / (count - 1);
    let i = 1, acc = 0, want = step;
    let prev = line[0];
    while (out.length < count - 1 && i < line.length) {
      const seg = dist(prev, line[i]);
      if (acc + seg >= want) {
        const t = (want - acc) / seg;
        const q = P(lerp(prev.x, line[i].x, t), lerp(prev.y, line[i].y, t));
        out.push(q);
        acc = want;
        prev = q;
        want += step;
      } else {
        acc += seg;
        prev = line[i];
        i++;
      }
    }
    while (out.length < count) out.push(P(line[line.length - 1].x, line[line.length - 1].y));
    return out;
  }
  const lengthOf = (line) => line.reduce((s, q, i) => (i ? s + dist(line[i - 1], q) : 0), 0);

  // ---------------------------------------------------------------- one stroke, ready to paint

  const cache = new WeakMap();
  function build(stroke) {
    if (cache.has(stroke)) return cache.get(stroke);
    const raw = points(stroke);
    // split into pieces at the corners
    const cuts = [0];
    for (let i = 1; i < raw.length - 1; i++) if (turnAt(raw[i - 1], raw[i], raw[i + 1]) > TURN) cuts.push(i);
    cuts.push(raw.length - 1);
    const pts = [], piece = [], corners = [];
    for (let k = 0; k < cuts.length - 1; k++) {
      const part = resample(curve(raw.slice(cuts[k], cuts[k + 1] + 1)), 1);
      if (k > 0) corners.push(pts.length - 1);
      part.forEach((q, j) => {
        if (k > 0 && j === 0) return;
        pts.push(q);
        piece.push(k);
      });
    }
    const K = cuts.length - 1;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + dist(pts[i - 1], pts[i]));
    const len = acc[acc.length - 1];
    // where each piece starts and ends along the length
    const pFrom = [], pTo = [];
    piece.forEach((k, i) => {
      if (pFrom[k] == null) pFrom[k] = acc[i];
      pTo[k] = acc[i];
    });
    if (K > 1) for (let k = 1; k < K; k++) pFrom[k] = pTo[k - 1];
    const t = stroke.t;
    const hook = /钩$/.test(t), pie = /撇$/.test(t);
    const w = pts.map((q, i) => {
      const s = len ? acc[i] / len : 0;
      const k = piece[i];
      const u = pTo[k] > pFrom[k] ? (acc[i] - pFrom[k]) / (pTo[k] - pFrom[k]) : 0;
      const last = k === K - 1;
      let v;
      if (t === '点') v = 0.5 + 0.8 * smooth(0, 1, s);
      else if (t === '捺') v = s < 0.78 ? 0.5 + 0.88 * Math.pow(s / 0.78, 1.2) : 1.38 - ((s - 0.78) / 0.22) * 1.05;
      else if (t === '提') v = 1.25 - 1.0 * s;
      else {
        v = 1;
        if (t === '横') v *= 0.9 + 0.1 * Math.abs(2 * s - 1) + (len - acc[i] < 4 ? 0.12 : 0);
        if (t === '竖') v *= 0.96;
        if (acc[i] < 5) v = Math.max(v, 1 + 0.2 * (1 - acc[i] / 5)); // the press as the brush lands
        if (pie && last) v *= t === '撇' ? 1 - 0.8 * smooth(0.25, 1, s) : 1 - 0.8 * smooth(0, 1, u);
        if (hook && last && K > 1) v *= 1 - 0.85 * u;
        if (t === '撇点' && k === 1) v = 0.75 + 0.5 * u;
        if (t === '撇折' && k === 1) v *= 1 - 0.55 * u;
      }
      for (const c of corners) if (Math.abs(acc[c] - acc[i]) < 3) v = Math.max(v, 1.15);
      return v * WIDTH;
    });
    const roundEnd = t === '横' || t === '竖' || t === '点' || t === '横折' || t === '竖折';
    const b = { type: t, pts, w, acc, len, corners, piece, K, roundEnd };
    cache.set(stroke, b);
    return b;
  }

  // ---------------------------------------------------------------- which way the brush goes

  const sector = (dx, dy) => SECT[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

  // compass runs along the stroke, short wiggles dropped: '横折钩' is 'E S NW'
  function shape(stroke) {
    const b = build(stroke);
    const runs = [];
    for (let i = 0; i + 1 < b.pts.length; i++) {
      // the direction over a few points, without crossing a corner
      let j = Math.min(b.pts.length - 1, i + 2), h = Math.max(0, i - 1);
      while (b.piece[j] !== b.piece[i] && j > i + 1) j--;
      while (b.piece[h] !== b.piece[i] && h < i) h++;
      const d = sector(b.pts[j].x - b.pts[h].x, b.pts[j].y - b.pts[h].y);
      const seg = dist(b.pts[i], b.pts[i + 1]);
      const top = runs[runs.length - 1];
      if (top && top.d === d && top.k === b.piece[i]) top.len += seg;
      else runs.push({ d, len: seg, k: b.piece[i] });
    }
    // drop the short in-between runs inside a piece (a curve passing a compass line); a piece's only run stays
    const kept = runs.filter((r) => r.len >= 3.5 || runs.filter((o) => o.k === r.k).length === 1);
    const out = [];
    for (const r of kept) if (!out.length || out[out.length - 1] !== r.d) out.push(r.d);
    const a = b.pts[0], z = b.pts[b.pts.length - 1];
    return { sig: out.join(' '), dx: z.x - a.x, dy: z.y - a.y, len: b.len, pieces: b.K };
  }

  // What each stroke name looks like. sig: the compass runs; the rest are extra conditions.
  const SHAPES = {
    横: { sig: /^E$/, ok: (s) => s.dy / s.dx > -0.13 && s.dy / s.dx < 0.1 },
    竖: { sig: /^S$/, ok: (s) => Math.abs(s.dx) <= 6 },
    撇: { sig: /^(S )?(SW|W|SW W)$/, ok: (s) => s.dx < 0 && s.dy > 0.15 * -s.dx },
    捺: { sig: /^(S )?SE( E)?$/, ok: (s) => s.dx > 0 && s.dy > 0 && s.len >= 25 },
    点: { sig: /^(S|SE|SW)$/, ok: (s) => s.dy > 0 && s.len <= 45 },
    提: { sig: /^(E|NE)$/, ok: (s) => s.dx > 0 && s.dy / s.dx < -0.15 },
    横折: { sig: /^E (S|SW)$/ },
    横撇: { sig: /^E (S )?SW$/ },
    竖钩: { sig: /^S (NW|W)$/ },
    横折钩: { sig: /^E (S|SW)( SW)? (NW|W)$/ },
    竖折: { sig: /^S E$/ },
    撇折: { sig: /^(S )?SW (E|NE)$/ },
    撇点: { sig: /^(S )?SW SE$/ },
    竖弯钩: { sig: /^S (SE )?E (N|NE|NW)$/ },
    卧钩: { sig: /^(S )?(SE )?E (NE )?(N|NW|W)$/ },
    竖折折钩: { sig: /^S E (S|SW) (NW|W)$/ },
    横斜钩: { sig: /^E S (SE )?(N|NE|NW)$/ },
  };
  function looksLike(stroke, name = stroke.t) {
    const def = SHAPES[name];
    if (!def) return false;
    const s = shape(stroke);
    return def.sig.test(s.sig) && (!def.ok || def.ok(s));
  }

  // ---------------------------------------------------------------- tracing

  // How close a traced path has to be, in box units. EASY is generous (Tommy is 5).
  const TOL = {
    easy: { start: 22, end: 24, avg: 16, far: 24, short: 0.35, tap: 14 },
    normal: { start: 15, end: 17, avg: 11, far: 16, short: 0.5, tap: 0 },
  };

  // path: [{x, y}] in box units, in the order it was drawn. Returns { ok, why } where why is
  // 'ok' | 'tap' (a dab on a dot, EASY) | 'short' | 'backwards' | 'start' | 'end' | 'shape' | 'other'.
  // o.others: the character's other strokes. A path that fits one of them better is that one, not this ('other',
  // with its index in o.others): two dots side by side in 雨 can't stand in for each other, even on EASY.
  function judge(stroke, path, level = 'easy', o = {}) {
    const tol = Object.assign({}, TOL[level] || TOL.easy, o.tol || {});
    const b = build(stroke);
    const med = b.pts;
    const a = med[0], z = med[med.length - 1];
    const len = path.length > 1 ? lengthOf(path) : 0;
    if (len < 2.5) {
      // a dab of the brush is how a dot is made
      if (tol.tap && stroke.t === '点' && path.length) {
        const mid = (s) => build(s).pts[Math.floor(build(s).pts.length / 2)];
        const d = dist(path[0], mid(stroke));
        // (the nearest dot wins: 雨 has four)
        if (d <= tol.tap && !(o.others || []).some((s) => s.t === '点' && dist(path[0], mid(s)) < d)) return { ok: true, why: 'tap' };
      }
      return { ok: false, why: 'short' };
    }
    if (len < Math.max(4, b.len * tol.short)) return { ok: false, why: 'short' };
    const N = 24;
    const u = resampleN(path, N), m = resampleN(med, N);
    const u0 = u[0], u1 = u[N - 1];
    const dS = dist(u0, a), dE = dist(u1, z), rS = dist(u0, z), rE = dist(u1, a);
    // it fits the stroke drawn the other way round better than this way: backwards
    if (!o.anyWay && rS + rE + 4 < dS + dE && rS <= tol.start && rE <= tol.end) return { ok: false, why: 'backwards', dS, dE };
    if (dS > tol.start) return { ok: false, why: 'start', dS, dE };
    if (dE > tol.end) return { ok: false, why: 'end', dS, dE };
    let sum = 0;
    for (let i = 0; i < N; i++) sum += dist(u[i], m[i]);
    const avg = sum / N;
    if (avg > tol.avg) return { ok: false, why: 'shape', avg };
    let far = 0;
    for (const q of u) far = Math.max(far, nearest(q, med));
    if (far > tol.far) return { ok: false, why: 'shape', avg, far };
    if (o.others)
      for (let k = 0; k < o.others.length; k++) {
        const om = resampleN(build(o.others[k]).pts, N);
        let os = 0;
        for (let i = 0; i < N; i++) os += dist(u[i], om[i]);
        if (os / N + 1 < avg) return { ok: false, why: 'other', which: k, avg };
      }
    return { ok: true, why: 'ok', avg, far, dS, dE };
  }
  function nearest(q, line) {
    let best = Infinity;
    for (let i = 1; i < line.length; i++) {
      const p0 = line[i - 1], p1 = line[i];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((q.x - p0.x) * dx + (q.y - p0.y) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(q.x - (p0.x + dx * t), q.y - (p0.y + dy * t)));
    }
    return best;
  }

  // ---------------------------------------------------------------- painting (ctx in box units via the caller's transform)

  // the outline of the stroke from point 0 to point n (a filled shape), with round blobs at the start and corners
  function fillPart(ctx, b, n, mul = 1) {
    const pts = b.pts, w = b.w;
    n = Math.max(1, Math.min(pts.length - 1, n));
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
      let dx = p1.x - p0.x, dy = p1.y - p0.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const h = (w[i] * mul) / 2;
      L.push([pts[i].x - dy * h, pts[i].y + dx * h]);
      R.push([pts[i].x + dy * h, pts[i].y - dx * h]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fill();
    const dot = (i, r) => {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(0, (w[0] * mul) / 2);
    for (const c of b.corners) if (c <= n) dot(c, (w[c] * mul) / 2);
    if (n < pts.length - 1 || b.roundEnd) dot(n, (w[n] * mul) / 2);
  }
  // a whole stroke, or `upto` (0..1) of it
  function draw(ctx, stroke, color, upto = 1, mul = 1) {
    const b = build(stroke);
    ctx.fillStyle = color;
    fillPart(ctx, b, Math.round((b.pts.length - 1) * upto), mul);
  }
  // where the brush is when `upto` of the stroke is done
  function tip(stroke, upto) {
    const b = build(stroke);
    const i = Math.max(0, Math.min(b.pts.length - 1, Math.round((b.pts.length - 1) * upto)));
    const j = Math.min(b.pts.length - 1, i + 1), h = Math.max(0, i - 1);
    return { x: b.pts[i].x, y: b.pts[i].y, w: b.w[i], ang: Math.atan2(b.pts[j].y - b.pts[h].y, b.pts[j].x - b.pts[h].x) };
  }

  BW.ink = { build, shape, looksLike, judge, draw, tip, points, resampleN, lengthOf, nearest, SHAPES, TOL, WIDTH };
})();
