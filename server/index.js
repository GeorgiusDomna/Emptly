import __dirname from './__dirname.js';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import router from './router.js';

dotenv.config();

const PORT = process.env.PORT || 5001;
const DB_URL = process.env.MONGO_URL;

const app = express();
app.use(express.json());
app.use(express.static('static'));
app.use(fileUpload());
app.use('/api', router);

const startApp = async() => {
    try {
        if (!DB_URL) {
            throw new Error('MONGO_URL не задан в переменных окружения');
        }
        await mongoose.connect(DB_URL);
        app.listen(PORT, () => console.log(`server started PORT ${PORT}`));
    } catch (err) {
        console.log(err)
    }
}

startApp();