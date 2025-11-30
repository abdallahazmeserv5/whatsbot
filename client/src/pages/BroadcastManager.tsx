import { useState, useEffect } from "react";
import { broadcastAPI, sessionsAPI } from "../services/api";

interface Session {
  sessionId: string;
  status: string;
}

interface BroadcastList {
  id: string;
  name: string;
  sessionId: string;
  totalMembers: number;
  groups: any[];
  createdAt: string;
}

export default function BroadcastManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastList[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] =
    useState<BroadcastList | null>(null);
  const [loading, setLoading] = useState(false);

  // Create modal state
  const [selectedSession, setSelectedSession] = useState("");
  const [broadcastName, setBroadcastName] = useState("");
  const [numbers, setNumbers] = useState("");

  // Send modal state
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);

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
      alert(
        "WhatsApp broadcast lists support a maximum of 256 contacts. Please remove " +
          (numberList.length - 256) +
          " contact(s)."
      );
      return;
    }

    setLoading(true);

    try {
      await broadcastAPI.create({
        sessionId: selectedSession,
        name: broadcastName,
        numbers: numberList,
      });

      alert("Broadcast list created successfully!");
      setShowCreateModal(false);
      setBroadcastName("");
      setNumbers("");
      fetchBroadcasts();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBroadcast || !sendMessage) {
      alert("Please enter a message");
      return;
    }

    setSending(true);

    try {
      const result = await broadcastAPI.send(selectedBroadcast.id, sendMessage);
      alert(
        `Message sent to ${result.groupsSent} groups (${result.totalRecipients} recipients)!`
      );
      setShowSendModal(false);
      setSendMessage("");
      setSelectedBroadcast(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await broadcastAPI.delete(id);
      alert("Broadcast list deleted successfully!");
      fetchBroadcasts();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const numberList = numbers.split("\n").filter((n) => n.trim()).length;
  const groupCount = Math.ceil(numberList / 256);

  const connectedSessions = sessions.filter((s) => s.status === "connected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📢 Broadcast Manager
              </h1>
              <p className="text-sm text-gray-500">
                Create and manage broadcast lists (max 256 contacts per group)
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ➕ Create Broadcast List
            </button>
          </div>
        </div>

        {/* Broadcast Lists Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {broadcasts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No broadcast lists yet. Create one to get started!
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {broadcasts.map((broadcast) => (
                  <tr key={broadcast.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {broadcast.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.sessionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.groups.length} groups
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {broadcast.totalMembers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(broadcast.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBroadcast(broadcast);
                          setShowSendModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        📤 Send
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteBroadcast(broadcast.id, broadcast.name)
                        }
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create Broadcast Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Broadcast List
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
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
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="e.g., Promo Jan 2025"
                    disabled={loading}
                  />
                </div>

                {/* Phone Numbers */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Numbers (one per line)
                    </label>
                    <div>
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
                    rows={8}
                    className={`block w-full rounded-md shadow-sm sm:text-sm p-2 border font-mono ${
                      numberList > 256
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    }`}
                    placeholder="201012345678&#10;201087654321"
                    disabled={loading}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p
                      className={`text-xs ${
                        numberList > 256
                          ? "text-red-600 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {numberList} contact(s){" "}
                      {numberList > 256 && "- EXCEEDS 256 LIMIT!"}
                    </p>
                    {numberList > 256 && (
                      <p className="text-xs text-red-600">
                        Remove {numberList - 256} contact(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {numberList > 0 && (
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">
                      Preview
                    </h3>
                    <p className="text-sm text-gray-700">
                      Total numbers: <strong>{numberList}</strong>
                    </p>
                    <p className="text-sm text-gray-700">
                      Will create: <strong>{groupCount}</strong> broadcast
                      group(s) (max 256 each)
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !selectedSession ||
                      !broadcastName ||
                      !numbers ||
                      numberList > 256
                    }
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Broadcast List"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Send to Broadcast Modal */}
        {showSendModal && selectedBroadcast && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Send to "{selectedBroadcast.name}"
                </h2>
                <button
                  onClick={() => {
                    setShowSendModal(false);
                    setSelectedBroadcast(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
                <p className="text-gray-700">
                  Groups: <strong>{selectedBroadcast.groups.length}</strong>
                </p>
                <p className="text-gray-700">
                  Total Recipients:{" "}
                  <strong>{selectedBroadcast.totalMembers}</strong>
                </p>
              </div>

              <form onSubmit={handleSendToBroadcast} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    rows={6}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Type your message here..."
                    disabled={sending}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={sending || !sendMessage}
                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "📤 Send to All Groups"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSendModal(false);
                      setSelectedBroadcast(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
