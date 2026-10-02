import { describe, expect, it } from "vitest";
import { isAnnotationPath } from "annotation-types";

describe("isAnnotationPath", () => {
	it("matches only files inside the configured folder", () => {
		expect(isAnnotationPath("Reading/Annotations/Article.md", "Reading/Annotations")).toBe(
			true,
		);
		expect(isAnnotationPath("Reading/Annotations-old/Article.md", "Reading/Annotations")).toBe(
			false,
		);
		expect(isAnnotationPath("annotation/Article.md", "Reading/Annotations")).toBe(false);
	});

	it("returns true for paths inside annotation directory", () => {
		expect(isAnnotationPath("annotation/Article.md")).toBe(true);
	});

	it("returns false for regular source file paths", () => {
		expect(isAnnotationPath("40-raw/Article.md")).toBe(false);
	});
});
