# H. 同名ノートからの誤追記の拒否

## ID・目的

固定IDは`H`。確認対象は同名ノートからの誤追記の拒否。

## 初期状態

40-raw/Sample.mdと90-archive/Sample.md、注釈なし。
[共通How-to](../../docs/e2e-testing-how-to.md)による設定読み込み、固定ノート3件の配置、プラグイン読み込み、操作関数の定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。

## 操作と判定

CLIの`open`・`command`と、`eval`経由のVault API・エディタAPI・DOM操作による実行。
拒否理由を示す`Reading Annotation:`のconsole errorは想定内。拒否ログと未処理JavaScriptエラーの区別。

```bash
CASE_ID=H
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
reset_case
open_note 40-raw/Sample.md source
create_annotation Sample
BEFORE=$(obs read path=annotation/Sample.md)
open_note 90-archive/Sample.md source
run_js 'app.workspace.activeLeaf.view.editor.setSelection({line:0,ch:2},{line:0,ch:9});'
obs command id=obsidian-reading-annotation:annotate
wait_js '!!document.querySelector(".modal .reading-annotation-preview")'
run_js 'document.querySelector(".modal .mod-cta").click();'
wait_js 'Array.from(document.querySelectorAll(".notice")).some(el=>el.textContent.includes("already belongs to a different note"))'
test "$(obs read path=annotation/Sample.md)" = "$BEFORE"
no_errors
obs dev:console level=error
```

## 期待結果

拒否の通知と既存注釈の内容不変。
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
