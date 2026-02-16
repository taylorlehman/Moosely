const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)){
    fs.mkdirSync(DATA_DIR);
}
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Increase limit for large data payloads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname)); // Serve static files from root

// API: Get Data
app.get('/api/data', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return res.status(500).send(err);
            }
            try {
                res.json(JSON.parse(data));
            } catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
                res.json({ releases: [], featureAreas: [], tasks: [] });
            }
        });
    } else {
        // Return empty structure if file doesn't exist
        res.json({ releases: [], featureAreas: [], tasks: [] });
    }
});

// API: Save Data
app.post('/api/data', (req, res) => {
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
        if (err) {
            console.error("Error writing file:", err);
            return res.status(500).send(err);
        }
        res.send('Data saved successfully');
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
