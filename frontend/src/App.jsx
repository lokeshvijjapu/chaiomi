import React, { useEffect, useState } from "react";
import axios from "axios";
import LogTable from "./components/LogTable";
import MetricsCard from "./components/MetricsCard";

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

  // Fetch online status every 5 seconds
  const fetchStatus = async () => {
    try {
      const res = await axios.get("https://api-chaiomi.onrender.com/api/status");
      setIsOnline(res.data.online);
    } catch (err) {
      setIsOnline(false); // error means offline
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStatus();
    const logInterval = setInterval(fetchLogs, 5000);
    const statusInterval = setInterval(fetchStatus, 5000);
    return () => {
      clearInterval(logInterval);
      clearInterval(statusInterval);
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
        {/* <MetricsCard title="Last Action" value={metrics.message} /> */}
      </div>
      <LogTable logs={logs} />
    </div>
  );
}

export default App;
