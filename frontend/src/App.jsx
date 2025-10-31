import React, { useEffect, useState } from "react";
import axios from "axios";
import LogTable from "./components/LogTable";
import MetricsCard from "./components/MetricsCard";

const DEVICE_IP = "http://192.168.0.45"; // use your ESP32's actual LAN IP here

function App() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, lastAction: "N/A" });
  const [isOnline, setIsOnline] = useState(false);

  // Fetch logs every 5 seconds
  const fetchLogs = async () => {
    try {
      const res = await axios.get("https://api-chaiomi.onrender.com/api/logs");
      const data = res.data;
      setLogs(data);

      if (data.length > 0) {
        setMetrics({
          total: data.length,
          lastAction: data[data.length - 1].action,
        });
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  // Check device online status by ping
  const checkDeviceOnline = async () => {
    try {
      await axios.get(`${DEVICE_IP}/ping`, { timeout: 2000 });
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    checkDeviceOnline();
    const logInterval = setInterval(fetchLogs, 5000);
    const pingInterval = setInterval(checkDeviceOnline, 300000); // Every 5 min
    return () => {
      clearInterval(logInterval);
      clearInterval(pingInterval);
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "20px",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* Online/Offline status indicator */}
      <div style={{ position: "fixed", top: 20, right: 20 }}>
        <span
          style={{
            display: "inline-block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isOnline ? "#4BB543" : "#EA3223",
            marginRight: 10,
            verticalAlign: "middle",
          }}
        />
        <span
          style={{
            fontWeight: "bold",
            color: isOnline ? "#4BB543" : "#EA3223",
          }}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
      <h2>☕ Chaiomi Device Dashboard</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        <MetricsCard title="Total Actions" value={metrics.total} />
      </div>
      <LogTable logs={logs} />
    </div>
  );
}

export default App;
