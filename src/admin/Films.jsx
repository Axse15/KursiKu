import { useState } from "react";
import { Link } from "react-router-dom";
import { call, fmtLongDate, num } from "../lib/admin";
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
  SearchBox,
  Skeleton,
  TableWrap,
  Toolbar,
  btnGhost,
  btnPrimary,
  btnSmall,
  cardFlat,
  inputCls,
  td,
  textareaCls,
  th,
} from "./kit";

const blank = {
  title: "",
  genre: "",
  duration_min: "",
  synopsis: "",
  release_date: "",
  trailer_key: "",
  poster_url: "",
  backdrop_url: "",
  age_rated: "",
  director: "",
};

// Film buatan sendiri (bukan dari TMDB). Film dari TMDB hanya bisa disembunyikan.
function FilmForm({ id, onClose, onSaved }) {
  const existing = useAsync(
    () => (id ? call("admin_movie", { p_id: id }) : Promise.resolve(null)),
    [id],
  );
  if (id && existing.loading)
    return (
      <Modal title="Ubah film" onClose={onClose}>
        <Skeleton className="h-40" />
      </Modal>
    );
  if (id && existing.error)
    return (
      <Modal title="Ubah film" onClose={onClose}>
        <ErrorBox message={existing.error} />
      </Modal>
    );
  return (
    <FilmFormBody
      id={id}
      initial={existing.data}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function FilmFormBody({ id, initial, onClose, onSaved }) {
  const [f, setF] = useState(
    initial
      ? Object.fromEntries(
          Object.keys(blank).map((k) => [
            k,
            initial[k] == null ? "" : String(initial[k]),
          ]),
        )
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const p = {
        ...(id ? { id } : {}),
        title: f.title,
        genre: f.genre,
        duration_min: Number(f.duration_min),
        synopsis: f.synopsis,
        release_date: f.release_date || null,
        trailer_key: f.trailer_key || null,
        poster_url: f.poster_url || null,
        backdrop_url: f.backdrop_url || null,
        age_rated: f.age_rated || null,
        director: f.director || null,
      };
      const r = await call("admin_save_movie", { p });
      onSaved(
        id
          ? `Film "${r.title}" disimpan.`
          : `Film "${r.title}" dibuat. Jadwal 7 hari ke depan dibuat otomatis kalau tanggal rilisnya dalam 75 hari terakhir atau kosong.`,
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={id ? "Ubah film" : "Film baru"} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul" className="sm:col-span-2">
          <input
            value={f.title}
            onChange={set("title")}
            required
            maxLength={120}
            className={inputCls}
          />
        </Field>
        <Field label="Genre" hint="Contoh: Drama atau Aksi.">
          <input
            value={f.genre}
            onChange={set("genre")}
            required
            minLength={2}
            maxLength={40}
            className={inputCls}
          />
        </Field>
        <Field label="Durasi (menit)">
          <input
            type="number"
            min={1}
            max={400}
            value={f.duration_min}
            onChange={set("duration_min")}
            required
            className={inputCls}
          />
        </Field>
        <Field
          label="Sinopsis"
          className="sm:col-span-2"
          hint="Minimal 10 huruf."
        >
          <textarea
            value={f.synopsis}
            onChange={set("synopsis")}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            className={textareaCls}
          />
        </Field>
        <Field
          label="Tanggal rilis"
          hint="Penting: jadwal otomatis hanya dibuat untuk film yang rilis dalam 75 hari terakhir (atau tanpa tanggal rilis). Film lama perlu jadwal manual."
        >
          <input
            type="date"
            value={f.release_date}
            onChange={set("release_date")}
            className={inputCls}
          />
        </Field>
        <Field label="Rating usia" hint="Contoh: 13+ atau SU. Boleh kosong.">
          <input
            value={f.age_rated}
            onChange={set("age_rated")}
            maxLength={10}
            className={inputCls}
          />
        </Field>
        <Field label="Sutradara" hint="Boleh kosong.">
          <input
            value={f.director}
            onChange={set("director")}
            maxLength={80}
            className={inputCls}
          />
        </Field>
        <Field
          label="Kode trailer YouTube"
          hint="11 karakter di alamat YouTube setelah v=. Boleh kosong."
        >
          <input
            value={f.trailer_key}
            onChange={set("trailer_key")}
            maxLength={11}
            pattern="[A-Za-z0-9_\-]{11}"
            className={inputCls}
          />
        </Field>
        <Field
          label="Alamat poster"
          hint="Harus diawali https://. Boleh kosong (dipakai poster gradasi)."
        >
          <input
            type="url"
            value={f.poster_url}
            onChange={set("poster_url")}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
        <Field
          label="Alamat gambar latar"
          hint="Harus diawali https://. Boleh kosong."
        >
          <input
            type="url"
            value={f.backdrop_url}
            onChange={set("backdrop_url")}
            placeholder="https://"
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
            {busy ? "Menyimpan…" : "Simpan film"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Films() {
  const { data, loading, error, reload } = useAsync(
    () => call("admin_movies"),
    [],
  );
  const [q, setQ] = useState("");
  const [show, setShow] = useState("");
  const [form, setForm] = useState(null); // null | 'new' | id
  const [hide, setHide] = useState(null);
  const [del, setDel] = useState(null);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = (data || []).filter(
    (m) =>
      (!q || m.title.toLowerCase().includes(q.toLowerCase())) &&
      (show === "" ||
        (show === "hidden"
          ? m.hidden
          : show === "manual"
            ? m.manual
            : show === "visible"
              ? !m.hidden
              : true)),
  );

  async function setHidden(m, hidden) {
    const r = await call("admin_set_movie_hidden", {
      p_id: m.id,
      p_hidden: hidden,
    });
    setFlash({
      kind: "ok",
      text: hidden
        ? `"${m.title}" disembunyikan. ${r?.showtimes_removed ?? 0} jadwal mendatang tanpa pesanan dihapus.`
        : `"${m.title}" ditampilkan lagi. ${r?.showtimes_created ?? 0} jadwal baru dibuat.`,
    });
    reload();
  }

  async function generate() {
    setBusy(true);
    try {
      const n = await call("admin_generate_showtimes");
      setFlash({
        kind: "ok",
        text: n
          ? `${n} jadwal baru dibuat untuk 7 hari ke depan.`
          : "Jadwal 7 hari ke depan sudah lengkap, tidak ada yang perlu ditambah.",
      });
    } catch (e) {
      setFlash({ kind: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      id="film-admin"
      title="Film"
      sub="Film dari TMDB diperbarui otomatis dan hanya bisa disembunyikan. Film buatan sendiri bisa kamu ubah dan hapus."
      actions={
        <>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className={btnGhost}
          >
            {busy ? "Membuat…" : "Isi jadwal 7 hari"}
          </button>
          <button
            type="button"
            onClick={() => setForm("new")}
            className={btnPrimary}
          >
            <Icon name="plus" className="size-4" />
            Film baru
          </button>
        </>
      }
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            id="cari-film"
            label="Cari judul film"
            value={q}
            onChange={setQ}
            placeholder="Cari judul film"
          />
          <FilterSelect
            id="tampil-film"
            label="Tampilkan"
            value={show}
            onChange={setShow}
          >
            <option value="">Semua film</option>
            <option value="visible">Yang tampil di web</option>
            <option value="hidden">Yang disembunyikan</option>
            <option value="manual">Film buatan sendiri</option>
          </FilterSelect>
        </div>
      </Toolbar>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && rows.length === 0 && (
        <Empty title="Tidak ada film">Ubah kata kunci atau saringan.</Empty>
      )}
      {rows.length > 0 && (
        <TableWrap label="Daftar film">
          <table className="w-full min-w-[46rem]">
            <thead>
              <tr>
                <th className={th}>Film</th>
                <th className={th}>Rilis</th>
                <th className={th}>Sumber</th>
                <th className={th}>Jadwal mendatang</th>
                <th className={th}>Tiket</th>
                <th className={th}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      {m.poster_url ? (
                        <img
                          src={m.poster_url}
                          alt=""
                          width={32}
                          height={48}
                          loading="lazy"
                          className="h-12 w-8 shrink-0 rounded-md border-2 border-line-strong object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid h-12 w-8 shrink-0 place-items-center rounded-md border-2 border-line-strong bg-raised text-xs font-bold"
                        >
                          {m.title[0]}
                        </span>
                      )}
                      <div>
                        <b>{m.title}</b>
                        <div className="text-xs text-muted">
                          {m.genre} · {m.duration_min} menit
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {m.release_date ? fmtLongDate(m.release_date) : "-"}
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={m.manual ? "lilac" : "info"}>
                        {m.manual ? "Buatan sendiri" : "TMDB"}
                      </Badge>
                      {m.hidden && <Badge tone="bad">Disembunyikan</Badge>}
                    </div>
                  </td>
                  <td className={td}>{num(m.upcoming_showtimes)}</td>
                  <td className={td}>{num(m.tickets)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        to={`/admin/jadwal?film=${m.id}`}
                        className={btnSmall}
                        aria-label={`Jadwal ${m.title}`}
                      >
                        Jadwal
                      </Link>
                      {m.manual && (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => setForm(m.id)}
                          aria-label={`Ubah ${m.title}`}
                        >
                          Ubah
                        </button>
                      )}
                      {m.hidden ? (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() =>
                            setHidden(m, false).catch((e) =>
                              setFlash({ kind: "err", text: e.message }),
                            )
                          }
                          aria-label={`Tampilkan ${m.title}`}
                        >
                          Tampilkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => setHide(m)}
                          aria-label={`Sembunyikan ${m.title}`}
                        >
                          Sembunyikan
                        </button>
                      )}
                      {m.manual && (
                        <button
                          type="button"
                          className={btnSmall}
                          onClick={() => setDel(m)}
                          aria-label={`Hapus ${m.title}`}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <p
        className={`${cardFlat} mt-4 max-w-3xl bg-raised/40 p-3 text-xs text-muted`}
      >
        Film dari TMDB diperbarui otomatis dan tidak bisa diubah di sini, hanya
        disembunyikan. Film yang disembunyikan hilang dari web (kecuali dari
        riwayat orang yang sudah memesannya) dan tidak lagi mendapat jadwal
        otomatis.
      </p>

      {form && (
        <FilmForm
          id={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={(text) => {
            setFlash({ kind: "ok", text });
            reload();
          }}
        />
      )}
      {hide && (
        <ConfirmModal
          title={`Sembunyikan "${hide.title}"?`}
          confirmLabel="Sembunyikan film"
          danger
          onClose={() => setHide(null)}
          onConfirm={() => setHidden(hide, true)}
        >
          <p>
            Film hilang dari web dan {hide.upcoming_showtimes} jadwal
            mendatangnya yang belum dipesan dihapus. Jadwal yang sudah dipesan
            tetap ada supaya tiket pembeli tidak rusak. Kamu bisa menampilkannya
            lagi kapan saja.
          </p>
        </ConfirmModal>
      )}
      {del && (
        <ConfirmModal
          title={`Hapus "${del.title}"?`}
          confirmLabel="Hapus film"
          danger
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await call("admin_delete_movie", { p_id: del.id });
            setFlash({ kind: "ok", text: `"${del.title}" dihapus.` });
            reload();
          }}
        >
          <p>
            Film dan jadwalnya dihapus selamanya. Film yang sudah punya pesanan
            tidak bisa dihapus (sembunyikan saja).
          </p>
        </ConfirmModal>
      )}
    </Page>
  );
}
