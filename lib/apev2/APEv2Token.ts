/**
 * APETag versionIndex history / supported formats
 *
 * 1.0 (1000) - Original APE tag spec.  Fully supported by this code.
 * 2.0 (2000) - Refined APE tag spec (better streaming support, UTF StringEncoding). Fully supported by this code.
 *
 * Notes:
 * - also supports reading of ID3v1.1 tags
 * - all saving done in the APE Tag format using CURRENT_APE_TAG_VERSION
 *
 * APE File Format Overview: (pieces in order -- only valid for the latest versionIndex APE files)
 *
 * JUNK - any amount of "junk" before the APE_DESCRIPTOR (so people that put ID3v2 tags on the files aren't hosed)
 * APE_DESCRIPTOR - defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 * APE_HEADER - describes all of the necessary information about the APE file
 * SEEK TABLE - the table that represents seek offsets [optional]
 * HEADER DATA - the pre-audio data from the original file [optional]
 * APE FRAMES - the actual compressed audio (broken into frames for seekability)
 * TERMINATING DATA - the post-audio data from the original file [optional]
 * TAG - describes all the properties of the file [optional]
 */
