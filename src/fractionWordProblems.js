// P3 fraction word problems in the style of Singapore school exams and
// assessments. Everything stays within the Primary 3 syllabus: two related
// fractions (one denominator is a multiple of the other), denominators up to
// 12, answers within one whole, and answers given in simplest form.
// The wrong options are built from common P3 mistakes.

const NAMES = ["Aiden", "Mei Ling", "Ravi", "Siti", "Bala", "Chloe", "Hui Min", "Farid", "Priya", "Jun Wei", "Nurul", "Kumar"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const twoNames = () => {
  const a = pick(NAMES);
  let b = pick(NAMES);
  while (b === a) b = pick(NAMES);
  return [a, b];
};

const simplify = (n, d) => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
const fmt = ([n, d]) => `${n}/${d}`;

// A pair of related denominators: small × k = big, big ≤ 12.
function relatedDens() {
  const pairs = [];
  for (let small = 2; small <= 6; small++) {
    for (let k = 2; small * k <= 12; k++) pairs.push([small, small * k, k]);
  }
  return pick(pairs);
}

// A numerator that makes n/d a proper fraction in simplest form.
const simpleNum = (d) => {
  const ns = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) ns.push(n);
  return pick(ns);
};

// A bar of `total` equal units: each segment is [count, symbol].
const bar = (segments) => segments.map(([count, symbol]) => symbol.repeat(count)).join("");

// Builds 3 wrong options (as simplified fractions) that never equal the answer
// in value, topping up with nearby fractions on the same denominator if needed.
function fractionOptions(answer, mistakes, den) {
  const answerStr = fmt(answer);
  const seen = new Set([answerStr]);
  const wrong = [];
  for (const [n, d] of mistakes) {
    if (n <= 0 || d <= 0 || n >= d || d > 12) continue;
    const s = fmt(simplify(n, d));
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
  }
  // Top up with the proper fractions (denominators up to 12) closest in value to the answer.
  if (wrong.length < 3) {
    const target = answer[0] / answer[1];
    const pool = [];
    for (const d of [den, 2, 3, 4, 5, 6, 8, 10, 12]) {
      for (let n = 1; n < d; n++) {
        const s = fmt(simplify(n, d));
        if (!seen.has(s) && !pool.some((x) => x.s === s)) pool.push({ s, gap: Math.abs(n / d - target) + (d === den ? 0 : 0.05) });
      }
    }
    pool.sort((a, b) => a.gap - b.gap);
    for (const { s } of pool) {
      if (wrong.length >= 3) break;
      seen.add(s);
      wrong.push(s);
    }
  }
  return shuffle([answerStr, ...wrong.slice(0, 3)]);
}

// 3 wrong whole-number options from common mistakes, topped up with nearby numbers.
function numberOptions(answer, mistakes, max) {
  const seen = new Set([answer]);
  const wrong = [];
  for (const m of [...mistakes, answer - 1, answer + 2, answer - 2, answer + 3]) {
    if (wrong.length < 3 && m > 0 && m <= max && !seen.has(m)) {
      seen.add(m);
      wrong.push(m);
    }
  }
  return shuffle([answer, ...wrong].map(String));
}

const base = (qId, concept) => ({
  id: qId,
  unit: "",
  topic: "fraction_wp",
  categoryName: `Fraction Word Problems · ${concept}`,
});

const fractionAnswer = (answer) => ({
  inputType: "fraction_full",
  expectedNum: answer[0].toString(),
  expectedDen: answer[1].toString(),
  correctAnswer: fmt(answer),
});

// 1. Two parts added together ("altogether")
function altogether(qId) {
  const [small, big, k] = relatedDens();
  const p = rand(1, small - 1);
  // Keep the total below 1 whole, and both fractions in simplest form.
  const qs = [];
  for (let q = 1; q < big - p * k; q++) if (gcd(q, big) === 1) qs.push(q);
  if (gcd(p, small) !== 1 || qs.length === 0) return altogether(qId);
  const q = pick(qs);
  const total = p * k + q;
  const answer = simplify(total, big);
  const [n1, n2] = twoNames();
  const contexts = [
    {
      text: `${n1} ate ${p}/${small} of a pizza. ${n2} ate ${q}/${big} of the same pizza. What fraction of the pizza did they eat altogether?`,
      what: "pizza eaten",
    },
    {
      text: `Mrs Tan used ${p}/${small} of a bag of flour to bake a cake and ${q}/${big} of the bag to bake some cookies. What fraction of the bag of flour did she use in all?`,
      what: "flour used",
    },
    {
      text: `${n1} painted ${p}/${small} of a wall in the morning and ${q}/${big} of the wall in the afternoon. What fraction of the wall was painted altogether?`,
      what: "wall painted",
    },
    {
      text: `In a garden, ${p}/${small} of the plants are roses and ${q}/${big} of the plants are orchids. What fraction of the plants are roses and orchids?`,
      what: "roses and orchids",
    },
  ];
  const c = pick(contexts);
  return {
    ...base(qId, "Altogether"),
    ...fractionAnswer(answer),
    question: `${c.text}\nGive your answer in its simplest form.`,
    hint: `${p}/${small} and ${q}/${big} have different denominators. Change ${p}/${small} into ${big}ths first, then add.`,
    options: fractionOptions(answer, [[p + q, small + big], [p + q, big], [total + 1, big]], big),
    explanation: {
      concept: "Adding Related Fractions (Part + Part = Whole Amount Used)",
      steps: [
        `Make the denominators the same: ${p}/${small} = ${p * k}/${big}.`,
        `Add: ${p * k}/${big} + ${q}/${big} = ${total}/${big}.`,
        answer[1] !== big ? `Simplest form: ${total}/${big} = ${fmt(answer)}.` : `${total}/${big} is already in simplest form.`,
        `⚠️ Common mistake: adding the tops AND bottoms (${p}+${q})/(${small}+${big}) is wrong!`,
      ],
      model: `1 whole = ${big} equal units\n${bar([[p * k, "🟦"], [q, "🟧"], [big - total, "⬜"]])}\n🟦 ${p * k}/${big}  +  🟧 ${q}/${big}  =  ${total}/${big}${answer[1] !== big ? ` = ${fmt(answer)}` : ""} (${c.what})`,
    },
  };
}

// 2. What is left of one whole (1 − fraction)
function restOfWhole(qId) {
  const den = rand(3, 12);
  const used = rand(1, den - 1);
  const answer = simplify(den - used, den);
  const [n1] = twoNames();
  const usedStr = fmt(simplify(used, den));
  const contexts = [
    `${n1} has read ${usedStr} of a storybook. What fraction of the storybook has ${n1} NOT read yet?`,
    `${n1} cut a ribbon and used ${usedStr} of it to wrap a present. What fraction of the ribbon was NOT used?`,
    `A water tank is ${usedStr} full. What fraction of the tank is empty?`,
    `${usedStr} of the pupils in a class wear spectacles. What fraction of the pupils do NOT wear spectacles?`,
  ];
  const [un, ud] = simplify(used, den);
  return {
    ...base(qId, "Fraction left of 1 whole"),
    ...fractionAnswer(answer),
    question: `${pick(contexts)}\nGive your answer in its simplest form.`,
    hint: `1 whole = ${ud}/${ud}. Subtract ${usedStr} from 1 whole.`,
    options: fractionOptions(answer, [[un, ud], [ud - un + 1, ud], [ud - un, ud + 1]], ud),
    explanation: {
      concept: "Subtracting from 1 Whole",
      steps: [
        `1 whole = ${ud}/${ud}.`,
        `${ud}/${ud} − ${usedStr} = ${ud - un}/${ud}${fmt(simplify(ud - un, ud)) !== `${ud - un}/${ud}` ? ` = ${fmt(answer)}` : ""}.`,
        `⚠️ Read carefully: the question asks for the part that is NOT used, not the part that is used.`,
      ],
      model: `1 whole = ${ud} equal units\n${bar([[un, "🟦"], [ud - un, "⬜"]])}\n🟦 used: ${usedStr}   ⬜ not used: ${fmt(answer)}`,
    },
  };
}

// 3. Had some, used some: what fraction is left (related subtraction)
function leftOver(qId) {
  const [small, big, k] = relatedDens();
  // Start with a/big (or p/small), take away the other.
  const startSmall = Math.random() < 0.5;
  let start, take, startStr, takeStr, leftNum;
  if (startSmall) {
    const p = rand(1, small - 1);
    const q = rand(1, p * k - 1);
    start = p * k;
    take = q;
    startStr = `${p}/${small}`;
    takeStr = `${q}/${big}`;
    leftNum = start - take;
  } else {
    const p = rand(2, big - 1);
    const maxTake = Math.floor((p - 1) / k);
    if (maxTake < 1) return leftOver(qId);
    const q = rand(1, maxTake);
    start = p;
    take = q * k;
    startStr = `${p}/${big}`;
    takeStr = `${q}/${small}`;
    leftNum = start - take;
  }
  if (gcd(...startStr.split("/").map(Number)) !== 1 || gcd(...takeStr.split("/").map(Number)) !== 1) return leftOver(qId);
  const answer = simplify(leftNum, big);
  const [n1] = twoNames();
  const contexts = [
    `${n1} had ${startStr} of a bottle of orange juice. ${n1} drank ${takeStr} of the bottle of juice. What fraction of the bottle of juice was left?`,
    `A baker had ${startStr} of a tray of kueh. The baker sold ${takeStr} of the tray. What fraction of the tray of kueh was left?`,
    `${startStr} of a field was covered with grass. Workers removed the grass from ${takeStr} of the field. What fraction of the field is still covered with grass?`,
  ];
  return {
    ...base(qId, "What is left"),
    ...fractionAnswer(answer),
    question: `${pick(contexts)}\nGive your answer in its simplest form.`,
    hint: `Change both fractions to ${big}ths, then subtract.`,
    options: fractionOptions(answer, [[start + take, big], [Math.abs(Number(startStr.split("/")[0]) - Number(takeStr.split("/")[0])), big], [leftNum + 1, big]], big),
    explanation: {
      concept: "Subtracting Related Fractions",
      steps: [
        `Make the denominators the same: ${startStr} = ${start}/${big}, ${takeStr} = ${take}/${big}.`,
        `Subtract: ${start}/${big} − ${take}/${big} = ${leftNum}/${big}.`,
        fmt(answer) !== `${leftNum}/${big}` ? `Simplest form: ${leftNum}/${big} = ${fmt(answer)}.` : `${leftNum}/${big} is already in simplest form.`,
      ],
      model: `1 whole = ${big} equal units\n${bar([[leftNum, "🟩"], [take, "🟥"], [big - start, "⬜"]])}\nHad 🟩+🟥 = ${start}/${big}   Used 🟥 = ${take}/${big}   Left 🟩 = ${fmt(answer)}`,
    },
  };
}

// 4. How much more / farther (difference of two related fractions)
function difference(qId) {
  const [small, big, k] = relatedDens();
  const p = simpleNum(small);
  let q = rand(1, big - 1);
  while (q === p * k || gcd(q, big) !== 1) q = rand(1, big - 1);
  const a = p * k;
  const more = Math.max(a, q);
  const less = Math.min(a, q);
  const answer = simplify(more - less, big);
  const [n1, n2] = twoNames();
  const fracSmall = `${p}/${small}`;
  const fracBig = fmt(simplify(q, big));
  const winner = a > q ? n1 : n2;
  const loser = a > q ? n2 : n1;
  const contexts = [
    { text: `${n1} jogged ${fracSmall} km. ${n2} jogged ${fracBig} km. How much farther did ${winner} jog than ${loser}?`, unit: "km" },
    { text: `${n1} drank ${fracSmall} ℓ of milk. ${n2} drank ${fracBig} ℓ of milk. How much more milk did ${winner} drink than ${loser}?`, unit: "ℓ" },
    { text: `A red ribbon is ${fracSmall} m long. A blue ribbon is ${fracBig} m long. How much longer is the ${a > q ? "red" : "blue"} ribbon than the ${a > q ? "blue" : "red"} ribbon?`, unit: "m" },
  ];
  const c = pick(contexts);
  return {
    ...base(qId, "How much more"),
    ...fractionAnswer(answer),
    question: `${c.text}\nGive your answer in ${c.unit}, in its simplest form.`,
    hint: `Change ${fracSmall} into ${big}ths, then find the difference (bigger − smaller).`,
    options: fractionOptions(answer, [[a + q, big], [Math.abs(p - q), Math.abs(big - small)], [more - less + 1, big]], big),
    explanation: {
      concept: "Comparison: Finding the Difference",
      steps: [
        `Make the denominators the same: ${fracSmall} = ${a}/${big}, ${fracBig} = ${q}/${big}.`,
        `Difference = ${more}/${big} − ${less}/${big} = ${more - less}/${big}${fmt(answer) !== `${more - less}/${big}` ? ` = ${fmt(answer)}` : ""} ${c.unit}.`,
      ],
      model: `${winner}:  ${bar([[less, "🟦"], [more - less, "🟨"]])}\n${loser}:  ${bar([[less, "🟦"]])}\n🟨 difference = ${fmt(answer)} ${c.unit}`,
    },
  };
}

// 5. Who has the most / least? (compare up to 3 fractions, denominators ≤ 12)
function compare(qId) {
  const dens = [2, 3, 4, 6, 8, 12];
  const names = shuffle(NAMES).slice(0, 3);
  const fracs = [];
  const values = new Set();
  while (fracs.length < 3) {
    const d = pick(dens);
    const n = rand(1, d - 1);
    if (gcd(n, d) !== 1) continue;
    const v = (n * 24) / d;
    if (values.has(v)) continue;
    values.add(v);
    fracs.push({ n, d, v });
  }
  const most = Math.random() < 0.5;
  const order = fracs.map((_, i) => i).sort((x, y) => (most ? fracs[y].v - fracs[x].v : fracs[x].v - fracs[y].v));
  const answer = names[order[0]];
  const list = names.map((nm, i) => `${nm} drank ${fracs[i].n}/${fracs[i].d} of the bottle`);
  return {
    ...base(qId, "Who has the most"),
    inputType: "single_text",
    correctAnswer: answer,
    question: `Three children each had a bottle of water of the same size.\n${list.join(".\n")}.\nWho drank the ${most ? "MOST" : "LEAST"} water?`,
    hint: "Change all the fractions to 24ths (or another common denominator) so you can compare them.",
    options: shuffle(names),
    explanation: {
      concept: "Comparing Unlike Fractions",
      steps: [
        `Change every fraction to 24ths: ${fracs.map((f, i) => `${names[i]}: ${f.n}/${f.d} = ${f.v}/24`).join(", ")}.`,
        `Compare the numerators. The ${most ? "greatest" : "smallest"} is ${fracs[order[0]].v}/24.`,
        `${answer} drank the ${most ? "most" : "least"} water.`,
      ],
      model: order.map((i) => `${names[i].padEnd(8, " ")} ${"▮".repeat(fracs[i].v)} ${fracs[i].n}/${fracs[i].d}`).join("\n"),
    },
  };
}

// 6. Equivalent fractions in context (how many equal pieces?)
function equalPieces(qId) {
  const pieces = pick([6, 8, 10, 12]);
  const smallDens = [2, 3, 4, 5, 6].filter((d) => pieces % d === 0 && d < pieces);
  const d = pick(smallDens);
  let n = rand(1, d - 1);
  while (gcd(n, d) !== 1) n = rand(1, d - 1);
  const answer = (n * pieces) / d;
  const [n1] = twoNames();
  const item = pick([
    ["Mum cut a cake into", "pieces", "cake"],
    ["A chocolate bar has", "squares", "chocolate bar"],
    ["Dad cut a pizza into", "slices", "pizza"],
  ]);
  return {
    ...base(qId, "Equivalent fractions"),
    inputType: "single",
    correctAnswer: answer.toString(),
    question: `${item[0]} ${pieces} equal ${item[1]}. ${n1} ate ${n}/${d} of the ${item[2]}. How many ${item[1]} did ${n1} eat?`,
    hint: `${n}/${d} = ?/${pieces}. What do you multiply ${d} by to get ${pieces}?`,
    options: numberOptions(answer, [n, pieces - answer, n * d, answer + 1], pieces),
    explanation: {
      concept: "Equivalent Fractions in a Word Problem",
      steps: [
        `The whole ${item[2]} = ${pieces}/${pieces}, so each ${item[1].slice(0, -1)} is 1/${pieces}.`,
        `${d} × ${pieces / d} = ${pieces}, so ${n}/${d} = ${n} × ${pieces / d} / ${pieces} = ${answer}/${pieces}.`,
        `${n1} ate ${answer} ${item[1]}.`,
      ],
      model: `${bar([[answer, "🟫"], [pieces - answer, "⬜"]])}\n${n}/${d} = ${answer}/${pieces} → ${answer} ${item[1]}`,
    },
  };
}

// 7. ⭐ Challenge: two parts used, what fraction of the whole is left?
function twoStep(qId) {
  const [small, big, k] = relatedDens();
  const p = simpleNum(small);
  const room = big - p * k;
  if (room < 2) return twoStep(qId);
  // Keep both fractions related: q/big must already be in simplest form.
  const qs = [];
  for (let n = 1; n < room; n++) if (gcd(n, big) === 1) qs.push(n);
  if (qs.length === 0) return twoStep(qId);
  const q = pick(qs);
  const spent = p * k + q;
  const leftNum = big - spent;
  const answer = simplify(leftNum, big);
  const [n1] = twoNames();
  const qStr = fmt(simplify(q, big));
  const contexts = [
    `${n1} spent ${p}/${small} of the pocket money on food and ${qStr} of it on a storybook. What fraction of the pocket money was left?`,
    `A farmer planted corn on ${p}/${small} of a plot of land and chilli on ${qStr} of the plot. The rest of the plot was planted with kangkong. What fraction of the plot was planted with kangkong?`,
    `${n1} used ${p}/${small} of a roll of tape to fix a book and ${qStr} of the roll to wrap a box. What fraction of the roll of tape was left?`,
  ];
  return {
    ...base(qId, "⭐ 2-step challenge"),
    ...fractionAnswer(answer),
    question: `${pick(contexts)}\nGive your answer in its simplest form.`,
    hint: `Step 1: Add the two parts (change ${p}/${small} into ${big}ths first). Step 2: Subtract the total from 1 whole.`,
    options: fractionOptions(answer, [[spent, big], [leftNum + 1, big], [small - p, small]], big),
    explanation: {
      concept: "2-Step: Add the Parts, then Subtract from 1 Whole",
      steps: [
        `Step 1: ${p}/${small} = ${p * k}/${big}. Total used = ${p * k}/${big} + ${q}/${big} = ${spent}/${big}.`,
        `Step 2: 1 whole = ${big}/${big}. Left = ${big}/${big} − ${spent}/${big} = ${leftNum}/${big}${fmt(answer) !== `${leftNum}/${big}` ? ` = ${fmt(answer)}` : ""}.`,
        `⚠️ Don't stop at Step 1! The question asks for what is LEFT.`,
      ],
      model: `1 whole = ${big} equal units\n${bar([[p * k, "🟦"], [q, "🟧"], [leftNum, "⬜"]])}\n🟦 ${p * k}/${big} + 🟧 ${q}/${big} used → ⬜ ${fmt(answer)} left`,
    },
  };
}

const TYPES = [altogether, restOfWhole, leftOver, difference, compare, equalPieces, twoStep];

export function generateFractionWordProblem(qId) {
  return pick(TYPES)(qId);
}

export const FRACTION_WP_TYPES = TYPES;
