// Pixel-art unit sprites, drawn as text grids (one character per pixel).
// Team colours are swapped in at draw time, so each sprite serves both sides.
// Key: "." transparent, k outline, s/S skin, h/H hair, t/T team colour,
// m/M/D metal light/mid/dark, w/W wood, g/G gold, b boots, c cloth,
// y/Y straw, n/N horse, p plume, r ruby, e eye white.

export const PALETTE = {
  k: "#22161c",
  s: "#f1c19a",
  S: "#c98a66",
  h: "#5a3524",
  H: "#8a5634",
  m: "#e3e9ef",
  M: "#a3aebb",
  D: "#5d6673",
  w: "#b07a40",
  W: "#6e4520",
  g: "#f6d050",
  G: "#b98a22",
  b: "#4a2f20",
  c: "#efe4c4",
  y: "#ecca6c",
  Y: "#b48b3c",
  n: "#9a6438",
  N: "#5e3b20",
  p: "#f7f2ea",
  r: "#e03a4f",
  e: "#ffffff",
};

export const TEAM = {
  blue: { t: "#4f86e8", T: "#284c9a" },
  red: { t: "#e0503f", T: "#8f2a22" },
};

// Militia: straw hat, tunic, pitchfork.
const MILITIA = [
  "............M.M.",
  ".....kkkk...M.M.",
  "....kyyyyk..MMM.",
  "..kkyyyyyykk.w..",
  "..kYYYYYYYYk.w..",
  "...khssssshk.w..",
  "...ksksskssk.w..",
  "...ksssSssk..w..",
  "....kkssskk..w..",
  "...kttttttk.kw..",
  "..kttTttTttksw..",
  "..ksktttttkkkw..",
  "..kskTTTTTk..w..",
  "...kktttttk..w..",
  "....kTk.kTk..w..",
  "....kbk.kbk..w..",
  "...kbbk.kbbk.w..",
  "...kkk...kkk....",
];

// Cavalry: helmeted rider with a lance on a small horse (head on the left).
const CAVALRY = [
  "...............m",
  "....kkkk......mk",
  "...kMmmMk....mk.",
  "...kMDDMk...mk..",
  "...kmsesk..wk...",
  "...kMssSk.wk....",
  "kk..kttk.wk.....",
  "knk.kttTtkk.....",
  "knnkktTtttk.....",
  "kknNNkkttkkkk.k.",
  "knnnNnnnnnnnnkNk",
  ".kkknnnnnnnnnkNk",
  "...kNnnnnnnnnNk.",
  "...kNnnnnnnnNk..",
  "...kNk.....kNk..",
  "...kNk.....kNk..",
  "...kbk.....kbk..",
  "...kk.......kk..",
];

// Archer: hood, quiver, bow.
const ARCHER = [
  "................",
  ".....kkkkk......",
  "....kTttttk...k.",
  "...kTttttttk..kw",
  "...kTkssssk...kw",
  "...kTsksksk..k.w",
  "...kTsssSsk..k.w",
  "....kkssskk.kc.w",
  "...kkTtttTk.ksw.",
  "..kwkttTtttkkcw.",
  "..kwktTttTtk.kw.",
  "..kwkttttttsk.w.",
  "...kkTTTTTTk..kw",
  "....kttkttk....k",
  "....kTk.kTk.....",
  "....kbk.kbk.....",
  "...kbbk.kbbk....",
  "...kkk...kkk....",
];

// Siege tower: battlements, a team banner window, iron wheels.
const SIEGE = [
  ".kkk..kkk..kkk..",
  ".kwk..kwk..kwk..",
  ".kwkkkkwkkkkwk..",
  ".kwwwwwwwwwwwk..",
  ".kwWwwkkkwwWwk..",
  ".kwwwktTtkwwwk..",
  ".kwWwktTtkwWwk..",
  ".kwwwktTtkwwwk..",
  ".kwwwwkkkwwwwk..",
  ".kwWwwwwwwwWwk..",
  ".kwwwwwwwwwwwk..",
  "kkkkkkkkkkkkkkk.",
  "kMMMMMMMMMMMMMMk",
  "kDDDDDDDDDDDDDDk",
  ".kkkk.kkkk.kkkk.",
  "kMDMk.....kMDMk.",
  "kDDDk.....kDDDk.",
  ".kkk.......kkk..",
];

// Champion: plumed knight in armour with a big sword.
const CHAMPION = [
  ".....pp......m..",
  "....kpppk...kmk.",
  "...kkkkkkk..kmk.",
  "..kmmmmmMMk.kmk.",
  "..kmMkkkkMk.kmk.",
  "..kmkeskesk.kmk.",
  "..kmMssssMk.kmk.",
  "..kkmmmmmkk.kmk.",
  "..kmtttttmk.kmk.",
  ".kmktTtTtkmkgggk",
  ".kmkttgttkmkkgk.",
  ".kMkTTTTTkskkgk.",
  "..kkmmmmmkkk.kk.",
  "...kmMkMmk......",
  "...kMk.kMk......",
  "...kDk.kDk......",
  "..kDDk.kDDk.....",
  "..kkk...kkk.....",
];

// King: crown, beard, royal cloak, sceptre.
const KING = [
  "...k.k.k.k......",
  "...kgkgkgk...kk.",
  "...kgrgggk..kgrk",
  "...kgggggk...kk.",
  "..kkkkkkkkk..kg.",
  "..khssssshk..kg.",
  "..ksksskssk..kg.",
  "..kcssSsssk..kg.",
  "..kccccccck..kg.",
  ".ktkccccckTkkkg.",
  "kTtkcgggckTtkskg",
  "kTttkcgckTTtkk.k",
  "kTtttkckTTTtk...",
  "kTTtttkTTTTtk...",
  ".kTTttttTTTk....",
  "..kkkkkkkkkk....",
  "...kbk..kbk.....",
  "...kkk..kkk.....",
];

export const SPRITES = { M: MILITIA, C: CAVALRY, A: ARCHER, S: SIEGE, H: CHAMPION, K: KING };
