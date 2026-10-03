// The AI Explorer worlds, in the suggested learning order, with "I can…"
// learning outcomes for kids and teachers.
export const AS_OF = "October 2026";

export const WORLDS = [
  {
    id: "brain",
    icon: "🔮",
    name: "Inside the Brain",
    short: "Brain",
    blurb: "What happens when you type",
    outcomes: [
      "explain how an AI chops words into tokens and predicts the next one",
      "describe what “attention” and “temperature” do",
      "explain how AI makes pictures, videos, music and code",
      "explain why AI can confidently make things up",
    ],
  },
  {
    id: "factory",
    icon: "🏭",
    name: "The AI Factory",
    short: "Factory",
    blurb: "How AI is made, and its costs",
    outcomes: [
      "list the steps to build an AI, from collecting text to testing",
      "explain why AI needs data centres, electricity and water",
      "weigh up AI's costs and benefits for the planet",
      "use STOP, THINK, CHECK to spot AI slop and deepfakes",
    ],
  },
  {
    id: "zoo",
    icon: "🦁",
    name: "The Model Zoo",
    short: "Zoo",
    blurb: "Why there are so many AIs",
    outcomes: [
      "explain why there are many different AIs (size, specialists, languages)",
      "tell the difference between open and closed AI",
      "name AIs from different countries, including Singapore",
      "describe how the AI race between the USA and China changed",
    ],
  },
  {
    id: "history",
    icon: "📜",
    name: "History of AI",
    short: "History",
    blurb: "From 1950 to today",
    outcomes: [
      "describe key moments in AI history, from Alan Turing to ChatGPT",
      "explain what an “AI winter” was",
      "compare an early chatbot (ELIZA) with today's AIs",
      "name some of Singapore's AI milestones",
    ],
  },
  {
    id: "quiz",
    icon: "🧠",
    name: "Quiz Time",
    short: "Quiz",
    blurb: "Test what you remember",
    outcomes: ["check what I remember from every world", "find out which world to visit again"],
  },
];

export const worldById = (id) => WORLDS.find((w) => w.id === id);
