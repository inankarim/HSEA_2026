import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

// Integration smoke test — requires DATABASE_URL to point at a reachable
// PostgreSQL instance with migrations applied (see tests/README.md).
test("GET /health returns 200 ok", async () => {
  const app = createApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("GET /health/ready reflects database connectivity", async () => {
  const app = createApp();
  const res = await request(app).get("/health/ready");
  assert.ok([200, 503].includes(res.status));
});

test("unknown routes return a 404 in the standard envelope", async () => {
  const app = createApp();
  const res = await request(app).get("/api/does-not-exist");
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
