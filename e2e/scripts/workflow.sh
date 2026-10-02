#!/usr/bin/env bash

check_cli() {
  command -v "$OBSIDIAN_COMMAND" || return
  "$OBSIDIAN_COMMAND" version || return
  "$OBSIDIAN_COMMAND" help eval || return
  "$OBSIDIAN_COMMAND" help plugins:restrict || return
}

list_cases() {
  printf '%s\n' "$CASE_DIR"/*.md || return
}

prepare_vault() {
  local run_id
  run_id=$(date +%Y%m%d-%H%M%S) || return
  mkdir -p "$REPORT_ROOT" || return
  REPORT=$(mktemp -d "$REPORT_ROOT/obsidian-cli-$run_id-XXXXXX") || return
  unset CASE_REPORT CASE_ID || return

  mise exec -- pnpm build || return
  mkdir -p "$TEST_VAULT/40-raw" "$TEST_VAULT/90-archive" "$TEST_VAULT/annotation" "$TEST_PLUGIN" "$REPORT" || return
  ln -sf "$REPO/main.js" "$TEST_PLUGIN/main.js" || return
  ln -sf "$REPO/manifest.json" "$TEST_PLUGIN/manifest.json" || return
  ln -sf "$REPO/styles.css" "$TEST_PLUGIN/styles.css" || return
  printf '["%s"]\n' "$PLUGIN_ID" > "$TEST_VAULT/.obsidian/community-plugins.json" || return
  printf '# Sample\n\nThe quick brown fox jumps over the lazy dog. The fox is clever.\n' > "$TEST_VAULT/40-raw/Sample.md" || return
  printf '# Other\n\nthe fox runs fast\n' > "$TEST_VAULT/40-raw/Other.md" || return
  printf '# Archive\n\nA different note with the same basename.\n' > "$TEST_VAULT/90-archive/Sample.md" || return

  git rev-parse HEAD > "$REPORT/commit.txt" || return
  git status --short > "$REPORT/worktree-status.txt" || return
  git diff HEAD --binary > "$REPORT/worktree.diff" || return
  "$OBSIDIAN_COMMAND" version > "$REPORT/obsidian-version.txt" || return
  sw_vers > "$REPORT/os.txt" || return
  uname -m >> "$REPORT/os.txt" || return
  mise exec -- node --version > "$REPORT/node-version.txt" || return
  mise exec -- pnpm --version > "$REPORT/pnpm-version.txt" || return
  printf '%s\n' "$TEST_VAULT" > "$REPORT/vault-path.txt" || return
}

show_registration() {
  "$OBSIDIAN_COMMAND" vaults verbose || return
  printf '%s\n' "$TEST_VAULT" || return
}

open_vault_manager() {
  open 'obsidian://choose-vault' || return
  open -a Obsidian || return
}

verify_vault() {
  "$OBSIDIAN_COMMAND" vaults verbose || return
  test "$("$OBSIDIAN_COMMAND" "$V" vault info=path)" = "$TEST_VAULT" || return
}

load_plugin() {
  verify_vault || return
  test -f "$TEST_PLUGIN/main.js" || return
  test -f "$TEST_PLUGIN/manifest.json" || return
  test -f "$TEST_PLUGIN/styles.css" || return
  obs plugins:restrict || return
  obs plugins:restrict off || return

  local connected=false
  local attempt
  for attempt in {1..40}; do
    if [ "$("$OBSIDIAN_COMMAND" "$V" vault info=path)" = "$TEST_VAULT" ]; then
      connected=true
      break
    fi
    sleep 0.25
  done
  test "$connected" = true || return
  wait_js '!!app.plugins.manifests["obsidian-reading-annotation"]' || return
  obs dev:debug on || return
  obs dev:errors > "$REPORT/startup-errors.txt" || return
  no_errors || return
  obs dev:console > "$REPORT/startup-console.txt" || return
  obs dev:errors clear || return
  obs dev:console clear || return
  obs plugin:reload id=obsidian-reading-annotation || return
  wait_js '!!app.plugins.plugins["obsidian-reading-annotation"] && !!app.commands.commands["obsidian-reading-annotation:annotate"]' || return
  no_errors || return
}

operation_status() {
  js 'JSON.stringify(globalThis.__readingAnnotationE2E)' || return
}

retry_case() {
  obs dev:errors clear || return
  obs dev:console clear || return
  reset_case || return
}

cleanup() {
  capture_evidence || return
  run_js 'for(const path of ["annotation/Sample.md","annotation/Other.md","annotation/Moved.md"]){const file=app.vault.getAbstractFileByPath(path);if(file)await app.vault.delete(file);}app.workspace.detachLeavesOfType("markdown");app.workspace.detachLeavesOfType("reading-annotation-view");' || return
  wait_js '!["annotation/Sample.md","annotation/Other.md","annotation/Moved.md"].some(path=>app.vault.getAbstractFileByPath(path)) && app.workspace.getLeavesOfType("markdown").length === 0 && app.workspace.getLeavesOfType("reading-annotation-view").length === 0' || return
  obs eval 'code=delete globalThis.__readingAnnotationE2E;true' || return
  wait_js '!("__readingAnnotationE2E" in globalThis)' || return
  obs dev:debug off || return
}
