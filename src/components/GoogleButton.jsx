import { useAuth } from "../lib/auth";
import { btnGhost } from "./ui";

// Tombol "lanjut dengan Google", dipakai di halaman masuk dan daftar.
export default function GoogleButton({ label = "Lanjut dengan Google" }) {
  const { signIn, authError, clearError } = useAuth();
  return (
    <div>
      <button type="button" onClick={signIn} className={`${btnGhost} w-full`}>
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full border-2 border-edge bg-tile-blue text-xs font-extrabold"
        >
          G
        </span>
        {label}
      </button>
      {authError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Login gagal: {authError}{" "}
          <button type="button" onClick={clearError} className="underline">
            Tutup
          </button>
        </p>
      )}
    </div>
  );
}
