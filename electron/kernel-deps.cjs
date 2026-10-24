const fs = require("node:fs");
const path = require("node:path");

// The published Pi bundle keeps these dependencies external because it loads
// them lazily at runtime (jiti compiles TypeScript extensions on the fly).
// npm tarballs ship without node_modules, so unpacking the tarball alone
// cannot resolve them.
const RUNTIME_DEPENDENCIES = ["jiti"];

// Copy the app's vendored copies of those dependencies into the kernel, so the
// kernel also resolves them through plain Node resolution no matter where the
// app points NODE_PATH. Best-effort: a missing vendor folder leaves the
// NODE_PATH fallback in charge.
function stageRuntimeDependencies(packageTarget, vendorDir) {
  if (!vendorDir || !fs.existsSync(vendorDir)) {
    return [];
  }
  const nodeModules = path.join(packageTarget, "node_modules");
  const staged = [];
  for (const name of RUNTIME_DEPENDENCIES) {
    const source = path.join(vendorDir, name);
    if (!fs.existsSync(source)) {
      continue;
    }
    fs.mkdirSync(nodeModules, { recursive: true });
    const destination = path.join(nodeModules, name);
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(source, destination, { recursive: true });
    staged.push(name);
  }
  return staged;
}

module.exports = { RUNTIME_DEPENDENCIES, stageRuntimeDependencies };
