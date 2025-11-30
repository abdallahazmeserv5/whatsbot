import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  Smartphone,
  Activity,
  BarChart2,
  Wifi,
  WifiOff,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Sender {
  id: string;
  name: string;
  phoneNumber: string;
  status: "connected" | "disconnected" | "banned" | "paused";
  healthScore: number;
  sentThisDay: number;
  quotaPerDay: number;
  lastConnected: string;
}

export default function SenderManager() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSender, setNewSender] = useState({
    name: "",
    phoneNumber: "",
    quotaPerDay: 5000,
  });

  // QR Code State
  const [connectingSenderId, setConnectingSenderId] = useState<string | null>(
    null
  );
  const [qrCode, setQrCode] = useState<string | null>(null);

  const fetchSenders = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/senders");
      const data = await response.json();
      setSenders(data);
    } catch (error) {
      console.error("Error fetching senders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSenders();
    const interval = setInterval(fetchSenders, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Poll for QR Code and Status when connecting
  useEffect(() => {
    if (!connectingSenderId) return;

    const pollInterval = setInterval(async () => {
      try {
        // Check status
        const statusRes = await fetch(
          `http://localhost:3000/api/senders/${connectingSenderId}`
        );
        const sender = await statusRes.json();

        if (sender.status === "connected") {
          setConnectingSenderId(null);
          setQrCode(null);
          fetchSenders();
          alert("✅ Sender connected successfully!");
          return;
        }

        // Fetch QR Code
        const qrRes = await fetch(
          `http://localhost:3000/api/senders/${connectingSenderId}/qr`
        );
        if (qrRes.ok) {
          const data = await qrRes.json();
          setQrCode(data.qr);
        }
      } catch (error) {
        console.error("Error polling status/QR:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [connectingSenderId]);

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSender),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewSender({ name: "", phoneNumber: "", quotaPerDay: 5000 });
        fetchSenders();
        const createdSender = await response.json();
        // Auto-start connection
        handleConnect(createdSender.id);
      } else {
        alert("Failed to add sender");
      }
    } catch (error) {
      console.error("Error adding sender:", error);
      alert("Error adding sender");
    }
  };

  const handleDeleteSender = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sender?")) return;
    try {
      await fetch(`http://localhost:3000/api/senders/${id}`, {
        method: "DELETE",
      });
      fetchSenders();
    } catch (error) {
      console.error("Error deleting sender:", error);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/senders/${id}/connect`, {
        method: "POST",
      });
      setConnectingSenderId(id);
      setQrCode(null); // Reset QR while waiting for new one
    } catch (error) {
      console.error("Error starting connection:", error);
      alert("Failed to start connection process");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "disconnected":
        return "bg-gray-100 text-gray-800";
      case "banned":
        return "bg-red-100 text-red-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sender Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp numbers and monitor their health
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Sender
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Smartphone className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Senders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {senders.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Sessions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {senders.filter((s) => s.status === "connected").length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart2 className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Daily Capacity
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {senders
                      .reduce((acc, s) => acc + s.quotaPerDay, 0)
                      .toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Senders List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {senders.map((sender) => (
            <li key={sender.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <span className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        {sender.status === "connected" ? (
                          <Wifi className="h-6 w-6 text-green-500" />
                        ) : (
                          <WifiOff className="h-6 w-6 text-gray-400" />
                        )}
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-indigo-600 truncate">
                          {sender.name}
                        </h3>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              sender.status
                            )}`}
                          >
                            {sender.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex space-x-4 text-sm text-gray-500">
                          <span>{sender.phoneNumber}</span>
                          <span>Health: {sender.healthScore}%</span>
                          <span>
                            Usage: {sender.sentThisDay} / {sender.quotaPerDay}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Last connected:{" "}
                          {sender.lastConnected
                            ? new Date(
                                sender.lastConnected
                              ).toLocaleDateString()
                            : "Never"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {sender.status === "disconnected" && (
                      <button
                        onClick={() => handleConnect(sender.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                        title="Connect (Scan QR)"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => fetchSenders()}
                      className="p-2 text-gray-400 hover:text-gray-500 rounded-full"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSender(sender.id)}
                      className="p-2 text-red-400 hover:text-red-500 rounded-full"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {senders.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              No senders found. Add a sender to get started.
            </li>
          )}
        </ul>
      </div>

      {/* Add Sender Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <Smartphone
                    className="h-6 w-6 text-indigo-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Add New Sender
                  </h3>
                </div>
              </div>
              <form onSubmit={handleAddSender} className="mt-5 sm:mt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newSender.name}
                      onChange={(e) =>
                        setNewSender({ ...newSender, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newSender.phoneNumber}
                      onChange={(e) =>
                        setNewSender({
                          ...newSender,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Daily Quota
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10000"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newSender.quotaPerDay}
                      onChange={(e) =>
                        setNewSender({
                          ...newSender,
                          quotaPerDay: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    Add Sender
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {connectingSenderId && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <QrCode
                    className="h-6 w-6 text-indigo-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Scan QR Code
                  </h3>
                  <div className="mt-4 flex justify-center">
                    {qrCode ? (
                      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                        <QRCodeSVG value={qrCode} size={256} />
                      </div>
                    ) : (
                      <div className="h-64 w-64 flex items-center justify-center bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Open WhatsApp on your phone {">"} Linked Devices {">"} Link
                    a Device
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setConnectingSenderId(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
