import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { rupiah } from "../lib/config";
import { call, fmtDateTime, fromLocalInput, toLocalInput } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Badge,
  ConfirmModal,
  Empty,
  ErrorBox,
  Field,
  FilterSelect,
  Flash,
  Icon,
  Modal,
  Page,
  Pager,
  Skeleton,
  TableWrap,
  Toolbar,
  btnGhost,
  btnPrimary,
  btnSmall,
  cardFlat,
  inputCls,
  td,
  th,
} from "./kit";

const SEATS = 80;
const PAGE_SIZE = 25; // jadwal per halaman

function ShowtimeForm({ item, movies, cinemas, defaults, onClose, onSaved }) {
  const editing = !!item;
  const [f, setF] = useState({
    movie_id: String(item?.movie_id ?? defaults.movie ?? ""),
    cinema_id: String(item?.cinema_id ?? defaults.cinema ?? ""),
    starts_at: item ? toLocalInput(item.starts_at) : "",
    studio: item?.studio ?? "Studio 1",
    price_regular: String(item?.price_regular ?? ""),
    price_premium: String(item?.price_premium ?? ""),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  // pilih bioskop baru: harga terisi otomatis dari harga dasar bioskop (masih bisa diubah)
  function pickCinema(e) {
    const c = cinemas.find((x) => String(x.id) === e.target.value);
    setF((x) => ({
      ...x,
      cinema_id: e.target.value,
      ...(c && !editing
        ? {
            price_regular: String(c.price_regular),
            price_premium: String(c.price_premium),
          }
        : {}),
    }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("admin_save_showtime", {
        p: {
          ...(editing ? { id: item.id } : {}),
          movie_id: Number(f.movie_id),
          cinema_id: Number(f.cinema_id),
          starts_at: fromLocalInput(f.starts_at),
          studio: f.studio,
          price_regular: Number(f.price_regular),
          price_premium: Number(f.price_premium),
        },
      });
      onSaved(editing ? "Jadwal disimpan." : "Jadwal dibuat.");
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? "Ubah jadwal" : "Jadwal baru"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Film" className="sm:col-span-2">
          <select
            value={f.movie_id}
            onChange={set("movie_id")}
            required
            className={inputCls}
          >
            <option value="" disabled>
              Pilih film
            </option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bioskop" className="sm:col-span-2">
          <select
            value={f.cinema_id}
            onChange={pickCinema}
            required
            className={inputCls}
          >
            <option value="" disabled>
              Pilih bioskop
            </option>
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Waktu tayang (WIB)">
          <input
            type="datetime-local"
            value={f.starts_at}
            onChange={set("starts_at")}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Studio">
          <input
            value={f.studio}
            onChange={set("studio")}
            required
            maxLength={20}
            className={inputCls}
          />
        </Field>
        <Field label="Harga reguler (Rp)" hint="Baris A sampai E.">
          <input
            type="number"
            min={5000}
            max={500000}
            step={1000}
            value={f.price_regular}
            onChange={set("price_regular")}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Harga premium (Rp)" hint="Baris F sampai H.">
          <input
            type="number"
            min={5000}
            max={500000}
            step={1000}
            value={f.price_premium}
            onChange={set("price_premium")}
            required
            className={inputCls}
          />
        </Field>
        {error && (
          <p
            role="alert"
            className="rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger sm:col-span-2"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Batal
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Menyimpan…" : "Simpan jadwal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Showtimes() {
  const [params, setParams] = useSearchParams();
  const [movie, setMovie] = useState(params.get("film") || "");
  const [cinema, setCinema] = useState("");
  const [days, setDays] = useState("7");
  const [form, setForm] = useState(null); // null | 'new' | jadwal
  const [del, setDel] = useState(null);
  const [flash, setFlash] = useState(null);
  const [offset, setOffset] = useState(0); // awal halaman yang sedang dilihat

  const movies = useAsync(() => call("admin_movies"), []);
  const cinemas = useAsync(() => call("admin_cinemas"), []);
  const { data, loading, error, reload } = useAsync(
    () =>
      call("admin_showtimes", {
        p_movie: movie ? Number(movie) : null,
        p_cinema: cinema ? Number(cinema) : null,
        p_days: Number(days),
      }),
    [movie, cinema, days],
  );
  const visibleMovies = (movies.data || []).filter((m) => !m.hidden);

  // Ganti saringan: kembali ke halaman pertama. Setelah muat ulang (mis. hapus jadwal) offset dijaga supaya tidak melewati data.
  const rows = data || [];
  const lastOffset = Math.max(0, Math.floor((rows.length - 1) / PAGE_SIZE) * PAGE_SIZE);
  const start = Math.min(offset, lastOffset);
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  function pickMovie(v) {
    setOffset(0);
    setMovie(v);
    setParams(v ? { film: v } : {}, { replace: true });
  }

  return (
    <Page
      id="jadwal-admin"
      title="Jadwal tayang"
      actions={
        <button
          type="button"
          onClick={() => setForm("new")}
          disabled={!movies.data || !cinemas.data}
          className={btnPrimary}
        >
          <Icon name="plus" className="size-4" />
          Jadwal baru
        </button>
      }
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            id="j-film"
            label="Film"
            value={movie}
            onChange={pickMovie}
          >
            <option value="">Semua</option>
            {visibleMovies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="j-bioskop"
            label="Bioskop"
            value={cinema}
            onChange={(v) => {
              setOffset(0);
              setCinema(v);
            }}
          >
            <option value="">Semua</option>
            {(cinemas.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="j-hari"
            label="Rentang"
            value={days}
            onChange={(v) => {
              setOffset(0);
              setDays(v);
            }}
          >
            <option value="3">3 hari</option>
            <option value="7">7 hari</option>
            <option value="14">14 hari</option>
            <option value="30">30 hari</option>
          </FilterSelect>
        </div>
      </Toolbar>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.length === 0 && (
        <Empty title="Tidak ada jadwal">
          Tidak ada jadwal pada saringan ini. Tambahkan dengan tombol di atas
          atau pakai &ldquo;Isi jadwal 7 hari&rdquo; di halaman Film.
        </Empty>
      )}
      {data && data.length > 0 && (
        <>
          {data.length >= 400 && (
            <p className="mb-2 text-sm text-warn">
              Hanya 400 jadwal pertama yang ditampilkan. Persempit saringan.
            </p>
          )}
          <TableWrap label="Daftar jadwal">
            <table className="w-full min-w-[46rem]">
              <thead>
                <tr>
                  <th className={th}>Waktu</th>
                  <th className={th}>Film</th>
                  <th className={th}>Bioskop</th>
                  <th className={th}>Harga</th>
                  <th className={th}>Terjual</th>
                  <th className={th}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.id}>
                    <td className={`${td} whitespace-nowrap`}>
                      {fmtDateTime(s.starts_at)}
                    </td>
                    <td className={td}>{s.movie_title}</td>
                    <td className={td}>
                      {s.cinema_name}
                      <div className="text-xs text-muted">{s.studio}</div>
                    </td>
                    <td className={`${td} whitespace-nowrap text-xs`}>
                      {rupiah(s.price_regular)}
                      <br />
                      {rupiah(s.price_premium)}
                    </td>
                    <td className={td}>
                      {s.sold > 0 ? (
                        <Badge tone={s.sold >= SEATS ? "bad" : "warn"}>
                          {s.sold}/{SEATS}
                        </Badge>
                      ) : (
                        <span className="text-muted">0/{SEATS}</span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className={btnSmall}
                          disabled={s.sold > 0}
                          title={
                            s.sold > 0
                              ? "Sudah dipesan, tidak bisa diubah"
                              : undefined
                          }
                          onClick={() => setForm(s)}
                          aria-label={`Ubah jadwal ${s.movie_title} ${fmtDateTime(s.starts_at)}`}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          className={btnSmall}
                          disabled={s.sold > 0}
                          title={
                            s.sold > 0
                              ? "Sudah dipesan, tidak bisa dihapus"
                              : undefined
                          }
                          onClick={() => setDel(s)}
                          aria-label={`Hapus jadwal ${s.movie_title} ${fmtDateTime(s.starts_at)}`}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pager
            total={rows.length}
            limit={PAGE_SIZE}
            offset={start}
            onChange={(o) => {
              setOffset(o);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      {form && movies.data && cinemas.data && (
        <ShowtimeForm
          item={form === "new" ? null : form}
          movies={visibleMovies}
          cinemas={cinemas.data}
          defaults={{ movie, cinema }}
          onClose={() => setForm(null)}
          onSaved={(text) => {
            setFlash({ kind: "ok", text });
            reload();
          }}
        />
      )}
      {del && (
        <ConfirmModal
          title="Hapus jadwal ini?"
          confirmLabel="Hapus jadwal"
          danger
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await call("admin_delete_showtime", { p_id: del.id });
            setFlash({ kind: "ok", text: "Jadwal dihapus." });
            reload();
          }}
        >
          <p>
            {del.movie_title} di {del.cinema_name}, {fmtDateTime(del.starts_at)}
            . Aksi ini tidak bisa dibatalkan.
          </p>
        </ConfirmModal>
      )}
    </Page>
  );
}