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
        agentMode: "target-pick",
        disabled: false,
        datasetId: "datasetName" 
      },
      {
        id: "extract-keyvalue",
        title: "From Key–Value Section",
        description:
          "Extract labeled values from a details panel or summary section.",
        emoji: "🏷️",
        type: "keyValueExtract",
        fields: ["stepName", "containerSelector", "fields"],
        disabled: false,
        datasetId: "datasetName" 
      },
      {
        id: "collect-keyvalue",
        title: "Collect Multiple Key–Value Blocks",
        description: "Extract repeated key–value panels or cards from a page.",
        emoji: "📋",
        type: "keyValueCollect",
        fields: ["stepName", "containerSelector", "itemSelector", "fields"],
        agentMode: "target-pick",
        disabled: false
      },
      {
        id: "api-extract",
        title: "From API",
        description: "Extract data from a REST API (requires API URL and key).",
        emoji: "🌐",
        type: "apiExtract",
        // No target pick for API
        fields: [
          "stepName",
          "url",
          "method",
          "headers",
          "query",         // optional: key=value pairs
          "body",          // for POST/PUT/PATCH
          "responsePath",  // e.g. "$.data.items" or "data.items"
          "columns"        // mapping: [{ header, path, type? }]
        ],
        disabled: false,
        datasetId: "datasetName" 
      },
      {
      id: "import-excel",
      title: "Import Data",
      description: "Load rows from an Excel (.xlsx) or CSV file.",
      emoji: "📥",
      type: "importData",
      fields: ["stepName", "file", "format", "sheet", "headerRow", "columns"],
      disabled: false,
      datasetId: "datasetName" 
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
        },
        disabled: false
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
        },
        disabled: false
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
        description: "Export extracted data from grid/api to CSV or JSON file.",
        emoji: "💾",
        type: "exportData",
        fields: ["stepName", "sourceStepId", "fileName", "format", "timestamped"],
        disabled: false
      }
    ]
  },
  {
    category: "Navigation",
    emoji: "🧭",
    steps: [
      {
        id: "navigate",
        title: "Go to URL",
        description: "Open a URL (supports {{row.Column}} inside loops).",
        emoji: "🔗",
        type: "navigate",
        fields: ["stepName", "url", "target", "waitUntil", "timeoutMs"],
        disabled: false
      }
    ]
  },
  {
    category: "Conditional",
    emoji: "🧠",
    steps: [
      {
        id: "auth-gate",
        title: "Auth Gate",
        description: "Auto-detect session and skip/run login steps.",
        type: "authGate",
        fields: [
          "stepName",
          "loggedInSelector",
          "loginSelector",
          "loggedInUrlContains",
          "loginUrlContains",
          "loginStepIds",
          "waitMs",
          "pollMs"
        ],
        disabled: false
      },
      {
        id: "if-block",
        title: "If Block (coming soon)",
        description: "Run steps based on a condition.",
        type: "ifBlock",
        fields: [],
        disabled: true
      }
    ]
  }
];

export default SMART_STEP_CONFIG;
