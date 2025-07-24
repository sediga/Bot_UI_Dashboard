import { Link } from "react-router-dom";
import FeatureCarousel from "./demo/FeatureCarousel";

const Landing = () => {
  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-white via-indigo-100 to-indigo-200 flex flex-col justify-center items-center px-4 py-4 text-center">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold text-indigo-800 mb-5 flex items-center gap-2 justify-center">
          Welcome to 
          <span className="inline-flex items-center">
            <img src="/assets/logo.png" alt="B" className="h-8 block" />
            <span className="text-indigo-800 font-bold text-4xl -ml-0">otflows</span>
          </span>
        </h1>
        <p className="text-xl text-gray-700 mb-3">
          Automate smarter, not harder. Botflows lets you <strong>record, replay, and manage complex browser workflows</strong> without writing code.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left mb-4">
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold text-indigo-700 mb-2">🎯 Smart Recording</h3>
            <p className="text-sm text-gray-600">Capture browser actions with intelligent selectors and DOM context awareness.</p>
          </div>
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold text-indigo-700 mb-2">🔁 Reliable Replay</h3>
            <p className="text-sm text-gray-600">Play back flows even across single-page apps, dynamic content, and nested iframes.</p>
          </div>
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-semibold text-indigo-700 mb-2">📦 Flow Management</h3>
            <p className="text-sm text-gray-600">Organize, edit, and reuse your automations with loop support and data injection.</p>
          </div>
        </div>

        {/* Placeholder for future animation/video */}
        <div className="w-full max-w-6xl h-[55vh] mx-auto">
          <FeatureCarousel />
        </div>

        <div className="space-x-4">
          <Link
            to="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-6 py-3 bg-white border border-gray-300 text-gray-800 rounded hover:bg-gray-100 transition"
          >
            Sign Up
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-8">
          Don’t have an account? <Link to="/signup" className="text-indigo-600 underline">Create one now</Link>.
        </p>
      </div>
    </div>
  );
};

export default Landing;
