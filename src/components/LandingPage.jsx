import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold text-indigo-700 mb-4">Welcome to Botflows</h1>
      <p className="text-lg text-gray-700 mb-6">
        Automate smarter, not harder. Record, replay, and manage automation flows with ease.
      </p>
      <div className="space-x-4">
        <Link
          to="/login"
          className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          Log In
        </Link>
        <Link
          to="/signup"
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default Landing;
