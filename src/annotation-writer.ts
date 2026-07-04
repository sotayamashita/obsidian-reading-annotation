import { TFile, type Vault } from "obsidian";
import { ANNOTATION_DIR, type AnnotationType } from "annotation-types";

export const BLOCK_ID_PREFIX = "ann-";
export const BLOCK_ID_PATTERN = /\s\^(ann-[a-z0-9]+)$/;
export const CALLOUT_HEADER_PATTERN = /^(>\s*)\[!(\w+)\].*/m;

export function generateBlockId(text: string): string {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash |= 0;
	}
	return `${BLOCK_ID_PREFIX}${Math.abs(hash).toString(36)}`;
}

const BLOCK_ID_SCAN_PATTERN = /\^(ann-[a-z0-9]+)/g;

export function extractBlockIds(content: string): Set<string> {
	const ids = new Set<string>();
	for (const match of content.matchAll(BLOCK_ID_SCAN_PATTERN)) {
		ids.add(match[1]!);
	}
	return ids;
}

/**
 * Make a block id unique within a file. generateBlockId hashes the quote text,
 * so identical (or hash-colliding) selections would otherwise share an id —
 * which makes a single type change rewrite all of them and `#^id` deep links
 * ambiguous. When the base id is taken, append a base36 suffix until it is free.
 */
export function ensureUniqueBlockId(baseId: string, existingIds: Set<string>): string {
	if (!existingIds.has(baseId)) return baseId;
	for (let n = 2; ; n++) {
		const candidate = `${baseId}${n.toString(36)}`;
		if (!existingIds.has(candidate)) return candidate;
	}
}

export function extractAnnotationSource(content: string): string | null {
	const match = content.match(/^source:\s*"\[\[([^\]]+)\]\]"/m);
	return match ? match[1]! : null;
}

export function getAnnotationPath(sourcePath: string): string {
	const fileName = sourcePath.split("/").pop() ?? sourcePath;
	return `${ANNOTATION_DIR}/${fileName}`;
}

export function toBlockquote(text: string): string {
	return text
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
}

export function formatEntry(
	selectedText: string,
	annotationType: AnnotationType,
	comment: string,
	blockId: string = generateBlockId(selectedText),
): string {
	const quotedLines = toBlockquote(selectedText).split("\n");
	// Attach the block id to the last non-empty quote line. A selection that
	// ends in a newline yields a trailing "> " line, and a block ref on a blank
	// line is not a valid Obsidian block-reference target — so drop those first.
	while (quotedLines.length > 1 && quotedLines[quotedLines.length - 1] === "> ") {
		quotedLines.pop();
	}
	const lastIdx = quotedLines.length - 1;
	quotedLines[lastIdx] = `${quotedLines[lastIdx] ?? ""} ^${blockId}`;
	const withBlockId = quotedLines.join("\n");

	const calloutHeader = `> [!${annotationType.id}] ${annotationType.label}`;
	const calloutBody = comment.trim() === "" ? ">" : toBlockquote(comment);

	return `${withBlockId}\n\n${calloutHeader}\n${calloutBody}`;
}

export function formatFrontmatter(sourcePath: string): string {
	const sourceWithoutExt = sourcePath.replace(/\.md$/, "");
	const date = new Date().toISOString().slice(0, 10);
	return `---\nsource: "[[${sourceWithoutExt}]]"\ndate: ${date}\ntype: reading-annotation\n---`;
}

async function appendUniqueEntry(
	vault: Vault,
	file: TFile,
	sourcePath: string,
	selectedText: string,
	annotationType: AnnotationType,
	comment: string,
): Promise<void> {
	const existingContent = await vault.read(file);
	// Detect a filename collision: the annotation file already belongs to a
	// different source note (same basename, different folder). Appending would
	// interleave two notes' annotations into one file, so refuse instead.
	const owner = extractAnnotationSource(existingContent);
	const current = sourcePath.replace(/\.md$/, "");
	if (owner !== null && owner !== current) {
		throw new Error(
			`Annotation file "${file.path}" already belongs to a different note ("${owner}"). ` +
				`Rename one of the same-named notes to annotate this one.`,
		);
	}
	const blockId = ensureUniqueBlockId(
		generateBlockId(selectedText),
		extractBlockIds(existingContent),
	);
	const entry = formatEntry(selectedText, annotationType, comment, blockId);
	await vault.append(file, `\n\n---\n\n${entry}`);
}

export async function writeAnnotation(
	vault: Vault,
	sourcePath: string,
	selectedText: string,
	annotationType: AnnotationType,
	comment: string,
): Promise<void> {
	const annotationPath = getAnnotationPath(sourcePath);
	const existing = vault.getAbstractFileByPath(annotationPath);

	if (existing instanceof TFile) {
		await appendUniqueEntry(vault, existing, sourcePath, selectedText, annotationType, comment);
		return;
	}

	try {
		await vault.createFolder(ANNOTATION_DIR);
	} catch {
		// folder already exists
	}

	const content = `${formatFrontmatter(sourcePath)}\n\n${formatEntry(selectedText, annotationType, comment)}`;
	try {
		await vault.create(annotationPath, content);
	} catch {
		const file = vault.getAbstractFileByPath(annotationPath);
		if (file instanceof TFile) {
			await appendUniqueEntry(vault, file, sourcePath, selectedText, annotationType, comment);
		} else {
			throw new Error(`Failed to create or append to ${annotationPath}`);
		}
	}
}
