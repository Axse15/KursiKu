import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { rupiah } from "../lib/config";
import { call, fmtDateTime } from "../lib/admin";
import {
  Badge,
  Card,
  Icon,
  Page,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSmall,
  inputCls,
} from "./kit";
import { OrderDetail } from "./Orders";

// Pemindai kamera (dan pustaka pembaca QR-nya) baru diunduh saat tombol kamera ditekan.
const Scanner = lazy(() => import("./Scanner"));

// Ambil kode pesanan dari teks apa pun: kode saja, hasil pemindai QR, atau alamat tiket.
const CODE = /KSK-[A-Z0-9]{6}/i;
const extract = (s) => (s.match(CODE)?.[0] || s.trim()).toUpperCase();

const VERDICT = {
  ok: {
    tone: "bg-tile-green",
    title: "Tiket valid, silakan masuk",
    badge: "ok",
  },
  already: {
    tone: "bg-tile-yellow",
    title: "Tiket ini sudah dipakai",
    badge: "warn",
  },
  too_early: { tone: "bg-tile-yellow", title: "Terlalu awal", badge: "warn" },
  expired: {
    tone: "bg-tile-pink",
    title: "Pertunjukan sudah lewat",
    badge: "bad",
  },
  not_found: {
    tone: "bg-tile-pink",
    title: "Kode tidak ditemukan",
    badge: "bad",
  },
};

// Validasi tiket di pintu masuk. Tiga cara: pemindai barcode/QR bawaan (kolom isian selalu terfokus, jadi
// "ketikan" pemindai langsung bekerja), kamera HP, atau mengetik kodenya.
export default function CheckIn() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const [detail, setDetail] = useState(null);
  const [camera, setCamera] = useState(false);
  const input = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => input.current?.focus(), []);

  function remember(code, status, order) {
    setLog((l) =>
      [{ code, status, order, at: new Date().toISOString() }, ...l].slice(
        0,
        12,
      ),
    );
  }

  async function run(code, force = false) {
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await call("admin_check_in", { p_code: code, p_force: force });
      setRes({ ...r, code });
      remember(code, r.status, r.order);
    } catch (e) {
      setRes(null);
      setError(e.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setText("");
      if (!camera) input.current?.focus();
    }
  }

  // kode dari kamera: dilewati kalau pemeriksaan sebelumnya belum selesai
  function fromCamera(code) {
    if (!busyRef.current) run(code);
  }

  function submit(e) {
    e.preventDefault();
    const code = extract(text);
    if (code.length < 4) return;
    run(code);
  }

  async function undo(code) {
    setBusy(true);
    try {
      await call("admin_undo_check_in", { p_code: code });
      setRes(null);
      setLog((l) =>
        l.map((x) =>
          x.code === code && x.status === "ok" ? { ...x, status: "undone" } : x,
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  const v = res && VERDICT[res.status];
  const o = res?.order;

  return (
    <Page
      id="validasi"
      title="Validasi tiket"
      sub="Pindai atau ketik kode tiket di pintu masuk, lalu tekan Enter. Pemindai barcode/QR yang bekerja seperti keyboard bisa langsung dipakai, atau pakai kamera HP."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <form
            onSubmit={submit}
            className="rounded-2xl border-2 border-edge bg-tile-blue p-4 shadow-[3px_3px_0_0_var(--color-edge)] sm:p-5"
          >
            <label
              htmlFor="kode-tiket"
              className="mb-1.5 block text-sm font-bold"
            >
              Kode tiket
            </label>
            <input
              id="kode-tiket"
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="KSK-"
              className={`${inputCls} font-mono text-xl uppercase tracking-wider`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy || text.trim().length < 4}
                className={btnPrimary}
              >
                {busy ? "Memeriksa…" : "Periksa tiket"}
              </button>
              <button
                type="button"
                onClick={() => setCamera((c) => !c)}
                aria-pressed={camera}
                className={`${btnGhost} gap-2`}
              >
                <Icon name="camera" className="size-4" />
                {camera ? "Tutup kamera" : "Pindai dengan kamera"}
              </button>
            </div>
          </form>

          {camera && (
            <Suspense
              fallback={
                <p className="mt-4 text-sm text-ink-2">Menyiapkan pemindai…</p>
              }
            >
              <Scanner
                onCode={fromCamera}
                onClose={() => {
                  setCamera(false);
                  input.current?.focus();
                }}
              />
            </Suspense>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}

          <div aria-live="polite" className="mt-4">
            {v && (
              <div
                className={`rounded-2xl border-2 border-edge ${v.tone} p-5 shadow-[3px_3px_0_0_var(--color-edge)] sm:p-6`}
              >
                <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {v.title}
                </h2>
                {res.status === "not_found" ? (
                  <p className="mt-1 text-sm">
                    Tidak ada pesanan dengan kode <b>{res.code}</b>. Periksa
                    kembali kodenya.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm font-bold">
                      {o.booking_code} · {o.customer_name}
                    </p>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="inline text-ink-2">Film: </dt>
                        <dd className="inline font-bold">{o.movie_title}</dd>
                      </div>
                      <div>
                        <dt className="inline text-ink-2">Bioskop: </dt>
                        <dd className="inline font-bold">
                          {o.cinema_name}, {o.studio}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-ink-2">Tayang: </dt>
                        <dd className="inline font-bold">
                          {fmtDateTime(o.starts_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-ink-2">Kursi: </dt>
                        <dd className="inline font-bold">
                          {o.seats.join(", ")}
                        </dd>
                      </div>
                    </dl>
                    {res.status === "already" && (
                      <p className="mt-2 text-sm">
                        Dipindai pada {fmtDateTime(o.checked_in_at)}.
                      </p>
                    )}
                    {res.status === "too_early" && (
                      <p className="mt-2 text-sm">
                        Pertunjukan baru mulai lebih dari 24 jam lagi.
                      </p>
                    )}
                    {res.status === "expired" && (
                      <p className="mt-2 text-sm">
                        Pertunjukan sudah mulai lebih dari 4 jam yang lalu.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(res.status === "too_early" ||
                        res.status === "expired") && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(res.code, true)}
                          className={btnDanger}
                        >
                          Tetap izinkan masuk
                        </button>
                      )}
                      {res.status === "ok" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => undo(res.code)}
                          className={btnSmall}
                        >
                          Batalkan (salah pindai)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetail(res.code)}
                        className={btnSmall}
                      >
                        Lihat detail pesanan
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Aturan validasi">
            <ul className="space-y-2 text-sm text-ink-2">
              <li>
                Tiket valid kalau pertunjukan mulai dalam 24 jam ke depan sampai
                4 jam setelah mulai.
              </li>
              <li>Satu kode hanya bisa dipindai satu kali.</li>
              <li>
                Salah pindai? Pakai &ldquo;Batalkan&rdquo; di hasil pemindaian
                atau di detail pesanan.
              </li>
            </ul>
          </Card>
          <Card title="Riwayat pemindaian sesi ini">
            {log.length === 0 ? (
              <p className="text-sm text-muted">
                Belum ada tiket yang diperiksa.
              </p>
            ) : (
              <ul className="-mx-1 divide-y divide-line">
                {log.map((l, i) => (
                  <li
                    key={`${l.code}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <b>{l.code}</b>
                      {l.order && (
                        <span className="block truncate text-xs text-muted">
                          {l.order.customer_name} · {l.order.movie_title} ·{" "}
                          {rupiah(l.order.total)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={
                          l.status === "ok"
                            ? "ok"
                            : l.status === "undone"
                              ? "plain"
                              : VERDICT[l.status]?.badge || "plain"
                        }
                      >
                        {l.status === "ok"
                          ? "Masuk"
                          : l.status === "undone"
                            ? "Dibatalkan"
                            : VERDICT[l.status]?.title}
                      </Badge>
                      <span className="text-xs text-muted">
                        {fmtDateTime(l.at).split(" ").slice(-1)[0]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {detail && (
        <OrderDetail
          code={detail}
          onClose={() => setDetail(null)}
          onChanged={() => {}}
        />
      )}
    </Page>
  );
}
