export type UnionOfParseErrors =
  | CouldNotDetermineFileTypeError
  | UnsupportedFileTypeError
  | UnexpectedFileContentError
  | FieldDecodingError
  | InternalParserError;

export const makeParseError = <Name extends string>(name: Name) => {
  return class ParseError extends Error {
    name: Name
    constructor(message: string) {
      super(message);
      this.name = name;
    }
  }
}

// Concrete error class representing a file type determination failure.
export class CouldNotDetermineFileTypeError extends makeParseError('CouldNotDetermineFileTypeError') {
}

// Concrete error class representing an unsupported file type.
export class UnsupportedFileTypeError extends makeParseError('UnsupportedFileTypeError') {
}

// Concrete error class representing unexpected file content.
class UnexpectedFileContentError extends makeParseError('UnexpectedFileContentError') {
  constructor(public readonly fileType: string, message: string) {
    super(message);
  }

  // Override toString to include file type information.
  toString(): string {
    return `${this.name} (FileType: ${this.fileType}): ${this.message}`;
  }
}

// Concrete error class representing a field decoding error.
export class FieldDecodingError extends makeParseError('FieldDecodingError') {
}

export class InternalParserError extends makeParseError('InternalParserError') {
}

// Factory function to create a specific type of UnexpectedFileContentError.
export const makeUnexpectedFileContentError = <FileType extends string>(fileType: FileType) => {
  return class extends UnexpectedFileContentError {
    constructor(message: string) {
      super(fileType, message);
    }
  };
};
