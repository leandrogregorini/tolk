// The shape every language file fills in. Copy `de.ts` to start a new
// language; every field except `code`, `name` and `ui` may be partial, and
// anything left out simply stays in English.

/** The hint and notice phrases Tolk recognises (see ../phrases.ts). */
export type PhraseId =
  | 'shortcuts'
  | 'shellMode'
  | 'escInterrupt'
  | 'escAgainClear'
  | 'doubleEscClear'
  | 'pressAgainExit'
  | 'editQueued'
  | 'acceptEdits'
  | 'planMode'
  | 'autoMode'
  | 'bypassPermissions'
  | 'manualMode'
  | 'forAgents'
  | 'toCycle'
  | 'toExpand'
  | 'runInBackground'
  | 'pasteToExpand'
  | 'toStop'
  | 'holdToSpeak'
  | 'sandboxEnabled'
  | 'sandboxDisabled'
  | 'sandboxAutoAllow'
  | 'sandboxFallback'
  | 'sandboxManaged'
  | 'toConfigure'

/** Tolk's own messages, shown by the /tolk command. */
export type UiStrings = {
  /** `{name}` the language's own name, `{code}` its code. */
  status: string
  /** `{commands}`, `{commandsTotal}`, `{settings}`, `{settingsTotal}`. */
  coverage: string
  /** Heading above the list of languages. */
  available: string
  /** `{name}` the language switched to. */
  switched: string
  /** `{code}` the code given, `{codes}` the codes there are. */
  unknown: string
  /** Shown when every command on screen has a translation. */
  missingNone: string
  /** Heading above untranslated commands. */
  missingHeader: string
  /** Heading above commands whose English changed since the translation. */
  driftHeader: string
  /** The /tolk usage text; `{codes}` the language codes. */
  usage: string
  /** The /tolk command's own description in the command list. */
  commandDescription: string
  /** Label of Tolk's row in /config. */
  configLabel: string
}

/** A text in the singular (`n` is 1) and in the plural. */
export type Plural = { one: string; other: string }

export type Locale = {
  /** BCP 47 code, matching the file name: `de`, `pt-BR`, `zh-CN`. */
  code: string
  /** The language's name in itself: `Deutsch`, `日本語`. */
  name: string
  /** Contributors, as GitHub handles. */
  credits?: string[]
  /** Slash command name (no slash) → its description in the command list. */
  commands: Record<string, string>
  /**
   * Exact English description → translation, for the commands whose
   * description changes with the situation (`/config` reads "Open
   * settings" in a terminal and "Set a setting by key" headless).
   * Checked before `commands`.
   */
  byText?: Record<string, string>
  /** /config row key → its label. */
  config: Record<string, string>
  /** Phrase id → template. `{1}` stands for the key binding the phrase names. */
  phrases: Partial<Record<PhraseId, string>>
  /** Footer mode label (as Claude Code draws it) → translation. */
  modes: Record<string, string>
  /** Playful words for the spinner while Claude works ("Baking…"). */
  spinner: string[]
  /** The line that closes a turn ("Baked for 3s"). */
  turn: {
    /** Past-tense words, one is picked per turn. */
    words: string[]
    /** `{word}` and `{duration}`. */
    template: string
  }
  /**
   * The line a finished run of searches, reads and listings folds into
   * ("Searched for 2 patterns, read 3 files"). Each part is written as it
   * reads mid-line; the line's first letter is capitalised. `{n}` is the
   * count, drawn bold.
   */
  group: {
    searched: Plural
    read: Plural
    listed: Plural
    /** Between the two parts (`, `). */
    separator: string
  }
  /** Units for durations: `1h 2m 3s` in English. */
  duration: { h: string; m: string; s: string; separator: string }
  ui: UiStrings
}
