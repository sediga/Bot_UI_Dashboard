import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";

const ProtectedLayout = ({ children }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("botflows_token");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Optional: Verify token by calling /api/me
    fetch(`${config.apiBaseUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": config.apiKey,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => setLoading(false))
      .catch(() => {
        localStorage.removeItem("botflows_token");
        navigate("/login");
      });
  }, [navigate]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div>
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Botflows Dashboard</h1>
        <button
          onClick={logout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
};

export default ProtectedLayout;
