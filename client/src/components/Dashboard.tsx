import React, { useState, useEffect } from "react";
import axios from "axios";
import { LoginScreen } from "./LoginScreen";

interface Session {
  sessionId: string;
  status: string;
}

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState("");
  const [useBroadcast, setUseBroadcast] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{
    total: number;
    current: number;
    results: {
      recipient: string;
      status: string;
      error?: string;
      sessionId?: string;
    }[];
  } | null>(null);
  const [showLoginScreen, setShowLoginScreen] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axios.get("http://localhost:3000/sessions");
      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const addSession = () => {
    setShowLoginScreen(true);
  };

  const handleSessionStart = (sessionId: string) => {
    setShowLoginScreen(false);
    setStatus({
      type: "success",
      text: `Session ${sessionId} connected successfully!`,
    });
    fetchSessions();
  };

  // Auto-select first connected session
  useEffect(() => {
    const connectedSession = sessions.find((s) => s.status === "connected");
    if (connectedSession && !selectedSession) {
      setSelectedSession(connectedSession.sessionId);
    }
  }, [sessions, selectedSession]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    if (isBulkMode) {
      await sendBulkMessage();
    } else {
      await sendSingleMessage();
    }
  };

  const sendSingleMessage = async () => {
    if (!to || !selectedSession) return;

    setSending(true);
    setStatus(null);
    console.log("🚀 Sending message:", {
      sessionId: selectedSession,
      to,
      text: message,
    });
    try {
      await axios.post("http://localhost:3000/message/send", {
        sessionId: selectedSession,
        to,
        text: message,
      });
      setStatus({ type: "success", text: "Message sent successfully!" });
      setMessage("");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setStatus({ type: "error", text: errorMessage });
    } finally {
      setSending(false);
    }
  };

  const sendBulkMessage = async () => {
    const recipients = bulkRecipients
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (recipients.length === 0) {
      setStatus({
        type: "error",
        text: "Please enter at least one phone number",
      });
      return;
    }

    if (!useBroadcast && !selectedSession) {
      setStatus({ type: "error", text: "Please select a session" });
      return;
    }

    setSending(true);
    setStatus(null);
    setSendingProgress({ total: recipients.length, current: 0, results: [] });

    try {
      const endpoint = useBroadcast
        ? "http://localhost:3000/message/send-all"
        : "http://localhost:3000/message/send-bulk";

      const payload = useBroadcast
        ? { recipients, text: message, delayMs: 2000 }
        : {
            sessionId: selectedSession,
            recipients,
            text: message,
            delayMs: 2000,
          };

      const response = await axios.post(endpoint, payload);

      setSendingProgress({
        total: recipients.length,
        current: recipients.length,
        results: response.data.results,
      });

      const successCount = response.data.results.filter(
        (r: { status: string }) => r.status === "success"
      ).length;
      const failCount = response.data.results.length - successCount;

      setStatus({
        type: failCount === 0 ? "success" : "error",
        text: `Sent ${successCount} message(s) successfully${
          failCount > 0 ? `, ${failCount} failed` : ""
        }`,
      });
      setMessage("");
      setBulkRecipients("");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send bulk messages";
      setStatus({ type: "error", text: errorMessage });
      setSendingProgress(null);
    } finally {
      setSending(false);
    }
  };

  const connectedSessions = sessions.filter((s) => s.status === "connected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                WhatsApp Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {connectedSessions.length} session(s) connected
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchSessions}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                🔄 Refresh
              </button>
              <button
                onClick={addSession}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ➕ Add Session
              </button>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Active Sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No sessions yet. Click "Add Session" to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-lg border-2 ${
                    session.status === "connected"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {session.sessionId}
                      </p>
                      <p
                        className={`text-sm ${
                          session.status === "connected"
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {session.status === "connected"
                          ? "✓ Connected"
                          : `Status: ${session.status}`}
                      </p>
                    </div>
                    {session.status === "connected" && (
                      <span className="text-2xl">📱</span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Are you sure you want to delete session "${session.sessionId}"? This will log out the WhatsApp connection and delete all session data.`
                        )
                      ) {
                        try {
                          await axios.delete(
                            `http://localhost:3000/session/${session.sessionId}`
                          );
                          fetchSessions();
                          setStatus({
                            type: "success",
                            text: `Session ${session.sessionId} deleted successfully`,
                          });
                        } catch (err: unknown) {
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Failed to delete session";
                          setStatus({ type: "error", text: errorMessage });
                        }
                      }
                    }}
                    className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                  >
                    🗑️ Delete Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send Message Form */}
        {connectedSessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Send Message
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsBulkMode(false);
                    setSendingProgress(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    !isBulkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Single Number
                </button>
                <button
                  onClick={() => {
                    setIsBulkMode(true);
                    setSendingProgress(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    isBulkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Bulk Send
                </button>
              </div>
            </div>

            <form onSubmit={sendMessage} className="space-y-4">
              {isBulkMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useBroadcast}
                      onChange={(e) => setUseBroadcast(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Broadcast to all sessions (send from all connected
                      numbers)
                    </span>
                  </label>
                </div>
              )}

              {(!isBulkMode || !useBroadcast) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send From (Select Session)
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Select a session...</option>
                    {connectedSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>
                        {session.sessionId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isBulkMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Numbers (one per line, with country code)
                  </label>
                  <textarea
                    value={bulkRecipients}
                    onChange={(e) => setBulkRecipients(e.target.value)}
                    rows={6}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
                    placeholder="1234567890&#10;9876543210&#10;5555555555"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkRecipients.split("\n").filter((r) => r.trim()).length}{" "}
                    recipient(s)
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (with country code)
                  </label>
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="e.g., 1234567890"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="Type your message here..."
                />
              </div>

              <button
                type="submit"
                disabled={
                  sending ||
                  !message ||
                  (isBulkMode
                    ? bulkRecipients.trim().length === 0 ||
                      (!useBroadcast && !selectedSession)
                    : !to || !selectedSession)
                }
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending
                  ? "📤 Sending..."
                  : isBulkMode
                  ? "📤 Send Bulk Messages"
                  : "📤 Send Message"}
              </button>

              {status && (
                <div
                  className={`p-4 rounded-md ${
                    status.type === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {status.text}
                </div>
              )}

              {sendingProgress && sendingProgress.results.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-md p-4 max-h-64 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Sending Results:
                  </h3>
                  <div className="space-y-2">
                    {sendingProgress.results.map((result, idx) => (
                      <div
                        key={idx}
                        className={`text-sm p-2 rounded ${
                          result.status === "success"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{result.recipient}</span>
                          <span className="text-xs">
                            {result.status === "success" ? "✓" : "✗"}
                            {result.sessionId && ` (${result.sessionId})`}
                          </span>
                        </div>
                        {result.error && (
                          <p className="text-xs mt-1">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* QR Code Login Modal */}
      {showLoginScreen && (
        <LoginScreen
          onSessionStart={handleSessionStart}
          onCancel={() => setShowLoginScreen(false)}
        />
      )}
    </div>
  );
};
