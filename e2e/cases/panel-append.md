# D. 注釈パネルへの追加・追記

## ID・目的

固定IDは`D`。確認対象は注釈パネルへの追加・追記。

## 初期状態

40-raw/Sample.md、注釈なし、パネルなし。
[共通How-to](../../docs/e2e-testing-how-to.md)による設定読み込み、固定ノート3件の配置、プラグイン読み込み、操作関数の定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。

## 操作と判定

CLIの`open`・`command`と、`eval`経由のVault API・エディタAPI・DOM操作による実行。

```bash
CASE_ID=D
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
reset_case
open_note 40-raw/Sample.md source
create_annotation Sample
obs command id=obsidian-reading-annotation:open-annotation-panel
wait_js "$SIDEBAR === 1"
run_js 'await app.vault.append(app.vault.getAbstractFileByPath("annotation/Sample.md"),["","","---","","> dog ^ann-2","","> [!note] m","> c2"].join(String.fromCharCode(10)));'
wait_js "$SIDEBAR === 2"
no_errors
```

## 期待結果

カード1件から2件への更新。
未処理JavaScriptエラー0件。

## 証拠

成功・失敗時とも、初期化前の状態、注釈ファイル、ログ、画像の保存。
途中で失敗した場合も、実行済みの操作と期待値・実測値の記録。

```bash
capture_evidence
```

## 後片付け

証拠保存後の`reset_case`による生成注釈とテスト用タブ・パネルの削除。
未処理エラー発生時は、証拠保存とエラー確認後の`obs dev:errors clear`の実行。
モーダルが残る場合は、閉じる操作後の初期化。

```bash
reset_case
```

## 関連Issue

このケース固有の既知Issueなし。
