import { Dialog } from "@headlessui/react";
import { useState } from "react";
import config from "../config";

export default function ReachOutPopup({
  isOpen,
  onClose,
  userEmail,
  title = "Reach Out to Us",
  emailLabel = "Your Email",
  messageLabel = "Message",
  messagePlaceholder = "Let us know what you need help with...",
  submitText = "Send Message",
}) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const token = localStorage.getItem("botflows_token"); // or from your auth context
  const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { email, feedback: message };
    setSubmitted(true);

    const response = await fetch(`${config.apiBaseUrl}/api/feedback`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        ...(token && { Authorization: `Bearer ${token}` }), // only attach if logged in
        },
        body: JSON.stringify(payload),
    });

        if (!response.ok) {
            setSubmitted(false);
            throw new Error(await response.text());
        }
        else {
            setTimeout(() => {
                setMessage("");
                setSubmitted(false);
            }, 5000);
        }

    onClose();
    };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-black bg-opacity-30 backdrop-blur-sm">
        <Dialog.Panel className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200">
          <Dialog.Title className="text-2xl font-semibold text-gray-900 mb-2">
            {title}
          </Dialog.Title>

            {submitted ? (
              <div className="text-center py-16">
                <p className="text-2xl font-semibold text-green-600 mb-2">🎉 Thank you!</p>
                <p className="text-gray-700">Your feedback helps us improve Flowtra.</p>
              </div>
            ) : (
                <>
          <div className="mb-6">
            <span className="inline-flex items-center text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
              ⚡ Fast Response
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Most messages are answered within a few hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{messageLabel}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder={messagePlaceholder}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                {submitText}
              </button>
            </div>
          </form>
        </>)}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
