#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  printf '%s\n' 'Usage: source e2e/scripts/session.sh (from the repository root)' >&2
  exit 1
fi

E2E_CONFIG_VALUES=$(mise exec -- node e2e/scripts/load-config.ts) || return 1
{
  IFS= read -r REPO
  IFS= read -r OBSIDIAN_COMMAND
  IFS= read -r TEST_VAULT
  IFS= read -r TEST_VAULT_NAME
  IFS= read -r REPORT_ROOT
  IFS= read -r CASE_DIR
  IFS= read -r PLUGIN_ID
} <<< "$E2E_CONFIG_VALUES"
unset E2E_CONFIG_VALUES

TEST_PLUGIN="$TEST_VAULT/.obsidian/plugins/$PLUGIN_ID"
V="vault=$TEST_VAULT_NAME"
TEST_VAULT_URI=$(mise exec -- node -p '"obsidian://open?vault="+encodeURIComponent(process.argv[1])' "$TEST_VAULT_NAME") || return

source "$REPO/e2e/scripts/obsidian.sh" || return
source "$REPO/e2e/scripts/workflow.sh"
