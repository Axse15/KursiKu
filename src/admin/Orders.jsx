import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { rupiah } from "../lib/config";
import { call, fmtDateTime, num } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Badge,
  ConfirmModal,
  DateField,
  Empty,
  ErrorBox,
  FilterSelect,
  Flash,
  Icon,
  Modal,
  Page,
  Pager,
  SearchBox,
  Skeleton,
  TableWrap,
  Toolbar,
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSmall,
  cardFlat,
  td,
  th,
} from "./kit";

const LIMIT = 25;

export function StatusBadge({ order }) {
  if (order.checked_in_at) return <Badge tone="ok">Sudah dipindai</Badge>;
  if (new Date(order.starts_at).getTime() < Date.now() - 4 * 3600e3)
    return <Badge>Lewat</Badge>;
  return <Badge tone="warn">Menunggu</Badge>;
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// Detail satu pesanan: rincian harga, pembeli, poin, status pindai, dan tombol batalkan.
export function OrderDetail({ code, onClose, onChanged }) {
  const { data, loading, error, reload } = useAsync(
    () => call("admin_order_detail", { p_code: code }),
    [code],
  );
  const [flash, setFlash] = useState(null);
  const [cancel, setCancel] = useState(false);
  const o = data?.order;

  async function undo() {
    try {
      await call("admin_undo_check_in", { p_code: code });
      setFlash({ kind: "ok", text: "Validasi tiket dibatalkan." });
      reload();
      onChanged();
    } catch (e) {
      setFlash({ kind: "err", text: e.message });
    }
  }

  return (
    <Modal title={`Pesanan ${code}`} onClose={onClose} wide>
      <Flash flash={flash} onClose={() => setFlash(null)} />
      {loading && <Skeleton className="h-40" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {o && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${cardFlat} p-4`}>
              <h3 className="mb-1.5 text-sm font-bold text-muted">Pesanan</h3>
              <p className="text-lg font-extrabold leading-tight">
                {o.movie_title}
              </p>
              <p className="mt-1 text-sm">
                {o.cinema_name} · {o.studio}
              </p>
              <p className="text-sm">Tayang {fmtDateTime(o.starts_at)}</p>
              <p className="mt-1 text-sm">
                Kursi: <b>{o.seats.join(", ")}</b>
              </p>
              <p className="text-xs text-muted">
                Dipesan {fmtDateTime(o.created_at)}
              </p>
            </div>
            <div className={`${cardFlat} p-4`}>
              <h3 className="mb-1.5 text-sm font-bold text-muted">Pembeli</h3>
              <p className="text-lg font-extrabold leading-tight">
                {o.customer_name}
              </p>
              {data.buyer ? (
                <>
                  <p className="mt-1 break-all text-sm">{data.buyer.email}</p>
                  {data.buyer.phone && (
                    <p className="text-sm">{data.buyer.phone}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Akun sudah dihapus atau pemesan tanpa akun.
                </p>
              )}
              <p className="mt-2 text-sm">
                Status: <StatusBadge order={o} />
              </p>
              {o.checked_in_at && (
                <p className="mt-1 text-xs text-muted">
                  Dipindai {fmtDateTime(o.checked_in_at)}
                  {data.checked_in_by ? ` oleh ${data.checked_in_by}` : ""}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">Rincian harga</h3>
            <dl className={`${cardFlat} space-y-2 p-4 text-sm`}>
              <Line k="Harga normal" v={rupiah(o.base)} />
              {o.deal_percent > 0 && (
                <Line
                  k={`Diskon film harian ${o.deal_percent}%`}
                  v={`−${rupiah(o.base - o.subtotal)}`}
                />
              )}
              {o.promo_code && (
                <Line
                  k={`Promo ${o.promo_code}`}
                  v={`−${rupiah(o.discount)}`}
                />
              )}
              {o.points_used > 0 && (
                <Line
                  k={`Tukar ${num(o.points_used)} poin`}
                  v={`−${rupiah(o.points_discount)}`}
                />
              )}
              <div className="flex justify-between gap-3 border-t-2 border-line-strong pt-2 text-base">
                <dt className="font-bold">Total dibayar</dt>
                <dd className="font-extrabold">{rupiah(o.total)}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-xs text-muted">
              Dihitung ulang dari data pesanan dengan rumus yang sama dengan
              halaman bayar.
            </p>
          </div>

          {data.points.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-muted">
                Mutasi poin pesanan ini
              </h3>
              <ul className={`${cardFlat} divide-y divide-line text-sm`}>
                {data.points.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3 p-3">
                    <span>
                      {p.note ||
                        (p.kind === "earn" ? "Poin didapat" : "Poin dipakai")}
                    </span>
                    <b>{p.points > 0 ? `+${p.points}` : p.points}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t-2 border-line pt-4">
            {o.checked_in_at ? (
              <button type="button" onClick={undo} className={btnGhost}>
                Batalkan validasi tiket
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCancel(true)}
                className={btnDanger}
              >
                Batalkan pesanan
              </button>
            )}
          </div>
        </div>
      )}

      {cancel && (
        <ConfirmModal
          title={`Batalkan pesanan ${code}?`}
          confirmLabel="Ya, batalkan pesanan"
          danger
          reasonLabel="Alasan pembatalan"
          onClose={() => setCancel(false)}
          onConfirm={async (reason) => {
            const r = await call("admin_cancel_order", {
              p_code: code,
              p_reason: reason,
            });
            onChanged(
              `Pesanan ${code} dibatalkan. Kursi dibebaskan${r.points_returned ? `, ${r.points_returned} poin dikembalikan` : ""}${r.points_withdrawn ? `, ${r.points_withdrawn} poin yang didapat ditarik` : ""}.`,
            );
            onClose();
          }}
        >
          <p>
            Kursi {o?.seats.join(", ")} akan dibebaskan dan bisa dipesan orang
            lain. Poin yang dipakai dikembalikan, poin yang didapat dari pesanan
            ini ditarik.
          </p>
          <p className="mt-2 font-bold">
            Ini simulasi: tidak ada uang sungguhan yang dikembalikan. Aksi ini
            tidak bisa dibatalkan.
          </p>
        </ConfirmModal>
      )}
    </Modal>
  );
}

function Line({ k, v }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-2">{k}</dt>
      <dd className="font-bold">{v}</dd>
    </div>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [applied, setApplied] = useState({
    q: params.get("q") || "",
    from: "",
    to: "",
    cinema: "",
    movie: "",
    status: "",
  });
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(null);
  const [flash, setFlash] = useState(null);
  const [exporting, setExporting] = useState(false);

  const cinemas = useAsync(() => call("admin_cinemas"), []);
  const movies = useAsync(() => call("admin_movies"), []);

  const args = (off, lim) => ({
    p_search: applied.q || null,
    p_from: applied.from || null,
    p_to: applied.to || null,
    p_cinema: applied.cinema ? Number(applied.cinema) : null,
    p_movie: applied.movie ? Number(applied.movie) : null,
    p_status: applied.status || null,
    p_limit: lim,
    p_offset: off,
  });
  const { data, loading, error, reload } = useAsync(
    () => call("admin_orders", args(offset, LIMIT)),
    [applied, offset],
  );

  // ?q=KODE dari tautan lain (mis. Ringkasan) membuka detail satu kali saja, bukan setiap data dimuat ulang
  const fromLink = useRef(/^KSK-/i.test(params.get("q") || ""));
  useEffect(() => {
    if (!fromLink.current || !data) return;
    fromLink.current = false;
    if (data.total === 1) setOpen(data.rows[0].booking_code);
  }, [data]);

  function set(key, value) {
    setOffset(0);
    setApplied((a) => ({ ...a, [key]: value }));
  }
  function submit(e) {
    e.preventDefault();
    setParams(q.trim() ? { q: q.trim() } : {}, { replace: true });
    set("q", q.trim());
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const all = [];
      for (let off = 0; off < 2000; off += 100) {
        const page = await call("admin_orders", args(off, 100));
        all.push(...page.rows);
        if (all.length >= page.total || !page.rows.length) break;
      }
      const head = [
        "Kode",
        "Dipesan",
        "Pembeli",
        "Film",
        "Bioskop",
        "Tayang",
        "Kursi",
        "Harga normal",
        "Diskon film",
        "Promo",
        "Potongan promo",
        "Poin dipakai",
        "Potongan poin",
        "Total",
        "Status",
      ];
      const lines = all.map((o) =>
        [
          o.booking_code,
          o.created_at,
          o.customer_name,
          o.movie_title,
          o.cinema_name,
          o.starts_at,
          o.seats.join(" "),
          o.base,
          o.base - o.subtotal,
          o.promo_code || "",
          o.discount,
          o.points_used,
          o.points_discount,
          o.total,
          o.checked_in_at ? "Sudah dipindai" : "Belum",
        ]
          .map(csvCell)
          .join(","),
      );
      const blob = new Blob(
        ["﻿" + [head.map(csvCell).join(","), ...lines].join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pesanan-kursiku-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setFlash({
        kind: "ok",
        text: `${all.length} pesanan diunduh sebagai CSV.`,
      });
    } catch (e) {
      setFlash({ kind: "err", text: e.message });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Page
      id="pesanan"
      title="Pesanan"
      sub="Semua pesanan pembeli. Buka Detail untuk melihat rincian harga atau membatalkan pesanan."
      actions={
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || !data?.total}
          className={btnGhost}
        >
          <Icon name="download" className="size-4" />
          {exporting ? "Menyiapkan…" : "Unduh CSV"}
        </button>
      }
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />

      <Toolbar>
        <form
          onSubmit={submit}
          className="flex flex-wrap gap-2"
          role="search"
          aria-label="Cari pesanan"
        >
          <SearchBox
            id="cari-pesanan"
            label="Cari kode, nama, film, atau email lengkap"
            value={q}
            onChange={setQ}
            placeholder="Cari kode, nama, film, atau email lengkap"
          />
          <button type="submit" className={btnPrimary}>
            Cari
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            id="f-status"
            label="Status"
            value={applied.status}
            onChange={(v) => set("status", v)}
          >
            <option value="">Semua</option>
            <option value="belum">Belum dipindai</option>
            <option value="masuk">Sudah dipindai</option>
          </FilterSelect>
          <FilterSelect
            id="f-bioskop"
            label="Bioskop"
            value={applied.cinema}
            onChange={(v) => set("cinema", v)}
          >
            <option value="">Semua</option>
            {(cinemas.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="f-film"
            label="Film"
            value={applied.movie}
            onChange={(v) => set("movie", v)}
          >
            <option value="">Semua</option>
            {(movies.data || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </FilterSelect>
          <DateField
            id="f-dari"
            label="Dari"
            value={applied.from}
            max={applied.to || undefined}
            onChange={(v) => set("from", v)}
          />
          <DateField
            id="f-sampai"
            label="Sampai"
            value={applied.to}
            min={applied.from || undefined}
            onChange={(v) => set("to", v)}
          />
        </div>
      </Toolbar>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.total === 0 && (
        <Empty title="Tidak ada pesanan">
          Coba ubah kata kunci atau saringan di atas.
        </Empty>
      )}
      {data && data.total > 0 && (
        <>
          <p className="mb-2 text-sm text-ink-2">
            {num(data.total)} pesanan, total <b>{rupiah(data.sum_total)}</b>
          </p>
          <TableWrap label="Daftar pesanan">
            <table className="w-full min-w-[46rem]">
              <thead>
                <tr>
                  <th className={th}>Kode</th>
                  <th className={th}>Pembeli</th>
                  <th className={th}>Film dan jadwal</th>
                  <th className={th}>Kursi</th>
                  <th className={th}>Total</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((o) => (
                  <tr key={o.booking_code}>
                    <td className={`${td} whitespace-nowrap font-bold`}>
                      {o.booking_code}
                    </td>
                    <td className={td}>
                      {o.customer_name}
                      {o.email && (
                        <div className="max-w-[12rem] truncate text-xs text-muted">
                          {o.email}
                        </div>
                      )}
                    </td>
                    <td className={td}>
                      {o.movie_title}
                      <div className="text-xs text-muted">
                        {o.cinema_name} · {fmtDateTime(o.starts_at)}
                      </div>
                    </td>
                    <td className={td}>{o.n_seats}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {rupiah(o.total)}
                    </td>
                    <td className={td}>
                      <StatusBadge order={o} />
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setOpen(o.booking_code)}
                        aria-label={`Lihat pesanan ${o.booking_code}`}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pager
            total={data.total}
            limit={LIMIT}
            offset={offset}
            onChange={setOffset}
          />
        </>
      )}

      {open && (
        <OrderDetail
          code={open}
          onClose={() => setOpen(null)}
          onChanged={(text) => {
            if (text) setFlash({ kind: "ok", text });
            reload();
          }}
        />
      )}
    </Page>
  );
}
