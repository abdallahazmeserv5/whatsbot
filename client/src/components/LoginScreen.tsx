import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import axios from "axios";

interface LoginScreenProps {
  onSessionStart: (sessionId: string) => void;
  onCancel: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSessionStart,
  onCancel,
}) => {
  const [sessionId, setSessionId] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      await axios.post("http://localhost:3000/session/start", { sessionId });
      pollQrCode();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const pollQrCode = () => {
    const interval = setInterval(async () => {
      try {
        // Check status first
        const statusRes = await axios.get(
          `http://localhost:3000/session/${sessionId}/status`
        );
        if (statusRes.data.status === "connected") {
          clearInterval(interval);
          onSessionStart(sessionId);
          return;
        }

        // Fetch QR
        const qrRes = await axios.get(
          `http://localhost:3000/session/${sessionId}/qr`
        );
        setQrCode(qrRes.data.qr);
        setLoading(false);
      } catch {
        // Ignore errors during polling (e.g. 404 if QR not ready yet)
      }
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="p-8 bg-white rounded-lg shadow-lg w-96">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Add WhatsApp Session
          </h1>
          {qrCode && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {!qrCode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session ID (Name)
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                placeholder="e.g., my-phone, work-phone"
              />
              <p className="mt-1 text-xs text-gray-500">
                Give this session a memorable name
              </p>
            </div>
            <button
              onClick={startSession}
              disabled={loading || !sessionId}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Generate QR Code"}
            </button>
            <button
              onClick={onCancel}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <QRCodeSVG value={qrCode} size={256} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-700 font-medium mb-1">
                Scan this QR code with WhatsApp
              </p>
              <p className="text-xs text-gray-500">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
            <div className="w-full p-3 bg-indigo-50 rounded-md">
              <p className="text-xs text-indigo-700 text-center">
                <span className="font-medium">Session:</span> {sessionId}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              <span className="text-sm">Waiting for scan...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
