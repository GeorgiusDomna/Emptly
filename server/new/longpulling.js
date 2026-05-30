import express from 'express';
import cors from 'cors';
import events from 'events';

const emmiter = new events.EventEmitter();

const PORT = 5001;
const app = express();

app.use(cors());
app.use(express.json());

app.get('/get-message', (req, res) => {
    console.log('GET');
    emmiter.once('newMessage', (message) => {
        console.log('once');
        res.json(message);
    })
});

app.post('/new-message', (req, res) => {
    console.log('POST: ');
    console.log(req.body);
    const message = req.body;
    emmiter.emit('newMessage', message);
    res.status(200);
})


app.listen(PORT, () => console.log('server started: ', PORT));