import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("server exits with a clear message when the application id is missing", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "HOUJIN_BANGOU_API_APPLICATION_ID"),
    ),
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Missing HOUJIN_BANGOU_API_APPLICATION_ID/,
  );
});
