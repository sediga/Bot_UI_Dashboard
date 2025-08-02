import { useState } from "react";
import config from "../config"; // adjust path as needed


export default function FeedbackBubble() {
  const [showForm, setShowForm] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(null);
  const [submitted, setSubmitted] = useState(false);

    const submitFeedback = async () => {
        const token = localStorage.getItem("botflows_token"); // or from your auth context
        const payload = { rating, feedback };

        if (!token && email) {
            payload.email = email; // only send email if anonymous
        }

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
            throw new Error(await response.text());
        }

        return await response.json();
    };

    const handleSubmit = async () => {
    try {
        await submitFeedback()
        setSubmitted(true);
        setTimeout(() => {
        setShowForm(false);
        setFeedback("");
        setEmail("");
        setRating(null);
        setSubmitted(false);
        }, 2000);
    } catch (err) {
        console.error("Network error:", err);
    }
    };


  const emojiOptions = [
    { icon: "😠", label: "Frustrated" },
    { icon: "😕", label: "Confused" },
    { icon: "😐", label: "Okay" },
    { icon: "😊", label: "Happy" },
    { icon: "🤩", label: "Delighted" },
  ];

  return (
    <>
      {/* Floating feedback button */}
      <button
        className={`fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg z-50 flex items-center transition-all duration-300 ${
          hovered ? "px-5 py-2.5 w-auto" : "w-12 h-12 justify-center"
        }`}
        onClick={() => setShowForm(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="text-xl">💬</span>
        {hovered && <span className="ml-2 text-sm font-medium">Feedback</span>}
      </button>

      {/* Feedback modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white w-full max-w-2xl mx-6 md:mx-12 p-8 rounded-xl shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-black text-2xl font-bold"
              onClick={() => setShowForm(false)}
            >
              &times;
            </button>

            {/* Thank you screen */}
            {submitted ? (
              <div className="text-center py-16">
                <p className="text-2xl font-semibold text-green-600 mb-2">🎉 Thank you!</p>
                <p className="text-gray-700">Your feedback helps us improve Flowtra.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                  We'd love your feedback!
                </h2>

                {/* Emoji rating */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">How was your experience?</p>
                  <div className="flex gap-3">
                    {emojiOptions.map((opt, index) => (
                      <button
                        key={index}
                        onClick={() => setRating(index)}
                        className={`text-3xl hover:scale-110 transition ${
                          rating === index ? "ring-2 ring-indigo-500 rounded-full" : ""
                        }`}
                        title={opt.label}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows="6"
                  className="w-full p-4 border border-gray-300 rounded-lg mb-4 text-base resize-none focus:outline-none focus:ring focus:ring-indigo-300"
                  placeholder="What can we improve? What’s working well?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />

                {/* Email input */}
                <input
                  type="email"
                  placeholder="Your email (optional)"
                  className="w-full p-2 border border-gray-300 rounded-md mb-6 text-sm focus:outline-none focus:ring focus:ring-indigo-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    className="px-4 py-2 text-gray-600 text-sm hover:underline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 text-sm rounded-md"
                    onClick={handleSubmit}
                    disabled={!feedback && rating === null}
                  >
                    Submit Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
