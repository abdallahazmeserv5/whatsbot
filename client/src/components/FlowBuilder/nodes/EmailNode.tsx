import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Mail } from "lucide-react";

export const EmailNode = memo(({ data, isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #e74c3c",
        borderRadius: "5px",
        background: "#fadbd8",
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
          borderBottom: "1px solid #e74c3c",
          paddingBottom: "5px",
          color: "#c0392b",
        }}
      >
        <Mail size={14} style={{ marginRight: "5px" }} />
        <strong>Send Email</strong>
      </div>

      <div style={{ fontSize: "12px", color: "#555" }}>
        <div
          style={{
            fontSize: "10px",
            color: "#777",
            marginTop: "3px",
            wordBreak: "break-all",
          }}
        >
          To: {data.to || "recipient@example.com"}
        </div>
        <div style={{ fontSize: "10px", color: "#777", marginTop: "2px" }}>
          Subject: {data.subject || "Email subject"}
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
