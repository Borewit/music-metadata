import { CommonTagMapper } from './GenericTagMapper.js';

/** Incremental movement layout selection, shared by the reader and writer. */
export class VorbisMovement {
  private name?: string;
  private numeric?: string;
  private text?: string;
  private legacy?: { no: number | null; of: number | null };
  private total?: number | null;

  public add(key: string, value: string): boolean {
    switch (key.toUpperCase()) {
      case 'MOVEMENTNAME':
        this.name = value;
        break;
      case 'MOVEMENT':
        // Numeric and textual entries have separate roles, regardless of order.
        // Within each role, the last occurrence wins, like other singleton tags.
        if (/^\d+(?:\/\d+)?$/.test(value)) {
          this.numeric = value;
        } else {
          this.text = value;
        }
        break;
      case 'MOVEMENTNUMBER': {
        const pair = CommonTagMapper.normalizeTrack(value);
        pair.of = this.legacy?.of ?? pair.of;
        this.legacy = pair;
        break;
      }
      case 'MOVEMENTTOTAL':
        this.total = CommonTagMapper.toIntOrNull(value);
        break;
      default:
        return false;
    }
    return true;
  }

  public get value() {
    // An explicit name establishes Picard's canonical layout. Without one,
    // MOVEMENTNUMBER identifies a legacy layout (even for numeric names).
    const canonical = this.name !== undefined || this.legacy === undefined;
    const index =
      canonical && this.numeric !== undefined
        ? CommonTagMapper.normalizeTrack(this.numeric)
        : { ...(this.legacy ?? { no: null, of: null }) };
    if (this.total !== undefined) {
      index.of = this.total;
    }
    return {
      name: this.name ?? this.text ?? (canonical ? undefined : this.numeric),
      index
    };
  }
}
