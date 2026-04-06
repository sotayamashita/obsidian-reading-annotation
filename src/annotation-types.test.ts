import { describe, expect, it } from "vitest";
import { isAnnotationPath } from "annotation-types";

describe("isAnnotationPath", () => {
	it("returns true for paths inside annotation directory", () => {
		expect(isAnnotationPath("42-annotation/Article.md")).toBe(true);
	});

	it("returns false for regular source file paths", () => {
		expect(isAnnotationPath("40-raw/Article.md")).toBe(false);
	});
});
