import { useEffect, useState, useRef } from 'react';
import { ActionTable } from './components/ActionTable';

function App() {
  const [actions, setActions] = useState([]);
  const [inputUrl, setInputUrl] = useState('');
  const [status, setStatus] = useState({ running: false, replaying: false, url: null });
  const [agentStatus, setAgentStatus] = useState("idle");
  const [recordedUrls, setRecordedUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [message, setMessage] = useState('');

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
    const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/download/V1.0.1/BotflowsAgentInstaller.exe";
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

    setActions([]);
    try {
      const response = await fetch('http://localhost:8000/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl }),
      });

      const result = await response.json();
      if (result.status === 'started') {
        setStatus({ running: true, url: result.url });
        setMessage(`Recording started for: ${result.url}`);
      } else {
        setStatus({ running: false, url: null });
        setMessage(`Recording failed: ${result.error || 'Unknown error'}`);
      }

      setInputUrl('');
      fetchStatus();
    } catch (error) {
      console.error('Failed to start recording:', error);
      setMessage('Recording failed due to network or server error.');
    }
  };

  const stopRecording = async () => {
    await fetch('http://localhost:8000/api/stop', { method: 'POST' });
    setMessage(`Recording stopped.`);
    fetchStatus();
  };

  const handleReplay = async () => {
    if (!selectedUrl) return;

    try {
      const response = await fetch('http://localhost:8000/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedUrl })
      });

      const result = await response.json();
      if (result.status === 'replaying') {
        setMessage(`Replay started for: ${selectedUrl}`);
      } else {
        setMessage(`Replay failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Replay error:', err);
      setMessage('Replay failed due to network or server error.');
    }
  };

  useEffect(() => {
    fetchStatus();
    checkAgentStatus();

    const interval = setInterval(() => {
      fetchStatus();
      checkAgentStatus();
      fetch('http://localhost:8000/api/recorded-urls')
        .then(res => res.json())
        .then(setRecordedUrls)
        .catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('http://localhost:8000/api/recorded-urls')
      .then(res => res.json())
      .then(setRecordedUrls)
      .catch(console.error);
  }, []);

  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/actions");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onmessage = (event) => {
      console.log("📥 WebSocket received:", event.data);
      const newAction = JSON.parse(event.data);
      setActions(prev => [newAction, ...prev].slice(0, 50)); // latest on top
    };
    ws.onerror = (err) => console.error("❌ WebSocket error:", err);
    ws.onclose = () => console.warn("🔌 WebSocket closed");

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
    };
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-indigo-700">BotFlows</h1>

      {agentStatus !== "running" && (
        <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-xl max-w-3xl">
          <p className="mb-2 font-medium">Botflows Agent is not running.</p>
          {message && (
            <div className="mb-4 px-4 py-2 rounded bg-blue-100 text-blue-800 border border-blue-300 shadow max-w-3xl">
              {message}
            </div>
          )}
          {agentStatus.replaying && (
            <div className="bg-green-100 text-green-700 border-l-4 border-green-500 p-4">
              Replaying actions...
            </div>
          )}
          <button
            onClick={downloadAgent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow"
          >
            Download & Run Agent
          </button>
          {agentStatus === "downloaded" && (
            <p className="text-sm text-gray-700 mt-2">
              Download complete. Please run <code>BotflowsAgentInstaller.exe</code> and follow the setup.
            </p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ If you see a warning, click <strong>“More Info” → “Run Anyway”</strong>. This app is safe and currently unsigned during early testing.
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
        <span
          className={`text-sm px-3 py-1 rounded-md shadow-sm font-medium ${
            status.running
              ? 'bg-green-100 text-green-800 border border-green-300'
              : status.replaying
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
        >
          {status.running
            ? `Recording: ${status.url}`
            : status.replaying
            ? 'Replaying...'
            : 'No activity in progress'}
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
          onClick={handleReplay}
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
