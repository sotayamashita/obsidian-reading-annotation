#!/usr/bin/env bash

obs() {
  local output
  output=$("$OBSIDIAN_COMMAND" "$V" "$@") || return
  case "$output" in
    Error:*|'Vault not found.') printf '%s\n' "$output" >&2; return 1 ;;
  esac
  printf '%s\n' "$output"
}

js() {
  local attempt output
  for attempt in {1..3}; do
    output=$(obs eval "code=$1") || return
    case "$output" in
      '=> '*) printf '%s\n' "${output#=> }"; return 0 ;;
      '') sleep 0.25 ;;
      *) printf 'evalの想定外の結果: %s\n' "$output" >&2; return 1 ;;
    esac
  done
  printf 'evalの応答なし: %s\n' "$1" >&2
  return 1
}

wait_js() {
  local attempt output
  for attempt in {1..40}; do
    output=$(js "$1") || return
    if [ "$output" = true ]; then return 0; fi
    sleep 0.25
  done
  printf '待機時間超過: %s\n最終結果: %s\n' "$1" "$output" >&2
  return 1
}

run_js() {
  local operation_id="e2e-$RANDOM-$RANDOM"
  obs eval "code=globalThis.__readingAnnotationE2E={id:'$operation_id',status:'pending'};(async()=>{$1})().then(()=>{globalThis.__readingAnnotationE2E={id:'$operation_id',status:'done'}},error=>{globalThis.__readingAnnotationE2E={id:'$operation_id',status:'error',message:String(error)}});'started'" >/dev/null || return
  wait_js "globalThis.__readingAnnotationE2E?.id === '$operation_id' && globalThis.__readingAnnotationE2E.status !== 'pending'" || return
  if [ "$(js 'globalThis.__readingAnnotationE2E.status')" != done ]; then
    js 'JSON.stringify(globalThis.__readingAnnotationE2E)' >&2
    return 1
  fi
}

no_errors() {
  local output
  output=$(obs dev:errors) || return
  printf '%s\n' "$output"
  test "$output" = 'No errors captured.'
}

open_note() {
  obs open "path=$1" || return
  run_js "const leaf=app.workspace.getLeavesOfType('markdown').find(l=>l.view.file?.path==='$1');if(!leaf)throw Error('missing leaf');await leaf.setViewState({type:'markdown',state:{file:'$1',mode:'$2'}});app.workspace.setActiveLeaf(leaf,{focus:true});" || return
  wait_js "app.workspace.activeLeaf.view.file?.path==='$1' && app.workspace.activeLeaf.view.getMode()==='$2'"
}


capture_evidence() {
  local evidence
  evidence=$(mktemp -d "${CASE_REPORT:-$REPORT}/evidence-XXXXXX") || return
  printf '%s\n' "$evidence"
  obs dev:errors > "$evidence/errors.txt" 2>> "$evidence/capture-errors.txt"
  obs dev:console > "$evidence/console.txt" 2>> "$evidence/capture-errors.txt"
  js 'JSON.stringify({file:app.workspace.activeLeaf?.view.file?.path,mode:app.workspace.activeLeaf?.view.getMode?.(),focused:document.hasFocus(),visibility:document.visibilityState,highlights:app.workspace.activeLeaf?.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length})' > "$evidence/state.json" 2>> "$evidence/capture-errors.txt"
  cp -R "$TEST_VAULT/annotation" "$evidence/annotations"
  obs tabs > "$evidence/tabs.txt" 2>> "$evidence/capture-errors.txt"
  obs dev:dom selector=.reading-annotation-card total > "$evidence/cards.txt" 2>> "$evidence/capture-errors.txt"
  js 'JSON.stringify(app.workspace.getLeavesOfType("markdown").map(l=>({file:l.view.file?.path,mode:l.view.getMode(),editor:l.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length,preview:l.view.containerEl.querySelectorAll(".markdown-reading-view .reading-annotation-hl").length})))' > "$evidence/panes.json" 2>> "$evidence/capture-errors.txt"
  obs dev:screenshot "path=$evidence/screenshot.png" 2>> "$evidence/capture-errors.txt"
  test -s "$evidence/screenshot.png"
}

reset_case() {
  no_errors || return
  run_js 'for(const path of ["annotation/Sample.md","annotation/Other.md","annotation/Moved.md"]){const file=app.vault.getAbstractFileByPath(path);if(file)await app.vault.delete(file);}app.workspace.detachLeavesOfType("markdown");app.workspace.detachLeavesOfType("reading-annotation-view");' || return
  obs dev:errors clear || return
  obs dev:console clear
}

create_annotation() {
  run_js "const name='$1';const q=String.fromCharCode(34);await app.vault.create('annotation/'+name+'.md',['---','source: '+q+'[[40-raw/'+name+']]'+q,'type: reading-annotation','---','', '> fox ^ann-1','', '> [!surprise] m','> c'].join(String.fromCharCode(10)));"
}

HL_EDITOR='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length'
HL_PREVIEW='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".markdown-reading-view .reading-annotation-hl").length'
SIDEBAR='app.workspace.getLeavesOfType("reading-annotation-view")[0]?.view.containerEl.querySelectorAll(".reading-annotation-card").length'
