import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kalau env belum diisi (mis. lupa di Vercel), app menampilkan pesan jelas, bukan layar putih.
export const isConfigured = Boolean(url && key);

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key",
  {
    // PKCE: alur login yang lebih aman untuk aplikasi web (token tidak ditaruh di alamat halaman)
    auth: { flowType: "pkce" },
  },
);

// Ubah respons Supabase { data, error } menjadi data, atau lempar error.
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
