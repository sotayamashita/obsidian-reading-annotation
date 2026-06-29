# End-to-end testing with obsidian-cli

How to verify this plugin's **runtime behavior** inside a real Obsidian instance
— the parts that unit tests (Vitest) cannot cover: vault event wiring, editor
(CodeMirror) decorations, reading-mode post-processing, the sidebar view, and
plugin lifecycle.

> Audience: a future agent or contributor. This file is self-contained. Verify
> the machine-specific paths with the commands in [Prerequisites](#prerequisites)
> before trusting them — they were correct on the original author's macOS setup
> but are not guaranteed elsewhere.

## When to use this vs Vitest

- **Vitest** (`pnpm test`) covers pure logic and jsdom DOM logic: parsing,
  block-id generation, path mapping, whitespace/position mapping, reading-mode
  wrapping. Prefer it — it is fast, deterministic, and needs no Obsidian.
- **obsidian-cli E2E** (this doc) is for behavior that only exists at runtime:
  - vault `create`/`modify`/`delete`/`rename` → store refresh → re-render
  - editor decorations (CodeMirror) and reading-mode highlights
  - the annotation sidebar view (`reading-annotation-view`)
  - "does it actually render / does it throw" smoke checks

If a behavior *can* be expressed as a Vitest test, do that instead. Reach for
E2E only for the genuinely runtime-coupled cases.

## Prerequisites

- **Obsidian desktop app** installed (macOS: `/Applications/Obsidian.app`).
- **obsidian-cli** — ships inside the app bundle at
  `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli`, exposed on PATH as
  `obsidian` (a symlink). Confirm:
  ```bash
  obsidian vaults          # lists known vaults; proves the CLI talks to the running app
  obsidian help            # full command list
  obsidian help dev:dom    # help for a specific command
  ```
- The CLI drives the **currently running** Obsidian. Target a specific vault with
  `vault=<name>` on every command, e.g. `obsidian vault=reading-annotation-test ...`.
- A **dedicated test vault** — never test in a real notes vault (the recipes
  create/delete files). See below.

## Test vault layout

A throwaway vault dedicated to this plugin. On the original setup it lives at
`path/to/reading-annotation-test`:

```
reading-annotation-test/
  40-raw/Sample.md            # a source note with text to annotate
  40-raw/Other.md             # a second note (for split-pane / multi-file tests)
  90-archive/Sample.md        # same basename, different folder (collision tests)
  42-annotation/              # annotation files land here (ANNOTATION_DIR)
  .obsidian/
    community-plugins.json    # ["obsidian-reading-annotation"]
    plugins/obsidian-reading-annotation/
      main.js      -> symlink to <repo>/main.js
      manifest.json-> symlink to <repo>/manifest.json
      styles.css   -> symlink to <repo>/styles.css
```

Symlinking the build artifacts means a rebuild is picked up by a plugin reload
(no copy step).

**Folder naming — what is required vs arbitrary:**

- `42-annotation/` is **required**. It is hardcoded as
  `ANNOTATION_DIR = "42-annotation"` in `src/annotation-types.ts`; the plugin
  only ever writes/reads annotation files there. Changing it needs a code edit,
  not just a different folder.
- The source-note folders (`40-raw/`, `90-archive/` above) are **arbitrary** —
  the Johnny-Decimal prefixes are incidental to the original author's vault. A
  source note can live in **any folder or at the vault root**. `getAnnotationPath`
  maps a source to its annotation file by **basename only**
  (`sourcePath.split("/").pop()` → `42-annotation/<basename>.md`), ignoring the
  source folder. So `notes/Sample.md`, `Sample.md`, and `40-raw/Sample.md` all
  map to the same `42-annotation/Sample.md`.

Two consequences for tests:
- You may replace `40-raw/`/`90-archive/` in every recipe below with any folder
  name (or none). Just keep the **basename** consistent between a source note,
  its annotation file, and the `source: "[[…]]"` frontmatter.
- Because mapping is basename-only, **two source notes with the same basename in
  different folders collide** on one annotation file — that is exactly what the
  `90-archive/Sample.md` vs `40-raw/Sample.md` collision recipe exercises.

### Creating the vault from scratch

```bash
REPO=/path/to/obsidian-reading-annotation       # this repo's checkout
VAULT="$HOME/Documents/reading-annotation-test"  # the dedicated test vault
PLUG="$VAULT/.obsidian/plugins/obsidian-reading-annotation"
mkdir -p "$VAULT/40-raw" "$VAULT/90-archive" "$PLUG"
ln -sf "$REPO/main.js"       "$PLUG/main.js"
ln -sf "$REPO/manifest.json" "$PLUG/manifest.json"
ln -sf "$REPO/styles.css"    "$PLUG/styles.css"
printf '["obsidian-reading-annotation"]\n' > "$VAULT/.obsidian/community-plugins.json"
# add a sample note (any text you want to annotate)
printf '# Sample\n\nThe quick brown fox jumps over the lazy dog. The fox is clever.\n' > "$VAULT/40-raw/Sample.md"
```

### One-time manual step (cannot be scripted)

Obsidian must **register** the vault and the user must **trust** the plugin
(restricted mode is on by default for a new vault). This requires the GUI once:

```bash
# Opens (and registers) the vault in the running Obsidian:
open "obsidian://open?path=/path/to/reading-annotation-test"   # absolute path to the test vault
```

Then in Obsidian: **Settings → Community plugins → Turn off restricted mode**
(or "Trust author and enable plugins"). After that, verify headlessly:

```bash
obsidian vault=reading-annotation-test plugins:enabled    # should list obsidian-reading-annotation
obsidian vault=reading-annotation-test dev:errors         # should be clean
```

## Build → deploy → reload loop

```bash
cd <repo>
node esbuild.config.mjs production            # emits main.js at repo root (symlinked into the vault)
obsidian vault=reading-annotation-test plugin:reload id=obsidian-reading-annotation
obsidian vault=reading-annotation-test dev:errors clear   # reset captured errors before a run
```

Notes:
- `node esbuild.config.mjs production` builds directly (avoids `pnpm`'s
  ignored-build-scripts gate). `pnpm build` also works but may prompt about build
  scripts; esbuild itself runs fine via its platform binary.
- `plugin:reload` reloads only this plugin — no app restart, fast iteration.

## obsidian-cli command cheat sheet

```
vaults                              list known vaults
plugins:enabled                     list enabled plugins (with vault=)
plugin:reload  id=<plugin-id>       reload a plugin (dev)
command        id=<command-id>      run an Obsidian command (incl. this plugin's)
open           path=<vault-path>    open a file (opens a NEW tab each call — see gotchas)
read           path=<vault-path>    read file contents
create         path=... content=    create a file       (EXTERNAL write — see gotchas)
append         path=... content=    append to a file    (EXTERNAL write — see gotchas)
delete         path=...             delete a file       (EXTERNAL write — see gotchas)
rename / move                       rename/move a file
eval           code=<js>            run JS in the renderer, return the result
dev:dom        selector=<css> [total|text|all|attr=]   query the DOM
dev:errors     [clear]             show / clear captured errors
dev:console    [clear] [level=]    show / clear captured console messages
dev:screenshot                     capture a screenshot (good for visual confirmation)
```

`command id` / `plugin id` for this plugin (from `manifest.json` + `src/main.ts`):
- plugin id: `obsidian-reading-annotation`
- commands: `obsidian-reading-annotation:open-annotation-panel`,
  `obsidian-reading-annotation:annotate`
- sidebar view type: `reading-annotation-view`

## Critical gotchas (read this — they cost hours)

These are non-obvious and will produce **false negatives** if ignored.

### 1. Obsidian must be focused for reading-mode (preview) assertions

Obsidian's reading view renders lazily via `requestAnimationFrame` /
virtual rendering. When the window is **not focused** (typical when an agent is
driving via CLI), the render queue is throttled and `previewMode.rerender(true)`
appears to do nothing — preview highlight counts read as `0` even though the
data is correct. **Bring Obsidian to the front before asserting on preview:**

```bash
open -a Obsidian      # focuses the app; do this before preview-mode checks
```

The editor (CodeMirror, source/live-preview mode) does **not** have this problem.
If you only need to prove highlight logic, source mode is more reliable headless.

### 2. Drive vault mutations IN-PROCESS via `eval`, not external `create`/`append`/`delete`

obsidian-cli's `create`/`append`/`delete` write to disk **externally**. Obsidian's
file watcher then fires the vault event, but its read cache (`cachedRead`) and
in-memory file index (`getAbstractFileByPath`) can lag behind that event. The
plugin's refresh handler reads through `cachedRead` / `getAbstractFileByPath`, so
it observes **stale** content/existence and the test sees wrong counts.

In production the plugin mutates files through Obsidian's own API
(`vault.create` / `vault.append` / `vault.process`), where the cache and index
update synchronously before the event fires. To mirror production, drive
mutations the same way via `eval`:

```bash
V=vault=reading-annotation-test
# create an annotation file in-process (note the escaping/newlines below)
obsidian $V eval code='app.vault.create("42-annotation/Sample.md",["---","source: \"[[40-raw/Sample]]\"","type: reading-annotation","---","","> fox ^ann-1","","> [!surprise] m","> c"].join(String.fromCharCode(10)));"created"'
# delete in-process
obsidian $V eval code='var f=app.vault.getAbstractFileByPath("42-annotation/Sample.md");if(f)app.vault.delete(f);"deleted"'
```

Use external `create`/`delete` only for the initial *create* of a file with no
prior cache (that one path happens to be reliable), or for coarse setup/teardown
where timing doesn't matter.

### 3. `eval` must return a JSON-serializable value

obsidian-cli serializes the eval result. Returning a Promise (e.g. the result of
`app.vault.create(...)`) throws `Converting circular structure to JSON`. End the
snippet with a literal so it returns something serializable:

```bash
obsidian $V eval code='app.vault.create(p, content); "ok"'   # not: code='app.vault.create(p, content)'
```

The async op still runs (fire-and-forget); add a `sleep 1`-`2` before asserting.

### 4. Newlines and quotes inside `eval` code

Build multi-line strings with `["a","b"].join(String.fromCharCode(10))` rather
than literal `\n` (the CLI may convert `\n` in the value before JS sees it).
Escape inner double quotes as `\"`; wrap the whole `code=...` argument in single
quotes in the shell.

### 5. Count highlights in ONE leaf and the RIGHT container

`document.querySelectorAll(".reading-annotation-hl")` over-counts because:
- every `open` call opens a **new tab/leaf**, so multiple panes accumulate; and
- a `MarkdownView` holds **both** the (hidden) CodeMirror editor and the preview
  DOM, so a single annotated note can show the highlight twice.

Detach leaves first, then scope to the active leaf's container and the specific
sub-tree:

```bash
V=vault=reading-annotation-test
obsidian $V eval code='app.workspace.detachLeavesOfType("markdown");"x"'   # close all md leaves before a run
# editor (source / live-preview) highlights only:
obsidian $V eval code='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length'
# reading-mode (preview) highlights only:
obsidian $V eval code='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".markdown-reading-view .reading-annotation-hl").length'
```

### 6. Forcing a specific view mode deterministically

`command id=markdown:toggle-preview` flips the mode, which is unreliable if you
don't know the current state. Set it explicitly:

```bash
obsidian $V eval code='(function(){var l=app.workspace.activeLeaf;return l.setViewState({type:"markdown",state:{file:l.view.file.path,mode:"preview"}}),"set";})()'
# mode is one of "source" | "preview"; read it with:
obsidian $V eval code='app.workspace.activeLeaf.view.getMode()'
```

## Verification recipes

Reusable shell vars used below:

```bash
V=vault=reading-annotation-test
HL_EDITOR='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl").length'
HL_PREVIEW='app.workspace.activeLeaf.view.containerEl.querySelectorAll(".markdown-reading-view .reading-annotation-hl").length'
SIDEBAR='(function(){var l=app.workspace.getLeavesOfType("reading-annotation-view")[0];return l?l.view.containerEl.querySelectorAll(".reading-annotation-card").length:"no-panel";})()'
MK='app.vault.create("42-annotation/Sample.md",["---","source: \"[[40-raw/Sample]]\"","type: reading-annotation","---","","> fox ^ann-1","","> [!surprise] m","> c"].join(String.fromCharCode(10)));"created"'
DEL='var f=app.vault.getAbstractFileByPath("42-annotation/Sample.md");if(f)app.vault.delete(f);"deleted"'
```

Always start a run by focusing the app, reloading, and clearing errors:

```bash
open -a Obsidian; sleep 1
obsidian $V plugin:reload id=obsidian-reading-annotation
obsidian $V dev:errors clear
obsidian $V eval code='app.workspace.detachLeavesOfType("markdown");"x"'; sleep 1
```

### A. Highlights appear when an annotation file is created (no manual reload)

```bash
obsidian $V open path="40-raw/Sample.md"; sleep 1
obsidian $V eval code="$MK"; sleep 2
obsidian $V eval code="$HL_EDITOR"      # expect 2 (the quote "fox" appears twice in Sample.md)
obsidian $V dev:errors                  # expect: No errors captured.
```

### B. Reading mode re-renders on store change (requires focus — gotcha #1)

```bash
obsidian $V open path="40-raw/Sample.md"; sleep 1
obsidian $V eval code='(function(){var l=app.workspace.activeLeaf;return l.setViewState({type:"markdown",state:{file:l.view.file.path,mode:"preview"}}),"set";})()'; sleep 2
obsidian $V eval code="$MK"; sleep 2
obsidian $V eval code="$HL_PREVIEW"     # expect 2
obsidian $V eval code="$DEL"; sleep 2
obsidian $V eval code="$HL_PREVIEW"     # expect 0  (delete invalidation + preview re-render)
```

### C. Non-active split pane stays in sync

Open note A in one pane and note B (active) in a split, then change A's
annotation file; A's pane must update even though it is not active:

```bash
obsidian $V eval code='app.vault.create("40-raw/Other.md","# Other\n\nthe fox runs fast");"ok"'   # one-time
obsidian $V eval code='app.workspace.detachLeavesOfType("markdown");"x"'; sleep 1
obsidian $V open path="40-raw/Other.md"; sleep 1
obsidian $V eval code='var f=app.vault.getAbstractFileByPath("40-raw/Sample.md");app.workspace.getLeaf("split").openFile(f);"split"'; sleep 1
# Sample.md is now the active pane; annotate OTHER.md (the non-active pane):
obsidian $V eval code='app.vault.create("42-annotation/Other.md",["---","source: \"[[40-raw/Other]]\"","type: reading-annotation","---","","> fox ^ann-o","","> [!surprise] m","> c"].join(String.fromCharCode(10)));"ok"'; sleep 2
# per-leaf counts — Other.md should be 1 even though it is not active:
obsidian $V eval code='JSON.stringify(app.workspace.getLeavesOfType("markdown").map(function(l){return {file:l.view.file.path,hl:l.view.containerEl.querySelectorAll(".cm-editor .reading-annotation-hl, .markdown-reading-view .reading-annotation-hl").length};}))'
```

### D. Sidebar view (store-driven)

```bash
obsidian $V eval code="$MK"; sleep 1
obsidian $V open path="40-raw/Sample.md"; sleep 1
obsidian $V command id=obsidian-reading-annotation:open-annotation-panel; sleep 2
obsidian $V eval code="$SIDEBAR"        # expect 1 card
# live update: append a 2nd annotation in-process → sidebar debounced-refreshes (~300ms)
obsidian $V eval code='var f=app.vault.getAbstractFileByPath("42-annotation/Sample.md");app.vault.append(f,["","","---","","> dog ^ann-2","","> [!note] m","> c2"].join(String.fromCharCode(10)));"ok"'; sleep 2
obsidian $V eval code="$SIDEBAR"        # expect 2 cards
```

### E. Sidebar / view does not leak child components across refreshes

```bash
# after opening the panel on an annotated note, switch files a few times, then:
obsidian $V eval code='(function(){var l=app.workspace.getLeavesOfType("reading-annotation-view")[0];return JSON.stringify({children:(l.view._children||[]).length, cards:l.view.containerEl.querySelectorAll(".reading-annotation-card").length});})()'
# children should stay small (≈1), not grow per refresh.
```

### F. A command runs without throwing

```bash
obsidian $V command id=obsidian-reading-annotation:annotate   # no selection → graceful Notice, no error
obsidian $V dev:errors                                        # expect: No errors captured.
```

## Cleanup

```bash
V=vault=reading-annotation-test
obsidian $V eval code='["42-annotation/Sample.md","42-annotation/Other.md"].forEach(function(p){var f=app.vault.getAbstractFileByPath(p);if(f)app.vault.delete(f);});"clean"'
```

The test vault itself is disposable — delete the directory to remove it entirely.

## Selectors & ids reference

| Thing | Value |
|---|---|
| Plugin id | `obsidian-reading-annotation` |
| Sidebar view type | `reading-annotation-view` |
| Commands | `…:open-annotation-panel`, `…:annotate` |
| Annotation dir | `42-annotation/` (`ANNOTATION_DIR`) |
| Highlight span | `.reading-annotation-hl`, `.reading-annotation-hl-<type>` |
| Editor container | `.cm-editor` (CodeMirror; source/live-preview) |
| Reading container | `.markdown-reading-view` (preview) |
| Sidebar card | `.reading-annotation-card` |
| Interactive badge | `.reading-annotation-badge-interactive` |
| Annotation types | surprise / resonance / question / caution / important / note |
```
