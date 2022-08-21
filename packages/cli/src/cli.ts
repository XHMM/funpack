import { Command } from "commander";
import { run } from "./run.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const program = new Command();
program.version(pkg.version).option("--watch", "listen files change");

program.parse();

const options = program.opts();

if (options.watch) {
  run(true);
} else {
  run();
}
