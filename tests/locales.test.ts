// Checks every language file against the English catalog, so a typo in a
// key, a missing translation or a broken placeholder fails CI instead of
// quietly showing English.

import { describe, expect, test } from 'claude-code/testing'

import { CODES, LOCALES, SOURCE } from '../hooks/locales/index'
import { PHRASES, foldedAs, formatDuration, groupLine, resolveCode, tallyCalls, translateHint, translatePhrases } from '../hooks/translate'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()

describe('language files', () => {
  for (const code of CODES) {
    const locale = LOCALES[code]
    if (locale === undefined || code === 'en') continue

    test(`${code}: knows only real commands and settings`, async () => {
      expect(locale.code).toBe(code)
      // Keys like `cc-plugin-agents-md.instructionFiles` hold a dot, so no property paths.
      for (const name of Object.keys(locale.commands)) expect(Object.keys(SOURCE.commands)).toContain(name)
      for (const key of Object.keys(locale.config)) expect(Object.keys(SOURCE.config)).toContain(key)
    })

    test(`${code}: translates every command and setting`, async () => {
      expect(Object.keys(locale.commands).sort()).toEqual(Object.keys(SOURCE.commands).sort())
      expect(Object.keys(locale.config).sort()).toEqual(Object.keys(SOURCE.config).sort())
      expect(Object.keys(locale.phrases).sort()).toEqual(PHRASES.map(([id]) => id).sort())
    })

    test(`${code}: keeps every placeholder`, async () => {
      for (const [key, english] of Object.entries(SOURCE.ui)) {
        const translated = locale.ui[key as keyof typeof locale.ui]
        expect(placeholders(translated)).toEqual(placeholders(english))
      }
      expect(placeholders(locale.turn.template)).toEqual(['duration', 'word'])
      for (const forms of [locale.group.searched, locale.group.read]) {
        expect(placeholders(forms.one)).toEqual(['n'])
        expect(placeholders(forms.other)).toEqual(['n'])
      }
      for (const [id, pattern] of PHRASES) {
        const template = locale.phrases[id] ?? ''
        // A phrase whose pattern captures a key binding must keep it.
        const groups = (new RegExp(`${pattern.source}|`).exec('')?.length ?? 1) - 1
        if (groups > 0) expect(template).toContain('{1}')
      }
    })

    test(`${code}: has words for the spinner and the turn line`, async () => {
      expect(locale.spinner.length).toBeGreaterThanOrEqual(20)
      expect(locale.turn.words.length).toBeGreaterThanOrEqual(4)
    })
  }
})

describe('helpers', () => {
  test('resolves what people and systems write', async () => {
    expect(resolveCode('de_CH.UTF-8', CODES)).toBe('de')
    expect(resolveCode('German', CODES)).toBe('de')
    expect(resolveCode('pt_BR.UTF-8', CODES)).toBe('pt-BR')
    expect(resolveCode('português', CODES)).toBe('pt-BR')
    expect(resolveCode('日本語', CODES)).toBe('ja')
    expect(resolveCode('zh-Hans', CODES)).toBe('zh-CN')
    expect(resolveCode('it_IT.UTF-8', CODES)).toBe('it')
    expect(resolveCode('Italiano', CODES)).toBe('it')
    expect(resolveCode('vi_VN.UTF-8', CODES)).toBe('vi')
    expect(resolveCode('Tiếng Việt', CODES)).toBe('vi')
    expect(resolveCode('zh_TW.UTF-8', CODES)).toBe(undefined)
    expect(resolveCode('C.UTF-8', CODES)).toBe(undefined)
    expect(resolveCode('', CODES)).toBe(undefined)
  })

  test('formats durations in the locale’s units', async () => {
    const de = LOCALES.de
    const ja = LOCALES.ja
    if (de === undefined || ja === undefined) throw new Error('missing locale')
    expect(formatDuration(3_000, de)).toBe('3 s')
    expect(formatDuration(64_000, de)).toBe('1 Min. 4 s')
    expect(formatDuration(3_725_000, ja)).toBe('1時間2分5秒')
    expect(formatDuration(0, SOURCE)).toBe('0s')
  })

  test('keeps the user’s own key bindings in phrases', async () => {
    const de = LOCALES.de
    if (de === undefined) throw new Error('missing locale')
    expect(translatePhrases('(ctrl+b to run in background)', de)).toBe('(ctrl+b für Hintergrund)')
    expect(translatePhrases('accept edits on (shift+tab to cycle)', de)).toBe('Änderungen annehmen an (shift+tab zum Wechseln)')
    expect(translatePhrases('⏸ manual mode on · ? for shortcuts · ← for agents', de)).toBe('⏸ Manuellmodus an · ? für Tastenkürzel · ← für Agenten')
    expect(translatePhrases('nothing to see here', de)).toBe('nothing to see here')
  })

  test('builds the folded tool line with bold counts', async () => {
    const es = LOCALES.es
    const fr = LOCALES.fr
    if (es === undefined || fr === undefined) throw new Error('missing locale')
    const text = (segments: ReturnType<typeof groupLine>) => segments.map(s => s.text).join('')
    expect(text(groupLine({ searches: 3, reads: 1, lists: 0 }, es))).toBe('Se buscaron 3 patrones, se leyó 1 archivo')
    expect(text(groupLine({ searches: 0, reads: 2, lists: 1 }, fr))).toBe('2 fichiers lus, 1 dossier listé')
    expect(groupLine({ searches: 1, reads: 0, lists: 0 }, SOURCE).filter(s => s.bold).map(s => s.text)).toEqual(['1'])
  })

  test('counts a folded run the way Claude Code does, or not at all', async () => {
    const bash = (command: string) => foldedAs('Bash', { command })
    expect(bash('grep -rn "Locale" hooks/ | head -20')).toBe('search')
    expect(bash("grep -rn 'Locale' hooks/locales/index.ts")).toBe('search')
    expect(tallyCalls([{ tool: 'Bash', input: { command: "grep -rn 'Locale' x" } }, { tool: 'Bash', input: { command: 'ls hooks' } }])).toEqual({
      searches: 1,
      reads: 0,
      lists: 1,
    })
    expect(bash("rg 'a|b' src 2>&1; echo done")).toBe('search')
    expect(bash('ls -la && find . -name "*.ts"')).toBe('list')
    // A shell read counts by paths Tolk can't see; the rest is not a search.
    expect(bash('cat README.md')).toBe(undefined)
    expect(bash('cd hooks && grep x .')).toBe(undefined)
    expect(bash('grep $(cat list) src')).toBe(undefined)
    expect(bash('grep x ~/.claude/projects/p/memory/a.md')).toBe(undefined)
    expect(foldedAs('Read', { file_path: '/repo/a.ts' })).toBe('read:/repo/a.ts')
    const read = (file_path: string) => ({ tool: 'Read', input: { file_path } })
    expect(tallyCalls([read('/a'), read('/a'), read('/b'), { tool: 'Glob', input: { pattern: '*' } }])).toEqual({
      searches: 1,
      reads: 2,
      lists: 0,
    })
    expect(tallyCalls([read('/a'), { tool: 'Edit', input: {} }])).toBe(undefined)
  })

  test('drops the parentheses of a cycle hint that opens the line', async () => {
    const de = LOCALES.de
    if (de === undefined) throw new Error('missing locale')
    expect(translateHint('(shift+tab to cycle) · ← for agents', de)).toBe('shift+tab zum Wechseln · ← für Agenten')
    expect(translateHint('? for shortcuts', de)).toBe('? für Tastenkürzel')
  })

  test('translates the /sandbox status line piece by piece', async () => {
    const it = LOCALES.it
    if (it === undefined) throw new Error('missing locale')
    expect(translatePhrases('◯ sandbox disabled (⏎ to configure)', it)).toBe('◯ sandbox disattivata (⏎ per configurare)')
    expect(translatePhrases('✓ sandbox enabled (auto-allow), fallback allowed (managed) (⏎ to configure)', it)).toBe(
      '✓ sandbox attiva (consenso automatico), fallback consentito (gestita) (⏎ per configurare)',
    )
  })
})

describe('situational wording', () => {
  for (const code of CODES) {
    const locale = LOCALES[code]
    if (locale === undefined || code === 'en') continue
    test(`${code}: translates every alternative wording`, async () => {
      expect(Object.keys(locale.byText ?? {}).sort()).toEqual(Object.keys(SOURCE.byText ?? {}).sort())
    })
  }
})
