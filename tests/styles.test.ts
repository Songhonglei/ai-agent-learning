import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

type ThemeTokens = Record<string, string>

function readThemeTokens(selector: ':root' | ':root[data-theme="dark"]'): ThemeTokens {
  const selectorPattern = selector === ':root'
    ? /:root\s*\{([^}]*)\}/
    : /:root\[data-theme="dark"\]\s*\{([^}]*)\}/
  const declarations = styles.match(selectorPattern)?.[1]

  if (!declarations) {
    throw new Error(`Missing ${selector} token block`)
  }

  return Object.fromEntries(
    [...declarations.matchAll(/(--[\w-]+):\s*(#[\da-fA-F]{6})\s*;/g)]
      .map((match) => [match[1], match[2]]),
  )
}

function relativeLuminance(hex: string) {
  const channels = hex.match(/[\da-fA-F]{2}/g)
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${hex}`)
  }

  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function expectAaPair(tokens: ThemeTokens, foreground: string, background: string) {
  const foregroundColor = tokens[foreground]
  const backgroundColor = tokens[background]

  if (!foregroundColor || !backgroundColor) {
    throw new Error(`Missing tested color token: ${foreground} or ${background}`)
  }

  expect(
    contrastRatio(foregroundColor, backgroundColor),
    `${foreground} ${foregroundColor} on ${background} ${backgroundColor}`,
  ).toBeGreaterThanOrEqual(4.5)
}

describe('normal-size text contrast tokens', () => {
  const surfaces = ['--bg', '--panel', '--soft']

  it.each([
    ['light', readThemeTokens(':root')],
    ['dark', readThemeTokens(':root[data-theme="dark"]')],
  ])('keeps muted and semantic accent text AA compliant in %s mode', (_theme, tokens) => {
    for (const foreground of ['--muted', '--primary-text', '--indigo-text']) {
      for (const surface of surfaces) {
        expectAaPair(tokens, foreground, surface)
      }
    }
  })

  it.each([
    ['light', readThemeTokens(':root')],
    ['dark', readThemeTokens(':root[data-theme="dark"]')],
  ])('keeps white action text AA compliant in %s mode', (_theme, tokens) => {
    expectAaPair({ ...tokens, '--white': '#ffffff' }, '--white', '--primary-action')
    expectAaPair({ ...tokens, '--white': '#ffffff' }, '--white', '--indigo')
  })
})
