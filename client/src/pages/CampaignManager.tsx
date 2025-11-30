import React, { useState, useEffect } from "react";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  MessageSquare,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "failed";
  totalRecipients: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
}

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    template: "",
    contacts: "", // Text area for CSV/numbers
  });

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      alert("Failed to fetch campaigns");
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse contacts
      const contactsList = newCampaign.contacts
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [phone] = line.split(",");
          return {
            phoneNumber: phone,
            variables: {}, // TODO: Parse variables
          };
        });

      const response = await fetch("http://localhost:3000/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name,
          template: newCampaign.template,
          contacts: contactsList,
        }),
      });

      if (!response.ok) throw new Error("Failed to create campaign");

      setShowCreateModal(false);
      setNewCampaign({ name: "", template: "", contacts: "" });
      fetchCampaigns();
      alert("Campaign created successfully!");
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Failed to create campaign");
    }
  };

  const handleAction = async (
    id: string,
    action: "start" | "pause" | "resume"
  ) => {
    try {
      await fetch(`http://localhost:3000/api/campaigns/${id}/${action}`, {
        method: "POST",
      });
      fetchCampaigns();
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      alert(`Failed to ${action} campaign`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await fetch(`http://localhost:3000/api/campaigns/${id}`, {
        method: "DELETE",
      });
      fetchCampaigns();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      alert("Failed to delete campaign");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your WhatsApp marketing campaigns
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          New Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <span className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-indigo-600" />
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-indigo-600 truncate">
                          {campaign.name}
                        </h3>
                        <div className="ml-2 shrink-0 flex">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              campaign.status
                            )}`}
                          >
                            {campaign.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Users className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {campaign.totalRecipients} Recipients
                          </span>
                          <span className="flex items-center">
                            <CheckCircle className="shrink-0 mr-1.5 h-4 w-4 text-green-400" />
                            {campaign.successCount} Sent
                          </span>
                          <span className="flex items-center">
                            <AlertCircle className="shrink-0 mr-1.5 h-4 w-4 text-red-400" />
                            {campaign.failedCount} Failed
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 mx-4 max-w-xs">
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                              <div
                                style={{
                                  width: `${
                                    (campaign.processedCount /
                                      campaign.totalRecipients) *
                                    100
                                  }%`,
                                }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex items-center space-x-2">
                    {campaign.status === "draft" && (
                      <button
                        onClick={() => handleAction(campaign.id, "start")}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                        title="Start Campaign"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                    )}
                    {campaign.status === "running" && (
                      <button
                        onClick={() => handleAction(campaign.id, "pause")}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full"
                        title="Pause Campaign"
                      >
                        <Pause className="h-5 w-5" />
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        onClick={() => handleAction(campaign.id, "resume")}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                        title="Resume Campaign"
                      >
                        <Play className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {campaigns.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              No campaigns found. Create your first campaign to get started.
            </li>
          )}
        </ul>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
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
                  <MessageSquare
                    className="h-6 w-6 text-indigo-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Create New Campaign
                  </h3>
                </div>
              </div>
              <form onSubmit={handleCreateCampaign} className="mt-5 sm:mt-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={newCampaign.name}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Message Template
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Hello {{name}}, check out our new offer!"
                      value={newCampaign.template}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          template: e.target.value,
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use {"{{variable}}"} for personalization.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Contacts (CSV Format)
                    </label>
                    <textarea
                      required
                      rows={6}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                      placeholder="201012345678,John Doe&#10;201098765432,Jane Smith"
                      value={newCampaign.contacts}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          contacts: e.target.value,
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Format: PhoneNumber,Variable1,Variable2... (one per line)
                    </p>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    Create Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
    </div>
  );
}
