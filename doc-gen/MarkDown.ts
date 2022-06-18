import * as fs from "node:fs";

export class Row {
  constructor(public values: string[]) {}
}

export class Table {
  private static padEnd(value: string, size: number, pad = " ") {
    while (value.length < size) {
      value += pad;
    }
    return value;
  }

  private static writeRow(
    out: fs.WriteStream,
    values: string[],
    colSizes: number[]
  ) {
    const colValues: string[] = [];
    for (const [ci, colSize] of colSizes.entries()) {
      const cellTxt = values.length > ci ? values[ci] : "";
      colValues.push(Table.padEnd(cellTxt, colSize));
    }
    out.write("| " + colValues.join(" | ") + " |\n");
  }

  private static lineToString(colSizes: number[]): string {
    const colValues = colSizes.map((size) => Table.padEnd("-", size, "-"));
    return "|-" + colValues.join("-|-") + "-|\n";
  }

  public rows: Row[] = [];
  public header?: Row;

  public writeTo(out: fs.WriteStream) {
    const colSizes = this.calcColSizes();
    Table.writeRow(out, this.header.values, colSizes);
    out.write(Table.lineToString(colSizes));
    for (const row of this.rows) {
      Table.writeRow(out, row.values, colSizes);
    }
  }

  private calcColSizes(): number[] {
    const maxColSizes: number[] = [];

    for (const row of [...this.rows, this.header]) {
      for (let ci = 0; ci < row.values.length; ++ci) {
        if (ci < maxColSizes.length) {
          maxColSizes[ci] = Math.max(maxColSizes[ci], row.values[ci].length);
        } else {
          maxColSizes.push(row.values[ci].length);
        }
      }
    }

    return maxColSizes;
  }
}
