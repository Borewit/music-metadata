/**
 * Base class for all errors thrown by music-metadata write operations.
 */
export class MetadataEditorError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MetadataEditorError';
  }
}

/**
 * The input is not a supported audio container.
 */
export class UnsupportedFormatError extends MetadataEditorError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * The container was recognised, but its structure is invalid or truncated.
 */
export class InvalidFileError extends MetadataEditorError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidFileError';
  }
}

/**
 * A tag patch contains an invalid value.
 */
export class InvalidPatchError extends MetadataEditorError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidPatchError';
  }
}

/**
 * The requested operation is valid in principle, but not implemented yet.
 */
export class UnsupportedFeatureError extends MetadataEditorError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnsupportedFeatureError';
  }
}

/**
 * Writing the output failed.
 */
export class WriteError extends MetadataEditorError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WriteError';
  }
}
