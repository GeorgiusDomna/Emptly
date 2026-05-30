import express from 'express';
import cors from 'cors';
import events from 'events';

const emmiter = new events.EventEmitter();

const PORT = 5001;
const app = express();

app.use(cors());
app.use(express.json());

app.get('/connect', (req, res) => {
    console.log('GET')
    res.writeHead(200, {
        'connection': 'keep-alive',
        "content-type": 'text/event-stream',
        'cache-control': 'no-cache'
    });
    emmiter.on('newMessage', message => {
        res.write(`data: ${JSON.stringify(message)} \n\n`);
    })
});

app.post('/new-message', (req, res) => {
    emmiter.emit('newMessage', req.body);
    res.status(200);
})


app.listen(PORT, () => console.log('server started: ', PORT));