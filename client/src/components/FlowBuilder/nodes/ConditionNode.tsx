import { memo } from "react";
import { Handle, Position } from "reactflow";
import { GitFork } from "lucide-react";

export const ConditionNode = memo(({ data, isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #f39c12",
        borderRadius: "5px",
        background: "#fef5e7",
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
          borderBottom: "1px solid #f39c12",
          paddingBottom: "5px",
          color: "#d35400",
        }}
      >
        <GitFork size={14} style={{ marginRight: "5px" }} />
        <strong>Condition</strong>
      </div>

      <div style={{ fontSize: "12px", color: "#555", marginBottom: "5px" }}>
        If message contains: <br />
        <strong>{data.condition || "keyword"}</strong>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "10px",
        }}
      >
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: "10px", color: "#27ae60" }}>True</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: "10px", background: "#27ae60" }}
            isConnectable={isConnectable}
          />
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: "10px", color: "#c0392b" }}>False</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: "10px", background: "#c0392b", marginTop: "15px" }}
            isConnectable={isConnectable}
          />
        </div>
      </div>
    </div>
  );
});
