import React from "react";

const MetricsCard = ({ title, value }) => {
  return (
    <div style={{
      background: "white",
      padding: "20px 40px",
      borderRadius: "10px",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      minWidth: "200px"
    }}>
      <h3 style={{ color: "#007bff" }}>{title}</h3>
      <p style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</p>
    </div>
  );
};

export default MetricsCard;
