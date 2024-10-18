import parseTorrent from 'parse-torrent';
import zod from 'zod';

export const TorrentFileSchema = zod.object({
    name: zod.string(),
    infoHash: zod.string(),
    announce: zod.array(zod.string()),
    files: zod.array(zod.object({ path: zod.string(), name: zod.string(), length: zod.number(), offset: zod.number() })),
    length: zod.number(),
    pieceLength: zod.number(),
    lastPieceLength: zod.number(),
    pieces: zod.array(zod.string())
});

export type TorrentFile = zod.infer<typeof TorrentFileSchema>;

export const parseTorrentFile = async (torrent: File): Promise<TorrentFile> => {
    const arrayBuffer = await torrent.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const object = await parseTorrent(buffer);
    return TorrentFileSchema.parse(object);
}