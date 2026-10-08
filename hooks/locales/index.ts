// Every language Tolk ships. To add one: create `<code>.ts` next to
// this file (copy de.ts), import it here, and add its code to the
// `options` of `language` in .claude-plugin/plugin.json.

import de from './de'
import en from './en'
import es from './es'
import fr from './fr'
import it from './it'
import ja from './ja'
import ptBR from './pt-BR'
import zhCN from './zh-CN'
import type { Locale } from './types'

export const SOURCE: Locale = en

export const LOCALES: Readonly<Record<string, Locale>> = {
  en,
  de,
  es,
  fr,
  it,
  'pt-BR': ptBR,
  ja,
  'zh-CN': zhCN,
}

export const CODES: readonly string[] = Object.keys(LOCALES)
