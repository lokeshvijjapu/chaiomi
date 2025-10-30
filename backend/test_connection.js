const { MongoClient } = require("mongodb");

// replace below with your full connection string
const uri = "mongodb+srv://chaiomi:chaiomi123@cluster1.r9ld2gr.mongodb.net/?appName=Cluster1";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();
