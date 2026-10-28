/**
 * Color conversion utilities for the Color Wheel Picker.
 *
 * Pure functions — no DOM access, no side effects, no external dependencies.
 *
 * Internal HSV representation:
 *   h: 0-360 (degrees, normalized via clampHue)
 *   s: 0-100 (percent)
 *   v: 0-100 (percent)
 *
 * RGB: 0-255 per channel.
 * HSL: h: 0-360, s/l: 0-100.
 * HEX: #RRGGBB (alpha is parsed from #RRGGBBAA / #RGBA inputs but discarded).
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorOutput {
  /** #RRGGBB (no alpha channel). */
  hex: string;
  /** RGB channels, 0-255 each. */
  rgb: RGB;
  /** HSV with h: 0-360, s/v: 0-100. */
  hsv: HSV;
  /** HSL with h: 0-360, s/l: 0-100. */
  hsl: HSL;
}

/** A parseable color input: hex/rgb()/hsl() string, named color, or color object. */
export type ColorInput = string | RGB | HSV | HSL;

/** Clamp a number to [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Normalize an angle to [0, 360). */
export function clampHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/**
 * HSV → RGB.
 * @param h 0-360
 * @param s 0-100
 * @param v 0-100
 */
export function hsvToRgb(h: number, s: number, v: number): RGB {
  h = clampHue(h);
  const sN = clamp(s, 0, 100) / 100;
  const vN = clamp(v, 0, 100) / 100;
  const c = vN * sN;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = vN - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hPrime < 1) {
    r = c;
    g = x;
  } else if (hPrime < 2) {
    r = x;
    g = c;
  } else if (hPrime < 3) {
    g = c;
    b = x;
  } else if (hPrime < 4) {
    g = x;
    b = c;
  } else if (hPrime < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * RGB → HSV.
 * @param r 0-255
 * @param g 0-255
 * @param b 0-255
 */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rN) {
      h = ((gN - bN) / d) % 6;
    } else if (max === gN) {
      h = (bN - rN) / d + 2;
    } else {
      h = (rN - gN) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

/** RGB (0-255) → #RRGGBB. */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Hex string → RGB. Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 * Alpha (if present) is parsed and discarded.
 */
export function hexToRgb(hex: string): RGB {
  let s = String(hex).trim().replace(/^#/, "");
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  } else if (s.length === 4) {
    // #RGBA → drop alpha, expand RGB
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  } else if (s.length === 8) {
    // #RRGGBBAA → drop alpha
    s = s.slice(0, 6);
  }
  if (s.length !== 6 || !/^[0-9a-f]{6}$/i.test(s)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/**
 * HSV → HSL.
 * @param h 0-360
 * @param s 0-100
 * @param v 0-100
 */
export function hsvToHsl(h: number, s: number, v: number): HSL {
  const sN = clamp(s, 0, 100) / 100;
  const vN = clamp(v, 0, 100) / 100;
  const l = vN - (vN * sN) / 2;
  const sl = l === 0 || l === 1 ? 0 : (vN - l) / Math.min(l, 1 - l);
  return { h: clampHue(h), s: sl * 100, l: l * 100 };
}

/**
 * HSL → HSV.
 * @param h 0-360
 * @param s 0-100
 * @param l 0-100
 */
export function hslToHsv(h: number, s: number, l: number): HSV {
  const sN = clamp(s, 0, 100) / 100;
  const lN = clamp(l, 0, 100) / 100;
  const v = lN + sN * Math.min(lN, 1 - lN);
  const sv = v === 0 ? 0 : 2 * (1 - lN / v);
  return { h: clampHue(h), s: sv * 100, v: v * 100 };
}

/**
 * A small subset of CSS named colors. Sufficient for common cases;
 * not a complete X11 color table.
 */
const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  orange: "#ffa500",
  purple: "#800080",
  pink: "#ffc0cb",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  lime: "#00ff00",
  aqua: "#00ffff",
  teal: "#008080",
  navy: "#000080",
  fuchsia: "#ff00ff",
  brown: "#a52a2a",
  transparent: "#000000",
};

/**
 * Parse any supported color input into HSV.
 *
 * Accepted inputs:
 *  - Hex string: "#fff", "#ffffff", "#ffffffff"
 *  - rgb()/rgba() string: "rgb(255, 0, 0)", "rgba(0, 0, 255, 0.5)"
 *  - hsl()/hsla() string: "hsl(120, 100%, 50%)", "hsla(180, 50%, 50%, 0.5)"
 *  - CSS named color: "red", "blue", "transparent"
 *  - { r, g, b } object (0-255)
 *  - { h, s, v } object (h: 0-360, s/v: 0-100)
 *  - { h, s, l } object (h: 0-360, s/l: 0-100)
 */
export function parseColor(input: ColorInput): HSV {
  if (input == null) throw new Error("parseColor: input is null/undefined");

  if (typeof input === "object") {
    if ("r" in input && "g" in input && "b" in input) {
      return rgbToHsv(input.r, input.g, input.b);
    }
    if ("v" in input) {
      return {
        h: clampHue(input.h),
        s: clamp(input.s, 0, 100),
        v: clamp(input.v, 0, 100),
      };
    }
    if ("l" in input) {
      return hslToHsv(input.h, input.s, input.l);
    }
    throw new Error("parseColor: unrecognized color object");
  }

  const s = String(input).trim().toLowerCase();

  if (s.startsWith("#")) {
    const rgb = hexToRgb(s);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  }

  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgbMatch) {
    return rgbToHsv(
      parseFloat(rgbMatch[1]),
      parseFloat(rgbMatch[2]),
      parseFloat(rgbMatch[3]),
    );
  }

  const hslMatch = s.match(
    /^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?/,
  );
  if (hslMatch) {
    return hslToHsv(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]),
      parseFloat(hslMatch[3]),
    );
  }

  if (s in NAMED_COLORS) {
    const rgb = hexToRgb(NAMED_COLORS[s]);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  }

  throw new Error(`parseColor: unrecognized color "${input}"`);
}

/** Format an HSV color as #RRGGBB. */
export function formatHex(hsv: HSV): string {
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** Build a complete ColorOutput (hex + rgb + hsv + hsl) from HSV. */
export function toColorOutput(hsv: HSV): ColorOutput {
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hsl = hsvToHsl(hsv.h, hsv.s, hsv.v);
  return {
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb: { ...rgb },
    hsv: {
      h: clampHue(hsv.h),
      s: clamp(hsv.s, 0, 100),
      v: clamp(hsv.v, 0, 100),
    },
    hsl,
  };
}
