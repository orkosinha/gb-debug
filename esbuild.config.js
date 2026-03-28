import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir    = path.join(__dirname, "dist");
const distPkgDir = path.join(distDir, "pkg");
const pkgDir     = path.join(__dirname, "node_modules", "@orkosinha", "gb-emu");

if (!fs.existsSync(distDir))    fs.mkdirSync(distDir,    { recursive: true });
if (!fs.existsSync(distPkgDir)) fs.mkdirSync(distPkgDir, { recursive: true });

// Copy WASM package files from node_modules to dist/pkg
const pkgFiles = ["gb_emu_bg.wasm", "gb_emu.js", "gb_emu.d.ts", "gb_emu_bg.wasm.d.ts"];
for (const file of pkgFiles) {
  const src  = path.join(pkgDir, file);
  const dest = path.join(distPkgDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to dist/pkg/`);
  }
}

fs.copyFileSync(path.join(__dirname, "index.html"), path.join(distDir, "index.html"));

esbuild
  .build({
    entryPoints: [path.join(__dirname, "src", "main.js")],
    bundle: true,
    outfile: path.join(distDir, "debug-bundle.js"),
    format: "esm",
    platform: "browser",
    target: ["es2020"],
    minify: false,
    sourcemap: true,
    external: ["./pkg/gb_emu.js"],
  })
  .then(() => console.log("Built debug-bundle.js"))
  .catch((err) => { console.error("Build failed:", err); process.exit(1); });
