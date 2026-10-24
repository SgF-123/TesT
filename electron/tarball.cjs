const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// GNU tar (shipped by Git for Windows / msys) reads a `C:\...` operand as a
// remote host spec and dies with "Cannot connect to C: resolve failed", so a
// shell that puts msys ahead of System32 breaks the kernel download. Prefer the
// tar that ships with Windows, and always hand tar relative paths.
function tarExecutable() {
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    const systemTar = path.join(systemRoot, "System32", "tar.exe");
    if (fs.existsSync(systemTar)) {
      return systemTar;
    }
  }
  return "tar";
}

function relativeFrom(base, target) {
  const relative = path.relative(base, target);
  return relative || ".";
}

function extractTarball(tarball, target) {
  fs.mkdirSync(target, { recursive: true });
  const cwd = path.dirname(tarball);
  execFileSync(
    tarExecutable(),
    ["-xzf", path.basename(tarball), "-C", relativeFrom(cwd, target)],
    { cwd, windowsHide: true, stdio: "ignore" },
  );
}

module.exports = { extractTarball, tarExecutable };
