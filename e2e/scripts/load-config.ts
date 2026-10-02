import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, parse, resolve } from "node:path";

interface Config {
	obsidianCommand: string;
	obsidianVaultPath: string;
	reportDir: string;
	caseDir: string;
}

function readConfig(repositoryPath: string): Config {
	const configPath = resolve(repositoryPath, "e2e/config.json");
	const config = JSON.parse(readFileSync(configPath, "utf8")) as Config;
	const requiredFields = [
		"obsidianCommand",
		"obsidianVaultPath",
		"reportDir",
		"caseDir",
	] as const;

	for (const field of requiredFields) {
		const value = config[field];
		assert.equal(typeof value, "string", `${field}: expected a string`);
		assert.ok(value.trim(), `${field}: expected a non-empty value`);
		assert.ok(!/[\r\n]/.test(value), `${field}: line breaks are not allowed`);
	}

	const command = config.obsidianCommand;
	const isCommandName = !command.includes("/");
	assert.ok(
		isCommandName || isAbsolute(command),
		"obsidianCommand: use a command name or an absolute executable path",
	);

	const vaultPath = config.obsidianVaultPath;
	assert.ok(isAbsolute(vaultPath), "obsidianVaultPath: use an absolute path");
	assert.notEqual(
		resolve(vaultPath),
		parse(vaultPath).root,
		"obsidianVaultPath: the filesystem root cannot be a test vault",
	);
	assert.notEqual(
		vaultPath,
		"/absolute/path/to/reading-annotation-test",
		"obsidianVaultPath: replace the example with your test vault path",
	);

	for (const field of ["reportDir", "caseDir"] as const) {
		const directory = config[field];
		assert.ok(!isAbsolute(directory), `${field}: use a path relative to the repository`);
		assert.ok(
			!directory.split("/").includes(".."),
			`${field}: parent traversal is not allowed`,
		);
	}

	const caseDirectory = resolve(repositoryPath, config.caseDir);
	assert.ok(statSync(caseDirectory).isDirectory(), "caseDir: expected an existing directory");

	return config;
}

function readPluginId(repositoryPath: string): string {
	const manifestPath = resolve(repositoryPath, "manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const pluginId = manifest.id;

	assert.equal(typeof pluginId, "string", "manifest.id: expected a string");
	assert.ok(
		pluginId && !/[\r\n]/.test(pluginId),
		"manifest.id: expected a non-empty single line",
	);

	return pluginId;
}

const repositoryPath = process.cwd();
const config = readConfig(repositoryPath);
const pluginId = readPluginId(repositoryPath);

// Keep this order in sync with the Bash read block in e2e/scripts/session.sh.
// Standard output contains only these values so paths are never evaluated as shell code.
const shellValues = [
	repositoryPath,
	config.obsidianCommand,
	config.obsidianVaultPath,
	basename(config.obsidianVaultPath),
	resolve(repositoryPath, config.reportDir),
	resolve(repositoryPath, config.caseDir),
	pluginId,
];

console.log(shellValues.join("\n"));
