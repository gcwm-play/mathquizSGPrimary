import { UNITS, power } from "./engine.js";
import { SPRITES, PALETTE, TEAM } from "./sprites.js";

// Turn a sprite into rectangles, merging runs of same-coloured pixels in a row.
const cache = {};
function rects(type, side) {
  const key = type + side;
  if (cache[key]) return cache[key];
  const out = [];
  SPRITES[type].forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== ".") out.push({ x, y, w: end - x, fill: TEAM[side][ch] || PALETTE[ch] });
      x = end;
    }
  });
  return (cache[key] = out);
}

const BADGE = { blue: "#1f3f80", red: "#7a221b" };

export default function Token({ unit, size = "100%" }) {
  const p = power(unit);
  const full = unit.value >= UNITS[unit.type].die;
  const numColor = unit.boost > 0 ? "#9ff5c9" : unit.rider ? "#e6b8ff" : "#fff6dc";
  return (
    <svg viewBox="-1 -1 18 20" width={size} height={size} className="dt-sprite" shapeRendering="crispEdges" aria-hidden="true">
      {rects(unit.type, unit.side).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
      ))}
      {unit.rider && (
        // A small portrait of the rider in the top-left corner.
        <g transform="translate(-1 -1) scale(0.5)">
          <rect x="-0.5" y="-0.5" width="17" height="19" rx="3" fill="#fff6dc" stroke="#7b2cbf" strokeWidth="1" />
          {rects(unit.rider.type, unit.rider.side).map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
          ))}
        </g>
      )}
      <g shapeRendering="geometricPrecision">
        <circle cx="14" cy="15.6" r="3.4" fill={BADGE[unit.side]} stroke={full ? "#f6d050" : "#fff6dc"} strokeWidth={full ? 0.8 : 0.5} />
        <text x="14" y="17.3" textAnchor="middle" fontSize={p > 9 ? 3.8 : 4.6} fontWeight="700" fill={numColor} fontFamily="Fredoka, sans-serif">
          {p}
        </text>
      </g>
    </svg>
  );
}
