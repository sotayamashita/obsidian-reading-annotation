import { constants, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve("e2e/config.json");
const examplePath = resolve("e2e/config.example.json");

if (existsSync(configPath)) {
	console.log(`Existing configuration preserved: ${configPath}`);
} else {
	copyFileSync(examplePath, configPath, constants.COPYFILE_EXCL);
	console.log(`Configuration created: ${configPath}`);
}
