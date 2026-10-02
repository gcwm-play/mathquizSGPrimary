# Singapore P3 Math Quest

An endless-practice quiz app covering the Singapore Primary 3 Mathematics syllabus (place value, addition/subtraction, multiplication/division, fractions, money, measurement, time, geometry, and bar-model word problems), with multiple-choice and key-in answer modes, streak targets, a mistake review book, and a drawing scratchpad.

## Colour Castle (colour vision game)

A second app at `colorvision.html` (`/mathquizSGPrimary/colorvision.html` on Pages) that teaches students about colour blindness. Pick whose eyes to look through (Everyday Eyes, Weak Green, No Green, Weak Red, No Red, No Blue, Grey World — each also shows its medical name), then find the right door out of three. Correct picks move you on; a wrong pick ends the run and shows what you saw next to the real colours. The "See the World" tab has a swipe-to-compare picture, "colour twins", and a full colour table for grown-ups. Source: `src/colorvision/`.

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
