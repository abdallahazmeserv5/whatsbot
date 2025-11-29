import { useState } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import FlowBuilder from "./components/FlowBuilder/FlowBuilder";
import FlowList from "./components/FlowList";

function App() {
  const [currentView, setCurrentView] = useState<
    "dashboard" | "flows" | "builder"
  >("dashboard");

  return (
    <div className="App">
      <header
        style={{
          background: "#343a40",
          color: "white",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>
          WhatsApp Automation System
        </h1>
        <nav style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setCurrentView("dashboard")}
            style={{
              padding: "8px 16px",
              background:
                currentView === "dashboard" ? "#007bff" : "transparent",
              color: "white",
              border: currentView === "dashboard" ? "none" : "1px solid white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Sessions
          </button>
          <button
            onClick={() => setCurrentView("flows")}
            style={{
              padding: "8px 16px",
              background: currentView === "flows" ? "#007bff" : "transparent",
              color: "white",
              border: currentView === "flows" ? "none" : "1px solid white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Flows
          </button>
          <button
            onClick={() => setCurrentView("builder")}
            style={{
              padding: "8px 16px",
              background: currentView === "builder" ? "#007bff" : "transparent",
              color: "white",
              border: currentView === "builder" ? "none" : "1px solid white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Flow Builder
          </button>
        </nav>
      </header>

      <main>
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "flows" && <FlowList />}
        {currentView === "builder" && <FlowBuilder />}
      </main>
    </div>
  );
}

export default App;
