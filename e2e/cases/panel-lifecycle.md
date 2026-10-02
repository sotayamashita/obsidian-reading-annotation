# E. ノート切替時の子コンポーネント数

## ID・目的

固定IDは`E`。確認対象はノート切替時の子コンポーネント数。

## 初期状態

40-raw/Sample.md、注釈なし、パネルなし。
[共通How-to](../../docs/e2e-testing-how-to.md)による設定読み込み、固定ノート3件の配置、プラグイン読み込み、操作関数の定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。

## 操作と判定

CLIの`open`・`command`と、`eval`経由のVault API・エディタAPI・DOM操作による実行。
`_children`は内部API。存在しない場合の合格判定は不可。プラグイン全体のメモリリークは未確認。

```bash
CASE_ID=E
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
reset_case
open_note 40-raw/Sample.md source
create_annotation Sample
obs command id=obsidian-reading-annotation:open-annotation-panel
wait_js "$SIDEBAR === 1"
for cycle in {1..5}; do
  open_note 40-raw/Other.md source
  wait_js "$SIDEBAR === 0"
  open_note 40-raw/Sample.md source
  wait_js "$SIDEBAR === 1"
  wait_js 'app.workspace.getLeavesOfType("reading-annotation-view")[0]?.view._children?.length === 1'
done
no_errors
```

## 期待結果

5往復後もカードと子コンポーネントが各1件。
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
