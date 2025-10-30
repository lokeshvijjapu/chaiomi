import React, { useEffect, useState } from "react";
import axios from "axios";
import LogTable from "./components/LogTable";
import MetricsCard from "./components/MetricsCard";

function App() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, lastAction: "N/A" });

  // Fetch logs every 5 seconds
  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/logs");
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

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <h2>☕ Chaiomi Device Dashboard</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
        <MetricsCard title="Total Actions" value={metrics.total} />
        {/* <MetricsCard title="Last Action" value={metrics.message} /> */}
      </div>
      <LogTable logs={logs} />
    </div>
  );
}

export default App;
