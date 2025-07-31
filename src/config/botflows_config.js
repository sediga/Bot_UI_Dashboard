const defaultConfig = {
  version: 1,
  agent: {
    enabled: false,
    launchOnStartup: { value: false, enabled: true },
    browserPath: { value: "", enabled: true },
    headless: { value: false, enabled: false },
    proxy: { value: "", enabled: false } // optional
  },
  replay: {
    enabled: false,
    retryCount: { value: 3, enabled: true },
    stepDelay: { value: 500, enabled: true },
    stepTimeout: { value: 30000, enabled: false },
    maxSteps: { value: 1000, enabled: false }
  },
  advanced: {
    enabled: false,
    autoSaveFlows: { value: true, enabled: true },
    clearCacheOnExit: { value: false, enabled: false },
    logLevel: { value: "info", enabled: true } // debug, info, warn, error
  },
  integrations: {
    enabled: false,
    webhookUrl: { value: "", enabled: false },
    apiKey: { value: "", enabled: false },
    storage: {
      type: { value: "", enabled: false }, // 'azure', 's3', etc.
      connectionString: { value: "", enabled: false },
      containerName: { value: "", enabled: false }
    }
  },
  schedule: {
    enabled: true, 
    silent: true,   
    items: [
        {
            enabled: true,
            flow: { value: "", enabled: true },
            type: { value: "Manual", enabled: true },       // Manual | Daily | Weekly | CRON
            time: { value: "09:00", enabled: true },
            dayOfWeek: { value: "Monday", enabled: false }, // Only if Weekly
            cron: { value: "", enabled: false }
        } 
    ]
  }
};

export default defaultConfig;
