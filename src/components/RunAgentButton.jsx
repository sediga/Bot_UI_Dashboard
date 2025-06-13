import { useState, useEffect } from "react";

export default function RunAgentButton() {
  const [status, setStatus] = useState("idle");

  const checkAgent = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/status");
      const data = await res.json();
      if (data.running !== undefined) {
        setStatus("running");
      } else {
        setStatus("not_running");
      }
    } catch {
      setStatus("not_running");
    }
  };

  const handleDownload = () => {
    const url = "https://botflows.app/downloads/BotflowsAgentInstaller.exe";
    const link = document.createElement("a");
    link.href = url;
    link.download = "BotflowsAgentInstaller.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatus("downloaded");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkAgent();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 bg-white rounded shadow max-w-md mx-auto text-center">
      <h2 className="text-lg font-semibold mb-2">Botflows Agent</h2>

      {status === "idle" && (
        <>
          <p className="mb-4 text-gray-700">Download and run the Botflows Agent to enable local automation.</p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download Agent
          </button>
        </>
      )}

      {status === "downloaded" && (
        <p className="text-sm text-gray-600 mt-4">
          Download complete. Please extract and run <code>api_server.exe</code>. This app will auto-detect when it's running.
        </p>
      )}

      {status === "not_running" && (
        <p className="text-sm text-red-600 mt-4">
          Agent not detected. Make sure you've extracted and launched the app.
        </p>
      )}

      {status === "running" && (
        <p className="text-sm text-green-600 mt-4 font-medium">
          ✅ Botflows Agent is running and connected!
        </p>
      )}
    </div>
  );
}
