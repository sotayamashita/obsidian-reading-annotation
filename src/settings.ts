import { type App, normalizePath, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import { ANNOTATION_DIR } from "annotation-types";
import type ReadingAnnotationPlugin from "main";

export function normalizeAnnotationDirectory(value: unknown): string {
	if (typeof value !== "string" || value.trim() === "") return ANNOTATION_DIR;

	const path = value.trim().replace(/\\/g, "/");
	if (
		path.startsWith("/") ||
		/[:*?"<>|]/.test(path) ||
		[...path].some((character) => character.charCodeAt(0) < 32) ||
		path.split("/").some((part) => part === "." || part === "..")
	) {
		throw new Error("Enter a folder path relative to the vault.");
	}

	return normalizePath(path);
}

export class AnnotationSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: ReadingAnnotationPlugin,
	) {
		super(app, plugin);
	}

	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Annotation folder location",
				desc: "Annotations will be saved in this folder.",
				control: {
					type: "folder",
					key: "annotationDirectory",
					placeholder: ANNOTATION_DIR,
					validate: (value) => {
						try {
							normalizeAnnotationDirectory(value);
							return undefined;
						} catch (error) {
							return error instanceof Error ? error.message : "Invalid folder path.";
						}
					},
				},
			},
		];
	}

	override getControlValue(_key: string): string {
		return this.plugin.annotationDirectory;
	}

	override setControlValue(_key: string, value: unknown): Promise<void> {
		return this.plugin.setAnnotationDirectory(value);
	}
}
