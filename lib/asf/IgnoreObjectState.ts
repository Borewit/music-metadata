import { State } from "./State";

// ToDo: use ignore type
export class IgnoreObjectState extends State<any> {
  public get(_buf: Uint8Array, _off: number): null {
    return null;
  }
}
