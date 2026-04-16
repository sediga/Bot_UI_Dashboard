import { useEffect, useState } from "react";

export default function EmailDraftStep({
  mode = "create",
  initial = null,
  onCreate,
  onCancel,
}) {
  const [stepName, setStepName] = useState("Reply as Draft");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [attachmentFolderPath, setAttachmentFolderPath] = useState("");
  const [subjectIdPattern, setSubjectIdPattern] = useState("");

  useEffect(() => {
    if (!initial) return;
    setStepName(initial.name || initial.stepName || "Reply as Draft");
    setTo(initial.to || "");
    setCc(initial.cc || "");
    setBcc(initial.bcc || "");
    setSubject(initial.subject || "");
    setBodyText(initial.bodyText || initial.body || initial.text || "");
    setAttachmentFolderPath(initial.attachmentFolderPath || "");
    setSubjectIdPattern(initial.subjectIdPattern || "");
  }, [initial]);

  const handleSave = () => {
    const payload = {
      id: initial?.id || crypto.randomUUID(),
      type: "emailCreateDraft",
      provider: "gmail",
      draftMode: "reply",
      saveOnly: true,
      name: stepName.trim() || "Reply as Draft",
      label: "Email Draft: reply to trigger",
      to: String(to || "").trim(),
      cc: String(cc || "").trim(),
      bcc: String(bcc || "").trim(),
      subject: String(subject || "").trim(),
      bodyText: String(bodyText || ""),
      attachmentFolderPath: String(attachmentFolderPath || "").trim(),
      subjectIdPattern: String(subjectIdPattern || "").trim(),
      timestamp: Date.now(),
    };
    onCreate?.(payload);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-blue-700">Step 2: Configure</div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Step name</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="Reply as Draft"
        />
      </div>

      <div className="rounded-md border border-gray-200 bg-slate-50 px-3 py-2 text-xs text-gray-600">
        This step replies to the triggered Gmail message and saves the response as a draft.
        Leave recipient or subject blank to reuse the incoming email thread defaults.
        Body text supports tokens like <code>{"{{row.subject}}"}</code>, <code>{"{{row.from}}"}</code>, and <code>{"{{row.textBody}}"}</code>.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To override</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Leave blank to reply to sender"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Subject override</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Leave blank to keep thread subject"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cc</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="optional@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bcc</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="optional@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Draft body</label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={8}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          placeholder={"Hello,\n\nThanks for your email about {{row.subject}}.\n\nBest,\n"}
        />
      </div>

      <div className="rounded-md border border-gray-200 p-3 space-y-3">
        <div className="text-xs font-semibold text-gray-700">Optional Attachments From Subject ID</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Base folder path</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={attachmentFolderPath}
              onChange={(e) => setAttachmentFolderPath(e.target.value)}
              placeholder={"D:\\ClientDocs\\Preauth"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Subject ID regex</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              value={subjectIdPattern}
              onChange={(e) => setSubjectIdPattern(e.target.value)}
              placeholder={"ID:([A-Za-z0-9_-]+)"}
            />
          </div>
        </div>
        <div className="text-[11px] text-gray-500">
          If configured, the first regex capture from the incoming email subject is used as the folder name under the base path, and all files in that folder are attached to the draft.
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">Back</button>
        <button
          onClick={handleSave}
          disabled={!stepName.trim() || !bodyText.trim() || (!!attachmentFolderPath.trim() && !subjectIdPattern.trim())}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
        >
          {mode === "edit" ? "Save Email Draft Step" : "Add Email Draft Step"}
        </button>
      </div>
    </div>
  );
}
