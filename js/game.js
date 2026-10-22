/* TT Brush Writing: the game. Screens (title, story, my characters, play, pause, results), rounds, the card, the boys
   and their friends, the keys and taps, and the layout: the paper as big as the screen allows, the card beside it
   (or under it, upright), never under the kit's buttons on the left edge.
   A round: 4 characters (🐣 EASY) or 5 (🔥 NORMAL), new ones first, in the order of BW.CHARS; 2 players take turns,
   3 each, at their own levels. A character is written stroke by stroke in the standard order; stars for how few
   misses (none: ⭐⭐⭐, up to 2: ⭐⭐, more: ⭐). The brother's help never costs a star.
   window.game is a test hook: start(), step(seconds), info(), write(), trace(), auto(), check() and friends. */
(function () {
  'use strict';
  const BW = window.BW;
  const S = Kit.sound;
  const ST = BW.stage;
  const $ = (id) => document.getElementById(id);
  const { rand, pick } = Kit.gfx;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NAME = { teddy: 'TEDDY', tommy: 'TOMMY' };

  // ---------------------------------------------------------------- saved: who plays, the levels, the characters written

  const SAVE = 'brushWritingTT.v1';
  const store = load();
  function load() {
    const d = { players: 1, who: 'tommy', levels: { teddy: 'normal', tommy: 'easy' }, book: {}, stars: { teddy: 0, tommy: 0 }, first: 'tommy' };
    try {
      const s = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (s && typeof s === 'object') {
        if (s.players === 1 || s.players === 2) d.players = s.players;
        if (s.who === 'teddy' || s.who === 'tommy') d.who = s.who;
        for (const id of ['teddy', 'tommy']) {
          if (s.levels && (s.levels[id] === 'easy' || s.levels[id] === 'normal')) d.levels[id] = s.levels[id];
          if (s.stars && Number.isFinite(s.stars[id])) d.stars[id] = s.stars[id];
        }
        if (s.book && typeof s.book === 'object') for (const c in s.book) if (BW.byChar[c]) d.book[c] = clamp(+s.book[c] || 0, 0, 3);
        if (s.first === 'teddy' || s.first === 'tommy') d.first = s.first;
      }
    } catch (e) { /* private mode: start fresh */ }
    return d;
  }
  function save() {
    try {
      localStorage.setItem(SAVE, JSON.stringify(store));
    } catch (e) { /* private mode */ }
  }

  const G = { state: 'boot', round: null, toasts: [], spots: {}, held: false, auto: false, slip: 0.15, roundNo: 0, musicMode: 'title', results: null, storyPage: 0, sayAt: -1, pointer: null, lay: null, newOnes: new Set(), bot: null };
  const ui = {};
  const actors = {};
  let flyers3d = null, art = {}, view = null, show = null;
  const W = BW.writer();
  const lang = () => (Kit.lang && Kit.lang.get() === 'zh' ? 'zh' : 'en');
  const show_ = (el, on) => el.classList.toggle('hidden', !on);

  function music(mode) {
    G.musicMode = mode;
    S.music(mode);
  }

  // ---------------------------------------------------------------- the round

  const R_ = () => G.round;
  const item = () => (G.round ? G.round.list[G.round.ix] : null);
  const playerNow = () => (G.round ? G.round.players[item().p] : { id: store.who, level: store.levels[store.who] });
  const heroId = () => playerNow().id;
  const heroActor = () => actors[heroId()];

  // the characters for one boy: new ones first in order, then ones to do again (fewest stars first)
  function deal(level, n, avoid) {
    const pool = level === 'easy' ? BW.CHARS.filter((c) => c.lv === 1) : BW.CHARS.filter((c) => c.lv === 2).concat(BW.CHARS.filter((c) => c.lv === 1 && c.s.length >= 3));
    const out = [];
    for (const c of pool) if (out.length < n && !store.book[c.c] && !avoid.has(c.c)) out.push(c.c);
    const again = pool.filter((c) => !out.includes(c.c) && !avoid.has(c.c)).map((c) => [store.book[c.c] || 0, Math.random(), c.c]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    while (out.length < n && again.length) out.push(again.shift()[2]);
    return out;
  }

  function playersNow() {
    if (store.players === 2) {
      const first = store.first;
      const other = first === 'teddy' ? 'tommy' : 'teddy';
      return [{ id: first, level: store.levels[first] }, { id: other, level: store.levels[other] }];
    }
    return [{ id: store.who, level: store.levels[store.who] }];
  }

  function startRound(o = {}) {
    if (o.players === 1 || o.players === 2) store.players = o.players;
    if (o.who === 'teddy' || o.who === 'tommy') store.who = o.who;
    if (o.level === 'easy' || o.level === 'normal') store.levels[store.who] = o.level;
    if (o.levels) for (const id of ['teddy', 'tommy']) if (o.levels[id] === 'easy' || o.levels[id] === 'normal') store.levels[id] = o.levels[id];
    if (o.lang && Kit.lang) Kit.lang.set(o.lang);
    const practice = Array.isArray(o.chars) && o.chars.length > 0;
    const players = practice ? [{ id: store.who, level: store.levels[store.who] }] : playersNow();
    let list = [];
    if (practice) list = o.chars.filter((c) => BW.byChar[c]).map((c) => ({ c, p: 0 }));
    else if (players.length === 2) {
      const a = deal(players[0].level, 3, new Set()), b = deal(players[1].level, 3, new Set(a));
      for (let i = 0; i < 3; i++) list.push({ c: a[i], p: 0 }, { c: b[i], p: 1 });
      store.first = players[1].id; // the other one goes first next round
    } else list = deal(players[0].level, players[0].level === 'easy' ? 4 : 5, new Set()).map((c) => ({ c, p: 0 }));
    save();
    G.round = { players, list, ix: 0, results: [], practice, phase: 'intro', t: 0, nextAt: 2.6 };
    G.roundNo++;
    G.newOnes = new Set();
    G.results = null;
    PP_dismiss();
    clearToasts();
    hideScreens();
    G.state = 'play';
    show_(ui.hud, true);
    show_(ui.card, true);
    show_(ui.paperWrap, true);
    show_(ui.callBtn, true);
    buildWho();
    buildDots();
    loadChar();
    music('play');
    layout();
  }
  function PP_dismiss() {
    BW.buddy.dismiss();
    ui.callBtn.classList.remove('here');
  }

  function loadChar() {
    const R = G.round;
    const it = item();
    const ch = BW.byChar[it.c];
    W.load(ch, R.players[it.p].level);
    R.phase = 'intro';
    R.t = 0;
    G.sayAt = 0.45;
    G.pointer = null;
    if (G.bot) G.bot = makeBot();
    renderCard(true);
    markWho();
    markDots();
    if (R.players.length > 1) toast(`${NAME[R.players[it.p].id]}'S TURN!`, 'turn', 1.6);
    callButton();
    placeActors();
  }

  function nextChar() {
    const R = G.round;
    if (!R || G.state !== 'play') return;
    if (R.ix + 1 >= R.list.length) return finishRound();
    R.ix++;
    BW.buddy.dismiss();
    loadChar();
    layout();
  }

  // a stroke was right, wrong, or the character is done
  function handleEvents() {
    const R = G.round;
    for (const e of W.take()) {
      if (e.type === 'good') {
        BW.sfx.right(e.i);
        heroActor().react('hop');
        markSteps();
      } else if (e.type === 'miss') {
        BW.sfx.wrong();
        heroActor().react('oops');
        const n = e.i + 1;
        const msg = {
          backwards: 'OOPS, BACKWARDS! START AT THE GREEN DOT.',
          start: 'START AT THE GREEN DOT!',
          end: 'KEEP GOING, ALL THE WAY TO THE END!',
          shape: 'FOLLOW THE RED STROKE!',
          short: 'PULL THE BRUSH ALONG THE STROKE!',
        }[e.why];
        if (e.why === 'other') toast(e.other > e.i ? `NOT YET! STROKE ${n} COMES FIRST.` : `THAT ONE'S DONE! NOW STROKE ${n}.`, 'miss');
        else toast(msg || 'TRY AGAIN!', 'miss');
        if (e.missOn % 2 === 0) toast('WATCH HOW IT GOES!', 'hint', 2);
        markSteps();
      } else if (e.type === 'complete') {
        const stars = e.misses === 0 ? 3 : e.misses <= 2 ? 2 : 1;
        const it = item();
        const pl = R.players[it.p];
        R.results.push({ c: it.c, p: it.p, id: pl.id, stars, misses: e.misses });
        if (!store.book[it.c]) G.newOnes.add(it.c);
        store.book[it.c] = Math.max(store.book[it.c] || 0, stars);
        save();
        R.phase = 'done';
        R.t = 0;
        const ch = BW.byChar[it.c];
        R.nextAt = G.auto ? 1.2 : ch.pic ? 4.2 : 3;
        BW.sfx.done();
        G.stampAt = 0.35;
        heroActor().react('cheer');
        for (const id of ['foxy', 'froggy']) if (actors[id].visible) actors[id].react('cheer');
        toast(['', '⭐ GOOD!', '⭐⭐ GREAT!', '⭐⭐⭐ PERFECT!'][stars], 'good', 2.2);
        G.sayAt = 0.5;
        const r = ui.paper.getBoundingClientRect();
        BW.fx.overlay.burst(r.left + r.width / 2, r.top + r.height / 2, 26, ['⭐', '✨', '🖌️'], 0.8);
        renderCard(false);
        markDots();
      }
    }
  }

  function finishRound() {
    const R = G.round;
    G.state = 'over';
    W.cancel();
    G.pointer = null;
    BW.buddy.dismiss();
    clearToasts();
    show_(ui.hud, false);
    show_(ui.card, false);
    show_(ui.paperWrap, false);
    show_(ui.callBtn, false);
    const per = R.players.map((pl, k) => {
      const mine = R.results.filter((x) => x.p === k);
      const stars = mine.reduce((t, x) => t + x.stars, 0);
      store.stars[pl.id] += stars;
      return { id: pl.id, level: pl.level, stars, max: mine.length * 3, total: store.stars[pl.id] };
    });
    save();
    G.results = { per, list: R.results.slice(), practice: R.practice };
    ui.oTitle.textContent = R.practice ? 'NICE PRACTICE!' : 'BEAUTIFUL WRITING!';
    ui.oStars.innerHTML = '';
    for (const p of per) {
      const row = document.createElement('div');
      row.className = 'srow';
      const img = document.createElement('img');
      img.src = art[p.id];
      img.alt = '';
      if (p.id === 'tommy') img.className = 'tommy';
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = NAME[p.id];
      const st = document.createElement('span');
      st.className = 'st';
      st.setAttribute('data-no-lang', '');
      for (let i = 0; i < p.stars; i++) {
        const s = document.createElement('i');
        s.textContent = '⭐';
        s.style.animationDelay = `${0.1 + i * 0.08}s`;
        st.appendChild(s);
      }
      const tot = document.createElement('span');
      tot.className = 'tot';
      tot.textContent = `TOTAL ⭐ ${p.total}`;
      row.append(img, nm, st, tot);
      ui.oStars.appendChild(row);
    }
    renderOverWords();
    show_(ui.over, true);
    BW.sfx.round();
    music('over');
    BW.fx.overlay.rain(110);
    placeActors();
    for (const p of per) actors[p.id].react('over');
    G.cheerT = 0.5;
  }
  function renderOverWords() {
    ui.oWords.innerHTML = '';
    if (!G.results) return;
    for (const x of G.results.list) {
      const ch = BW.byChar[x.c];
      const m = document.createElement('div');
      m.className = 'mini';
      m.setAttribute('data-no-lang', '');
      m.innerHTML = `<b>${ch.c}</b><span class="p" data-no-lang>${ch.py}</span><span class="s">${'⭐'.repeat(x.stars)}</span>${G.newOnes.has(x.c) ? `<span class="nw">${lang() === 'zh' ? '新' : 'NEW'}</span>` : ''}`;
      ui.oWords.appendChild(m);
    }
  }

  // ---------------------------------------------------------------- the card

  function renderCard(boing) {
    const it = item();
    if (!it) return;
    const ch = BW.byChar[it.c];
    const zh = lang() === 'zh';
    ui.pic.textContent = ch.emoji;
    if (boing) {
      ui.pic.classList.remove('boing');
      void ui.pic.offsetWidth;
      ui.pic.classList.add('boing');
    }
    ui.cpy.textContent = ch.py;
    ui.cmean.innerHTML = zh ? `<span class="w" data-no-lang>${ch.word}</span><span class="wp" data-no-lang>${ch.wpy}</span>` : `<span data-no-lang>${ch.en}</span>`;
    // the stroke-order steps
    const n = ch.s.length;
    const cw = G.lay ? G.lay.cardW : 240;
    const stepPx = Math.floor(clamp((cw - 30 - (Math.min(n, 8) - 1) * 4) / Math.min(n, 8), document.body.classList.contains('short') ? 22 : 26, 40));
    ui.card.style.setProperty('--step', `${stepPx}px`);
    if (ui.csteps.dataset.c !== ch.c || ui.csteps.dataset.px !== String(stepPx)) {
      ui.csteps.dataset.c = ch.c;
      ui.csteps.dataset.px = String(stepPx);
      ui.csteps.innerHTML = '';
      for (let k = 0; k < n; k++) ui.csteps.appendChild(BW.paper.steps(ch, k, stepPx));
    }
    const R = G.round;
    const done = R && R.phase === 'done';
    show_(ui.cchip, !done);
    show_(ui.cnote, done);
    if (done) {
      const res = R.results[R.results.length - 1];
      ui.cnote.classList.toggle('zh', zh);
      const line = ch.pic ? ch.pic[zh ? 1 : 0] : zh ? `${ch.word}！` : `${ch.en.toUpperCase()}!`;
      ui.cnote.innerHTML = `<span class="st">${'⭐'.repeat(res ? res.stars : 0)}</span>${ch.emoji} ${line}`;
    }
    markSteps();
    placeToasts();
  }
  function markSteps() {
    const it = item();
    if (!it) return;
    const kids = [...ui.csteps.children];
    kids.forEach((c, k) => {
      c.classList.toggle('done', k < W.i);
      c.classList.toggle('now', k === W.i && !W.done);
    });
    const s = W.stroke();
    if (s) {
      const k = W.i + 1, n = W.ch.s.length;
      ui.cchip.innerHTML = lang() === 'zh' ? `<small>第 ${k} 笔（共 ${n} 笔）</small><span class="nm">${s.t}</span>` : `<small>STROKE ${k} OF ${n}</small><span>${BW.STROKE_EN[s.t]}</span>`;
    }
  }
  function buildDots() {
    ui.cdots.innerHTML = '';
    for (const it of G.round.list) {
      const d = document.createElement('i');
      d.className = 'dot' + (it.p === 1 ? ' p1' : '');
      ui.cdots.appendChild(d);
    }
  }
  function markDots() {
    const R = G.round;
    [...ui.cdots.children].forEach((d, i) => {
      const res = R.results[i];
      d.classList.toggle('done', !!res);
      d.classList.toggle('now', i === R.ix && !res);
      d.innerHTML = res ? `<span class="hz">${res.c}</span>` : '';
    });
  }

  // who's writing: top left
  function buildWho() {
    ui.who.innerHTML = '';
    for (const pl of G.round.players) {
      const d = document.createElement('div');
      d.className = `pl ${pl.id}`;
      d.dataset.id = pl.id;
      d.innerHTML = `<img alt="" src="${art[pl.id]}"><div><b>${NAME[pl.id]}</b><small data-no-lang>${pl.level === 'easy' ? '🐣' : '🔥'} ⭐ <span class="sc">0</span></small></div>`;
      ui.who.appendChild(d);
    }
  }
  function markWho() {
    const R = G.round;
    const now = item().p;
    [...ui.who.children].forEach((d, k) => {
      d.classList.toggle('on', R.players.length > 1 && k === now);
      d.classList.toggle('off', R.players.length > 1 && k !== now);
      const got = R.results.filter((x) => x.p === k).reduce((t, x) => t + x.stars, 0);
      d.querySelector('.sc').textContent = String(got);
    });
  }

  // the brother's button: his face (in 2 players: a high five)
  function callButton() {
    const R = G.round;
    const two = R && R.players.length > 1;
    const id = Kit.roster.buddyFor(heroId());
    ui.callFace.src = art[two ? (heroId() === 'teddy' ? 'tommy' : 'teddy') : id];
    ui.callBtn.className = `callbtn ${two ? 'five' : id}`;
    ui.callLbl.textContent = two ? 'HIGH FIVE!' : `CALL ${NAME[id]}`;
  }

  // ---------------------------------------------------------------- toasts

  function toast(text, cls = '', secs = 2.4) {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.textContent = text;
    ui.toasts.appendChild(el);
    G.toasts.push({ el, t: secs });
    while (G.toasts.length > 3) G.toasts.shift().el.remove();
  }
  function stepToasts(dt) {
    for (let i = G.toasts.length - 1; i >= 0; i--) {
      const x = G.toasts[i];
      x.t -= dt;
      if (x.t < 0.3) x.el.classList.add('out');
      if (x.t <= 0) {
        x.el.remove();
        G.toasts.splice(i, 1);
      }
    }
  }
  function clearToasts() {
    for (const x of G.toasts) x.el.remove();
    G.toasts.length = 0;
  }

  // ---------------------------------------------------------------- title, story, my characters

  function buildTitle() {
    // each letter its own colour; a word never breaks across lines
    ui.logoBig.innerHTML = '';
    BW.TITLE.split(' ').forEach((word, k) => {
      if (k) ui.logoBig.appendChild(document.createTextNode(' '));
      const wd = document.createElement('span');
      wd.className = 'wd';
      for (const ch of word) {
        const s = document.createElement('span');
        s.textContent = ch;
        wd.appendChild(s);
      }
      ui.logoBig.appendChild(wd);
    });
    document.title = `${BW.NAME} · Teddy & Tommy`;
    for (const img of document.querySelectorAll('[data-face]')) img.src = art[img.dataset.face];
    for (const b of ui.segPlayers.children) b.onclick = () => setPlayers(+b.dataset.v);
    for (const b of ui.segWho.children) b.onclick = () => setWho(b.dataset.v);
    refreshTitle();
  }
  function setPlayers(n) {
    store.players = n;
    save();
    refreshTitle();
    placeActors();
  }
  function setWho(id) {
    store.who = id;
    save();
    refreshTitle();
  }
  function setLevel(id, level) {
    store.levels[id] = level;
    save();
    refreshTitle();
  }
  function refreshTitle() {
    for (const b of ui.segPlayers.children) b.setAttribute('aria-checked', String(+b.dataset.v === store.players));
    for (const b of ui.segWho.children) b.setAttribute('aria-checked', String(b.dataset.v === store.who));
    show_(ui.segWho, store.players === 1);
    ui.levels.innerHTML = '';
    const ids = store.players === 2 ? ['tommy', 'teddy'] : [store.who];
    for (const id of ids) {
      const row = document.createElement('div');
      row.className = 'lvrow';
      const img = document.createElement('img');
      img.src = art[id];
      img.alt = '';
      if (id === 'tommy') img.className = 'tommy';
      const seg = document.createElement('div');
      seg.className = 'seg';
      seg.setAttribute('role', 'radiogroup');
      seg.setAttribute('aria-label', 'Level');
      for (const [lv, emo, label, sub] of [['easy', '🐣', 'EASY', '1 to 4 strokes'], ['normal', '🔥', 'NORMAL', 'up to 8 strokes']]) {
        const b = document.createElement('button');
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(store.levels[id] === lv));
        b.innerHTML = `<span class="emo">${emo}</span><span>${label}<small>${sub}</small></span>`;
        b.onclick = () => setLevel(id, lv);
        seg.appendChild(b);
      }
      row.append(img, seg);
      ui.levels.appendChild(row);
    }
  }

  function hideScreens() {
    for (const el of [ui.title, ui.story, ui.book, ui.over, ui.pause]) show_(el, false);
  }
  // leave play or the results for a menu screen: no round, no paper, everyone standing easy
  function toMenu(state) {
    G.state = state;
    G.round = null;
    G.pointer = null;
    W.load(null);
    BW.buddy.dismiss();
    clearToasts();
    BW.fx.overlay.clear();
    BW.speech.cancel();
    hideScreens();
    show_(ui.hud, false);
    show_(ui.card, false);
    show_(ui.paperWrap, false);
    show_(ui.callBtn, false);
    for (const id in actors) actors[id].react('idle');
    if (G.musicMode !== 'title') music('title');
  }
  function goTitle() {
    toMenu('title');
    show_(ui.title, true);
    refreshTitle();
    layout();
  }

  const STORY = [
    { art: '🐢 🦴', en: 'More than 3,000 years ago, people in China scratched the first characters onto turtle shells and animal bones. Those first characters were little pictures!',
      zh: '三千多年前，中国人把最早的汉字刻在龟甲和兽骨上，叫甲骨文。最早的汉字，就是一幅幅小图画！' },
    { pairs: [['☀️', '日', 'sun'], ['🌙', '月', 'moon'], ['⛰️', '山', 'mountain'], ['🌳', '木', 'tree']],
      en: 'Over thousands of years the pictures turned into the characters we write today. Can you still see the sun, the moon, the mountain and the tree?',
      zh: '几千年过去，小图画慢慢变成了今天的汉字。你还能看出太阳、月亮、大山和大树吗？' },
    { art: '🖌️ 📜', en: 'People write them with a soft brush dipped in black ink, on thin paper. The brush, the ink, the paper and the inkstone for grinding the ink are called the Four Treasures of the Study.',
      zh: '写毛笔字要用毛笔、墨、纸，还有磨墨用的砚台，它们合起来叫「文房四宝」。' },
    { num: ['木'], en: 'Every character is built from strokes: across, down, sweep left, sweep right, dot… The tree character has four. Follow the numbers!',
      zh: '每个汉字都是一笔一画写成的：横、竖、撇、捺、点……「木」有四笔，跟着数字写一写！' },
    { num: ['十', '人', '三', '日'], en: 'Stroke order has rules: across before down, sweep left before sweep right, top before bottom, and close the box last, after what\'s inside it.',
      zh: '笔顺有规则：先横后竖，先撇后捺，从上到下，先里头后封口。' },
    { art: '🧧 🏮 ✍️', en: 'In first grade, children in China practise in red squares like yours, tracing over red characters. At Chinese New Year, families write wishes with brushes on red paper for the door. Your turn!',
      zh: '中国的小朋友一年级就在这样的格子里描红写字。过年的时候，大家还用毛笔在红纸上写春联、写福字，贴在门上。轮到你啦！' },
  ];
  function openStory() {
    toMenu('story');
    G.storyPage = 0;
    show_(ui.story, true);
    renderStory();
    layout();
    BW.sfx.gong();
  }
  function closeStory() {
    goTitle();
  }
  function storyGo(d) {
    const p = G.storyPage + d;
    if (p < 0) return;
    if (p >= STORY.length) return closeStory();
    G.storyPage = p;
    renderStory();
    BW.sfx.tick();
  }
  function renderStory() {
    const pg = STORY[G.storyPage];
    const zh = lang() === 'zh';
    ui.storyArt.innerHTML = '';
    const short = innerHeight < 520;
    if (pg.art) ui.storyArt.textContent = pg.art;
    if (pg.pairs)
      for (const [e, c, en] of pg.pairs) {
        const d = document.createElement('div');
        d.className = 'pair';
        d.innerHTML = `<i>${e}</i><b>${c}</b>`;
        ui.storyArt.appendChild(d);
      }
    if (pg.num) {
      const px = pg.num.length > 1 ? (short ? 66 : 96) : short ? 90 : 150;
      for (const c of pg.num) ui.storyArt.appendChild(BW.paper.numbered(BW.byChar[c], px));
    }
    ui.storyText.textContent = zh ? pg.zh : pg.en;
    ui.storyText.classList.toggle('zh', zh);
    ui.storyDots.innerHTML = STORY.map((_, i) => `<i class="${i === G.storyPage ? 'on' : ''}"></i>`).join('');
    ui.storyPrev.style.visibility = G.storyPage ? '' : 'hidden';
    ui.storyNext.textContent = G.storyPage === STORY.length - 1 ? "LET'S WRITE! ▶" : 'NEXT ▶';
  }

  function openBook() {
    toMenu('book');
    show_(ui.book, true);
    renderBook();
    layout();
  }
  function closeBook() {
    goTitle();
  }
  function renderBook() {
    const got = BW.CHARS.filter((c) => store.book[c.c]).length;
    ui.bookCount.textContent = lang() === 'zh' ? `已经写了 ${got} / ${BW.CHARS.length} 个字` : `${got} of ${BW.CHARS.length} written`;
    for (const [el, lv] of [[ui.bookEasy, 1], [ui.bookNormal, 2]]) {
      el.innerHTML = '';
      for (const ch of BW.CHARS.filter((c) => c.lv === lv)) {
        const b = document.createElement('button');
        const st = store.book[ch.c] || 0;
        b.className = 'tile' + (st ? '' : ' no');
        b.setAttribute('data-no-lang', '');
        b.setAttribute('aria-label', `${ch.c} ${ch.py}`);
        b.innerHTML = `<span class="e">${ch.emoji}</span><b>${ch.c}</b><span class="p">${ch.py}</span><span class="s">${'⭐'.repeat(st)}</span>`;
        b.onclick = () => startRound({ chars: [ch.c] });
        el.appendChild(b);
      }
    }
  }

  // ---------------------------------------------------------------- the boys and their friends in the courtyard

  // where someone stands: a spot on the paving under screen point (x, feet y), `px` pixels tall
  function spotAt(x, y, px) {
    const pos = ST.unproject(x, y, 0, true);
    return { pos, scale: (px * ST.perPx(pos)) / 2.05 };
  }
  function computeSpots() {
    const { W: w, H: h } = ST.size;
    const L = G.lay;
    const feet = h - (h < 520 ? 6 : 12);
    const playing = (G.state === 'play' || G.state === 'paused') && L;
    if (!playing) {
      const portrait = h > w;
      const px = clamp(h * (portrait ? 0.2 : 0.3), 80, 250);
      G.spots.left = spotAt(w * (portrait ? 0.2 : 0.13), feet, px);
      G.spots.right = spotAt(w * (portrait ? 0.8 : 0.87), feet, px);
      G.spots.foxy = spotAt(w * (portrait ? 0.36 : 0.24), feet - px * 0.3, px * 0.62);
      G.spots.froggy = spotAt(w * (portrait ? 0.64 : 0.76), feet - px * 0.3, px * 0.62);
      return;
    }
    const cardB = ui.card.getBoundingClientRect().bottom || L.py + L.S;
    if (!L.portrait) {
      const colL = (60 + L.px) / 2, colR = L.px + L.S + (w - L.px - L.S) / 2, colW = w - L.px - L.S;
      const heroPx = clamp(Math.min(h * 0.5, (L.px - 50) * 1.7), 70, 300);
      const sidePx = clamp(h - 8 - cardB - 10, 50, heroPx * 0.95);
      G.spots.left = spotAt(colL, feet, heroPx);
      G.spots.right = spotAt(colR + colW * 0.12, feet, sidePx);
      G.spots.foxy = spotAt(colR - colW * 0.26, feet - sidePx * 0.22, sidePx * 0.7);
      G.spots.froggy = spotAt(colR + colW * 0.34, feet - sidePx * 0.22, sidePx * 0.7);
    } else {
      const room = h - cardB - 16;
      const px = clamp(room, 70, 280);
      G.spots.left = spotAt(w * 0.3, feet, px);
      G.spots.right = spotAt(w * 0.72, feet, px * 0.92);
      G.spots.foxy = spotAt(w * 0.56, feet - px * 0.24, px * 0.66);
      G.spots.froggy = spotAt(w * 0.88, feet - px * 0.24, px * 0.66);
    }
  }
  function placeActors() {
    computeSpots();
    const R = G.round;
    const menu = !(G.state === 'play' || G.state === 'paused') || !R;
    const two = menu ? store.players === 2 || G.state === 'title' || G.state === 'story' || G.state === 'book' : R.players.length > 1;
    for (const id of ['teddy', 'tommy']) {
      const a = actors[id];
      let side = null;
      if (G.state === 'over' && R) side = R.players.length > 1 ? (id === 'teddy' ? 'left' : 'right') : id === heroId() ? 'left' : null;
      else if (menu) side = id === 'teddy' ? 'left' : 'right';
      else if (id === heroId()) side = 'left';
      else if (two) side = 'right';
      if (!side) {
        if (!(BW.buddy.here && BW.buddy.actor === a)) a.visible = false;
        continue;
      }
      const s = G.spots[side];
      a.place(s.pos.x, 0, s.pos.z);
      a.setScale(s.scale);
      a.faceDefault = side === 'left' ? Math.PI + 0.3 : Math.PI - 0.3;
      a.visible = true;
    }
    // Foxy and Froggy: classmates in 1 player (and on the menus)
    const friends = menu ? !(G.state === 'over' && R && R.players.length > 1) : R.players.length === 1;
    for (const id of ['foxy', 'froggy']) {
      const a = actors[id];
      a.visible = friends;
      if (!friends) continue;
      const s = G.spots[id];
      a.place(s.pos.x, 0, s.pos.z);
      a.setScale(s.scale);
      a.faceDefault = id === 'foxy' ? Math.PI + 0.25 : Math.PI - 0.25;
    }
  }

  // ---------------------------------------------------------------- layout

  function layout() {
    ST.resize();
    BW.fx.overlay.resize();
    const w = innerWidth, h = innerHeight;
    const short = h < 520 || w < 400;
    document.body.classList.toggle('short', short);
    document.body.classList.toggle('narrow', w >= h && w < 900);
    const portrait = h > w * 1.05;
    const top = short ? 52 : 62;
    let S, px, py, card;
    if (!portrait) {
      const side = clamp(w * 0.21, 168, 330);
      S = Math.floor(Math.min(h - 16, w - 2 * side));
      px = Math.round((w - S) / 2);
      py = Math.round((h - S) / 2);
      card = { left: px + S + 10, top, width: w - (px + S) - 18 };
    } else {
      const s1 = Math.min(w - 16, h / 2 - 30 - top), s2 = Math.min(w - 72, h - top - 400);
      if (s1 >= s2) {
        S = Math.floor(s1);
        px = Math.round((w - S) / 2);
      } else {
        S = Math.floor(s2);
        px = Math.round(Math.max(62, (w - S) / 2));
      }
      py = top;
      card = { left: 62, top: py + S + 10, width: w - 70 };
    }
    G.lay = { portrait, px, py, S, top, cardW: card.width };
    ui.paperWrap.style.left = `${px}px`;
    ui.paperWrap.style.top = `${py}px`;
    view.resize(S);
    ui.card.style.left = `${card.left}px`;
    ui.card.style.top = `${card.top}px`;
    ui.card.style.width = `${card.width}px`;
    ui.card.style.setProperty('--pic', `${short ? 38 : clamp(card.width * 0.22, 40, 60)}px`);
    ui.card.classList.toggle('wide', portrait && card.width >= 500);
    if (G.state === 'play' || G.state === 'paused') renderCard(false);
    placeToasts();
    const sh = clamp(Math.min(w, h) * (h < 520 ? 0.3 : 0.24), 90, 190);
    show.resize(sh);
    ui.show.classList.toggle('hidden', h < 430);
    placeActors();
  }

  // toasts: just under the card, off the paper (it's where the writing is)
  function placeToasts() {
    const r = ui.card.getBoundingClientRect();
    if (!r.width) return;
    ui.toasts.style.left = `${Math.round(r.left + r.width / 2)}px`;
    ui.toasts.style.top = `${Math.round(r.bottom + 10)}px`;
    ui.toasts.style.maxWidth = `${Math.round(Math.max(r.width, Math.min(innerWidth - 16, 360)))}px`;
  }

  // ---------------------------------------------------------------- input

  function call() {
    if (G.state !== 'play') return false;
    const ok = BW.buddy.call();
    if (ok && G.round.players.length === 1) ui.callBtn.classList.add('here');
    return ok;
  }
  function sayChar() {
    const it = item();
    if (it) BW.speech.say(it.c);
  }

  function penDown(x, y, id) {
    const R = G.round;
    if (G.state !== 'play' || !R) return false;
    if (R.phase === 'done') {
      if (R.t > 0.8) nextChar();
      return false;
    }
    if (G.pointer !== null) return false;
    R.phase = 'write';
    const u = view.toUnits(x, y);
    if (!W.begin(u.x, u.y)) return false;
    G.pointer = id;
    G.lastMove = performance.now();
    BW.sfx.brush();
    return true;
  }
  function penMove(x, y) {
    const now = performance.now();
    const u = view.toUnits(x, y);
    W.move(u.x, u.y, Math.max(0.004, (now - (G.lastMove || now)) / 1000));
    G.lastMove = now;
  }
  function penUp() {
    G.pointer = null;
    W.end();
    handleEvents();
  }

  function bindInput() {
    const P = ui.paper;
    P.addEventListener('pointerdown', (e) => {
      first();
      if (e.pointerType === 'touch') document.body.classList.add('touch');
      e.preventDefault();
      if (penDown(e.clientX, e.clientY, e.pointerId)) {
        try {
          P.setPointerCapture(e.pointerId);
        } catch (err) { /* synthetic events */ }
      }
    });
    P.addEventListener('pointermove', (e) => {
      if (e.pointerId === G.pointer) {
        const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        for (const c of list.length ? list : [e]) penMove(c.clientX, c.clientY);
      } else if (e.pointerType === 'mouse') view.cursor = view.toUnits(e.clientX, e.clientY);
    });
    const up = (e) => {
      if (e.pointerId === G.pointer) penUp();
    };
    P.addEventListener('pointerup', up);
    P.addEventListener('pointercancel', up);
    P.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') view.cursor = null;
    });
    ui.paperWrap.addEventListener('pointerenter', () => ui.paperWrap.classList.add('brush'));
    const press = (el, fn) => {
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        first();
        el.classList.add('down');
      });
      el.addEventListener('pointerup', () => el.classList.remove('down'));
      el.addEventListener('pointerleave', () => el.classList.remove('down'));
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
    };
    press(ui.callBtn, call);
    press(ui.sayBtn, sayChar);
    ui.pauseBtn.onclick = () => pause(true);
    ui.muteBtn.onclick = () => S.toggleMute();
    ui.playBtn.onclick = () => {
      first();
      startRound();
    };
    ui.storyBtn.onclick = () => openStory();
    ui.bookBtn.onclick = () => openBook();
    ui.bookBack.onclick = () => closeBook();
    ui.storyPrev.onclick = () => storyGo(-1);
    ui.storyNext.onclick = () => storyGo(1);
    ui.storyClose.onclick = () => closeStory();
    ui.oNext.onclick = () => startRound(G.results && G.results.practice ? { chars: G.results.list.map((x) => x.c) } : {});
    ui.oBook.onclick = () => openBook();
    ui.oHome.onclick = () => goTitle();
    ui.resumeBtn.onclick = () => pause(false);
    ui.restartBtn.onclick = () => startRound();
    ui.quitBtn.onclick = () => goTitle();
    addEventListener('pointerdown', first, { capture: true });

    addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      first();
      const k = e.key.toLowerCase();
      if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
      // Enter on a focused button clicks it: don't do it twice
      if ((k === 'enter' || k === ' ') && document.activeElement && document.activeElement.tagName === 'BUTTON' && G.state !== 'play') return;
      const st = G.state;
      if (k === 'm' && st !== 'boot') return S.toggleMute();
      if (st === 'title') {
        if (k === 'enter') return startRound();
        if (k === '1' || k === '2') return setPlayers(+k);
        if (k === 's') return openStory();
        if (k === 'b') return openBook();
        return;
      }
      if (st === 'story') {
        if (k === 'arrowright' || k === 'enter' || k === ' ') storyGo(1);
        else if (k === 'arrowleft') storyGo(-1);
        else if (k === 'escape') closeStory();
        return;
      }
      if (st === 'book') {
        if (k === 'escape' || k === 'backspace' || k === 'b') closeBook();
        return;
      }
      if (st === 'over') {
        if (k === 'enter' || k === ' ') ui.oNext.onclick();
        else if (k === 'escape' || k === 'q') goTitle();
        else if (k === 'b') openBook();
        return;
      }
      if (st === 'paused') {
        if (k === 'escape' || k === 'p' || k === ' ' || k === 'enter') pause(false);
        else if (k === 'r') startRound();
        else if (k === 'q') goTitle();
        return;
      }
      if (st !== 'play') return;
      if (k === ' ') return sayChar();
      if (k === 'escape' || k === 'p') return pause(true);
      if (k === 't') return call();
      if (k === 'enter' && G.round.phase === 'done' && G.round.t > 0.5) return nextChar();
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        S.suspend();
        if (G.state === 'play') pause(true);
      } else S.resume();
    });
  }

  // the first tap or key: sound can start, and iPad Safari lets the voice speak
  function first() {
    if (first.done) return;
    first.done = true;
    S.init();
    BW.speech.unlock();
    music(G.musicMode);
  }

  function pause(on) {
    if (on && G.state === 'play') {
      G.state = 'paused';
      if (G.pointer !== null) {
        W.cancel();
        G.pointer = null;
      }
      BW.speech.cancel();
      show_(ui.pause, true);
      show_(ui.hud, false); // the kit's speaker button takes over the mute while our 🔊 is hidden
      show_(ui.callBtn, false);
      music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = 'play';
      show_(ui.pause, false);
      show_(ui.hud, true);
      show_(ui.callBtn, true);
      music('play');
    }
  }

  // Sound off or on, from M, our 🔊, the kit's speaker button or the ? panel (the voice follows by itself)
  function muted(m) {
    ui.muteBtn.textContent = m ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the autopilot (tests): traces like a kid

  function makeBot() {
    return { wait: 0.5, path: null, k: 0, seed: (G.roundNo * 31 + (G.round ? G.round.ix : 0) * 7) % 997 };
  }
  function shaky(line, amp, seed) {
    let x = seed * 9301 + 49297;
    const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280) * 2 - 1;
    let wx = 0, wy = 0;
    const ox = rnd() * amp, oy = rnd() * amp;
    return line.map((q) => {
      wx = wx * 0.7 + rnd() * amp * 0.4;
      wy = wy * 0.7 + rnd() * amp * 0.4;
      return { x: q.x + ox + wx, y: q.y + oy + wy };
    });
  }
  function botStep(dt) {
    const R = G.round, b = G.bot;
    if (!b || !R || G.state !== 'play') return;
    if (R.phase === 'done') return;
    if (b.path) {
      for (let n = 0; n < 2 && b.k < b.path.length; n++, b.k++) W.move(b.path[b.k].x, b.path[b.k].y, 1 / 120);
      if (b.k >= b.path.length) {
        b.path = null;
        b.wait = rand(0.25, 0.5);
        W.end();
        handleEvents();
      }
      return;
    }
    if (W.demo && W.demo.by === 'auto') return; // watch the demo first
    if ((b.wait -= dt) > 0) return;
    const s = W.stroke();
    if (!s) return;
    b.seed++;
    let line = BW.ink.build(s).pts.slice();
    if (Math.random() < G.slip) line.reverse(); // a slip: backwards
    b.path = shaky(line, R.players[item().p].level === 'easy' ? 3 : 1.8, b.seed);
    b.k = 1;
    R.phase = 'write';
    W.begin(b.path[0].x, b.path[0].y);
  }

  // ---------------------------------------------------------------- the loop

  function step(dt, draw = true) {
    const R = G.round;
    if (G.state === 'play' && R) {
      R.t += dt;
      if (R.phase === 'intro' && R.t > 0.4) R.phase = 'write';
      W.update(dt);
      if (G.auto) botStep(dt);
      handleEvents();
      if (G.sayAt > 0 && (G.sayAt -= dt) <= 0) sayChar();
      if (G.stampAt > 0 && (G.stampAt -= dt) <= 0) BW.sfx.stamp();
      if (R.phase === 'done' && R.t >= R.nextAt) nextChar();
      if (G.state === 'play') ui.callBtn.classList.toggle('here', BW.buddy.here);
    }
    if (G.state === 'over' && (G.cheerT -= dt) <= 0) {
      G.cheerT = rand(0.9, 1.6);
      for (const id of ['foxy', 'froggy']) if (actors[id].visible) actors[id].react('cheer');
    }
    const gdt = G.state === 'paused' ? 0 : dt;
    stepToasts(gdt);
    for (const id in actors) actors[id].update(gdt);
    BW.buddy.update(gdt);
    flyers3d.update(gdt);
    BW.fx.overlay.update(gdt);
    ST.update(gdt);
    if (G.state === 'title') show.step(gdt);
    if (draw) {
      ST.render();
      if (G.state === 'play' || G.state === 'paused') view.render(W);
    }
  }

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!G.held) step(dt);
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    for (const id of ['hud', 'tl', 'tr', 'who', 'card', 'pic', 'cpy', 'cmean', 'csteps', 'cchip', 'cnote', 'cdots', 'sayBtn', 'pauseBtn', 'muteBtn', 'callBtn', 'callFace', 'callLbl', 'toasts',
      'paperWrap', 'paper', 'title', 'logoBig', 'segPlayers', 'segWho', 'levels', 'playBtn', 'storyBtn', 'bookBtn', 'show',
      'story', 'storyArt', 'storyText', 'storyDots', 'storyPrev', 'storyNext', 'storyClose',
      'book', 'bookCount', 'bookEasy', 'bookNormal', 'bookBack',
      'over', 'oTitle', 'oStars', 'oWords', 'oNext', 'oBook', 'oHome', 'pause', 'resumeBtn', 'restartBtn', 'quitBtn']) ui[id] = $(id);
    if (/[?&]touch=1/.test(location.search) || (window.matchMedia && matchMedia('(hover: none)').matches)) document.body.classList.add('touch');
    ST.init($('game'));
    BW.fx.overlay.init($('fx'));
    flyers3d = BW.fx.flyers(ST.scene, 60);
    view = BW.paperView(ui.paper);
    show = BW.paper.showcase(ui.show, ['山', '水', '火', '木', '人', '大', '日', '月', '龙']);
    art = Kit.portraits(['teddy', 'tommy'].map((id) => Kit.roster.get(id)), { size: 160 });
    for (const id of ['teddy', 'tommy', 'foxy', 'froggy']) {
      const a = BW.makeActor();
      a.attach(ST.scene, flyers3d);
      a.set(id, 1);
      actors[id] = a;
    }
    BW.speech.follow(S);
    BW.speech.duck((on) => S.music(on ? 'pause' : G.musicMode));
    BW.buddy.init({
      scene: ST.scene, flyers: flyers3d, toast,
      playing: () => G.state === 'play',
      hero: () => heroActor(),
      players: () => (G.round ? G.round.players.length : 1),
      actorFor: (id) => actors[id],
      spot: () => (computeSpots(), G.spots.right),
      // the brother's help: the next stroke plays on the paper, twice
      hint: () => {
        if (!G.round || G.round.phase === 'done' || !W.hint(2, 'buddy')) return null;
        BW.sfx.sparkle();
        return W.i + 1;
      },
    });
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    S.onMute(muted);
    buildTitle();
    bindInput();
    Kit.lang.onChange(() => {
      if (G.state === 'play' || G.state === 'paused') renderCard(false);
      if (G.state === 'story') renderStory();
      if (G.state === 'book') renderBook();
      if (G.state === 'over') renderOverWords();
      refreshTitle();
    });
    goTitle();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  // the voice on this page: with the sound off, nothing reaches the real speechSynthesis
  function speechWiring() {
    const synth = window.speechSynthesis;
    if (!synth) return { ok: true, skipped: 'no speechSynthesis' };
    if (!S.isMuted()) return { ok: true, skipped: 'the sound is on (tests run muted)' };
    const speak = synth.speak;
    let speaks = 0;
    synth.speak = function (u) {
      speaks++;
      return speak.call(synth, u);
    };
    try {
      const said = BW.speech.say('山');
      sayChar();
      BW.speech.unlock();
      return { ok: speaks === 0 && !said, speaks };
    } finally {
      synth.speak = speak;
    }
  }

  // trace stroke `i` (default: the next one) as a kid would, through real pointer events on the paper
  function tracePointer(o = {}) {
    const s = W.stroke();
    if (!s) return 'none';
    let line = BW.ink.build(s).pts.slice();
    if (o.reverse) line.reverse();
    if (o.other != null) line = BW.ink.build(W.ch.s[o.other]).pts.slice();
    const pts = line.filter((_, k) => k % 2 === 0 || k === line.length - 1).map((q) => view.toScreen(q.x + (o.dx || 0), q.y + (o.dy || 0)));
    const ev = (type, p) => ui.paper.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, pointerId: 7, pointerType: o.touch ? 'touch' : 'mouse', bubbles: true, isPrimary: true, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', pts[0]);
    for (const p of pts.slice(1)) ev('pointermove', p);
    ev('pointerup', pts[pts.length - 1]);
    return { i: W.i, done: W.done, misses: W.misses, why: W.lastWhy };
  }

  window.game = {
    // advance `secs` of game time in 1/60 s steps, drawing once at the end (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60, i === n - 1);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    // start({ players: 1 | 2, who, level, levels: { teddy, tommy }, lang: 'en' | 'zh', chars: ['山'] })
    start(opts = {}) {
      first();
      startRound(opts);
      return game.info();
    },
    home: () => goTitle(),
    story: () => openStory(),
    storyGo: (d) => storyGo(d),
    book: () => openBook(),
    pause: (on = true) => pause(on),
    call: () => call(),
    say: () => sayChar(),
    next: () => nextChar(),
    // trace the next stroke through real pointer events ({ reverse, other: index, dx, dy, touch })
    trace: (o) => tracePointer(o),
    // write the rest of the character, stroke by stroke, correctly
    write() {
      let n = 0;
      while (W.ch && !W.done && n++ < 12) tracePointer();
      return game.info();
    },
    // the autopilot plays the kid's side (slip: how often a stroke goes backwards)
    auto(on = true, slip = 0.15) {
      G.auto = on;
      G.slip = slip;
      G.bot = on ? makeBot() : null;
    },
    key: (k, o = {}) => dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k }, o))),
    check(opts = {}) {
      const r = BW.check(opts);
      if (!opts.sabotage) {
        const w = speechWiring();
        r.speechWiring = w;
        if (!w.ok) {
          r.ok = false;
          r.fails.push('speech: on the page, ' + JSON.stringify(w));
        }
      }
      return r;
    },
    resetBook() {
      store.book = {};
      store.stars = { teddy: 0, tommy: 0 };
      save();
    },
    info() {
      const R = G.round, it = item();
      const pr = ui.paperWrap.getBoundingClientRect(), cr = ui.card.getBoundingClientRect();
      return {
        state: G.state, lang: lang(), roundNo: G.roundNo, char: it ? it.c : null, ix: R ? R.ix : -1, list: R ? R.list.map((x) => x.c) : [],
        player: it ? playerNow().id : null, level: it ? playerNow().level : null, phase: R ? R.phase : null,
        stroke: W.i, strokes: W.ch ? W.ch.s.length : 0, misses: W.misses, missOn: W.missOn, lit: W.lit(), demo: W.demo ? { i: W.demo.i, by: W.demo.by } : null, demos: W.demos, done: W.done,
        results: R ? R.results.map((x) => `${x.c}${x.stars}`) : [], over: G.results, buddy: BW.buddy.info(),
        speech: BW.speech.last, spoken: BW.speech.spoken, voice: !!BW.speech.voice(), muted: S.isMuted(),
        book: Object.keys(store.book).length, stars: Object.assign({}, store.stars), story: G.storyPage,
        paper: { x: Math.round(pr.left), y: Math.round(pr.top), w: Math.round(pr.width), h: Math.round(pr.height) },
        card: { x: Math.round(cr.left), y: Math.round(cr.top), w: Math.round(cr.width), h: Math.round(cr.height) },
        chip: ui.cchip.textContent, toasts: G.toasts.map((x) => x.el.textContent),
        actors: Object.fromEntries(Object.entries(actors).map(([id, a]) => [id, { visible: a.visible, pose: a.pose, scale: +a.scale.toFixed(3) }])),
      };
    },
    get G() { return G; },
    get W() { return W; },
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
