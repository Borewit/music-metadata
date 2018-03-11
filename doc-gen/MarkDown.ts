export class Row {
  constructor(public values: string[]) {
  }
}

export class Table {
  public rows: Row[] = [];
  public header?: Row;

  private calcColSizes(): number[] {

    const maxColSizes: number[] = [];

    for (let row of this.rows.concat([this.header])) {
      for (let ci=0; ci < row.values.length; ++ci) {
        if (ci < maxColSizes.length) {
          maxColSizes[ci] = Math.max(maxColSizes[ci], row.values[ci].length);
        } else {
          maxColSizes.push(row.values[ci].length)
        }
      }
    }

    return maxColSizes;
  }

  private static padEnd(value: string, size: number, pad: string = " ") {
    while(value.length < size) {
      value += pad;
    }
    return value;
  }

  private static rowToString(values: string[], colSizes: number[]): string {
    const colValues: string[] = [];
    for (let ci=0; ci < colSizes.length; ++ci) {
      const cellTxt = values.length > ci ? values[ci] : "";
      colValues.push(Table.padEnd(cellTxt, colSizes[ci]));
    }
    const rowTxt = "| " + colValues.join(" | ") + " |\n";
    return rowTxt;
  }

  private static lineToString(colSizes: number[]): string {

    const colValues = colSizes.map(size => { return Table.padEnd("-", size, "-")});
    return "|-" + colValues.join("-|-") + "-|\n";
  }

  public toString(): string {
    const colSizes = this.calcColSizes();
    let text = Table.rowToString(this.header.values, colSizes);;
    text += Table.lineToString(colSizes);
    for (let row of this.rows) {
      text += Table.rowToString(row.values, colSizes);
    }

    return text;
  }
}