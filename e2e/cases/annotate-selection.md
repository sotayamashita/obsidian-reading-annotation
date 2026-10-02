# I. 選択テキストからの注釈保存

## ID・目的

固定IDは`I`。確認対象は選択テキストからの注釈保存。

## 初期状態

40-raw/Sample.md、sourceモード、注釈なし。
[共通How-to](../../docs/e2e-testing-how-to.md)による設定読み込み、固定ノート3件の配置、プラグイン読み込み、操作関数の定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
他ケースの実行結果への依存なし。

## 操作と判定

CLIの`open`・`command`と、`eval`経由のVault API・エディタAPI・DOM操作による実行。
行番号・文字位置は0始まり。選択範囲は行番号2の文字位置16以上19未満。

```bash
CASE_ID=I
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
reset_case
open "$TEST_VAULT_URI"
open -a Obsidian
open_note 40-raw/Sample.md source
wait_js "$HL_EDITOR === 0"
wait_js '!app.vault.getAbstractFileByPath("42-annotation/Sample.md")'
run_js 'app.workspace.activeLeaf.view.editor.setSelection({line:2,ch:16},{line:2,ch:19});'
test "$(js 'app.workspace.activeLeaf.view.editor.getSelection()')" = fox
obs command id=obsidian-reading-annotation:annotate
wait_js '!!document.querySelector(".modal .reading-annotation-preview")'
run_js 'const button=document.querySelector(".modal .mod-cta");if(!button)throw Error("Submit button missing");button.click();'
wait_js 'Array.from(document.querySelectorAll(".notice")).some(el=>el.textContent==="Annotation saved")'
wait_js '!!app.vault.getAbstractFileByPath("42-annotation/Sample.md")'
wait_js 'app.workspace.activeLeaf.view.file?.path === "40-raw/Sample.md" && app.workspace.activeLeaf.view.getMode() === "source"'
wait_js "$HL_EDITOR === 2"
obs read path=42-annotation/Sample.md > "$CASE_REPORT/annotation.md"

mise exec -- node --input-type=module - "$CASE_REPORT/annotation.md" <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const content = readFileSync(process.argv[2], 'utf8');
assert.match(content, /^source: "\[\[40-raw\/Sample\]\]"$/m);
assert.match(content, /^type: reading-annotation$/m);
assert.match(content, /^> fox \^ann-[a-z0-9]+$/m);
JS

no_errors
```

## 期待結果

保存通知、元ノートへの参照とfoxの引用、ハイライト2件。
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
