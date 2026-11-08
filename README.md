# inline-image

Claude Code mod. It draws every image path written in a reply (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`) under that message.

![An image path in a reply, drawn under the message](docs/screenshot.webp)

- The terminal must support the kitty graphics protocol.
- `ffmpeg` and `ffprobe` must be in `PATH`.
- Each image is at most 30 rows tall and 2 MiB decoded. GIF and video show the first frame.

## Install

At the prompt of a terminal session:

```
/plugin install inline-image --marketplace scarf005/inline-image
```

From a shell:

```
claude plugin install inline-image --marketplace scarf005/inline-image
```

## License

AGPL-3.0-only
