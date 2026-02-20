import { useEffect, useMemo, useState } from "react";

export default function AuthGateStep({
  mode = "create",
  initial = null,
  availableSteps = [],
  onCreate,
  onCancel,
}) {
  const [stepName, setStepName] = useState("Auth Gate");
  const [loggedInSelector, setLoggedInSelector] = useState("[data-testid='menu-div-rootmenuClaims']");
  const [loginSelector, setLoginSelector] = useState("#username");
  const [loggedInUrlContains, setLoggedInUrlContains] = useState("sc.officeally.com/");
  const [loginUrlContains, setLoginUrlContains] = useState("auth.officeally.com");
  const [waitMs, setWaitMs] = useState(8000);
  const [pollMs, setPollMs] = useState(250);
  const [selectedLoginIds, setSelectedLoginIds] = useState([]);

  const uiActionSteps = useMemo(
    () => (availableSteps || []).filter((s) => String(s?.type || "").toLowerCase() === "uiaction"),
    [availableSteps]
  );

  const loginCandidates = useMemo(() => {
    return uiActionSteps.filter((s) => {
      const lbl = String(s?.label || "").toLowerCase();
      const sel = String(s?.selector || "").toLowerCase();
      return (
        lbl.includes("username") ||
        lbl.includes("password") ||
        sel.includes("#username") ||
        sel.includes("#password") ||
        lbl.includes("click: default")
      );
    });
  }, [uiActionSteps]);

  useEffect(() => {
    if (!initial) return;
    setStepName(initial.name || initial.stepName || "Auth Gate");
    setLoggedInSelector(initial.loggedInSelector || "[data-testid='menu-div-rootmenuClaims']");
    setLoginSelector(initial.loginSelector || "#username");
    setLoggedInUrlContains(initial.loggedInUrlContains || "sc.officeally.com/");
    setLoginUrlContains(initial.loginUrlContains || "auth.officeally.com");
    setWaitMs(Number.isFinite(Number(initial.waitMs)) ? Number(initial.waitMs) : 8000);
    setPollMs(Number.isFinite(Number(initial.pollMs)) ? Number(initial.pollMs) : 250);
    setSelectedLoginIds(Array.isArray(initial.loginStepIds) ? initial.loginStepIds : []);
  }, [initial]);

  useEffect(() => {
    if (mode !== "create") return;
    if (selectedLoginIds.length) return;
    if (!loginCandidates.length) return;
    setSelectedLoginIds(loginCandidates.map((s) => s.id));
  }, [mode, selectedLoginIds.length, loginCandidates]);

  function toggleLoginId(id) {
    setSelectedLoginIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSave() {
    const payload = {
      id: initial?.id || crypto.randomUUID(),
      type: "authGate",
      name: stepName || "Auth Gate",
      label: "Auth Gate: detect session or run login",
      loggedInSelector: String(loggedInSelector || "").trim(),
      loginSelector: String(loginSelector || "").trim(),
      loggedInUrlContains: String(loggedInUrlContains || "").trim(),
      loginUrlContains: String(loginUrlContains || "").trim(),
      loginStepIds: selectedLoginIds,
      waitMs: Number.isFinite(Number(waitMs)) ? Number(waitMs) : 8000,
      pollMs: Number.isFinite(Number(pollMs)) ? Number(pollMs) : 250,
      timestamp: Date.now(),
    };
    onCreate?.(payload);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-blue-700">Step 2: Configure</div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Step name</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="Auth Gate"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Logged-in selector</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={loggedInSelector}
            onChange={(e) => setLoggedInSelector(e.target.value)}
            placeholder="[data-testid='menu-div-rootmenuClaims']"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Login selector</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={loginSelector}
            onChange={(e) => setLoginSelector(e.target.value)}
            placeholder="#username"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Logged-in URL contains</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={loggedInUrlContains}
            onChange={(e) => setLoggedInUrlContains(e.target.value)}
            placeholder="sc.officeally.com/"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Login URL contains</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={loginUrlContains}
            onChange={(e) => setLoginUrlContains(e.target.value)}
            placeholder="auth.officeally.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">waitMs</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={waitMs}
            onChange={(e) => setWaitMs(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">pollMs</label>
          <input
            type="number"
            min={100}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={pollMs}
            onChange={(e) => setPollMs(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Login steps to control</div>
        {uiActionSteps.length === 0 ? (
          <div className="text-xs text-gray-500">No UI action steps found yet.</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-auto">
            {uiActionSteps.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedLoginIds.includes(s.id)}
                  onChange={() => toggleLoginId(s.id)}
                />
                <span className="text-gray-700">{s.label || s.name || s.id}</span>
                <code className="text-[10px] text-gray-500">{s.id}</code>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleSave}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white"
        >
          Save Auth Gate
        </button>
      </div>
    </div>
  );
}

