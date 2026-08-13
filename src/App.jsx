import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import RequireAuth from "./components/RequireAuth";
import Home from "./pages/Home";
import Local from "./pages/Local";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import OnlineLobby from "./pages/OnlineLobby";
import OnlineRoom from "./pages/OnlineRoom";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/local" element={<Local />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/online" element={<OnlineLobby />} />
            <Route path="/online/:code" element={<OnlineRoom />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
