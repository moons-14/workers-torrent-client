import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono'
import zod from 'zod';
import { torrentFromFile } from './torrent/torrent';

const app = new Hono()

const downloadFromTorrentFileSchema = zod.object({
  torrent: zod.any(),
});
app.post('/torrent', zValidator('form', downloadFromTorrentFileSchema), async (c) => {
  const { torrent } = c.req.valid('form');
  return await torrentFromFile(torrent, c);
})

app.post('/magnet-link', (c) => {
  return c.text('Hello Hono!')
})

export default app
