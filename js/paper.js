/* TT Brush Writing: the writing paper.
   BW.writer(): one character being written, with no DOM (the game and the test hooks drive it):
     load(ch, level) · begin(x, y) / move(x, y, dt) / end() with the brush in box units · hint(reps) plays the next
     stroke as a demo · update(dt). It sends events the game reads: good, miss (why: start, end, shape, short,
     backwards, other), complete.
     A good stroke turns into a clean brush stroke; a miss fades away. On 🐣 EASY the next stroke is always lit up with
     its start dot and moving arrows; on 🔥 NORMAL only after a miss. Two misses on one stroke and it plays by itself.
   BW.paperView(canvas): paints a writer. Practice paper as Chinese first-graders use it: rice paper (宣纸) on a dark
   felt mat, the 米字格 grid in red, and the character in pale red to trace over (描红). Ink strokes, the brush, the
   demo, and a red "TT" seal stamped when the character is done.
   BW.paper.* draws the small pictures: the stroke-order steps (笔顺) on the card, the story's numbered characters, and
   the title's brush writing by itself. */
(function () {
  'use strict';
  const BW = window.BW;
  const ink = BW.ink;
  const INK = '#1d1b1a', GUIDE = '#f2b0a6', GUIDE_ON = '#e0473c', DEMO = '#8a2318', GRID = '#d9473d', GRID_DASH = 'rgba(217, 71, 61, 0.42)';
  const FELT = '#2e3b35', RICE = '#fbf3dc';

  const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
  const demoDur = (s) => 0.45 + ink.build(s).len / 110;

  // ---------------------------------------------------------------- one character being written

  function writer() {
    const w = {
      ch: null, level: 'easy', i: 0, misses: 0, missOn: 0, path: null, demo: null, reveals: [], fades: [], done: false, doneT: 0,
      events: [], demos: 0, t: 0, lastWhy: null, goods: 0,
    };
    const strokes = () => (w.ch ? w.ch.s : []);
    w.load = (ch, level = 'easy') => {
      Object.assign(w, { ch, level, i: 0, misses: 0, missOn: 0, path: null, demo: null, reveals: [], fades: [], done: false, doneT: 0, events: [], demos: 0, lastWhy: null, goods: 0 });
    };
    w.stroke = () => strokes()[w.i] || null;
    // the brush touches down (box units)
    w.begin = (x, y) => {
      if (!w.ch || w.done) return false;
      if (w.demo) w.demo = null; // writing stops a demo
      w.path = [{ x, y, w: ink.WIDTH * 1.15 }];
      return true;
    };
    w.move = (x, y, dt = 1 / 60) => {
      if (!w.path) return;
      const last = w.path[w.path.length - 1];
      const d = Math.hypot(x - last.x, y - last.y);
      if (d < 0.5) return;
      // a slow brush leaves a fatter line, a quick one a thinner line
      const speed = d / Math.max(dt, 1 / 240);
      const want = ink.WIDTH * Math.max(0.6, Math.min(1.2, 1.25 - speed / 260));
      w.path.push({ x, y, w: last.w * 0.75 + want * 0.25 });
    };
    // the brush lifts: was that the stroke?
    w.end = () => {
      const path = w.path;
      w.path = null;
      if (!path || !w.ch || w.done) return null;
      const s = w.stroke();
      const others = strokes().filter((o) => o !== s);
      const r = ink.judge(s, path, w.level, { others });
      if (r.ok) {
        w.reveals.push({ i: w.i, t: 0, path });
        w.events.push({ type: 'good', i: w.i, why: r.why });
        w.i++;
        w.goods++;
        w.missOn = 0;
        w.lastWhy = null;
        if (w.i >= strokes().length) {
          w.done = true;
          w.doneT = 0;
          w.events.push({ type: 'complete', misses: w.misses });
        }
      } else {
        w.misses++;
        w.missOn++;
        w.lastWhy = r.why;
        w.fades.push({ path, t: 0 });
        let other = null;
        if (r.why === 'other') other = r.which < w.i ? r.which : r.which + 1;
        w.events.push({ type: 'miss', i: w.i, why: r.why, other, missOn: w.missOn });
        // two misses on a stroke: it shows itself
        if (w.missOn % 2 === 0) w.hint(1, 'auto');
      }
      return r;
    };
    w.cancel = () => {
      w.path = null;
    };
    // play the next stroke as a demo (the brother's helper, or after two misses)
    w.hint = (reps = 2, by = 'buddy') => {
      if (!w.ch || w.done) return false;
      w.demo = { i: w.i, t: 0, reps, by, dur: demoDur(w.stroke()) };
      w.demos++;
      return true;
    };
    // the part of the demo on show: { i, upto 0..1, alpha }
    w.demoNow = () => {
      const d = w.demo;
      if (!d) return null;
      const per = d.dur + 0.45;
      const rep = Math.floor(d.t / per), u = d.t - rep * per;
      if (rep >= d.reps) return null;
      return { i: d.i, upto: ease(u / d.dur), alpha: u > d.dur ? 1 - (u - d.dur) / 0.45 : 1, tip: u <= d.dur + 0.1 };
    };
    // light up the next stroke? (always on EASY, after a miss on NORMAL)
    w.lit = () => !w.done && !!w.ch && (w.level === 'easy' || w.missOn > 0);
    w.update = (dt) => {
      w.t += dt;
      if (w.demo) {
        w.demo.t += dt;
        if (w.demo.t >= w.demo.reps * (w.demo.dur + 0.45) || w.demo.i !== w.i) {
          w.demo = null;
          w.events.push({ type: 'demoEnd' });
        }
      }
      for (let k = w.reveals.length - 1; k >= 0; k--) if ((w.reveals[k].t += dt) >= 0.3) w.reveals.splice(k, 1);
      for (let k = w.fades.length - 1; k >= 0; k--) if ((w.fades[k].t += dt) >= 0.6) w.fades.splice(k, 1);
      if (w.done) w.doneT += dt;
    };
    w.take = () => w.events.splice(0, w.events.length);
    return w;
  }

  // ---------------------------------------------------------------- painting

  // the brush: a black hair tip at (x, y), a red ferrule and a bamboo handle leaning up to the right (box units)
  function brush(g, x, y, k = 1) {
    g.save();
    g.translate(x, y);
    g.rotate(-1.05);
    g.scale(k, k);
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(4, -2.3, 10, -2.4);
    g.lineTo(10, 2.4);
    g.quadraticCurveTo(4, 2.3, 0, 0);
    g.fill();
    g.fillStyle = '#9b1f16';
    g.fillRect(10, -2.5, 2.4, 5);
    const gr = g.createLinearGradient(0, -2, 0, 2);
    gr.addColorStop(0, '#f0cf8a');
    gr.addColorStop(1, '#c4974a');
    g.fillStyle = gr;
    g.fillRect(12.4, -1.9, 26, 3.8);
    g.fillStyle = 'rgba(110, 70, 20, 0.55)';
    for (const nx of [20, 29]) g.fillRect(nx, -1.9, 0.8, 3.8);
    g.fillStyle = '#9b1f16';
    g.beginPath();
    g.arc(39.6, 0, 1.9, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // a kid's brush path (stamped circles, each point its own width)
  function path(g, pts, color, alpha = 1) {
    if (!pts || !pts.length) return;
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[k];
      const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 0.6));
      for (let j = k ? 1 : 0; j <= n; j++) {
        const u = j / n, r = (a.w + (b.w - a.w) * u) / 2;
        const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    g.fill();
    g.globalAlpha = 1;
  }

  // the grid and the paper, in a square of `S` pixels: returns where the 100 x 100 box sits
  function frame(S) {
    const felt = Math.round(S * 0.04), pad = S * 0.035;
    const box = S - 2 * felt - 2 * pad;
    return { felt, x0: felt + pad, y0: felt + pad, scale: box / 100, box };
  }
  function drawPaper(g, S, f, seed = 7) {
    g.fillStyle = FELT;
    g.beginPath();
    Kit.gfx.roundRect(g, 0, 0, S, S, S * 0.045);
    g.fill();
    g.fillStyle = RICE;
    g.fillRect(f.felt, f.felt, S - 2 * f.felt, S - 2 * f.felt);
    // rice-paper fibres and a soft warm edge
    let x = seed;
    const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
    g.strokeStyle = 'rgba(160, 130, 80, 0.12)';
    g.lineWidth = Math.max(1, S / 500);
    for (let i = 0; i < 70; i++) {
      const px = f.felt + rnd() * (S - 2 * f.felt), py = f.felt + rnd() * (S - 2 * f.felt), a = rnd() * 6.28, l = 4 + rnd() * S * 0.03;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
      g.stroke();
    }
    const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
    vg.addColorStop(0, 'rgba(255, 250, 235, 0)');
    vg.addColorStop(1, 'rgba(200, 160, 100, 0.18)');
    g.fillStyle = vg;
    g.fillRect(f.felt, f.felt, S - 2 * f.felt, S - 2 * f.felt);
    // 米字格: the red square, and dashed lines across, down and corner to corner
    const { x0, y0, box } = f;
    g.lineWidth = Math.max(1.2, S / 220);
    g.strokeStyle = GRID;
    g.strokeRect(x0, y0, box, box);
    g.strokeStyle = GRID_DASH;
    g.lineWidth = Math.max(1, S / 340);
    g.setLineDash([S / 60, S / 80]);
    g.beginPath();
    g.moveTo(x0 + box / 2, y0);
    g.lineTo(x0 + box / 2, y0 + box);
    g.moveTo(x0, y0 + box / 2);
    g.lineTo(x0 + box, y0 + box / 2);
    g.moveTo(x0, y0);
    g.lineTo(x0 + box, y0 + box);
    g.moveTo(x0 + box, y0);
    g.lineTo(x0, y0 + box);
    g.stroke();
    g.setLineDash([]);
  }
  const inBox = (g, f, dpr) => g.setTransform(dpr * f.scale, 0, 0, dpr * f.scale, dpr * f.x0, dpr * f.y0);

  // the red seal: "TT" in white, slightly turned
  function seal(g, x, y, size, k = 1) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.1);
    g.scale(k, k);
    g.fillStyle = '#c8261e';
    g.beginPath();
    Kit.gfx.roundRect(g, -size / 2, -size / 2, size, size, size * 0.12);
    g.fill();
    g.strokeStyle = 'rgba(255, 240, 225, 0.85)';
    g.lineWidth = size * 0.06;
    g.strokeRect(-size * 0.38, -size * 0.38, size * 0.76, size * 0.76);
    g.fillStyle = '#fff3e6';
    g.font = `${Math.round(size * 0.5)}px ${Kit.gfx.FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('TT', 0, size * 0.04);
    g.restore();
  }

  function paperView(canvas) {
    const g = canvas.getContext('2d');
    const bg = document.createElement('canvas'), bgG = bg.getContext('2d');
    const inkC = document.createElement('canvas'), inkG = inkC.getContext('2d');
    let S = 100, dpr = 1, f = frame(100), key = '', inkKey = '';
    const v = { cursor: null };

    v.resize = (size) => {
      S = Math.max(60, Math.round(size));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [canvas, bg, inkC]) {
        c.width = Math.round(S * dpr);
        c.height = Math.round(S * dpr);
      }
      canvas.style.width = canvas.style.height = `${S}px`;
      f = frame(S);
      key = inkKey = '';
    };
    // screen point -> box units
    v.toUnits = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left - f.x0) / f.scale, y: (cy - r.top - f.y0) / f.scale };
    };
    v.toScreen = (x, y) => {
      const r = canvas.getBoundingClientRect();
      return { x: r.left + f.x0 + x * f.scale, y: r.top + f.y0 + y * f.scale };
    };
    v.frame = () => f;

    function paintBg(w) {
      bgG.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgG.clearRect(0, 0, S, S);
      drawPaper(bgG, S, f);
      if (w.ch) {
        inBox(bgG, f, dpr);
        for (const s of w.ch.s) ink.draw(bgG, s, GUIDE);
      }
    }
    function paintInk(w) {
      inkG.setTransform(dpr, 0, 0, dpr, 0, 0);
      inkG.clearRect(0, 0, S, S);
      if (!w.ch) return;
      inBox(inkG, f, dpr);
      const revealing = new Set(w.reveals.map((r) => r.i));
      for (let i = 0; i < w.i; i++) if (!revealing.has(i)) ink.draw(inkG, w.ch.s[i], INK);
    }

    v.render = (w) => {
      const k1 = `${w.ch ? w.ch.c : ''}|${S}|${dpr}`;
      if (k1 !== key) {
        key = k1;
        paintBg(w);
      }
      const k2 = `${k1}|${w.i}|${w.reveals.length}`;
      if (k2 !== inkKey) {
        inkKey = k2;
        paintInk(w);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bg, 0, 0);
      if (!w.ch) return;
      const t = w.t;
      // the finished character glows gold for a moment
      if (w.done && w.doneT < 1.2) {
        g.save();
        g.shadowColor = `rgba(255, 196, 40, ${0.9 * (1 - w.doneT / 1.2)})`;
        g.shadowBlur = 26 * dpr;
        g.drawImage(inkC, 0, 0);
        g.restore();
      }
      g.drawImage(inkC, 0, 0);
      inBox(g, f, dpr);
      // the next stroke, lit up: brighter red, its start dot and arrows running along it
      const s = w.stroke();
      if (s && w.lit() && !w.path) {
        g.globalAlpha = 0.6 + 0.25 * Math.sin(t * 5);
        ink.draw(g, s, GUIDE_ON);
        g.globalAlpha = 1;
        arrows(g, s, t);
        const p = ink.build(s).pts[0];
        g.fillStyle = '#21a35a';
        g.beginPath();
        g.arc(p.x, p.y, 5.6, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 1.3;
        g.strokeStyle = '#ffffff';
        g.stroke();
        g.fillStyle = '#ffffff';
        g.font = `800 7px ${Kit.gfx.FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(w.i + 1), p.x, p.y + 0.4);
      }
      // good strokes turning into clean ink
      for (const r of w.reveals) {
        const u = Math.min(1, r.t / 0.18);
        path(g, r.path, INK, Math.max(0, 1 - r.t / 0.3) * 0.8);
        ink.draw(g, w.ch.s[r.i], INK, ease(u));
      }
      // misses fading away, with a little shake
      for (const m of w.fades) {
        g.save();
        g.translate(Math.sin(m.t * 60) * 1.2 * (1 - m.t / 0.6), 0);
        path(g, m.path, '#8a8580', 1 - m.t / 0.6);
        g.restore();
      }
      // the demo: the stroke drawing itself, with the brush
      const d = w.demoNow();
      if (d) {
        g.globalAlpha = Math.max(0, d.alpha);
        ink.draw(g, w.ch.s[d.i], DEMO, d.upto);
        g.globalAlpha = 1;
        if (d.tip) {
          const tp = ink.tip(w.ch.s[d.i], d.upto);
          brush(g, tp.x, tp.y);
        }
      }
      // the kid's brush
      if (w.path) {
        path(g, w.path, INK);
        const q = w.path[w.path.length - 1];
        brush(g, q.x, q.y);
      } else if (v.cursor && !w.done) brush(g, v.cursor.x, v.cursor.y, 0.9);
      // the seal comes down
      if (w.done && w.doneT > 0.35) {
        const u = Math.min(1, (w.doneT - 0.35) / 0.16);
        g.globalAlpha = Math.min(1, u * 2);
        seal(g, 92, 92, 15, 1 + (1 - u) * 1.3);
        g.globalAlpha = 1;
      }
    };
    return v;
  }

  // white chevrons sliding along a stroke, the way the brush goes
  function arrows(g, s, t) {
    const b = ink.build(s);
    if (b.len < 14) return;
    const gap = 13, off = (t * 16) % gap;
    g.fillStyle = 'rgba(255, 255, 255, 0.95)';
    for (let d = 8 + off; d < b.len - 6; d += gap) {
      const i = Math.min(b.pts.length - 2, Math.round(d));
      const p = b.pts[i], q = b.pts[Math.min(b.pts.length - 1, i + 2)], o = b.pts[Math.max(0, i - 2)];
      const a = Math.atan2(q.y - o.y, q.x - o.x);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(2.4, 0);
      g.lineTo(-1.6, -2.4);
      g.lineTo(-0.6, 0);
      g.lineTo(-1.6, 2.4);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  // ---------------------------------------------------------------- the small pictures

  // step k of the stroke order: strokes before it in ink, stroke k in red (a canvas `px` square)
  function steps(ch, k, px, o = {}) {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = Math.round(px * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = RICE;
    g.fillRect(0, 0, px, px);
    g.strokeStyle = GRID_DASH;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, px - 1, px - 1);
    const sc = (px * 0.86) / 100;
    g.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * px * 0.07, dpr * px * 0.07);
    ch.s.forEach((s, i) => {
      if (i < k) ink.draw(g, s, INK);
      else if (i === k) ink.draw(g, s, '#e0473c');
      else if (o.ghost) ink.draw(g, s, 'rgba(242, 176, 166, 0.7)');
    });
    return c;
  }

  // a character with each stroke's number at its start, in colours (the story card)
  function numbered(ch, px) {
    const c = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.height = Math.round(px * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const f = frame(px);
    drawPaper(g, px, f, 3);
    inBox(g, f, dpr);
    const COLS = ['#c8261e', '#2f7cf0', '#1f9a4c', '#8a5cf0', '#ff8a1f', '#d6337a', '#0f8f8f', '#7a5a14'];
    ch.s.forEach((s, i) => ink.draw(g, s, COLS[i % COLS.length]));
    ch.s.forEach((s, i) => {
      const pts = ink.build(s).pts;
      // two strokes from the same corner (口 日): the later number sits a little way along its stroke
      const shared = ch.s.slice(0, i).some((o) => Math.hypot(ink.build(o).pts[0].x - pts[0].x, ink.build(o).pts[0].y - pts[0].y) < 8);
      const p = pts[shared ? Math.min(pts.length - 1, 14) : 0];
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(p.x, p.y, 6.2, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 1.4;
      g.strokeStyle = COLS[i % COLS.length];
      g.stroke();
      g.fillStyle = COLS[i % COLS.length];
      g.font = `800 8px ${Kit.gfx.FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), p.x, p.y + 0.5);
    });
    return c;
  }

  // the title's paper: characters writing themselves, one after another, forever
  function showcase(canvas, list) {
    const g = canvas.getContext('2d');
    let S = 0, dpr = 1, f = null, t = 0, ix = 0;
    const bg = document.createElement('canvas');
    function resize(size) {
      S = Math.max(40, Math.round(size));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.height = bg.width = bg.height = Math.round(S * dpr);
      canvas.style.width = canvas.style.height = `${S}px`;
      f = frame(S);
      const bgG = bg.getContext('2d');
      bgG.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPaper(bgG, S, f, 11);
    }
    function step(dt) {
      if (!S) return;
      t += dt;
      const ch = BW.byChar[list[ix % list.length]];
      const durs = ch.s.map((s) => demoDur(s) * 0.8 + 0.12);
      const total = durs.reduce((a, b) => a + b, 0);
      if (t > total + 1.6) {
        t = 0;
        ix++;
        return step(0);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bg, 0, 0);
      inBox(g, f, dpr);
      const fade = t > total + 1.1 ? 1 - (t - total - 1.1) / 0.5 : 1;
      g.globalAlpha = 0.6 * fade;
      for (const s of ch.s) ink.draw(g, s, GUIDE);
      g.globalAlpha = fade;
      let acc = 0;
      for (const [i, s] of ch.s.entries()) {
        const u = (t - acc) / (durs[i] - 0.12);
        acc += durs[i];
        if (u <= 0) break;
        ink.draw(g, s, INK, ease(u));
        if (u < 1) {
          const tp = ink.tip(s, ease(u));
          brush(g, tp.x, tp.y);
        }
      }
      g.globalAlpha = 1;
      if (t > total + 0.2 && fade > 0) seal(g, 92, 92, 15, 1 + Math.max(0, 1 - (t - total - 0.2) / 0.16) * 1.3);
    }
    return { resize, step, get char() { return list[ix % list.length]; } };
  }

  BW.writer = writer;
  BW.paperView = paperView;
  BW.paper = { steps, numbered, showcase, brush, seal, INK, GUIDE };
})();
