import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import downloader from "../electron/update-downloader.cjs";

const { downloadWithResume, sha512File } = downloader;

test("update downloader resumes after an interrupted response", async () => {
  const payload = crypto.randomBytes(128 * 1024);
  const expectedHash = crypto
    .createHash("sha512")
    .update(payload)
    .digest("base64");
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests += 1;
    const range = request.headers.range;
    const start = range ? Number(/^bytes=(\d+)-/.exec(range)?.[1] || 0) : 0;
    if (requests === 1) {
      response.writeHead(200, {
        "Content-Length": String(payload.length),
        "Content-Type": "application/octet-stream",
      });
      response.write(payload.subarray(0, 24 * 1024));
      setTimeout(() => response.destroy(), 20);
      return;
    }
    response.writeHead(206, {
      "Content-Length": String(payload.length - start),
      "Content-Range": `bytes ${start}-${payload.length - 1}/${payload.length}`,
      "Content-Type": "application/octet-stream",
    });
    response.end(payload.subarray(start));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tesT-update-"));
  const target = path.join(directory, "TesT-Setup-test.exe");

  try {
    const result = await downloadWithResume({
      url: `http://127.0.0.1:${port}/TesT-Setup-test.exe`,
      target,
      sha512: expectedHash,
      size: payload.length,
      retries: 2,
      retryDelayMs: () => 10,
    });
    assert.equal(result.bytes, payload.length);
    assert.equal(await sha512File(target), expectedHash);
    assert.equal(requests >= 2, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("update downloader rejects a corrupt completed file", async () => {
  const payload = Buffer.from("not the expected installer");
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      "Content-Length": String(payload.length),
    });
    response.end(payload);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tesT-update-"));
  const target = path.join(directory, "TesT-Setup-test.exe");

  try {
    await assert.rejects(
      downloadWithResume({
        url: `http://127.0.0.1:${port}/TesT-Setup-test.exe`,
        target,
        sha512: "wrong-hash",
        size: payload.length,
        retries: 0,
        retryDelayMs: () => 0,
      }),
      /SHA512/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
