import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";

import { frontendBuildOptions } from "./esbuild.config.mjs";

await mkdir("public/assets", { recursive: true });
await rm("public/assets", { recursive: true, force: true });
await mkdir("public/assets", { recursive: true });

await build(frontendBuildOptions);

console.log("Frontend bundle built into public/assets.");
