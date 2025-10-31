const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Log = require('./log');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const mongoURI = "mongodb+srv://chaiomi:chaiomi123@cluster1.r9ld2gr.mongodb.net/?appName=Cluster1";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB and ready!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// In-memory map to track last heartbeat per device
const deviceLastSeen = {};

// 1️⃣ Endpoint to log data
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

// 2️⃣ Endpoint to get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ (Optional) Filter logs by deviceId
app.get('/api/logs/:deviceId', async (req, res) => {
  try {
    const logs = await Log.find({ deviceId: req.params.deviceId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ Heartbeat API to receive device heartbeat POSTs
app.post('/api/heartbeat', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId required" });
  }
  deviceLastSeen[deviceId] = Date.now();
  res.json({ success: true });
});

// 5️⃣ Device online/offline status based on last heartbeat time
app.get('/api/status', (req, res) => {
  const now = Date.now();
  // Default to offline
  let online = false;
  // Check if Device-1 last heartbeat within last 2 minutes (120000 ms)
  const lastSeen = deviceLastSeen["Device-1"];
  if (lastSeen && now - lastSeen < 120000) {
    online = true;
  }
  res.json({ online });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
