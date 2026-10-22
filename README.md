# TT Brush Writing

[![TT Brush Writing title screen](docs/screenshot.jpg)](https://adong.github.io/calligraphy-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 拿起毛笔写汉字：按笔顺一笔一画描红，从一、二、三、人、大、小、口、日、月、山、水、火、木写起，写对了盖上红印章、得星星；每个字都有图片卡，还会读出来。Tommy 写简单的，Teddy 写普通的，随时可以叫兄弟来演示下一笔。

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the fonts fall back to the Mac's own, and the voice still works if the device has a Chinese voice (Macs and iPads do).
- **Send one file:** `dist/calligraphy-tt.html` is the whole game in one page, about 870 KB. AirDrop or email it, then open it in a browser.
- **Rebuild that file after any edit:** `python3 kit/tools/bundle.py . --name calligraphy-tt`

Part of the 中国 series. A sheet of rice paper (宣纸) lies on a dark felt mat in a Chinese courtyard: stone paving, a white wall with a grey tiled top and a round moon gate, red lanterns, plum blossom, bamboo, and a pagoda and the karst mountains of Guilin over the wall. Two scrolls hang beside the gate, 山 and 水, mountains and water, the oldest subject of Chinese brush painting. On the paper is the red 米字格 grid Chinese first-graders practise in, with the character in pale red to trace over (描红), exactly as they do at school.

The game stars Teddy and Tommy, with their friends Foxy 🦊 and Froggy 🐸 as classmates. It's built with Claude Code from plain JavaScript and Three.js, on the shared Claude Games kit (the blocky boys, their poses, synth sound, the ? keys panel and English / 中文). There are no image, model, font or sound files: the brush, the ink and every stroke are painted on a canvas, the courtyard and the boys are boxes and spheres, every sound is synthesised, and the characters are read by the browser's own voice.

"TT Brush Writing" is a working title (Alan names the games). It lives in one place, `BW.TITLE` / `BW.NAME` in `js/title.js`, and it stays "TT Brush Writing" in 中文 too.

On the title screen pick **1 PLAYER** (Tommy or Teddy) or **2 PLAYERS**, then a level for each boy, and press **▶ PLAY**. The little paper on the title writes characters by itself, brush and all.

**Writing a character:**

1. The character's card shows its picture, its reading (pinyin) and its meaning, and the voice says it in Chinese (in both languages: how it sounds is part of what's learned). A row of little squares under it shows the stroke order (笔顺), one stroke more in each, the next one in red.
2. Drag the brush over the next stroke, from its **green dot**, the way the **white arrows** run. A slow brush leaves a fatter line, a quick one a thinner line, like a real brush.
3. A good stroke turns into a clean black brush stroke and a note rings (the five-note scale of Chinese folk music). A stroke that goes wrong fades away with a soft boing and a tip: **"OOPS, BACKWARDS! START AT THE GREEN DOT."**, **"FOLLOW THE RED STROKE!"**, **"NOT YET! STROKE 2 COMES FIRST."** (a good copy of a later stroke, written too early). Two misses on one stroke and it **writes itself** with the brush, so you can watch, then it's your turn again.
4. The last stroke: the character glows gold, a red **TT seal** stamps down in the corner, the card shows the stars and where the character came from (山: "Three mountain peaks side by side."), and the voice says it again. Tap the paper (or Enter) for the next one, or wait.
5. After the round: **stars** for every character (no misses ⭐⭐⭐, up to 2 ⭐⭐, more ⭐), the boy's signature move (Teddy's boxing or jump shot, Tommy's Y with ✌️), confetti, a running **TOTAL ⭐** for each boy and **PLAY AGAIN ▶**. Foxy and Froggy cheer every character you finish.

**2 players** take turns, character by character, each at his own level (Tommy 🐣 EASY and Teddy 🔥 NORMAL by default): 3 each, with his own stars. The one whose turn it is lights up in the top-left corner, and who goes first swaps every round.

## Levels

| | 🐣 EASY (for Tommy, 5) | 🔥 NORMAL (for Teddy, 8) |
|---|---|---|
| **Characters** | 31 with 1 to 4 strokes: 一 二 三 十 人 大 小 口 山 日 月 木 火 水 上 下 土 天 工 王 中 力 门 手 牛 女 子 马 心 云 文 | 21 with 4 to 8 strokes: 田 目 白 石 立 正 禾 头 龙 年 好 虫 竹 羊 米 鸟 耳 风 雨 鱼 国, then the EASY ones with 3 or more strokes |
| **A round** | 4 characters | 5 characters |
| **The next stroke** | always lit up, with its green dot and moving arrows | only the pale red character; lit up after a miss |
| **How close** | generous; a dab of the brush on a dot counts | closer, and a dot needs a real flick |

New characters come first, in the order above, so Tommy starts with 一 二 三 十 and Teddy with 田 目 白 石 立. Once they've all been written, the ones with the fewest stars come back first.

## The story card

📜 **STORY** on the title: six pages, in English or 中文. The first characters scratched on turtle shells and bones over 3,000 years ago (甲骨文) began as pictures; ☀️ 日 🌙 月 ⛰️ 山 🌳 木; the brush, the ink, the paper and the inkstone, the Four Treasures of the Study (文房四宝); strokes, with 木 numbered; the stroke-order rules with 十 人 三 日 (across before down, sweep left before sweep right, top before bottom, close the box last); and 描红 in first grade, and writing on red paper for Chinese New Year.

## My characters

📖 **MY CHARACTERS** shows all 52, in the two levels. A character written in a round is yours, with its best stars; tap any of them, written or not, to practise just that one. Saved in this browser (`localStorage`, `brushWritingTT.v1`).

## Controls

| | Keys | Touch / mouse |
|---|---|---|
| write a stroke | | drag on the paper (finger, mouse or pencil) |
| hear the character | Space | 🔈 on the card |
| call your brother (2 players: high five) | T | his face, bottom left |
| next character (when it's done) | Enter | tap the paper |
| sound · pause | M · P or Esc | 🔊 (top right) · ⏸️ |
| menu: play · 1 or 2 players · story · my characters | Enter · 1 2 · S · B | |
| results: play again · my characters · menu | Enter · B · Esc | the buttons |
| story: turn the page · close | ← → · Esc | ◀ ▶ ✕ |

- **One brush at a time:** a second finger on the paper is ignored, so a resting palm or a brother's hand doesn't spoil a stroke.
- **The voice** is the browser's own `speechSynthesis` with a zh-CN voice, preferring on-device ones (Tingting on a Mac or iPad) so it works offline. With no Chinese voice the game stays quiet and carries on. **Sound off mutes the voice too**, whichever switch turns it off (M, the 🔊 at the top right, or the kit's speaker on the menus and in the ? panel): nothing reaches `speechSynthesis` while it's off, and switching off stops a word mid-way.
- **The layout** keeps the paper as big as the screen allows: centred with the card beside it on a computer, iPad or phone on its side; at the top with the card under it on a phone held upright or an iPad standing up. It never goes under the kit's ?, A文 and speaker buttons on the left edge.

## Companion

Call your brother any time, as often as you like: **T** or his face (bottom left). Tommy comes when Teddy plays, Teddy when Tommy plays (`Kit.roster.buddyFor`).

1. He pops in at his buddy size in a puff of stars and does his signature move.
2. He tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌), which lands in your hand.
3. Then the helper: **he shows the next stroke**: it writes itself twice on the paper, the brush moving from the start the way it goes: "TOMMY SAYS: WATCH THE NEXT STROKE!" His help never costs a star.
4. After a while he waves goodbye and pops out. Calling again brings another treat and shows the stroke again.

With **2 players** both brothers are already in the courtyard, so **T is a high five**: they jump, slap hands and ✋ fly.

## The check

`node tools/check.js` (a fraction of a second, no browser) and `game.check()` in the page run `js/check.js`:

- **strokes:** every character's strokes match the standard stroke order: `BW.STD` in `js/chars.js` is a separate table of the order as 笔画 names (横 竖 撇 捺 点 提 横折 竖钩…), typed from the school stroke-order charts, and each character must have the same number of strokes with the same names in the same order. Each drawn stroke must also really be the shape its name says: the brush path is turned into compass runs (a 横折钩 goes E, then S, then hooks NW) and checked against what each name looks like. And the rules of stroke order hold everywhere: across before down where they cross (十 木), sweep left before sweep right where they meet (人 文), a line before the one under it (三 目), a down stroke before the one right of it (耳), and a box closed last, after what's inside it (日 田 国; 10 boxes).
- **tracing:** for all 220 strokes at both levels (440 each): the stroke's own path, made shaky and off-centre like a kid's, is accepted; the same path drawn backwards is rejected as backwards; and every other stroke's path (1,662) is rejected.
- **speech:** with a pretend speechSynthesis and a pretend sound switch, through the game's own `follow()` code: nothing is said with the sound off, a word on its way stops when it's switched off, one word is said with it on. On the page, `game.check()` also checks that with the real sound off the real `speechSynthesis.speak` is never called (it never switches the sound on to test).
- **It can fail:** `BW.check({ sabotage })` breaks one thing on purpose, and the check must catch each of the 12: 十 with its 竖 first, 木 missing a stroke, 一 drawn right to left, 三 with its middle line first, 人 with its 捺 first, 日 shut before the line inside it, a wrong "standard" for 木, a judge that doesn't mind which way the brush went, one that accepts any path, one too strict to accept a good one, the voice ignoring mute, and mute not stopping the voice. `node tools/check.js` exits 0 only if the real check passes and all 12 are caught.

`window.game` also has `start()`, `step(seconds)`, `info()`, `trace()` (the next stroke through real pointer events: `{ reverse, other, dx, dy, touch }`), `write()`, `call()`, `auto()`, `key()`, `story()`, `book()` for tests. `node tools/shoot.js tools/shots.json docs 1200 750` takes screenshots with headless Chrome (muted).

## Not verified

- Hearing the voice and the sounds (all testing was muted), and how well the device's zh-CN voice says single characters.
- Real fingers and an Apple Pencil on an iPad or phone (tested with synthetic mouse and touch events in Chrome), and iPad Safari's speech unlock.
- Real kids: whether EASY is generous enough for Tommy (5) and NORMAL right for Teddy (8), and the auto-demo after two misses.
- The stroke shapes and the stroke-order table by a Chinese teacher. The check proves the drawn strokes agree with the table and the stroke-order rules, not that the table is right; a few strokes have more than one name in different books (好's fourth stroke is 横撇 here, some charts say 横钩).
- Emoji on old iPads (🪨 🧍 🤍 need iOS 13 or 14).
