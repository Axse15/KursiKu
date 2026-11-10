import { useState } from "react";
import { Link } from "react-router-dom";
import { rupiah } from "../lib/config";
import { call, fmtDateTime, num } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  Flash,
  Modal,
  Page,
  Pager,
  SearchBox,
  Skeleton,
  TableWrap,
  Toolbar,
  btnPrimary,
  btnSmall,
  cardFlat,
  inputCls,
  td,
  th,
} from "./kit";

const LIMIT = 25;
const KIND = {
  earn: "Dapat poin",
  redeem: "Dipakai",
  adjust: "Penyesuaian admin",
};

function UserDetail({ id, onClose, onChanged }) {
  const { data, loading, error, reload } = useAsync(
    () => call("admin_user_detail", { p_id: id }),
    [id],
  );
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const u = data?.user;

  async function adjust(e) {
    e.preventDefault();
    setBusy(true);
    setFlash(null);
    try {
      const r = await call("admin_adjust_points", {
        p_user: id,
        p_delta: Number(delta),
        p_note: note.trim(),
      });
      setFlash({
        kind: "ok",
        text: `Poin disesuaikan. Saldo sekarang ${num(r.balance)}.`,
      });
      setDelta("");
      setNote("");
      reload();
      onChanged();
    } catch (err) {
      setFlash({ kind: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={u ? u.full_name || u.email : "Pengguna"}
      onClose={onClose}
      wide
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />
      {loading && <Skeleton className="h-40" />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {u && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="space-y-1 text-sm">
              <div>
                <dt className="inline text-ink-2">Email: </dt>
                <dd className="inline break-all font-bold">{u.email}</dd>
              </div>
              {u.nickname && (
                <div>
                  <dt className="inline text-ink-2">Panggilan: </dt>
                  <dd className="inline font-bold">{u.nickname}</dd>
                </div>
              )}
              {u.phone && (
                <div>
                  <dt className="inline text-ink-2">Telepon: </dt>
                  <dd className="inline font-bold">{u.phone}</dd>
                </div>
              )}
              {u.city && (
                <div>
                  <dt className="inline text-ink-2">Kota: </dt>
                  <dd className="inline font-bold">{u.city}</dd>
                </div>
              )}
              <div>
                <dt className="inline text-ink-2">Bergabung: </dt>
                <dd className="inline font-bold">
                  {fmtDateTime(u.created_at)}
                </dd>
              </div>
              <div>
                <dt className="inline text-ink-2">Terakhir masuk: </dt>
                <dd className="inline font-bold">
                  {fmtDateTime(u.last_sign_in_at)}
                </dd>
              </div>
            </dl>
            <div className="rounded-2xl border-2 border-edge bg-tile-yellow p-4 shadow-[3px_3px_0_0_var(--color-edge)]">
              <p className="text-xs font-bold text-ink-2">Saldo poin</p>
              <p className="font-display text-3xl font-extrabold">
                {num(u.points)}
              </p>
              <p className="text-xs text-ink-2">
                setara {rupiah(u.points * 10)}
              </p>
              <p className="mt-2">
                {u.is_admin ? (
                  <Badge tone="lilac">Admin</Badge>
                ) : (
                  <Badge>Pembeli</Badge>
                )}
              </p>
            </div>
          </div>

          <form
            onSubmit={adjust}
            className={`${cardFlat} grid gap-3 p-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end`}
            aria-label="Sesuaikan poin"
          >
            <Field label="Poin (+/−)" hint="Contoh 100 atau -50">
              <input
                type="number"
                step={1}
                min={-100000}
                max={100000}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field
              label="Alasan"
              hint="Tercatat di riwayat poin dan log admin."
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                minLength={3}
                maxLength={120}
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              disabled={
                busy || !delta || Number(delta) === 0 || note.trim().length < 3
              }
              className={btnPrimary}
            >
              {busy ? "Menyimpan…" : "Terapkan"}
            </button>
          </form>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-2">
                Pesanan terakhir
              </h3>
              {data.orders.length === 0 ? (
                <p className="text-sm text-muted">Belum pernah memesan.</p>
              ) : (
                <ul className={`${cardFlat} divide-y divide-line text-sm`}>
                  {data.orders.map((o) => (
                    <li key={o.booking_code} className="p-2.5">
                      <Link
                        to={`/admin/pesanan?q=${o.booking_code}`}
                        className="font-bold underline"
                      >
                        {o.booking_code}
                      </Link>{" "}
                      <span className="text-ink-2">
                        {o.movie_title} · {o.n_seats} kursi · {rupiah(o.total)}
                      </span>
                      <div className="text-xs text-muted">
                        {fmtDateTime(o.created_at)}
                        {o.checked_in_at ? " · sudah dipindai" : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-2">
                Riwayat poin
              </h3>
              {data.points.length === 0 ? (
                <p className="text-sm text-muted">Belum ada mutasi poin.</p>
              ) : (
                <ul className={`${cardFlat} divide-y divide-line text-sm`}>
                  {data.points.map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 p-2.5">
                      <span>
                        {KIND[p.kind] || p.kind}
                        {p.booking_code ? ` · ${p.booking_code}` : ""}
                        {p.note && (
                          <span className="block text-xs text-muted">
                            {p.note}
                          </span>
                        )}
                      </span>
                      <b className="shrink-0">
                        {p.points > 0 ? `+${p.points}` : p.points}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className={`${cardFlat} bg-raised/40 p-3 text-xs text-muted`}>
            Email dan nomor telepon disamarkan demi privasi pembeli. Peran admin
            tidak bisa diubah dari panel ini: admin baru hanya ditambahkan lewat
            database (SQL Editor Supabase).
          </p>
        </div>
      )}
    </Modal>
  );
}

export default function Users() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useAsync(
    () =>
      call("admin_users_list", {
        p_search: applied || null,
        p_limit: LIMIT,
        p_offset: offset,
      }),
    [applied, offset],
  );

  function submit(e) {
    e.preventDefault();
    setOffset(0);
    setApplied(q.trim());
  }

  return (
    <Page
      id="pengguna-admin"
      title="Pengguna"
      sub="Akun terdaftar dan saldo poin. Email dan telepon disamarkan. Cari lewat nama, atau ketik email atau nomor telepon yang lengkap."
    >
      <Toolbar>
        <form
          onSubmit={submit}
          className="flex flex-wrap gap-2"
          role="search"
          aria-label="Cari pengguna"
        >
          <SearchBox
            id="cari-user"
            label="Cari nama, atau email dan telepon lengkap"
            value={q}
            onChange={setQ}
            placeholder="Cari nama, atau email/telepon lengkap"
          />
          <button type="submit" className={btnPrimary}>
            Cari
          </button>
        </form>
      </Toolbar>

      {data && data.rows.some((u) => u.email && !u.email.includes("***")) && (
        <p
          role="alert"
          className="mb-4 rounded-xl border-2 border-warn-line bg-warn-bg p-3 text-sm text-warn"
        >
          Data pengguna di bawah ini belum disamarkan. Jalankan file
          supabase-v14.sql di Supabase SQL Editor.
        </p>
      )}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.total === 0 && (
        <Empty title="Pengguna tidak ditemukan">Coba kata kunci lain.</Empty>
      )}
      {data && data.total > 0 && (
        <>
          <TableWrap label="Daftar pengguna">
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr>
                  <th className={th}>Pengguna</th>
                  <th className={th}>Pesanan</th>
                  <th className={th}>Belanja</th>
                  <th className={th}>Poin</th>
                  <th className={th}>Bergabung</th>
                  <th className={th}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u) => (
                  <tr key={u.id}>
                    <td className={td}>
                      <b>{u.full_name || u.email}</b>{" "}
                      {u.is_admin && <Badge tone="lilac">Admin</Badge>}
                      {u.full_name && (
                        <div className="max-w-[16rem] truncate text-xs text-muted">
                          {u.email}
                        </div>
                      )}
                    </td>
                    <td className={td}>
                      {u.orders}
                      <div className="text-xs text-muted">
                        {u.tickets} tiket
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {rupiah(u.spent)}
                    </td>
                    <td className={td}>{num(u.points)}</td>
                    <td className={`${td} whitespace-nowrap text-xs`}>
                      {fmtDateTime(u.created_at)}
                    </td>
                    <td className={td}>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setOpen(u.id)}
                        aria-label={`Detail ${u.full_name || u.email}`}
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
        <UserDetail
          id={open}
          onClose={() => setOpen(null)}
          onChanged={reload}
        />
      )}
    </Page>
  );
}
