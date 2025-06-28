export function cleanSteps(steps) {
  const seen = new Set();
  const cleaned = [];

  for (let step of steps) {
    const key = `${step.action}:${step.selector}:${step.value || ""}`;

    // Avoid redundant focus/change events
    if ((step.action === "focus" || step.action === "change") && seen.has(key)) {
      continue;
    }
    seen.add(key);

    // Clean escape characters from selectors
    const cleanSelector = step.selector?.replace(/\\["']/g, "").trim();
    const cleanImproved = step.improvedSelector?.replace(/\\["']/g, "").trim();
    const devToolsSelector = step.devToolsSelector?.replace(/\\["']/g, "").trim();

    cleaned.push({
      ...step,
      selector: cleanSelector,
      improvedSelector: cleanImproved,
      devToolsSelector: devToolsSelector
    });
  }

  return cleaned;
}
