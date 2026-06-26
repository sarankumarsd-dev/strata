import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { Maps } from "@/pages/Maps";
import { Board } from "@/pages/Board";
import { Forum } from "@/pages/Forum";
import { MyStrata } from "@/pages/MyStrata";
import { Login } from "@/pages/Login";
import { Toaster } from "@/lib/toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { UsernameDialog } from "@/components/UsernameDialog";

function UsernameGate() {
  const { user, loading, hasUsername, refreshUsername } = useAuth();
  if (loading || !user || hasUsername !== false) return null;
  return <UsernameDialog onDone={refreshUsername} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/board" element={<Board />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/my-strata" element={<MyStrata />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Landing />} />
        </Routes>
        <UsernameGate />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
