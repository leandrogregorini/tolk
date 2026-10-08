# Records demo.gif for the README: `vhs demo.tape`
# Needs Claude Code 2.1.287+ signed in, and vhs (https://github.com/charmbracelet/vhs).
# Needs fonts for the Japanese text and the ⏵ symbol, or they render as boxes: `sudo apt install fonts-noto-cjk fonts-noto-core`

Output demo.gif
Set FontFamily "DejaVu Sans Mono, Noto Sans Mono CJK JP, Noto Sans Symbols2"
Set FontSize 18
Set Width 1200
Set Height 640
Set Theme "Catppuccin Mocha"
Set TypingSpeed 60ms

Hide
Type "claude --plugin-dir ." Enter
Sleep 4s
Show

# Start in English, then switch.
Type "/"
Sleep 1.5s
Type "co"
Sleep 2s
Backspace 3
Type "/tolk set de" Enter
Sleep 2s

# The same list, now in German.
Type "/"
Sleep 1.5s
Type "co"
Sleep 2.5s
Backspace 3

# A short turn shows the spinner and the closing line.
Type "Sag kurz Hallo" Enter
Sleep 5s

# And Japanese, for good measure.
Type "/tolk set ja" Enter
Sleep 2s
Type "/"
Sleep 3s
Escape
Sleep 1s
