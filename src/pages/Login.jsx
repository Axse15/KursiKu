import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { popReturn, useAuth } from "../lib/auth";
import AuthShell from "../components/AuthShell";
import GoogleButton from "../components/GoogleButton";
import PasswordField from "../components/PasswordField";
import { btnPrimary, fieldCls } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { user, signInEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // sudah masuk (baru saja login, atau membuka halaman ini saat sudah login): kembali ke halaman sebelumnya
  useEffect(() => {
    if (user) navigate(popReturn() || "/", { replace: true });
  }, [user, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim()))
      return setError(
        "Isi email dengan format yang benar, contoh: nama@email.com.",
      );
    if (!password) return setError("Isi kata sandi.");
    setError("");
    setBusy(true);
    const res = await signInEmail(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <AuthShell
      title="Masuk"
      sub="Masuk untuk memesan tiket, melihat riwayat, dan memakai poinmu."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
            aria-describedby={error ? "masuk-error" : undefined}
            className={`mt-1 ${fieldCls}`}
          />
        </div>
        <PasswordField
          id="sandi"
          label="Kata sandi"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          describedBy={error ? "masuk-error" : undefined}
        />

        {error && (
          <p
            id="masuk-error"
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
          {busy ? "Memeriksa…" : "Masuk"}
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

      <GoogleButton label="Masuk dengan Google" />

      <p className="mt-4 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
        Belum punya akun?{" "}
        <Link
          to="/daftar"
          className="inline-flex min-h-11 items-center font-bold text-accent-ink underline"
        >
          Daftar gratis
        </Link>
      </p>
    </AuthShell>
  );
}
