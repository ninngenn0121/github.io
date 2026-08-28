const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server); // Socket.IOをサーバーに紐付け
const PORT = process.env.PORT || 3000;

// index.htmlがあるフォルダ（ルート）をそのまま公開
app.use(express.static(__dirname));

let waitingPlayer = null; // 待機中のプレイヤーを保持する変数

io.on('connection', (socket) => {
    // クライアントからマッチング要求が来た時の処理
    socket.on('join_matchmaking', (peerId) => {
        if (waitingPlayer && waitingPlayer.socket.id !== socket.id) {
            // すでに待機している人がいれば、2人揃ったのでマッチング成立
            const hostPeerId = waitingPlayer.peerId;
            
            // 後から来た方（今回のリクエスト主）に、待機していた人のPeerIDへ接続するよう指示
            socket.emit('match_found', { hostPeerId: hostPeerId, isHost: false });
            
            // 先に待っていた方には完了通知だけ送る（相手からのP2P接続を待つ側になる）
            waitingPlayer.socket.emit('match_found', { opponentPeerId: peerId, isHost: true });
            
            waitingPlayer = null; // 待機列をリセット
        } else {
            // 誰もいなければ自分が待機列に入る
            waitingPlayer = { socket: socket, peerId: peerId };
        }
    });

    // 通信が切れた時の処理
    socket.on('disconnect', () => {
        // 切断したユーザーが待機中の人だった場合、待機列を空にする
        if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
