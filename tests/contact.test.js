const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync(require.resolve("../api/contact.js"), "utf8");
async function run(
  body,
  replies = [
    { data: { id: "notification" }, error: null },
    { data: { id: "ack" }, error: null },
  ],
  method = "POST",
  key = "test",
) {
  const calls = [];
  const sandbox = {
    module: { exports: {} },
    process: { env: { RESEND_API_KEY: key } },
    console: { error() {} },
    require: () => ({
      Resend: class {
        constructor() {
          this.emails = {
            send: async (payload) => {
              calls.push(payload);
              const answer = replies.shift();
              if (answer instanceof Error) throw answer;
              return answer;
            },
          };
        }
      },
    }),
  };
  vm.runInNewContext(source, sandbox);
  const res = {
    code: 200,
    setHeader() {},
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    end() {
      return this;
    },
  };
  await sandbox.module.exports({ method, body }, res);
  return { res, calls };
}
const valid = {
  name: "Test User",
  email: "test@example.com",
  helpType: "Consultancy",
  message: "Test project",
};
test("rejects empty/whitespace fields without sending", async () => {
  const r = await run({ ...valid, name: "   " });
  assert.equal(r.res.code, 400);
  assert.equal(r.calls.length, 0);
});
test("rejects malformed email without sending", async () => {
  const r = await run({ ...valid, email: "invalid" });
  assert.equal(r.res.code, 400);
  assert.equal(r.calls.length, 0);
});
test("rejects oversized input without sending", async () => {
  const r = await run({ ...valid, message: "x".repeat(5001) });
  assert.equal(r.res.code, 400);
  assert.equal(r.calls.length, 0);
});
test("handles provider error objects as failure and skips acknowledgement", async () => {
  const r = await run(valid, [{ data: null, error: { message: "rejected" } }]);
  assert.equal(r.res.code, 500);
  assert.equal(r.calls.length, 1);
});
test("handles thrown provider errors as failure", async () => {
  const r = await run(valid, [new Error("network")]);
  assert.equal(r.res.code, 500);
});
test("confirmed notification succeeds even if courtesy reply fails", async () => {
  const r = await run(valid, [
    { data: { id: "ok" }, error: null },
    { data: null, error: { message: "failed" } },
  ]);
  assert.equal(r.res.code, 200);
  assert.equal(r.res.data.success, true);
});
test("sends escaped values and preserves reply-to", async () => {
  const r = await run({ ...valid, name: "<b>Test</b>", message: "A & B" });
  assert.equal(r.res.code, 200);
  assert.equal(r.calls[0].replyTo, valid.email);
  assert.ok(r.calls[0].html.includes("&lt;b&gt;Test&lt;/b&gt;"));
  assert.ok(r.calls[0].html.includes("A &amp; B"));
});
test("missing configuration fails without sending", async () => {
  const r = await run(valid, [], "POST", "");
  assert.equal(r.res.code, 500);
  assert.equal(r.calls.length, 0);
});
test("GET is rejected without sending", async () => {
  const r = await run(valid, [], "GET");
  assert.equal(r.res.code, 405);
  assert.equal(r.calls.length, 0);
});
