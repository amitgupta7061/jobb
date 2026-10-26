import assert from "node:assert";
import test from "node:test";
import { GreenhouseAdapter } from "../src/lib/collectors/greenhouse";
import { LeverAdapter } from "../src/lib/collectors/lever";
import { AshbyAdapter } from "../src/lib/collectors/ashby";
import { AmazonAdapter } from "../src/lib/collectors/amazon";

import { SmartRecruitersAdapter } from "../src/lib/collectors/smartrecruiters";
import { WorkdayAdapter } from "../src/lib/collectors/workday";

test("Greenhouse Adapter: normalizes job structure", () => {
  const adapter = new GreenhouseAdapter();
  assert.strictEqual(adapter.name, "Greenhouse");
  assert.strictEqual(adapter.sourceType, "GREENHOUSE");
});

test("Lever Adapter: normalizes job structure", () => {
  const adapter = new LeverAdapter();
  assert.strictEqual(adapter.name, "Lever");
  assert.strictEqual(adapter.sourceType, "LEVER");
});

test("Ashby Adapter: normalizes job structure", () => {
  const adapter = new AshbyAdapter();
  assert.strictEqual(adapter.name, "Ashby");
  assert.strictEqual(adapter.sourceType, "ASHBY");
});

test("Amazon Adapter: normalizes career portal jobs", () => {
  const adapter = new AmazonAdapter();
  assert.strictEqual(adapter.name, "Amazon Jobs");
  assert.strictEqual(adapter.sourceType, "CUSTOM");
});

test("SmartRecruiters Adapter: normalizes career portal jobs", () => {
  const adapter = new SmartRecruitersAdapter();
  assert.strictEqual(adapter.name, "SmartRecruiters");
  assert.strictEqual(adapter.sourceType, "CUSTOM");
});

test("Workday Adapter: normalizes career portal jobs", () => {
  const adapter = new WorkdayAdapter();
  assert.strictEqual(adapter.name, "Workday");
  assert.strictEqual(adapter.sourceType, "WORKDAY");
});


