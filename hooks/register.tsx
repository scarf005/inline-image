import type { Register } from 'claude-code'

const IMAGE = /\/[^\n"'`()<>[\]]*?\.(?:png|jpe?g|gif|webp|bmp)(?![A-Za-z0-9])/gi
const MAX_ROWS = 30
const CELL_W = 10
const WIDTHS = [1280, 960, 720, 540, 400]

type Picture = { file: string; png: string; columns: number; rows: number }

export const register: Register = on => {
  const pictures = new Map<string, Promise<Picture | null>>()

  // Image paths in a reply are drawn under it as kitty-protocol images.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const files = [...new Set(e.props.text.match(IMAGE) ?? [])]
    if (files.length === 0) return next(e)
    const room = Math.max(10, Math.min(120, (e.viewport?.columns ?? 80) - 4))
    const found = await Promise.all(
      files.map(candidate => {
        const key = `${candidate}:${room}`
        const cached = pictures.get(key)
        if (cached) return cached
        const loaded = (async (): Promise<Picture | null> => {
          // The match may start inside prose before the path: trim it at each `/` until a file exists.
          let found: string | undefined
          for (let at = 0; at >= 0 && !found; at = candidate.indexOf('/', at + 1)) {
            const path = candidate.slice(at)
            const test = await $.process.run(['test', '-f', path]).catch(() => undefined)
            if (test?.exitCode === 0) found = path
          }
          if (!found) return null
          const file = found
          const probe = await $.process.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]).catch(() => undefined)
          const [w, h] = (probe?.stdout.trim().split('x') ?? []).map(Number)
          if (!(w > 0 && h > 0)) return null
          // Native size at about 10x20 px a cell, never past the room.
          const wide = Math.max(1, Math.min(room, Math.ceil(w / CELL_W)))
          const rows = Math.max(1, Math.min(MAX_ROWS, Math.ceil((wide * h) / w / 2)))
          const columns = Math.max(1, Math.min(wide, Math.floor((rows * 2 * w) / h)))
          // The picture is held to 2 MiB decoded: shrink it until its PNG fits.
          for (const width of WIDTHS) {
            const ran = await $.process.run(['sh', '-c', `ffmpeg -v error -i "$1" -frames:v 1 -vf "scale='min($2,iw)':-2" -f image2 -c:v png - | base64 -w0`, 'sh', file, `${width}`]).catch(() => undefined)
            if (ran && ran.stdout.length > 0 && ran.stdout.length <= 2.7e6) return { file, png: ran.stdout, columns, rows }
          }
          return null
        })()
        pictures.set(key, loaded)
        return loaded
      }),
    )
    const shown = found.filter(p => p !== null)
    if (shown.length === 0) return next(e)
    const { Box, Image } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {await next(e)}
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          {shown.map(p => (
            <Image key={`img:${p.file}`} source={{ png: p.png }} columns={p.columns} rows={p.rows} alt={p.file} />
          ))}
        </Box>
      </Box>
    )
  })
}
