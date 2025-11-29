import { memo } from "react";
import { Handle, Position } from "reactflow";
import { Play } from "lucide-react";

export const StartNode = memo(({ isConnectable }: any) => {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #2ecc71",
        borderRadius: "5px",
        background: "#eafaf1",
        minWidth: "100px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#27ae60",
        }}
      >
        <Play size={14} style={{ marginRight: "5px" }} />
        <strong>Start</strong>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
});
