#!/usr/bin/env node
/* TT Brush Writing: run the headless check (no browser, no npm).
     node tools/check.js                       the check (must pass), then every sabotage case (each must fail)
     node tools/check.js --sabotage swap-ten   one sabotage case, with its failures listed
   Exit code 0 only if the real check passes and every sabotage case is caught. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
const dir = path.join(__dirname, '..', 'js');
for (const f of ['title.js', 'chars.js', 'strokes.js', 'speech.js', 'check.js']) vm.runInThisContext(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f });

const args = process.argv.slice(2);
const sabIx = args.indexOf('--sabotage');
const show = (r) => {
  for (const f of r.fails.slice(0, 12)) console.log('   ', f);
  if (r.fails.length > 12) console.log(`    … and ${r.fails.length - 12} more`);
};

if (sabIx >= 0) {
  const r = BW.check({ sabotage: args[sabIx + 1] });
  console.log(r.ok ? `sabotage ${r.sabotage}: NOT caught` : `sabotage ${r.sabotage}: caught`);
  show(r);
  process.exit(r.ok ? 1 : 0);
}

const t0 = Date.now();
const r = BW.check();
const s = r.stats;
console.log(`check: ${r.ok ? 'PASS' : 'FAIL'} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`  ${s.chars} characters, ${s.strokes} strokes, ${s.boxes} boxes closed last`);
console.log(`  tracing: ${s.good} good paths, ${s.backwards} backwards (${s.backOther} turned away for another reason), ${s.wrong} other strokes' paths`);
console.log(`  speech: ${JSON.stringify(s.speech)}`);
show(r);

let caught = 0;
for (const sab of BW.check.SABOTAGE) {
  const x = BW.check({ sabotage: sab });
  console.log(`  sabotage ${sab.padEnd(15)} ${x.ok ? 'NOT CAUGHT' : 'caught'}${x.ok ? '' : `: ${x.fails[0]}`}`);
  if (!x.ok) caught++;
}
console.log(`sabotage: ${caught} of ${BW.check.SABOTAGE.length} caught`);
setTimeout(() => process.exit(r.ok && caught === BW.check.SABOTAGE.length ? 0 : 1), 150);
