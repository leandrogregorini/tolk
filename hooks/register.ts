// Tolk: Claude Code's interface in your language.
//
// It changes only what Claude Code draws and lists, never what the model
// reads: command descriptions in the typeahead, /config labels, the
// spinner, the line that closes a turn, the hint line under the prompt,
// the folded line for a run of searches and reads, footer mode labels and
// the notices under the logo. Anything it has no translation for stays
// exactly as Claude Code drew it.

import type { EngineInterface, Register } from 'claude-code'

import { CODES, LOCALES, SOURCE } from './locales/index'
import type { Locale } from './locales/types'
import { fill, formatDuration, groupLine, pick, resolveCode, tallyCalls, translateHint, translatePhrases } from './translate'

const PLUGIN = 'tolk'
const CONFIG_KEY = 'tolk.language'
const LANGUAGE_PANE = 'tolk-language'
const SPINNER_WORDS: ReadonlySet<string> = new Set(SOURCE.spinner)
const TURN_WORDS: ReadonlySet<string> = new Set(SOURCE.turn.words)

/**
 * Built-in commands Tolk leaves in English on purpose: internal ones,
 * and skill guides whose description is written for Claude to decide when
 * to load them rather than for you to read.
 */
const LEFT_IN_ENGLISH: ReadonlySet<string> = new Set([
  '__remote-workflow', 'workflow-launch-exec', 'heapdump', 'agents',
  'artifact-capabilities', 'artifact-design', 'artifact-diagramming', 'claude-api', 'cowork-plugin',
  'dataviz', 'design-sync', 'explain-usage', 'keybindings-help', 'plugin-authoring', 'run',
  'run-skill-generator', 'setup-claude', 'update-config',
])

/**
 * Built-in commands whose description is a live status line
 * (`◯ sandbox disabled (⏎ to configure)`), translated phrase by phrase.
 */
const STATUS_LINES: ReadonlySet<string> = new Set(['sandbox'])

/** A command or /config row Claude Code itself provides, or a plugin it ships with. */
function isClaudeCodes(provider: { readonly plugin: string; readonly tier: string }): boolean {
  return provider.plugin === 'engine' || provider.tier === 'core' || provider.tier === 'builtin'
}

/** Whether the locale has something to draw for command `name`. */
function translatesCommand(loc: Locale, name: string): boolean {
  return STATUS_LINES.has(name) || loc.commands[name] !== undefined
}

/**
 * `translated` in place of `base`, carrying over the live detail Claude
 * Code appends in parentheses (`Toggle fast mode (Opus 5.5)`).
 */
function withDetail(translated: string, base: string | undefined, english: string): string {
  if (base !== undefined && english !== base && english.startsWith(`${base} (`)) {
    return translated + english.slice(base.length)
  }
  return translated
}

/** Whether `text` is one of the English descriptions the catalog knows for `name`. */
function isKnownEnglish(name: string, text: string): boolean {
  const base = SOURCE.commands[name]
  if (SOURCE.byText?.[text] !== undefined) return true
  return base !== undefined && (text === base || text.startsWith(`${base} (`))
}

/**
 * The translation of one command's description, or `undefined`. A wording
 * that depends on the situation is looked up by its text; a live detail
 * Claude Code appends in parentheses (`Toggle fast mode (Opus 5.5)`) is
 * carried over.
 */
function describeCommand(loc: Locale, name: string, english: string): string | undefined {
  const exact = loc.byText?.[english]
  if (exact !== undefined) return exact
  if (STATUS_LINES.has(name)) {
    const line = translatePhrases(english, loc)
    return line === english ? undefined : line
  }
  const translated = loc.commands[name]
  return translated === undefined ? undefined : withDetail(translated, SOURCE.commands[name], english)
}

/**
 * Writes `code` as the interface language and returns the confirmation line.
 * `apply` stores the locale the rest of the session draws with.
 */
async function choose(
  $: EngineInterface,
  code: string,
  apply: (next: Locale | undefined) => void,
): Promise<string> {
  const set = await $.config.set({ key: CONFIG_KEY, value: code })
  if (set.deny !== undefined) return set.deny
  const next = LOCALES[code]
  apply(next)
  refresh($)
  return fill((next ?? SOURCE).ui.switched, { name: next?.name ?? code })
}

/** Redraws everything Tolk touches, after the language changed. */
function refresh($: EngineInterface): void {
  $.ui.invalidate('command.describe')
  $.ui.invalidate('config.describe')
  $.ui.invalidate('ui.render')
}

/** Reads one variable; a variable that can't be read is just not a hint. */
async function readEnv($: EngineInterface, name: 'LC_ALL' | 'LC_MESSAGES' | 'LANGUAGE' | 'LANG'): Promise<string | undefined> {
  try {
    // `$.env.get` takes its name as a literal, so each one is spelled out.
    const value =
      name === 'LC_ALL'
        ? await $.env.get('LC_ALL')
        : name === 'LC_MESSAGES'
          ? await $.env.get('LC_MESSAGES')
          : name === 'LANGUAGE'
            ? await $.env.get('LANGUAGE')
            : await $.env.get('LANG')
    // LANGUAGE is a list (`de:en`): its first entry is the preference.
    return value?.split(':')[0]
  } catch {
    return undefined
  }
}

/**
 * The language `auto` resolves to: Claude Code's own `language` setting
 * first (the one replies follow), then the system locale.
 */
async function detectCode($: EngineInterface): Promise<string | undefined> {
  const candidates: Array<string | undefined> = []
  try {
    const row = (await $.config.list()).find(r => r.key === 'language')
    candidates.push(typeof row?.value === 'string' ? row.value : undefined)
  } catch {
    // No /config here (a headless run): fall through to the environment.
  }
  candidates.push(await readEnv($, 'LC_ALL'))
  candidates.push(await readEnv($, 'LC_MESSAGES'))
  candidates.push(await readEnv($, 'LANGUAGE'))
  candidates.push(await readEnv($, 'LANG'))
  for (const raw of candidates) {
    const code = resolveCode(raw, CODES)
    if (code !== undefined) return code
  }
  return undefined
}

export const register: Register = (on, options) => {
  const setting = typeof options.language === 'string' ? options.language : 'auto'

  // The language in force; `undefined` (or English) means draw as Claude Code does.
  let locale: Locale | undefined = setting === 'auto' ? undefined : LOCALES[setting]
  // English command descriptions as Claude Code declared them, for `/tolk missing`.
  const english = new Map<string, string>()

  const active = (): Locale | undefined =>
    locale !== undefined && locale.code !== 'en' ? locale : undefined
  const ui = () => (locale ?? SOURCE).ui

  const languageList = (): string => {
    const rows = CODES.map(code => {
      const one = LOCALES[code]
      const mark = (locale?.code ?? 'en') === code ? '●' : '○'
      return `${mark} \`${code}\` ${one?.name ?? code}`
    })
    return [ui().available, ...rows].join('\n')
  }

  const apply = (next: Locale | undefined) => {
    locale = next
  }

  on('session.start', async ($, e, next) => {
    if (setting === 'auto') {
      const code = await detectCode($)
      if (code !== undefined) locale = LOCALES[code]
    }
    await $.command.register({
      name: 'tolk',
      description: ui().commandDescription,
      argumentHint: '[list | set <code> | missing]',
    })
    refresh($)
    return next(e)
  })

  // ── Lists: the command typeahead and /config ──────────────────────────

  on('command.describe', async ($, e, next) => {
    if (isClaudeCodes(e.provider)) english.set(e.command, e.description)
    const described = await next(e)
    const loc = active()
    if (loc === undefined) return described
    if (e.command === PLUGIN) return { ...described, description: loc.ui.commandDescription }
    // Leave alone what another plugin already rewrote, and what isn't Claude Code's.
    if (!isClaudeCodes(e.provider) || described.description !== e.description) return described
    if (LEFT_IN_ENGLISH.has(e.command)) return described
    const translated = describeCommand(loc, e.command, e.description)
    return translated === undefined ? described : { ...described, description: translated }
  })

  on('config.describe', async ($, e, next) => {
    const described = await next(e)
    const loc = active()
    if (loc === undefined) return described
    if (e.key === CONFIG_KEY) return { ...described, label: loc.ui.configLabel }
    if (!isClaudeCodes(e.provider) || described.label !== e.label) return described
    const translated = loc.config[e.key]
    if (translated === undefined) return described
    return { ...described, label: withDetail(translated, SOURCE.config[e.key], e.label) }
  })

  // ── What Claude Code draws ────────────────────────────────────────────

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined) return next(e)
    const { word, message } = e.props
    // Only Claude Code's own words: a custom `spinnerVerbs` setting stays.
    const localWord = SPINNER_WORDS.has(word) ? (pick(loc.spinner, word) ?? word) : word
    const localMessage = message === null ? null : translatePhrases(message, loc)
    if (localWord === word && localMessage === message) return next(e)
    return next({ ...e, props: { ...e.props, word: localWord, message: localMessage } })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined || !TURN_WORDS.has(e.props.word)) return next(e)
    const { Text } = $.ui.resolve(e)
    const word = pick(loc.turn.words, e.props.word + e.requestId) ?? e.props.word
    const line = fill(loc.turn.template, { word, duration: formatDuration(e.props.durationMs, loc) })
    return Text({ dimColor: true, children: [`✻ ${line}`] })
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined) return next(e)
    const hint = translateHint(e.props.hint, loc)
    // A rewritten hint replaces the whole line, so only do it when it pays.
    return hint === e.props.hint ? next(e) : next({ ...e, props: { ...e.props, hint } })
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined || e.surface !== 'terminal' || e.props.isActive || e.props.isExpanded) return next(e)
    const { calls } = e.props
    // Only a finished run of plain searches, reads and listings: any other
    // call adds what the props don't carry (diffs, commits, memories).
    const clean = calls.length > 0 && calls.every(c => !c.isRunning && !c.isErrored && !c.isInterrupted)
    const tally = clean ? tallyCalls(calls) : undefined
    if (tally === undefined) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const line = groupLine(tally, loc).map(s => (s.bold ? Text({ bold: true, children: [s.text] }) : s.text))
    // ctrl+o is Claude Code's default; a mod cannot read a rebound key.
    const expand = fill(loc.phrases.toExpand ?? '(ctrl+o to expand)', { 1: 'ctrl+o' })
    return Box({
      flexDirection: 'row',
      children: [Box({ minWidth: 2 }), Text({ color: 'inactive', children: [...line, ` ${expand}`] })],
    })
  })

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined) return next(e)
    const hint = translatePhrases(e.props.hint, loc)
    return hint === e.props.hint ? next(e) : next({ ...e, props: { ...e.props, hint } })
  })

  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined) return next(e)
    const text = translatePhrases(e.props.text, loc)
    return text === e.props.text ? next(e) : next({ ...e, props: { ...e.props, text } })
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const loc = active()
    if (loc === undefined || e.props.modes.length === 0) return next(e)
    const modes = e.props.modes.map(mode => loc.modes[mode] ?? mode)
    return modes.every((mode, i) => mode === e.props.modes[i])
      ? next(e)
      : next({ ...e, props: { ...e.props, modes } })
  })

  // ── /tolk ─────────────────────────────────────────────────────────

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== LANGUAGE_PANE) return next(e)
    const current = locale?.code ?? 'en'
    const { Box, Button } = $.ui.resolve(e)
    const picked = (code: string) => {
      void choose($, code, apply).then(async text => {
        if (locale?.code === code) await $.ui.close({ id: LANGUAGE_PANE }).catch(() => undefined)
        $.ui.log(text)
      })
    }
    return Box({
      flexDirection: 'column',
      children: CODES.map(code =>
        Button({
          key: code,
          plain: true,
          label: `${code === current ? '●' : '○'} ${code}  ${LOCALES[code]?.name ?? code}`,
          ...(code === current ? { autoFocus: true as const } : {}),
          onPress: () => picked(code),
        }),
      ),
    })
  })

  on('command.run', { command: 'tolk' }, async ($, e) => {
    const [verb = '', arg = ''] = e.args.trim().split(/\s+/)
    const strings = ui()
    const codes = CODES.join(', ')

    if (verb === 'list') return { text: languageList() }

    if (verb === 'set') {
      if (arg === '') {
        const opened = await $.ui.open({
          id: LANGUAGE_PANE,
          title: strings.available.replace(/[:：]\s*$/, '').trim(),
          focus: true,
          closeOnEscape: true,
          rows: CODES.length,
        })
        // A narrow terminal or a headless run cannot show the pane.
        return opened.isPlaced ? {} : { text: languageList() }
      }
      const code = resolveCode(arg, CODES)
      if (code === undefined) return { text: fill(strings.unknown, { code: arg, codes }) }
      return { text: await choose($, code, apply) }
    }

    const commands = (await $.command.list()).filter(
      c => c.source === 'builtin' && !LEFT_IN_ENGLISH.has(c.name),
    )
    const loc = locale ?? SOURCE

    if (verb === 'missing') {
      const untranslated = loc.code === 'en' ? [] : commands.filter(c => !translatesCommand(loc, c.name))
      const drifted = [...english].filter(
        ([name, text]) => SOURCE.commands[name] !== undefined && !isKnownEnglish(name, text),
      )
      if (untranslated.length === 0 && drifted.length === 0) return { text: strings.missingNone }
      const lines: string[] = []
      if (untranslated.length > 0) {
        lines.push(strings.missingHeader)
        for (const c of untranslated) lines.push(`- \`/${c.name}\`: ${english.get(c.name) ?? c.description}`)
      }
      if (drifted.length > 0) {
        if (lines.length > 0) lines.push('')
        lines.push(strings.driftHeader)
        for (const [name, text] of drifted) lines.push(`- \`/${name}\`: ${text}`)
      }
      return { text: lines.join('\n') }
    }

    if (verb !== '') return { text: fill(strings.usage, { codes }) }

    const settings = (await $.config.list()).filter(row => isClaudeCodes(row.provider))
    const status = fill(strings.status, { name: loc.name, code: loc.code })
    if (loc.code === 'en') return { text: `${status}\n${fill(strings.usage, { codes })}` }
    const coverage = fill(strings.coverage, {
      commands: commands.filter(c => translatesCommand(loc, c.name)).length,
      commandsTotal: commands.length,
      settings: settings.filter(row => loc.config[row.key] !== undefined).length,
      settingsTotal: settings.length,
    })
    return { text: `${status}\n${coverage}\n${fill(strings.usage, { codes })}` }
  })
}
