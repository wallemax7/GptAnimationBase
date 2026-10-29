// sheets.js: painted effect references, independent of any character.
// Open studio.html?loop=effects, or render with --loop=effects.
(() => {
  const kinds = ['!', '?', '!!', '!?', 'zzz', 'sweat', 'spark', 'heart', 'hearts', 'anger', 'steam', 'bulb', 'dots', 'scribble', 'music', 'swirl', 'stars', 'cloud'];
  LOOPS.effects = t => {
    kinds.forEach((kind, i) => {
      const x = 160 + (i % 6) * 320, y = 210 + Math.floor(i / 6) * 340;
      boilSeed('effect ' + i);
      emote(kind, x, y, 25, 1, t);
      letter(kind, x, y + 115, 24, PAL.ink, { ink: false });
    });
  };
  LOOPS.effects.len = 4;
})();
