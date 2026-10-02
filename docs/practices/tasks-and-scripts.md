# 開発コマンド

人とエージェントの実行入口はjustfile、Nodeツールの実行内容はpackage.json、ツールのバージョンはmise.tomlで管理する。

| コマンド         | 用途                                |
| ---------------- | ----------------------------------- |
| `just setup`     | ツール、依存、Gitフックの準備       |
| `just dev`       | esbuildによる開発ビルドの監視       |
| `just build`     | 型チェックと本番ビルド              |
| `just check`     | Oxlintと整形の確認                  |
| `just fix`       | lintと整形の修正                    |
| `just typecheck` | プラグインの型チェック              |
| `just test`      | Vitestによるテスト                  |
| `just knip`      | 未使用コードと依存の検出            |
| `just jscpd`     | 10行以上の重複コードの検出          |
| `just mutation`  | Strykerによるミューテーションテスト |

- Nodeツールのコマンドのpackage.jsonへの定義
- package.jsonのscriptと同名のjustレシピの定義
- justレシピでの`mise exec --`の使用
- 複数ステップを実行する手順のjustfileへの定義
- hkによるGitフックとcommitlintによるコミットメッセージの検証

プラグインの成果物はmain.js、manifest.json、styles.css。main.jsはGitに追加せず、ビルドで生成する。
