import React from 'react';
import { applyUpdate, getUpdateStatus, pingStatus } from './agentUpdateClient';
import config from "../config";

export default function AgentUpdateBanner({
  status,          // null if agent unreachable; else { needsUpdate, currentVersion, availableVersion }
  onHide,          // () => void   - to remove banner
  refreshStatus,   // () => Promise<void> - refetch /api/update/status in parent
}) {
  const initial = !status ? 'agent_offline' : (status.needsUpdate ? 'available' : 'done');
  const [phase, setPhase] = React.useState(initial);
  const [msg, setMsg] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false); // Track update progress

  React.useEffect(() => {
    if (!status) setPhase('agent_offline');
    else if (status.needsUpdate) setPhase('available');
    else setPhase('done');
  }, [status]);

  const onApply = async () => {
    setPhase('downloading'); // Set phase to downloading
    setMsg('Downloading update...');

    // Step 1: Call the backend to download the update first
    const downloadRes = await fetch(`${config.agentServerUrl}/api/update/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
      },
      credentials: "include",
    });

    const downloadData = await downloadRes.json();
    if (!downloadData.downloaded) {
      setPhase('error');
      setMsg('Failed to download the update installer.');
      setIsUpdating(false);
      return;
    }

    console.log(`Installer downloaded to: ${downloadData.path}`);
    setPhase('applying');  // Move to applying phase
    setMsg('Applying update... the agent will close for a moment.');

    // Step 2: Once download is successful, apply the update
    try {
      const applyRes = await fetch(`${config.agentServerUrl}/api/update/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        credentials: "include",
      });

      const applyData = await applyRes.json();
      if (!applyData.applied) {
        setPhase('error');
        setMsg(`Failed to apply update: ${applyData.reason || 'Unknown error'}`);
        setIsUpdating(false);
        return;
      }

      // Step 3: Wait for the agent to restart and check the status
      setMsg('Waiting for agent to restart...');
      waitForAgentBack();
    } catch (err) {
      console.error("Error during update application:", err);
      setPhase('error');
      setMsg('An error occurred while applying the update.');
      setIsUpdating(false);
    }
  };

  const waitForAgentBack = async () => {
    const deadline = Date.now() + 120000; // 2 minutes
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    let agentStopped = false;
    // Check if the agent stopped before expecting it to restart
    while (Date.now() < deadline && !agentStopped) {
      try{
        const info = await getUpdateStatus(config.agentServerUrl);
        if (info && info.version !== status?.currentVersion) {
          agentStopped = false;
        }
      }catch (error) {
        agentStopped = true;
      }
      await sleep(1000); // Sleep for 1 second before checking again
    }

    if (!agentStopped) {
      setPhase('error');
      setMsg('Agent did not stop as expected. Please start it manually.');
      return;
    }

    // Now ensure the agent is fully restarted and verify the version
    let agentStarted = false;
    let agentUpdated = false;
    while (Date.now() < deadline && !agentStarted) {
      try{
        const info = await getUpdateStatus(config.agentServerUrl);
        if (info) {
          agentStarted = true;
          setMsg("Agent started successfully.");
          if(info.currentVersion && info.currentVersion === status.availableVersion){
            setMsg(`Updated to v${info.version}.`);
            setPhase('done');
            agentUpdated = true;
          }
          await refreshStatus();
          setTimeout(onHide, 1200); // Auto-hide after a short delay
          return;
      }
    } catch (error) {
      agentStarted = false;
    }
      await sleep(1000); // Sleep before trying again
    }
    if (!agentStarted){
      setPhase('error');
      setMsg('Agent did not return in time. Please start it manually.');
    }else if (!agentUpdated) {
      setMsg('Agent did not update to the latest version. Please try again.');
    }
  };

  if (phase === 'done') return null;

  return (
    <div className="rounded border px-3 py-2 bg-amber-50 text-amber-900 flex items-center gap-3">
      {phase === 'available' && (
        <>
          <span>New Flowtra Agent version available.</span>
          <button className="underline" onClick={onApply} disabled={isUpdating}>
            Update now
          </button>
          <button className="underline" onClick={onHide}>Dismiss</button>
        </>
      )}

      {phase === 'downloading' && <span>{msg}</span>} {/* New downloading phase */}

      {phase === 'applying' && <span>{msg}</span>}  {/* Applying update phase */}

      {phase === 'waiting' && (
        <>
          <span>{msg}</span>
          <a className="underline" href="flowtra://start">Start Agent</a>
        </>
      )}

      {phase === 'agent_offline' && (
        <>
          <span>Flowtra Agent is not running.</span>
          <a className="underline" href="flowtra://start">Start Agent</a>
          <a className="underline" href="https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe">Download</a>
          <button className="underline" onClick={onHide}>Dismiss</button>
        </>
      )}

      {phase === 'error' && (
        <>
          <span>{msg}</span>
          <a className="underline" href="flowtra://start">Start Agent</a>
          <a className="underline" href="https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe">Download</a>
        </>
      )}
    </div>
  );
}
