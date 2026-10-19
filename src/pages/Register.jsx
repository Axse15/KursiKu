import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { popReturn, useAuth } from "../lib/auth";
import AuthShell from "../components/AuthShell";
import GoogleButton from "../components/GoogleButton";
import PasswordField from "../components/PasswordField";
import { btnPrimary, fieldCls } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Aturan kata sandi: dicek di sini (Supabase sendiri hanya meminta 6 karakter).
export function passwordProblem(password, email = "") {
  if (password.length < 8) return "Kata sandi minimal 8 karakter.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "Kata sandi harus campuran huruf dan angka.";
  if (email && password.toLowerCase() === email.trim().toLowerCase())
    return "Kata sandi tidak boleh sama dengan email.";
  return "";
}

export default function Register() {
  const { user, signUpEmail } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(""); // diisi kalau Supabase meminta konfirmasi lewat email

  useEffect(() => {
    if (user) navigate(popReturn() || "/", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return setError("Isi nama lengkap (minimal 2 huruf).");
    if (!EMAIL_RE.test(email.trim()))
      return setError(
        "Isi email dengan format yang benar, contoh: nama@email.com.",
      );
    const problem = passwordProblem(password, email);
    if (problem) return setError(problem);
    if (password !== again)
      return setError("Konfirmasi kata sandi tidak sama.");
    setError("");
    setBusy(true);
    const res = await signUpEmail({ name: n, email, password });
    setBusy(false);
    if (res.error) return setError(res.error);
    if (res.needsConfirm) setSentTo(email.trim());
    // tanpa konfirmasi: sesi langsung aktif dan efek di atas memindahkan halaman
  }

  if (sentTo) {
    return (
      <AuthShell title="Cek emailmu" sub={null}>
        <div
          role="status"
          className="rounded-xl border-2 border-ok/40 bg-ok-bg p-4 text-sm text-ok"
        >
          Kami mengirim tautan konfirmasi ke{" "}
          <strong className="break-all">{sentTo}</strong>. Klik tautan itu, lalu
          masuk dengan email dan kata sandi tadi.
        </div>
        <p className="mt-4 text-sm text-muted">
          Belum ada? Lihat folder spam. Email dari server gratis kadang telat
          beberapa menit.
        </p>
        <Link to="/masuk" className={`${btnPrimary} mt-6 w-full`}>
          Ke halaman masuk
        </Link>
      </AuthShell>
    );
  }

  const describedBy = error ? "daftar-error" : undefined;
  return (
    <AuthShell
      title="Daftar"
      sub="Buat akun KursiKu. Gratis, cukup nama, email, dan kata sandi."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="nama-lengkap"
            className="block text-sm font-semibold text-ink-2"
          >
            Nama lengkap
          </label>
          <input
            id="nama-lengkap"
            autoComplete="name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={describedBy}
            className={`mt-1 ${fieldCls}`}
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-ink-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={describedBy}
            className={`mt-1 ${fieldCls}`}
          />
        </div>
        <PasswordField
          id="sandi"
          label="Kata sandi"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          describedBy={describedBy}
          hint="Minimal 8 karakter, campuran huruf dan angka."
        />
        <PasswordField
          id="sandi-ulang"
          label="Ulangi kata sandi"
          value={again}
          onChange={setAgain}
          autoComplete="new-password"
          describedBy={describedBy}
        />

        {error && (
          <p
            id="daftar-error"
            role="alert"
            className="rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`${btnPrimary} w-full`}
        >
          {busy ? "Mendaftarkan…" : "Buat akun"}
        </button>
      </form>

      <div
        className="my-5 flex items-center gap-3 text-xs text-muted"
        aria-hidden="true"
      >
        <span className="h-0.5 flex-1 bg-line" />
        atau
        <span className="h-0.5 flex-1 bg-line" />
      </div>

      <GoogleButton label="Daftar dengan Google" />

      <p className="mt-4 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
        Sudah punya akun?{" "}
        <Link
          to="/masuk"
          className="inline-flex min-h-11 items-center font-bold text-accent-ink underline"
        >
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
