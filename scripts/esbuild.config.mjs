export const frontendBuildOptions = {
  entryPoints: ["frontend/src/main.jsx"],
  bundle: true,
  jsx: "automatic",
  sourcemap: true,
  target: ["es2020"],
  outdir: "public/assets",
  entryNames: "app",
  assetNames: "asset-[name]-[hash]",
  loader: {
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".svg": "file",
    ".webp": "file"
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production")
  }
};
