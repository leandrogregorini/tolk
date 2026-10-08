import { describe, expect, mock, test } from 'claude-code/testing'

const ENGINE = { plugin: 'engine', tier: 'core' } as const
const SOMEONE = { plugin: 'someone-else', tier: 'user' } as const
// `/tolk …` as typed at the prompt of an 80-column terminal.
const RUN = {
  command: 'tolk',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 80 },
} as const

describe('command list', () => {
  test('translates Claude Code’s own command descriptions', { options: { language: 'de' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const compact = await $.command.describe({
      command: 'compact',
      description: 'Free up context by summarizing the conversation so far',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(compact.description).toBe('Kontext freigeben, indem die bisherige Unterhaltung zusammengefasst wird')
  })

  test('leaves other plugins’ commands alone', { options: { language: 'de' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const theirs = await $.command.describe({
      command: 'compact',
      description: 'Their own compact',
      isHidden: false,
      immediate: false,
      provider: SOMEONE,
    })
    expect(theirs.description).toBe('Their own compact')
  })

  test('leaves a description another hook already rewrote', { options: { language: 'de' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: 'rewritten below', isHidden: e.isHidden }))
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('rewritten below')
  })

  test('changes nothing in English', { options: { language: 'en' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('Show help and available commands')
  })
})

describe('/config', () => {
  test('translates row labels', { options: { language: 'ja' } }, async ($, on) => {
    on('config.describe', ($, e) => ({ label: e.label, isHidden: e.isHidden }))
    const row = await $.config.describe({ key: 'theme', label: 'Theme', isHidden: false, provider: ENGINE })
    expect(row.label).toBe('テーマ')
  })

  test('labels its own row', { options: { language: 'es' } }, async ($, on) => {
    on('config.describe', ($, e) => ({ label: e.label, isHidden: e.isHidden }))
    const row = await $.config.describe({
      key: 'tolk.language',
      label: 'Interface language',
      isHidden: false,
      provider: { plugin: 'tolk', tier: 'user' },
    })
    expect(row.label).toBe('Idioma de la interfaz (Tolk)')
  })
})

describe('what Claude Code draws', () => {
  test('swaps Claude Code’s spinner word, keeps a custom one', { options: { language: 'fr' } }, async ($, on) => {
    const words: string[] = []
    on('ui.render', { component: 'Spinner' }, ($, e) => {
      words.push(e.props.word)
      const { Text } = $.ui.resolve(e)
      return Text({ children: [e.props.word] })
    })
    for (const surface of ['terminal', 'desktop'] as const) {
      const ours = await $.ui.mount({
        plugin: 'tolk',
        surface,
        component: 'Spinner',
        props: { word: 'Baking', message: null, suffix: '…', mode: 'thinking' },
      })
      await ours.unmount()
      const custom = await $.ui.mount({
        plugin: 'tolk',
        surface,
        component: 'Spinner',
        props: { word: 'Yak-shaving', message: null, suffix: '…', mode: 'thinking' },
      })
      await custom.unmount()
    }
    expect(words[0]).not.toBe('Baking')
    expect(words[1]).toBe('Yak-shaving')
    // The pick is stable, so the spinner never flickers between redraws.
    expect(words[2]).toBe(words[0])
  })

  test('draws the closing line of a turn in the language', { options: { language: 'de' } }, async $ => {
    const line = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'TurnDuration',
      props: { word: 'Baked', durationMs: 64_000 },
    })
    const text = await line.find({ type: 'Text', text: /1 Min\. 4 s/ })
    expect(text).toBeDefined()
    await line.unmount()
  })

  test('translates the hint line and keeps the key binding', { options: { language: 'de' } }, async ($, on) => {
    const hints: string[] = []
    on('ui.render', { component: 'PromptHint' }, ($, e) => {
      hints.push(e.props.hint)
      const { Text } = $.ui.resolve(e)
      return Text({ children: [e.props.hint] })
    })
    const shortcuts = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'PromptHint',
      props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
    })
    await shortcuts.unmount()
    const exit = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'PromptHint',
      props: { isDraft: false, isWorking: false, hint: 'Press Ctrl-C again to exit' },
    })
    await exit.unmount()
    expect(hints).toEqual(['? für Tastenkürzel', 'Ctrl-C erneut drücken zum Beenden'])
  })

  test('lets a cycle hint after the mode label stand on its own', { options: { language: 'ja' } }, async ($, on) => {
    const hints: string[] = []
    on('ui.render', { component: 'PromptHint' }, ($, e) => {
      hints.push(e.props.hint)
      const { Text } = $.ui.resolve(e)
      return Text({ children: [e.props.hint] })
    })
    const footer = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'PromptHint',
      props: { isDraft: false, isWorking: false, hint: '(shift+tab to cycle) · ← for agents' },
    })
    await footer.unmount()
    // Claude Code puts ` · ` between its mode label and a rewritten hint.
    expect(hints).toEqual(['shift+tab で切り替え · ← でエージェント'])
  })

  test('folds a finished run of searches and reads into one line', { options: { language: 'de' } }, async $ => {
    const call = (tool: string, input: object) => ({ tool, input, isRunning: false, isErrored: false, isInterrupted: false })
    const group = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'ToolGroup',
      props: {
        calls: [call('Bash', { command: 'grep -rn Locale hooks/' }), call('Glob', { pattern: '*.ts' }), call('Read', { file_path: '/repo/LICENSE' })],
        isActive: false,
        isExpanded: false,
      },
    })
    expect(await group.find({ type: 'Text', text: /Nach 2 Mustern gesucht, 1 Datei gelesen \(ctrl\+o zum Aufklappen\)/ })).toBeDefined()
    await group.unmount()
  })

  test('leaves a run with other tools, or a live one, to Claude Code', { options: { language: 'de' } }, async ($, on) => {
    const drawn: string[] = []
    on('ui.render', { component: 'ToolGroup' }, ($, e) => {
      drawn.push(e.props.calls.map(c => c.tool).join(','))
      const { Text } = $.ui.resolve(e)
      return Text({ children: ['engine'] })
    })
    const read = { tool: 'Read', input: { file_path: '/repo/a.ts' }, isRunning: false, isErrored: false, isInterrupted: false }
    const edit = { ...read, tool: 'Edit' }
    for (const props of [
      { calls: [read, edit], isActive: false, isExpanded: false },
      { calls: [{ ...read, isRunning: true }], isActive: true, isExpanded: false },
    ]) {
      const group = await $.ui.mount({ plugin: 'tolk', surface: 'terminal', component: 'ToolGroup', props })
      await group.unmount()
    }
    expect(drawn).toEqual(['Read,Edit', 'Read'])
  })

  test('translates footer mode labels it knows', { options: { language: 'pt-BR' } }, async ($, on) => {
    let modes: readonly string[] = []
    on('ui.render', { component: 'SessionMode' }, ($, e) => {
      modes = e.props.modes
      const { Text } = $.ui.resolve(e)
      return Text({ children: [modes.join(' & ')] })
    })
    const footer = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'SessionMode',
      props: { modes: ['focus', 'something new'] },
    })
    await footer.unmount()
    expect(modes).toEqual(['foco', 'something new'])
  })
})

describe('language detection', () => {
  test('follows Claude Code’s own language setting first', { options: { language: 'auto' } }, async ($, on) => {
    mock.env(on, { LANG: 'ja_JP.UTF-8' })
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('config.list', () => ({
      value: [
        { key: 'language', label: 'Language', kind: 'text', value: 'Deutsch', provider: ENGINE, isLocked: false },
      ],
    }))
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('Hilfe und verfügbare Befehle anzeigen')
  })

  test('falls back to the system locale', { options: { language: 'auto' } }, async ($, on) => {
    mock.env(on, { LANG: 'zh_CN.UTF-8' })
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('config.list', () => ({ value: [] }))
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('显示帮助和可用命令')
  })

  test('stays in English for a locale it doesn’t have', { options: { language: 'auto' } }, async ($, on) => {
    mock.env(on, { LANG: 'zh_TW.UTF-8' })
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('config.list', () => ({ value: [] }))
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('Show help and available commands')
  })
})

describe('/tolk', () => {
  test('switches the language', { options: { language: 'en' } }, async ($, on) => {
    const writes: unknown[] = []
    on('config.set', ($, e) => {
      writes.push([e.key, e.value])
      return { value: e.value }
    })
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const run = await $.command.run({ ...RUN, args: 'set Japanese' })
    expect(writes).toEqual([['tolk.language', 'ja']])
    expect(run.text).toBe('日本語 に切り替えました。まもなく表示が更新されます。')
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('ヘルプと使えるコマンドを表示')
  })

  test('refuses a language it doesn’t have', { options: { language: 'en' } }, async $ => {
    const run = await $.command.run({ ...RUN, args: 'set klingon' })
    expect(run.text).toContain('Unknown language "klingon"')
  })

  test('lists the languages', { options: { language: 'de' } }, async $ => {
    const run = await $.command.run({ ...RUN, args: 'list' })
    expect(run.text).toContain('● `de` Deutsch')
    expect(run.text).toContain('○ `zh-CN` 简体中文')
  })

  test('opens a language list when set has no code', { options: { language: 'en' } }, async ($, on) => {
    let id = ''
    on('ui.open', ($, e) => {
      id = e.id
      return { value: { isPlaced: true } }
    })
    const run = await $.command.run({ ...RUN, args: 'set' })
    expect(id).toBe('tolk-language')
    expect(run.text).toBeUndefined()
  })

  test('prints the list when the picker cannot be shown', { options: { language: 'en' } }, async ($, on) => {
    on('ui.open', () => ({ value: { isPlaced: false, reason: 'narrow' } }))
    const run = await $.command.run({ ...RUN, args: 'set' })
    expect(run.text).toContain('● `en` English')
    expect(run.text).toContain('○ `de` Deutsch')
  })

  test('a pick from the list switches the language', { options: { language: 'en' } }, async ($, on) => {
    const writes: unknown[] = []
    on('config.set', ($, e) => {
      writes.push([e.key, e.value])
      return { value: e.value }
    })
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const pane = await $.ui.mount({
      plugin: 'tolk',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'tolk-language',
      props: {
        title: 'Available languages',
        isFocused: true,
        bodyColumns: 40,
        placement: 'inline',
        scroll: { offset: 0, bodyRows: 9 },
        view: {},
      },
    })
    await pane.press({ key: 'de' })
    expect(writes).toEqual([['tolk.language', 'de']])
    const help = await $.command.describe({
      command: 'help',
      description: 'Show help and available commands',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(help.description).toBe('Hilfe und verfügbare Befehle anzeigen')
    await pane.unmount()
  })
})

describe('descriptions that change with the situation', () => {
  test('uses the wording Claude Code shows right now', { options: { language: 'de' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const headless = await $.command.describe({
      command: 'config',
      description: 'Set a setting by key',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(headless.description).toBe('Eine Einstellung über ihren Schlüssel setzen')
  })

  test('keeps a live detail in parentheses', { options: { language: 'es' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const fast = await $.command.describe({
      command: 'fast',
      description: 'Toggle fast mode (Opus 5.5)',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(fast.description).toBe('Activar o desactivar el modo rápido (Opus 5.5)')
  })

  test('keeps a live detail in a /config label', { options: { language: 'it' } }, async ($, on) => {
    on('config.describe', ($, e) => ({ label: e.label, isHidden: e.isHidden }))
    const row = await $.config.describe({ key: 'fast', label: 'Fast mode (Opus 5.5)', isHidden: false, provider: ENGINE })
    expect(row.label).toBe('Modalità veloce (Opus 5.5)')
  })

  test('translates rows from plugins Claude Code ships with', { options: { language: 'de' } }, async ($, on) => {
    on('config.describe', ($, e) => ({ label: e.label, isHidden: e.isHidden }))
    const row = await $.config.describe({
      key: 'cc-plugin-agents-md.instructionFiles',
      label: 'Project instructions',
      isHidden: false,
      provider: { plugin: 'cc-plugin-agents-md@builtin', tier: 'builtin' },
    })
    expect(row.label).toBe('Projektanweisungen')
  })

  test('translates the /sandbox status line', { options: { language: 'fr' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const sandbox = await $.command.describe({
      command: 'sandbox',
      description: '◯ sandbox disabled (⏎ to configure)',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(sandbox.description).toBe('◯ sandbox désactivé (⏎ pour configurer)')
  })

  test('leaves skill guides written for Claude in English', { options: { language: 'ja' } }, async ($, on) => {
    on('command.describe', ($, e) => ({ description: e.description, isHidden: e.isHidden }))
    const guide = await $.command.describe({
      command: 'update-config',
      description: 'Use this skill to configure the Claude Code harness via settings.json.',
      isHidden: false,
      immediate: false,
      provider: ENGINE,
    })
    expect(guide.description).toBe('Use this skill to configure the Claude Code harness via settings.json.')
  })
})
