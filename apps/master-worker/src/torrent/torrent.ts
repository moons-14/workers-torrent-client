import { Context } from "hono";
import { genPeerIdString } from "../utils/genPeerId";
import { getDefaultTrackers } from "../utils/getDefaultTrackers";
import { getPortNumber } from "../utils/getPortNumber";
import { restrictTrackerProtocol } from "../utils/restrictTrackerProtocol";
import { getPeers } from "./getPeers";
import { parseTorrentFile, TorrentFile } from "./parseTorrentFile";
import { getMyIp } from "../utils/getMyIp";
import { connectPeer } from "./connectPeer";

export const torrentFromFile = async (_torrent: any, c: Context) => {
    let torrent: TorrentFile;
    try {
        // parse and check the torrent file
        torrent = await parseTorrentFile(_torrent);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Invalid torrent file' }, 400);
    }

    const _trackers = restrictTrackerProtocol(torrent.announce, ['http:', 'https:']);
    const _defaultTrackers = restrictTrackerProtocol(getDefaultTrackers(c), ['http:', 'https:']);
    // pickup the first 10 trackers
    const trackers = [...new Set([..._trackers, ..._defaultTrackers])].slice(0, 10);
    console.log('Trackers:', trackers);

    const peerId = genPeerIdString();
    const _peers = await getPeers(torrent.infoHash, peerId, getPortNumber(c), trackers);

    // remove my ip address from the list of peers
    const myIp = await getMyIp();
    const peers = _peers.filter(p => p.ip !== myIp);

    console.log('my peerId:', peerId, "peer count:", peers.length);

    console.log("Connecting to peer:", peers[0].ip, peers[0].port);
    await connectPeer(peers[0].ip, peers[0].port, torrent.infoHash, peerId, c);

    return c.json(peers);
}