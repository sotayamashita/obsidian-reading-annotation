# Reading Annotation プラグイン v1 実装

この ExecPlan は living document である。`Progress`、`Surprises & Discoveries`、`Decision Log`、`Outcomes & Retrospective` セクションは作業の進行に応じて更新しなければならない。

本ドキュメントは `.agents/plans/reading-annotation-v1.md` に配置されており、PLANS.md の規約に従って管理する。

## Purpose / Big Picture

Obsidian で `40-raw/` のファイルを読みながら、テキストを選択して4種の反応（surprise / resonance / question / caution）をコメントとして記録できるようにする。コメントはアノテーションファイルとして `42-annotation/` に自動生成・更新され、元テキスト（blockquote）とユーザーの反応（typed callout）が構造的に区別される。これにより Coding Agent がアノテーションファイルを読んだとき、元テキストとコメントを正確に区別して参照できる。

変更後のユーザー体験: 40-raw/ のファイルを開く → テキストを選択 → 右クリックで「Annotate」を選ぶ、またはコマンドパレットから実行する → モーダルで反応の種類をドロップダウンから選び、コメントを入力（空コメントも可）→ Cmd+Enter または Submit ボタンで保存 → `42-annotation/{ソースファイル名}.md` に自動追記される。

## Progress

- [x] (2026-04-06 13:05+09:00) Milestone 1: プロジェクト初期化（manifest.json、package.json、tsconfig.json の更新、依存関係インストール）
- [x] (2026-04-06 13:10+09:00) Milestone 2: コア実装（型定義、アノテーション書き込み、コメント入力モーダル、プラグイン本体）
- [ ] Milestone 3: ビルドと手動検証（ビルド成功済み、手動検証は未実施）

## Surprises & Discoveries

- Observation: `editorCallback` の第2引数の型が `MarkdownView | MarkdownFileInfo` であり、`MarkdownView` 単独ではない。
  Evidence: `tsc` が `Type 'MarkdownFileInfo' is missing the following properties from type 'MarkdownView'` エラーを出した。`instanceof MarkdownView` ガードで解決。

- Observation: `vault.create()` は中間ディレクトリを自動作成しない。
  Evidence: `42-annotation/` が存在しない状態で `vault.create("42-annotation/file.md", ...)` を呼ぶと失敗した。`vault.createFolder()` で事前にディレクトリを作成する必要がある。

## Decision Log

- Decision: アノテーションファイルの保存先を `42-annotation/` に固定する
  Rationale: ユーザーが「まずは私だけしか使わないので固定で」と明言。設定画面は不要。
  Date/Author: 2026-04-06 / ユーザー

- Decision: pnpm を使用する
  Rationale: ユーザーの指示により pnpm に変更。AGENTS.md は npm を指定していたが、ユーザーの直接指示が優先される。
  Date/Author: 2026-04-06 / ユーザー指示

- Decision: アノテーションファイル名はソースファイルと同名にする
  Rationale: `40-raw/Article Title.md` → `42-annotation/Article Title.md`。ディレクトリが異なるので衝突しない。ファイル名の対応が直感的。
  Date/Author: 2026-04-06 / 計画時

- Decision: 元テキストとコメントの区別に blockquote + typed callout を採用する
  Rationale: Obsidian ネイティブの記法であり、人間にも読みやすく、正規表現で機械的に区別可能。
  Date/Author: 2026-04-06 / ユーザーとの合意

- Decision: 右クリックメニューを「Annotate」1項目に統合し、モーダル内で種類を選択する
  Rationale: UX レビューの指摘。4項目フラットに並べるとメニューが肥大化し、種類を変えたいときにモーダルを閉じてやり直す必要がある。モーダル内にドロップダウンを置くことでステップを1つ減らし、種類変更も容易になる。
  Date/Author: 2026-04-06 / UX レビュー反映

- Decision: 空コメントを許可する
  Rationale: 言語化できなくても「ここが気になった」だけで記録する価値がある。空コメントの場合、callout 内は空行とする。
  Date/Author: 2026-04-06 / UX レビュー反映

- Decision: エントリ間を `---`（水平線）で区切る
  Rationale: テクニカルレビューの指摘。blockquote と callout が空行で分離されると対応関係が構造的に保証されない。水平線でエントリ境界を明示することで、各引用とその反応の対応関係をパース時に確実に判別できる。
  Date/Author: 2026-04-06 / テクニカルレビュー反映

- Decision: create() を try-catch し、ファイル既存エラー時は append() にフォールバックする
  Rationale: テクニカルレビューの指摘。getAbstractFileByPath() → create() の間にレースコンディションが発生しうる。
  Date/Author: 2026-04-06 / テクニカルレビュー反映

- Decision: 40-raw/ 以外のファイルでもアノテーション可能とする
  Rationale: 制限しても大きなメリットがなく、50-notes/ 等の読み直し時にもアノテーションしたいユースケースがありうる。ソースパスはそのまま frontmatter に記録されるので混乱は起きない。
  Date/Author: 2026-04-06 / UX レビューを受けた判断

## Outcomes & Retrospective

（完了後に記録する）

## Context and Orientation

現在のプラグインディレクトリ `/Users/sotayamashita/Documents/personal/.obsidian/plugins/obsidian-reading-annotation/` にはサンプルテンプレート（obsidian-sample-plugin）がそのまま残っている。`src/main.ts` と `src/settings.ts` がサンプルコードで、manifest.json の id は `sample-plugin` のまま。

ビルドツールチェインは以下の通り:

- esbuild でバンドル（`esbuild.config.mjs` — エントリポイント `src/main.ts` → `main.js`）
- TypeScript（`tsconfig.json` — strict 系オプション有効）
- npm でパッケージ管理

Vault のディレクトリ構造:

- `40-raw/` — 元テキスト（クリッピング）。不変。絶対に変更しない
- `42-annotation/` — アノテーションファイルの出力先（このプラグインが作成・更新する）
- `45-wiki/` — wiki 記事（このプラグインの対象外）

Obsidian API で使用する主要機能:

- `workspace.on('editor-menu')` — エディタの右クリックメニューにアイテムを追加する
- `editor.getSelection()` — 選択中のテキストを取得する
- `Modal` + `Setting` — コメント入力用のモーダルダイアログを表示する
- `vault.create()` / `vault.append()` — アノテーションファイルの作成・追記
- `vault.getAbstractFileByPath()` — ファイルの存在確認
- `addCommand()` with `editorCallback` — コマンドパレットにエディタコマンドを登録する

## Plan of Work

### Milestone 1: プロジェクト初期化

サンプルテンプレートの設定を Reading Annotation プラグイン用に書き換える。

1. `manifest.json` を更新する。id を `obsidian-reading-annotation` に、name を `Reading Annotation` に、description を適切な説明に変更する。author を `Sam Yamashita` にする。

2. `package.json` を更新する。name を `obsidian-reading-annotation` に変更する。

3. `tsconfig.json` を更新する。`"strict": true` に統一し、`"target"` を `"ES2018"` に変更する（esbuild の target `es2018` と合わせる）。

4. `npm install` を実行して依存関係をインストールする。

### Milestone 2: コア実装

4つのファイルを作成・更新する。AGENTS.md の指示に従い、main.ts は最小限にして機能を別モジュールに分離する。

#### ファイル構成

    src/
      main.ts              — プラグインのエントリポイント。ライフサイクル管理のみ
      annotation-types.ts  — 4種の反応タイプの定義
      annotation-modal.ts  — コメント入力モーダル
      annotation-writer.ts — アノテーションファイルの作成・追記ロジック

#### src/annotation-types.ts

4種の反応タイプを定義する。各タイプに id（callout type として使用）、表示名、アイコンを持たせる。アノテーション出力先のパス定数もここで定義する。

    ANNOTATION_DIR = "42-annotation"

    ANNOTATION_TYPES = [
      { id: "surprise",   label: "Surprise",   icon: "lightbulb" },
      { id: "resonance",  label: "Resonance",  icon: "heart" },
      { id: "question",   label: "Question",   icon: "help-circle" },
      { id: "caution",    label: "Caution",     icon: "alert-triangle" },
    ]

#### src/annotation-modal.ts

`Modal` を継承したクラスを作成する。コンストラクタで以下を受け取る:

- `app: App`
- `selectedText: string`（選択されたテキスト）
- `onSubmit: (annotationType: AnnotationType, comment: string) => void`（送信時のコールバック。種類とコメントを返す）

モーダルの内容:

- タイトル: "Annotate"
- 選択テキストのプレビュー表示（読み取り専用、200文字超は truncate + "..."）
- 反応タイプのドロップダウン（`Setting.addDropdown`）。デフォルトは "surprise"
- コメント入力用のテキストエリア（`Setting.addTextArea`、4行）。空欄のまま送信可能
- Submit ボタン + Cmd+Enter キーボードショートカットでも送信可能

#### src/annotation-writer.ts

アノテーションファイルの作成・追記を担当する関数を作成する。

`writeAnnotation(vault, sourcePath, selectedText, annotationType, comment)`:

1. ソースファイルのパスから `42-annotation/{ファイル名}.md` のパスを算出する。パス算出は独立した関数 `getAnnotationPath(sourcePath)` として切り出す
2. `vault.getAbstractFileByPath()` でファイルの存在を確認する
3. ファイルが存在しない場合:
    - frontmatter（source, date, type）+ 最初のエントリを含む内容で `vault.create()` する
    - `create()` がファイル既存エラーを投げた場合は `append()` にフォールバックする（レースコンディション対策）
4. ファイルが存在する場合:
    - `getAbstractFileByPath()` の戻り値を `instanceof TFile` でガードし、`vault.append()` で追記する
    - `append()` は改行を自動挿入しないため、エントリの先頭に `\n\n` を含める

エントリのフォーマット（各エントリは `---` で区切る）:

    ---

    > {選択テキスト}

    > [!{annotationType}]
    > {ユーザーのコメント}

空コメントの場合は callout 内を空行にする:

    > [!{annotationType}]
    >

選択テキストが複数行の場合、各行の先頭に `> ` を付与する。コメントも同様。

エラーハンドリング: `writeAnnotation()` は例外を throw しうる。呼び出し元（main.ts）で try-catch し、失敗時は `Notice("Failed to save annotation")` でユーザーに通知する。

frontmatter のフォーマット:

    ---
    source: "[[{ソースファイルパス（拡張子なし）}]]"
    date: {作成日 YYYY-MM-DD}
    type: reading-annotation
    ---

#### src/main.ts

プラグインクラス `ReadingAnnotationPlugin` を作成する。`onload()` で以下を登録する:

1. `addCommand()` で「Annotate selection」エディタコマンドを1つ登録する。コマンド ID は `annotate`。`editorCallback` で選択テキストを取得し、テキストが未選択なら `Notice("Select text to annotate")` を表示してモーダルを開かない。選択テキストがあればモーダルを開く。

2. `workspace.on('editor-menu')` で右クリックメニューに「Annotate」を1項目追加する。テキストが選択されている場合のみ表示する。クリックでモーダルを開く。

3. モーダルの `onSubmit` コールバックで `writeAnnotation()` を try-catch で呼び出す。成功時は `Notice("Annotation saved")` を表示する。失敗時は `Notice("Failed to save annotation")` を表示する。

設定画面（`settings.ts`）は不要なので削除する。`SampleSettingTab` や `MyPluginSettings` は使わない。

### Milestone 3: ビルドと手動検証

1. `npm run build` を実行して `main.js` を生成する

2. ビルドが成功することを確認する（TypeScript エラー、esbuild エラーがないこと）

3. 手動検証手順:
    - Obsidian を再起動（または Community Plugins で Reading Annotation を無効→有効にする）
    - `40-raw/` 内の任意のファイルを開く
    - テキストを選択して右クリック → "Annotate" が表示されることを確認
    - クリックするとモーダルが開き、選択テキストのプレビュー、種類ドロップダウン、コメント入力欄が表示されることを確認
    - ドロップダウンで種類を選択し、コメントを入力して Submit → `42-annotation/{ファイル名}.md` が作成されることを確認
    - Cmd+Enter でも送信できることを確認
    - 空コメントで Submit → callout が空行で記録されることを確認
    - 同じファイルで別の箇所を選択してコメント → 既存のアノテーションファイルに `---` 区切りで追記されることを確認
    - コマンドパレット（Cmd+P）から "Reading Annotation: Annotate selection" で同じ操作ができることを確認
    - テキスト未選択でコマンドパレットから実行 → "Select text to annotate" の Notice が表示されることを確認

## Concrete Steps

作業ディレクトリ: `/Users/sotayamashita/Documents/personal/.obsidian/plugins/obsidian-reading-annotation/`

### Milestone 1

1. `manifest.json` を更新する（id, name, description, author）
2. `package.json` を更新する（name, description）
3. `tsconfig.json` を更新する（strict: true に統一）
4. `npm install` を実行する

期待される出力: npm install が成功し、node_modules が作成される。

### Milestone 2

1. `src/settings.ts` を削除する
2. `src/annotation-types.ts` を作成する
3. `src/annotation-modal.ts` を作成する
4. `src/annotation-writer.ts` を作成する
5. `src/main.ts` を書き換える

### Milestone 3

1. `npm run build` を実行する

期待される出力:

    > tsc -noEmit -skipLibCheck && node esbuild.config.mjs production

    main.js   XX.Xkb

    ✨ Done in Xs.

2. `main.js` と `manifest.json` がプラグインディレクトリのルートに存在することを確認する

3. 手動検証（上記の手順に従う）

## Validation and Acceptance

以下の振る舞いが確認できれば受け入れ完了とする:

1. ビルド成功: `npm run build` がエラーなく完了し、`main.js` が生成される

2. コンテキストメニュー: テキストを選択して右クリックすると「Annotate」が1項目表示される。テキスト未選択時には表示されない

3. コマンドパレット: Cmd+P で "Reading Annotation: Annotate selection" が表示される（エディタがアクティブな場合のみ）

4. テキスト未選択ガード: テキスト未選択でコマンド実行時、"Select text to annotate" の Notice が表示されモーダルは開かない

5. モーダル: メニュー項目をクリックするとモーダルが開き、選択テキストのプレビュー（200文字超は truncate）、種類ドロップダウン、コメント入力欄が表示される

6. 空コメント: コメント欄を空のまま Submit できる

7. キーボードショートカット: モーダル内で Cmd+Enter で送信できる

8. ファイル作成: 初回コメント時に `42-annotation/{ソースファイル名}.md` が frontmatter 付きで作成される

9. ファイル追記: 2回目以降のコメントは同じアノテーションファイルに `---` 区切りで追記される

10. フォーマット: アノテーションファイル内で素の blockquote（`>`）が元テキスト、typed callout（`> [!surprise]` 等）がユーザーの反応として明確に区別できる

## Idempotence and Recovery

- アノテーションファイルの作成・追記は冪等ではない（同じ選択テキストに同じコメントを複数回つけると重複する）。これは意図した動作であり、ユーザーが同じ箇所に複数の反応を記録するユースケースを想定している。
- `42-annotation/` ディレクトリが存在しない場合、`vault.create()` は中間ディレクトリを自動作成するため、手動でディレクトリを作成する必要はない。
- ビルドは `npm run build` で何度でも再実行できる。

## Artifacts and Notes

アノテーションファイルの完成形の例:

    ---
    source: "[[40-raw/LLM Output Length and Reasoning]]"
    date: 2026-04-06
    type: reading-annotation
    ---

    > LLM の出力長が推論精度に直接影響するという主張は、複数のベンチマークで検証されている。

    > [!surprise]
    > 長さ自体が精度に効くのは直感に反する。pruning の研究と矛盾しないか？

    ---

    > 著者は 3 つのベンチマークで検証した。サンプルサイズは各 50。

    > [!question]
    > サンプルサイズ 50 で十分か？再現性が気になる。

    ---

    > この手法は教育分野での応用が期待される。

    > [!resonance]
    > 自分の wiki-ingest ワークフローと相性が良さそう。

    ---

    > 実装コストが高いため、小規模チームには不向きだと著者は述べている。

    > [!caution]
    >

## Interfaces and Dependencies

### 依存関係

- `obsidian` — Obsidian プラグイン API（既に devDependencies に含まれている）
- 追加の外部依存関係は不要

### 型定義とインターフェース

`src/annotation-types.ts` で定義:

    interface AnnotationType {
      id: string;       // callout type として使用（"surprise", "resonance", "question", "caution"）
      label: string;    // UI 表示名（"Surprise", "Resonance", "Question", "Caution"）
      icon: string;     // Obsidian のアイコン名（Lucide icons）
    }

    const ANNOTATION_TYPES: readonly AnnotationType[];

`src/annotation-writer.ts` で定義:

    function writeAnnotation(
      vault: Vault,
      sourcePath: string,
      selectedText: string,
      annotationType: AnnotationType,
      comment: string,
    ): Promise<void>;

`src/annotation-modal.ts` で定義:

    class AnnotationModal extends Modal {
      constructor(
        app: App,
        selectedText: string,
        onSubmit: (annotationType: AnnotationType, comment: string) => void,
      );
    }
