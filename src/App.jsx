import { useEffect, useState } from 'react';
import { ActionTable } from './components/ActionTable';

function App() {
  const [actions, setActions] = useState([]);
  const [inputUrl, setInputUrl] = useState('');
  const [status, setStatus] = useState({ running: false, url: null });
  const [agentStatus, setAgentStatus] = useState("idle");
  const [recordedUrls, setRecordedUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');

  const fetchStatus = async () => {
    const res = await fetch('http://localhost:8000/api/status');
    const data = await res.json();
    setStatus(data);
  };

  const checkAgentStatus = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/status");
      const data = await res.json();
      if (data.running !== undefined) {
        setAgentStatus("running");
      } else {
        setAgentStatus("not_running");
      }
    } catch {
      setAgentStatus("not_running");
    }
  };

  const downloadAgent = () => {
    const url = "https://github.com/sediga/Bot_Recorder/releases/download/v1.0.0/BotflowsAgent.zip";
    const link = document.createElement("a");
    link.href = url;
    link.download = "BotflowsAgent.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAgentStatus("downloaded");
  };

  const startRecording = async () => {
    if (!inputUrl) return;
    await fetch('http://localhost:8000/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: inputUrl })
    });
    setInputUrl('');
    fetchStatus();
  };

  const stopRecording = async () => {
    await fetch('http://localhost:8000/api/stop', { method: 'POST' });
    fetchStatus();
    loadLogs();
    setActions([]);
  };

  const loadLogs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/live_events');
      const data = await res.json();
      const actionsWithUrl = data.map(evt => ({ ...evt, url: status.url }));
      setActions(actionsWithUrl);
    } catch (err) {
      console.error('Failed to fetch live events:', err);
      setActions([]);
    }
  };

  useEffect(() => {
    loadLogs();
    fetchStatus();
    checkAgentStatus();

    const statusInterval = setInterval(() => {
      fetchStatus();
      checkAgentStatus();
    // Fetch recorded URLs too
      fetch('http://localhost:8000/api/recorded-urls')
        .then(res => res.json())
        .then(setRecordedUrls)
        .catch(console.error);
    }, 5000); // refresh every 5 seconds

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (status.running) {
      const logInterval = setInterval(loadLogs, 3000);
      return () => clearInterval(logInterval);
    }
  }, [status.running]);

  useEffect(() => {
    fetch('http://localhost:8000/api/recorded-urls')
      .then(res => res.json())
      .then(setRecordedUrls)
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-indigo-700">BotFlows</h1>

      {agentStatus !== "running" && (
        <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-xl max-w-3xl">
          <p className="mb-2 font-medium">Botflows Agent is not running.</p>
          <button
            onClick={downloadAgent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow"
          >
            Download & Run Agent
          </button>
          {agentStatus === "downloaded" && (
            <p className="text-sm text-gray-700 mt-2">
              Downloaded. Please extract and double-click <code>api_server.exe</code>. We'll auto-detect when it starts.
            </p>
          )}
          <p className="text-sm text-gray-600 mt-2">
          ⚠️ If the download is flagged, click “Keep” or “Run Anyway.” The agent is safe and unsigned during early pilot testing.
          </p>
        </div>
      )}

      <div className="mb-6 bg-white shadow rounded-xl p-4 flex flex-wrap items-center gap-4">
        <input
          type="text"
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-80 shadow-sm"
          placeholder="https://example.com"
        />
        <button
          onClick={startRecording}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow"
        >
          Start
        </button>
        <button
          onClick={stopRecording}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow"
        >
          Stop
        </button>
        <span className="text-sm text-gray-600">
          {status.running ? `Recording: ${status.url}` : 'No recording in progress'}
        </span>

        <select
          className="border border-gray-300 rounded px-3 py-2 shadow-sm"
          value={selectedUrl}
          onChange={e => setSelectedUrl(e.target.value)}
        >
          <option value="">Select a URL</option>
          {recordedUrls.map(url => (
            <option key={url} value={url}>{url}</option>
          ))}
        </select>
        <button
          onClick={async () => {
            if (!selectedUrl) return;
            await fetch('http://localhost:8000/api/replay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: selectedUrl })
            });
            alert('Replay started');
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow"
        >
          Play
        </button>
      </div>

      <ActionTable actions={actions} />
    </div>
  );
}

export default App;
