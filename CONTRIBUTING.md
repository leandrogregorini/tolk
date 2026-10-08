# Contributing

Thanks for helping Claude Code speak more languages.

## Fix a translation

Open the language's file in [`hooks/locales/`](hooks/locales), change the line, open a pull request. That's it.

## Add a language

1. Copy `hooks/locales/de.ts` to `hooks/locales/<code>.ts`, using a [BCP 47](https://www.ietf.org/rfc/bcp/bcp47.txt) code (`ko`, `nl`, `zh-TW`, `vi`).
2. Translate the strings. Leave the keys, `{placeholders}` and key bindings as they are. Each English original is in `hooks/locales/en.ts` under the same key.
3. Import it in `hooks/locales/index.ts`, add it to `LOCALES`, and add the code to `options` under `language` in `.claude-plugin/plugin.json`.
4. If your language has names people type for it (`Nederlands`, `한국어`), add them to `NAMES` in `hooks/translate.ts` so auto-detection finds it.
5. Run the tests and add a row to the language table in each README (`README.md`, `README.ja.md`, `README.zh-CN.md`, `README.de.md`).

A few guidelines that make a translation feel native:

- **Command descriptions** appear in a narrow list. Short beats literal.
- **The spinner** is playful in English (*Combobulating…*, *Flibbertigibbeting…*). Pick about 30 words with the same spirit in your language rather than translating the English list.
- **Hints** (`? for shortcuts`) are glanced at, not read. Keep them as short as the English.
- Address the person the way software in your language normally does (`du` in German, `tu` in French).

## When Claude Code changes

Claude Code adds and rewords commands often. Run Claude Code with Tolk set to your language and type:

```
/tolk missing
```

It lists built-in commands with no translation, and commands whose English text changed since they were translated. Update `en.ts` with the new English first, then each language.

## Check your work

```bash
claude plugin validate .
claude plugin test .
claude --plugin-dir .       # try it live; saving a file reloads the mod
```

The tests fail if a language file names a command or setting that doesn't exist, misses one, or drops a placeholder.

## Record the demo

The README's GIF is made with [vhs](https://github.com/charmbracelet/vhs):

```bash
vhs demo.tape
```
