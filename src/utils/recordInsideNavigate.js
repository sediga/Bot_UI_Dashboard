// utils/recordInsideNavigate.js (or inline where you handle it)
export async function recordInsideNavigate(step, { agentServerUrl, sampleRowIndex = 0 } = {}) {
  // 1) Block the current (main) tab with overlay
  await fetch(`${agentServerUrl}/api/overlay/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Recording in a new tab. This tab is paused. Close recording to continue.",
    }),
  });

  try {
    // 2) Ask the Agent to open a NEW TAB (same context) and start recording under this Navigate
    await fetch(`${agentServerUrl}/api/record-inside-navigate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId: step.id,
        target: step.target || "newTab",          // we default to newTab
        waitUntil: step.waitUntil || "domcontentloaded",
        timeoutMs: step.timeoutMs || 15000,
        sampleRowIndex,                           // used to render {{row.*}} preview URL
        ephemeral: true                           // auto-close new tab on finish
      }),
    });
  } catch (e) {
    // if starting failed, make sure we un-block the main tab
    await fetch(`${agentServerUrl}/api/overlay/hide`, { method: "POST" });
    throw e;
  }
}
