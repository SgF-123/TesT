const fs = require("node:fs");
const path = require("node:path");

const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;
const MARGIN = 24;

function load(file, workArea) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8")) || {};
  } catch {
    data = {};
  }

  const bounds = workArea || {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  };
  const maxWidth = Math.max(MIN_WIDTH, bounds.width - MARGIN * 2);
  const maxHeight = Math.max(MIN_HEIGHT, bounds.height - MARGIN * 2);
  const rawWidth = Number(data.width);
  const rawHeight = Number(data.height);
  let width = rawWidth;
  let height = rawHeight;
  if (!Number.isFinite(width) || width < MIN_WIDTH) {
    width = Math.min(1440, maxWidth);
  }
  if (!Number.isFinite(height) || height < MIN_HEIGHT) {
    height = Math.min(900, maxHeight);
  }
  width = Math.min(Math.round(width), maxWidth);
  height = Math.min(Math.round(height), maxHeight);

  let x = Number(data.x);
  let y = Number(data.y);
  const probeWidth = Number.isFinite(rawWidth) ? rawWidth : width;
  const probeHeight = Number.isFinite(rawHeight) ? rawHeight : height;
  const inside =
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= bounds.x &&
    y >= bounds.y &&
    x + probeWidth <= bounds.x + bounds.width &&
    y + probeHeight <= bounds.y + bounds.height;
  if (!inside) {
    x = bounds.x + Math.round((bounds.width - width) / 2);
    y = bounds.y + Math.round((bounds.height - height) / 2);
  }

  return {
    width,
    height,
    x: Math.round(x),
    y: Math.round(y),
    maximized: Boolean(data.maximized),
  };
}

function attach(win, file) {
  let timer = null;
  const save = () => {
    try {
      const bounds = win.getBounds();
      const data = {
        ...bounds,
        maximized: win.isMaximized(),
        savedAt: new Date().toISOString(),
      };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        `${JSON.stringify(data, null, 2)}\n`,
        "utf8",
      );
    } catch {
      // Window state is best-effort.
    }
  };
  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      save();
    }, 500);
  };
  win.on("resize", schedule);
  win.on("move", schedule);
  win.on("maximize", schedule);
  win.on("unmaximize", schedule);
  win.on("close", save);
  return save;
}

module.exports = { attach, load };
