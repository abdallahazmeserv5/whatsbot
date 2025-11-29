import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Globe } from "lucide-react";

export const HttpRequestNode = memo(({ data, isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #16a085",
        borderRadius: "5px",
        background: "#e8f8f5",
        minWidth: "180px",
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
          borderBottom: "1px solid #16a085",
          paddingBottom: "5px",
          color: "#117a65",
        }}
      >
        <Globe size={14} style={{ marginRight: "5px" }} />
        <strong>HTTP Request</strong>
      </div>

      <div style={{ fontSize: "12px", color: "#555" }}>
        <div>
          <strong>{data.method || "GET"}</strong>
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "#777",
            marginTop: "3px",
            wordBreak: "break-all",
          }}
        >
          {data.url || "https://api.example.com"}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
