import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

function updateQuoteState(line, inQuotes) {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== '"') continue;
    if (inQuotes && line[index + 1] === '"') {
      index += 1;
    } else {
      inQuotes = !inQuotes;
    }
  }
  return inQuotes;
}

export async function* readCsvRecords(filePath) {
  const input = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let parts = [];
  let inQuotes = false;
  let startLine = 1;
  let lineNumber = 0;

  try {
    for await (const line of lines) {
      lineNumber += 1;
      if (parts.length === 0) startLine = lineNumber;
      parts.push(line);
      inQuotes = updateQuoteState(line, inQuotes);

      if (!inQuotes) {
        yield { record: parts.join("\n"), line: startLine };
        parts = [];
      }
    }

    if (parts.length > 0) {
      yield { record: parts.join("\n"), line: startLine };
    }
  } finally {
    lines.close();
    input.destroy();
  }
}
