const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors({
    origin: true, credentials: true // Allow requests from any origin
}));

let totalClicks = 0;

app.get('/clicks', (req, res) => {
    res.json({totalClicks});
});

app.post('/clicks', (req, res) => {
    totalClicks++;
    res.json({ totalClicks });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});