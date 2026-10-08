# Tolk 🌍

[English](README.md) · [日本語](README.ja.md) · **简体中文** · [Deutsch](README.de.md)

**让 Claude Code 的界面说你的语言。** *（tolk 在荷兰语、瑞典语、挪威语和丹麦语中意为“口译员”）*

Claude Code 汉化 · 中文界面 · 命令列表和 `/config` 全部中文显示

Claude 本来就会用你的语言*回答*。Tolk 让 Claude Code 的其余部分也跟上：命令列表、`/config`、加载动画、输入框下方的提示，以及每轮结束时的那一行。

```
/plugin install tolk --marketplace leandrogregorini/tolk
```

![Tolk 切换 Claude Code 界面语言的演示](demo.gif)

| 语言 | 代码 | 命令 | 设置 | 母语者审校 |
| :- | :- | :-: | :-: | :-: |
| Deutsch | `de` | ✅ | ✅ | 招募中 |
| Español | `es` | ✅ | ✅ | 招募中 |
| Français | `fr` | ✅ | ✅ | 招募中 |
| Italiano | `it` | ✅ | ✅ | 招募中 |
| Português (Brasil) | `pt-BR` | ✅ | ✅ | 招募中 |
| 日本語 | `ja` | ✅ | ✅ | 招募中 |
| 简体中文 | `zh-CN` | ✅ | ✅ | 招募中 |
| Tiếng Việt | `vi` | ✅ | ✅ | 招募中 |

没有你的语言？[添加一种语言](CONTRIBUTING.md)只需要一个文件。

## 为什么做这个

社区已经提出了界面翻译的需求：[葡萄牙语](https://github.com/anthropics/claude-code/issues/65862)、[日语](https://github.com/anthropics/claude-code/issues/62291)、[西班牙语](https://github.com/anthropics/claude-code/issues/65963)、[越南语](https://github.com/anthropics/claude-code/issues/69741)、[中文](https://github.com/anthropics/claude-code/issues/31842)，以及[德语、法语和西班牙语](https://github.com/anthropics/claude-code/issues/31413)。以前唯一的办法是修改 Claude Code 的文件，每次更新都会失效。

Tolk 是一个 **mod**，这是 Claude Code 在 2.1.287 中新增的插件类型。它挂接 Claude Code 在列出和绘制内容时触发的事件，因此更新后依然可用，并且从不修改任何文件。

## 翻译了哪些内容

| 位置 | 示例（`zh-CN`） |
| :- | :- |
| `/` 命令列表中的说明 | `/compact` · *总结目前的对话以释放上下文* |
| `/config` 标签，包括 Claude Code 自带插件的设置行 | *自动压缩*、*详细输出* |
| Claude 工作时的加载动画 | *琢磨中…* 代替 *Combobulating…* |
| 每轮结束时的那一行 | `✻ 烘焙了 1 分 4 秒` |
| 输入框下方的提示 | *? 查看快捷键*、*Esc 中断* |
| 底栏提示和后台标记 | *（shift+tab 切换）*、*（ctrl+b 转到后台）* |
| 搜索、读取和列目录操作折叠后的那一行 | `搜索了 2 个模式，读取了 3 个文件（ctrl+o 展开）` |

你自己设置的快捷键会原样保留（折叠行除外，因为 mod 读不到那个绑定，所以始终显示 `ctrl+o`）；自定义的 `spinnerVerbs` 设置也不会被改动。

**不翻译的内容：** 权限确认提示和按 `?` 打开的快捷键列表（任何 mod 都无法修改），Claude 回复的正文（请使用 Claude Code 自己的 `language` 设置），以及命令输出。以下内容也保持 Claude Code 的原样：底栏的模式标签（`⏵⏵ auto mode on`，自 2.1.294 起 mod 无法修改）、仍在运行或包含编辑的折叠行、shell 读取（`cat`、`head`）、提交或记忆，以及 `· done 2:27 PM` 时间（Tolk 的结束行中省略）。像 `/update-config` 这样写给 Claude 看的技能说明，有意保留英文。

## 选择语言

默认情况下，Tolk 依次参考：

1. `/config` 中 Claude Code 自己的 **Language** 设置（也就是 Claude 回复所用的语言），写 `中文`、`Chinese` 或 `zh` 都可以
2. 系统区域设置：`LC_ALL`、`LC_MESSAGES`、`LANGUAGE`，然后是 `LANG`

手动选择：

```
/tolk set zh-CN
```

或者在 `/config` 中选择 **Interface language (Tolk)**。

| 命令 | 作用 |
| :- | :- |
| `/tolk` | 显示当前语言和翻译覆盖率 |
| `/tolk list` | 列出所有语言 |
| `/tolk set` | 打开语言选择列表。`/tolk set <代码>` 同样可用（`zh-CN`、`Chinese`、`中文`） |
| `/tolk missing` | 列出尚未翻译的命令，以及翻译后英文原文有变化的命令。供贡献者使用 |

## 它能访问什么

mod 以你的权限在 Claude Code 内部运行，所以安装前你应该知道它会做什么。以下是 Claude Code 自己对 Tolk 的报告（`claude plugin validate .`）：

```
hooks: session.start, command.describe, config.describe, ui.render{Spinner, TurnDuration,
       PromptHint, ToolGroup, ToolProgress, InfoNotice, SessionMode, Pane}, command.run{command=tolk}
calls: $.command.list, $.command.register, $.config.list, $.config.set, $.env.get,
       $.ui.invalidate, $.ui.resolve, $.ui.open, $.ui.close, $.ui.log
env reads: LANG, LANGUAGE, LC_ALL, LC_MESSAGES
env writes: nothing
```

不联网、不读写文件、不调用工具、不向模型发送任何内容。

## 环境要求

Claude Code **2.1.290** 或更高版本。mod 在 2.1.287 中推出，但 2.1.290 才修复了中日文文本重绘卡顿的问题。已在 2.1.294 上测试。可在终端和 Claude Desktop 的 Code 标签页中使用；结束行和底栏提示仅在终端中显示，因为只有终端会绘制它们。

## 开发

```bash
claude plugin validate .   # 查看 mod 挂接和调用了什么
claude plugin test .       # 在 Claude Code 自己的引擎上运行 75 个测试
claude --plugin-dir .      # 试用；保存文件即重新加载
vhs demo.tape              # 录制 demo.gif；vhs 安装见 https://github.com/charmbracelet/vhs#installation
```

## 关于翻译

每种语言的初稿都由 Claude 撰写，并对照了 Claude Code 的真实字符串，但**目前还没有任何一种语言经过母语者审校**。如果有读起来别扭的地方，哪怕只改一行的 Pull Request 也非常欢迎。

## 许可证

MIT。见 [LICENSE](LICENSE)。
