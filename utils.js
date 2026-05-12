export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const normalizeAngle = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 90;
  return Math.round(((number % 360) + 360) % 360);
};

export const directionToAngle = direction => {
  const value = String(direction ?? "90deg").trim();
  if (value.toLowerCase().endsWith("deg")) return normalizeAngle(value.slice(0, -3));
  return ({ "to top": 0, "to right": 90, "to bottom": 180, "to left": 270 })[value] ?? 90;
};

export const uid = prefix => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export const round = (number, places = 0) => Number(number.toFixed(places));

export const hex = value => value.toString(16).padStart(2, "0");

export const rgbToHex = ({ r, g, b }) => `#${hex(r)}${hex(g)}${hex(b)}`;

export const hexToRgb = color => {
  const clean = color.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map(ch => ch + ch).join("") : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function copyLine(line) {
  return {
    ...line,
    start: { ...line.start },
    end: { ...line.end },
    stops: line.stops.map(stop => ({ ...stop })),
  };
}

export function copyLibraryItem(item) {
  return {
    ...item,
    stops: item.stops.map(stop => ({ ...stop })),
  };
}

export function freshStops(count) {
  const total = clamp(Number(count) || 5, 2, 16);
  return Array.from({ length: total }, (_, index) => ({
    id: uid("stop"),
    pos: total === 1 ? 0 : round((index / (total - 1)) * 100, 1),
    color: "#000000",
  }));
}

export function sortStops(stops) {
  return stops.sort((a, b) => a.pos - b.pos);
}

export function gradientCss(stops, direction = "90deg") {
  const safeStops = sortStops(stops.map(stop => ({ ...stop })));
  const body = safeStops.map(stop => `${stop.color} ${round(stop.pos, 1)}%`).join(", ");
  return `linear-gradient(${direction}, ${body})`;
}

export function cssBlock(line, domain = "gradientlab.local") {
  const stops = sortStops(line.stops.map(stop => ({ ...stop })));
  const permalinkStops = stops.map(stop => `${stop.color.replace("#", "")}+${round(stop.pos, 1)}`).join(",");
  return `/* Permalink - use to edit and share this gradient: https://${domain}/gradient-editor/#${permalinkStops} */
background: ${gradientCss(stops, line.direction)};`;
}

export function libraryCss(library, prefix = "gr-") {
  return library.map((item, index) => {
    const className = `.${prefix}${index + 1}`.replace("..", ".");
    return `${className} {
  background: ${gradientCss(item.stops, item.direction)};
}`;
  }).join(`\n\n`);
}

export function interpolateColor(stops, position) {
  const sorted = sortStops(stops.map(stop => ({ ...stop })));
  const pos = clamp(position / 100, 0, 1) * 100;
  let left = sorted[0];
  let right = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
      left = sorted[i];
      right = sorted[i + 1];
      break;
    }
  }
  if (left.id === right.id || left.pos === right.pos) return left.color;
  const t = clamp((pos - left.pos) / (right.pos - left.pos), 0, 1);
  const a = hexToRgb(left.color);
  const b = hexToRgb(right.color);
  return rgbToHex({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  });
}
