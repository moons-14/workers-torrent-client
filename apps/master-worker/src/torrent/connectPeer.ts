import { connect } from 'cloudflare:sockets';
import { Context } from 'hono';

const buildHandshake = (infoHash: string, peerId: string) => {
    const buffer = Buffer.alloc(68);;
    // pstrlen
    buffer.writeUInt8(19, 0);
    // pstr
    buffer.write('BitTorrent protocol', 1);
    // reserved
    buffer.writeUInt32BE(0, 20);
    buffer.writeUInt32BE(0, 24);
    // info_hash
    Buffer.from(infoHash, 'hex').copy(buffer, 28);
    // peer_id
    buffer.write(peerId, 48);
    return buffer;
}

const buildKeepAlive = () => {
    return Buffer.alloc(4);
}

const buildChoke = () => {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(1, 0);
    buffer.writeUInt8(0, 4);
    return buffer;
}

const buildUnchoke = () => {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(1, 0);
    buffer.writeUInt8(1, 4);
    return buffer;
}

const buildInterested = () => {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(1, 0);
    buffer.writeUInt8(2, 4);
    return buffer;
}

const buildUninterested = () => {
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(1, 0);
    buffer.writeUInt8(3, 4);
    return buffer;
}

const buildHave = (pieceIndex: number) => {
    const buffer = Buffer.alloc(9);
    buffer.writeUInt32BE(5, 0);
    buffer.writeUInt8(4, 4);
    buffer.writeUInt32BE(pieceIndex, 5);
    return buffer;
}

const buildBitfield = (bitfield: Buffer, pieceIndex: number) => {
    const buffer = Buffer.alloc(14);
    buffer.writeUInt32BE(pieceIndex + 1, 0);
    buffer.writeUInt8(5, 4);
    bitfield.copy(buffer, 5);
    return buffer;
}

const buildRequest = (pieceIndex: number, begin: number, length: number) => {
    const buffer = Buffer.alloc(17);
    buffer.writeUInt32BE(13, 0);
    buffer.writeUInt8(6, 4);
    buffer.writeUInt32BE(pieceIndex, 5);
    buffer.writeUInt32BE(begin, 9);
    buffer.writeUInt32BE(length, 13);
    return buffer;
}

const buildPiece = (pieceIndex: number, begin: number, block: Buffer) => {
    const buffer = Buffer.alloc(13 + block.length);
    buffer.writeUInt32BE(9 + block.length, 0);
    buffer.writeUInt8(7, 4);
    buffer.writeUInt32BE(pieceIndex, 5);
    buffer.writeUInt32BE(begin, 9);
    block.copy(buffer, 13);
    return buffer;
}

const buildCancel = (pieceIndex: number, begin: number, length: number) => {
    const buffer = Buffer.alloc(17);
    buffer.writeUInt32BE(13, 0);
    buffer.writeUInt8(8, 4);
    buffer.writeUInt32BE(pieceIndex, 5);
    buffer.writeUInt32BE(begin, 9);
    buffer.writeUInt32BE(length, 13);
    return buffer;
}

const buildPort = (port: number) => {
    const buffer = Buffer.alloc(7);
    buffer.writeUInt32BE(3, 0);
    buffer.writeUInt8(9, 4);
    buffer.writeUInt16BE(port, 5);
    return buffer;
}

const onWholeMessage = async (socket: Socket, callback: (message: Buffer) => void) => {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    const reader = socket.readable.getReader();
    while (true) {
        const { value: recvBuf, done } = await reader.read();
        if (done) break;

        // msgLen calculates the length of a whole message
        const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        savedBuf = Buffer.concat([savedBuf, recvBuf]);

        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
            callback(savedBuf.subarray(0, msgLen()));
            savedBuf = savedBuf.subarray(msgLen());
            handshake = false;
        }
    }
}

const isHandshake = (message: Buffer) => {
    return message.length === message.readUInt8(0) + 49 && message.toString('utf8', 1, 20) === 'BitTorrent protocol';
}

export const connectPeer = async (ip: string, port: number, hashBuffer: string, peerId: string, c: Context) => {
    console.log(hashBuffer, peerId);
    try {
        const socket = connect({ hostname: ip, port });
        const writer = socket.writable.getWriter();
        socket.opened.then(async () => {
            await writer.write(buildHandshake(hashBuffer, peerId));
            console.log("Handshake sent");
        });


        onWholeMessage(socket, message => {
            if (isHandshake(message)) {
                console.log("Handshake received");
                writer.write(buildInterested());
                console.log("Interested sent");
            } else {
                console.log("Received message:", message);
            }
        });

        await socket.closed;
        console.log('Socket closed');
    } catch (e) {
        console.error("Socket connection failed: ", e);
    }
}
