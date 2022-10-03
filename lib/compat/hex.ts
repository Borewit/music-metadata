export const toFixedHexString = (data: number, length: number) => {
  return data.toString(16).padStart(length, "0");
};

/**
 * Convert Uint8Array to 00-ff strings
 * @param uint8array bytes data
 * @returns hex string
 */
export function toHexString(uint8array: Uint8Array): string {
  return [...uint8array].map((i) => toFixedHexString(i, 2)).join("");
}

/**
 * Convert 00-ff strings to Uint8Array
 * @param hexString hex string
 * @returns bytes data
 */
export function fromHexString(hexString: string): Uint8Array {
  const length = hexString.length;
  const trimmedLength = length % 2 === 1 ? length - 1 : length;

  const bytes: number[] = [];
  for (let i = 0; i < trimmedLength; i += 2) {
    bytes.push(Number.parseInt(hexString.slice(i, i + 2), 16));
  }
  return Uint8Array.from(bytes);
}
