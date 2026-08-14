import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import RequireAuth from "./components/RequireAuth";
import Home from "./pages/Home";
import GameHome from "./pages/GameHome";
import GameLocal from "./pages/GameLocal";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import GameOnlineLobby from "./pages/GameOnlineLobby";
import GameOnlineRoom from "./pages/GameOnlineRoom";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games/:gameId" element={<GameHome />} />
          <Route path="/games/:gameId/local" element={<GameLocal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/games/:gameId/online" element={<GameOnlineLobby />} />
            <Route path="/games/:gameId/online/:code" element={<GameOnlineRoom />} />
            <Route path="/games/:gameId/leaderboard" element={<Leaderboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
