import React from "react";

const LogTable = ({ logs }) => {
  return (
    <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}>
      <table style={{ borderCollapse: "collapse", width: "80%", background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
        <thead style={{ background: "#007bff", color: "white" }}>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Action</th>
            <th style={th}>Device ID</th>
            <th style={th}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={log._id || index} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{index + 1}</td>
              <td style={td}>{log.message}</td>
              <td style={td}>{log.deviceId}</td>
              <td style={td}>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const th = { padding: "10px" };
const td = { padding: "10px", textAlign: "center" };

export default LogTable;
