import { useState } from "react";
import { fieldCls } from "./ui";

// Kolom kata sandi dengan tombol lihat/sembunyikan (membantu di HP, tempat salah ketik sering terjadi).
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  describedBy,
  hint = null,
  invalid = false,
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${fieldCls} pr-20`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center rounded-r-xl px-3 text-xs font-bold text-ink-2 hover:text-ink"
        >
          {shown ? "Sembunyi" : "Lihat"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
