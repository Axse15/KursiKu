import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { btnGhost, btnPrimary } from "./ui";

// Nama kejadian yang dikirim ke halaman E-Tiket supaya keterangan "sudah dipindai" ikut berubah tanpa muat ulang.
export const SCAN_EVENT = "kursiku:ticket-scan";

const fmtScan = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

// Pop-up real-time untuk pembeli: muncul begitu petugas memindai tiketnya di pintu masuk.
//
// Cara kerjanya: database menandai kolom checked_in_at pada pesanan (supabase-v12.sql), Supabase Realtime meneruskan perubahan itu
// ke browser. Kebijakan RLS "baca pesanan sendiri" memastikan pembeli hanya menerima perubahan pesanannya sendiri.
// Satu pesanan bisa punya beberapa baris (satu per kursi), jadi kejadian dikelompokkan per kode booking.
// Ini fitur tambahan: kalau Realtime gagal (jaringan, WebSocket diblokir), situs tetap jalan dan keterangan di E-Tiket
// tetap muncul saat halamannya dibuka lagi.
export default function ScanNotifier() {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [queue, setQueue] = useState([]);
  const seen = useRef(new Set());
  const { pathname } = useLocation();

  useEffect(() => {
    if (!userId) return undefined;
    seen.current = new Set();
    let channel = null;
    let active = true;

    async function titleOf(code) {
      try {
        const r = await supabase
          .from("bookings")
          .select("showtimes(movies(title))")
          .eq("booking_code", code)
          .limit(1);
        return r.error ? "" : r.data?.[0]?.showtimes?.movies?.title || "";
      } catch {
        return "";
      }
    }

    function onChange(payload) {
      const rec = payload?.new;
      if (!rec?.booking_code) return;
      // pembatalan validasi oleh admin: hanya perbarui halaman tiket, tanpa pop-up
      if (!rec.checked_in_at) {
        window.dispatchEvent(
          new CustomEvent(SCAN_EVENT, {
            detail: { code: rec.booking_code, at: null },
          }),
        );
        return;
      }
      const key = `${rec.booking_code}|${rec.checked_in_at}`;
      if (seen.current.has(key)) return; // baris kursi lain dari pesanan yang sama
      seen.current.add(key);
      window.dispatchEvent(
        new CustomEvent(SCAN_EVENT, {
          detail: { code: rec.booking_code, at: rec.checked_in_at },
        }),
      );
      const item = { code: rec.booking_code, at: rec.checked_in_at, title: "" };
      setQueue((q) => [...q, item]);
      titleOf(rec.booking_code).then((title) => {
        if (!active || !title) return;
        setQueue((q) =>
          q.map((x) =>
            x.code === item.code && x.at === item.at ? { ...x, title } : x,
          ),
        );
      });
    }

    try {
      // nama unik supaya tidak bentrok dengan channel lama yang masih proses ditutup
      channel = supabase
        .channel(`scan-${userId}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `user_id=eq.${userId}`,
          },
          onChange,
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime tidak aktif:", e);
    }
    return () => {
      active = false;
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        /* abaikan */
      }
    };
  }, [userId]);

  const current = queue[0];
  const close = () => setQueue((q) => q.slice(1));

  if (!current) return null;
  return (
    <ScanDialog
      key={`${current.code}|${current.at}`}
      item={current}
      more={queue.length - 1}
      onClose={close}
      onThatTicket={pathname === `/tiket/${current.code}`}
    />
  );
}

// Pop-up di tengah layar memakai <dialog> bawaan browser: fokus terkunci di dalamnya, Escape menutup, klik di luar kotak menutup.
// Satu pop-up per pesanan yang dipindai (key berubah = dialog baru), jadi antrean tampil satu per satu.
function ScanDialog({ item, more, onClose, onThatTicket }) {
  const ref = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    // "close" dikirim terlambat; di mode dev (StrictMode) efek berjalan dua kali, jadi hanya "close" yang datang
    // saat dialog benar-benar tertutup yang dianggap penutupan sungguhan (sama seperti panel admin).
    const handle = () => {
      if (!d.open) onCloseRef.current();
    };
    d.addEventListener("close", handle);
    if (!d.open) d.showModal();
    return () => {
      d.removeEventListener("close", handle);
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="nb-card m-auto w-[calc(100%-2rem)] max-w-md bg-tile-green p-0 text-ink backdrop:bg-black/60 print:hidden"
    >
      <div className="p-5">
        <p
          id={titleId}
          className="font-display text-2xl font-extrabold leading-tight tracking-tight"
        >
          Tiketmu sudah dipindai
        </p>
        <p className="mt-2 text-sm text-ink-2">
          {item.title ? <strong>{item.title}</strong> : "Pesananmu"} dipindai di
          pintu masuk pukul {fmtScan(item.at)} WIB. Selamat menonton!
        </p>
        <p className="tnum mt-1 text-xs text-muted">Kode booking {item.code}</p>
        {more > 0 && (
          <p className="mt-2 text-xs font-bold">
            Ada {more} tiket lain yang juga sudah dipindai.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!onThatTicket && (
            <Link
              to={`/tiket/${item.code}`}
              onClick={onClose}
              className={`${btnPrimary} min-h-10`}
            >
              Lihat tiket
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${btnGhost} min-h-10`}
          >
            Tutup
          </button>
        </div>
      </div>
    </dialog>
  );
}
