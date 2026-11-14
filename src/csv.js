const columns = ["id", "amount", "category", "note", "date"];

function escapeField(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(expenses) {
  const rows = [
    columns,
    ...expenses.map((expense) => columns.map((column) => expense[column] ?? "")),
  ];
  return `${rows.map((row) => row.map(escapeField).join(",")).join("\r\n")}\r\n`;
}

export function parseCsvRecord(record) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  let quoteClosed = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (inQuotes) {
      if (character === '"' && record[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        quoteClosed = true;
      } else {
        field += character;
      }
      continue;
    }

    if (quoteClosed) {
      if (character !== ",") throw new Error("Unexpected character after a quoted CSV field.");
      fields.push(field);
      field = "";
      quoteClosed = false;
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === '"') {
      if (field.length > 0) throw new Error("Quote inside an unquoted CSV field.");
      inQuotes = true;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error("Unclosed quoted CSV field.");
  fields.push(field);
  return fields;
}

export function getImportColumns(headerRecord) {
  const headers = parseCsvRecord(headerRecord).map((header, index) => (
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim().toLowerCase()
  ));
  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV header contains duplicate columns.");
  }

  for (const required of ["amount", "category", "date"]) {
    if (!headers.includes(required)) {
      throw new Error(`CSV header must include ${required}.`);
    }
  }
  return headers;
}
