const NOT_FOUND = -1;

export interface IChunk {
  offset: number;
  data: ArrayBuffer;
}

interface IChunkRange {
  startIx: number;
  endIx: number;
  insertIx?: number
}

/**
 * Keeps track of data chunks (partial downloaded file fragments).
 *
 * Based on "ChunkedFileData"  written by António Afonso
 * https://github.com/aadsm/jsmediatags/blob/master/src/ChunkedFileData.js
 */
export class ChunkedFileData {

  private readonly _fileData: IChunk[] = [];

  /**
   * Adds data to the file storage at a specific offset.
   */
  public addData(offset: number, data: ArrayBuffer): void {

    const offsetEnd = offset + data.byteLength - 1;
    const chunkRange = this._getChunkRange(offset, offsetEnd);

    if (chunkRange.startIx === NOT_FOUND) {
      this._fileData.splice(chunkRange.insertIx || 0, 0, {
        offset,
        data
      });
    } else {
      // If the data to add collides with existing chunks we prepend and
      // append data from the half colliding chunks to make the collision at
      // 100%. The new data can then replace all the colliding chunkes.
      const firstChunk = this._fileData[chunkRange.startIx];
      const lastChunk = this._fileData[chunkRange.endIx];
      const needsPrepend = offset > firstChunk.offset;
      const needsAppend = offsetEnd < lastChunk.offset + lastChunk.data.byteLength - 1;

      const chunk = {
        offset: Math.min(offset, firstChunk.offset),
        data
      };

      if (needsPrepend) {
        const slicedData = firstChunk.data.slice(0, offset - firstChunk.offset);
        chunk.data = this._concatData(slicedData, data);
      }

      if (needsAppend) {
        // Use the lastChunk because the slice logic is easier to handle.

        const slicedData = chunk.data.slice(0, lastChunk.offset - chunk.offset);
        chunk.data = this._concatData(slicedData, lastChunk.data);
      }

      this._fileData.splice(
        chunkRange.startIx,
        chunkRange.endIx - chunkRange.startIx + 1,
        chunk
      );
    }
  }

  public hasDataRange(offsetStart: number, offsetEnd: number): boolean {
    for (let i = 0; i < this._fileData.length; i++) {
      const chunk = this._fileData[i];
      if (offsetEnd < chunk.offset) {
        return false;
      }

      if (offsetStart >= chunk.offset && offsetEnd < chunk.offset + chunk.data.byteLength) {
        return true;
      }
    }
    return false;
  }

  public readToBuffer(buffer: Buffer, offset: number, position: number, length: number) {

    const _pos_offset = position ;
    let dataChunk: IChunk;

    for (let i = 0; i < this._fileData.length; i++) {
      const dataChunkStart = this._fileData[i].offset;
      const dataChunkEnd = dataChunkStart + this._fileData[i].data.byteLength - 1;

      if (_pos_offset >= dataChunkStart && _pos_offset <= dataChunkEnd) {
        dataChunk = this._fileData[i];
        const chunkOffset = _pos_offset - dataChunkStart;
        const chunkLength = Math.min(length, dataChunk.data.byteLength - chunkOffset);
        Buffer.from(dataChunk.data).copy(buffer, offset, chunkOffset, chunkOffset + chunkLength);
        if (chunkLength < length) {
          return this.readToBuffer(buffer, offset + chunkLength, position + chunkLength, length - chunkLength);
        }
        return;
      }
    }
    throw new Error(`Offset ${_pos_offset} hasn't been loaded yet.`);
  }

  private _concatData(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
    const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer as any;
  }

  /**
   * Finds the chunk range that overlaps the [offsetStart-1,offsetEnd+1] range.
   * When a chunk is adjacent to the offset we still consider it part of the
   * range (this is the situation of offsetStart-1 or offsetEnd+1).
   * When no chunks are found `insertIx` denotes the index where the data
   * should be inserted in the data list (startIx == NOT_FOUND and endIX ==
   * NOT_FOUND).
   */
  private _getChunkRange(offsetStart: number, offsetEnd: number
  ): IChunkRange {
    let startChunkIx = NOT_FOUND;
    let endChunkIx = NOT_FOUND;
    let insertIx = 0;

    // Could use binary search but not expecting that many blocks to exist.
    for (let i = 0; i < this._fileData.length; i++, insertIx = i) {
      const chunkOffsetStart = this._fileData[i].offset;
      const chunkOffsetEnd = chunkOffsetStart + this._fileData[i].data.byteLength;

      if (offsetEnd < chunkOffsetStart - 1) {
        // This offset range doesn't overlap with any chunks.
        break;
      }
      // If it is adjacent we still consider it part of the range because
      // we're going end up with a single block with all contiguous data.
      if (offsetStart <= chunkOffsetEnd + 1 &&
        offsetEnd >= chunkOffsetStart - 1) {
        startChunkIx = i;
        break;
      }
    }

    // No starting chunk was found, meaning that the offset is either before
    // or after the current stored chunks.
    if (startChunkIx === NOT_FOUND) {
      return {
        startIx: NOT_FOUND,
        endIx: NOT_FOUND,
        insertIx
      };
    }

    // Find the ending chunk.
    for (let i = startChunkIx; i < this._fileData.length; i++) {
      const chunkOffsetStart = this._fileData[i].offset;
      const chunkOffsetEnd = chunkOffsetStart + this._fileData[i].data.byteLength;

      if (offsetEnd >= chunkOffsetStart - 1) {
        // Candidate for the end chunk, it doesn't mean it is yet.
        endChunkIx = i;
      }
      if (offsetEnd <= chunkOffsetEnd + 1) {
        break;
      }
    }

    if (endChunkIx === NOT_FOUND) {
      endChunkIx = startChunkIx;
    }

    return {
      startIx: startChunkIx,
      endIx: endChunkIx
    };
  }
}
