/* TT Brush Writing: your brother (from TT Pinyin Pop). Call him any time, as often as you like, with T or his face
   button (Kit.roster.buddyFor: Tommy when Teddy plays, Teddy when Tommy plays). A visit:
     pop in at his roster buddyScale, in a puff of stars → hello with his signature move (Teddy's boxing or jump shot,
     Tommy's Y with ✌️) → toss you a treat (🍦 💧 🧃 🍪 🍉 🍌) → the HELP: the next stroke plays on the paper, twice,
     the brush showing where it starts and which way it goes ("TOMMY SAYS: WATCH THE NEXT STROKE!") → after a while,
     his goodbye move → pop out.
   Calling again while he's there brings another treat and shows the stroke again. It never costs a star.
   With 2 players both brothers are already playing, so T is a high five instead: both jump, slap hands, and ✋ fly. */
(function () {
  'use strict';
  const T = THREE;
  const BW = (window.BW = window.BW || {});
  const { pick, emojiTexture, rand } = Kit.gfx;

  const V = { pop: 0.35, treatAt: 0.85, flight: 0.6, hintAt: 1.6, stay: 6.5, bye: 1.5 };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];

  let api = null, treat = null;
  // phase: off | here | bye
  const b = { phase: 'off', t: 0, actor: null, entry: null, popIn: false, scale: 1, treatAt: -1, hintAt: -1, leaveAt: -1, calls: 0, treats: 0, hints: 0, lastTreat: null, lastHint: null, popT: -1, popDir: 1 };
  const fly = { t: -1, emoji: '', from: new T.Vector3(), to: new T.Vector3() };
  const tmp = new T.Vector3();

  function init(a) {
    api = a;
    treat = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, depthTest: false, transparent: true }));
    treat.visible = false;
    treat.renderOrder = 22;
    api.scene.add(treat);
  }

  // T or his face: returns false if there's nothing to help with right now (menus, the end of the round)
  function call() {
    if (!api || !api.playing()) return false;
    const hero = api.hero();
    if (!hero || !hero.entry) return false;
    const id = Kit.roster.buddyFor(hero.entry.id);
    if (api.players() === 2) return highFive();
    const two = false;
    b.calls++;
    if (b.phase === 'off' || b.phase === 'bye' || !b.actor || b.actor.entry.id !== id) {
      if (b.actor && b.popIn && b.actor.entry.id !== id) hide();
      b.actor = api.actorFor(id);
      b.entry = b.actor.entry;
      b.popIn = !two;
      if (b.popIn) {
        const spot = api.spot();
        b.scale = spot.scale * (b.entry.buddyScale || 0.8);
        b.actor.place(spot.pos.x, 0, spot.pos.z);
        b.actor.faceDefault = Math.PI - 0.35;
        b.actor.face = null;
        b.actor.setScale(0.01);
        b.actor.visible = true;
        b.popT = 0;
        b.popDir = 1;
        puff(spot.pos, b.scale);
        BW.sfx.poof();
      }
      b.actor.react('hello');
      b.t = 0;
    } else {
      b.actor.react('signature');
      b.t = Math.min(b.t, 0.2);
    }
    b.phase = 'here';
    b.treatAt = b.t + V.treatAt;
    b.hintAt = b.t + V.hintAt;
    b.leaveAt = b.t + V.hintAt + V.stay;
    return true;
  }

  function puff(pos, s) {
    for (let i = 0; i < 10; i++) api.flyers.add(pick(['⭐', '✨', '💫']), pos.x + rand(-0.6, 0.6) * s, pos.y + rand(0.4, 2) * s, pos.z, rand(-2, 2), rand(0.5, 2.5), 0.45 * s, 0.7, rand(-3, 3), 2);
  }

  function throwTreat() {
    const hero = api.hero();
    if (!hero || !hero.person) return;
    const [emoji, name] = pick(TREATS);
    fly.emoji = emoji;
    fly.name = name;
    treat.material.map = emojiTexture(emoji);
    treat.material.needsUpdate = true;
    Kit.people.handWorld(b.actor.person, 1, fly.from);
    Kit.people.handWorld(hero.person, -1, fly.to);
    fly.t = 0;
    treat.visible = true;
    b.actor.act('give', 0.6, 0, true);
    BW.sfx.whoosh();
  }

  function landTreat() {
    const hero = api.hero();
    treat.visible = false;
    fly.t = -1;
    b.treats++;
    b.lastTreat = fly.emoji;
    if (hero) {
      hero.hold(fly.emoji, 6);
      hero.react('hop');
    }
    api.toast(`${fly.emoji} ${fly.name} FROM ${b.entry.name.toUpperCase()}!`, 'treat');
  }

  function giveHint() {
    const which = api.hint(); // the next stroke plays on the paper
    if (!which) return;
    b.hints++;
    b.lastHint = which;
    b.actor.act('point', 1.4, 0, true);
    api.toast(`${b.entry.name.toUpperCase()} SAYS: WATCH THE NEXT STROKE!`, 'hint');
  }

  // 2 players: a high five between the brothers
  function highFive() {
    const ids = ['teddy', 'tommy'];
    for (const id of ids) {
      const a = api.actorFor(id);
      if (!a || !a.visible) continue;
      a.act('high5', 0.9, 3.2, true);
      a.root.updateMatrixWorld(true);
      const p = a.root.position, s = a.scale;
      for (let i = 0; i < 4; i++) api.flyers.add(pick(['✋', '⭐', '✨']), p.x + rand(-0.4, 0.4) * s, p.y + rand(1.8, 2.4) * s, p.z, rand(-1.5, 1.5), rand(1.5, 3), 0.5 * s, 0.9, rand(-2, 2), 3);
    }
    b.fives = (b.fives || 0) + 1;
    BW.sfx.five();
    api.toast('✋ HIGH FIVE! ✋', 'treat', 1.4);
    return true;
  }

  function hide() {
    if (!b.actor) return;
    if (b.popIn) b.actor.visible = false;
    b.actor.react('idle');
    b.phase = 'off';
    b.popT = -1;
  }

  // the round is over, or we're off to the menu
  function dismiss() {
    treat && (treat.visible = false);
    fly.t = -1;
    if (b.phase !== 'off') hide();
    b.actor = null;
    b.phase = 'off';
  }

  function update(dt) {
    if (!api) return;
    if (fly.t >= 0) {
      fly.t += dt / V.flight;
      const u = Math.min(1, fly.t);
      const hero = api.hero();
      if (hero && hero.person) Kit.people.handWorld(hero.person, -1, fly.to);
      tmp.lerpVectors(fly.from, fly.to, u);
      tmp.y += Math.sin(u * Math.PI) * 1.6;
      treat.position.copy(tmp);
      treat.scale.setScalar(0.7 + Math.sin(u * Math.PI) * 0.3);
      treat.material.rotation += dt * 6;
      if (u >= 1) landTreat();
    }
    if (b.phase === 'off' || !b.actor) return;
    b.t += dt;
    if (b.popT >= 0) {
      b.popT += dt / V.pop;
      const u = Math.min(1, b.popT);
      const k = b.popDir > 0 ? 1 - Math.pow(1 - u, 3) * Math.cos(u * 5) : 1 - u;
      b.actor.setScale(Math.max(0.01, b.scale * k));
      if (u >= 1) {
        b.popT = -1;
        if (b.popDir < 0) hide();
      }
    }
    if (b.phase === 'here') {
      if (b.treatAt >= 0 && b.t >= b.treatAt) {
        b.treatAt = -1;
        throwTreat();
      }
      if (b.hintAt >= 0 && b.t >= b.hintAt) {
        b.hintAt = -1;
        giveHint();
      }
      if (b.t >= b.leaveAt && api.playing()) {
        b.phase = 'bye';
        b.byeT = 0;
        b.actor.react('goodbye');
      }
    } else if (b.phase === 'bye') {
      b.byeT += dt;
      if (b.byeT >= V.bye) {
        if (b.popIn) {
          if (b.popT < 0) {
            b.popT = 0;
            b.popDir = -1;
            b.actor.root.updateMatrixWorld(true);
            puff(b.actor.root.position, b.scale);
            BW.sfx.poof();
          }
        } else {
          b.phase = 'off';
          b.actor.react('idle');
        }
      }
    }
  }

  BW.buddy = {
    init, call, update, dismiss,
    get here() { return b.phase !== 'off'; },
    get actor() { return b.actor; },
    info: () => ({ fives: b.fives || 0, phase: b.phase, who: b.entry && b.entry.id, popIn: b.popIn, calls: b.calls, treats: b.treats, hints: b.hints, lastTreat: b.lastTreat, lastHint: b.lastHint, flying: fly.t >= 0, scale: b.actor ? +b.actor.scale.toFixed(3) : 0 }),
    TREATS,
  };
})();
