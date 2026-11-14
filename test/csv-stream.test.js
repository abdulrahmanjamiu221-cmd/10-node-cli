import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCsvRecords } from "../src/csv-stream.js";
import { parseCsvRecord } from "../src/csv.js";

test("readCsvRecords streams multiline quoted records with their starting line numbers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "expense-csv-"));
  const file = join(directory, "input.csv");

  try {
    await writeFile(file, [
      "amount,category,note,date",
      '25,food,"first line',
      'second line",2026-11-03',
      "invalid,food,broken,2026-11-04",
    ].join("\r\n"), "utf8");

    const records = [];
    for await (const item of readCsvRecords(file)) records.push(item);

    assert.deepEqual(records.map(({ line }) => line), [1, 2, 4]);
    assert.deepEqual(parseCsvRecord(records[1].record), [
      "25", "food", "first line\nsecond line", "2026-11-03",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
