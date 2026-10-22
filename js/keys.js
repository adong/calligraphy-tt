/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: BW.NAME, // the name lives in js/title.js
  keys: [
    ['write a stroke', 'drag on the paper'],
    ['hear the character', 'Space'],
    ['call your brother (2 players: high five)', 'T'],
    ['next character (when it\'s done)', 'Enter'],
    ['sound · pause', 'M · P or Esc'],
    ['menu: play · 1 or 2 players · story · my characters', 'Enter · 1 2 · S · B'],
  ],
  note: 'Hold the mouse button and drag over the red stroke, from the green dot, the way the arrows go, one stroke at a time in the right order. A stroke that goes wrong just fades away: try again! After two tries it shows you how.',
  touch: 'Draw with your finger on the paper. Tap 🔈 to hear the character, and your brother\'s face (bottom left) to call him.',
});
