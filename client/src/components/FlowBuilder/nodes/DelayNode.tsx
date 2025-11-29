import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";

export const DelayNode = memo(({ data, isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #3498db",
        borderRadius: "5px",
        background: "#ebf5fb",
        minWidth: "150px",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "5px",
          borderBottom: "1px solid #3498db",
          paddingBottom: "5px",
          color: "#2874a6",
        }}
      >
        <Clock size={14} style={{ marginRight: "5px" }} />
        <strong>Delay</strong>
      </div>

      <div style={{ fontSize: "12px", color: "#555" }}>
        Wait: <strong>{data.delay || "5"} seconds</strong>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
