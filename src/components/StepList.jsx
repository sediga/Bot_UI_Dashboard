import { useState, useEffect } from "react";

export default function StepList({ steps, setSteps }) {
const [expandedSteps, setExpandedSteps] = useState({});

    useEffect(() => {
    // Automatically expand all steps of type 'dataLoop'
    const initialExpanded = {};
    steps.forEach((step, index) => {
        if (step.type === "dataLoop") {
        initialExpanded[index] = true;
        }
    });
    setExpandedSteps(initialExpanded);
    }, [steps]);

  const toggleExpand = (index) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
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
            <div className="flex-1 pr-2 space-y-1">
              {/* Navigate Step */}
              {step.type === "navigate" && (
                <div>
                  <span className="font-medium text-indigo-600">Navigate:</span>{" "}
                  <span className="text-gray-700">{step.url}</span>
                </div>
              )}

              {/* UI Action */}
              {step.type === "uiAction" && (
                <div>
                  <span className="font-medium text-purple-600">{step.action}</span>{" "}
                  → <code className="text-slate-700">{step.selector}</code>
                  {step.value && (
                    <span className="text-green-600 ml-1">= "{step.value}"</span>
                  )}
                </div>
              )}

              {/* Loop Step */}
              {step.type === "counterloop" && (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-orange-500">Loop over:</span>{" "}
                      {step.source}
                    </div>
                    <button
                      onClick={() => toggleExpand(i)}
                      className="text-xs text-blue-600 ml-4"
                    >
                      {expandedSteps[i] ? "[−]" : "[+]"}
                    </button>
                  </div>

                  {expandedSteps[i] && step.steps?.length > 0 && (
                    <ul className="ml-4 pl-2 border-l border-gray-300 space-y-1 text-xs text-gray-700 mt-2">
                      {step.steps.map((sub, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{sub.action}</span>{" "}
                          → <code>{sub.selector}</code>
                          {sub.value && (
                            <> = <span className="text-green-700">{sub.value}</span></>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1 text-xs ml-2">
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
