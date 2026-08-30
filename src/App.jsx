import React, { useState, useEffect, useRef } from "react";

// --- SYNTHESIZED SOUND EFFECTS (Web Audio API) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Cheerful 3-note chime (C5 -> E5 -> G5)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.15, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.25);
    });
  }

  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Gentle low bonk (F3 -> C3)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.18, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  }
}

const sounds = new SoundManager();

// --- SINGAPORE P3 MATH TOPICS & GENERATOR ---
const TOPICS = [
  { id: "all", name: "🌟 All Topics (Mixed)" },
  { id: "place_value", name: "🔢 Numbers to 10,000" },
  { id: "add_sub", name: "➕ Addition & Subtraction" },
  { id: "mul_div", name: "✖️ Multiplication & Division" },
  { id: "fractions", name: "🍰 Fractions" },
  { id: "money", name: "💰 Money ($ & ¢)" },
  { id: "measurement", name: "📏 Length, Mass & Volume" },
  { id: "time", name: "⏰ Time & Duration" },
  { id: "geometry", name: "📐 Area & Perimeter" },
  { id: "statistics", name: "📊 Bar Graphs" },
  { id: "word_problems", name: "🧩 Bar Model Word Problems" }
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Dedupes a list of candidate numeric distractors against each other and the correct value,
// then tops up with a guaranteed-terminating outward walk if too many candidates collided.
function pickDistractors(correctVal, rawCandidates, minVal = -Infinity) {
  const set = new Set();
  for (const c of rawCandidates) {
    if (c !== correctVal && c >= minVal) set.add(c);
  }
  let step = 1;
  while (set.size < 3) {
    const up = correctVal + step;
    if (up !== correctVal && up >= minVal && !set.has(up)) set.add(up);
    if (set.size < 3) {
      const down = correctVal - step;
      if (down !== correctVal && down >= minVal && !set.has(down)) set.add(down);
    }
    step++;
  }
  return Array.from(set).slice(0, 3);
}

// Same idea, but for pre-formatted string distractors (e.g. "6/8", "1 h 45 min") built from a
// numeric key. `toKey`/`fromKey` convert between the display string and a comparable number so
// collisions can be detected and a fallback can be generated deterministically.
function pickFormattedDistractors(correctStr, rawStrings, fallbackKey, fromKey, minKey = -Infinity) {
  const set = new Set();
  for (const s of rawStrings) {
    if (s !== correctStr) set.add(s);
  }
  let step = 1;
  while (set.size < 3) {
    const candidate = fromKey(fallbackKey + step);
    if (candidate !== correctStr && fallbackKey + step >= minKey && !set.has(candidate)) set.add(candidate);
    step++;
  }
  return Array.from(set).slice(0, 3);
}

function generateDistractors(correctVal, count = 3, minVal = 0) {
  const distractors = new Set();
  const offsets = [1, -1, 10, -10, 100, -100, 2, -2, 5, -5];
  let tries = 0;
  while (distractors.size < count && tries < 30) {
    tries++;
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const candidate = correctVal + offset;
    if (candidate !== correctVal && candidate >= minVal) {
      distractors.add(candidate);
    }
  }
  tries = 0;
  while (distractors.size < count && tries < 30) {
    tries++;
    const candidate = Math.max(minVal, correctVal + rand(-15, 15));
    if (candidate !== correctVal) distractors.add(candidate);
  }
  // Guaranteed-terminating fallback: walk outward from correctVal until enough distinct values are found.
  // (Handles the case where correctVal sits far below minVal, which would otherwise clamp every
  // candidate to the same value and spin forever.)
  let step = 1;
  while (distractors.size < count) {
    const up = correctVal + step;
    if (up !== correctVal && !distractors.has(up)) distractors.add(up);
    if (distractors.size < count) {
      const down = correctVal - step;
      if (down !== correctVal && down >= minVal && !distractors.has(down)) distractors.add(down);
    }
    step++;
  }
  return Array.from(distractors);
}

// Procedural Question Generator
function generateQuestion(selectedTopic) {
  const topicPool = selectedTopic === "all"
    ? ["place_value", "add_sub", "mul_div", "fractions", "money", "measurement", "time", "geometry", "statistics", "word_problems"]
    : [selectedTopic];

  const chosenCategory = topicPool[Math.floor(Math.random() * topicPool.length)];
  const qId = "q_" + Date.now() + "_" + rand(100, 999);

  switch (chosenCategory) {
    // 1. NUMBERS TO 10,000 & PLACE VALUE
    case "place_value": {
      const type = rand(1, 5);
      if (type === 1) {
        const num = rand(1200, 9899);
        const numStr = num.toString();
        const posIndex = rand(0, 3);
        const digit = parseInt(numStr[posIndex], 10);
        const placeNames = ["thousands", "hundreds", "tens", "ones"];
        const multiplier = [1000, 100, 10, 1][posIndex];
        const correct = digit * multiplier;

        const distractors = pickDistractors(correct, [
          digit,
          digit * (multiplier === 1 ? 10 : multiplier / 10),
          digit * (multiplier === 1000 ? 100 : multiplier * 10)
        ], 0);

        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "place_value",
          categoryName: "Numbers to 10,000",
          question: `In the number ${num.toLocaleString()}, what is the value of the digit ${digit}?`,
          hint: `Look at the ${placeNames[posIndex]} place value column.`,
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Place Value Breakdown",
            steps: [
              `Write down place values for ${num}: [Th: ${numStr[0]}] [H: ${numStr[1]}] [T: ${numStr[2]}] [O: ${numStr[3]}].`,
              `The digit ${digit} is in the ${placeNames[posIndex]} place.`,
              `Value = ${digit} × ${multiplier} = ${correct.toLocaleString()}.`
            ],
            model: `Value = ${digit} in ${placeNames[posIndex]} column = ${correct}`
          }
        };
      } else if (type === 2) {
        const step = [10, 20, 50, 100, 200, 500][rand(0, 5)];
        const start = rand(1000, 6000);
        const sequence = [start, start + step, start + 2 * step, start + 3 * step, start + 4 * step];
        const missingIdx = rand(1, 3);
        const correct = sequence[missingIdx];
        const displaySeq = sequence.map((v, i) => (i === missingIdx ? "___" : v.toLocaleString())).join(", ");

        const distractors = generateDistractors(correct, 3, 100);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "place_value",
          categoryName: "Numbers to 10,000",
          question: `Find the missing number in the pattern:\n${displaySeq}`,
          hint: "Find the difference between two neighboring numbers to find the step pattern.",
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Number Pattern Rules",
            steps: [
              `Compare adjacent numbers: ${sequence[0]} to ${sequence[1]} increases by +${step}.`,
              `Confirm: ${sequence[4]} - ${sequence[3]} = +${step}.`,
              `Add ${step} to ${sequence[missingIdx - 1]} to get ${correct}.`
            ],
            model: `Pattern Rule: Count on by +${step} each time`
          }
        };
      } else if (type === 3) {
        const roundTo = Math.random() > 0.5 ? 10 : 100;
        const num = rand(1000, 9900);
        const correct = Math.round(num / roundTo) * roundTo;
        const distractors = pickDistractors(correct, [
          correct + roundTo,
          correct - roundTo,
          roundTo === 10 ? Math.round(num / 100) * 100 : Math.round(num / 10) * 10
        ], roundTo);

        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "place_value",
          categoryName: "Numbers to 10,000",
          question: `Round ${num} to the nearest ${roundTo === 10 ? "ten" : "hundred"}.`,
          hint: roundTo === 10 ? "Check the ones place (5 and up rounds up)." : "Check the tens place (5 and up rounds up).",
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: `Rounding to the Nearest ${roundTo === 10 ? "10" : "100"}`,
            steps: [
              `Look at the digit immediately to the right of the ${roundTo === 10 ? "tens" : "hundreds"} place.`,
              `5, 6, 7, 8, 9 round UP; 0, 1, 2, 3, 4 round DOWN.`,
              `Result: ${num} rounds to ${correct}.`
            ],
            model: `${num} is closer to ${correct}`
          }
        };
      } else if (type === 4) {
        const digits = [];
        while (digits.length < 4) {
          const d = rand(1, 9);
          if (!digits.includes(d)) digits.push(d);
        }
        const isSmallest = Math.random() > 0.5;
        const sorted = [...digits].sort((a, b) => (isSmallest ? a - b : b - a));
        const correct = sorted.join("");

        const distractors = [
          [...digits].sort((a, b) => (!isSmallest ? a - b : b - a)).join(""),
          [sorted[0], sorted[2], sorted[1], sorted[3]].join(""),
          [sorted[1], sorted[0], sorted[2], sorted[3]].join("")
        ].filter(d => d !== correct);

        const options = shuffle([correct, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "place_value",
          categoryName: "Numbers to 10,000",
          question: `Using the digits ${digits.join(", ")}, form the ${isSmallest ? "SMALLEST" : "GREATEST"} 4-digit number (use each digit once).`,
          hint: isSmallest ? "Arrange digits from smallest to biggest." : "Arrange digits from biggest to smallest.",
          correctAnswer: correct,
          options,
          explanation: {
            concept: `Forming ${isSmallest ? "Smallest" : "Greatest"} Number`,
            steps: [
              isSmallest
                ? `Arrange in ascending order (smallest to greatest): ${sorted.join(" < ")}.`
                : `Arrange in descending order (greatest to smallest): ${sorted.join(" > ")}.`,
              `The resulting 4-digit number is ${correct}.`
            ],
            model: `Order: [${sorted.join("] [")}]`
          }
        };
      } else {
        const numSet = new Set();
        while (numSet.size < 4) {
          numSet.add(rand(1000, 9999));
        }
        const numArr = Array.from(numSet);
        const findGreatest = Math.random() > 0.5;
        const sorted = [...numArr].sort((a, b) => (findGreatest ? b - a : a - b));
        const correct = sorted[0];
        const options = shuffle(numArr.map(String));

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "place_value",
          categoryName: "Numbers to 10,000",
          question: `Which number is the ${findGreatest ? "GREATEST" : "SMALLEST"}?\n\n${numArr.map((n) => n.toLocaleString()).join("     ")}`,
          hint: "Compare the digits starting from the leftmost place value (thousands) first.",
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Comparing and Ordering Numbers",
            steps: [
              `Line up the numbers by place value: ${numArr.join(", ")}.`,
              `Compare digits starting from the thousands place; move right only when digits are tied.`,
              `The ${findGreatest ? "greatest" : "smallest"} number is ${correct.toLocaleString()}.`
            ],
            model: `Ordered: ${sorted.map((n) => n.toLocaleString()).join(findGreatest ? " > " : " < ")}`
          }
        };
      }
    }

    // 2. ADDITION & SUBTRACTION
    case "add_sub": {
      const isAdd = Math.random() > 0.5;
      if (isAdd) {
        const a = rand(1500, 4800);
        const b = rand(1200, 4900);
        const correct = a + b;
        const distractors = generateDistractors(correct, 3, 2000);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "add_sub",
          categoryName: "Addition & Subtraction",
          question: `Calculate:\n${a.toLocaleString()} + ${b.toLocaleString()} = ?`,
          hint: "Add column by column starting from the ones place, remembering to regroup/carry over.",
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "4-Digit Addition with Regrouping",
            steps: [
              `Align vertically by place value: ${a} + ${b}.`,
              `Add ones: (${a % 10} + ${b % 10}), regroup if needed.`,
              `Add tens, hundreds, and thousands with carryover.`,
              `Total = ${correct.toLocaleString()}.`
            ],
            model: `[ ${a} ] + [ ${b} ] = [ Total: ${correct} ]`
          }
        };
      } else {
        const a = rand(3500, 9500);
        const b = rand(1200, a - 500);
        const correct = a - b;
        const distractors = generateDistractors(correct, 3, 500);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "add_sub",
          categoryName: "Addition & Subtraction",
          question: `Calculate:\n${a.toLocaleString()} - ${b.toLocaleString()} = ?`,
          hint: "Subtract starting from the ones place. Borrow/rename from the left column if needed.",
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "4-Digit Subtraction with Renaming",
            steps: [
              `Align numbers vertically: ${a} - ${b}.`,
              `Subtract ones, renaming from tens column if necessary.`,
              `Continue for tens, hundreds, and thousands.`,
              `Difference = ${correct.toLocaleString()}.`
            ],
            model: `[ Total: ${a} ] - [ Part: ${b} ] = [ Remaining: ${correct} ]`
          }
        };
      }
    }

    // 3. MULTIPLICATION & DIVISION
    case "mul_div": {
      const isMul = Math.random() > 0.5;
      if (isMul) {
        const factor2 = [6, 7, 8, 9, 4, 3][rand(0, 5)];
        const factor1 = rand(35, 340);
        const correct = factor1 * factor2;
        const distractors = generateDistractors(correct, 3, 50);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "mul_div",
          categoryName: "Multiplication & Division",
          question: `Calculate:\n${factor1} × ${factor2} = ?`,
          hint: `Multiply ${factor1 % 10} × ${factor2} first, then multiply the tens and hundreds.`,
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Multiplication Algorithm",
            steps: [
              `Multiply ones: (${factor1 % 10}) × ${factor2} = ${(factor1 % 10) * factor2}.`,
              `Multiply tens and hundreds: (${Math.floor(factor1 / 10)}0) × ${factor2}.`,
              `Sum the partial products to get ${correct}.`
            ],
            model: `${factor2} groups of ${factor1} = ${correct}`
          }
        };
      } else {
        const divisor = rand(3, 9);
        const quotient = rand(24, 115);
        const remainder = rand(0, divisor - 1);
        const dividend = quotient * divisor + remainder;

        if (remainder === 0) {
          const correct = quotient;
          const distractors = generateDistractors(correct, 3, 5);
          const options = shuffle([correct.toString(), ...distractors.map(String)]);

          return {
            id: qId,
            inputType: "single",
            unit: "",
            topic: "mul_div",
            categoryName: "Multiplication & Division",
            question: `Find the quotient:\n${dividend} ÷ ${divisor} = ?`,
            hint: `Think: ${divisor} × ? = ${dividend}.`,
            correctAnswer: correct.toString(),
            options,
            explanation: {
              concept: "Division Algorithm",
              steps: [
                `Divide ${dividend} by ${divisor}.`,
                `${divisor} × ${quotient} = ${dividend}.`,
                `Quotient = ${correct}.`
              ],
              model: `Share ${dividend} into ${divisor} equal parts = ${correct}`
            }
          };
        } else {
          const correct = remainder;
          const distractors = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(x => x !== remainder && x < divisor).slice(0, 3);
          while (distractors.length < 3) {
            distractors.push(rand(divisor, divisor + 3));
          }
          const options = shuffle([correct.toString(), ...distractors.map(String)]);

          return {
            id: qId,
            inputType: "single",
            unit: "",
            topic: "mul_div",
            categoryName: "Multiplication & Division",
            question: `What is the REMAINDER when ${dividend} is divided by ${divisor}?`,
            hint: `Find ${divisor} × ${quotient} = ${dividend - remainder}, then calculate the remainder left over.`,
            correctAnswer: correct.toString(),
            options,
            explanation: {
              concept: "Division with Remainder",
              steps: [
                `Divide ${dividend} by ${divisor}: quotient is ${quotient}.`,
                `${quotient} × ${divisor} = ${dividend - remainder}.`,
                `Remainder = ${dividend} - ${dividend - remainder} = ${remainder}.`
              ],
              model: `${dividend} = (${divisor} × ${quotient}) + Remainder ${remainder}`
            }
          };
        }
      }
    }

    // 4. FRACTIONS (WITH DEDICATED FRACTION INPUT UI)
    case "fractions": {
      const type = rand(1, 4);
      if (type === 1) {
        // Missing numerator for equivalent fraction
        const num = rand(1, 4);
        const den = rand(num + 1, 6);
        const multiplier = rand(2, 4);
        const targetDen = den * multiplier;
        const targetNum = num * multiplier;

        const correct = targetNum;
        const distractors = pickDistractors(correct, [correct + 1, Math.max(1, correct - 1), targetDen - num], 1);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "fraction_partial", // Top numerator only with fixed denominator
          fixedDenominator: targetDen.toString(),
          unit: "",
          topic: "fractions",
          categoryName: "Fractions",
          question: `Find the missing numerator to make an equivalent fraction:\n\n${num}/${den} = ? / ${targetDen}`,
          fractionDisplay: { leftNum: num, leftDen: den, rightDen: targetDen },
          hint: `Look at the denominator: ${den} × ${multiplier} = ${targetDen}. Multiply the numerator by ${multiplier}.`,
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Equivalent Fractions",
            steps: [
              `To find equivalent fractions, multiply numerator and denominator by the SAME number.`,
              `Denominator: ${den} × ${multiplier} = ${targetDen}.`,
              `Numerator: ${num} × ${multiplier} = ${correct}.`
            ],
            model: `${num}/${den} × (${multiplier}/${multiplier}) = ${correct}/${targetDen}`
          }
        };
      } else if (type === 2) {
        // Simplest Form
        const common = [2, 3, 4, 5][rand(0, 3)];
        const simpNum = rand(1, 3);
        const simpDen = rand(simpNum + 1, 5);
        if (gcd(simpNum, simpDen) !== 1) {
          return generateQuestion("fractions");
        }
        const num = simpNum * common;
        const den = simpDen * common;
        const correctStr = `${simpNum}/${simpDen}`;

        const distractors = pickFormattedDistractors(
          correctStr,
          [`${simpNum + 1}/${simpDen}`, `${simpNum}/${simpDen + 1}`, `${num / 2}/${den / 2}`],
          simpNum,
          (n) => `${Math.max(1, n)}/${simpDen}`,
          1
        );

        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "fraction_full", // User fills in both numerator and denominator
          expectedNum: simpNum.toString(),
          expectedDen: simpDen.toString(),
          unit: "",
          topic: "fractions",
          categoryName: "Fractions",
          question: `Express the fraction ${num}/${den} in its SIMPLEST FORM:`,
          hint: `Divide both top and bottom by their common factor (${common}).`,
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Fractions in Simplest Form",
            steps: [
              `Find common factor of ${num} and ${den}, which is ${common}.`,
              `Numerator: ${num} ÷ ${common} = ${simpNum}.`,
              `Denominator: ${den} ÷ ${common} = ${simpDen}.`,
              `Simplest form = ${correctStr}.`
            ],
            model: `(${num} ÷ ${common}) / (${den} ÷ ${common}) = ${correctStr}`
          }
        };
      } else if (type === 3) {
        // Compare and order unlike fractions (common denominator 12)
        const lcd = 12;
        const denOptions = [2, 3, 4, 6, 12];
        const usedValues = new Set();
        const fracs = [];
        while (fracs.length < 4) {
          const den = denOptions[rand(0, denOptions.length - 1)];
          const num = rand(1, den - 1);
          const value = num * (lcd / den);
          if (usedValues.has(value)) continue;
          usedValues.add(value);
          fracs.push({ num, den, value });
        }

        const findGreatest = Math.random() > 0.5;
        const sorted = [...fracs].sort((a, b) => (findGreatest ? b.value - a.value : a.value - b.value));
        const target = sorted[0];
        const correctStr = `${target.num}/${target.den}`;
        const fracStrs = fracs.map((f) => `${f.num}/${f.den}`);
        const options = shuffle(fracStrs);
        const breakdown = fracs.map((f) => `${f.num}/${f.den} = ${f.value}/${lcd}`).join(", ");

        return {
          id: qId,
          inputType: "fraction_full",
          expectedNum: target.num.toString(),
          expectedDen: target.den.toString(),
          unit: "",
          topic: "fractions",
          categoryName: "Fractions",
          question: `Which fraction is the ${findGreatest ? "GREATEST" : "SMALLEST"}?\n\n${fracStrs.join("     ")}`,
          hint: "Convert every fraction to twelfths (a common denominator) before comparing.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Comparing and Ordering Unlike Fractions",
            steps: [
              `Convert every fraction to an equivalent fraction with denominator ${lcd}: ${breakdown}.`,
              `Compare the numerators once the denominators are the same.`,
              `The ${findGreatest ? "greatest" : "smallest"} fraction is ${correctStr}.`
            ],
            model: `${fracs.map((f) => `${f.num}/${f.den} = ${f.value}/${lcd}`).join("   ")}\n${findGreatest ? "Greatest" : "Smallest"}: ${correctStr}`
          }
        };
      } else {
        // Addition / Subtraction of related fractions
        const denSmall = [2, 3, 4, 5][rand(0, 3)];
        const factor = rand(2, 3);
        const denBig = denSmall * factor;
        const num1 = 1;
        const num2 = rand(1, denBig - (num1 * factor) - 1);
        const isAdd = Math.random() > 0.5;

        if (isAdd) {
          const equivalentNum = num1 * factor;
          const totalNum = equivalentNum + num2;
          const g = gcd(totalNum, denBig);
          const simpN = totalNum / g;
          const simpD = denBig / g;
          const ansStr = `${simpN}/${simpD}`;

          const distractors = pickFormattedDistractors(
            ansStr,
            [
              `${totalNum + 1}/${denBig}`,
              `${num1 + num2}/${denSmall + denBig}`,
              `${Math.max(1, totalNum - 1)}/${denBig}`
            ],
            totalNum,
            (n) => `${Math.max(1, n)}/${denBig}`,
            1
          );

          const options = shuffle([ansStr, ...distractors]);

          return {
            id: qId,
            inputType: "fraction_full",
            expectedNum: simpN.toString(),
            expectedDen: simpD.toString(),
            unit: "",
            topic: "fractions",
            categoryName: "Fractions",
            question: `Calculate and write in simplest form:\n\n${num1}/${denSmall} + ${num2}/${denBig} = ?`,
            hint: `Convert ${num1}/${denSmall} to denominator ${denBig} first, then add.`,
            correctAnswer: ansStr,
            options,
            explanation: {
              concept: "Addition of Related Fractions",
              steps: [
                `Convert ${num1}/${denSmall} to equivalent fraction: (${num1}×${factor})/(${denSmall}×${factor}) = ${equivalentNum}/${denBig}.`,
                `Add: ${equivalentNum}/${denBig} + ${num2}/${denBig} = ${totalNum}/${denBig}.`,
                `Simplest form = ${ansStr}.`
              ],
              model: `Common Denominator: ${equivalentNum}/${denBig} + ${num2}/${denBig} = ${ansStr}`
            }
          };
        } else {
          const topNumerator = rand(num1 * factor + 1, denBig - 1);
          const diffNum = topNumerator - (num1 * factor);
          const g = gcd(diffNum, denBig);
          const simpN = diffNum / g;
          const simpD = denBig / g;
          const ansStr = `${simpN}/${simpD}`;

          const distractors = pickFormattedDistractors(
            ansStr,
            [
              `${diffNum + 1}/${denBig}`,
              `${Math.max(1, diffNum - 1)}/${denBig}`,
              `${topNumerator - num1}/${denBig}`
            ],
            diffNum,
            (n) => `${Math.max(1, n)}/${denBig}`,
            1
          );

          const options = shuffle([ansStr, ...distractors.slice(0, 3)]);

          return {
            id: qId,
            inputType: "fraction_full",
            expectedNum: simpN.toString(),
            expectedDen: simpD.toString(),
            unit: "",
            topic: "fractions",
            categoryName: "Fractions",
            question: `Calculate and write in simplest form:\n\n${topNumerator}/${denBig} - ${num1}/${denSmall} = ?`,
            hint: `Convert ${num1}/${denSmall} into denominator ${denBig} before subtracting.`,
            correctAnswer: ansStr,
            explanation: {
              concept: "Subtraction of Related Fractions",
              steps: [
                `Convert ${num1}/${denSmall} to ${num1 * factor}/${denBig}.`,
                `Subtract: ${topNumerator}/${denBig} - ${num1 * factor}/${denBig} = ${diffNum}/${denBig}.`,
                `Simplest form = ${ansStr}.`
              ],
              model: `[ ${topNumerator}/${denBig} ] - [ ${num1 * factor}/${denBig} ] = [ ${ansStr} ]`
            },
            options
          };
        }
      }
    }

    // 5. MONEY
    case "money": {
      const type = rand(1, 2);
      if (type === 1) {
        const d1 = rand(5, 35);
        const c1 = [20, 35, 45, 50, 75, 80, 95][rand(0, 6)];
        const d2 = rand(3, 25);
        const c2 = [25, 40, 50, 60, 70, 85][rand(0, 5)];

        const totalCents = (d1 * 100 + c1) + (d2 * 100 + c2);
        const ansDollars = (totalCents / 100).toFixed(2);
        const correctStr = `$${ansDollars}`;

        const distractors = [
          `$${((totalCents + 100) / 100).toFixed(2)}`,
          `$${((totalCents - 100) / 100).toFixed(2)}`,
          `$${((totalCents + 10) / 100).toFixed(2)}`
        ];

        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "money",
          rawNumber: ansDollars,
          unit: "$",
          topic: "money",
          categoryName: "Money ($ and ¢)",
          question: `Add:\n$${d1}.${c1 < 10 ? "0" + c1 : c1} + $${d2}.${c2 < 10 ? "0" + c2 : c2} = ?`,
          hint: "Add the cents first (100¢ = $1.00), then add the dollars.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Adding Dollars and Cents",
            steps: [
              `Cents: ${c1}¢ + ${c2}¢ = ${c1 + c2}¢.`,
              `Dollars: $${d1} + $${d2} ${c1 + c2 >= 100 ? "+ $1" : ""} = $${Math.floor(totalCents / 100)}.`,
              `Total = ${correctStr}.`
            ],
            model: `$${d1}.${c1} + $${d2}.${c2} = ${correctStr}`
          }
        };
      } else {
        const note = [20, 50, 100][rand(0, 2)];
        const spentDollars = rand(5, note - 8);
        const spentCents = [15, 25, 40, 50, 65, 80][rand(0, 5)];
        const spentTotal = spentDollars * 100 + spentCents;
        const changeCents = note * 100 - spentTotal;
        const ansDollars = (changeCents / 100).toFixed(2);
        const correctStr = `$${ansDollars}`;

        const distractors = [
          `$${((changeCents + 100) / 100).toFixed(2)}`,
          `$${((changeCents - 100) / 100).toFixed(2)}`,
          `$${((changeCents + 10) / 100).toFixed(2)}`
        ];

        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "money",
          rawNumber: ansDollars,
          unit: "$",
          topic: "money",
          categoryName: "Money ($ and ¢)",
          question: `Marcus bought a book for $${spentDollars}.${spentCents < 10 ? "0" + spentCents : spentCents}. He gave the cashier a $${note} note. How much CHANGE did he receive?`,
          hint: `Subtract $${spentDollars}.${spentCents} from $${note}.00.`,
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Calculating Change",
            steps: [
              `Amount given = $${note}.00.`,
              `Cost of book = $${spentDollars}.${spentCents < 10 ? "0" + spentCents : spentCents}.`,
              `Change = $${note}.00 - $${spentDollars}.${spentCents < 10 ? "0" + spentCents : spentCents} = ${correctStr}.`
            ],
            model: `[ Paid: $${note} ] - [ Cost: $${spentDollars}.${spentCents} ] = [ Change: ${correctStr} ]`
          }
        };
      }
    }

    // 6. MEASUREMENT
    case "measurement": {
      const unitType = ["length_km", "length_m", "mass_kg", "volume_l", "time_min"][rand(0, 4)];
      if (unitType === "length_km") {
        const km = rand(2, 8);
        const m = rand(15, 850);
        const totalM = km * 1000 + m;
        const correctStr = `${totalM} m`;

        const distractors = [
          `${km * 100 + m} m`,
          `${totalM + 100} m`,
          `${totalM - 10} m`
        ];
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "m",
          rawNumber: totalM.toString(),
          topic: "measurement",
          categoryName: "Length (km and m)",
          question: `Convert ${km} km ${m} m into metres (m):`,
          hint: "1 km = 1,000 m.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Converting km to m",
            steps: [
              `1 km = 1,000 m.`,
              `${km} km = ${km * 1000} m.`,
              `Total = ${km * 1000} m + ${m} m = ${totalM} m.`
            ],
            model: `[ ${km} km = ${km * 1000} m ] + [ ${m} m ] = [ ${totalM} m ]`
          }
        };
      } else if (unitType === "length_m") {
        const m = rand(3, 9);
        const cm = rand(5, 95);
        const totalCm = m * 100 + cm;
        const correctStr = `${totalCm} cm`;

        const distractors = [
          `${m * 10 + cm} cm`,
          `${totalCm + 100} cm`,
          `${totalCm - 10} cm`
        ];
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "cm",
          rawNumber: totalCm.toString(),
          topic: "measurement",
          categoryName: "Length (m and cm)",
          question: `Convert ${m} m ${cm} cm into centimetres (cm):`,
          hint: "1 m = 100 cm.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Converting m to cm",
            steps: [
              `1 m = 100 cm.`,
              `${m} m = ${m * 100} cm.`,
              `Total = ${m * 100} cm + ${cm} cm = ${totalCm} cm.`
            ],
            model: `[ ${m} m = ${m * 100} cm ] + [ ${cm} cm ] = [ ${totalCm} cm ]`
          }
        };
      } else if (unitType === "mass_kg") {
        const kg = rand(2, 7);
        const g = rand(50, 750);
        const totalG = kg * 1000 + g;
        const correctStr = `${totalG} g`;

        const distractors = [
          `${kg * 100 + g} g`,
          `${totalG + 100} g`,
          `${totalG - 50} g`
        ];
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "g",
          rawNumber: totalG.toString(),
          topic: "measurement",
          categoryName: "Mass (kg and g)",
          question: `A bag of rice has a mass of ${kg} kg ${g} g. What is its mass in grams (g)?`,
          hint: "1 kg = 1,000 g.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Converting kg to g",
            steps: [
              `1 kg = 1,000 g.`,
              `${kg} kg = ${kg * 1000} g.`,
              `Total = ${kg * 1000} g + ${g} g = ${totalG} g.`
            ],
            model: `[ ${kg} kg = ${kg * 1000} g ] + [ ${g} g ] = [ ${totalG} g ]`
          }
        };
      } else if (unitType === "volume_l") {
        const l = rand(2, 8);
        const ml = rand(50, 850);
        const totalMl = l * 1000 + ml;
        const correctStr = `${totalMl} ml`;

        const distractors = [
          `${l * 100 + ml} ml`,
          `${totalMl + 100} ml`,
          `${totalMl - 50} ml`
        ];
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "ml",
          rawNumber: totalMl.toString(),
          topic: "measurement",
          categoryName: "Volume (l and ml)",
          question: `A bottle contains ${l} l ${ml} ml of water. What is its volume in millilitres (ml)?`,
          hint: "1 l = 1,000 ml.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Converting l to ml",
            steps: [
              `1 l = 1,000 ml.`,
              `${l} l = ${l * 1000} ml.`,
              `Total = ${l * 1000} ml + ${ml} ml = ${totalMl} ml.`
            ],
            model: `[ ${l} l = ${l * 1000} ml ] + [ ${ml} ml ] = [ ${totalMl} ml ]`
          }
        };
      } else {
        const h = rand(1, 4);
        const m = [15, 20, 35, 40, 50][rand(0, 4)];
        const totalMins = h * 60 + m;
        const correctStr = `${totalMins} min`;

        const distractors = [
          `${h * 100 + m} min`,
          `${totalMins + 60} min`,
          `${totalMins - 15} min`
        ];
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "min",
          rawNumber: totalMins.toString(),
          topic: "measurement",
          categoryName: "Time & Duration",
          question: `Convert ${h} h ${m} min into MINUTES:`,
          hint: "1 hour = 60 minutes.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Converting Hours to Minutes",
            steps: [
              `1 hour = 60 minutes.`,
              `${h} hours = ${h} × 60 = ${h * 60} minutes.`,
              `Total = ${h * 60} + ${m} = ${totalMins} minutes.`
            ],
            model: `[ ${h} h = ${h * 60} min ] + [ ${m} min ] = [ ${totalMins} min ]`
          }
        };
      }
    }

    // 7. TIME (DURATION & 24-HOUR NOTATION)
    case "time": {
      const timeType = rand(1, 2);
      if (timeType === 1) {
      const startHour = rand(1, 6);
      const startMin = [0, 15, 30, 45][rand(0, 3)];
      const durHours = rand(1, 2);
      const durMins = [15, 30, 45, 50][rand(0, 3)];

      const totalStartMin = startHour * 60 + startMin;
      const totalEndMin = totalStartMin + durHours * 60 + durMins;
      const endHour = Math.floor(totalEndMin / 60);
      const endMin = totalEndMin % 60;

      const formatTime = (h, m) => `${h}:${m < 10 ? "0" + m : m} p.m.`;
      const startStr = formatTime(startHour, startMin);
      const endStr = formatTime(endHour, endMin);

      const correctStr = `${durHours} h ${durMins} min`;
      const correctTotalMin = durHours * 60 + durMins;
      const formatDuration = (t) => `${Math.floor(t / 60)} h ${t % 60} min`;

      const distractors = pickFormattedDistractors(
        correctStr,
        [
          formatDuration(correctTotalMin + 60),
          formatDuration(correctTotalMin + 15 <= 0 ? correctTotalMin + 15 : correctTotalMin - 15),
          formatDuration(Math.max(15, correctTotalMin - 60))
        ],
        correctTotalMin,
        (t) => formatDuration(Math.max(15, t)),
        15
      );

      const options = shuffle([correctStr, ...distractors]);

      return {
        id: qId,
        inputType: "compound_time",
        expHours: durHours.toString(),
        expMins: durMins.toString(),
        topic: "time",
        categoryName: "Time & Duration",
        question: `A movie started at ${startStr} and ended at ${endStr}. How long did the movie last?`,
        hint: "Count forward in hours first, then count the remaining minutes.",
        correctAnswer: correctStr,
        options,
        explanation: {
          concept: "Finding Duration / Elapsed Time",
          steps: [
            `From ${startStr} to ${formatTime(startHour + durHours, startMin)} is ${durHours} hour(s).`,
            `From ${formatTime(startHour + durHours, startMin)} to ${endStr} is ${durMins} minutes.`,
            `Total duration = ${correctStr}.`
          ],
          model: `Timeline: [ ${startStr} ] --(+${durHours}h)--> [ ${formatTime(startHour + durHours, startMin)} ] --(+${durMins}min)--> [ ${endStr} ]`
        }
      };
      } else {
        // 24-hour clock notation
        const hour12 = rand(1, 12);
        const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
        const minute = minuteOptions[rand(0, minuteOptions.length - 1)];
        const isPM = Math.random() > 0.5;
        const hour24 = isPM ? (hour12 === 12 ? 12 : hour12 + 12) : (hour12 === 12 ? 0 : hour12);
        const hh = hour24.toString().padStart(2, "0");
        const mm = minute.toString().padStart(2, "0");
        const answer24 = `${hh}${mm}`;
        const time12Str = `${hour12}:${mm} ${isPM ? "p.m." : "a.m."}`;

        const totalMinOfDay = hour24 * 60 + minute;
        const formatHHMM = (t) => {
          const wrapped = ((t % 1440) + 1440) % 1440;
          return `${Math.floor(wrapped / 60).toString().padStart(2, "0")}${(wrapped % 60).toString().padStart(2, "0")}`;
        };
        const distractors = pickFormattedDistractors(
          answer24,
          [
            formatHHMM(totalMinOfDay + 60),
            formatHHMM(totalMinOfDay - 60),
            `${hour12.toString().padStart(2, "0")}${mm}`
          ],
          totalMinOfDay,
          (t) => formatHHMM(t)
        );

        const options = shuffle([answer24, ...distractors]);

        return {
          id: qId,
          inputType: "time24",
          unit: "h",
          topic: "time",
          categoryName: "Time & Duration",
          question: `Write ${time12Str} using 24-hour format.`,
          hint: "For p.m. times (except 12 noon), add 12 to the hour. Write the answer as 4 digits, e.g. 0905 or 1345.",
          correctAnswer: answer24,
          options,
          explanation: {
            concept: "24-Hour Clock Notation",
            steps: [
              isPM && hour12 !== 12
                ? `Since the time is p.m. and not 12 noon, add 12 to the hour: ${hour12} + 12 = ${hour24}.`
                : (!isPM && hour12 === 12
                  ? `12 a.m. (midnight) is written as 00 in 24-hour format.`
                  : `The hour stays the same because it is a.m. (or 12 noon).`),
              `Keep the minutes the same: ${mm}.`,
              `Combine to get the 4-digit 24-hour time: ${answer24}.`
            ],
            model: `${time12Str}  →  ${answer24}`
          }
        };
      }
    }

    // 8. GEOMETRY (AREA & PERIMETER)
    case "geometry": {
      const shapeType = rand(1, 3);
      if (shapeType === 1) {
        const isSquare = Math.random() > 0.5;
        if (isSquare) {
          const side = rand(4, 15);
          const perim = side * 4;
          const correctStr = `${perim} cm`;
          const distractors = pickFormattedDistractors(
            correctStr,
            [`${side * side} cm`, `${perim + 4} cm`, `${perim - 4} cm`],
            perim,
            (n) => `${Math.max(1, n)} cm`,
            1
          );
          const options = shuffle([correctStr, ...distractors]);

          return {
            id: qId,
            inputType: "single",
            unit: "cm",
            rawNumber: perim.toString(),
            topic: "geometry",
            categoryName: "Area & Perimeter",
            question: `A square has a side length of ${side} cm. What is its PERIMETER?`,
            hint: "Perimeter = 4 × length of one side.",
            correctAnswer: correctStr,
            options,
            explanation: {
              concept: "Perimeter of a Square",
              steps: [
                `A square has 4 equal sides.`,
                `Perimeter = 4 × ${side} cm = ${perim} cm.`
              ],
              model: `Perimeter = ${side} + ${side} + ${side} + ${side} = ${perim} cm`
            }
          };
        } else {
          const length = rand(6, 18);
          const breadth = rand(3, length - 2);
          const perim = 2 * (length + breadth);
          const correctStr = `${perim} m`;
          const distractors = pickFormattedDistractors(
            correctStr,
            [`${length * breadth} m`, `${length + breadth} m`, `${perim + 2} m`],
            perim,
            (n) => `${Math.max(1, n)} m`,
            1
          );
          const options = shuffle([correctStr, ...distractors]);

          return {
            id: qId,
            inputType: "single",
            unit: "m",
            rawNumber: perim.toString(),
            topic: "geometry",
            categoryName: "Area & Perimeter",
            question: `A rectangular field has a length of ${length} m and a breadth of ${breadth} m. What is its PERIMETER?`,
            hint: "Perimeter = 2 × (Length + Breadth).",
            correctAnswer: correctStr,
            options,
            explanation: {
              concept: "Perimeter of a Rectangle",
              steps: [
                `Length + Breadth = ${length} + ${breadth} = ${length + breadth} m.`,
                `Perimeter = 2 × ${length + breadth} m = ${perim} m.`
              ],
              model: `Perimeter = (${length} + ${breadth}) × 2 = ${perim} m`
            }
          };
        }
      } else if (shapeType === 2) {
        const length = rand(4, 12);
        const breadth = rand(3, 9);
        const area = length * breadth;
        const correctStr = `${area} cm²`;
        const distractors = pickFormattedDistractors(
          correctStr,
          [`${2 * (length + breadth)} cm²`, `${area + 4} cm²`, `${Math.max(1, area - 6)} cm²`],
          area,
          (n) => `${Math.max(1, n)} cm²`,
          1
        );
        const options = shuffle([correctStr, ...distractors]);

        return {
          id: qId,
          inputType: "single",
          unit: "cm²",
          rawNumber: area.toString(),
          topic: "geometry",
          categoryName: "Area & Perimeter",
          question: `Find the AREA of a rectangle with length ${length} cm and breadth ${breadth} cm:`,
          hint: "Area = Length × Breadth (cm²).",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Area of a Rectangle",
            steps: [
              `Formula: Area = Length × Breadth.`,
              `Area = ${length} cm × ${breadth} cm = ${area} cm².`
            ],
            model: `Area = ${length} × ${breadth} = ${area} cm²`
          }
        };
      } else {
        // Rectilinear (L-shaped) figure: a big rectangle with a smaller rectangle cut from one corner
        const bigL = rand(10, 20);
        const bigB = rand(8, 16);
        const cutL = rand(3, Math.floor(bigL / 2));
        const cutB = rand(2, Math.floor(bigB / 2));
        const askArea = Math.random() > 0.5;

        if (askArea) {
          const bigArea = bigL * bigB;
          const cutArea = cutL * cutB;
          const area = bigArea - cutArea;
          const correctStr = `${area} cm²`;
          const distractors = pickFormattedDistractors(
            correctStr,
            [`${bigArea} cm²`, `${area + cutArea * 2} cm²`, `${Math.max(1, area - 10)} cm²`],
            area,
            (n) => `${Math.max(1, n)} cm²`,
            1
          );
          const options = shuffle([correctStr, ...distractors]);

          return {
            id: qId,
            inputType: "single",
            unit: "cm²",
            rawNumber: area.toString(),
            topic: "geometry",
            categoryName: "Area & Perimeter",
            question: `An L-shaped piece of card is formed by cutting a ${cutL} cm by ${cutB} cm rectangle from the corner of a ${bigL} cm by ${bigB} cm rectangle. Find the AREA of the remaining L-shaped figure.`,
            hint: "Find the area of the big rectangle, then subtract the area of the cut-out corner.",
            correctAnswer: correctStr,
            options,
            explanation: {
              concept: "Area of a Rectilinear (L-Shaped) Figure",
              steps: [
                `Area of big rectangle = ${bigL} × ${bigB} = ${bigArea} cm².`,
                `Area of cut-out corner = ${cutL} × ${cutB} = ${cutArea} cm².`,
                `Area of L-shape = ${bigArea} - ${cutArea} = ${area} cm².`
              ],
              model: `[ Big rectangle: ${bigL} × ${bigB} = ${bigArea} ] - [ Cut-out: ${cutL} × ${cutB} = ${cutArea} ] = [ ${area} cm² ]`
            }
          };
        } else {
          const perim = 2 * (bigL + bigB);
          const correctStr = `${perim} cm`;
          const distractors = pickFormattedDistractors(
            correctStr,
            [`${2 * (bigL + bigB) - 2 * (cutL + cutB)} cm`, `${perim + 2 * cutL} cm`, `${Math.max(1, perim - 4)} cm`],
            perim,
            (n) => `${Math.max(1, n)} cm`,
            1
          );
          const options = shuffle([correctStr, ...distractors]);

          return {
            id: qId,
            inputType: "single",
            unit: "cm",
            rawNumber: perim.toString(),
            topic: "geometry",
            categoryName: "Area & Perimeter",
            question: `An L-shaped piece of card is formed by cutting a ${cutL} cm by ${cutB} cm rectangle from the corner of a ${bigL} cm by ${bigB} cm rectangle. Find the PERIMETER of the remaining L-shaped figure.`,
            hint: "The two new edges created by the cut add up to exactly the two edges that were removed, so the perimeter is unchanged!",
            correctAnswer: correctStr,
            options,
            explanation: {
              concept: "Perimeter of a Rectilinear (L-Shaped) Figure",
              steps: [
                `Perimeter of the original big rectangle = 2 × (${bigL} + ${bigB}) = ${perim} cm.`,
                `Cutting a rectangular notch from a corner does not change the total perimeter — the missing edges are replaced by two new edges of the same total length.`,
                `Perimeter of the L-shape = ${perim} cm.`
              ],
              model: `Perimeter of L-shape = Perimeter of bounding rectangle = 2 × (${bigL} + ${bigB}) = ${perim} cm`
            }
          };
        }
      }
    }

    // 9. STATISTICS (BAR GRAPHS)
    case "statistics": {
      const themes = [
        { unit: "pupils", categories: ["Football", "Basketball", "Swimming", "Badminton"], noun: "pupils who like" },
        { unit: "books", categories: ["Story", "Comic", "Science", "History"], noun: "books borrowed" },
        { unit: "fruits", categories: ["Apples", "Oranges", "Pears", "Mangoes"], noun: "fruits sold" }
      ];
      const theme = themes[rand(0, themes.length - 1)];
      const scale = [2, 5, 10][rand(0, 2)];
      const chosenCategories = shuffle(theme.categories).slice(0, 4);
      const values = chosenCategories.map(() => rand(1, 10) * scale);
      const chartLines = chosenCategories
        .map((cat, i) => `${cat.padEnd(10, " ")}: ${"■".repeat(values[i] / scale)}`)
        .join("\n");
      const chartHeader = `Scale: each ■ = ${scale} ${theme.unit}`;
      const qType = rand(1, 4);

      if (qType === 1) {
        const idx = rand(0, chosenCategories.length - 1);
        const correct = values[idx];
        const distractors = generateDistractors(correct, 3, scale);
        const options = shuffle([correct.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "statistics",
          categoryName: "Bar Graphs",
          question: `The bar graph shows the number of ${theme.noun}.\n\n${chartHeader}\n${chartLines}\n\nHow many ${theme.unit} does "${chosenCategories[idx]}" represent?`,
          hint: `Count the number of ■ blocks for "${chosenCategories[idx]}" and multiply by the scale (${scale}).`,
          correctAnswer: correct.toString(),
          options,
          explanation: {
            concept: "Reading a Bar Graph with a Scale",
            steps: [
              `"${chosenCategories[idx]}" has ${correct / scale} blocks.`,
              `Each block represents ${scale} ${theme.unit}.`,
              `Value = ${correct / scale} × ${scale} = ${correct}.`
            ],
            model: `${chosenCategories[idx]}: ${correct / scale} blocks × ${scale} = ${correct}`
          }
        };
      } else if (qType === 2) {
        const total = values.reduce((a, b) => a + b, 0);
        const distractors = generateDistractors(total, 3, scale);
        const options = shuffle([total.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "statistics",
          categoryName: "Bar Graphs",
          question: `The bar graph shows the number of ${theme.noun}.\n\n${chartHeader}\n${chartLines}\n\nHow many ${theme.unit} are there in total?`,
          hint: "Add up the values represented by every bar.",
          correctAnswer: total.toString(),
          options,
          explanation: {
            concept: "Finding the Total from a Bar Graph",
            steps: [
              ...chosenCategories.map((cat, i) => `${cat}: ${values[i]} ${theme.unit}`),
              `Total = ${values.join(" + ")} = ${total}.`
            ],
            model: `Total = ${values.join(" + ")} = ${total}`
          }
        };
      } else if (qType === 3) {
        let idxA = rand(0, chosenCategories.length - 1);
        let idxB = rand(0, chosenCategories.length - 1);
        while (idxB === idxA) idxB = rand(0, chosenCategories.length - 1);
        const [bigIdx, smallIdx] = values[idxA] >= values[idxB] ? [idxA, idxB] : [idxB, idxA];
        const diff = values[bigIdx] - values[smallIdx];
        const distractors = generateDistractors(diff, 3, scale);
        const options = shuffle([diff.toString(), ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "statistics",
          categoryName: "Bar Graphs",
          question: `The bar graph shows the number of ${theme.noun}.\n\n${chartHeader}\n${chartLines}\n\nHow many more ${theme.unit} does "${chosenCategories[bigIdx]}" have than "${chosenCategories[smallIdx]}"?`,
          hint: "Subtract the smaller value from the bigger value.",
          correctAnswer: diff.toString(),
          options,
          explanation: {
            concept: "Comparing Two Bars in a Bar Graph",
            steps: [
              `${chosenCategories[bigIdx]} = ${values[bigIdx]} ${theme.unit}.`,
              `${chosenCategories[smallIdx]} = ${values[smallIdx]} ${theme.unit}.`,
              `Difference = ${values[bigIdx]} - ${values[smallIdx]} = ${diff}.`
            ],
            model: `[ ${chosenCategories[bigIdx]}: ${values[bigIdx]} ] - [ ${chosenCategories[smallIdx]}: ${values[smallIdx]} ] = [ ${diff} ]`
          }
        };
      } else {
        const findMost = Math.random() > 0.5;
        const sortedIdx = chosenCategories
          .map((_, i) => i)
          .sort((a, b) => (findMost ? values[b] - values[a] : values[a] - values[b]));
        const targetIdx = sortedIdx[0];
        const correctStr = chosenCategories[targetIdx];
        const options = shuffle([...chosenCategories]);

        return {
          id: qId,
          inputType: "single_text",
          unit: "",
          topic: "statistics",
          categoryName: "Bar Graphs",
          question: `The bar graph shows the number of ${theme.noun}.\n\n${chartHeader}\n${chartLines}\n\nWhich category has the ${findMost ? "MOST" : "FEWEST"} ${theme.unit}?`,
          hint: `Look for the ${findMost ? "tallest" : "shortest"} bar.`,
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Identifying the Maximum/Minimum in a Bar Graph",
            steps: [
              ...chosenCategories.map((cat, i) => `${cat}: ${values[i]} ${theme.unit}`),
              `The ${findMost ? "greatest" : "smallest"} value belongs to "${correctStr}".`
            ],
            model: `${findMost ? "Most" : "Fewest"}: ${correctStr} (${values[targetIdx]} ${theme.unit})`
          }
        };
      }
    }

    // 10. BAR MODEL WORD PROBLEMS
    case "word_problems":
    default: {
      const modelType = rand(1, 3);
      if (modelType === 1) {
        const name1 = ["Aiden", "Mei Ling", "Ravi", "Chloe", "Bryan"][rand(0, 4)];
        const name2 = ["Zack", "Siti", "Lucas", "Nurul", "Dawn"][rand(0, 4)];
        const part1 = rand(140, 480);
        const diff = rand(30, 160);
        const part2 = part1 + diff;
        const total = part1 + part2;

        const correctStr = total.toString();
        const distractors = generateDistractors(total, 3, 200);
        const options = shuffle([correctStr, ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "word_problems",
          categoryName: "Bar Model Word Problems",
          question: `${name1} has ${part1} game cards. ${name2} has ${diff} MORE game cards than ${name1}. How many cards do they have ALTOGETHER?`,
          hint: `Step 1: Find ${name2}'s cards. Step 2: Add both together.`,
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Comparison Bar Model",
            steps: [
              `Step 1 (${name2}'s cards): ${name1} has ${part1}. ${name2} = ${part1} + ${diff} = ${part2}.`,
              `Step 2 (Altogether): ${part1} + ${part2} = ${total} cards.`
            ],
            model: `[ ${name1}: ${part1} ]\n[ ${name2}: ${part1} ][ +${diff} ] = ${part2}\nTotal = ${part1} + ${part2} = ${total}`
          }
        };
      } else if (modelType === 2) {
        const items = ["boxes of cookies", "packs of markers", "bags of apples"][rand(0, 2)];
        const numBoxes = rand(4, 8);
        const perBox = rand(15, 45);
        const givenAway = rand(10, 30);
        const totalInitial = numBoxes * perBox;
        const remaining = totalInitial - givenAway;

        const correctStr = remaining.toString();
        const distractors = generateDistractors(remaining, 3, 20);
        const options = shuffle([correctStr, ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "word_problems",
          categoryName: "Bar Model Word Problems",
          question: `Mr. Lim bought ${numBoxes} ${items}. There were ${perBox} items in each. He gave ${givenAway} items to his pupils. How many items did he have LEFT?`,
          hint: "Step 1: Total bought = boxes × items per box. Step 2: Subtract items given away.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Multi-Step Word Problem (Multiplication & Subtraction)",
            steps: [
              `Step 1 (Total bought): ${numBoxes} × ${perBox} = ${totalInitial}.`,
              `Step 2 (Left): ${totalInitial} - ${givenAway} = ${remaining}.`
            ],
            model: `[ Total: ${numBoxes} × ${perBox} = ${totalInitial} ] - [ Given: ${givenAway} ] = [ Left: ${remaining} ]`
          }
        };
      } else {
        const partA = rand(150, 400);
        const partB = rand(200, 450);
        const partC = rand(100, 400);
        const total = partA + partB + partC;

        const correctStr = partC.toString();
        const distractors = generateDistractors(partC, 3, 50);
        const options = shuffle([correctStr, ...distractors.map(String)]);

        return {
          id: qId,
          inputType: "single",
          unit: "",
          topic: "word_problems",
          categoryName: "Bar Model Word Problems",
          question: `There are ${total} visitors at the Singapore Zoo. ${partA} are adults and ${partB} are seniors. The rest are children. How many CHILDREN are there?`,
          hint: "Add adults and seniors, then subtract from the total number of zoo visitors.",
          correctAnswer: correctStr,
          options,
          explanation: {
            concept: "Part-Whole Model (3 Parts)",
            steps: [
              `Step 1 (Adults + Seniors): ${partA} + ${partB} = ${partA + partB}.`,
              `Step 2 (Children): ${total} - ${partA + partB} = ${partC}.`
            ],
            model: `[ Total: ${total} ]\n[ Adults: ${partA} ][ Seniors: ${partB} ][ Children: ? = ${partC} ]`
          }
        };
      }
    }
  }
}

export default function App() {
  // Mode Settings
  const [hasStarted, setHasStarted] = useState(false);
  const [quizMode, setQuizMode] = useState("mcq"); // "mcq" | "keyin"
  const [streakTarget, setStreakTarget] = useState(10);
  const [customTargetInput, setCustomTargetInput] = useState("10");
  const [targetAchieved, setTargetAchieved] = useState(false);

  // Gameplay State
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [currentQ, setCurrentQ] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Key-In Answer Inputs
  const [singleInput, setSingleInput] = useState("");
  const [fracNumInput, setFracNumInput] = useState("");
  const [fracDenInput, setFracDenInput] = useState("");
  const [timeHourInput, setTimeHourInput] = useState("");
  const [timeMinInput, setTimeMinInput] = useState("");

  // Review & Mistakes Log
  const [mistakeList, setMistakeList] = useState([]);
  const [showMistakesModal, setShowMistakesModal] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);

  // Scratchpad
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadColor, setScratchpadColor] = useState("#2563eb");
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  // Timer Mode
  const [timerMode, setTimerMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(35);

  useEffect(() => {
    sounds.muted = !soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    let timer;
    if (hasStarted && timerMode && !isAnswered && currentQ && timeLeft > 0 && !targetAchieved) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [hasStarted, timerMode, isAnswered, currentQ, timeLeft, targetAchieved]);

  const resetInputs = () => {
    setSingleInput("");
    setFracNumInput("");
    setFracDenInput("");
    setTimeHourInput("");
    setTimeMinInput("");
  };

  const startNewGame = (target) => {
    const finalTarget = Math.max(1, parseInt(target, 10) || 10);
    setStreakTarget(finalTarget);
    setHasStarted(true);
    setStreak(0);
    setScore(0);
    setTotalQuestionsAnswered(0);
    setTargetAchieved(false);
    resetInputs();
    loadNextQuestion(selectedTopic);
  };

  const loadNextQuestion = (topic = selectedTopic) => {
    const q = generateQuestion(topic);
    setCurrentQ(q);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setShowExplanationModal(false);
    setTimeLeft(35);
    resetInputs();
  };

  const recordMistake = (q, userAns) => {
    setMistakeList((prev) => {
      if (prev.some((m) => m.id === q.id)) return prev;
      return [
        {
          ...q,
          userAnswer: userAns || "Blank / Skipped",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        },
        ...prev
      ];
    });
  };

  const handleTimeOut = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setIsCorrect(false);
    setSelectedOption("⏱️ Time Out");
    sounds.playIncorrect();
    setStreak(0);
    if (currentQ) {
      recordMistake(currentQ, "⏱️ Timed Out");
    }
    setShowExplanationModal(true);
  };

  // Multiple Choice Handler
  const handleSelectOption = (option) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(option);
    setTotalQuestionsAnswered((prev) => prev + 1);

    const correct = option === currentQ.correctAnswer;
    evaluateResult(correct, option);
  };

  // Key-In Answer Submit Handler
  const handleKeyInSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAnswered || !currentQ) return;

    let userFormulatedAnswer = "";
    let isAnsCorrect = false;

    if (currentQ.inputType === "fraction_full") {
      const numTrim = fracNumInput.trim();
      const denTrim = fracDenInput.trim();
      if (!numTrim || !denTrim) return;
      userFormulatedAnswer = `${numTrim}/${denTrim}`;
      isAnsCorrect = (numTrim === currentQ.expectedNum && denTrim === currentQ.expectedDen);
    } else if (currentQ.inputType === "fraction_partial") {
      const numTrim = fracNumInput.trim();
      if (!numTrim) return;
      userFormulatedAnswer = `${numTrim}`;
      isAnsCorrect = (numTrim === currentQ.correctAnswer);
    } else if (currentQ.inputType === "compound_time") {
      const hTrim = timeHourInput.trim();
      const mTrim = timeMinInput.trim();
      if (!hTrim && !mTrim) return;
      userFormulatedAnswer = `${hTrim || 0} h ${mTrim || 0} min`;
      isAnsCorrect = (hTrim === currentQ.expHours && mTrim === currentQ.expMins);
    } else if (currentQ.inputType === "money") {
      let val = singleInput.trim().replace("$", "");
      userFormulatedAnswer = `$${val}`;
      const numClean = parseFloat(val);
      const expectedClean = parseFloat(currentQ.rawNumber || currentQ.correctAnswer.replace("$", ""));
      isAnsCorrect = Math.abs(numClean - expectedClean) < 0.001;
    } else if (currentQ.inputType === "time24") {
      const digitsOnly = singleInput.trim().replace(/\D/g, "");
      if (!digitsOnly) return;
      const padded = digitsOnly.padStart(4, "0");
      userFormulatedAnswer = `${padded}h`;
      isAnsCorrect = padded === currentQ.correctAnswer;
    } else {
      // General single input (with unit optional)
      const val = singleInput.trim().replace(/,/g, "");
      const cleanExpected = currentQ.rawNumber
        ? currentQ.rawNumber.replace(/,/g, "")
        : currentQ.correctAnswer.replace(/[^0-9.-]/g, "");

      userFormulatedAnswer = currentQ.unit ? `${val} ${currentQ.unit}` : val;
      isAnsCorrect = (val.toLowerCase() === cleanExpected.toLowerCase()) ||
                     (val.toLowerCase() === currentQ.correctAnswer.toLowerCase());
    }

    setIsAnswered(true);
    setSelectedOption(userFormulatedAnswer);
    setTotalQuestionsAnswered((prev) => prev + 1);
    evaluateResult(isAnsCorrect, userFormulatedAnswer);
  };

  const evaluateResult = (correct, formattedUserAns) => {
    setIsCorrect(correct);

    if (correct) {
      sounds.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      const points = (quizMode === "keyin" ? 15 : 10) + Math.min(newStreak * 2, 25);
      setScore((prev) => prev + points);

      if (newStreak >= streakTarget && !targetAchieved) {
        setTargetAchieved(true);
        sounds.playVictory();
      }
    } else {
      sounds.playIncorrect();
      setStreak(0);
      recordMistake(currentQ, formattedUserAns);
      setShowExplanationModal(true);
    }
  };

  const handleNextClick = () => {
    loadNextQuestion(selectedTopic);
  };

  const startRetestMistake = (mistakeItem) => {
    setCurrentQ({
      ...mistakeItem,
      options: shuffle([...mistakeItem.options])
    });
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    setShowExplanationModal(false);
    setShowMistakesModal(false);
    setTimeLeft(35);
    resetInputs();
  };

  // Scratchpad drawing logic
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = scratchpadColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearScratchpad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getRank = (sc) => {
    if (sc >= 500) return { title: "🌟 P3 Math Olympian", color: "text-amber-600", bg: "bg-amber-100 border-amber-300" };
    if (sc >= 300) return { title: "🏆 Model Master", color: "text-purple-600", bg: "bg-purple-100 border-purple-300" };
    if (sc >= 150) return { title: "⚡ Problem Solver", color: "text-blue-600", bg: "bg-blue-100 border-blue-300" };
    if (sc >= 50) return { title: "🌱 Math Explorer", color: "text-emerald-600", bg: "bg-emerald-100 border-emerald-300" };
    return { title: "🐣 Math Cadet", color: "text-slate-600", bg: "bg-slate-100 border-slate-300" };
  };

  const currentRank = getRank(score);

  // -------------------------------------------------------------
  // VIEW 1: START SETUP SCREEN
  // -------------------------------------------------------------
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl text-center flex flex-col items-center">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-4xl shadow-lg shadow-rose-500/30 mb-3 animate-bounce">
            🎯
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
            Singapore P3 Math Quest
          </h1>
          <p className="text-slate-300 text-xs md:text-sm mt-1 mb-5">
            Endless MOE Curriculum Practice • Visual Fraction & Bar Model Engine
          </p>

          {/* ANSWER MODE SELECTOR */}
          <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/10 mb-4 text-left">
            <label className="block text-xs uppercase tracking-wider font-bold text-amber-300 mb-2">
              📝 Select Answer Format:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setQuizMode("mcq")}
                className={`py-3 px-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  quizMode === "mcq"
                    ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/40 ring-2 ring-indigo-300"
                    : "bg-white/10 text-slate-300 border-white/20 hover:bg-white/20"
                }`}
              >
                <span className="text-xl">🔘</span>
                <span className="font-bold text-sm">Multiple Choice</span>
                <span className="text-[11px] text-indigo-200">Pick from 4 options</span>
              </button>

              <button
                type="button"
                onClick={() => setQuizMode("keyin")}
                className={`py-3 px-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  quizMode === "keyin"
                    ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/40 ring-2 ring-amber-300"
                    : "bg-white/10 text-slate-300 border-white/20 hover:bg-white/20"
                }`}
              >
                <span className="text-xl">⌨️</span>
                <span className="font-bold text-sm">Key-In Answer</span>
                <span className="text-[11px] text-slate-300">Type fractions & numbers</span>
              </button>
            </div>
          </div>

          {/* TARGET STREAK SETTER */}
          <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/10 mb-4 text-left">
            <label className="block text-xs uppercase tracking-wider font-bold text-amber-300 mb-2">
              🔥 Target Streak Goal:
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[5, 10, 15, 20].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setStreakTarget(t);
                    setCustomTargetInput(t.toString());
                  }}
                  className={`py-2 rounded-xl text-xs md:text-sm font-bold border transition ${
                    streakTarget === t
                      ? "bg-amber-400 text-slate-900 border-amber-300 shadow-md"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
                >
                  {t} Streak
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-300 font-medium">Custom Target:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={customTargetInput}
                onChange={(e) => {
                  setCustomTargetInput(e.target.value);
                  const val = parseInt(e.target.value, 10);
                  if (val > 0) setStreakTarget(val);
                }}
                className="w-16 bg-black/40 border border-white/30 rounded-lg px-2 py-0.5 text-center text-amber-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-xs text-slate-400">correct in a row</span>
            </div>
          </div>

          {/* TOPIC SELECTION */}
          <div className="w-full text-left mb-6">
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-300 mb-1.5">
              Choose Topic:
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
            >
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => startNewGame(streakTarget)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-base md:text-lg shadow-xl shadow-orange-500/30 transition transform active:scale-98 flex items-center justify-center gap-2"
          >
            <span>🚀 Start Math Quest</span>
            <span>(Goal: {streakTarget} Streak)</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ACTIVE GAMEPLAY
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* TARGET CELEBRATION MODAL */}
      {targetAchieved && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 text-center border-4 border-amber-400 shadow-2xl shadow-amber-500/20 animate-scaleUp">
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-slate-800">TARGET STREAK REACHED!</h2>
            <p className="text-amber-600 font-extrabold text-lg mt-1">
              {streakTarget} Questions Solved in a Row! 🎉
            </p>
            <p className="text-slate-500 text-xs mt-2 mb-6">
              Terrific mastery! You conquered the Primary 3 syllabus target.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block">Score</span>
                <span className="text-xl font-black text-indigo-600">{score} pts</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block">Mistakes Logged</span>
                <span className="text-xl font-black text-rose-600">{mistakeList.length}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setTargetAchieved(false)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:brightness-105 transition"
              >
                🔥 Continue Endless Practice
              </button>
              <button
                onClick={() => setHasStarted(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
              >
                🎯 Set a New Streak Target
              </button>
              {mistakeList.length > 0 && (
                <button
                  onClick={() => {
                    setTargetAchieved(false);
                    setShowMistakesModal(true);
                  }}
                  className="w-full py-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold rounded-xl text-sm transition"
                >
                  📖 Review {mistakeList.length} Mistake{mistakeList.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="bg-white/90 backdrop-blur border-b border-indigo-100 sticky top-0 z-30 shadow-xs px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setHasStarted(false)}
              title="Settings & Target"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-200 hover:scale-105 transition"
            >
              🇸🇬
            </button>
            <div>
              <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent leading-tight">
                Singapore P3 Math
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span>Goal: <strong className="text-indigo-600">{streakTarget} streak</strong></span>
                <span>•</span>
                <button
                  onClick={() => setQuizMode(quizMode === "mcq" ? "keyin" : "mcq")}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  {quizMode === "mcq" ? "🔘 Multiple Choice" : "⌨️ Key-In Mode"} (Switch)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
            {/* Rank badge */}
            <div className={`hidden sm:flex items-center gap-1 px-3 py-1 rounded-full border text-xs ${currentRank.bg} ${currentRank.color}`}>
              {currentRank.title}
            </div>

            {/* Score */}
            <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl">
              <span>⭐</span>
              <span>{score} pts</span>
            </div>

            {/* Streak Tracker */}
            <div className={`flex items-center gap-1 px-3 py-1 rounded-xl border transition-all ${
              streak > 2
                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse font-bold"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              <span>🔥</span>
              <span>{streak}/{streakTarget}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle Sound"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            {/* Working Pad */}
            <button
              onClick={() => setShowScratchpad(!showScratchpad)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition ${
                showScratchpad
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              ✏️ <span className="hidden sm:inline">Pad</span>
            </button>

            {/* Review Book */}
            <button
              onClick={() => setShowMistakesModal(true)}
              className={`relative px-3 py-1 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                mistakeList.length > 0
                  ? "bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-200 hover:bg-rose-600"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <span>📖</span>
              <span>Review</span>
              {mistakeList.length > 0 && (
                <span className="bg-white text-rose-600 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {mistakeList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* STREAK PROGRESS BAR */}
      <div className="max-w-4xl w-full mx-auto px-4 mt-3">
        <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <span className="text-xs font-bold text-indigo-800 whitespace-nowrap">
            Streak Goal Progress:
          </span>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 relative">
            <div
              className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (streak / streakTarget) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
            {streak} / {streakTarget}
          </span>
        </div>
      </div>

      {/* MAIN QUESTION SECTION */}
      <main className="max-w-4xl w-full mx-auto px-4 mt-3 flex-1 flex flex-col gap-4">
        {/* TOPIC SELECTOR TABS */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose Syllabus Topic:</span>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={timerMode}
                onChange={(e) => setTimerMode(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-400"
              />
              <span>⏱️ 35s Timer Mode</span>
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTopic(t.id);
                  loadNextQuestion(t.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedTopic === t.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-102"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* QUESTION CARD */}
        {currentQ && (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-900/5 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide">
                    {currentQ.categoryName}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Question #{totalQuestionsAnswered + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {quizMode === "mcq" ? "MCQ" : "Key-In"}
                  </span>
                  {timerMode && (
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      timeLeft <= 8 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-700"
                    }`}>
                      ⏱️ {timeLeft}s
                    </div>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="my-3 min-h-[85px] flex items-center">
                <p className="text-lg md:text-2xl font-bold text-slate-800 leading-relaxed whitespace-pre-line">
                  {currentQ.question}
                </p>
              </div>

              {/* Tip / Hint */}
              {currentQ.hint && !isAnswered && (
                <div className="my-2 p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base leading-none">💡</span>
                  <div>
                    <span className="font-semibold">Singapore P3 Tip: </span>
                    {currentQ.hint}
                  </div>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OPTION A: MULTIPLE CHOICE MODE                                */}
            {/* ------------------------------------------------------------- */}
            {quizMode === "mcq" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = "bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-800";

                  if (isAnswered) {
                    if (opt === currentQ.correctAnswer) {
                      btnStyle = "bg-emerald-100 border-emerald-500 text-emerald-900 font-bold shadow-md shadow-emerald-100 scale-[1.01]";
                    } else if (opt === selectedOption) {
                      btnStyle = "bg-rose-100 border-rose-400 text-rose-900 line-through";
                    } else {
                      btnStyle = "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(opt)}
                      className={`py-4 px-5 rounded-2xl border-2 text-base md:text-lg font-semibold flex items-center justify-between transition-all duration-150 active:scale-98 ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shadow-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-left font-mono">{opt}</span>
                      </div>

                      {isAnswered && opt === currentQ.correctAnswer && (
                        <span className="text-emerald-600 text-xl font-bold">✓</span>
                      )}
                      {isAnswered && opt === selectedOption && opt !== currentQ.correctAnswer && (
                        <span className="text-rose-600 text-xl font-bold">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* OPTION B: KEY-IN ANSWER MODE (WITH FRACTION BOXES)           */}
            {/* ------------------------------------------------------------- */}
            {quizMode === "keyin" && (
              <form onSubmit={handleKeyInSubmit} className="mt-6">
                <div className="bg-slate-50 border-2 border-indigo-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
                  {/* FRACTION CASE 1: FULL FRACTION (NUMERATOR & DENOMINATOR INPUTS) */}
                  {currentQ.inputType === "fraction_full" && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Enter Fraction (Simplest Form):
                      </span>
                      <div className="flex flex-col items-center justify-center w-28 bg-white p-3 rounded-2xl border-2 border-indigo-200 shadow-sm">
                        {/* Numerator Input */}
                        <input
                          type="number"
                          placeholder="Numerator"
                          disabled={isAnswered}
                          value={fracNumInput}
                          onChange={(e) => setFracNumInput(e.target.value)}
                          className="w-20 text-center font-mono font-bold text-xl text-indigo-950 bg-slate-50 border border-slate-300 rounded-lg py-1 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          autoFocus
                        />
                        {/* Visual Fraction Bar */}
                        <div className="w-22 h-1 bg-slate-800 rounded-full my-2" />
                        {/* Denominator Input */}
                        <input
                          type="number"
                          placeholder="Denominator"
                          disabled={isAnswered}
                          value={fracDenInput}
                          onChange={(e) => setFracDenInput(e.target.value)}
                          className="w-20 text-center font-mono font-bold text-xl text-indigo-950 bg-slate-50 border border-slate-300 rounded-lg py-1 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* FRACTION CASE 2: EQUIVALENT FRACTION MISSING NUMERATOR */}
                  {currentQ.inputType === "fraction_partial" && currentQ.fractionDisplay && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Fill in the Missing Numerator:
                      </span>
                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border-2 border-indigo-200 shadow-sm">
                        {/* Left given fraction */}
                        <div className="flex flex-col items-center text-xl font-bold font-mono text-slate-800">
                          <span>{currentQ.fractionDisplay.leftNum}</span>
                          <div className="w-10 h-0.5 bg-slate-800 my-1" />
                          <span>{currentQ.fractionDisplay.leftDen}</span>
                        </div>

                        <span className="text-2xl font-bold text-slate-400">=</span>

                        {/* Right target fraction with input numerator */}
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            placeholder="?"
                            disabled={isAnswered}
                            value={fracNumInput}
                            onChange={(e) => setFracNumInput(e.target.value)}
                            className="w-16 text-center font-mono font-bold text-xl text-indigo-950 bg-indigo-50 border-2 border-indigo-400 rounded-lg py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            autoFocus
                          />
                          <div className="w-16 h-1 bg-slate-800 rounded-full my-1.5" />
                          <span className="font-mono font-bold text-xl text-slate-800">
                            {currentQ.fractionDisplay.rightDen}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMPOUND TIME INPUT (HOURS & MINUTES) */}
                  {currentQ.inputType === "compound_time" && (
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Enter Duration:
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-300">
                          <input
                            type="number"
                            placeholder="0"
                            disabled={isAnswered}
                            value={timeHourInput}
                            onChange={(e) => setTimeHourInput(e.target.value)}
                            className="w-14 text-center font-mono font-bold text-xl text-indigo-950 focus:outline-none"
                            autoFocus
                          />
                          <span className="text-sm font-bold text-slate-500">hours</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-300">
                          <input
                            type="number"
                            placeholder="0"
                            disabled={isAnswered}
                            value={timeMinInput}
                            onChange={(e) => setTimeMinInput(e.target.value)}
                            className="w-14 text-center font-mono font-bold text-xl text-indigo-950 focus:outline-none"
                          />
                          <span className="text-sm font-bold text-slate-500">min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GENERAL SINGLE NUMBER / MONEY / MEASUREMENT / TEXT / 24-HOUR TIME INPUT */}
                  {(currentQ.inputType === "single" || currentQ.inputType === "single_text" || currentQ.inputType === "money" || currentQ.inputType === "time24" || !currentQ.inputType) && (
                    <div className="flex flex-col items-center w-full max-w-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Type Your Answer:
                      </span>
                      <div className="flex items-center gap-2 w-full bg-white px-4 py-2.5 rounded-2xl border-2 border-indigo-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 shadow-sm">
                        {currentQ.unit === "$" && (
                          <span className="text-2xl font-bold text-slate-600">$</span>
                        )}
                        <input
                          type={(currentQ.inputType === "money" || currentQ.inputType === "single_text" || currentQ.inputType === "time24") ? "text" : "number"}
                          step="any"
                          placeholder={currentQ.inputType === "time24" ? "e.g. 1345" : "Type answer..."}
                          disabled={isAnswered}
                          value={singleInput}
                          onChange={(e) => setSingleInput(e.target.value)}
                          className="w-full text-center font-mono font-bold text-xl md:text-2xl text-indigo-950 bg-transparent focus:outline-none"
                          autoFocus
                        />
                        {currentQ.unit && currentQ.unit !== "$" && (
                          <span className="text-base font-bold text-slate-500">{currentQ.unit}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Key-In Answer Button */}
                  {!isAnswered && (
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md shadow-indigo-300 transition transform active:scale-95 flex items-center gap-2"
                    >
                      <span>Check My Answer</span>
                      <span>✓</span>
                    </button>
                  )}

                  {/* Immediate Feedback for Key-In */}
                  {isAnswered && (
                    <div className="w-full text-center py-2">
                      {isCorrect ? (
                        <p className="text-emerald-700 font-bold text-base">
                          🎉 Fantastic! Your answer <span className="font-mono underline">{selectedOption}</span> is correct!
                        </p>
                      ) : (
                        <p className="text-rose-700 font-bold text-base">
                          ❌ You entered <span className="font-mono line-through">{selectedOption}</span>. Correct answer is <span className="font-mono font-extrabold text-emerald-700">{currentQ.correctAnswer}</span>.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* ACTION FOOTER AFTER ANSWERING */}
            {isAnswered && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm md:text-base">
                      <span className="text-2xl">🎉</span>
                      <span>Great Job! (+{quizMode === "keyin" ? "15" : "10"} XP)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-sm md:text-base">
                      <span className="text-2xl">💡</span>
                      <span>Let's review the Singapore Bar Model solution!</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExplanationModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-sm transition flex items-center gap-1.5"
                  >
                    <span>📐</span>
                    <span>Explain Answer</span>
                  </button>

                  <button
                    onClick={handleNextClick}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-300 transition-all transform active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Next Question</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKING SCRATCHPAD */}
        {showScratchpad && (
          <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg p-4 flex flex-col gap-2 relative">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-900">📝 Working / Bar Model Drawing Canvas</span>
                <span className="text-xs text-slate-400">(Draw models or vertical algorithms)</span>
              </div>
              <div className="flex items-center gap-2">
                {["#2563eb", "#dc2626", "#059669", "#7c3aed"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setScratchpadColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 ${scratchpadColor === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                  />
                ))}
                <button
                  onClick={clearScratchpad}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowScratchpad(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={750}
              height={220}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-crosshair touch-none"
            />
          </div>
        )}
      </main>

      {/* STEP-BY-STEP EXPLANATION MODAL */}
      {showExplanationModal && currentQ && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-indigo-100 shadow-2xl p-6 md:p-8 animate-scaleUp max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    💡
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Step-by-Step Model Explanation</h3>
                    <p className="text-xs text-indigo-600 font-semibold">{currentQ.explanation.concept}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExplanationModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 block uppercase">Your Answer</span>
                  <span className={`text-base font-bold ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                    {selectedOption || "None"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-600 block uppercase">Correct Answer</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {currentQ.correctAnswer}
                  </span>
                </div>
              </div>

              {currentQ.explanation.model && (
                <div className="mb-4 p-4 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block mb-1">
                    📊 Singapore Math Model Representation:
                  </span>
                  <div className="p-2.5 bg-white/90 border border-sky-100 rounded-xl font-mono text-sm text-sky-950 whitespace-pre-line shadow-xs">
                    {currentQ.explanation.model}
                  </div>
                </div>
              )}

              <div className="space-y-2.5 my-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Method & Steps:</span>
                {currentQ.explanation.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowExplanationModal(false);
                  if (isAnswered) {
                    handleNextClick();
                  }
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition"
              >
                I Understand! Next Question ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MISTAKES REVIEW BOOK MODAL */}
      {showMistakesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 md:p-8 max-h-[88vh] flex flex-col justify-between animate-scaleUp">
            <div>
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl">
                    📖
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Mistake Review & Revision Book</h3>
                    <p className="text-xs text-slate-500">
                      {mistakeList.length} question{mistakeList.length !== 1 ? "s" : ""} collected for targeted revision
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mistakeList.length > 0 && (
                    <button
                      onClick={() => setMistakeList([])}
                      className="text-xs text-rose-600 hover:underline font-semibold px-2 py-1"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMistakesModal(false);
                      setSelectedReviewItem(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 font-bold p-1 text-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {selectedReviewItem ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <button
                    onClick={() => setSelectedReviewItem(null)}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                  >
                    ← Back to Mistake List
                  </button>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                      {selectedReviewItem.categoryName}
                    </span>
                    <span className="text-xs text-slate-400">{selectedReviewItem.timestamp}</span>
                  </div>
                  <h4 className="text-base md:text-lg font-bold text-slate-800 whitespace-pre-line">
                    {selectedReviewItem.question}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                      <span className="text-xs block font-semibold text-rose-500">Your Answer:</span>
                      <span className="font-bold line-through font-mono">{selectedReviewItem.userAnswer}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <span className="text-xs block font-semibold text-emerald-600">Correct Answer:</span>
                      <span className="font-bold font-mono">{selectedReviewItem.correctAnswer}</span>
                    </div>
                  </div>
                  {selectedReviewItem.explanation.model && (
                    <div className="p-3 bg-white rounded-xl border border-sky-100 text-xs font-mono text-sky-900 whitespace-pre-line">
                      {selectedReviewItem.explanation.model}
                    </div>
                  )}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <span className="font-bold uppercase tracking-wider text-slate-500">Steps:</span>
                    {selectedReviewItem.explanation.steps.map((st, i) => (
                      <p key={i} className="bg-white p-2 rounded-lg border border-slate-100">
                        {i + 1}. {st}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => startRetestMistake(selectedReviewItem)}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
                  >
                    🔄 Retest This Question Now
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[55vh] space-y-3 pr-1">
                  {mistakeList.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-3">🌟</div>
                      <p className="text-slate-700 font-bold text-base">Your Mistake Book is completely empty!</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Any question you get wrong will automatically be cataloged here for revision.
                      </p>
                    </div>
                  ) : (
                    mistakeList.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-indigo-300 transition flex flex-col gap-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-md">
                            {item.categoryName}
                          </span>
                          <span className="text-slate-400">{item.timestamp}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 line-clamp-2">{item.question}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-rose-600">
                              Selected: <strong className="line-through">{item.userAnswer}</strong>
                            </span>
                            <span className="text-emerald-700">
                              Correct: <strong>{item.correctAnswer}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedReviewItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
                            >
                              💡 Method
                            </button>
                            <button
                              onClick={() => startRetestMistake(item)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                            >
                              🔄 Retest
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tip: Click "Retest" on any question to attempt it again fresh.
              </span>
              <button
                onClick={() => {
                  setShowMistakesModal(false);
                  setSelectedReviewItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="text-center text-xs text-slate-400 mt-auto pt-6">
        Singapore Primary 3 Mathematics Quiz • Multiple Choice & Key-In Modes • MOE Bar Model Method
      </footer>
    </div>
  );
}
