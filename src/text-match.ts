const WHITESPACE = /\s+/g;

export function normalizeWhitespace(text: string): string {
	return text.replace(WHITESPACE, " ").trim();
}

function isWhitespace(char: string): boolean {
	return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}

export function mapNormalizedRange(
	originalText: string,
	normalizedStart: number,
	normalizedEnd: number,
): { from: number; to: number } | null {
	let normalizedPos = 0;
	let originalPos = 0;
	let from = -1;
	let to = -1;

	while (originalPos <= originalText.length && normalizedPos <= normalizedEnd) {
		if (normalizedPos === normalizedStart && from === -1) {
			from = originalPos;
		}
		if (normalizedPos === normalizedEnd && to === -1) {
			to = originalPos;
			break;
		}

		if (originalPos < originalText.length) {
			const char = originalText[originalPos]!;
			if (isWhitespace(char)) {
				if (originalPos === 0 || !isWhitespace(originalText[originalPos - 1]!)) {
					normalizedPos++;
				}
			} else {
				normalizedPos++;
			}
		}
		originalPos++;
	}

	if (from === -1 || to === -1) return null;
	return { from, to };
}
