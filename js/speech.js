/* TT Brush Writing: saying the characters out loud, with the browser's own speechSynthesis and a zh-CN voice (no
   recordings, no voice cloning). BW.speech.say('山') says shān: the character's own reading, in English mode too (the
   sound of Chinese is part of what's being learned). If the device has no Chinese voice (or no speech at all, as
   offline can be), it says nothing and the game carries on: the picture and the pinyin are always on the card.
   From TT Pinyin Pop:
   - On-device voices come first, so it works offline (Tingting on a Mac or iPad).
   - iPad Safari only speaks after a tap has spoken once: unlock() says a silent " " from the first tap.
   - follow(Kit.sound): the page's one sound switch is the voice's too. While it's off nothing reaches speechSynthesis
     at all, and switching it off from anywhere (M, our 🔊, the kit's speaker, the ? panel) stops a word mid-way.
   - attach(fake) swaps in a pretend speechSynthesis, for the check (js/check.js). */
(function () {
  'use strict';
  const BW = (window.BW = window.BW || {});
  const sab = (BW.sab = BW.sab || {});
  const realSynth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
  const Plain = function (t) { this.text = t; };
  const RealUtter = typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : Plain;
  let synth = realSynth, Utter = RealUtter;
  let voices = [];
  let picked;
  let later = (fn, ms) => setTimeout(fn, ms);
  let unlater = (id) => clearTimeout(id);

  function load() {
    try {
      voices = synth ? synth.getVoices() || [] : [];
    } catch (e) {
      voices = [];
    }
    picked = undefined;
  }
  function listen(s) {
    try {
      if (s && s.addEventListener) s.addEventListener('voiceschanged', load);
      else if (s) s.onvoiceschanged = load;
    } catch (e) { /* old browsers */ }
  }
  if (synth) {
    load();
    listen(synth);
  }

  function voice() {
    if (picked) return picked;
    const norm = (v) => String(v.lang || '').replace('_', '-').toLowerCase();
    const want = ['zh-cn', 'cmn-hans-cn', 'zh-hans-cn', 'zh-hans', 'cmn-cn'];
    const also = ['zh-tw', 'cmn-hant-tw', 'zh-sg', 'zh-hk', 'zh'];
    const rank = (v) => {
      const l = norm(v);
      let s = want.includes(l) ? 0 : also.includes(l) ? 10 : l.startsWith('zh') || l.startsWith('cmn') ? 20 : 99;
      if (!v.localService) s += 3; // on-device first: it works offline
      if (/tingting|ting-ting|lili|yu-shu|google 普通话|microsoft (xiaoxiao|yunxi|huihui)/i.test(v.name || '')) s -= 1;
      return s;
    };
    const best = voices.map((v) => [rank(v), v]).filter((x) => x[0] < 99).sort((a, b) => a[0] - b[0])[0];
    // remember only a found one: Chrome loads its voices late
    if (best) picked = best[1];
    return best ? best[1] : null;
  }

  let muted = () => false;
  let duck = () => {};
  let sayTimer = 0, last = null, spoken = 0;

  // Say `text` (汉字). Returns true if a voice was there to say it.
  function say(text, o = {}) {
    if (!synth || !text || (muted() && !sab.speakMuted)) return false;
    const v = voice();
    if (!v) return false;
    try {
      unlater(sayTimer);
      synth.cancel();
      const u = new Utter(String(text));
      u.voice = v;
      u.lang = v.lang;
      u.rate = o.rate || 0.72;
      u.pitch = 1.05;
      u.volume = 1;
      u.onstart = () => duck(true);
      u.onend = u.onerror = () => duck(false);
      last = { text: String(text), voice: v.name };
      // Chrome can drop a word spoken straight after cancel(): give it a moment
      sayTimer = later(() => {
        try {
          if (muted() && !sab.speakMuted) return; // switched off in that moment
          spoken++;
          synth.speak(u);
        } catch (e) { /* no speech */ }
      }, 60);
      return true;
    } catch (e) {
      return false;
    }
  }

  // (skipped while the sound is off: turning it back on, itself a tap or key, unlocks it)
  function unlock() {
    if (!synth || unlock.done || muted()) return;
    unlock.done = true;
    try {
      const u = new Utter(' ');
      u.volume = 0;
      synth.speak(u);
    } catch (e) { /* no speech */ }
  }

  function cancel() {
    unlater(sayTimer);
    try {
      if (synth) synth.cancel();
    } catch (e) { /* no speech */ }
    duck(false);
  }

  // The page's sound switch (Kit.sound, or a pretend one in the check) is the voice's switch too.
  // Returns an undo (the check follows a pretend switch, then puts the page's back).
  function follow(sound) {
    const prev = muted;
    let on = true;
    muted = () => !!sound.isMuted();
    sound.onMute((m) => {
      if (!on) return;
      if (m) {
        if (!sab.noCancel) cancel();
      } else unlock();
    });
    return () => {
      on = false;
      muted = prev;
    };
  }

  // for the check: a pretend speechSynthesis (and timers that run at once); attach(null) puts the real one back
  function attach(fake, o = {}) {
    synth = fake || realSynth;
    Utter = fake ? Plain : RealUtter; // a real utterance won't take a pretend voice
    later = o.now ? (fn) => (fn(), 0) : (fn, ms) => setTimeout(fn, ms);
    unlater = o.now ? () => {} : (id) => clearTimeout(id);
    unlock.done = false;
    spoken = 0;
    load();
    if (fake) listen(fake);
  }

  BW.speech = {
    say, unlock, cancel, follow, attach, voice,
    has: () => !!voice(),
    duck(fn) { duck = fn; },
    get supported() { return !!synth; },
    get last() { return last; },
    get spoken() { return spoken; },
  };
})();
