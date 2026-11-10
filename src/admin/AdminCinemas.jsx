import { useState } from "react";
import { rupiah } from "../lib/config";
import { call, num } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  ConfirmModal,
  Empty,
  ErrorBox,
  Field,
  Flash,
  Icon,
  Modal,
  Page,
  Skeleton,
  TableWrap,
  btnGhost,
  btnPrimary,
  btnSmall,
  cardFlat,
  inputCls,
  td,
  th,
} from "./kit";

function CinemaForm({ cinema, onClose, onSaved }) {
  const editing = !!cinema;
  const [f, setF] = useState({
    name: cinema?.name ?? "",
    city: cinema?.city ?? "",
    address: cinema?.address ?? "",
    price_regular: String(cinema?.price_regular ?? ""),
    price_premium: String(cinema?.price_premium ?? ""),
    lat: cinema?.lat == null ? "" : String(cinema.lat),
    lon: cinema?.lon == null ? "" : String(cinema.lon),
  });
  const [apply, setApply] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const priceChanged =
    editing &&
    (Number(f.price_regular) !== cinema.price_regular ||
      Number(f.price_premium) !== cinema.price_premium);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const p = {
        ...(editing ? { id: cinema.id } : {}),
        name: f.name,
        city: f.city,
        address: f.address,
        price_regular: Number(f.price_regular),
        price_premium: Number(f.price_premium),
        lat: f.lat === "" ? null : Number(f.lat),
        lon: f.lon === "" ? null : Number(f.lon),
      };
      const r = await call("admin_save_cinema", {
        p,
        p_apply_prices: apply && priceChanged,
      });
      onSaved(
        editing
          ? `Bioskop "${r.name}" disimpan${r.showtimes_repriced ? `, harga ${r.showtimes_repriced} jadwal mendatang diperbarui` : ""}.`
          : `Bioskop "${r.name}" dibuat. Jadwal 7 hari ke depan dibuat otomatis.`,
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? `Ubah ${cinema.name}` : "Bioskop baru"}
      onClose={onClose}
      wide
    >
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama bioskop">
          <input
            value={f.name}
            onChange={set("name")}
            required
            minLength={2}
            maxLength={60}
            className={inputCls}
          />
        </Field>
        <Field label="Kota">
          <input
            value={f.city}
            onChange={set("city")}
            required
            minLength={2}
            maxLength={40}
            className={inputCls}
          />
        </Field>
        <Field label="Alamat" className="sm:col-span-2">
          <input
            value={f.address}
            onChange={set("address")}
            required
            minLength={3}
            maxLength={120}
            className={inputCls}
          />
        </Field>
        <Field
          label="Harga dasar reguler (Rp)"
          hint="Akhir pekan otomatis +Rp10.000."
        >
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
        <Field label="Harga dasar premium (Rp)">
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
        <Field
          label="Lintang (latitude)"
          hint='Dipakai untuk "bioskop terdekat". Boleh kosong, contoh -6.9175.'
        >
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={f.lat}
            onChange={set("lat")}
            className={inputCls}
          />
        </Field>
        <Field label="Bujur (longitude)" hint="Boleh kosong, contoh 107.6191.">
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={f.lon}
            onChange={set("lon")}
            className={inputCls}
          />
        </Field>
        {priceChanged && (
          <label className="flex items-start gap-3 rounded-xl border-2 border-line-strong bg-tile-yellow p-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={apply}
              onChange={(e) => setApply(e.target.checked)}
              className="mt-0.5 size-5 shrink-0"
            />
            <span>
              <b>Pasang harga baru ke jadwal mendatang</b>
              <br />
              Hanya jadwal yang belum dipesan sama sekali. Tanpa ini, harga baru
              hanya berlaku untuk jadwal yang dibuat setelahnya.
            </span>
          </label>
        )}
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
            {busy ? "Menyimpan…" : "Simpan bioskop"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminCinemas() {
  const { data, loading, error, reload } = useAsync(
    () => call("admin_cinemas"),
    [],
  );
  const [form, setForm] = useState(null); // null | 'new' | cinema
  const [del, setDel] = useState(null);
  const [flash, setFlash] = useState(null);

  return (
    <Page
      id="bioskop-admin"
      title="Bioskop"
      sub="Lokasi, harga dasar, dan koordinat untuk fitur bioskop terdekat."
      actions={
        <button
          type="button"
          onClick={() => setForm("new")}
          className={btnPrimary}
        >
          <Icon name="plus" className="size-4" />
          Bioskop baru
        </button>
      }
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-48" />}
      {data && data.length === 0 && (
        <Empty title="Belum ada bioskop">
          Tambahkan bioskop pertama dengan tombol di atas.
        </Empty>
      )}
      {data && data.length > 0 && (
        <TableWrap label="Daftar bioskop">
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr>
                <th className={th}>Bioskop</th>
                <th className={th}>Harga dasar</th>
                <th className={th}>Jadwal mendatang</th>
                <th className={th}>Tiket terjual</th>
                <th className={th}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className={td}>
                    <b>{c.name}</b>, {c.city}
                    <div className="text-xs text-muted">{c.address}</div>
                  </td>
                  <td className={`${td} whitespace-nowrap text-xs`}>
                    Reguler {rupiah(c.price_regular)}
                    <br />
                    Premium {rupiah(c.price_premium)}
                  </td>
                  <td className={td}>{num(c.upcoming_showtimes)}</td>
                  <td className={td}>{num(c.tickets)}</td>
                  <td className={td}>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setForm(c)}
                        aria-label={`Ubah ${c.name}`}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setDel(c)}
                        aria-label={`Hapus ${c.name}`}
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
      )}
      <p
        className={`${cardFlat} mt-4 max-w-3xl bg-raised/40 p-3 text-xs text-muted`}
      >
        Bioskop yang sudah punya pesanan tidak bisa dihapus. Menghapus bioskop
        juga menghapus jadwal mendatangnya yang belum dipesan.
      </p>

      {form && (
        <CinemaForm
          cinema={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={(text) => {
            setFlash({ kind: "ok", text });
            reload();
          }}
        />
      )}
      {del && (
        <ConfirmModal
          title={`Hapus ${del.name}?`}
          confirmLabel="Hapus bioskop"
          danger
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await call("admin_delete_cinema", { p_id: del.id });
            setFlash({ kind: "ok", text: `Bioskop "${del.name}" dihapus.` });
            reload();
          }}
        >
          <p>
            Semua jadwal bioskop ini ({del.upcoming_showtimes} di antaranya
            mendatang) ikut terhapus. Aksi ini tidak bisa dibatalkan.
          </p>
        </ConfirmModal>
      )}
    </Page>
  );
}
