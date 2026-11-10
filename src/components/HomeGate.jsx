import { Navigate } from "react-router-dom";
import { useIsAdmin } from "../lib/admin";
import { Skeleton } from "./ui";
import Home from "../pages/Home";

// Pintu masuk halaman beranda. Akun admin tidak memakai situs pembeli, jadi begitu admin masuk (atau membuka beranda)
// langsung diarahkan ke dashboard admin. Pembeli dan tamu melihat beranda seperti biasa.
export default function HomeGate() {
  const { admin, checking } = useIsAdmin();
  if (checking) return <Skeleton className="h-96" />;
  if (admin) return <Navigate to="/admin" replace />;
  return <Home />;
}
