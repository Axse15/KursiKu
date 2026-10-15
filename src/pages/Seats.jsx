import { Fragment, useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import {
  AISLE_AFTER,
  COLS,
  MAX_SEATS,
  ROWS,
  fmtDate,
  fmtTime,
  rupiah,
} from "../lib/config";
import {
  findBestSeats,
  isPremium,
  seatCode,
  seatPrice,
  sortSeats,
} from "../lib/seats";
import { Empty, ErrorBox, Skeleton, btnPrimary } from "../components/ui";

function Seat({ code, status, onToggle }) {
  const premium = isPremium(code);
  const label = `Kursi ${code}, ${premium ? "Premium" : "Reguler"}, ${
    status === "taken"
      ? "sudah terjual"
      : status === "selected"
        ? "dipilih"
        : "tersedia"
  }`;

  const styles = {
    free: premium
      ? "border-amber-500/70 text-zinc-200 hover:bg-amber-400/20"
      : "border-zinc-500 text-zinc-300 hover:bg-zinc-800",
    selected: "border-amber-400 bg-amber-400 font-bold text-zinc-950",
    taken: "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500",
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={status === "selected"}
      disabled={status === "taken"}
      onClick={() => onToggle(code)}
      className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] sm:h-8 sm:w-8 sm:text-xs ${styles[status]}`}
    >
      {status === "taken" ? "✕" : status === "selected" ? "✓" : code.slice(1)}
    </button>
  );
}

function Legend() {
  const item = "flex items-center gap-2 text-xs text-zinc-400";
  const box =
    "flex h-5 w-5 items-center justify-center rounded border text-[10px]";
  return (
    <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
      <li className={item}>
        <span className={`${box} border-zinc-500`}>1</span>Reguler
      </li>
      <li className={item}>
        <span className={`${box} border-amber-500/70`}>1</span>Premium
      </li>
      <li className={item}>
        <span
          className={`${box} border-amber-400 bg-amber-400 font-bold text-zinc-950`}
        >
          ✓
        </span>
        Dipilih
      </li>
      <li className={item}>
        <span className={`${box} border-zinc-800 bg-zinc-800 text-zinc-500`}>
          ✕
        </span>
        Terjual
      </li>
    </ul>
  );
}

export default function Seats() {
  const { showtimeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useAsync(async () => {
    const showtime = unwrap(
      await supabase
        .from("showtimes")
        .select("*, movies(title)")
        .eq("id", showtimeId)
        .maybeSingle(),
    );
    if (!showtime) return null;
    const rows = unwrap(
      await supabase
        .from("bookings")
        .select("seat_code")
        .eq("showtime_id", showtimeId),
    );
    return { showtime, taken: new Set(rows.map((r) => r.seat_code)) };
  }, [showtimeId]);

  const [selected, setSelected] = useState([]);
  const [qty, setQty] = useState(2);
  const [notice, setNotice] = useState(
    params.get("conflict")
      ? "Kursi yang kamu pilih baru saja dipesan orang lain. Silakan pilih kursi lain."
      : "",
  );

  // buang pilihan yang ternyata sudah terjual setelah data dimuat ulang
  // buang pilihan yang ternyata sudah terjual (mis. diambil orang lain) dan beri tahu pengguna
  useEffect(() => {
    if (!data) return;
    const lost = selected.filter((c) => data.taken.has(c));
    if (lost.length > 0) {
      setSelected((sel) => sel.filter((c) => !data.taken.has(c)));
      setNotice(`Kursi ${lost.join(", ")} baru saja dipesan orang lain.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Realtime: setiap ada pesanan baru di jadwal ini, muat ulang denah kursi.
  // Database tetap penentu akhir lewat constraint UNIQUE, jadi ini murni soal tampilan.
  useEffect(() => {
    let channel = null;
    try {
      channel = supabase
        .channel(
          `kursi-${showtimeId}-${Math.random().toString(36).slice(2, 8)}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookings",
            filter: `showtime_id=eq.${showtimeId}`,
          },
          () => reload(),
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime tidak aktif:", e);
    }
    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch {
        /* abaikan */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showtimeId]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-96" />;
  if (!data) {
    return (
      <Empty title="Jadwal tidak ditemukan">
        <Link to="/" className="underline">
          Kembali ke beranda
        </Link>
      </Empty>
    );
  }

  const { showtime, taken } = data;
  const total = selected.reduce((sum, c) => sum + seatPrice(c, showtime), 0);

  function toggle(code) {
    if (selected.includes(code)) {
      setSelected(selected.filter((c) => c !== code));
      setNotice("");
      return;
    }
    if (selected.length >= MAX_SEATS) {
      setNotice(`Maksimal ${MAX_SEATS} kursi per pesanan.`);
      return;
    }
    setSelected([...selected, code]);
    setNotice("");
  }

  function pickBest() {
    const result = findBestSeats(qty, taken);
    if (!result) {
      setNotice(
        `Tidak ada ${qty} kursi berdampingan yang tersedia. Coba jumlah yang lebih kecil.`,
      );
      return;
    }
    setSelected(result);
    setNotice("");
  }

  const cols = Array.from({ length: COLS }, (_, i) => i + 1);

  return (
    <section>
      <h1 className="font-display text-2xl font-bold">
        {showtime.movies.title}
      </h1>
      <p className="mt-1 text-sm capitalize text-zinc-400">
        {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
        {showtime.studio}
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 p-3">
        <label className="text-sm text-zinc-300">
          Jumlah tiket
          <select
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="ml-2 min-h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-2"
          >
            {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={pickBest}
          className="min-h-10 rounded-lg border border-amber-400 px-4 text-sm font-medium text-amber-400 hover:bg-amber-400/10"
        >
          Pilihkan kursi terbaik
        </button>
      </div>

      <div className="mt-8" role="group" aria-label="Denah kursi">
        <div className="mx-auto mb-1 h-1.5 w-3/4 rounded-full bg-amber-400/70 shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
        <p className="mb-6 text-center text-xs tracking-[0.3em] text-zinc-500">
          LAYAR
        </p>

        <div className="overflow-x-auto">
          <div className="mx-auto w-fit space-y-1.5">
            {ROWS.map((row) => (
              <div key={row} className="flex items-center gap-0.5 sm:gap-1">
                <span className="w-4 text-xs text-zinc-500" aria-hidden="true">
                  {row}
                </span>
                {cols.map((col) => {
                  const code = seatCode(row, col);
                  const status = taken.has(code)
                    ? "taken"
                    : selected.includes(code)
                      ? "selected"
                      : "free";
                  return (
                    <Fragment key={code}>
                      <Seat code={code} status={status} onToggle={toggle} />
                      {AISLE_AFTER.includes(col) && (
                        <span className="w-3 sm:w-5" aria-hidden="true" />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <Legend />
        <p className="mt-2 text-center text-xs text-zinc-500">
          Reguler {rupiah(showtime.price_regular)} · Premium (baris F-H){" "}
          {rupiah(showtime.price_premium)}
        </p>
      </div>

      {notice && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-amber-950/40 p-3 text-sm text-amber-200"
        >
          {notice}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-zinc-800 bg-zinc-950/95 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <p className="text-zinc-400">
              {selected.length === 0
                ? "Belum ada kursi dipilih"
                : `Kursi: ${sortSeats(selected).join(", ")}`}
            </p>
            <p className="font-display text-lg font-bold">{rupiah(total)}</p>
          </div>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() =>
              navigate(
                `/checkout/${showtimeId}?seats=${sortSeats(selected).join(",")}`,
              )
            }
            className={btnPrimary}
          >
            Lanjut
          </button>
        </div>
      </div>
    </section>
  );
}
