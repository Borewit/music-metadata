/**
 * Module convert fs functions to promise based functions
 */

import * as fs from "fs";

export interface IReadResult {
  bytesRead: number;
  buffer: Uint8Array;
}

export const pathExists = fs.existsSync;
export const createReadStream = fs.createReadStream;

export async function stat(path: fs.PathLike): Promise<fs.Stats> {
  return new Promise<fs.Stats>((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) reject(err);
      else resolve(stats);
    });
  });
}

export async function close(fd: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.close(fd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function open(path: fs.PathLike, mode: fs.Mode): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    fs.open(path, mode, (err, fd) => {
      if (err) reject(err);
      else resolve(fd);
    });
  });
}

export async function read(
  fd: number,
  buffer: Uint8Array,
  offset: number,
  length: number,
  position: number
): Promise<IReadResult> {
  return new Promise<IReadResult>((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, _buffer) => {
      if (err) reject(err);
      else resolve({ bytesRead, buffer: _buffer });
    });
  });
}

export async function writeFile(
  path: fs.PathLike,
  data: Buffer | string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function writeFileSync(path: fs.PathLike, data: Buffer | string): void {
  fs.writeFileSync(path, data);
}

export async function readFile(path: fs.PathLike): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}
