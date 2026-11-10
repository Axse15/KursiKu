import { useEffect, useRef, useState } from "react";
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

  // Esc menutup pop-up. Fokus tidak dipindahkan paksa supaya orang yang sedang mengetik tidak terganggu;
  // pembaca layar diberi tahu lewat role="status".
  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current]);

  if (!current) return null;
  const onThatTicket = pathname === `/tiket/${current.code}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] print:hidden">
      <div
        role="status"
        aria-live="polite"
        className="nb-card pointer-events-auto w-full max-w-md bg-tile-green p-4 text-ink"
      >
        <p className="font-display text-xl font-extrabold leading-tight tracking-tight">
          Tiketmu sudah dipindai
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {current.title ? <strong>{current.title}</strong> : "Pesananmu"}{" "}
          dipindai di pintu masuk pukul {fmtScan(current.at)} WIB. Selamat
          menonton!
        </p>
        <p className="tnum mt-1 text-xs text-muted">
          Kode booking {current.code}
        </p>
        {queue.length > 1 && (
          <p className="mt-1 text-xs font-bold">
            Ada {queue.length - 1} tiket lain yang juga sudah dipindai.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {!onThatTicket && (
            <Link
              to={`/tiket/${current.code}`}
              onClick={close}
              className={`${btnPrimary} min-h-10`}
            >
              Lihat tiket
            </Link>
          )}
          <button
            type="button"
            onClick={close}
            className={`${btnGhost} min-h-10`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
