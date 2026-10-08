// Pure helpers: no `$`, so the tests can exercise them directly.

import type { Locale, PhraseId } from './locales/types'

/**
 * The English phrases Claude Code puts in the hint line under the prompt,
 * the run-in-background pill, the notices under the logo and the spinner.
 * A capture group is the key binding the phrase names, kept as the user
 * bound it and handed to the template as `{1}`.
 */
export const PHRASES: ReadonlyArray<readonly [PhraseId, RegExp]> = [
  ['pressAgainExit', /Press (\S+) again to exit/gi],
  ['doubleEscClear', /double tap esc to clear input/gi],
  ['escAgainClear', /\bEsc again to clear\b/gi],
  ['escInterrupt', /\besc to interrupt\b/gi],
  ['editQueued', /Press up to edit queued messages/gi],
  ['runInBackground', /\(([^()\s]+) to run in background\)/gi],
  ['toCycle', /\(([^()\s]+) to cycle\)/gi],
  ['toExpand', /\(([^()\s]+) to expand\)/gi],
  ['pasteToExpand', /paste again to expand/gi],
  ['shortcuts', /\? for shortcuts/g],
  ['forAgents', /← for agents/g],
  ['shellMode', /! for shell mode/g],
  ['acceptEdits', /\baccept edits on\b/gi],
  ['planMode', /\bplan mode on\b/gi],
  ['autoMode', /\bauto mode on\b/gi],
  ['bypassPermissions', /\bbypass permissions on\b/gi],
  ['manualMode', /\bmanual mode on\b/gi],
  ['toStop', /\b(ctrl\+\S+) to stop\b/gi],
  ['holdToSpeak', /\bhold (\S+) to speak\b/gi],
  // The /sandbox description, a status line: `◯ sandbox disabled (⏎ to configure)`.
  ['sandboxEnabled', /\bsandbox enabled\b/g],
  ['sandboxDisabled', /\bsandbox disabled\b/g],
  ['sandboxAutoAllow', /\(auto-allow\)/g],
  ['sandboxFallback', /, fallback allowed\b/g],
  ['sandboxManaged', /\(managed\)/g],
  ['toConfigure', /\(⏎ to configure\)/g],
]

/** Fills `{name}` (and `{1}`) placeholders; unknown ones are left as typed. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  )
}

/**
 * Replaces every phrase the locale translates. Returns the text unchanged
 * (the same string) when nothing matched, so callers can tell and leave
 * Claude Code's own drawing alone.
 */
export function translatePhrases(text: string, locale: Locale): string {
  let out = text
  for (const [id, pattern] of PHRASES) {
    const template = locale.phrases[id]
    if (template === undefined) continue
    out = out.replace(pattern, (_whole, key?: string) =>
      fill(template, { 1: typeof key === 'string' ? key : '' }),
    )
  }
  return out
}

const LEADING_CYCLE = /^\(([^()\s]+) to cycle\)/i

/**
 * The hint line under the prompt. Claude Code draws the mode label
 * (`⏵⏵ auto mode on`) itself and joins a rewritten hint to it with ` · `,
 * so a cycle hint opening the line loses its parentheses and reads as a
 * part of its own: `auto mode on · shift+tab zum Wechseln`.
 */
export function translateHint(text: string, locale: Locale): string {
  const template = locale.phrases.toCycle
  const lead = template === undefined ? null : LEADING_CYCLE.exec(text)
  if (template === undefined || lead === null) return translatePhrases(text, locale)
  const cycle = fill(template.replace(/^[(（]\s*/, '').replace(/\s*[)）]$/, ''), { 1: lead[1] ?? '' })
  return cycle + translatePhrases(text.slice(lead[0].length), locale)
}

/** One piece of the folded tool line: plain text, or a count drawn bold. */
export type Segment = { text: string; bold: boolean }

/** How many searches, files read and directories listed a folded line counts. */
export type Tally = { searches: number; reads: number; lists: number }

// Claude Code 2.1.294's own sorting of shell commands for the folded line.
const SEARCH_COMMANDS: ReadonlySet<string> = new Set(['find', 'grep', 'rg', 'ag', 'ack', 'locate', 'which', 'whereis'])
const READ_COMMANDS: ReadonlySet<string> = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'wc', 'stat', 'file', 'strings', 'jq', 'awk', 'cut', 'sort', 'uniq', 'tr',
])
const LIST_COMMANDS: ReadonlySet<string> = new Set(['ls', 'tree', 'du'])
const NEUTRAL_COMMANDS: ReadonlySet<string> = new Set(['echo', 'printf', 'true', 'false', ':'])

/**
 * The commands of a plain shell pipeline or list (`grep -n x f | head`), or
 * `undefined` for anything a simple split could get wrong: substitutions,
 * subshells, heredocs, several lines.
 */
function shellCommands(command: string): string[] | undefined {
  if (/[\n`{}()]|\$\(|<</.test(command)) return undefined
  const parts: string[] = []
  let current = ''
  let quote: string | undefined
  for (let i = 0; i < command.length; i++) {
    const c = command.charAt(i)
    if (quote !== undefined) {
      current += c
      if (c === '\\' && quote === '"') current += command.charAt(++i)
      else if (c === quote) quote = undefined
    } else if (c === "'" || c === '"') {
      quote = c
      current += c
    } else if (c === '\\') {
      current += c + command.charAt(++i)
    } else if (c === '|' || c === ';' || (c === '&' && !/[<>]/.test(command.charAt(i - 1)) && command.charAt(i + 1) !== '>')) {
      if (command.charAt(i + 1) === c) i++
      parts.push(current)
      current = ''
    } else {
      current += c
    }
  }
  if (quote !== undefined) return undefined
  parts.push(current)
  return parts.map(p => p.trim()).filter(p => p !== '')
}

/**
 * What one call of a folded run adds to its line, as Claude Code counts it,
 * or `undefined` when Tolk can't be sure. A file read counts once per path,
 * so it comes back as `read:<path>`. Memory files (anything under `.claude/`)
 * Claude Code counts as memories, so those are left to it too.
 */
export function foldedAs(tool: string, input: unknown): 'search' | 'list' | `read:${string}` | undefined {
  const field = (name: string): string | undefined => {
    const value = typeof input === 'object' && input !== null ? (input as Record<string, unknown>)[name] : undefined
    return typeof value === 'string' ? value : undefined
  }
  const touchesMemory = (text: string | undefined) => text !== undefined && /(^|[\\/])\.claude[\\/]/.test(text)
  if (tool === 'Read') {
    const path = field('file_path')
    return path === undefined || touchesMemory(path) ? undefined : `read:${path}`
  }
  if (tool === 'Grep' || tool === 'Glob') return touchesMemory(field('path')) ? undefined : 'search'
  const command = tool === 'Bash' ? field('command') : undefined
  if (command === undefined || touchesMemory(command)) return undefined
  const words = shellCommands(command)?.map(part => part.split(/\s+/)[0] ?? '')
  if (words === undefined) return undefined
  let search = false
  let list = false
  let counted = false
  for (const word of words) {
    if (NEUTRAL_COMMANDS.has(word)) continue
    if (!SEARCH_COMMANDS.has(word) && !READ_COMMANDS.has(word) && !LIST_COMMANDS.has(word)) return undefined
    counted = true
    search ||= SEARCH_COMMANDS.has(word)
    list ||= LIST_COMMANDS.has(word)
  }
  // A shell read counts by paths Claude Code finds in the command; Tolk can't.
  return !counted ? undefined : list ? 'list' : search ? 'search' : undefined
}

/** Adds up a folded run, or `undefined` when any call can't be counted. */
export function tallyCalls(calls: ReadonlyArray<{ tool: string; input: unknown }>): Tally | undefined {
  let searches = 0
  let lists = 0
  const paths = new Set<string>()
  for (const call of calls) {
    const kind = foldedAs(call.tool, call.input)
    if (kind === undefined) return undefined
    if (kind === 'search') searches++
    else if (kind === 'list') lists++
    else paths.add(kind)
  }
  return { searches, reads: paths.size, lists }
}

/** The folded line for a run, in pieces: searches, then reads, then listings. */
export function groupLine({ searches, reads, lists }: Tally, locale: Locale): Segment[] {
  const { group } = locale
  const parts: Array<readonly [string, number]> = []
  if (searches > 0) parts.push([searches === 1 ? group.searched.one : group.searched.other, searches])
  if (reads > 0) parts.push([reads === 1 ? group.read.one : group.read.other, reads])
  if (lists > 0) parts.push([lists === 1 ? group.listed.one : group.listed.other, lists])
  const out: Segment[] = []
  parts.forEach(([template, n], i) => {
    const [before = '', after = ''] = template.split('{n}')
    const lead = i === 0 ? before.charAt(0).toLocaleUpperCase(locale.code) + before.slice(1) : before
    if (i > 0) out.push({ text: group.separator, bold: false })
    out.push({ text: lead, bold: false }, { text: String(n), bold: true }, { text: after, bold: false })
  })
  return out.filter(s => s.text !== '')
}

/** A small, stable string hash (FNV-1a), so a pick never flickers. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Picks one entry of `list` for `seed`, the same one every time. */
export function pick(list: readonly string[], seed: string): string | undefined {
  if (list.length === 0) return undefined
  return list[hash(seed) % list.length]
}

/** `64000` → `1m 4s` in the locale's units. */
export function formatDuration(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const { duration } = locale
  const parts: string[] = []
  if (h > 0) parts.push(`${h}${duration.h}`)
  if (m > 0) parts.push(`${m}${duration.m}`)
  if (s > 0 || parts.length === 0) parts.push(`${s}${duration.s}`)
  return parts.join(duration.separator)
}

const NAMES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['en', ['en', 'english', 'inglés', 'anglais', 'englisch', 'inglese']],
  ['de', ['de', 'german', 'deutsch', 'alemán', 'allemand', 'tedesco', 'swiss german', 'schweizerdeutsch']],
  ['es', ['es', 'spanish', 'español', 'espanol', 'castellano', 'castilian', 'spagnolo']],
  ['fr', ['fr', 'french', 'français', 'francais', 'francese']],
  ['it', ['it', 'italian', 'italiano', 'italienisch', 'italien']],
  ['pt-BR', ['pt', 'pt-br', 'pt_br', 'portuguese', 'português', 'portugues', 'brazilian portuguese', 'português brasileiro']],
  ['ja', ['ja', 'jp', 'japanese', '日本語', 'nihongo']],
  ['zh-CN', ['zh', 'zh-cn', 'zh_cn', 'zh-hans', 'zh-sg', 'chinese', 'simplified chinese', '中文', '简体中文', '汉语', '普通话']],
  ['vi', ['vi', 'vietnamese', 'tiếng việt', 'tieng viet', 'việt']],
]

/**
 * Turns whatever a person or a system wrote into one of `codes`, or
 * `undefined`: `de_CH.UTF-8`, `pt_BR`, `German`, `日本語`, `zh-Hans`.
 * Traditional Chinese (`zh_TW`, `zh-Hant`) is not Simplified Chinese and
 * resolves to nothing until someone contributes it.
 */
export function resolveCode(raw: string | undefined, codes: readonly string[]): string | undefined {
  if (raw === undefined) return undefined
  const text = raw.trim().toLowerCase().replace(/\.[\w-]+$/, '').replace(/@.*$/, '')
  if (text === '' || text === 'c' || text === 'posix') return undefined
  if (/^zh[-_](tw|hk|mo|hant)/.test(text)) return undefined
  const exact = codes.find(code => code.toLowerCase() === text.replace('_', '-'))
  if (exact !== undefined) return exact
  for (const [code, names] of NAMES) {
    if (!codes.includes(code)) continue
    if (names.includes(text)) return code
    const lang = text.split(/[-_\s]/)[0]
    if (lang !== undefined && names.includes(lang)) return code
  }
  return undefined
}
