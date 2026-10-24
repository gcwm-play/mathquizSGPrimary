import { GLYPHS, power } from "./engine.js";

// Outline for each die size, drawn in a 100×100 box.
const SHAPES = {
  4: "50,8 94,88 6,88",
  6: "14,14 86,14 86,86 14,86",
  8: "50,4 96,50 50,96 4,50",
  10: "50,4 92,38 76,94 24,94 8,38",
  12: "50,5 93,36 77,90 23,90 7,36",
  20: "50,4 90,27 90,73 50,96 10,73 10,27",
};

// Where the number sits so it looks centred inside each shape.
const NUM_Y = { 4: 80, 6: 72, 8: 74, 10: 76, 12: 76, 20: 74 };
const GLYPH_Y = { 4: 54, 6: 42, 8: 42, 10: 44, 12: 44, 20: 42 };

export default function Die({ piece, faces, size = "100%", dim = false }) {
  const white = piece.side === "w";
  const points = SHAPES[faces] || SHAPES[20];
  const full = piece.value >= faces;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`dc-die ${dim ? "opacity-40" : ""}`} aria-hidden="true">
      <polygon
        points={points}
        fill={white ? "#fdf6e3" : "#2b2d42"}
        stroke={full ? "#e0a100" : white ? "#8a7a5c" : "#0d0e1a"}
        strokeWidth={full ? 7 : 4}
        strokeLinejoin="round"
      />
      <text
        x="50"
        y={NUM_Y[faces] || 60}
        textAnchor="middle"
        fontSize={faces === 4 ? 28 : power(piece) > 9 ? 30 : 36}
        fontWeight="700"
        fill={piece.boost > 0 ? (white ? "#1b7f6b" : "#7ff0d2") : piece.bonus > 0 ? (white ? "#7b2cbf" : "#d7a8ff") : white ? "#1f2333" : "#fdf6e3"}
      >
        {power(piece)}
      </text>
      <text x="50" y={GLYPH_Y[faces] || 42} textAnchor="middle" fontSize={faces === 4 ? 22 : 28} fill={white ? "#6b5d43" : "#b8bedd"}>
        {GLYPHS[piece.type]}
      </text>
    </svg>
  );
}
