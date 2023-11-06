import _hexToRgba from 'hex-to-rgba'
import { TRGBA } from '../types'

const rgbaRegex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*([01]?(\.\d+)?)\)$/
const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
const hslRegex = /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/
const hslaRegex =
  /^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*([\d.]+)\s*\)$/
const hexRegex = /^#([A-Fa-f0-9]{3}){1,2}$/
const floatRgbRegex =
  /^\{\s*r:\s*[\d.]+,\s*g:\s*[\d.]+,\s*b:\s*[\d.]+(,\s*opacity:\s*[\d.]+)?\s*\}$/

export const hexToRgba = (value: string) => {
  const rgba = _hexToRgba(value)
  const [, _r, _g, _b, _a] = rgba.match(rgbaRegex) || []
  const [r, g, b] = [_r, _g, _b].map(c => parseInt(c))
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: parseFloat(_a),
  }
}

export function rgbaToHex({ r, g, b, a }: TRGBA) {
  if (a !== 1) {
    return `rgba(${[r, g, b]
      .map((n) => Math.round(n * 255))
      .join(", ")}, ${a.toFixed(4)})`
  }
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  const hex = [toHex(r), toHex(g), toHex(b)].join("")
  return `#${hex}`
}

export function isColorValue(value: string) {
  return rgbRegex.test(value) ||
    rgbaRegex.test(value) ||
    hslRegex.test(value) ||
    hexRegex.test(value) ||
    floatRgbRegex.test(value)
}

export function parseColor(color: string) {
  try {
    color = color?.trim()

    if (!isColorValue(color)) throw new Error(`Invalid color format 2: "${color}"`)

    if (rgbRegex.test(color)) {
      const [, r, g, b] = RegExp(rgbRegex).exec(color) ?? []
      return { r: parseInt(r) / 255, g: parseInt(g) / 255, b: parseInt(b) / 255 }
    } else if (rgbaRegex.test(color)) {
      const [, r, g, b, a] = RegExp(rgbaRegex).exec(color) ?? []
      return {
        r: parseInt(r) / 255,
        g: parseInt(g) / 255,
        b: parseInt(b) / 255,
        a: parseFloat(a),
      }
    } else if (hslRegex.test(color)) {
      const [, h, s, l] = RegExp(hslRegex).exec(color) ?? []
      return hslToRgbFloat(parseInt(h), parseInt(s) / 100, parseInt(l) / 100)
    } else if (hslaRegex.test(color)) {
      const [, h, s, l, a] = RegExp(hslaRegex).exec(color) ?? []
      return Object.assign(
        hslToRgbFloat(parseInt(h), parseInt(s) / 100, parseInt(l) / 100),
        { a: parseFloat(a) }
      )
    } else if (hexRegex.test(color)) {
      const hexValue = color.substring(1)
      const expandedHex =
        hexValue.length === 3
          ? hexValue
            .split("")
            .map((char) => char + char)
            .join("")
          : hexValue
      return {
        r: parseInt(expandedHex.slice(0, 2), 16) / 255,
        g: parseInt(expandedHex.slice(2, 4), 16) / 255,
        b: parseInt(expandedHex.slice(4, 6), 16) / 255,
      }
    } else if (floatRgbRegex.test(color)) {
      return JSON.parse(color)
    } else {
      throw new Error(`Invalid color format 1: "${color}"`)
    }
  } catch (error) {
    console.error(error)
  }
}

export function hslToRgbFloat(h: number, s: number, l: number) {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  if (s === 0) {
    return { r: l, g: l, b: l }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, (h + 1 / 3) % 1)
  const g = hue2rgb(p, q, h % 1)
  const b = hue2rgb(p, q, (h - 1 / 3) % 1)

  return { r, g, b }
}
