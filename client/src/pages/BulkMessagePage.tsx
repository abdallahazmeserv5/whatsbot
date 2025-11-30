import { useState, useEffect } from "react";
import { bulkMessageAPI, sessionsAPI } from "../services/api";

interface Session {
  sessionId: string;
  status: string;
}

export default function BulkMessagePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);
  const [results, setResults] = useState<any>(null);

  // Batch Mode State
  const [batchMode, setBatchMode] = useState(false);
  const [batchSize, setBatchSize] = useState(1000);
  const [batchDelay, setBatchDelay] = useState(1); // in minutes
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [nextBatchTime, setNextBatchTime] = useState<Date | null>(null);

  useEffect(() => {
    fetchSessions();
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

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSession || !numbers || !message) {
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

    setLoading(true);
    setResults(null);
    setCurrentBatch(0);
    setNextBatchTime(null);

    // Initialize progress
    const initialProgress = { sent: 0, failed: 0, total: numberList.length };
    setProgress(initialProgress);

    console.log(`[Frontend] 🚀 Starting Bulk Send Process`);
    console.log(`[Frontend] Total Numbers: ${numberList.length}`);
    console.log(`[Frontend] Mode: ${batchMode ? "BATCH MODE" : "ALL AT ONCE"}`);

    try {
      if (batchMode) {
        // BATCH MODE LOGIC
        const batches = [];
        for (let i = 0; i < numberList.length; i += batchSize) {
          batches.push(numberList.slice(i, i + batchSize));
        }

        setTotalBatches(batches.length);
        console.log(
          `[Frontend] Split into ${batches.length} batches of size ~${batchSize}`
        );

        let cumulativeResults = {
          sent: 0,
          failed: 0,
          results: [] as any[],
          errors: [] as any[],
        };

        for (let i = 0; i < batches.length; i++) {
          setCurrentBatch(i + 1);
          const batchNumbers = batches[i];

          console.log(
            `[Frontend] 📦 Processing Batch ${i + 1}/${batches.length} (${
              batchNumbers.length
            } numbers)`
          );

          // Send current batch
          const result = await bulkMessageAPI.sendBulk({
            sessionId: selectedSession,
            numbers: batchNumbers,
            message,
          });

          console.log(
            `[Frontend] ✅ Batch ${i + 1} Complete. Sent: ${
              result.sent
            }, Failed: ${result.failed}`
          );

          // Update cumulative results
          cumulativeResults.sent += result.sent;
          cumulativeResults.failed += result.failed;
          cumulativeResults.results = [
            ...cumulativeResults.results,
            ...result.results,
          ];
          cumulativeResults.errors = [
            ...cumulativeResults.errors,
            ...result.errors,
          ];

          // Update UI
          setProgress({
            sent: cumulativeResults.sent,
            failed: cumulativeResults.failed,
            total: numberList.length,
          });
          setResults({ ...cumulativeResults }); // Update results in real-time

          // Wait for delay if not the last batch
          if (i < batches.length - 1) {
            const delayMs = batchDelay * 60 * 1000;
            const nextTime = new Date(Date.now() + delayMs);
            setNextBatchTime(nextTime);

            console.log(
              `[Frontend] ⏳ Waiting ${batchDelay} minutes before next batch...`
            );
            console.log(
              `[Frontend] Resuming at: ${nextTime.toLocaleTimeString()}`
            );

            await sleep(delayMs);
            setNextBatchTime(null);
          }
        }
        console.log(`[Frontend] 🎉 All batches completed!`);
      } else {
        // NORMAL MODE (All at once)
        console.log(
          `[Frontend] Sending all ${numberList.length} numbers at once...`
        );

        const result = await bulkMessageAPI.sendBulk({
          sessionId: selectedSession,
          numbers: numberList,
          message,
        });

        console.log(
          `[Frontend] ✅ Send Complete. Sent: ${result.sent}, Failed: ${result.failed}`
        );

        setProgress({
          sent: result.sent,
          failed: result.failed,
          total: numberList.length,
        });
        setResults(result);
      }
    } catch (error: any) {
      console.error(`[Frontend] ❌ Error during send:`, error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setNextBatchTime(null);
    }
  };

  const connectedSessions = sessions.filter((s) => s.status === "connected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📤 Bulk Messaging
          </h1>
          <p className="text-sm text-gray-500">
            Send messages to thousands of contacts in parallel
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                ⚡ Maximum Throughput Mode
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="font-semibold">
                  This system fires ALL messages SIMULTANEOUSLY using
                  Promise.all()
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>No throttling or delays - instant firing</li>
                  <li>No limits - 50k, 100k, 200k+ supported</li>
                  <li>Continues on error (ban-resistant)</li>
                  <li>Check terminal logs for detailed timing info</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSend} className="space-y-4">
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

            {/* Batch Mode Settings */}
            <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
              <div className="flex items-center mb-4">
                <input
                  id="batch-mode"
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => setBatchMode(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label
                  htmlFor="batch-mode"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Enable Batch Mode (Recommended for 10k+ numbers)
                </label>
              </div>

              {batchMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      min="100"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Numbers per batch
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay (Minutes)
                    </label>
                    <input
                      type="number"
                      value={batchDelay}
                      onChange={(e) => setBatchDelay(Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      min="1"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wait time between batches
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Phone Numbers with File Import */}
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
                    📁 Import from File (CSV/TXT)
                  </label>
                </div>
              </div>
              <textarea
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                rows={10}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
                placeholder="201012345678&#10;201087654321&#10;201098765432"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {numbers.split("\n").filter((n) => n.trim()).length} number(s)
              </p>
            </div>

            {/* Message */}
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
                disabled={loading}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !selectedSession || !numbers || !message}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {loading
                ? batchMode
                  ? nextBatchTime
                    ? `⏳ Waiting for next batch...`
                    : `📤 Sending Batch ${currentBatch}/${totalBatches}...`
                  : "📤 Sending..."
                : "📤 Send Bulk Messages"}
            </button>

            {/* Progress */}
            {progress && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-blue-900">
                    Progress
                  </h3>
                  {batchMode && loading && (
                    <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Batch {currentBatch}/{totalBatches}
                    </span>
                  )}
                </div>

                {nextBatchTime && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-center animate-pulse">
                    <span className="mr-2">⏳</span>
                    Waiting for next batch. Resuming at{" "}
                    {nextBatchTime.toLocaleTimeString()}...
                    <span className="ml-auto font-bold">
                      DO NOT CLOSE THIS TAB
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{progress.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">✓ Sent:</span>
                    <span className="font-medium text-green-600">
                      {progress.sent}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">✗ Failed:</span>
                    <span className="font-medium text-red-600">
                      {progress.failed}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          ((progress.sent + progress.failed) / progress.total) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {results && !loading && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-green-50 rounded-md border border-green-200">
                  <h3 className="text-sm font-medium text-green-900 mb-2">
                    ✅ Bulk Send Complete!
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Sent</p>
                      <p className="text-2xl font-bold text-green-600">
                        {results.sent}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {results.failed}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {(
                          (results.sent / (results.sent + results.failed)) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const successful = results.results
                          .filter((r: any) => r.status === "success")
                          .map((r: any) => r.number);
                        const csv = successful.join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `successful_numbers_${Date.now()}.csv`;
                        a.click();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md"
                    >
                      📥 Download Successful ({results.sent})
                    </button>
                    <button
                      onClick={() => {
                        const failed = results.results
                          .filter((r: any) => r.status === "failed")
                          .map((r: any) => `${r.number},${r.error}`);
                        const csv = "Number,Error\n" + failed.join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `failed_numbers_${Date.now()}.csv`;
                        a.click();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
                    >
                      📥 Download Failed ({results.failed})
                    </button>
                    <button
                      onClick={() => {
                        const json = JSON.stringify(results.results, null, 2);
                        const blob = new Blob([json], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `bulk_send_results_${Date.now()}.json`;
                        a.click();
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md"
                    >
                      📥 Download Full Results (JSON)
                    </button>
                  </div>
                </div>

                {results.sent > 0 && (
                  <details
                    open
                    className="bg-white border border-green-200 rounded-md"
                  >
                    <summary className="p-3 cursor-pointer font-medium text-green-900 bg-green-50 hover:bg-green-100">
                      ✅ Successful Numbers ({results.sent})
                    </summary>
                    <div className="p-3 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-3 gap-2">
                        {results.results
                          .filter((r: any) => r.status === "success")
                          .map((r: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded"
                            >
                              ✓ {r.number}
                            </div>
                          ))}
                      </div>
                    </div>
                  </details>
                )}

                {results.failed > 0 && (
                  <details className="bg-white border border-red-200 rounded-md">
                    <summary className="p-3 cursor-pointer font-medium text-red-900 bg-red-50 hover:bg-red-100">
                      ❌ Failed Numbers ({results.failed})
                    </summary>
                    <div className="p-3 max-h-60 overflow-y-auto space-y-1">
                      {results.errors.map((err: any, idx: number) => (
                        <div
                          key={idx}
                          className="text-xs bg-red-50 border border-red-200 p-2 rounded"
                        >
                          <div className="font-mono text-red-900 font-semibold">
                            ✗ {err.number}
                          </div>
                          <div className="text-red-700 mt-1">
                            Error: {err.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
