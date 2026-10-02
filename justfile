set positional-arguments

# 利用可能なコマンドの表示
default:
    @just --list

# 依存とhkフックのインストール
setup: install-tools install-deps install-hooks

# 開発ツールのインストール
install-tools:
    mise install

# 依存のインストール
install-deps:
    mise exec -- pnpm install

# hkフックのインストール
install-hooks:
    mise exec -- hk install --mise

# 開発ビルドの監視
dev *args:
    mise exec -- pnpm dev "$@"

# 本番ビルド
build *args:
    mise exec -- pnpm build "$@"

# lintと整形の確認
check *args:
    mise exec -- pnpm check "$@"

# lintと整形の修正
fix *args:
    mise exec -- pnpm fix "$@"

# 型チェック
typecheck *args:
    mise exec -- pnpm typecheck "$@"

# テスト
test *args:
    mise exec -- pnpm test "$@"

# 未使用コードの検出
knip *args:
    mise exec -- pnpm knip "$@"

# 重複コードの検出
jscpd *args:
    mise exec -- pnpm jscpd "$@"

# ミューテーションテスト
mutation *args:
    mise exec -- pnpm mutation "$@"
