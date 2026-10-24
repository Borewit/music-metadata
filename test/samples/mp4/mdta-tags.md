# Indexed MP4 metadata sample

`mdta-tags.m4b` contains an original generated 440 Hz tone, encoded as AAC.
It has no third-party audio. FFmpeg's `use_metadata_tags` mode stores its named
metadata in a `keys` table and one-based indexed `ilst` items in the `mdta`
namespace. The custom series and Libro.fm fields deliberately remain native.

Generate it from the repository root with FFmpeg:

```sh
ffmpeg -v error -y -f lavfi -i sine=frequency=440:duration=1.25 \
  -c:a aac -b:a 32k \
  -metadata title='Indexed metadata sample' \
  -metadata album='Metadata Audiobook' \
  -metadata album_artist='Sample Author' \
  -metadata artist='Sample Narrator' \
  -metadata composer='Sample Narrator' \
  -metadata date=2024-02-03 \
  -metadata publisher='Sample Publisher' \
  -metadata subtitle='A playable regression sample' \
  -metadata genre=Audiobook \
  -metadata description='An original generated tone for MP4 metadata regression testing.' \
  -metadata series='Sample Series' -metadata series-part=4.5 \
  -metadata asin=B000TEST -metadata librofm_isbn=9780000000000 \
  -movflags use_metadata_tags -f mp4 test/samples/mp4/mdta-tags.m4b
```

The existing MP4 suite reads the committed file through every parser adapter;
FFmpeg is not needed to run the tests. Encoder output may vary by FFmpeg version.
