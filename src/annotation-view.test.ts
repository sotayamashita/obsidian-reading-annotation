import { describe, expect, it } from "vitest";
import { truncateQuote } from "annotation-view";

describe("truncateQuote", () => {
	it("returns the quote unchanged when under the limit", () => {
		expect(truncateQuote("短い引用です。", 150)).toBe("短い引用です。");
	});

	it("cuts at the nearest Japanese sentence boundary before the limit", () => {
		const q = "一文目です。二文目はここで終わる。三文目はもっと長い内容が続いていく文章です。";
		const result = truncateQuote(q, 20);
		expect(result).toBe("一文目です。二文目はここで終わる。…");
	});

	it("cuts at the nearest English sentence boundary before the limit", () => {
		const q = "First sentence. Second sentence here. Third runs on and on and on.";
		const result = truncateQuote(q, 40);
		expect(result).toBe("First sentence. Second sentence here.…");
	});

	it("falls back to hard cut when no sentence boundary exists before the limit", () => {
		const q = "a".repeat(200);
		const result = truncateQuote(q, 50);
		expect(result).toBe("a".repeat(50) + "…");
	});

	it("prefers the latest boundary that still fits", () => {
		const q = "あ。い。う。え。お。か。き。く。け。こ。";
		const result = truncateQuote(q, 10);
		expect(result).toBe("あ。い。う。え。お。…");
	});

	it("closes dangling bold marker when the cut lands mid-emphasis", () => {
		const q = "これは **とても重要な ".repeat(20);
		const result = truncateQuote(q, 15);
		const withoutEllipsis = result.replace(/…$/, "");
		const markers = withoutEllipsis.match(/\*\*/g) ?? [];
		expect(markers.length % 2).toBe(0);
	});

	it("leaves paired bold markers alone", () => {
		const q = "前置き **強調** です。" + "x".repeat(200);
		const result = truncateQuote(q, 30);
		const withoutEllipsis = result.replace(/…$/, "");
		const markers = withoutEllipsis.match(/\*\*/g) ?? [];
		expect(markers.length % 2).toBe(0);
	});
});
