import * as fs from "fs";

export interface Row {
  [key: string]: string;
}

export function parseCSV(filePath: string): Row[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Row = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });
}
