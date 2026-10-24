const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(url, headers, redirects = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      reject(new Error("更新地址必须是 http/https"));
      return;
    }
    const client = parsed.protocol === "http:" ? http : https;
    const req = client.get(parsed, { headers }, (response) => {
      if (
        REDIRECT_CODES.has(response.statusCode) &&
        response.headers.location &&
        redirects < 8
      ) {
        response.resume();
        resolve(
          request(
            new URL(response.headers.location, parsed).toString(),
            headers,
            redirects + 1,
          ),
        );
        return;
      }
      resolve(response);
    });
    req.setTimeout(30_000, () => {
      req.destroy(new Error("连接超时"));
    });
    req.on("error", reject);
  });
}

function sha512File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha512");
    const stream = fs.createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("base64")));
  });
}

async function downloadWithResume({
  url,
  target,
  sha512,
  size,
  onProgress = () => {},
  onRetry = () => {},
  log = () => {},
  retries = 6,
  retryDelayMs = (attempt) => Math.min(8_000, 800 * 2 ** attempt),
}) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let existing = fs.existsSync(target) ? fs.statSync(target).size : 0;
    if (size && existing > size) {
      fs.rmSync(target, { force: true });
      existing = 0;
    }

    if (size && existing === size) {
      if (
        !sha512 ||
        (await sha512File(target)) === sha512
      ) {
        onProgress({ received: existing, total: size, percent: 100 });
        return { path: target, bytes: existing };
      }
      fs.rmSync(target, { force: true });
      existing = 0;
    }

    try {
      const headers = {
        "User-Agent": "TesT updater",
        Accept: "application/octet-stream",
      };
      if (existing > 0) {
        headers.Range = `bytes=${existing}-`;
      }
      const response = await request(url, headers);

      if (
        response.statusCode === 416 &&
        existing > 0
      ) {
        response.resume();
        fs.rmSync(target, { force: true });
        throw new Error("断点位置无效，将重新下载");
      }
      if (
        response.statusCode !== 200 &&
        response.statusCode !== 206
      ) {
        response.resume();
        throw new Error(`下载失败：HTTP ${response.statusCode}`);
      }

      const append = existing > 0 && response.statusCode === 206;
      if (!append) {
        existing = 0;
      }
      const contentLength = Number(response.headers["content-length"] || 0);
      const total = size || (contentLength ? existing + contentLength : 0);
      let received = existing;

      const file = fs.createWriteStream(target, {
        flags: append ? "a" : "w",
      });
      response.on("data", (chunk) => {
        received += chunk.length;
        const percent = total
          ? Math.min(100, Math.round((received / total) * 100))
          : 0;
        onProgress({ received, total, percent });
      });
      await pipeline(response, file);

      const actualSize = fs.statSync(target).size;
      if (size && actualSize !== size) {
        throw new Error(
          `下载不完整：${actualSize}/${size} 字节`,
        );
      }
      if (sha512) {
        const actualHash = await sha512File(target);
        if (actualHash !== sha512) {
          fs.rmSync(target, { force: true });
          throw new Error("安装包 SHA512 校验失败");
        }
      }
      onProgress({
        received: actualSize,
        total: size || actualSize,
        percent: 100,
      });
      return { path: target, bytes: actualSize };
    } catch (error) {
      lastError = error;
      log(`download:retry ${attempt + 1}/${retries + 1} ${error.message}`);
      if (attempt >= retries) {
        break;
      }
      const wait = retryDelayMs(attempt);
      onRetry({
        attempt: attempt + 1,
        retries,
        wait,
        error: String(error?.message || error),
      });
      await delay(wait);
    }
  }

  throw lastError || new Error("更新下载失败");
}

module.exports = {
  downloadWithResume,
  sha512File,
};
