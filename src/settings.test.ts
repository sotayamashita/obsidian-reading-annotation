import { describe, expect, it } from "vitest";
import { normalizeAnnotationDirectory } from "settings";

describe("annotation directory setting", () => {
	it.each([undefined, null, "", "   "])("uses the existing default for %s", (value) => {
		expect(normalizeAnnotationDirectory(value)).toBe("annotation");
	});

	it("normalizes a nested vault path", () => {
		expect(normalizeAnnotationDirectory(" Reading//Annotations/ ")).toBe("Reading/Annotations");
		expect(normalizeAnnotationDirectory("Reading\\Annotations")).toBe("Reading/Annotations");
	});

	it.each(["/tmp/notes", "../notes", "notes/../other", "./notes", "C:\\notes", "notes?"])(
		"rejects an invalid directory: %s",
		(path) => {
			expect(() => normalizeAnnotationDirectory(path)).toThrow();
		},
	);
});
