# Tolk 🌍

[English](README.md) · **日本語** · [简体中文](README.zh-CN.md) · [Deutsch](README.de.md)

**Claude Code のインターフェースを、あなたの言語で。** *(tolk はオランダ語・スウェーデン語・ノルウェー語・デンマーク語で「通訳」の意味)*

Claude Code 日本語化 · コマンド一覧も `/config` も日本語に

Claude はすでにあなたの言語で*返事*をしてくれます。Tolk はそれ以外の部分も合わせます。コマンド一覧、`/config`、スピナー、入力欄の下のヒント、そして各ターンの最後に出る行です。

```
/plugin install tolk --marketplace leandrogregorini/tolk
```

![Tolk で Claude Code を日本語に切り替える様子](demo.gif)

| 言語 | コード | コマンド | 設定 | ネイティブによるレビュー |
| :- | :- | :-: | :-: | :-: |
| Deutsch | `de` | ✅ | ✅ | ✅ |
| Español | `es` | ✅ | ✅ | 募集中 |
| Français | `fr` | ✅ | ✅ | 募集中 |
| Italiano | `it` | ✅ | ✅ | 募集中 |
| Português (Brasil) | `pt-BR` | ✅ | ✅ | 募集中 |
| 日本語 | `ja` | ✅ | ✅ | 募集中 |
| 简体中文 | `zh-CN` | ✅ | ✅ | 募集中 |
| Tiếng Việt | `vi` | ✅ | ✅ | 募集中 |

あなたの言語がない？ [追加](CONTRIBUTING.md)はファイル 1 つで済みます。

## なぜ作ったか

インターフェースの翻訳を求める要望は [ポルトガル語](https://github.com/anthropics/claude-code/issues/65862)、[日本語](https://github.com/anthropics/claude-code/issues/62291)、[スペイン語](https://github.com/anthropics/claude-code/issues/65963)、[ベトナム語](https://github.com/anthropics/claude-code/issues/69741)、[中国語](https://github.com/anthropics/claude-code/issues/31842)、[ドイツ語・フランス語・スペイン語](https://github.com/anthropics/claude-code/issues/31413) で出ています。これまでは Claude Code のファイルを直接書き換えるしかなく、アップデートのたびに壊れていました。

Tolk は Claude Code 2.1.287 で追加されたプラグインの一種、**mod** です。Claude Code が一覧や画面を描くときに発火するイベントにフックするので、アップデートしても動き続け、ファイルを一切書き換えません。

## 翻訳される部分

| 場所 | 例 (`ja`) |
| :- | :- |
| `/` コマンド一覧の説明 | `/compact` · *これまでの会話を要約してコンテキストを空ける* |
| `/config` のラベル（Claude Code 同梱プラグインの行も含む） | *自動コンパクト*、*詳細な出力* |
| Claude が作業中のスピナー | *Combobulating…* の代わりに *熟考中…* |
| ターンの最後の行 | `✻ 焼き上がり（1分4秒）` |
| 入力欄の下のヒント | *? でショートカット*、*Esc で中断* |
| フッターのヒントとバックグラウンド表示 | *（shift+tab で切り替え）*、*（ctrl+b でバックグラウンド実行）* |
| 検索・読み込み・一覧表示をまとめた折りたたみ行 | `2 件のパターンを検索、3 件のファイルを読み込み（ctrl+o で展開）` |

自分で設定したキーバインドはそのまま表示されます（折りたたみ行だけは mod からその設定を読めないため常に `ctrl+o`）。独自の `spinnerVerbs` 設定にも手を触れません。

**翻訳されないもの:** 許可プロンプトと `?` で開くショートカット一覧（どの mod も変更できません）、Claude の返答本文（Claude Code 自体の `language` 設定を使ってください）、コマンドの出力。フッターのモード表示（`⏵⏵ auto mode on`、2.1.294 以降 mod から変更不可）、実行中や編集を含む折りたたみ行、シェルでの読み込み（`cat`、`head`）、コミットやメモリ、`· done 2:27 PM` の時刻表示（Tolk のターン行では省略）も Claude Code の表示のままです。`/update-config` のように Claude が読むために書かれたスキルの説明は、意図的に英語のままにしています。

## 言語の選び方

デフォルトでは次の順に従います。

1. `/config` にある Claude Code 自身の **Language** 設定（Claude の返答に使われるもの）。`日本語`、`Japanese`、`ja` のどれでも OK
2. システムのロケール: `LC_ALL`、`LC_MESSAGES`、`LANGUAGE`、`LANG` の順

自分で選ぶには:

```
/tolk set ja
```

または `/config` で **Interface language (Tolk)** を選びます。

| コマンド | 内容 |
| :- | :- |
| `/tolk` | 使用中の言語と翻訳済みの割合を表示 |
| `/tolk list` | 言語の一覧 |
| `/tolk set` | 言語を選ぶリストを開く。`/tolk set <コード>` も使えます（`ja`、`Japanese`、`日本語`） |
| `/tolk missing` | 翻訳のないコマンドと、翻訳後に英語の原文が変わったコマンドを一覧表示。コントリビューター向け |

## Tolk がアクセスできるもの

mod はあなたの権限で Claude Code の中で動くので、インストール前に何をするのか知っておくべきです。以下は Claude Code 自身による Tolk のレポートです（`claude plugin validate .`）。

```
hooks: session.start, command.describe, config.describe, ui.render{Spinner, TurnDuration,
       PromptHint, ToolGroup, ToolProgress, InfoNotice, SessionMode, Pane}, command.run{command=tolk}
calls: $.command.list, $.command.register, $.config.list, $.config.set, $.env.get,
       $.ui.invalidate, $.ui.resolve, $.ui.open, $.ui.close, $.ui.log
env reads: LANG, LANGUAGE, LC_ALL, LC_MESSAGES
env writes: nothing
```

ネットワーク通信なし、ファイルアクセスなし、ツール呼び出しなし、モデルへの送信もなし。

## 動作環境

Claude Code **2.1.290** 以降。mod は 2.1.287 で登場しましたが、日本語・中国語テキストの再描画が止まる問題は 2.1.290 で修正されました。2.1.294 で動作確認済み。ターミナルと Claude Desktop の Code タブで動きます。ターン行とフッターのヒントはターミナルだけが描画するため、ターミナル限定です。

## 開発

```bash
claude plugin validate .   # mod がフックし呼び出すもの
claude plugin test .       # Claude Code 本体のエンジンで 75 件のテスト
claude --plugin-dir .      # 試す。ファイルを保存すると再読み込み
vhs demo.tape              # demo.gif を録画。vhs は https://github.com/charmbracelet/vhs#installation から
```

## 翻訳について

各言語の初稿は Claude で作成し、Claude Code の実際の文字列と照らし合わせていますが、**まだどの言語もネイティブスピーカーのレビューを受けていません**。不自然な表現があれば、1 行だけ直すプルリクエストでも大歓迎です。

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
