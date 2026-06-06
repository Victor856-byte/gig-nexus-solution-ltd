const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(express.json());

app.get('/api/gigs', (req, res) => {
    fs.readFile(path.join(__dirname, 'database.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read database" });
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Gig Nexus is running at http://localhost:${PORT}`);
});

