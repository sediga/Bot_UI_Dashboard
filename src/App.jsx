import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RecorderDashboard from "./components/RecorderDashboard";
import LandingPage from "./components/LandingPage";
import ProtectedLayout from "./components/ProtectedLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <RecorderDashboard />
            </ProtectedLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
