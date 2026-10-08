# Tolk 🌍

**English** · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [Deutsch](README.de.md)

**Claude Code's interface, in your language.** *(tolk = interpreter in Dutch, Swedish, Norwegian and Danish)*

Claude Code auf Deutsch · Claude Code en español · Claude Code en français · Claude Code in italiano · Claude Code em português · Claude Code 日本語化 · Claude Code 汉化 / 中文界面 · Claude Code tiếng Việt

Claude already *answers* in your language. Tolk makes the rest of Claude Code follow: the command list, `/config`, the spinner, the hint line under the prompt and the line that closes each turn.

```
/plugin install tolk --marketplace leandrogregorini/tolk
```

<!-- Record the demo with `vhs demo.tape` (install: https://github.com/charmbracelet/vhs#installation; see CONTRIBUTING.md) and keep the GIF here. -->
![Tolk switching Claude Code to German](demo.gif)

| Language | Code | Commands | Settings | Reviewed by a native speaker |
| :- | :- | :-: | :-: | :-: |
| Deutsch | `de` | ✅ | ✅ | ✅ |
| Español | `es` | ✅ | ✅ | wanted |
| Français | `fr` | ✅ | ✅ | wanted |
| Italiano | `it` | ✅ | ✅ | wanted |
| Português (Brasil) | `pt-BR` | ✅ | ✅ | wanted |
| 日本語 | `ja` | ✅ | ✅ | wanted |
| 简体中文 | `zh-CN` | ✅ | ✅ | wanted |
| Tiếng Việt | `vi` | ✅ | ✅ | wanted |

Your language missing? [Adding one](CONTRIBUTING.md) is a single file.

## Why

There are open requests for a translated interface in [Portuguese](https://github.com/anthropics/claude-code/issues/65862), [Japanese](https://github.com/anthropics/claude-code/issues/62291), [Spanish](https://github.com/anthropics/claude-code/issues/65963), [Vietnamese](https://github.com/anthropics/claude-code/issues/69741), [Chinese](https://github.com/anthropics/claude-code/issues/31842) and [German, French and Spanish](https://github.com/anthropics/claude-code/issues/31413). Until now the only way was patching Claude Code's files, which breaks on every update.

Tolk is a **mod**, the plugin type Claude Code added in 2.1.287. It hooks the events Claude Code fires when it lists and draws things, so it survives updates and never edits a file.

## What gets translated

| Where | Example (`de`) |
| :- | :- |
| Descriptions in the `/` command list | `/compact` · *Kontext freigeben, indem die bisherige Unterhaltung zusammengefasst wird* |
| `/config` labels, including rows from plugins Claude Code ships with | *Automatisch komprimieren*, *Ausführliche Ausgabe* |
| The spinner while Claude works | *Tüftle…* instead of *Combobulating…* |
| The line that closes a turn | `✻ Gebacken: 1 Min. 4 s` |
| The hint line under the prompt | *? für Tastenkürzel*, *Esc zum Unterbrechen* |
| Footer hints and the background pill | *shift+tab zum Wechseln*, *(ctrl+b für Hintergrund)* |
| The folded line for a run of searches, reads and listings | `Nach 2 Mustern gesucht, 3 Dateien gelesen (ctrl+o zum Aufklappen)` |

Your own key bindings are kept as you set them (except in the folded line, which always says `ctrl+o` because a mod can't read that binding), and a custom `spinnerVerbs` setting is left alone.

**Not translated:** the permission prompt and the shortcuts list that `?` opens (no mod can change either), the text of Claude's replies (set Claude Code's own `language` setting for those), and command output. Also left as Claude Code draws them: the mode label in the footer (`⏵⏵ auto mode on`, out of reach of mods since 2.1.294), a folded line while it is still running or when it holds edits, shell reads (`cat`, `head`), commits or memories, and the `· done 2:27 PM` time, which Tolk's turn line leaves out. Skill guides written for Claude to read, like `/update-config`, stay in English on purpose.

## Choosing the language

By default Tolk follows, in order:

1. Claude Code's own **Language** setting in `/config` (the one Claude's replies use), so `Deutsch`, `German` or `de` all work
2. your system locale: `LC_ALL`, `LC_MESSAGES`, `LANGUAGE`, then `LANG`

To pick one yourself:

```
/tolk set ja
```

or choose **Interface language (Tolk)** in `/config`.

| Command | What it does |
| :- | :- |
| `/tolk` | Shows the language in use and how much is translated |
| `/tolk list` | Lists the languages |
| `/tolk set` | Opens a list of languages to pick from. `/tolk set <code>` still works (`de`, `German` and `deutsch`) |
| `/tolk missing` | Lists commands with no translation, and ones whose English changed since they were translated. Made for contributors |

## What it can reach

A mod runs inside Claude Code with your permissions, so you should know what one does before you install it. This is Claude Code's own report for Tolk (`claude plugin validate .`):

```
hooks: session.start, command.describe, config.describe, ui.render{Spinner, TurnDuration,
       PromptHint, ToolGroup, ToolProgress, InfoNotice, SessionMode, Pane}, command.run{command=tolk}
calls: $.command.list, $.command.register, $.config.list, $.config.set, $.env.get,
       $.ui.invalidate, $.ui.resolve, $.ui.open, $.ui.close, $.ui.log
env reads: LANG, LANGUAGE, LC_ALL, LC_MESSAGES
env writes: nothing
```

No network, no files, no tool calls, nothing sent to the model.

## Requirements

Claude Code **2.1.290** or later. Mods arrived in 2.1.287, but 2.1.290 fixed redraw stalls with Japanese and Chinese text. Tested on 2.1.294. Works in the terminal and in the Code tab of Claude Desktop; the turn line and footer hints are terminal-only because only the terminal draws them.

## Development

```bash
claude plugin validate .   # what the mod hooks and calls
claude plugin test .       # 75 tests against Claude Code's own engine
claude --plugin-dir .      # try it; saving a file reloads it
vhs demo.tape              # record demo.gif; install vhs from https://github.com/charmbracelet/vhs#installation
```

## Translations

The first drafts of every language were written with Claude and checked against Claude Code's real strings, but **none has been reviewed by a native speaker yet**. If something reads oddly, a pull request fixing one line is very welcome.

## License

MIT. See [LICENSE](LICENSE).
