import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";
import { useAuth } from "./auth";

// Saldo poin akun yang sedang login: { balance, earned, spent }. Null kalau belum login.
// Error (mis. supabase-v10.sql belum dijalankan) dikembalikan apa adanya, pemanggil yang memutuskan.
export function usePoints() {
  const { user } = useAuth();
  return useAsync(async () => {
    if (!user) return null;
    const rows = unwrap(await supabase.rpc("my_points"));
    return rows?.[0] ?? { balance: 0, earned: 0, spent: 0 };
  }, [user?.id]);
}
