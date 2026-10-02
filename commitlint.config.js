/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"header-max-length": [2, "always", 72],
		"no-github-mentions": [2, "always"],
	},
	plugins: [
		{
			rules: {
				"no-github-mentions": ({ raw }) => {
					// メール、コード範囲、スコープ付きパッケージ名を除外。
					const mentionPattern =
						/(?<![\w.+-]|`[^`]*)@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?![\w/-])/gu;
					const matches = raw.match(mentionPattern);

					if (matches) {
						return [
							false,
							`Commit message contains GitHub mentions: ${matches.join(", ")}. ` +
								"Please remove or escape @ symbols to avoid unintended notifications.",
						];
					}

					return [true];
				},
			},
		},
	],
};
