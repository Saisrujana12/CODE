import { context } from "esbuild";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";

import { frontendBuildOptions } from "./esbuild.config.mjs";

await mkdir("public/assets", { recursive: true });
await rm("public/assets", { recursive: true, force: true });
await mkdir("public/assets", { recursive: true });

const buildContext = await context(frontendBuildOptions);
await buildContext.watch();

const serverProcess = spawn(
  process.execPath,
  ["server/index.js"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development"
    }
  }
);

const shutdown = async () => {
  serverProcess.kill("SIGINT");
  await buildContext.dispose();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
