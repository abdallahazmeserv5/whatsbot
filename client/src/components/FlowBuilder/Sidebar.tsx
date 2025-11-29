import React from "react";
import { MessageSquare, Play, GitFork, Clock, Globe, Mail } from "lucide-react";

export default function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      style={{
        width: "250px",
        padding: "15px",
        borderRight: "1px solid #eee",
        background: "#fcfcfc",
      }}
    >
      <div className="description" style={{ marginBottom: "10px" }}>
        You can drag these nodes to the pane on the right.
      </div>

      <div
        className="dndnode input"
        onDragStart={(event) => onDragStart(event, "message")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <MessageSquare size={16} style={{ marginRight: "8px" }} />
        Message Node
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "start")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <Play size={16} style={{ marginRight: "8px" }} />
        Start Node
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "condition")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <GitFork size={16} style={{ marginRight: "8px" }} />
        Condition Node
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "delay")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <Clock size={16} style={{ marginRight: "8px" }} />
        Delay Node
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "http")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <Globe size={16} style={{ marginRight: "8px" }} />
        HTTP Request
      </div>

      <div
        className="dndnode"
        onDragStart={(event) => onDragStart(event, "email")}
        draggable
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          marginBottom: "10px",
          cursor: "grab",
          background: "white",
        }}
      >
        <Mail size={16} style={{ marginRight: "8px" }} />
        Send Email
      </div>
    </aside>
  );
}
