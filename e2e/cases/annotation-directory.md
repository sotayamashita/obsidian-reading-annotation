# K. 設定画面からの注釈保存先変更

## ID・目的

固定IDは`K`。設定画面で指定したフォルダへの注釈保存、表示更新、再読み込み後の設定保持の確認。

## 初期状態

[共通How-to](../../docs/e2e-testing-how-to.md)による専用vaultの準備、プラグイン読み込み、関数定義までの完了。
同じBashセッションでの実行、各コマンドの失敗時の後続操作の停止。
対象は`40-raw/Sample.md`。設定値は既定の`annotation`、`E2E-annotations`フォルダは存在しない状態。
既存設定や同名フォルダがある場合は、上書き・削除せず開始条件の不一致として停止。

設定の変更経路は設定画面の入力欄とDOMの`input`・`change`イベント。
注釈作成の経路はエディタの範囲選択、CLIの注釈コマンド、モーダルのSubmitボタン。
別ウィンドウで開いた設定画面も含め、対象タブの`containerEl`から入力欄を取得。
設定メソッドの直接呼び出しと`data.json`の直接編集は対象外。

## 操作と判定

```bash
CASE_ID=K
CASE_REPORT=$(mktemp -d "$REPORT/$CASE_ID-XXXXXX")
verify_vault
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "annotation"'
wait_js '!app.vault.getAbstractFileByPath("E2E-annotations")'
reset_case
open "$TEST_VAULT_URI"
open -a Obsidian
open_note 40-raw/Sample.md source
create_annotation Sample
wait_js "$HL_EDITOR === 2"
obs command id=obsidian-reading-annotation:open-annotation-panel
wait_js "$SIDEBAR === 1"
obs read path=annotation/Sample.md > "$CASE_REPORT/default-before.md"

open_directory_setting() {
  run_js 'app.setting.open();app.setting.openTabById("obsidian-reading-annotation");' || return
  wait_js '!!app.setting.activeTab.containerEl.querySelector("input")'
}

change_directory_input() {
  run_js "const input=app.setting.activeTab.containerEl.querySelector('input');if(!input)throw Error('directory input missing');input.value='$1';input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));input.dispatchEvent(new input.ownerDocument.defaultView.Event('change',{bubbles:true}));"
}

open_directory_setting
run_js 'const input=app.setting.activeTab.containerEl.querySelector("input");input.focus();input.value="90-";input.dispatchEvent(new input.ownerDocument.defaultView.Event("input",{bubbles:true}));'
wait_js 'Array.from(app.setting.activeTab.containerEl.ownerDocument.querySelectorAll(".suggestion-item")).some(el=>el.textContent==="90-archive")'
js 'app.setting.activeTab.containerEl.ownerDocument.querySelector(".suggestion-container").outerHTML' > "$CASE_REPORT/suggestions.html"
run_js 'const doc=app.setting.activeTab.containerEl.ownerDocument;const item=Array.from(doc.querySelectorAll(".suggestion-item")).find(el=>el.textContent==="90-archive");if(!item)throw Error("Folder suggestion missing");item.click();'
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "90-archive" && app.setting.activeTab.containerEl.querySelector("input").value === "90-archive"'
change_directory_input 'E2E-annotations/Nested/'
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "E2E-annotations/Nested"'
js 'app.setting.activeTab.containerEl.outerHTML' > "$CASE_REPORT/settings.html"
obs dev:screenshot "path=$CASE_REPORT/settings.png"
run_js 'app.setting.close();'
wait_js "$HL_EDITOR === 0 && $SIDEBAR === 0"
wait_js '!app.vault.getAbstractFileByPath("E2E-annotations/Nested/Sample.md")'

run_js 'const leaf=app.workspace.getLeavesOfType("markdown").find(l=>l.view.file?.path==="40-raw/Sample.md");if(!leaf)throw Error("Sample leaf missing");app.workspace.setActiveLeaf(leaf,{focus:true});leaf.view.editor.setSelection({line:2,ch:4},{line:2,ch:9});'
test "$(js 'app.workspace.activeLeaf.view.editor.getSelection()')" = quick
obs command id=obsidian-reading-annotation:annotate
wait_js '!!document.querySelector(".modal .reading-annotation-preview")'
run_js 'const button=document.querySelector(".modal .mod-cta");if(!button)throw Error("Submit button missing");button.click();'
wait_js '!!app.vault.getAbstractFileByPath("E2E-annotations/Nested/Sample.md")'
wait_js "$HL_EDITOR === 1 && $SIDEBAR === 1"
obs read path=E2E-annotations/Nested/Sample.md > "$CASE_REPORT/custom.md"
obs read path=annotation/Sample.md > "$CASE_REPORT/default-after.md"
cmp "$CASE_REPORT/default-before.md" "$CASE_REPORT/default-after.md"

mise exec -- node --input-type=module - "$CASE_REPORT/custom.md" <<'JS'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const content = readFileSync(process.argv[2], 'utf8');
assert.match(content, /^source: "\[\[40-raw\/Sample\]\]"$/m);
assert.match(content, /^type: reading-annotation$/m);
assert.match(content, /^> quick \^ann-[a-z0-9]+$/m);
JS

for MODE in source preview; do
  open_note 40-raw/Sample.md "$MODE"
  if [ "$MODE" = source ]; then HIGHLIGHTS="$HL_EDITOR"; else HIGHLIGHTS="$HL_PREVIEW"; fi
  wait_js "$HIGHLIGHTS === 1"
  obs plugin:reload id=obsidian-reading-annotation
  wait_js 'app.plugins.plugins["obsidian-reading-annotation"]?.annotationDirectory === "E2E-annotations/Nested"'
  wait_js "app.workspace.activeLeaf.view.file?.path === '40-raw/Sample.md' && app.workspace.activeLeaf.view.getMode() === '$MODE' && $HIGHLIGHTS === 1"
  js "$HIGHLIGHTS" > "$CASE_REPORT/reload-$MODE.txt"
  capture_evidence
done

open_directory_setting
test "$(js 'app.setting.activeTab.containerEl.querySelector("input").value')" = E2E-annotations/Nested
change_directory_input '../outside'
wait_js 'app.setting.activeTab.containerEl.querySelector(".setting-item-error")?.textContent === "Enter a folder path relative to the vault."'
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "E2E-annotations/Nested"'
js 'app.setting.activeTab.containerEl.outerHTML' > "$CASE_REPORT/invalid-path.html"
obs dev:screenshot "path=$CASE_REPORT/invalid-path.png"
change_directory_input ''
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "annotation" && app.setting.activeTab.containerEl.querySelector("input").value === "" && !app.setting.activeTab.containerEl.querySelector(".is-invalid")'
run_js 'app.setting.close();'
wait_js "$HL_PREVIEW === 2"
obs command id=obsidian-reading-annotation:open-annotation-panel
wait_js "$SIDEBAR === 1"
obs read path=E2E-annotations/Nested/Sample.md > "$CASE_REPORT/custom-after-reset.md"
cmp "$CASE_REPORT/custom.md" "$CASE_REPORT/custom-after-reset.md"
cp "$TEST_PLUGIN/data.json" "$CASE_REPORT/settings-after-reset.json"
no_errors
capture_evidence
```

## 期待結果

| 確認対象                       | 期待値                                            |
| ------------------------------ | ------------------------------------------------- |
| フォルダ補完                   | `90-`に対する`90-archive`の候補表示と選択後の保存 |
| 末尾スラッシュ付きの設定入力   | `E2E-annotations/Nested`への正規化と保存          |
| 保存先変更直後                 | 旧フォルダ由来のハイライトとカードの0件への更新   |
| 注釈作成                       | 未作成の階層フォルダ内への`quick`の保存           |
| 注釈作成後                     | ハイライト1件、注釈カード1件                      |
| source・previewでの再読み込み  | ノート切替なしでの設定保持とハイライト1件の復元   |
| 不正な相対パス                 | 入力エラーの表示と有効な設定値の保持              |
| 空欄の確定                     | `annotation`への復帰とハイライト2件の復元         |
| 既存ファイル                   | 変更前・変更後の両フォルダでの保存内容の維持      |
| 実行中の未処理JavaScriptエラー | 0件                                               |

## 証拠

`CASE_REPORT`への補完候補、設定タブ、入力エラーのDOM、両フォルダの保存内容、モード別件数、設定JSON、共通証拠の保存。
CLIのスクリーンショットはメインウィンドウの証拠。別ウィンドウの設定画面は保存したDOMでの確認。
失敗時は後片付け前の`capture_evidence`と、存在する`E2E-annotations`フォルダ・プラグインの`data.json`のコピー。
実行済み操作、期待値、実測値、合否の`CASE_REPORT/result.md`への記録。
共通の`capture_evidence`の注釈コピー対象は`annotation`のみのため、変更先ファイルの別途保存が必須。

## 後片付け

非同期操作の完了と証拠保存後の実行。設定画面からの既定値への復帰、今回作成したファイルと空フォルダだけの削除。
未処理エラー発生時は、証拠保存後のエラー確認と`obs dev:errors clear`の実行。

```bash
open_directory_setting
change_directory_input ''
wait_js 'app.plugins.plugins["obsidian-reading-annotation"].annotationDirectory === "annotation"'
run_js 'app.setting.close();const file=app.vault.getAbstractFileByPath("E2E-annotations/Nested/Sample.md");if(file)await app.vault.delete(file);for(const path of ["E2E-annotations/Nested","E2E-annotations"]){const folder=app.vault.getAbstractFileByPath(path);if(folder){if(folder.children?.length!==0)throw Error("Unexpected files in "+path);await app.vault.delete(folder,true);}}'
wait_js '!app.vault.getAbstractFileByPath("E2E-annotations")'
reset_case
unset -f open_directory_setting change_directory_input
```

## 関連Issue

このケース固有の既知Issueなし。
