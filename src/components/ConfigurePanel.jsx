import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import defaultConfig from "../config/botflows_config";
import FlowSelector from "./FlowSelector";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";

const US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const EMAIL_START_MODES = [
  { value: "single_message", label: "One flow run per email" },
  { value: "batch", label: "Single batch run" },
];

function createEmptyEmailTrigger() {
  return {
    provider: "gmail",
    integrationRef: "gmail_default",
    mode: "poll",
    pollIntervalMinutes: 5,
    lookbackMinutes: 30,
    gmailQuery: "label:inbox is:unread newer_than:2d",
    maxMessagesPerPoll: 10,
    startMode: "single_message",
    markReadAfterStart: false,
    applyLabel: "",
    dedupeKey: "messageId",
  };
}

function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (base && typeof base === "object") {
    const merged = { ...base };
    if (!override || typeof override !== "object") return merged;
    Object.keys(override).forEach((key) => {
      merged[key] = key in base ? deepMerge(base[key], override[key]) : override[key];
    });
    return merged;
  }
  return override === undefined ? base : override;
}

function cloneConfig(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

function toField(value, fallback = "") {
  if (value && typeof value === "object" && "value" in value) return value;
  return { value: value ?? fallback, enabled: true };
}

function createEmptySchedule(timezone = "America/Chicago") {
  return {
    enabled: true,
    silent: true,
    headless: true,
    flow: { value: "", enabled: true },
    type: { value: "", enabled: true },
    time: { value: "09:00", enabled: true },
    dayOfWeek: { value: [], enabled: false },
    cron: { value: "", enabled: false },
    emailTrigger: createEmptyEmailTrigger(),
    timezone,
  };
}

function normalizeEmailTrigger(trigger) {
  const seed = createEmptyEmailTrigger();
  const merged = { ...seed, ...(trigger && typeof trigger === "object" ? trigger : {}) };
  return {
    ...merged,
    provider: String(merged.provider || "gmail").trim() || "gmail",
    integrationRef: String(merged.integrationRef || "gmail_default").trim() || "gmail_default",
    mode: "poll",
    pollIntervalMinutes: Number(merged.pollIntervalMinutes) > 0 ? Number(merged.pollIntervalMinutes) : seed.pollIntervalMinutes,
    lookbackMinutes: Number(merged.lookbackMinutes) >= 0 ? Number(merged.lookbackMinutes) : seed.lookbackMinutes,
    gmailQuery: String(merged.gmailQuery || "").trim() || seed.gmailQuery,
    maxMessagesPerPoll: Number(merged.maxMessagesPerPoll) > 0 ? Number(merged.maxMessagesPerPoll) : seed.maxMessagesPerPoll,
    startMode: String(merged.startMode || seed.startMode).trim() || seed.startMode,
    markReadAfterStart: Boolean(merged.markReadAfterStart),
    applyLabel: String(merged.applyLabel || "").trim(),
    dedupeKey: String(merged.dedupeKey || seed.dedupeKey).trim() || seed.dedupeKey,
  };
}

function normalizeScheduleItem(item, timezone) {
  const seed = createEmptySchedule(timezone);
  if (!item || typeof item !== "object") return seed;

  return {
    ...seed,
    ...item,
    flow: toField(item.flow, ""),
    type: toField(item.type, ""),
    time: toField(item.time, "09:00"),
    dayOfWeek: toField(item.dayOfWeek, []),
    cron: toField(item.cron, ""),
    emailTrigger: normalizeEmailTrigger(item.emailTrigger),
    headless:
      typeof item.headless === "object" && item.headless !== null && "value" in item.headless
        ? item.headless.value
        : Boolean(item.headless ?? item.silent ?? true),
    silent:
      typeof item.silent === "object" && item.silent !== null && "value" in item.silent
        ? item.silent.value
        : Boolean(item.silent ?? true),
    timezone: item.timezone || timezone,
  };
}

function sanitizeSchedule(raw, timezone) {
  const normalized = normalizeScheduleItem(raw, timezone);
  const typeValue = String(normalized.type?.value || "").trim();
  const flowValue = String(normalized.flow?.value || "").trim();
  const timeValue = String(normalized.time?.value || "").trim();
  const cronValue = String(normalized.cron?.value || "").trim();
  const days = Array.isArray(normalized.dayOfWeek?.value) ? normalized.dayOfWeek.value : [];
  const emailTrigger = normalizeEmailTrigger(normalized.emailTrigger);

  return {
    ...normalized,
    flow: { value: flowValue, enabled: true },
    type: { value: typeValue, enabled: true },
    time: { value: typeValue === "cron" ? "" : timeValue, enabled: typeValue !== "cron" },
    cron: { value: typeValue === "cron" ? cronValue : "", enabled: typeValue === "cron" },
    dayOfWeek: { value: typeValue === "weekly" ? days : [], enabled: typeValue === "weekly" },
    emailTrigger,
  };
}

function normalizeConfig(raw, timezone = "America/Chicago") {
  const merged = deepMerge(cloneConfig(defaultConfig), raw || {});
  const items = Array.isArray(merged.schedule?.items) ? merged.schedule.items : [];
  merged.schedule = merged.schedule || {};
  merged.schedule.items = items.filter(Boolean).map((item) => normalizeScheduleItem(item, timezone));
  return merged;
}

export default function ConfigurePanel() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState("America/Chicago");
  const [userConfig, setConfig] = useState(() => normalizeConfig(defaultConfig));
  const [schedules, setSchedules] = useState([]);
  const [baselineSchedulesHash, setBaselineSchedulesHash] = useState("[]");
  const [newSchedule, setNewSchedule] = useState(() => createEmptySchedule("America/Chicago"));
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [flows, setFlows] = useState([]);
  const [adminFlows, setAdminFlows] = useState([]);
  const [orphanPolicies, setOrphanPolicies] = useState([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminOwnerFilter, setAdminOwnerFilter] = useState("all");
  const [flowNameMap, setFlowNameMap] = useState({});
  const [message, setMessage] = useState(null);
  const [gmailSetup, setGmailSetup] = useState(null);
  const [gmailDraft, setGmailDraft] = useState({ enabled: false, mailboxAddress: "" });
  const [gmailClientFileName, setGmailClientFileName] = useState("");
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailMessage, setGmailMessage] = useState(null);
  const [updatingFlowId, setUpdatingFlowId] = useState("");
  const [updatingOrphanId, setUpdatingOrphanId] = useState("");
  const gmailFileInputRef = useRef(null);

  const schedulesHash = useMemo(() => JSON.stringify(schedules), [schedules]);
  const isDirty = schedulesHash !== baselineSchedulesHash;
  const isAdmin = useMemo(() => {
    const roles = [];
    if (user?.role) roles.push(user.role);
    if (Array.isArray(user?.roles)) roles.push(...user.roles);
    return roles.some((r) => String(r || "").toLowerCase() === "admin");
  }, [user]);
  const filteredAdminFlows = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    return adminFlows.filter((flow) => {
      const isEnabled = flow.isExecutionEnabled !== false;
      const owner = flow.ownerEmail || "";
      if (adminOwnerFilter !== "all" && owner !== adminOwnerFilter) return false;
      if (adminStatusFilter === "enabled" && !isEnabled) return false;
      if (adminStatusFilter === "disabled" && isEnabled) return false;
      if (!query) return true;

      const haystack = `${flow.name || ""} ${owner} ${flow.path || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [adminFlows, adminOwnerFilter, adminSearch, adminStatusFilter]);
  const adminOwners = useMemo(() => {
    return Array.from(
      new Set(
        adminFlows
          .map((flow) => flow.ownerEmail || "")
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [adminFlows]);

  const token = localStorage.getItem("botflows_token") || "";
  const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  const fetchGmailSetup = async () => {
    setGmailLoading(true);
    setGmailMessage(null);
    try {
      const res = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGmailSetup(data);
      setGmailDraft({
        enabled: Boolean(data?.enabled),
        mailboxAddress: String(data?.mailboxAddress || ""),
      });
      setGmailClientFileName("");
    } catch (err) {
      console.error("Failed to load Gmail setup:", err);
      setGmailSetup(null);
      setGmailMessage({
        type: "error",
        text: "Could not reach the local agent for Gmail setup. Make sure the Flowtra Agent is running on this machine.",
      });
    } finally {
      setGmailLoading(false);
    }
  };

  const setLoadedSchedules = (items) => {
    const next = Array.isArray(items) ? items : [];
    setSchedules(next);
    setBaselineSchedulesHash(JSON.stringify(next));
  };

  const validateSchedule = (candidate, excludeIndex = null) => {
    const flowValue = String(candidate.flow?.value || "").trim();
    const typeValue = String(candidate.type?.value || "").trim();
    const timeValue = String(candidate.time?.value || "").trim();
    const cronValue = String(candidate.cron?.value || "").trim();
    const selectedDays = Array.isArray(candidate.dayOfWeek?.value) ? candidate.dayOfWeek.value : [];
    const emailTrigger = normalizeEmailTrigger(candidate.emailTrigger);

    if (!flowValue || !typeValue) return "Flow and schedule type are required.";
    if ((typeValue === "daily" || typeValue === "weekly") && !timeValue) return "Time is required for daily/weekly schedules.";
    if (typeValue === "weekly" && selectedDays.length === 0) return "Select at least one day for a weekly schedule.";
    if (typeValue === "cron" && !cronValue) return "CRON expression is required.";
    if (typeValue === "email") {
      if (!gmailSetup?.isConnected) return "Connect Gmail on this machine before adding an email trigger.";
      if (!String(emailTrigger.gmailQuery || "").trim()) return "Gmail query is required for an email trigger.";
      if (!(Number(emailTrigger.pollIntervalMinutes) > 0)) return "Poll interval must be greater than 0 minutes.";
      if (!(Number(emailTrigger.maxMessagesPerPoll) > 0)) return "Max messages per poll must be greater than 0.";
    }

    const duplicate = schedules.some((item, index) => {
      if (excludeIndex !== null && index === excludeIndex) return false;
      return item.flow?.value === flowValue && item.type?.value === typeValue;
    });
    if (duplicate) return "A schedule of this type already exists for this flow.";

    return "";
  };

  useEffect(() => {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (US_TIMEZONES.includes(localTz)) {
      setTimezone(localTz);
      setNewSchedule((prev) => ({ ...prev, timezone: localTz }));
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("botflows_config");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const normalized = normalizeConfig(parsed, timezone);
      setConfig(normalized);
      setLoadedSchedules(normalized.schedule?.items || []);
    } catch {
      setConfig(normalizeConfig(defaultConfig, timezone));
      setLoadedSchedules([]);
    }
  }, [timezone]);

  useEffect(() => {
    fetchGmailSetup();
  }, []);

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const listRes = await fetch(`${config.apiBaseUrl}/api/flows/list`, {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
        });

        if (!listRes.ok) {
          setFlows([]);
          setFlowNameMap({});
          setAdminFlows([]);
          setOrphanPolicies([]);
          return;
        }

        const flowData = await listRes.json();
        const flowList = Array.isArray(flowData) ? flowData : [];
        setFlows(flowList);

        const map = {};
        flowList.forEach((f) => {
          map[f.path] = f.name;
        });
        setFlowNameMap(map);

        if (isAdmin) {
          const adminRes = await fetch(`${config.apiBaseUrl}/api/flows/execution-flags`, {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              "x-api-key": config.apiKey,
            },
          });

          if (!adminRes.ok) {
            setAdminFlows([]);
            return;
          }

          const adminData = await adminRes.json();
          setAdminFlows(Array.isArray(adminData) ? adminData : []);

          const orphanRes = await fetch(`${config.apiBaseUrl}/api/flows/orphan-policies`, {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              "x-api-key": config.apiKey,
            },
          });
          if (orphanRes.ok) {
            const orphanData = await orphanRes.json();
            setOrphanPolicies(Array.isArray(orphanData) ? orphanData : []);
          } else {
            setOrphanPolicies([]);
          }
          return;
        }

        setAdminFlows([]);
        setOrphanPolicies([]);
      } catch (err) {
        console.error("Failed to load flows:", err);
        setAdminFlows([]);
        setOrphanPolicies([]);
      }
    };

    fetchFlows();
  }, [authHeader, isAdmin]);

  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/flows/load-config`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("botflows_token")}`,
            "x-api-key": `${config.apiKey}`,
          },
        });

        if (!response.ok) throw new Error("Failed to load user config");

        const responseConfig = await response.json();
        const normalized = normalizeConfig(responseConfig, timezone);
        setConfig(normalized);
        setLoadedSchedules(normalized.schedule?.items || []);
      } catch (err) {
        console.error("Error loading userConfig:", err);
      }
    };

    loadUserConfig();
  }, [timezone]);

  const scheduleType = newSchedule.type?.value || "";

  const describeSchedule = (schedule) => {
    const typeValue = String(schedule?.type?.value || "").trim();
    if (typeValue === "daily") return schedule?.time?.value || "--";
    if (typeValue === "weekly") {
      const days = Array.isArray(schedule?.dayOfWeek?.value) ? schedule.dayOfWeek.value.join(", ") : "--";
      return `${days || "--"} at ${schedule?.time?.value || "--"}`;
    }
    if (typeValue === "cron") return schedule?.cron?.value || "--";
    if (typeValue === "email") {
      const trigger = normalizeEmailTrigger(schedule?.emailTrigger);
      return `Poll every ${trigger.pollIntervalMinutes}m, ${trigger.startMode === "batch" ? "batch" : "single email"}, query: ${trigger.gmailQuery || "--"}`;
    }
    return "--";
  };

  const getFlowDisplayName = (val) => {
    const flowPath = val?.value || "";
    if (!flowPath) return "--";
    return flowNameMap[flowPath] || flowPath;
  };

  const formatScopeKey = (scopeKey) => {
    const raw = String(scopeKey || "").trim();
    if (!raw) return { label: "-", raw: "-" };
    if (!raw.startsWith("user:")) return { label: raw, raw };

    const id = raw.slice("user:".length).trim();
    if (!id) return { label: "User: (empty)", raw };
    if (id.toLowerCase() === "unknown") return { label: "Unknown (shared fallback)", raw };
    if (/^\d+$/.test(id)) return { label: `Dashboard User ${id}`, raw };
    return { label: `Client ${id}`, raw };
  };

  const resetNewSchedule = () => {
    setNewSchedule(createEmptySchedule(timezone));
  };

  const handleAddSchedule = () => {
    const next = sanitizeSchedule(newSchedule, timezone);
    const validationError = validateSchedule(next);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSchedules((prev) => [...prev, next]);
    resetNewSchedule();
    setMessage({ type: "success", text: "Schedule added locally. Click Save Settings to persist." });
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingSchedule(normalizeScheduleItem(schedules[index], timezone));
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingSchedule(null);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingSchedule) return;
    const next = sanitizeSchedule(editingSchedule, timezone);
    const validationError = validateSchedule(next, editingIndex);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setSchedules((prev) => prev.map((row, index) => (index === editingIndex ? next : row)));
    setEditingIndex(null);
    setEditingSchedule(null);
    setMessage({ type: "success", text: "Schedule updated locally. Click Save Settings to persist." });
  };

  const handleDeleteSchedule = (index) => {
    const confirmed = window.confirm("Delete this schedule?");
    if (!confirmed) return;

    setSchedules((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingSchedule(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex((prev) => prev - 1);
    }
    setMessage({ type: "success", text: "Schedule deleted locally. Click Save Settings to persist." });
  };

  const handleSave = async () => {
    if (!isDirty) return;

    const updated = {
      ...userConfig,
      schedule: {
        ...userConfig.schedule,
        items: schedules,
      },
    };

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/flows/save-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("botflows_token")}`,
          "x-api-key": `${config.apiKey}`,
        },
        body: JSON.stringify({ Config: updated }),
      });

      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("botflows_config", JSON.stringify(updated));
        setBaselineSchedulesHash(JSON.stringify(schedules));
        setMessage({ type: "success", text: "Configuration settings saved." });
        console.log(result.message);
      } else {
        setMessage({ type: "error", text: result.message || "Failed to save configuration." });
      }
    } catch (err) {
      console.error("Failed to save userConfig:", err);
      setMessage({ type: "error", text: "Failed to save configuration. Please try again." });
    }
  };

  const handleToggleFlowExecution = async (flow) => {
    if (!isAdmin || !flow?.id) return;
    const nextValue = !(flow.isExecutionEnabled !== false);
    let disableReason = "";
    if (!nextValue) {
      disableReason = window.prompt("Reason for disabling this flow:", flow.disableReason || "")?.trim() || "";
      if (!disableReason) {
        setMessage({ type: "error", text: "Disable reason is required." });
        return;
      }
    }
    setUpdatingFlowId(flow.id);
    setMessage(null);
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/flows/${encodeURIComponent(flow.id)}/execution-enabled`,
        {
          method: "PATCH",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
          body: JSON.stringify({ isExecutionEnabled: nextValue, disableReason }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.error || `HTTP ${response.status}`);
      }
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flow.id
            ? { ...f, isExecutionEnabled: nextValue, disableReason: nextValue ? null : disableReason }
            : f
        )
      );
      setAdminFlows((prev) =>
        prev.map((f) =>
          f.id === flow.id
            ? { ...f, isExecutionEnabled: nextValue, disableReason: nextValue ? null : disableReason }
            : f
        )
      );
      setMessage({
        type: "success",
        text: `Execution ${nextValue ? "enabled" : "disabled"} for "${flow.name || flow.id}".`,
      });
    } catch (err) {
      setMessage({ type: "error", text: `Failed to update execution flag: ${err.message}` });
    } finally {
      setUpdatingFlowId("");
    }
  };

  const handleSaveGmailSetup = async () => {
    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: Boolean(gmailDraft.enabled),
          mailboxAddress: String(gmailDraft.mailboxAddress || "").trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || result?.details || `HTTP ${response.status}`);
      }
      const next = result?.gmail || null;
      setGmailSetup(next);
      setGmailDraft({
        enabled: Boolean(next?.enabled),
        mailboxAddress: String(next?.mailboxAddress || ""),
      });
      setGmailClientFileName("");
      setGmailMessage({ type: "success", text: result?.message || "Gmail setup saved locally." });
    } catch (err) {
      console.error("Failed to save Gmail setup:", err);
      setGmailMessage({ type: "error", text: `Failed to save Gmail setup: ${err.message}` });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleResetGmailSetup = async () => {
    const ok = window.confirm("Reset Gmail setup on this player?");
    if (!ok) return;

    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || result?.details || `HTTP ${response.status}`);
      const next = result?.gmail || null;
      setGmailSetup(next);
      setGmailDraft({
        enabled: Boolean(next?.enabled),
        mailboxAddress: String(next?.mailboxAddress || ""),
      });
      setGmailClientFileName("");
      setGmailMessage({ type: "success", text: result?.message || "Gmail setup reset." });
    } catch (err) {
      console.error("Failed to reset Gmail setup:", err);
      setGmailMessage({ type: "error", text: `Failed to reset Gmail setup: ${err.message}` });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleOpenAgentEmailSettings = async () => {
    try {
      const response = await fetch(`${config.agentServerUrl}/api/open-email-settings`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setGmailMessage({ type: "success", text: "Opened local agent email settings on this machine." });
    } catch (err) {
      console.error("Failed to open agent email settings:", err);
      setGmailMessage({ type: "error", text: "Could not open local agent email settings." });
    }
  };

  const handleUploadGmailClientJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const clientConfigJson = await file.text();
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail/client-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientConfigJson }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.detail || result?.message || `HTTP ${response.status}`);
      setGmailSetup(result?.gmail || null);
      setGmailClientFileName(file.name);
      setGmailMessage({ type: "success", text: result?.message || "Gmail client file stored locally." });
    } catch (err) {
      console.error("Failed to upload Gmail client file:", err);
      setGmailMessage({ type: "error", text: `Failed to store Gmail client file: ${err.message}` });
    } finally {
      if (gmailFileInputRef.current) gmailFileInputRef.current.value = "";
      setGmailSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail/connect`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.detail || result?.message || `HTTP ${response.status}`);
      setGmailSetup(result?.gmail || null);
      setGmailMessage({ type: "success", text: result?.message || "Gmail connected successfully." });
    } catch (err) {
      console.error("Failed to connect Gmail:", err);
      setGmailMessage({ type: "error", text: `Failed to connect Gmail: ${err.message}` });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleTestGmail = async () => {
    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail/test`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.detail || result?.message || `HTTP ${response.status}`);
      setGmailSetup(result?.gmail || null);
      const mailbox = result?.profile?.emailAddress ? ` (${result.profile.emailAddress})` : "";
      setGmailMessage({ type: "success", text: `${result?.message || "Gmail test succeeded."}${mailbox}` });
    } catch (err) {
      console.error("Failed to test Gmail:", err);
      setGmailMessage({ type: "error", text: `Failed to test Gmail: ${err.message}` });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleDisconnectGmail = async () => {
    const ok = window.confirm("Disconnect Gmail on this player?");
    if (!ok) return;

    setGmailSaving(true);
    setGmailMessage(null);
    try {
      const response = await fetch(`${config.agentServerUrl}/api/integrations/email/gmail/disconnect`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.detail || result?.message || `HTTP ${response.status}`);
      setGmailSetup(result?.gmail || null);
      setGmailMessage({ type: "success", text: result?.message || "Gmail disconnected." });
    } catch (err) {
      console.error("Failed to disconnect Gmail:", err);
      setGmailMessage({ type: "error", text: `Failed to disconnect Gmail: ${err.message}` });
    } finally {
      setGmailSaving(false);
    }
  };

  const handleUpdateOrphanPolicy = async (row, nextStatus) => {
    if (!isAdmin || !row?.id) return;
    let disableReason = "";
    if (nextStatus === "disabled") {
      disableReason = window.prompt("Reason for disabling this orphan flow:", row.disableReason || "")?.trim() || "";
      if (!disableReason) {
        setMessage({ type: "error", text: "Disable reason is required for orphan policy." });
        return;
      }
    }
    setUpdatingOrphanId(String(row.id));
    setMessage(null);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/flows/orphan-policies/${row.id}`, {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({ status: nextStatus, disableReason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
      const syncedScopeKeys = Array.isArray(body?.syncedScopeKeys) ? new Set(body.syncedScopeKeys) : null;
      setOrphanPolicies((prev) =>
        prev.map((p) =>
          ((syncedScopeKeys && syncedScopeKeys.has(p.scopeKey)) || p.id === row.id)
            ? { ...p, status: nextStatus, disableReason: nextStatus === "disabled" ? disableReason : null }
            : p
        )
      );
      setMessage({ type: "success", text: `Orphan policy updated to ${nextStatus}.` });
    } catch (err) {
      setMessage({ type: "error", text: `Failed to update orphan policy: ${err.message}` });
    } finally {
      setUpdatingOrphanId("");
    }
  };

  const renderScheduleEditor = (value, onChange) => {
    const typeValue = value.type?.value || "";
    const emailTrigger = normalizeEmailTrigger(value.emailTrigger);

    const updateEmailTrigger = (patch) =>
      onChange({
        ...value,
        emailTrigger: normalizeEmailTrigger({
          ...emailTrigger,
          ...patch,
        }),
      });

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 items-start">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Run Background</label>
          <div className="h-11 flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value.silent)}
              onChange={(e) => onChange({ ...value, silent: e.target.checked })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Run Headless</label>
          <div className="h-11 flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value.headless ?? value.silent ?? true)}
              onChange={(e) => onChange({ ...value, headless: e.target.checked })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Select Flow</label>
          <FlowSelector
            value={value.flow?.value || ""}
            onChange={(val) => onChange({ ...value, flow: { value: val, enabled: true } })}
            showLabel={false}
            fetchedFlows={flows}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
          <select
            className="border p-2 w-full rounded h-11"
            value={typeValue}
            onChange={(e) => {
              const type = e.target.value;
              onChange({
                ...value,
                type: { value: type, enabled: true },
                dayOfWeek: {
                  value: type === "weekly" ? value.dayOfWeek?.value || [] : [],
                  enabled: type === "weekly",
                },
                cron: {
                  value: type === "cron" ? value.cron?.value || "" : "",
                  enabled: type === "cron",
                },
                time: {
                  value: type === "cron" ? "" : value.time?.value || "09:00",
                  enabled: type !== "cron",
                },
              });
            }}
          >
            <option value="">Select schedule type</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="cron">CRON</option>
            <option value="email">Email Trigger</option>
          </select>
        </div>

        {typeValue === "weekly" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Days of Week</label>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border rounded p-2 min-h-[44px]">
              {DAYS_OF_WEEK.map((day) => {
                const selectedDays = value.dayOfWeek?.value || [];
                const isChecked = selectedDays.includes(day);
                return (
                  <label key={day} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...selectedDays, day]
                          : selectedDays.filter((d) => d !== day);
                        onChange({
                          ...value,
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

        {typeValue === "cron" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">CRON</label>
            <input
              type="text"
              className="border p-2 w-full rounded h-11"
              placeholder="e.g. 0 9 * * *"
              value={value.cron?.value || ""}
              onChange={(e) => onChange({ ...value, cron: { value: e.target.value, enabled: true } })}
            />
          </div>
        )}

        {(typeValue === "daily" || typeValue === "weekly") && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Time (HH:mm)</label>
            <input
              type="time"
              className="border p-2 w-full rounded h-11"
              value={value.time?.value || ""}
              onChange={(e) => onChange({ ...value, time: { value: e.target.value, enabled: true } })}
            />
          </div>
        )}
      </div>

        {typeValue === "email" && (
          <div className="rounded border border-amber-200 bg-amber-50 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-gray-800">Email Trigger Configuration</div>
                <div className="text-xs text-gray-600">
                  This flow will be started by agent-side Gmail polling instead of cron time.
                </div>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  gmailSetup?.isConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {gmailSetup?.isConnected ? "Gmail connected on this machine" : "Gmail connection required"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-start">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Provider</label>
                <input type="text" className="border p-2 w-full rounded h-11 bg-gray-50" value="Gmail" readOnly />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Poll Every (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.pollIntervalMinutes}
                  onChange={(e) => updateEmailTrigger({ pollIntervalMinutes: Number(e.target.value || 0) })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Lookback (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.lookbackMinutes}
                  onChange={(e) => updateEmailTrigger({ lookbackMinutes: Number(e.target.value || 0) })}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Max Messages Per Poll</label>
                <input
                  type="number"
                  min="1"
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.maxMessagesPerPoll}
                  onChange={(e) => updateEmailTrigger({ maxMessagesPerPoll: Number(e.target.value || 0) })}
                />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Gmail Query</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.gmailQuery}
                  onChange={(e) => updateEmailTrigger({ gmailQuery: e.target.value })}
                  placeholder="label:inbox is:unread newer_than:2d"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Start Mode</label>
                <select
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.startMode}
                  onChange={(e) => updateEmailTrigger({ startMode: e.target.value })}
                >
                  {EMAIL_START_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Apply Label</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded h-11"
                  value={emailTrigger.applyLabel}
                  onChange={(e) => updateEmailTrigger({ applyLabel: e.target.value })}
                  placeholder="flowtra-processed"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(emailTrigger.markReadAfterStart)}
                  onChange={(e) => updateEmailTrigger({ markReadAfterStart: e.target.checked })}
                />
                Mark email read after the flow is successfully queued
              </label>
              <div className="text-xs text-gray-600">
                Matched emails will later be deduped by <span className="font-medium">{emailTrigger.dedupeKey}</span>.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="p-6 overflow-auto h-full text-gray-700 bg-gray-50 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Schedule Settings</h1>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${isDirty ? "text-amber-700" : "text-gray-500"}`}>
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-4 py-2 bg-indigo-600 text-white rounded enabled:hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Settings
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-green-300 bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="bg-white rounded-lg shadow p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-md font-semibold text-purple-700">Email Integration Setup</h2>
            <p className="mt-1 text-sm text-gray-500">
              Save the local Gmail mailbox setup on this player so email-enabled flows can validate that this machine is prepared.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchGmailSetup}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            disabled={gmailLoading}
          >
            {gmailLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {gmailMessage && (
          <div
            className={`rounded border px-4 py-3 text-sm ${
              gmailMessage.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-green-300 bg-green-50 text-green-700"
            }`}
          >
            {gmailMessage.text}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Provider:</span> Gmail
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Access Mode:</span>{" "}
              {gmailSetup?.authModeLabel || "Flowtra-managed Gmail API desktop OAuth"}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Setup Status:</span>{" "}
              <span className={gmailSetup?.isConfigured ? "text-emerald-700" : "text-amber-700"}>
                {gmailSetup?.statusLabel || "Not configured"}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Connected Mailbox:</span>{" "}
              {gmailSetup?.connectedEmail || gmailSetup?.mailboxAddress || "Not connected"}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Connected At:</span>{" "}
              {gmailSetup?.connectedAt || "Not connected"}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">OAuth Client:</span>{" "}
              {gmailSetup?.clientConfigLabel || (gmailSetup?.clientConfigStored ? "Stored locally" : "Not available")}
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Mailbox Token:</span>{" "}
              {gmailSetup?.tokenStored ? "Present" : "Not connected"}
            </div>
            <div className="text-xs text-gray-500 pt-1">
              {gmailSetup?.statusHint ||
                "Complete local mailbox setup before running any flow that uses Gmail read/draft steps."}
            </div>
          </div>

          <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={gmailDraft.enabled}
                onChange={(e) => setGmailDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enable Gmail integration on this machine
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mailbox Address</label>
              <input
                type="email"
                className="w-full rounded border p-2 text-sm"
                value={gmailDraft.mailboxAddress}
                onChange={(e) => setGmailDraft((prev) => ({ ...prev, mailboxAddress: e.target.value }))}
                placeholder="shared-inbox@facility.org"
              />
            </div>

            {gmailSetup?.usesBundledClientConfig ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google App Credential</label>
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  Bundled with this Flowtra Agent build
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desktop OAuth Client JSON</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => gmailFileInputRef.current?.click()}
                    className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700"
                    disabled={gmailSaving}
                  >
                    Choose File
                  </button>
                  <button
                    type="button"
                    onClick={() => gmailFileInputRef.current?.click()}
                    className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={gmailSaving}
                  >
                    Upload To Agent
                  </button>
                  <span className="text-xs text-gray-500">
                    {gmailClientFileName || (gmailSetup?.clientConfigStored ? "Stored locally on this machine" : "No file selected")}
                  </span>
                </div>
                <input
                  ref={gmailFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleUploadGmailClientJson}
                />
              </div>
            )}

            <div className="text-xs text-gray-500">
              {gmailSetup?.usesBundledClientConfig
                ? "Save the local mailbox setup here, then connect Gmail. Gmail filters, polling windows, and processing behavior still belong in the email flow steps."
                : "Save the local mailbox setup and upload the Flowtra-managed Google desktop OAuth client JSON here. Gmail filters, polling windows, and processing behavior still belong in the email flow steps."}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveGmailSetup}
                disabled={gmailSaving}
                className="px-4 py-2 rounded bg-indigo-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {gmailSaving ? "Saving..." : "Save Gmail Setup"}
              </button>
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={gmailSaving || !gmailSetup?.canConnect}
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Connect Gmail
              </button>
              <button
                type="button"
                onClick={handleTestGmail}
                disabled={gmailSaving || !gmailSetup?.tokenStored}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleDisconnectGmail}
                disabled={gmailSaving || !gmailSetup?.tokenStored}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
              >
                Disconnect
              </button>
              <button
                type="button"
                onClick={handleResetGmailSetup}
                disabled={gmailSaving}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleOpenAgentEmailSettings}
                className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700"
              >
                Open Agent Email Settings
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-5 space-y-4">
        {renderScheduleEditor(newSchedule, setNewSchedule)}

        <div>
          <button className="text-sm text-indigo-600 underline" onClick={handleAddSchedule}>
            + Add Schedule
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-5 space-y-3">
        <h2 className="text-md font-semibold text-purple-700">Configured Schedules</h2>

        {schedules.length === 0 && <p className="text-sm text-gray-500">No schedules configured yet.</p>}

        {schedules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Background</th>
                  <th className="py-2 pr-4">Headless</th>
                  <th className="py-2 pr-4">Flow</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Schedule Details</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sched, index) => (
                  <Fragment key={`group-${index}`}>
                    <tr key={`row-${index}`} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{sched.silent ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{(sched.headless ?? sched.silent ?? true) ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">{getFlowDisplayName(sched.flow)}</td>
                      <td className="py-2 pr-4">{sched.type?.value || "--"}</td>
                      <td className="py-2 pr-4 max-w-[460px] text-xs text-gray-600">{describeSchedule(sched)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-3">
                          <button className="text-indigo-600 hover:underline" onClick={() => handleStartEdit(index)}>
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => handleDeleteSchedule(index)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editingIndex === index && editingSchedule && (
                      <tr key={`edit-${index}`} className="bg-gray-50 border-b">
                        <td className="py-3" colSpan={6}>
                          <div className="px-2 space-y-3">
                            {renderScheduleEditor(editingSchedule, setEditingSchedule)}
                            <div className="flex justify-end gap-3">
                              <button className="text-sm text-gray-600 hover:underline" onClick={handleCancelEdit}>
                                Cancel
                              </button>
                              <button
                                className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                                onClick={handleSaveEdit}
                              >
                                Save Row
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="bg-white rounded-lg shadow p-5 space-y-3">
          <h2 className="text-md font-semibold text-purple-700">Flow Execution Gate (Admin)</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Search flow, owner email, path"
              className="border p-2 rounded h-10 md:col-span-2"
            />
            <select
              value={adminStatusFilter}
              onChange={(e) => setAdminStatusFilter(e.target.value)}
              className="border p-2 rounded h-10"
            >
              <option value="all">All statuses</option>
              <option value="enabled">Enabled only</option>
              <option value="disabled">Disabled only</option>
            </select>
            <select
              value={adminOwnerFilter}
              onChange={(e) => setAdminOwnerFilter(e.target.value)}
              className="border p-2 rounded h-10"
            >
              <option value="all">All owners</option>
              {adminOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
          {adminFlows.length === 0 && <p className="text-sm text-gray-500">No flows found.</p>}
          {adminFlows.length > 0 && filteredAdminFlows.length === 0 && (
            <p className="text-sm text-gray-500">No flows match the current filter.</p>
          )}
          {filteredAdminFlows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Flow</th>
                  <th className="py-2 pr-4">Owner (Email)</th>
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2 pr-4">Execution Enabled</th>
                  <th className="py-2 pr-4">Disable Reason</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
                <tbody>
                  {filteredAdminFlows.map((flow) => (
                    <tr key={flow.id || flow.path} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{flow.name || "-"}</td>
                      <td className="py-2 pr-4">{flow.ownerEmail || "-"}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{flow.path || "-"}</td>
                      <td className="py-2 pr-4">
                        <span className={flow.isExecutionEnabled !== false ? "text-emerald-700" : "text-red-700"}>
                          {flow.isExecutionEnabled !== false ? "On" : "Off"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{flow.disableReason || "--"}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={updatingFlowId === flow.id}
                          onClick={() => handleToggleFlowExecution(flow)}
                          className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
                        >
                          {updatingFlowId === flow.id
                            ? "Updating..."
                            : flow.isExecutionEnabled !== false
                              ? "Turn Off"
                              : "Turn On"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="bg-white rounded-lg shadow p-5 space-y-3">
          <h2 className="text-md font-semibold text-purple-700">Orphan Flow Policies (Admin)</h2>
          {orphanPolicies.length === 0 && <p className="text-sm text-gray-500">No orphaned flows observed yet.</p>}
          {orphanPolicies.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-4">Scope</th>
                    <th className="py-2 pr-4">Hash</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">Last Seen</th>
                    <th className="py-2 pr-4">Runs</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orphanPolicies.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4" title={String(row.scopeKey || "-")}>
                        {formatScopeKey(row.scopeKey).label}
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{row.flowHash || "-"}</td>
                      <td className="py-2 pr-4">{row.status || "-"}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{row.disableReason || "--"}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600">{row.lastSeenAt || "-"}</td>
                      <td className="py-2 pr-4">{row.runCount ?? 0}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={updatingOrphanId === String(row.id) || row.status === "approved"}
                            onClick={() => handleUpdateOrphanPolicy(row, "approved")}
                            className="px-2 py-1 rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingOrphanId === String(row.id) || row.status === "disabled"}
                            onClick={() => handleUpdateOrphanPolicy(row, "disabled")}
                            className="px-2 py-1 rounded border bg-white hover:bg-slate-50 disabled:opacity-50"
                          >
                            Disable
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
