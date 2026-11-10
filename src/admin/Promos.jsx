import { useState } from "react";
import { rupiah } from "../lib/config";
import { call, fmtLongDate, num } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Badge,
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
  textareaCls,
  th,
} from "./kit";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const blank = {
  code: "",
  title: "",
  description: "",
  percent_off: "10",
  max_discount: "",
  min_seats: "1",
  weekdays: [],
  valid_until: "",
  daily_chance: "40",
  active: true,
};

function PromoForm({ promo, onClose, onSaved }) {
  const creating = !promo;
  const [f, setF] = useState(
    promo
      ? {
          ...blank,
          ...promo,
          percent_off: String(promo.percent_off),
          max_discount: promo.max_discount ?? "",
          min_seats: String(promo.min_seats),
          weekdays: promo.weekdays || [],
          valid_until: promo.valid_until || "",
          daily_chance: String(promo.daily_chance),
        }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleDay = (d) =>
    setF((x) => ({
      ...x,
      weekdays: x.weekdays.includes(d)
        ? x.weekdays.filter((y) => y !== d)
        : [...x.weekdays, d],
    }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const p = {
        code: f.code.trim().toUpperCase(),
        title: f.title,
        description: f.description,
        percent_off: Number(f.percent_off),
        max_discount: f.max_discount === "" ? null : Number(f.max_discount),
        min_seats: Number(f.min_seats),
        weekdays: f.weekdays,
        valid_until: f.valid_until || null,
        daily_chance: Number(f.daily_chance),
        active: f.active,
      };
      await call("admin_save_promo", { p, p_create: creating });
      onSaved(
        creating ? `Promo ${p.code} dibuat.` : `Promo ${p.code} disimpan.`,
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={creating ? "Promo baru" : `Ubah promo ${promo.code}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {!creating && promo.uses > 0 && (
          <p
            role="note"
            className="rounded-xl border-2 border-warn-line bg-warn-bg p-3 text-sm text-warn sm:col-span-2"
          >
            Promo ini sudah dipakai {promo.uses}×. Mengubah persen atau maksimal
            potongan juga mengubah total pesanan lama yang memakainya (total
            dihitung ulang, tidak disimpan). Untuk aturan baru, lebih aman
            membuat kode baru.
          </p>
        )}
        <Field
          label="Kode promo"
          hint="Huruf besar dan angka, 4 sampai 20 karakter. Tidak bisa diubah setelah dibuat."
        >
          <input
            value={f.code}
            onChange={set("code")}
            disabled={!creating}
            required
            pattern="[A-Za-z0-9]{4,20}"
            maxLength={20}
            className={`${inputCls} uppercase disabled:opacity-60`}
          />
        </Field>
        <Field label="Nama promo">
          <input
            value={f.title}
            onChange={set("title")}
            required
            minLength={3}
            maxLength={60}
            className={inputCls}
          />
        </Field>
        <Field
          label="Deskripsi"
          className="sm:col-span-2"
          hint="Tampil di halaman Promo."
        >
          <textarea
            value={f.description}
            onChange={set("description")}
            required
            minLength={5}
            maxLength={200}
            rows={2}
            className={textareaCls}
          />
        </Field>
        <Field label="Diskon (%)" hint="1 sampai 70.">
          <input
            type="number"
            min={1}
            max={70}
            value={f.percent_off}
            onChange={set("percent_off")}
            required
            className={inputCls}
          />
        </Field>
        <Field
          label="Maksimal potongan (Rp)"
          hint="Kosongkan kalau tanpa batas."
        >
          <input
            type="number"
            min={1000}
            step={1000}
            value={f.max_discount}
            onChange={set("max_discount")}
            className={inputCls}
          />
        </Field>
        <Field label="Minimal kursi" hint="1 sampai 10.">
          <input
            type="number"
            min={1}
            max={10}
            value={f.min_seats}
            onChange={set("min_seats")}
            required
            className={inputCls}
          />
        </Field>
        <Field
          label="Berlaku sampai"
          hint="Kosongkan kalau tanpa batas tanggal."
        >
          <input
            type="date"
            value={f.valid_until}
            onChange={set("valid_until")}
            className={inputCls}
          />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-bold">Hari berlaku</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label
                key={d}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-line-strong px-3 text-sm font-bold ${f.weekdays.includes(i) ? "bg-tile-yellow" : "bg-panel"}`}
              >
                <input
                  type="checkbox"
                  checked={f.weekdays.includes(i)}
                  onChange={() => toggleDay(i)}
                  className="size-4"
                />
                {d}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Tidak ada yang dicentang = berlaku setiap hari.
          </p>
        </fieldset>
        <Field
          label="Peluang terbuka tiap hari (%)"
          hint="Promo tidak selalu terbuka: 100 = selalu, 0 = tidak pernah. Hasilnya diundi per hari dan sama untuk semua orang."
        >
          <input
            type="number"
            min={0}
            max={100}
            value={f.daily_chance}
            onChange={set("daily_chance")}
            required
            className={inputCls}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border-2 border-line-strong bg-panel px-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={f.active}
            onChange={(e) => setF((x) => ({ ...x, active: e.target.checked }))}
            className="size-5"
          />
          Aktif (bisa dipakai pembeli)
        </label>
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
            {busy ? "Menyimpan…" : "Simpan promo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Promos() {
  const { data, loading, error, reload } = useAsync(
    () => call("admin_promos"),
    [],
  );
  const [form, setForm] = useState(null); // null | 'new' | promo
  const [del, setDel] = useState(null);
  const [flash, setFlash] = useState(null);

  async function toggle(p) {
    try {
      await call("admin_set_promo_active", {
        p_code: p.code,
        p_active: !p.active,
      });
      setFlash({
        kind: "ok",
        text: `Promo ${p.code} ${p.active ? "dinonaktifkan" : "diaktifkan"}.`,
      });
      reload();
    } catch (e) {
      setFlash({ kind: "err", text: e.message });
    }
  }

  return (
    <Page
      id="promo-admin"
      title="Promo"
      sub="Kode diskon untuk pembeli. Setiap kode hanya bisa dipakai sekali per akun, dan terbuka di hari tertentu menurut peluang yang kamu atur."
      actions={
        <button
          type="button"
          onClick={() => setForm("new")}
          className={btnPrimary}
        >
          <Icon name="plus" className="size-4" />
          Promo baru
        </button>
      }
    >
      <Flash flash={flash} onClose={() => setFlash(null)} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-48" />}
      {data && data.length === 0 && (
        <Empty title="Belum ada promo">
          Buat promo pertama dengan tombol di atas.
        </Empty>
      )}
      {data && data.length > 0 && (
        <TableWrap label="Daftar promo">
          <table className="w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className={th}>Promo</th>
                <th className={th}>Aturan</th>
                <th className={th}>Hari ini</th>
                <th className={th}>Dipakai</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.code}>
                  <td className={td}>
                    <b>{p.code}</b>
                    <div>{p.title}</div>
                  </td>
                  <td className={`${td} text-xs`}>
                    {p.percent_off}%
                    {p.max_discount ? `, maks ${rupiah(p.max_discount)}` : ""}
                    <br />
                    min {p.min_seats} kursi ·{" "}
                    {p.weekdays?.length
                      ? p.weekdays.map((d) => DAYS[d]).join(", ")
                      : "setiap hari"}
                    <br />
                    peluang buka {p.daily_chance}%
                    {p.valid_until
                      ? ` · sampai ${fmtLongDate(p.valid_until)}`
                      : ""}
                  </td>
                  <td className={td}>
                    {p.active ? (
                      p.open_today ? (
                        <Badge tone="ok">Terbuka</Badge>
                      ) : (
                        <Badge>Tutup</Badge>
                      )
                    ) : (
                      <Badge>-</Badge>
                    )}
                  </td>
                  <td className={td}>
                    {num(p.uses)}×
                    {p.uses > 0 && (
                      <div className="text-xs text-muted">
                        {rupiah(p.discount_total)}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    {p.active ? (
                      <Badge tone="ok">Aktif</Badge>
                    ) : (
                      <Badge tone="bad">Nonaktif</Badge>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setForm(p)}
                        aria-label={`Ubah promo ${p.code}`}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => toggle(p)}
                        aria-label={`${p.active ? "Nonaktifkan" : "Aktifkan"} promo ${p.code}`}
                      >
                        {p.active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        type="button"
                        className={btnSmall}
                        onClick={() => setDel(p)}
                        aria-label={`Hapus promo ${p.code}`}
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
        Promo yang sudah pernah dipakai tidak bisa dihapus (riwayat pesanan
        butuh kodenya). Nonaktifkan saja. KursiKu tidak menyimpan total pesanan,
        tapi menghitungnya dari aturan promo. Jadi mengubah persen atau maksimal
        potongan promo yang sudah dipakai juga mengubah total pesanan lama yang
        memakai kode itu, termasuk di laporan ini. Untuk promo yang sudah
        dipakai, lebih aman membuat kode baru.
      </p>

      {form && (
        <PromoForm
          promo={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSaved={(text) => {
            setFlash({ kind: "ok", text });
            reload();
          }}
        />
      )}
      {del && (
        <ConfirmModal
          title={`Hapus promo ${del.code}?`}
          confirmLabel="Hapus promo"
          danger
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await call("admin_delete_promo", { p_code: del.code });
            setFlash({ kind: "ok", text: `Promo ${del.code} dihapus.` });
            reload();
          }}
        >
          <p>
            Promo ini belum pernah dipakai, jadi aman dihapus. Aksi ini tidak
            bisa dibatalkan.
          </p>
        </ConfirmModal>
      )}
    </Page>
  );
}
