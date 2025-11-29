import { memo } from "react";
import { Handle, Position } from "reactflow";
import { MessageSquare } from "lucide-react";

export const MessageNode = memo(({ data, isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #777",
        borderRadius: "5px",
        background: "#fff",
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
          borderBottom: "1px solid #eee",
          paddingBottom: "5px",
        }}
      >
        <MessageSquare size={14} style={{ marginRight: "5px" }} />
        <strong>Send Message</strong>
      </div>

      <div style={{ fontSize: "12px", color: "#555" }}>
        {data.text || "Enter message..."}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
