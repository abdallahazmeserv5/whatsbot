import React, { useState, useEffect } from "react";
import axios from "axios";

interface Session {
  sessionId: string;
  status: string;
}

const AutoReplyPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    isActive: false,
    senderNumber: "",
    messageContent: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Fetching auto-reply config and sessions...");

      const [configRes, sessionsRes] = await Promise.all([
        axios.get("http://localhost:3000/api/auto-reply"),
        axios.get("http://localhost:3000/sessions"),
      ]);

      console.log("Config response:", configRes.data);
      console.log("Sessions response:", sessionsRes.data);

      setSessions(sessionsRes.data.sessions || []);

      setFormData({
        isActive: configRes.data.isActive,
        senderNumber: configRes.data.senderNumber || "",
        messageContent:
          configRes.data.messageContent ||
          "Thank you for your message. We will get back to you soon!",
      });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      console.error("Error response:", error.response?.data);
      setStatus({
        type: "error",
        text: error.response?.data?.error || "Failed to load configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      await axios.post("http://localhost:3000/api/auto-reply", formData);
      setStatus({
        type: "success",
        text: "Auto-reply configuration saved successfully!",
      });
    } catch (error: any) {
      console.error("Error saving config:", error);
      setStatus({
        type: "error",
        text: error.response?.data?.error || "Failed to save configuration",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show all sessions (not just connected ones)
  const availableSessions = sessions;

  // Debug logging
  console.log("All sessions:", sessions);
  console.log("Available sessions:", availableSessions);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Auto Reply Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure automatic replies to incoming WhatsApp messages
          </p>
        </div>

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Enable Auto Reply
                </h3>
                <p className="text-sm text-gray-500">
                  Automatically respond to incoming messages
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Session Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply From (Select WhatsApp Session)
              </label>
              {availableSessions.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ No sessions available. Please connect a WhatsApp session
                    first on the Dashboard page (scan QR code).
                  </p>
                </div>
              ) : (
                <select
                  value={formData.senderNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, senderNumber: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                  required={formData.isActive}
                >
                  <option value="">Select a session...</option>
                  {availableSessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      {session.sessionId} ({session.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto Reply Message
              </label>
              <textarea
                value={formData.messageContent}
                onChange={(e) =>
                  setFormData({ ...formData, messageContent: e.target.value })
                }
                rows={6}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                placeholder="Enter your auto-reply message here..."
                required={formData.isActive}
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent automatically after 1 second when
                someone sends you a message.
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={
                saving ||
                (formData.isActive &&
                  (!formData.senderNumber || !formData.messageContent))
              }
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "💾 Saving..." : "💾 Save Configuration"}
            </button>

            {/* Status Message */}
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
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            ℹ️ How it works
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              When enabled, the system will automatically reply to all incoming
              messages
            </li>
            <li>The reply will be sent after a 1-second delay</li>
            <li>
              All replies will come from the selected session, regardless of
              which session received the message
            </li>
            <li>
              Make sure the selected session is connected before enabling
              auto-reply
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AutoReplyPage;
