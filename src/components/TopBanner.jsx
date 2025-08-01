// components/TopBanner.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function TopBanner() {
const navigate = useNavigate();
  return (
    <section className="w-full bg-gradient-to-b to-gray-50 py-0">
      <div className="w-full px-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start">
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate("/")}>
              <img
                src="/assets/logo.png"
                alt="Flowtra Logo"
                className="h-12 w-auto object-contain"
              />
              <span className="text-5xl font-bold text-gray-800 tracking-tight leading-tight">
                Flowtra<span className="text-indigo-500">.app</span>
              </span>
                <span className="bg-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded">BETA</span>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-tight mt-2">
              Automate browser flows — no code required.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
}
