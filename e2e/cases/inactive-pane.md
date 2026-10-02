# C. 非アクティブな分割ペインの更新

## ID・目的

固定IDは`C`。確認対象は非アクティブな分割ペインの更新。

## 初期状態

OtherとSampleのsourceモードでの分割表示、注釈なし。
[共通How-to](../../docs/e2e-testing-how-to.md)による設定読み込み、固定ノート3件の配置、プラグイン読み込み、操作関数の定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。

## 操作と判定

CLIの`open`・`command`と、`eval`経由のVault API・エディタAPI・DOM操作による実行。
sourceモードの各ペインに限定した件数確認。

```bash
CASE_ID=C
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
reset_case
open_note 40-raw/Other.md source
run_js 'const leaf=app.workspace.getLeaf("split");await leaf.openFile(app.vault.getAbstractFileByPath("40-raw/Sample.md"));await leaf.setViewState({type:"markdown",state:{file:"40-raw/Sample.md",mode:"source"}});app.workspace.setActiveLeaf(leaf,{focus:true});'
wait_js 'app.workspace.activeLeaf.view.file?.path === "40-raw/Sample.md"'
create_annotation Other
wait_js 'app.workspace.getLeavesOfType("markdown").length === 2 && app.workspace.getLeavesOfType("markdown").every(l=>l.view.getMode()==="source" && l.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length === (l.view.file.path==="40-raw/Other.md"?1:0))'
no_errors
```

## 期待結果

非アクティブなOtherの1件、アクティブなSampleの0件。
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
