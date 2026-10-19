import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { avatarPath, useProfile } from "../lib/profile";
import { Avatar } from "./AuthButton";
import { btnGhost } from "./ui";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW = 8 * 1024 * 1024; // foto asli dari kamera HP bisa 3-6 MB; dikecilkan sebelum diunggah
const SIZE = 320; // sisi foto akhir (piksel)

// Muat berkas gambar jadi sesuatu yang bisa digambar ke canvas. createImageBitmap ikut memutar foto sesuai EXIF (foto HP).
async function decode(file) {
  try {
    const bmp = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      source: bmp,
      w: bmp.width,
      h: bmp.height,
      done: () => bmp.close?.(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () =>
          reject(new Error("Berkas ini bukan gambar yang bisa dibaca."));
        el.src = url;
      });
      return {
        source: img,
        w: img.naturalWidth,
        h: img.naturalHeight,
        done: () => {},
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Potong jadi persegi dari tengah, kecilkan ke 320x320, simpan sebagai JPEG (biasanya 20-60 KB).
export async function toSquareJpeg(file) {
  const img = await decode(file);
  try {
    const side = Math.min(img.w, img.h);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // PNG transparan jadi berlatar putih (JPEG tidak punya transparansi)
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(
      img.source,
      (img.w - side) / 2,
      (img.h - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("Foto tidak bisa diproses di browser ini.");
    return blob;
  } finally {
    img.done();
  }
}

function friendly(err) {
  const m = err?.message || String(err);
  if (/bucket not found/i.test(m))
    return "Tempat penyimpanan foto belum dibuat. Jalankan supabase-v10.sql di Supabase.";
  if (/row-level security|not authorized|unauthorized|403/i.test(m))
    return "Foto ditolak server. Pastikan supabase-v10.sql sudah dijalankan dan kamu masih masuk.";
  if (/too large|exceed|maximum allowed size/i.test(m))
    return "Ukuran foto terlalu besar.";
  return "Gagal mengganti foto: " + m;
}

// Foto profil besar + tombol ganti / hapus. Foto disimpan di Supabase Storage (bucket "avatars"), alamatnya di tabel profiles.
export default function AvatarUploader({ size = 96 }) {
  const { user } = useAuth();
  const { profile, save } = useProfile();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya memilih berkas yang sama dua kali tetap memicu perubahan
    if (!file) return;
    if (!TYPES.includes(file.type))
      return setMsg({
        ok: false,
        text: "Pakai foto berformat JPG, PNG, atau WebP.",
      });
    if (file.size > MAX_RAW)
      return setMsg({ ok: false, text: "Ukuran foto maksimal 8 MB." });
    setBusy(true);
    setMsg(null);
    try {
      const blob = await toSquareJpeg(file);
      const path = avatarPath(user.id);
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
          cacheControl: "3600",
        });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // ?v= supaya browser tidak menampilkan foto lama dari cache
      await save({ avatar_url: `${data.publicUrl}?v=${Date.now()}` });
      setMsg({ ok: true, text: "Foto profil diganti." });
    } catch (err) {
      setMsg({ ok: false, text: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.storage
        .from("avatars")
        .remove([avatarPath(user.id)]);
      if (error) throw error;
      await save({ avatar_url: null });
      setMsg({ ok: true, text: "Foto profil dihapus." });
    } catch (err) {
      setMsg({ ok: false, text: friendly(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-4">
        <Avatar user={user} size={size} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className={btnGhost}
          >
            {busy ? "Memproses…" : "Ganti foto"}
          </button>
          {profile?.avatar_url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className={btnGhost}
            >
              Hapus
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={TYPES.join(",")}
        hidden
        onChange={onPick}
        aria-label="Pilih foto profil"
      />
      <p className="text-xs text-muted">
        JPG, PNG, atau WebP. Foto dipotong persegi dan dikecilkan otomatis.
      </p>
      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
