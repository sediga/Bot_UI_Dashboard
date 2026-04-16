const WORKFLOW_NODE_CONFIG = [
  {
    category: "Automation",
    emoji: "WF",
    steps: [
      {
        id: "runFlow",
        title: "Run Flow",
        description: "Call a saved flow and route on success or failure.",
        emoji: "RF",
      },
      {
        id: "switchValue",
        title: "Switch Value",
        description: "Branch to different nodes based on a context value.",
        emoji: "SW",
      },
    ],
  },
  {
    category: "Waiting",
    emoji: "WT",
    steps: [
      {
        id: "delay",
        title: "Delay",
        description: "Pause execution for a fixed duration before continuing.",
        emoji: "DL",
      },
      {
        id: "waitForEvent",
        title: "Wait For Event",
        description: "Pause until an external event arrives and matches.",
        emoji: "EV",
      },
      {
        id: "humanReview",
        title: "Human Review",
        description: "Send the workflow to a review queue and wait for a decision.",
        emoji: "HR",
      },
    ],
  },
  {
    category: "Outcome",
    emoji: "RS",
    steps: [
      {
        id: "end",
        title: "End",
        description: "Finish the workflow with a final result payload.",
        emoji: "OK",
      },
    ],
  },
];

export default WORKFLOW_NODE_CONFIG;
