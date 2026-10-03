export class Row {
  public values: string[];

  constructor(values: string[]) {
    this.values = values;
  }
}

export class Table {
  private static padEnd(value: string, size: number, pad = ' ') {
    while (value.length < size) {
      value += pad;
    }
    return value;
  }

  private static rowToString(values: string[], colSizes: number[]): string {
    const colValues: string[] = [];
    for (let ci = 0; ci < colSizes.length; ++ci) {
      const cellTxt = values.length > ci ? values[ci] : '';
      colValues.push(Table.padEnd(cellTxt, colSizes[ci]));
    }
    return `| ${colValues.join(' | ')} |`;
  }

  private static lineToString(colSizes: number[]): string {
    const colValues = colSizes.map(size => Table.padEnd('-', size, '-'));
    return `|-${colValues.join('-|-')}-|`;
  }

  public rows: Row[] = [];
  public header?: Row;

  public toString(previous = ''): string {
    // Reuse unchanged rows so column padding does not create unrelated Git changes.
    const rowKey = (line: string) => {
      const cells = line.split('|').map(cell => cell.trim());
      if (cells.slice(1, -1).every(cell => /^-+$/.test(cell))) {
        return JSON.stringify(cells.map(cell => cell.replace(/-+/g, '-')));
      }
      return JSON.stringify(cells);
    };
    const previousRows = new Map(
      previous
        .split(/\r?\n/)
        .filter(line => line.startsWith('|'))
        .map(line => [rowKey(line), line] as const)
    );
    const colSizes = this.calcColSizes();
    const lines = [
      Table.rowToString((this.header as Row).values, colSizes),
      Table.lineToString(colSizes),
      ...this.rows.map(row => Table.rowToString(row.values, colSizes))
    ];
    return `${lines.map(line => previousRows.get(rowKey(line)) ?? line).join('\n')}\n`;
  }

  private calcColSizes(): number[] {
    const maxColSizes: number[] = [];

    for (const row of this.rows.concat([this.header as Row])) {
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
