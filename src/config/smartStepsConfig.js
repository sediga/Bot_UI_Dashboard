const SMART_STEP_CONFIG = [
  {
    category: "Extract",
    emoji: "📥",
    steps: [
      {
        id: "extract-grid",
        title: "From Data Grid",
        description: "Extract rows and columns from a table/grid.",
        emoji: "📊",
        type: "gridExtract",
        fields: ["stepName", "columns", "filters"],
        agentMode: "target-pick"
      }
    ]
  },
  {
    category: "Loop",
    emoji: "🔁",
    steps: [
      {
        id: "loop-counter",
        title: "Counter-Based Loop",
        description: "Repeat steps N times.",
        emoji: "🔂",
        type: "counterloop",
        fields: ["stepName", "loopCount"],
        inject: {
          loopType: "counter",
          actionsPerRow: [],
          parentId: "{{currentLoopId}}"
        }
      },
      {
        id: "loop-dataset",
        title: "Data-Driven Loop",
        description: "Loop over data from an extract step.",
        emoji: "📄",
        type: "dataLoop",
        fields: ["stepName", "sourceStepId"],
        inject: {
          loopType: "dataset",
          actionsPerRow: [],
          parentId: "{{currentLoopId}}"
        }
      }
    ]
  },
  {
    category: "Export",
    emoji: "📤",
    steps: [
      {
        id: "export-data",
        title: "Export Data",
        description: "Export extracted data to CSV or JSON file.",
        emoji: "💾",
        type: "exportData",
        fields: ["stepName", "sourceStepId", "fileName", "format", "timestamped"]
      }
    ]
  },
  {
    category: "Conditional",
    emoji: "🧠",
    steps: [
      {
        id: "if-block",
        title: "If Block (coming soon)",
        description: "Run steps based on a condition.",
        type: "ifBlock",
        fields: [],
        disabled: true
      },
      {
        id: "wait-for-element",
        title: "Wait for Element (coming soon)",
        description: "Pause until element appears.",
        type: "waitForElement",
        fields: [],
        disabled: true
      }
    ]
  }
];

export default SMART_STEP_CONFIG;
