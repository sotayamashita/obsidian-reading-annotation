const WHITESPACE = /\s+/g;
const SINGLE_WHITESPACE = /\s/;

export function normalizeWhitespace(text: string): string {
	return text.replace(WHITESPACE, " ").trim();
}

function isWhitespace(char: string): boolean {
	return SINGLE_WHITESPACE.test(char);
}

/**
 * Builds a position map: walks `original` and produces an array `pos` of length
 * `normalized.length + 1`, where `pos[i]` is the original index corresponding to
 * the i-th normalized character. `pos[normalized.length]` is the original index
 * just past the last non-trailing-whitespace character.
 *
 * Internal whitespace runs collapse to a single space at the original position
 * of the first whitespace char in the run. Leading/trailing whitespace is skipped.
 */
function buildPositionMap(original: string): number[] {
	const pos: number[] = [];
	let i = 0;

	while (i < original.length && isWhitespace(original[i]!)) i++;

	while (i < original.length) {
		if (isWhitespace(original[i]!)) {
			let j = i;
			while (j < original.length && isWhitespace(original[j]!)) j++;
			if (j === original.length) break;
			pos.push(i);
			i = j;
		} else {
			pos.push(i);
			i++;
		}
	}
	pos.push(i);
	return pos;
}

export function mapNormalizedRange(
	originalText: string,
	normalizedStart: number,
	normalizedEnd: number,
): { from: number; to: number } | null {
	const pos = buildPositionMap(originalText);
	const maxNormalized = pos.length - 1;
	if (normalizedStart < 0 || normalizedEnd > maxNormalized || normalizedStart > normalizedEnd) {
		return null;
	}
	return { from: pos[normalizedStart]!, to: pos[normalizedEnd]! };
}

/**
 * Find every occurrence of `normalizedQuote` within `normalizedDoc` and map each
 * back to an original-text range (shifted by `offset`). Shared by the editor
 * decorations and the reading-mode post-processor so the match semantics stay
 * in one place.
 */
export function findQuoteRanges(
	normalizedDoc: string,
	docText: string,
	normalizedQuote: string,
	offset: number,
): Array<{ from: number; to: number }> {
	const ranges: Array<{ from: number; to: number }> = [];

	let searchFrom = 0;
	while (searchFrom < normalizedDoc.length) {
		const matchIndex = normalizedDoc.indexOf(normalizedQuote, searchFrom);
		if (matchIndex === -1) break;

		const originalRange = mapNormalizedRange(
			docText,
			matchIndex,
			matchIndex + normalizedQuote.length,
		);

		if (originalRange) {
			ranges.push({
				from: originalRange.from + offset,
				to: originalRange.to + offset,
			});
		}

		searchFrom = matchIndex + normalizedQuote.length;
	}

	return ranges;
}
