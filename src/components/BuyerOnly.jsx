import { Link } from "react-router-dom";
import { useIsAdmin } from "../lib/admin";
import { Empty, Skeleton, btnPrimary } from "./ui";

// Pembungkus halaman beli tiket (pilih kursi dan bayar). Akun admin tidak boleh membeli: yang menolak sebenarnya
// adalah database (supabase-v13.sql). Ini hanya supaya admin mendapat penjelasan, bukan galat.
// Tamu dan akun biasa lewat begitu saja; tamu tetap diminta masuk oleh halaman di dalamnya.
export default function BuyerOnly({ children }) {
  const { admin, checking } = useIsAdmin();
  if (checking) return <Skeleton className="h-72" />;
  if (!admin) return children;
  return (
    <Empty title="Akun admin tidak bisa memesan tiket">
      <p>
        Akun ini dipakai untuk mengelola KursiKu, jadi pembelian tiket
        dinonaktifkan. Untuk mencoba membeli, masuk dengan akun pembeli biasa.
      </p>
      <Link to="/admin" className={`${btnPrimary} mt-4`}>
        Ke panel admin
      </Link>
    </Empty>
  );
}
