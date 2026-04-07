import { describe, expect, it } from "vitest";
import { mapNormalizedRange, normalizeWhitespace } from "text-match";

describe("mapNormalizedRange", () => {
	it("maps positions correctly when text has no whitespace", () => {
		const text = "abcdef";
		const range = mapNormalizedRange(text, 2, 5);
		expect(range).toEqual({ from: 2, to: 5 });
	});

	it("maps positions correctly when text has leading whitespace", () => {
		// Original "  abc", normalized "abc"
		// Match "abc" → normalized [0, 3) → original [2, 5)
		const text = "  abc";
		const normalized = normalizeWhitespace(text);
		expect(normalized).toBe("abc");
		const range = mapNormalizedRange(text, 0, 3);
		expect(range).toEqual({ from: 2, to: 5 });
	});

	it("maps positions correctly when text has trailing whitespace", () => {
		// Original "abc  ", normalized "abc"
		// Match "abc" → normalized [0, 3) → original [0, 3)
		const text = "abc  ";
		const normalized = normalizeWhitespace(text);
		expect(normalized).toBe("abc");
		const range = mapNormalizedRange(text, 0, 3);
		expect(range).toEqual({ from: 0, to: 3 });
	});

	it("maps positions correctly when match starts after a multi-char whitespace run", () => {
		// Original "abc   def", normalized "abc def"
		// Match "def" → normalized [4, 7) → original [6, 9)
		const text = "abc   def";
		const normalized = normalizeWhitespace(text);
		expect(normalized).toBe("abc def");
		const range = mapNormalizedRange(text, 4, 7);
		expect(range).toEqual({ from: 6, to: 9 });
	});

	it("maps positions correctly when text has leading newline before match", () => {
		// Mimics Obsidian rendering with leading newline before paragraph text
		const text = "\n2025年は。2026年は。";
		const normalized = normalizeWhitespace(text);
		expect(normalized).toBe("2025年は。2026年は。");
		// "2025年は。" = 7 chars, "2026年は。" starts at normalized position 7
		const matchIdx = normalized.indexOf("2026年は。");
		expect(matchIdx).toBe(7);
		const range = mapNormalizedRange(text, matchIdx, matchIdx + "2026年は。".length);
		// "2026年は。" is at original position 8 (after \n + "2025年は。"), length 7
		expect(range).toEqual({ from: 8, to: 15 });
	});
});
