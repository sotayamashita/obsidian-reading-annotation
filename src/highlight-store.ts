import { TFile, type Vault } from "obsidian";
import { getAnnotationPath } from "annotation-writer";
import { type AnnotationEntry, parseAnnotationFile } from "annotation-view";

export interface HighlightStore {
	getAnnotations(sourcePath: string): AnnotationEntry[];
	refreshForPath(sourcePath: string): Promise<void>;
	onDidChange(listener: () => void): () => void;
}

function entriesEqual(a: AnnotationEntry[], b: AnnotationEntry[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const ea = a[i]!;
		const eb = b[i]!;
		if (
			ea.quote !== eb.quote ||
			ea.type !== eb.type ||
			ea.comment !== eb.comment ||
			ea.blockId !== eb.blockId
		)
			return false;
	}
	return true;
}

export function createHighlightStore(vault: Vault): HighlightStore {
	const cache = new Map<string, AnnotationEntry[]>();
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) {
			listener();
		}
	}

	return {
		getAnnotations(sourcePath: string): AnnotationEntry[] {
			return cache.get(sourcePath) ?? [];
		},

		async refreshForPath(sourcePath: string): Promise<void> {
			const annotationPath = getAnnotationPath(sourcePath);
			const file = vault.getAbstractFileByPath(annotationPath);

			if (!(file instanceof TFile)) {
				const hadEntries = cache.has(sourcePath);
				cache.delete(sourcePath);
				if (hadEntries) notify();
				return;
			}

			const content = await vault.cachedRead(file);
			const entries = parseAnnotationFile(content);
			const previous = cache.get(sourcePath);

			if (previous && entriesEqual(previous, entries)) return;

			cache.set(sourcePath, entries);
			notify();
		},

		onDidChange(listener: () => void): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
