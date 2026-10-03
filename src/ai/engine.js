// A tiny, real next-word predictor for kids to poke at. It counts which word
// follows which in a small story collection (a trigram model, blended with
// shorter contexts the way classic language models were "smoothed").
// Real LLMs learn far richer patterns with neural networks, but the loop is
// the same: look at the words so far, score every possible next token, pick
// one, add it, repeat.

// "3| ..." means the sentence was seen 3 times, so some continuations are
// more common than others, just like in real text.
const STORIES = `
4| the cat sat on the mat .
2| the cat sat on the sofa and fell asleep .
the cat likes to chase the red ball .
the cat likes to sleep in the sun .
the cat jumped over the fence .
the dog sat on the grass .
the dog likes to chase the cat .
the dog likes to dig in the garden .
the dog ate my homework .
2| the dog wagged its tail .
the dog barked at the postman .
3| my robot likes to dance in the rain .
2| my robot likes to help me with my homework .
my robot likes to eat batteries for breakfast .
my robot can fly over the city .
my robot can talk to the cat .
my robot beeps when it is happy .
the robot lives in a big lab .
the robot fixed the broken bicycle .
the robot helped the teacher clean the classroom .
2| the dragon lives in a dark cave .
the dragon lives in the clouds .
the dragon breathed fire on the castle .
the dragon likes to eat noodles .
the dragon flew over the sea .
2| once upon a time there was a brave little cat .
once upon a time there was a dragon who was afraid of the dark .
once upon a time there was a robot who wanted to sing .
once upon a time a girl found a magic key .
once upon a time a boy built a rocket .
3| in singapore we eat chicken rice for lunch .
2| in singapore we eat kaya toast for breakfast .
in singapore we eat ice cream when it is hot .
in singapore it rains almost every afternoon .
in singapore the trains are fast and clean .
singapore is a small island .
singapore is hot and sunny .
singapore is famous for its hawker food .
at school we learn maths and science .
at school we play in the field at recess .
at school my friend shared her snack with me .
my teacher said the answer is twelve .
my teacher likes to read us stories .
my friend and i built a sandcastle at the beach .
my friend likes to draw dragons .
the rocket flew to the moon .
the rocket landed on mars .
the moon is bright tonight .
the sun is hot and bright .
the rain fell on the roof all night .
we went to the park and saw a rainbow .
we went to the zoo and saw a tiger .
we went to the beach and ate ice cream .
2| i like to eat chicken rice .
i like to play football with my friends .
i like to read books about space .
the tiger ran into the jungle .
the tiger is the biggest cat .
the little girl found a shiny stone .
the little boy lost his red balloon .
the red ball rolled under the table .
the big dog chased the little cat up the tree .
it is time to go to sleep .
it is a sunny day today .
`;

const LINES = STORIES.trim()
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const m = s.match(/^(\d+)\| (.*)$/);
    return m ? { times: Number(m[1]), words: m[2].split(" ") } : { times: 1, words: s.split(" ") };
  });

export const CORPUS = LINES.map((l) => l.words);

const tri = new Map();
const bi = new Map();
const uni = new Map();
const bump = (map, key, word, n) => {
  const m = map.get(key) ?? new Map();
  m.set(word, (m.get(word) ?? 0) + n);
  map.set(key, m);
};

for (const { words, times } of LINES) {
  const seq = ["<s>", "<s>", ...words];
  for (let i = 2; i < seq.length; i++) {
    bump(tri, `${seq[i - 2]} ${seq[i - 1]}`, seq[i], times);
    bump(bi, seq[i - 1], seq[i], times);
    uni.set(seq[i], (uni.get(seq[i]) ?? 0) + times);
  }
}

const total = (m) => [...m.values()].reduce((a, b) => a + b, 0);
const UNI_TOTAL = total(uni);

// Splits what a kid typed into lowercase words and punctuation, the way the
// mini engine sees them.
export const engineWords = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9'.,!? ]/g, " ")
    .replace(/([.,!?])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);

// Returns the next-word options as [{ word, count }] (count = a blended
// score) plus how the engine found them: "trigram" (last 2 words),
// "bigram" (last word only) or "guess" (never seen these words).
// Scores mostly come from the last two words, with a little from the last
// word alone and from overall word frequency, so rarer continuations still
// get a small chance.
export function nextWordCounts(words) {
  const w2 = words[words.length - 1] ?? "<s>";
  const w1 = words[words.length - 2] ?? "<s>";
  const t = tri.get(`${w1} ${w2}`);
  const b = bi.get(w2);
  if (!t && !b) {
    const options = [...uni.entries()]
      .filter(([word]) => word !== ".")
      .map(([word, count]) => ({ word, count }))
      .sort((a, c) => c.count - a.count);
    return { options, source: "guess" };
  }
  const [lt, lb, lu] = t ? [0.8, 0.17, 0.03] : [0, 0.85, 0.15];
  const tTotal = t ? total(t) : 1;
  const bTotal = b ? total(b) : 1;
  const candidates = new Set([...(t?.keys() ?? []), ...(b?.keys() ?? [])]);
  const options = [...candidates]
    .map((word) => ({
      word,
      count: lt * ((t?.get(word) ?? 0) / tTotal) + lb * ((b?.get(word) ?? 0) / bTotal) + lu * ((uni.get(word) ?? 0) / UNI_TOTAL),
    }))
    .sort((a, c) => c.count - a.count);
  return { options, source: t ? "trigram" : "bigram" };
}

// Applies the creativity ("temperature") setting: low = always the top
// choice, high = flatter odds so rarer words get picked more.
export function withTemperature(options, temperature) {
  const t = Math.max(0.05, temperature);
  const weights = options.map((o) => Math.pow(o.count, 1 / t));
  const total = weights.reduce((a, b) => a + b, 0);
  return options.map((o, i) => ({ ...o, p: weights[i] / total })).sort((a, b) => b.p - a.p);
}

export function sample(probs, rng = Math.random) {
  let r = rng();
  for (const o of probs) {
    r -= o.p;
    if (r <= 0) return o.word;
  }
  return probs[probs.length - 1].word;
}

// --- Display helpers for the "travel through the AI" pipeline ---

const hash = (s) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

const SUFFIXES = ["ing", "tion", "able", "ness", "ful", "est", "ed", "ly", "er", "s"];

// Chops text into token "bugs". Long words are split into pieces the way
// real tokenizers often do (e.g. "jumping" -> "jump" + "ing").
export function tokenize(text) {
  const tokens = [];
  for (const part of text.match(/[A-Za-z]+|[0-9]+|[^\sA-Za-z0-9]/g) ?? []) {
    if (/^[A-Za-z]+$/.test(part) && part.length > 5) {
      const suffix = SUFFIXES.find((s) => part.toLowerCase().endsWith(s) && part.length - s.length >= 3);
      if (suffix) {
        const stem = part.slice(0, part.length - suffix.length);
        if (stem.length > 7) {
          tokens.push(stem.slice(0, Math.ceil(stem.length / 2)), stem.slice(Math.ceil(stem.length / 2)));
        } else {
          tokens.push(stem);
        }
        tokens.push(part.slice(part.length - suffix.length));
        continue;
      }
      if (part.length > 7) {
        tokens.push(part.slice(0, Math.ceil(part.length / 2)), part.slice(Math.ceil(part.length / 2)));
        continue;
      }
    }
    tokens.push(part);
  }
  return tokens.map((t) => ({ text: t, id: 100 + (hash(t.toLowerCase()) % 49900) }));
}

// Word groups give similar words similar "number lists" (embeddings) and let
// related words pay attention to each other in the pretend attention view.
const GROUPS = {
  animal: ["cat", "dog", "tiger", "dragon", "bird", "fish", "lion", "rabbit", "monkey", "cats", "dogs"],
  food: ["rice", "chicken", "noodles", "toast", "kaya", "cream", "ice", "snack", "breakfast", "lunch", "dinner", "eat", "ate"],
  place: ["singapore", "school", "park", "beach", "zoo", "city", "cave", "lab", "garden", "home", "jungle", "castle"],
  sky: ["sun", "moon", "rain", "rainbow", "clouds", "stars", "sky", "mars", "rocket", "space"],
  person: ["teacher", "friend", "girl", "boy", "mum", "dad", "i", "me", "my", "we", "she", "he"],
  machine: ["robot", "computer", "phone", "batteries", "rocket", "beeps"],
};
const PRONOUNS = ["it", "its", "she", "he", "her", "his", "they", "them", "their"];

const groupOf = (t) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(t.toLowerCase())) ?? null;

const GROUP_VECTORS = {
  animal: [0.8, 0.5, -0.4, 0.2],
  food: [-0.5, 0.8, 0.6, -0.2],
  place: [0.2, -0.7, 0.7, 0.5],
  sky: [-0.6, -0.3, -0.5, 0.9],
  person: [0.6, -0.2, 0.3, -0.8],
  machine: [-0.2, 0.6, -0.8, -0.5],
};

export function embedding(tokenText) {
  const h = hash(tokenText.toLowerCase());
  const jitter = [0, 1, 2, 3].map((i) => (((h >>> (i * 8)) & 255) / 255) * 2 - 1);
  const base = GROUP_VECTORS[groupOf(tokenText)];
  return base ? base.map((b, i) => b * 0.85 + jitter[i] * 0.15) : jitter;
}

// A simplified picture of attention: how much token i "looks back" at each
// earlier token. Nearby words, related words, and nouns that a pronoun like
// "it" refers to get more attention. Real models learn this from data.
export function attention(tokens, i) {
  const target = tokens[i].text.toLowerCase();
  const raw = tokens.map((t, j) => {
    if (j > i) return 0;
    const word = t.text.toLowerCase();
    if (!/[a-z0-9]/.test(word)) return 0.05;
    let w = j === i ? 0.6 : 1 / (i - j + 0.5);
    const g = groupOf(word);
    if (g && g === groupOf(target) && j !== i) w += 1.5;
    if (PRONOUNS.includes(target) && j < i && (GROUPS.animal.includes(word) || GROUPS.machine.includes(word))) w += 3;
    return w;
  });
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((w) => w / total);
}
