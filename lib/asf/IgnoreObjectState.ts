import { IAsfObjectHeader } from "./AsfObjectHeader";
import { State } from "./State";

// ToDo: use ignore type
export class IgnoreObjectState extends State<any> {
  constructor(header: IAsfObjectHeader) {
    super(header);
  }

  public get(buf: Buffer, off: number): null {
    return null;
  }
}
