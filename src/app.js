import express from "express";
import cookieParser from "cookie-parser";
import cors from 'cors';
import { ApiError } from "./utils/ApiError.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
    cors({
        origin: process.env.APP_URL || "http://localhost:5173",
        credentials: true
    })
);



app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
import authRoute from './routes/auth.routes.js';
app.use('/auth', authRoute);

import noteRouter from './routes/note.routes.js';
app.use('/api/v1/notes', noteRouter);


app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res
            .status(err.statusCode)
            .json({
                success: false,
                message: err.message
            });
    }
    return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
});


export { app }