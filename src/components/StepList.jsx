export default function StepList({ steps, setSteps }) {
  const moveStep = (index, offset) => {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated);
  };

  const deleteStep = (index) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
  };

  return (
    <section className="col-span-1 bg-white p-4 rounded shadow h-[80vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">Steps</h2>
      <ul className="space-y-2 text-sm">
        {steps.map((step, i) => (
          <li
            key={i}
            className="bg-slate-100 p-3 rounded shadow flex justify-between items-start"
          >
            <div className="flex-1 pr-2">
              {step.type === "navigate" && (
                <div>
                  <span className="font-medium text-indigo-600">Navigate:</span>{" "}
                  <span className="text-gray-700">{step.url}</span>
                </div>
              )}

              {step.type === "dataLoop" && (
                <div>
                  <span className="font-medium text-orange-500">
                    Loop over: {step.source}
                  </span>
                  <div className="text-gray-500 text-xs">
                    {step.steps?.length || 0} sub-steps
                  </div>
                </div>
              )}

              {step.action && (
                <div>
                  <span className="font-medium text-indigo-600">
                    {step.action.toUpperCase()}
                  </span>{" "}
                  →{" "}
                  <code className="text-slate-700">{step.selector || "N/A"}</code>{" "}
                  {step.dataBinding && (
                    <span className="text-orange-600 ml-1">{"{{" + step.dataBinding + "}}"}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1 text-xs">
              <button
                onClick={() => moveStep(i, -1)}
                className="text-gray-500 hover:text-black"
              >
                ↑
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                className="text-gray-500 hover:text-black"
              >
                ↓
              </button>
              <button
                onClick={() => deleteStep(i)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
