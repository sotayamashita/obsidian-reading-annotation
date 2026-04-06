import { describe, expect, it } from "vitest";
import { resolveTypeByKey } from "annotation-shortcut";

describe("resolveTypeByKey", () => {
	it("returns surprise for key '1'", () => {
		const result = resolveTypeByKey("1", false);
		expect(result).not.toBeNull();
		expect(result!.id).toBe("surprise");
	});

	it("returns resonance for key '2'", () => {
		const result = resolveTypeByKey("2", false);
		expect(result).not.toBeNull();
		expect(result!.id).toBe("resonance");
	});

	it("returns question for key '3'", () => {
		const result = resolveTypeByKey("3", false);
		expect(result).not.toBeNull();
		expect(result!.id).toBe("question");
	});

	it("returns caution for key '4'", () => {
		const result = resolveTypeByKey("4", false);
		expect(result).not.toBeNull();
		expect(result!.id).toBe("caution");
	});

	it("returns null for out-of-range key '5'", () => {
		expect(resolveTypeByKey("5", false)).toBeNull();
	});

	it("returns null for non-numeric key 'a'", () => {
		expect(resolveTypeByKey("a", false)).toBeNull();
	});

	it("returns null when textarea is focused", () => {
		expect(resolveTypeByKey("1", true)).toBeNull();
		expect(resolveTypeByKey("3", true)).toBeNull();
	});
});
