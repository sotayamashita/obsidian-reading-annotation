import { BLOCK_ID_PATTERN } from "annotation-writer";

export interface AnnotationEntry {
	quote: string;
	type: string;
	comment: string;
	blockId: string;
}

export function parseBlockquoteLine(line: string): string | null {
	if (line.startsWith("> ")) return line.slice(2);
	if (line === ">") return "";
	return null;
}

export function parseAnnotationFile(content: string): AnnotationEntry[] {
	// Normalize CRLF so all downstream "\n" logic works regardless of how the
	// file was saved (e.g. edited on Windows), otherwise the frontmatter regex
	// below fails to match and every annotation silently disappears.
	const normalized = content.replace(/\r\n/g, "\n");
	const bodyMatch = normalized.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
	if (!bodyMatch) return [];
	const body = bodyMatch[1]!;

	const blocks = body.split(/\n---\n/).filter((b) => /^>/m.test(b));
	const entries: AnnotationEntry[] = [];

	for (const block of blocks) {
		const lines = block.trim().split("\n");
		const quoteLines: string[] = [];
		let type = "";
		let blockId = "";
		const commentLines: string[] = [];
		// A block reads "quote lines (the last carrying the ^block-id) → blank
		// line → callout header → comment lines". Tracking the section keeps a
		// quote that itself starts with "[!word]" from being read as the header.
		let phase: "quote" | "header" | "comment" = "quote";

		for (const line of lines) {
			if (line.trim() === "") {
				if (phase === "quote") phase = "header";
				continue;
			}

			const parsed = parseBlockquoteLine(line);
			if (parsed === null) continue;

			if (phase === "comment") {
				commentLines.push(parsed);
				continue;
			}

			if (phase === "quote") {
				const blockIdMatch = parsed.match(BLOCK_ID_PATTERN);
				if (blockIdMatch) {
					blockId = blockIdMatch[1]!;
					quoteLines.push(parsed.replace(BLOCK_ID_PATTERN, ""));
					phase = "header";
				} else {
					quoteLines.push(parsed);
				}
				continue;
			}

			// phase === "header": the first "> [!type]" line is the callout header.
			const calloutMatch = parsed.match(/^\s*\[!(\w+)\].*$/);
			if (calloutMatch) {
				type = calloutMatch[1]!;
				phase = "comment";
			} else {
				quoteLines.push(parsed);
			}
		}

		entries.push({
			quote: quoteLines.join("\n").trim(),
			type,
			comment: commentLines.join("\n").trim(),
			blockId,
		});
	}

	return entries;
}
