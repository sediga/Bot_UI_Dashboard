import React from 'react';
import { applyUpdate, getUpdateStatus, pingStatus } from './agentUpdateClient';
import config from "../config";

export default function AgentUpdateBanner({
  status,
  onHide,
  refreshStatus,
}) {
  const initial = !status ? 'agent_offline' : (status.needsUpdate ? 'available' : 'done');
  const [phase, setPhase] = React.useState(initial);
  const [msg, setMsg] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (!status) setPhase('agent_offline');
    else if (status.needsUpdate) setPhase('available');
    else setPhase('done');
  }, [status]);

  // NEW: small helpers to broadcast upgrade state to CreatePanel
  const fireUpgradeStart = React.useCallback(() => {
    try { localStorage.setItem('flowtra_upgrading', '1'); } catch {}
    try { window.dispatchEvent(new CustomEvent('flowtra:upgrade-start')); } catch {}
    try { if (window.top && window.top !== window)
            window.top.dispatchEvent(new CustomEvent('flowtra:upgrade-start')); } catch {}
  }, []);

  const fireUpgradeDone = React.useCallback(() => {
    try { localStorage.removeItem('flowtra_upgrading'); } catch {}
    try { window.dispatchEvent(new CustomEvent('flowtra:upgrade-done')); } catch {}
    try { if (window.top && window.top !== window)
            window.top.dispatchEvent(new CustomEvent('flowtra:upgrade-done')); } catch {}
  }, []);

  const onApply = async () => {
    setIsUpdating(true);
    setPhase('downloading');
    setMsg('Downloading update...');

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
      // If we failed, clear any “upgrading” state just in case
      fireUpgradeDone();
      return;
    }

    // Move to applying; tell CreatePanel to pause auto-start/disable buttons
    setPhase('applying');
    setMsg('Applying update... the agent will close for a moment.');
    fireUpgradeStart(); // <-- NEW: signal upgrade start right before we apply

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
        fireUpgradeDone(); // unblock UI if apply fails
        return;
      }

      setMsg('Upgrade in progress... Waiting for agent to restart.');
      waitForAgentBack();
    } catch (err) {
      console.error("Error during update application:", err);
      setPhase('error');
      setMsg('An error occurred while applying the update.');
      setIsUpdating(false);
      fireUpgradeDone(); // unblock UI on exception
    }
  };

  const waitForAgentBack = async () => {
    const deadline = Date.now() + 120000; // 2 minutes
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    let agentStopped = false;
    // Wait for stop first (agent exits during update)
    while (Date.now() < deadline && !agentStopped) {
      try {
        const info = await getUpdateStatus(config.agentServerUrl);
        if (info && info.version !== status?.currentVersion) {
          agentStopped = false;
        }
      } catch (error) {
        agentStopped = true;
      }
      await sleep(1000);
    }

    if (!agentStopped) {
      setPhase('error');
      setMsg('Agent did not stop as expected. Please start it manually.');
      setIsUpdating(false);
      fireUpgradeDone(); // unblock UI on anomaly
      return;
    }

    // Now wait for agent to come back and verify version
    let agentStarted = false;
    let agentUpdated = false;
    while (Date.now() < deadline && !agentStarted) {
      try {
        const info = await getUpdateStatus(config.agentServerUrl);
        if (info) {
          agentStarted = true;
          setMsg("Agent started successfully.");
          if (info.currentVersion && info.currentVersion === status.availableVersion) {
            setMsg(`Updated to v${info.version}.`);
            setPhase('done');
            agentUpdated = true;
          }
          await refreshStatus();
          setIsUpdating(false);
          fireUpgradeDone();       // <-- NEW: signal upgrade done on success
          setTimeout(onHide, 1200);
          return;
        }
      } catch (error) {
        agentStarted = false;
      }
      await sleep(1000);
    }

    // Fallbacks
    if (!agentStarted) {
      setPhase('error');
      setMsg('Agent did not return in time. Please start it manually.');
    } else if (!agentUpdated) {
      setMsg('Agent did not update to the latest version. Please try again.');
    }
    setIsUpdating(false);
    fireUpgradeDone(); // unblock UI on timeout/mismatch
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
      {phase === 'downloading' && <span>{msg}</span>}
      {phase === 'applying' && <span>{msg}</span>}
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
