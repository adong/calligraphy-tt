/* TT Brush Writing: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   BW.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until Kit.sound.init()
   has run from the first tap. The tunes use the five-note (pentatonic) scale of Chinese folk music. A miss is a soft
   boing, never a buzzer. (The poof, whoosh, high five and sparkle are TT Pinyin Pop's.) */
(function () {
  'use strict';
  const BW = (window.BW = window.BW || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);
  // C D E G A, up two octaves
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

  const sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // the brush touches the paper: a soft, papery hush
    brush() { hiss({ filter: 'bandpass', f: 1800, to: 900, q: 0.6, dur: 0.12, vol: 0.05 }); },
    // a stroke is right: the hush, then a note that climbs with each stroke of the character
    right(n = 0) {
      hiss({ filter: 'bandpass', f: 2400, to: 1200, q: 0.7, dur: 0.1, vol: 0.06 });
      const f = PENTA[Math.min(n, PENTA.length - 1)];
      tone({ type: 'triangle', f, dur: 0.18, vol: 0.11, at: 0.02 });
      tone({ type: 'sine', f: f * 2, dur: 0.22, vol: 0.04, at: 0.05 });
    },
    // not quite: a soft, silly boing
    wrong() {
      tone({ type: 'sine', f: 330, to: 210, dur: 0.16, vol: 0.11 });
      tone({ type: 'sine', f: 210, to: 290, dur: 0.18, vol: 0.08, at: 0.13 });
    },
    // the whole character: a happy pentatonic run
    done() {
      [523, 587, 659, 784, 880, 1047].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.07, dur: 0.2, vol: 0.09 }));
      hiss({ filter: 'highpass', f: 6500, at: 0.4, dur: 0.35, vol: 0.04 });
    },
    // the red seal comes down: a wooden thump
    stamp() {
      tone({ type: 'sine', f: 150, to: 70, dur: 0.14, vol: 0.2 });
      hiss({ filter: 'lowpass', f: 900, dur: 0.06, vol: 0.12 });
    },
    // the end of a round: a bigger fanfare
    round() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f, at: i * 0.11, dur: 0.16, vol: 0.05, lp: 3000 }));
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.46, dur: 0.6, vol: 0.08 }));
      [880, 1047, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, at: 0.9 + i * 0.09, dur: 0.3, vol: 0.09 }));
      hiss({ filter: 'highpass', f: 6000, at: 0.46, dur: 0.5, vol: 0.06 });
    },
    star() { [1319, 1760].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.06, dur: 0.14, vol: 0.07 })); },
    tick() { tone({ type: 'square', f: 1200, dur: 0.025, vol: 0.025, lp: 3000 }); },
    poof() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    whoosh() { hiss({ f: 900, to: 2600, dur: 0.3, vol: 0.06, q: 1.2 }); },
    five() {
      hiss({ filter: 'bandpass', f: 1800, q: 0.7, dur: 0.07, vol: 0.3 });
      tone({ type: 'triangle', f: 880, dur: 0.12, vol: 0.08, at: 0.04 });
      tone({ type: 'triangle', f: 1320, dur: 0.2, vol: 0.07, at: 0.1 });
    },
    // a gong for the story card
    gong() {
      tone({ type: 'sine', f: 110, to: 104, dur: 1.6, vol: 0.12 });
      tone({ type: 'sine', f: 233, to: 226, dur: 1.2, vol: 0.05 });
      hiss({ filter: 'bandpass', f: 600, q: 2, dur: 0.25, vol: 0.05 });
    },
    sparkle() { [1568, 1976, 2349, 2637].forEach((f, i) => tone({ type: 'sine', f, at: i * 0.05, dur: 0.12, vol: 0.045 })); },
  };

  BW.sfx = sfx;
})();
