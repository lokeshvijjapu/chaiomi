const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Log = require('./log');

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Replace with your MongoDB URI
const mongoURI = "mongodb+srv://chaiomi:chaiomi123@cluster1.r9ld2gr.mongodb.net/?appName=Cluster1";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB and ready!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 🧠 1️⃣ Endpoint to log data
app.post('/api/logs', async (req, res) => {
  try {
    const { deviceId, message } = req.body;

    if (!deviceId || !message)
      return res.status(400).json({ error: "deviceId and message are required" });

    const log = new Log({ deviceId, message });
    await log.save();

    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧠 2️⃣ Endpoint to get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🧠 3️⃣ (Optional) Filter logs by deviceId
app.get('/api/logs/:deviceId', async (req, res) => {
  try {
    const logs = await Log.find({ deviceId: req.params.deviceId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Endpoint to show device online/offline status based on last log
app.get('/api/status', async (req, res) => {
  try {
    // Assume device is "online" if any log received in last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const latestLog = await Log.findOne().sort({ timestamp: -1 });
    let online = false;
    if (latestLog && latestLog.timestamp > tenSecondsAgo) {
      online = true;
    }
    res.json({ online });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
