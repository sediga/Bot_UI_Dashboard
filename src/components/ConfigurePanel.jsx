import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import defaultConfig from "../config/botflows_config";
import FlowSelector from "./FlowSelector";
import config from "../config";

export default function ConfigurePanel() {
  const [userConfig, setConfig] = useState(defaultConfig);
  const [collapsedSections, setCollapsedSections] = useState({
    agent: true,
    replay: true,
    advanced: true,
    integrations: true,
    schedule: false,
  });
  const [selectedFlow, setSelectedFlow] = useState("");
  const [timezone, setTimezone] = useState("America/Chicago"); // default or empty string
    const usTimezones = [
    "America/New_York",     // Eastern Time
    "America/Chicago",      // Central Time
    "America/Denver",       // Mountain Time
    "America/Phoenix",      // Mountain Time (no DST)
    "America/Los_Angeles",  // Pacific Time
    "America/Anchorage",    // Alaska Time
    "Pacific/Honolulu"      // Hawaii Time
    ];
    const [schedules, setSchedules] = useState(userConfig.schedule?.items || []);
    const [flows, setFlows] = useState([]);
    const [flowNameMap, setFlowNameMap] = useState({});

    useEffect(() => {
    const fetchFlows = async () => {
        try {
        const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, {
            headers: {
            Authorization: `Bearer ${localStorage.getItem("botflows_token")}`,
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            },
        });
        const data = await res.json();
        setFlows(data);

        // Create name map
        const map = {};
        data.forEach((f) => (map[f.path] = f.name));
        setFlowNameMap(map);
        } catch (err) {
        console.error("Failed to load flows:", err);
        }
    };

    fetchFlows();
    }, []);

  useEffect(() => {
    const saved = localStorage.getItem("botflows_config");

    if (saved) {
        try {
        const parsed = JSON.parse(saved);

        const savedVersion = parsed.version || 0;
        const defaultVersion = defaultConfig.version;

        if (savedVersion < defaultVersion) {
            // merge and upgrade
            const merged = { ...defaultConfig, ...parsed };
            for (const key of Object.keys(defaultConfig)) {
            if (
                typeof defaultConfig[key] === "object" &&
                parsed[key] &&
                !Array.isArray(defaultConfig[key])
            ) {
                merged[key] = { ...defaultConfig[key], ...parsed[key] };
            }
            }
            localStorage.setItem("botflows_config", JSON.stringify(merged));
            setConfig(merged);
        } else {
            setConfig(parsed);
        }
        } catch {
        console.warn("Invalid userConfig in storage, using defaults");
        setConfig(defaultConfig);
        }
    } else {
        setConfig(defaultConfig);
    }
    }, []);
    
    useEffect(() => {
    loadUserConfig();
    }, []);


  const updateSetting = (path, value) => {
    setConfig((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let curr = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        curr = curr[keys[i]];
      }
      curr[keys.at(-1)] = value;
      return updated;
    });
  };

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

const loadUserConfig = async () => {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/flows/load-config`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("botflows_token")}`,
        "x-api-key": `${config.apiKey}` // Load from env later
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load user config");
    }

    const responseConfig = await response.json();
    console.log("✅ Loaded userConfig", responseConfig);
    setConfig(responseConfig); // assuming setConfig is your React setter
    setSchedules(responseConfig.schedule?.items);
  } catch (err) {
    console.error("⚠️ Error loading userConfig:", err);
  }
};

const handleSave = async () => {
  const updated = { ...userConfig, schedule: { ...userConfig.schedule, items: schedules } };

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/flows/save-config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("botflows_token")}`,
        "x-api-key": `${config.apiKey}` // Load from env later
      },
      body: JSON.stringify({ Config: updated }),
    });

    const result = await response.json();
    if (response.ok) {
        alert("Configuration settings saved!")
      console.log("✅", result.message);
    } else {
      console.error("❌", result.message);
    }
  } catch (err) {
    console.error("⚠️ Failed to save userConfig:", err);
  }
};

const getFlowDisplayName = (val) => {
  if (!val?.enabled || !val.value) return "--";
  return flowNameMap[val.value] || val.value;
};


const SectionCard = ({ title, sectionKey, children }) => {
    const isEnabled = userConfig?.[sectionKey].enabled !== false; // default to true

    if (!isEnabled) return null;

    return (
        <div className={`rounded-lg p-5 ${collapsedSections[sectionKey] ? "" : "bg-white shadow"}`}>
        <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection(sectionKey)}
        >
            <h2 className="text-md font-semibold text-purple-700">{title}</h2>
            {collapsedSections[sectionKey] ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            ) : (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            )}
        </div>
        {!collapsedSections[sectionKey] && (
            <div className="mt-4 space-y-3">{children}</div>
        )}
        </div>
    );
    };

    const updateSchedule = (index, newSched) => {
    setSchedules((prev) => {
        const updated = [...prev];
        updated[index] = newSched;
        return updated;
    });
    };
    
    useEffect(() => {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (usTimezones.includes(localTz)) {
        setTimezone(localTz);
        setNewSchedule((prev) => ({
        ...prev,
        timezone: localTz,
        }));
    }
    }, []);

    const [newSchedule, setNewSchedule] = useState({
    enabled: true,
    silent: true,
    flow: { value: "", enabled: true },
    type: { value: "", enabled: true },
    time: { value: "09:00", enabled: true },
    dayOfWeek: { value: [], enabled: false },
    cron: { value: "", enabled: false }
    });
    
    const [scheduleType, setScheduleType] = useState("manual");
    useEffect(() => {
        setScheduleType(newSchedule.type?.value);
    }, [newSchedule.type?.value])
    const allFields = ["silent", "flow", "type", "dayOfWeek", "time", "cron"];

  return (
    <main className="p-6 overflow-auto h-full text-gray-700 bg-gray-50 space-y-6">
      <h1 className="text-2xl font-semibold mb-4">Configuration Settings</h1>
        <div className="flex flex-col space-y-6">
        {/* Agent Settings */}
        <SectionCard title="Agent Settings" sectionKey="agent" >
            <div className="flex flex-wrap gap-6">
            {/* Field 1 */}
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Launch on Startup</label>
                    <input
                    type="checkbox"
                    checked={userConfig.agent.launchOnStartup}
                    onChange={(e) =>
                        updateSetting("agent.launchOnStartup", e.target.checked)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Browser Path</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.agent.browserPath}
                    onChange={(e) =>
                        updateSetting("agent.browserPath", e.target.value)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Headless Mode</label>
                    <input
                    type="checkbox"
                    checked={userConfig.agent.headless}
                    onChange={(e) =>
                        updateSetting("agent.headless", e.target.checked)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Proxy</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.agent.proxy}
                    onChange={(e) => updateSetting("agent.proxy", e.target.value)}
                    />
                </div>
            </div>
        </SectionCard>

        {/* Replay Settings */}
        <SectionCard title="Replay Settings" sectionKey="replay">
            <div className="flex flex-wrap gap-6">
            {/* Field 1 */}
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Retry Count</label>
                    <input
                    type="number"
                    className="border p-2 w-full rounded"
                    value={userConfig.replay.retryCount}
                    onChange={(e) =>
                        updateSetting("replay.retryCount", Number(e.target.value))
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Step Delay (ms)</label>
                    <input
                    type="number"
                    className="border p-2 w-full rounded"
                    value={userConfig.replay.stepDelay}
                    onChange={(e) =>
                        updateSetting("replay.stepDelay", Number(e.target.value))
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Step Timeout (ms)</label>
                    <input
                    type="number"
                    className="border p-2 w-full rounded"
                    value={userConfig.replay.stepTimeout}
                    onChange={(e) =>
                        updateSetting("replay.stepTimeout", Number(e.target.value))
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Max Steps</label>
                    <input
                    type="number"
                    className="border p-2 w-full rounded"
                    value={userConfig.replay.maxSteps}
                    onChange={(e) =>
                        updateSetting("replay.maxSteps", Number(e.target.value))
                    }
                    />
            </div>
          </div>
        </SectionCard>

        {/* Advanced Settings */}
        <SectionCard title="Advanced Settings" sectionKey="advanced">
            <div className="flex flex-wrap gap-6">
            {/* Field 1 */}
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Auto Save Flows</label>
                    <input
                    type="checkbox"
                    checked={userConfig.advanced.autoSaveFlows}
                    onChange={(e) =>
                        updateSetting("advanced.autoSaveFlows", e.target.checked)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Clear Cache on Exit</label>
                    <input
                    type="checkbox"
                    checked={userConfig.advanced.clearCacheOnExit}
                    onChange={(e) =>
                        updateSetting("advanced.clearCacheOnExit", e.target.checked)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Log Level</label>
                    <select
                    className="border p-2 w-full rounded"
                    value={userConfig.advanced.logLevel}
                    onChange={(e) =>
                        updateSetting("advanced.logLevel", e.target.value)
                    }
                    >
                    <option value="debug">debug</option>
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                    </select>
              </div>
            </div>
        </SectionCard>

        {/* Integrations */}
        <SectionCard title="Integrations" sectionKey="integrations">
            <div className="flex flex-wrap gap-6">
            {/* Field 1 */}
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Webhook URL</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.integrations.webhookUrl}
                    onChange={(e) =>
                        updateSetting("integrations.webhookUrl", e.target.value)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">API Key</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.integrations.apiKey}
                    onChange={(e) =>
                        updateSetting("integrations.apiKey", e.target.value)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Storage Type</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.integrations.storage.type}
                    onChange={(e) =>
                        updateSetting("integrations.storage.type", e.target.value)
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Connection String</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.integrations.storage.connectionString}
                    onChange={(e) =>
                        updateSetting(
                        "integrations.storage.connectionString",
                        e.target.value
                        )
                    }
                    />
                </div>
                <div className="flex flex-col min-w-[200px] flex-1 items-center">
                    <label className="block font-medium text-gray-700">Container Name</label>
                    <input
                    type="text"
                    className="border p-2 w-full rounded"
                    value={userConfig.integrations.storage.containerName}
                    onChange={(e) =>
                        updateSetting(
                        "integrations.storage.containerName",
                        e.target.value
                        )
                    }
                    />
              </div>
            </div>
        </SectionCard>

        {/* Schedule Settings */}
        <SectionCard title="Schedule Settings" sectionKey="schedule">
        {/* Header row */}

        <div className="flex flex-wrap gap-6 justify-start mb-2 px-1">
            <div className="min-w-[200px] text-center font-medium text-gray-700">Run Backgound</div>
            <div className="min-w-[200px] text-center font-medium text-gray-700">Select Flow</div>
            <div className="min-w-[200px] text-center font-medium text-gray-700">Schedule Type</div>

            {(scheduleType === "weekly") && (
            <div className="min-w-[200px] text-center font-medium text-gray-700">Days of Week</div>
            )}

            {scheduleType === "cron" && (
            <div className="min-w-[200px] text-center font-medium text-gray-700">CRON</div>
            )}
            {scheduleType != "cron" && (
                <div className="min-w-[200px] text-center font-medium text-gray-700">Time (HH:mm)</div>
            )}
        </div>

        {/* Input row for new schedule */}
        <div className="flex flex-wrap gap-6 justify-start mb-4">
            <div className="flex flex-col items-center min-w-[200px]">
                <input
                    type="checkbox"
                    checked={newSchedule.silent ?? true}
                    onChange={(e) => setNewSchedule({ ...newSchedule, silent: e.target.checked }) }
                />
            </div>
            <div className="flex flex-col items-center min-w-[200px]">
            {/* <FlowSelector
                value={newSchedule.flow}
                onChange={(flow) => setNewSchedule({ ...newSchedule, flow })}
            />*/}
            <FlowSelector 
            value={newSchedule.flow?.value}
            onChange={(val) => {
                // setSelectedFlow(val);
                setNewSchedule({ 
                    ...newSchedule, 
                    flow: { value: val, enabled: true } 
                    });
            }}
            showLabel = {false}
            flows={flowNameMap}
            />
            </div>
            <div className="flex flex-col items-center min-w-[200px]">
            <select
                className="border p-2 w-full rounded"
                value={newSchedule.type.value}
                onChange={(e) => setNewSchedule({ ...newSchedule, 
                type: { value: e.target.value , enabled: true } 
                })}
            >
                <option value="">Select schedule type</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="cron">CRON</option>
            </select>
            </div>

            {/* Conditional: Weekly → Show Day of Week */}
            {newSchedule.type?.value === "weekly" && (
            <div className="flex flex-col items-start min-w-[200px]">
                <label className="block font-medium text-gray-700 text-sm mb-1">Days of Week</label>
                <div className="grid grid-cols-2 gap-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                    const selectedDays = newSchedule.dayOfWeek?.value || [];
                    const isChecked = selectedDays.includes(day);

                    return (
                    <label key={day} className="inline-flex items-center space-x-2">
                        <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                            const updated = e.target.checked
                            ? [...selectedDays, day]
                            : selectedDays.filter((d) => d !== day);
                            setNewSchedule({
                            ...newSchedule,
                            dayOfWeek: { value: updated, enabled: true },
                            });
                        }}
                        />
                        <span>{day}</span>
                    </label>
                    );
                })}
                </div>
            </div>
            )}

            {/* Conditional: CRON → Show CRON input */}
            {newSchedule.type?.value === "cron" && (
            <div className="flex flex-col items-center min-w-[200px]">
                {/* <label className="block font-medium text-gray-700">CRON Expression</label> */}
                <input
                type="text"
                className="border p-2 w-full rounded"
                placeholder="e.g. 0 9 * * *"
                value={newSchedule.cron?.value}
                onChange={(e) =>
                    setNewSchedule({
                    ...newSchedule,
                    time: {value:"", enabled: false},
                    cron: { value: e.target.value, enabled: true },
                    })
                }
                />
            </div>
            )}

            {scheduleType != "cron" && (
                <div className="flex flex-col items-center min-w-[200px]">
                <input
                    type="time"
                    className="border p-2 w-full rounded"
                    value={newSchedule.time?.value}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time: { value: e.target.value , enabled: true } })}
                />
                </div>
            )}

        </div>

        <button
        className="text-sm text-indigo-600 underline"
        onClick={() => {
            if (
            !newSchedule.flow ||
            ["", "--"].includes(newSchedule.flow) ||
            !newSchedule.type ||
            newSchedule.type === "" ||
            (newSchedule.type.value === "daily" && (!newSchedule.time || ["", "--", "--:-- --"].includes(newSchedule.time))) ||
            (newSchedule.type.value === "weekly" && (!newSchedule.dayOfWeek || newSchedule.dayOfWeek.value.length == 0))
            ) {
            alert("Please complete all required fields before adding a new schedule.");
            return;
            }
            if(schedules.find(item => item.flow?.value == newSchedule.flow.value))
            {
                alert("Schedule already defined for this flow! delte existing schdule to configure new one.");
                return;
            }
            setSchedules([...schedules, newSchedule]);
            setNewSchedule({ flow: "-- Choose saved flow --", type: "", time: "", timezone });
        }}
        >
        + Add Schedule
        </button>

            {schedules.length > 0 && (
            <div className="flex flex-wrap gap-6 justify-start mb-2 px-1">
            {allFields.map((field) => (
                <div key={field} className="min-w-[200px] text-center font-medium text-gray-700">
                {field === "dayOfWeek" ? "Days of Week" :
                field.charAt(0).toUpperCase() + field.slice(1)}
                </div>
            ))}
            </div>
            )}

            {schedules.map((sched, index) =>  (
            <div key={index} className="flex flex-wrap gap-6 justify-start mb-2">
                {allFields.map((field) => {
                const val = sched[field];
                const display =
                field === "flow" ? getFlowDisplayName(val)
                : typeof val === "boolean" ? 
                    val.toString() 
                    : val?.enabled ? 
                        Array.isArray(val.value) ? 
                            val.value.join(", ") 
                            : val.value
                        : "--";
                return (
                    <div key={field} className="min-w-[200px] text-center">
                    {display}
                    </div>
                );
                })}
                <button
                className="text-red-600 hover:underline text-sm ml-2"
                onClick={() => setSchedules((prev) => prev.filter((_, i) => i !== index))}
                >
                Delete
                </button>
            </div>
            ))}
        </SectionCard>
      </div>

      <div className="text-right">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Save Settings
        </button>
      </div>
    </main>
  );
}
