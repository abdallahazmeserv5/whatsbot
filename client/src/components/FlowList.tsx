import { useState, useEffect } from "react";
import { getFlows, toggleFlow } from "../services/FlowService";

interface Flow {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  keywords: string[];
  createdAt: string;
}

export default function FlowList() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const data = await getFlows();
      setFlows(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load flows");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlow = async (flowId: string) => {
    try {
      await toggleFlow(flowId);
      await loadFlows(); // Reload to get updated state
    } catch (err: any) {
      setError(err.message || "Failed to toggle flow");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading flows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <div
          style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          Error: {error}
        </div>
        <button
          onClick={loadFlows}
          style={{
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Automation Flows</h2>
        <button
          onClick={loadFlows}
          style={{
            padding: "8px 16px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {flows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "#6c757d", margin: 0 }}>
            No flows created yet. Go to Flow Builder to create one!
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {flows.map((flow) => (
            <div
              key={flow.id}
              style={{
                background: "white",
                border: "1px solid #dee2e6",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "18px" }}>{flow.name}</h3>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "500",
                      background: flow.isActive ? "#d4edda" : "#f8d7da",
                      color: flow.isActive ? "#155724" : "#721c24",
                    }}
                  >
                    {flow.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>
                  <div>Trigger: {flow.triggerType}</div>
                  {flow.keywords && flow.keywords.length > 0 && (
                    <div>Keywords: {flow.keywords.join(", ")}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleToggleFlow(flow.id)}
                  style={{
                    padding: "8px 16px",
                    background: flow.isActive ? "#dc3545" : "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {flow.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
