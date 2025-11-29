import { useState, useEffect } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { Dashboard } from "./components/Dashboard";
import axios from "axios";

interface Session {
  sessionId: string;
  status: string;
}

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    try {
      const response = await axios.get("http://localhost:3000/sessions");
      setSessions(response.data.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadSessions = async () => {
      if (mounted) {
        await fetchSessions();
      }
    };

    loadSessions();
    // Poll for session updates every 3 seconds
    const interval = setInterval(fetchSessions, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSessionStart = () => {
    setShowLogin(false);
    fetchSessions();
  };

  return (
    <div>
      {showLogin ? (
        <LoginScreen
          onSessionStart={handleSessionStart}
          onCancel={() => setShowLogin(false)}
        />
      ) : (
        <Dashboard
          sessions={sessions}
          onAddSession={() => setShowLogin(true)}
          onRefreshSessions={fetchSessions}
        />
      )}
    </div>
  );
}

export default App;
