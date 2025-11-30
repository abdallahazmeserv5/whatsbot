import { useState, useEffect } from "react";
import { broadcastAPI, sessionsAPI } from "../services/api";

interface Session {
  sessionId: string;
  status: string;
}

interface BroadcastList {
  id: string;
  name: string;
  groupCount: number;
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
}

export default function BroadcastPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [broadcasts, setBroadcasts] = useState<BroadcastList[]>([]);
  const [loading, setLoading] = useState(false);

  // Create broadcast form
  const [broadcastName, setBroadcastName] = useState("");
  const [numbers, setNumbers] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Send message form
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSessions();
    fetchBroadcasts();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await sessionsAPI.getAll();
      setSessions(data.sessions || []);
      const connected = data.sessions?.find(
        (s: Session) => s.status === "connected"
      );
      if (connected) {
        setSelectedSession(connected.sessionId);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const data = await broadcastAPI.getAll();
      setBroadcasts(data.broadcasts || []);
    } catch (error) {
      console.error("Failed to fetch broadcasts:", error);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let extractedNumbers: string[] = [];

      if (file.name.endsWith(".csv")) {
        extractedNumbers = text
          .split("\n")
          .flatMap((line) => line.split(","))
          .map((cell) => cell.trim().replace(/['"]/g, ""))
          .filter((cell) => /^\d+$/.test(cell));
      } else if (file.name.endsWith(".txt")) {
        extractedNumbers = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^\d+$/.test(line));
      } else {
        alert("Unsupported file type. Please use .csv or .txt files.");
        return;
      }

      if (extractedNumbers.length === 0) {
        alert("No valid phone numbers found in the file.");
        return;
      }

      setNumbers(extractedNumbers.join("\n"));
      alert(`✅ Imported ${extractedNumbers.length} numbers from ${file.name}`);
      e.target.value = "";
    } catch (error: any) {
      alert(`Error importing file: ${error.message}`);
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSession || !broadcastName || !numbers) {
      alert("Please fill in all fields");
      return;
    }

    const numberList = numbers
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (numberList.length === 0) {
      alert("Please enter at least one phone number");
      return;
    }

    if (numberList.length > 256) {
      alert("WhatsApp broadcast lists support a maximum of 256 contacts");
      return;
    }

    setLoading(true);
    try {
      await broadcastAPI.create({
        sessionId: selectedSession,
        name: broadcastName,
        numbers: numberList,
      });

      alert(`✅ Broadcast "${broadcastName}" created successfully!`);
      setBroadcastName("");
      setNumbers("");
      setShowCreateForm(false);
      fetchBroadcasts();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToBroadcast = async (broadcastId: string) => {
    if (!message) {
      alert("Please enter a message");
      return;
    }

    setLoading(true);
    try {
      const result = await broadcastAPI.send(broadcastId, message);
      alert(
        `✅ Message sent to broadcast!\nRecipients: ${result.totalRecipients}\nGroups: ${result.groupsSent}`
      );
      setMessage("");
      setSendingTo(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBroadcast = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await broadcastAPI.delete(id);
      alert(`✅ Broadcast "${name}" deleted`);
      fetchBroadcasts();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const connectedSessions = sessions.filter((s) => s.status === "connected");
  const numberCount = numbers.split("\n").filter((n) => n.trim()).length;
  const isOverLimit = numberCount > 256;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📢 Broadcast Lists
          </h1>
          <p className="text-sm text-gray-500">
            Create and manage WhatsApp broadcast lists (up to 256 contacts)
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                📱 WhatsApp Broadcast Information
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Maximum 256 contacts per broadcast list</li>
                  <li>
                    Recipients must have saved your number to receive messages
                  </li>
                  <li>Messages appear as individual chats to recipients</li>
                  <li>
                    Create multiple broadcast lists for different audiences
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Create Broadcast Button */}
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-6 w-full flex justify-center items-center py-4 px-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <svg
              className="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Broadcast List
          </button>
        )}

        {/* Create Broadcast Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Create Broadcast List
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4">
              {/* Session Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Session
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border"
                  disabled={loading}
                >
                  <option value="">Select a session...</option>
                  {connectedSessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      {session.sessionId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Broadcast Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broadcast Name
                </label>
                <input
                  type="text"
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border"
                  placeholder="e.g., VIP Customers, Newsletter Subscribers"
                  disabled={loading}
                />
              </div>

              {/* Phone Numbers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Numbers (one per line)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileImport}
                      className="hidden"
                      id="file-import"
                      disabled={loading}
                    />
                    <label
                      htmlFor="file-import"
                      className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                        loading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      📁 Import CSV/TXT
                    </label>
                  </div>
                </div>
                <textarea
                  value={numbers}
                  onChange={(e) => setNumbers(e.target.value)}
                  rows={10}
                  className={`block w-full rounded-md shadow-sm sm:text-sm p-2 border font-mono ${
                    isOverLimit
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  }`}
                  placeholder="201012345678&#10;201087654321&#10;201098765432"
                  disabled={loading}
                />
                <div className="flex justify-between items-center mt-1">
                  <p
                    className={`text-xs ${
                      isOverLimit
                        ? "text-red-600 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {numberCount} contact(s){" "}
                    {isOverLimit && "- EXCEEDS 256 LIMIT!"}
                  </p>
                  {isOverLimit && (
                    <p className="text-xs text-red-600">
                      Remove {numberCount - 256} contact(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !selectedSession ||
                  !broadcastName ||
                  !numbers ||
                  isOverLimit
                }
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || isOverLimit
                    ? "bg-purple-400"
                    : "bg-purple-600 hover:bg-purple-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {loading ? "Creating..." : "📢 Create Broadcast List"}
              </button>
            </form>
          </div>
        )}

        {/* Broadcast Lists */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">
            Saved Broadcast Lists ({broadcasts.length})
          </h2>

          {broadcasts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No broadcast lists yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Create your first broadcast list to get started
              </p>
            </div>
          ) : (
            broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {broadcast.name}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>👥 {broadcast.totalMembers} contacts</span>
                      <span>📦 {broadcast.groupCount} group(s)</span>
                      <span>
                        📅 {new Date(broadcast.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleDeleteBroadcast(broadcast.id, broadcast.name)
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Send Message Form */}
                {sendingTo === broadcast.id ? (
                  <div className="mt-4 p-4 bg-purple-50 rounded-md">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2 border mb-2"
                      placeholder="Type your message here..."
                      disabled={loading}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendToBroadcast(broadcast.id)}
                        disabled={loading || !message}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Sending..." : "📤 Send Message"}
                      </button>
                      <button
                        onClick={() => {
                          setSendingTo(null);
                          setMessage("");
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSendingTo(broadcast.id)}
                    className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    📤 Send Message to This Broadcast
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
