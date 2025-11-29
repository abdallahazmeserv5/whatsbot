import React, { useState, useCallback } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MiniMap,
} from "reactflow";
import type { Connection, Node } from "reactflow";
import "reactflow/dist/style.css";
import Sidebar from "./Sidebar";
import { MessageNode } from "./nodes/MessageNode";
import { StartNode } from "./nodes/StartNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { DelayNode } from "./nodes/DelayNode";
import { HttpRequestNode } from "./nodes/HttpRequestNode";
import { EmailNode } from "./nodes/EmailNode";
import { saveFlow } from "../../services/FlowService";

const nodeTypes = {
  message: MessageNode,
  start: StartNode,
  condition: ConditionNode,
  delay: DelayNode,
  http: HttpRequestNode,
  email: EmailNode,
};

const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 250, y: 5 },
    data: { label: "Start Flow" },
  },
];

const FlowBuilderCanvas = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [flowName, setFlowName] = useState("My Flow");
  const [saveStatus, setSaveStatus] = useState<string>("");

  const validateFlow = useCallback(() => {
    // Check if there's at least one start node
    const hasStart = nodes.some((n) => n.type === "start");
    if (!hasStart) {
      return "Flow must have a Start node";
    }

    // Check for disconnected nodes (except start)
    const connectedNodeIds = new Set<string>();
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const disconnectedNodes = nodes.filter(
      (n) => n.type !== "start" && !connectedNodeIds.has(n.id)
    );

    if (disconnectedNodes.length > 0) {
      return `Warning: ${disconnectedNodes.length} disconnected node(s)`;
    }

    return null;
  }, [nodes, edges]);

  const onSave = useCallback(async () => {
    if (!reactFlowInstance) return;

    // Validate flow
    const validationError = validateFlow();
    if (validationError && validationError.startsWith("Flow must")) {
      setSaveStatus(`Error: ${validationError}`);
      return;
    }

    const flow = reactFlowInstance.toObject();
    try {
      setSaveStatus("Saving...");
      await saveFlow(flowName, flow.nodes, flow.edges, "keyword", [
        "hello",
        "hi",
      ]);
      setSaveStatus("✓ Flow saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error: any) {
      setSaveStatus(`✗ Failed: ${error.message || "Unknown error"}`);
    }
  }, [reactFlowInstance, flowName, validateFlow]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodesDelete = useCallback((deleted: Node[]) => {
    console.log(
      "Deleted nodes:",
      deleted.map((n) => n.id)
    );
  }, []);

  const onEdgesDelete = useCallback((deleted: any[]) => {
    console.log(
      "Deleted edges:",
      deleted.map((e) => e.id)
    );
  }, []);

  return (
    <div
      className="dndflow"
      style={{
        width: "100%",
        height: "90vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: "#f8f9fa",
        }}
      >
        <input
          type="text"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          placeholder="Flow name"
          style={{
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            flex: "0 0 200px",
          }}
        />
        <button
          onClick={onSave}
          style={{
            padding: "8px 16px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          Save Flow
        </button>
        {saveStatus && (
          <span
            style={{
              fontSize: "14px",
              color: saveStatus.includes("✓")
                ? "#28a745"
                : saveStatus.includes("✗")
                ? "#dc3545"
                : "#6c757d",
            }}
          >
            {saveStatus}
          </span>
        )}
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "#6c757d" }}>
          Press Delete to remove selected nodes/edges
        </div>
      </div>
      <div style={{ display: "flex", flexGrow: 1 }}>
        <Sidebar />
        <div
          className="reactflow-wrapper"
          style={{ flexGrow: 1, height: "100%" }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
          >
            <Controls />
            <MiniMap />
            <Background />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default function FlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas />
    </ReactFlowProvider>
  );
}
