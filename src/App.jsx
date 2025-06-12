import { useEffect, useState } from 'react';
import { ActionTable } from './components/ActionTable';

function App() {
  const [actions, setActions] = useState([]);
  const [inputUrl, setInputUrl] = useState('');
  const [status, setStatus] = useState({ running: false, url: null });

  const fetchStatus = async () => {
    const res = await fetch('http://localhost:8000/api/status');
    const data = await res.json();
    setStatus(data);
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
    const statusInterval = setInterval(fetchStatus, 2000);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (status.running) {
      const logInterval = setInterval(loadLogs, 3000);
      return () => clearInterval(logInterval);
    }
  }, [status.running]);

  const [recordedUrls, setRecordedUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  useEffect(() => {
    fetch('http://localhost:8000/api/recorded-urls')
      .then(res => res.json())
      .then(setRecordedUrls)
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-3xl font-semibold mb-6 text-indigo-700">BotFlows</h1>

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
