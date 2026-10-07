The chapter fixtures contain the first ten seconds of the existing
`BabysSongbook_librivox.m4b` sample from [The Baby’s Songbook by Walter Crane](https://librivox.org/the-babys-songbook-by-walter-crane/).
The public-domain AAC audio is copied without re-encoding.

`chapters-leading.m4b` was produced with FFmpeg and the accompanying
`chapters.ffmetadata` file:

```sh
ffmpeg -i BabysSongbook_librivox.m4b -f ffmetadata -i chapters.ffmetadata \
  -map 0:a:0 -map_metadata 1 -map_chapters 1 -t 10 -c:a copy \
  -movflags +faststart+disable_chpl chapters-leading.m4b
```

This produces a real QuickTime chapter track with multiple samples in one chunk.
`chapters-nero.m4b` uses the same command without `-movflags`; its QuickTime chapter
track and references were replaced by equal-sized `free` boxes, preserving the
media offsets and leaving only the Nero `chpl` list. Both files decode with FFmpeg.
