const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

function pointerFile() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    return path.join(portableDir, ".tesT-data-location.json");
  }
  return path.join(app.getPath("appData"), "TesT", "data-location.json");
}

function defaultDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    return path.join(portableDir, "TesTData");
  }
  return path.join(app.getPath("appData"), "TesT");
}

function savedDir() {
  try {
    const data = JSON.parse(fs.readFileSync(pointerFile(), "utf8"));
    return typeof data?.dataDir === "string" && data.dataDir
      ? path.resolve(data.dataDir)
      : null;
  } catch {
    return null;
  }
}

function saveDir(dataDir) {
  const resolved = path.resolve(dataDir);
  fs.mkdirSync(resolved, { recursive: true });
  fs.mkdirSync(path.dirname(pointerFile()), { recursive: true });
  fs.writeFileSync(
    pointerFile(),
    `${JSON.stringify({ dataDir: resolved }, null, 2)}\n`,
  );
  return resolved;
}

module.exports = {
  defaultDir,
  pointerFile,
  saveDir,
  savedDir,
};
