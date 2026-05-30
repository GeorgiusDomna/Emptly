import { WebSocketServer } from 'ws';

const PORT = 5001;

const wss = new WebSocketServer({
    port: PORT
}, () => console.log('server started: ', PORT));

wss.on('connection', (ws) => {
    // const id = Date.now();

    ws.on('message', (messege) => {
        messege = JSON.parse(messege);

        switch (messege.event) {
            case 'message':
                broadcastMessage(messege);
                break
            case 'connection':
                broadcastMessage(messege);
                break
        }
    })
})

function broadcastMessage(message, id) {
    // wss.clients.forEach(client => {
    //     if (client.id === id) {
    //         client.send(JSON.stringify(message))
    //     }
    // })

    wss.clients.forEach(client => {
        client.send(JSON.stringify(message))
    })
}