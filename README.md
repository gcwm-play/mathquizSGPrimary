# Singapore P3 Math Quest

An endless-practice quiz app covering the Singapore Primary 3 Mathematics syllabus (place value, addition/subtraction, multiplication/division, fractions, money, measurement, time, geometry, and bar-model word problems), with multiple-choice and key-in answer modes, streak targets, a mistake review book, and a drawing scratchpad.

## Colour Castle (colour vision game)

A second app at `colorvision.html` (`/mathquizSGPrimary/colorvision.html` on Pages) that teaches students about colour blindness. Pick whose eyes to look through (Everyday Eyes, Weak Green, No Green, Weak Red, No Red, No Blue, Grey World — each also shows its medical name), then find the right door out of three. Correct picks move you on; a wrong pick ends the run and shows what you saw next to the real colours. The "Dot Test" tab has app-generated Ishihara-style dot plates (not the copyrighted originals) whose numbers vanish for specific eyes, with eye-swapping and a "who can see it?" comparison. The "Story" tab covers the history of colour blindness (a timeline from 1777 to today, past stigma, famous colour-blind people, famous mix-ups, and a myth-or-fact quiz). The "See the World" tab has a swipe-to-compare picture, "colour twins", and a full colour table for grown-ups. Source: `src/colorvision/`.

## AI Explorer

A third app at `ai.html` (`/mathquizSGPrimary/ai.html` on Pages) that teaches P4–P6 students how AI and LLMs work. "Inside the Brain" follows a sentence as token "bugs" through tokenizing, embeddings, attention and layers to next-word prediction (a real in-browser trigram model with a temperature slider), plus demos of diffusion pictures, video frames, note-by-note music, a vibe-coding agent loop, and hallucination. "The AI Factory" walks through how a model is made (data, pre-training, compute, human feedback, testing), visits an animated data centre with a per-question energy and water meter, and covers training costs, environmental trade-offs and Singapore's data centres, with sourced figures. "The Model Zoo" is coming soon. Source: `src/ai/`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushing to `main` (or running the workflow manually) builds the app with Vite and publishes `dist/` to GitHub Pages via `.github/workflows/deploy.yml`.

To enable Pages for this repository: **Settings → Pages → Source: GitHub Actions**.
