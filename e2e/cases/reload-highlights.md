# J. 再読み込み後のハイライト復元

## ID・目的

固定IDは`J`。開いたままのノートに対する、プラグイン再読み込み後のハイライト復元の確認。

## 初期状態

[共通How-to](../../docs/e2e-testing-how-to.md)による環境準備と関数定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。
対象は`40-raw/Sample.md`、再読み込み直前のハイライト2件。
以下はsourceモードの実行例。previewモードも、`MODE=preview`への変更と初期化からの別実行。
両モードの結果を分けて記録、片方のみの実行時は他方を未実施として報告。

## 操作と判定

```bash
MODE=source
CASE_ID=J
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-$MODE-XXXXXX")
reset_case
open "$TEST_VAULT_URI"
open -a Obsidian
open_note 40-raw/Sample.md "$MODE"
create_annotation Sample
if [ "$MODE" = source ]; then
  HIGHLIGHTS="$HL_EDITOR"
else
  HIGHLIGHTS="$HL_PREVIEW"
fi
wait_js "$HIGHLIGHTS === 2"
obs read path=annotation/Sample.md > "$CASE_REPORT/before.md"
capture_evidence
obs plugin:reload id=obsidian-reading-annotation
wait_js '!!app.plugins.plugins["obsidian-reading-annotation"]'
wait_js "app.workspace.activeLeaf.view.file?.path === '40-raw/Sample.md' && app.workspace.activeLeaf.view.getMode() === '$MODE'"
wait_js "$HIGHLIGHTS === 2"
obs read path=annotation/Sample.md > "$CASE_REPORT/after.md"
cmp "$CASE_REPORT/before.md" "$CASE_REPORT/after.md"
no_errors
```

## 期待結果

ノートの切替・再オープンなしでのハイライト2件の復元。
再読み込み前後の注釈ファイルの内容不変、未処理JavaScriptエラー0件。
既知の不具合でも期待値を2件に維持、0件のままの場合の不合格判定。

## 証拠

待機失敗時も、初期化前の件数と保存内容の取得。

```bash
js "$HIGHLIGHTS" > "$CASE_REPORT/highlights.txt"
obs read path=annotation/Sample.md > "$CASE_REPORT/after.md"
cmp "$CASE_REPORT/before.md" "$CASE_REPORT/after.md"
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

[Issue #2](https://github.com/sotayamashita/obsidian-reading-annotation/issues/2)。
2026-10-02の既存検証で確認した、再読み込み直後のハイライト消失。
修正前はsource・previewの両方で再現、`0ed439b`への更新後は両方で合格。
[検証記録](../../docs/e2e-validation.md)への修正前後の結果の記載。
