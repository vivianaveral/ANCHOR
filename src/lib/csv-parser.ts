/**
 * RFC-4180 compliant CSV parser.
 * Handles quoted fields, escaped quotes (two consecutive quotes = literal quote),
 * and multiline quoted fields.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  // Normalise line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < normalized.length) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: two consecutive quotes = literal quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // Any character inside quotes (including newlines) is part of the field
        currentField += char;
        i++;
        continue;
      }
    }

    // Outside quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Handle last field/row if file doesn't end with newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out completely empty rows
  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

/**
 * Converts CSV text to an array of objects using the first row as headers.
 */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = (row[idx] ?? '').trim();
    });
    result.push(obj);
  }

  return result;
}
