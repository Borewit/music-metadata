# Multi-track USAC fixtures

Generated with FFmpeg 9.0.2 from the existing issue-2672.m4b fixture (audio copied without re-encoding) and a generated 0.1-second 440 Hz sine tone. No new external media was downloaded. Commands run from the repository root:

```sh
ffmpeg -v error -i test/samples/mp4/issue-2672.m4b -f lavfi -i 'sine=frequency=440:sample_rate=48000:duration=0.1' -map 0:a:0 -map 1:a:0 -c:a:0 copy -c:a:1 alac -map_metadata -1 -map_chapters -1 test/samples/mp4/usac-alac.m4a
ffmpeg -v error -i test/samples/mp4/usac-alac.m4a -map 0:a:1 -map 0:a:0 -c copy -map_metadata -1 -map_chapters -1 test/samples/mp4/alac-usac.m4a
ffmpeg -v error -i test/samples/mp4/issue-2672.m4b -f lavfi -i 'sine=frequency=440:sample_rate=96000:duration=0.1' -map 0:a:0 -map 1:a:0 -c:a:0 copy -c:a:1 pcm_f64le -map_metadata -1 -map_chapters -1 test/samples/mp4/usac-pcm-v2.mov
```

The ALAC pair verifies summary fields in both track orders. The MOV has a valid QuickTime version-2 lpcm sample entry, whose audio properties and codec are currently unsupported by the reader; it verifies stale summary fields are cleared. All tracks decode with FFmpeg using `-v error -xerror -map 0:a -f null -`. Tests require no FFmpeg installation.
