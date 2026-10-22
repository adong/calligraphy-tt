/* TT Brush Writing in 中文: the words for the screens, buttons, toasts and the ? panel (kit/lang.js does the swapping).
   The kids' names and the game's name stay English. The characters, their pinyin and the card are the learning content:
   the game writes them itself in either language (the card shows the English meaning in English and a word that
   uses the character in 中文), so they're marked data-no-lang. Words from the brief: 写字, 笔画, 笔顺, 毛笔. */
Kit.lang.keep(['TEDDY', 'TOMMY', 'TEDDY & TOMMY', 'TT BRUSH WRITING', 'TT Brush Writing', 'Claude Code', 'Esc', 'FOXY', 'FROGGY']);

Kit.lang.add({
  // title
  'Pick up the brush and write Chinese characters!': '拿起毛笔，一笔一画写汉字！',
  'strokes': '笔画',
  'stroke order': '笔顺',
  'brush': '毛笔',
  'take turns': '轮流写',
  '1 to 4 strokes': '1 到 4 笔',
  'up to 8 strokes': '最多 8 笔',
  '📜 STORY': '📜 汉字的故事',
  '📖 MY CHARACTERS': '📖 我的汉字',
  'Enter play · 1 / 2 players · S story · B my characters · M sound': '回车 开始 · 1 / 2 单人或双人 · S 故事 · B 我的汉字 · M 声音',
  "Who's writing?": '谁来写？',
  'Players': '玩家',
  'Level': '难度',
  'LOADING…': '加载中…',
  // the story card (the pages themselves are written in both languages in js/game.js)
  'Close': '关闭',
  '◀ BACK': '◀ 返回',
  'NEXT ▶': '下一页 ▶',
  "LET'S WRITE! ▶": '开始写字！▶',
  '← → turn the page · Esc close': '← → 翻页 · Esc 关闭',
  // my characters
  'MY CHARACTERS': '我的汉字',
  "Write one in a round and it's yours · tap any character to practise it · Esc back": '写过的字都收在这里 · 点一个字就能练习 · Esc 返回',
  '🐣 EASY': '🐣 简单',
  '🔥 NORMAL': '🔥 普通',
  // the HUD
  'Pause (P)': '暂停 (P)',
  'Pause': '暂停',
  'Sound (M)': '声音 (M)',
  'Sound on or off': '声音开关',
  'Hear it again (Space)': '再听一遍（空格）',
  'Hear it again': '再听一遍',
  'Call your brother (T)': '叫兄弟来帮忙 (T)',
  'Call your brother': '叫兄弟来帮忙',
  'HIGH FIVE!': '击掌！',
  // toasts while writing
  'OOPS, BACKWARDS! START AT THE GREEN DOT.': '哎呀，写反了！从绿点开始。',
  'START AT THE GREEN DOT!': '从绿点开始写！',
  'KEEP GOING, ALL THE WAY TO THE END!': '继续写，一直写到头！',
  'FOLLOW THE RED STROKE!': '照着红色的笔画写！',
  'PULL THE BRUSH ALONG THE STROKE!': '拿着毛笔，顺着笔画拉过去！',
  'TRY AGAIN!': '再试一次！',
  'WATCH HOW IT GOES!': '看看这一笔怎么写！',
  '⭐ GOOD!': '⭐ 不错！',
  '⭐⭐ GREAT!': '⭐⭐ 很棒！',
  '⭐⭐⭐ PERFECT!': '⭐⭐⭐ 完美！',
  '✋ HIGH FIVE! ✋': '✋ 击掌！✋',
  // the end of a round
  'BEAUTIFUL WRITING!': '写得真漂亮！',
  'NICE PRACTICE!': '练得真棒！',
  'PLAY AGAIN ▶': '再写一轮 ▶',
  '🏠 MENU': '🏠 菜单',
  'Enter play again · B my characters · Esc menu': '回车 再写一轮 · B 我的汉字 · Esc 菜单',
  // pause
  '↻ NEW ROUND': '↻ 重新开始',
  'P · Esc · Space resume · R new round · Q menu · M sound': 'P · Esc · 空格 继续 · R 重新开始 · Q 菜单 · M 声音',
  // the ? panel
  'write a stroke': '写一笔',
  'drag on the paper': '在纸上拖动',
  'hear the character': '听这个字怎么读',
  'call your brother (2 players: high five)': '叫兄弟来帮忙（双人：击掌）',
  "next character (when it's done)": '下一个字（写完以后）',
  'sound · pause': '声音 · 暂停',
  'menu: play · 1 or 2 players · story · my characters': '菜单：开始 · 单人或双人 · 故事 · 我的汉字',
  'Hold the mouse button and drag over the red stroke, from the green dot, the way the arrows go, one stroke at a time in the right order. A stroke that goes wrong just fades away: try again! After two tries it shows you how.':
    '按住鼠标，从绿点开始，顺着箭头描红色的笔画，按笔顺一笔一笔写。写错的一笔会慢慢消失，没关系，再试一次！试两次还不对，它会写给你看。',
  "Draw with your finger on the paper. Tap 🔈 to hear the character, and your brother's face (bottom left) to call him.":
    '用手指在纸上写。点 🔈 听这个字怎么读，点左下角兄弟的头像叫他来帮忙。',
});

Kit.lang.rule(/^(TEDDY|TOMMY)'S TURN!$/, '轮到 $1 写啦！');
Kit.lang.rule(/^CALL (TEDDY|TOMMY)$/, '叫 $1');
Kit.lang.rule(/^(TEDDY|TOMMY) SAYS: WATCH THE NEXT STROKE!$/, '$1 说：看好下一笔怎么写！');
Kit.lang.rule(/^NOT YET! STROKE (\d+) COMES FIRST\.$/, '还没到这一笔哦！先写第 $1 笔。');
Kit.lang.rule(/^THAT ONE'S DONE! NOW STROKE (\d+)\.$/, '那一笔写好啦！现在写第 $1 笔。');
Kit.lang.rule(/^TOTAL ⭐ (\d+)$/, '总共 ⭐ $1');
Kit.lang.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (TEDDY|TOMMY)!$/,
  (m, e, item, who) => `${e} ${who} 送来的${{ 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' }[item]}！`);
