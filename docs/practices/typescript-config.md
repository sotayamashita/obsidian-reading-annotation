# TypeScript設定

このプラグインはObsidianのブラウザー環境で動作し、esbuildでsrc/main.tsをmain.jsにまとめる。tsconfig.jsonはsrcの型チェックを担当する。

| 設定                       | 現在の用途                           |
| -------------------------- | ------------------------------------ |
| `baseUrl: "src"`           | 既存のモジュール名によるimportの解決 |
| `target: "ES2018"`         | Obsidian向けビルドとの一致           |
| `lib: ["DOM", "ES2018"]`   | DOMとプラグインの実行環境の型        |
| `module: "ESNext"`         | esbuildへのモジュール入力            |
| `moduleResolution: "node"` | 既存のimport形式の解決               |
| `strict: true`             | 厳密な型チェック                     |
| `include: ["src/**/*.ts"]` | プラグインと既存テストの検査         |

- `just typecheck`による既存の型チェックの実行
- esbuild.config.mjsとtsconfig.jsonのtargetの一致
- Node向け設定をプラグイン全体へ適用する前のDOMとimportの確認
- 型設定の変更時の`mise exec -- pnpm exec tsc --showConfig`による統合設定の確認

テンプレートのTypeScript 7とNode向け共通設定は、このプラグインの既存設定を置き換える変更として扱う。採用にはimportとObsidian API型の対応確認が必要となる。
