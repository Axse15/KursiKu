import { useState } from "react";
import { call, fmtDateTime } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Empty,
  ErrorBox,
  Page,
  Pager,
  Skeleton,
  TableWrap,
  td,
  th,
} from "./kit";

const LIMIT = 50;

const ACTION = {
  "order.cancel": "Batalkan pesanan",
  "ticket.checkin": "Validasi tiket",
  "ticket.undo_checkin": "Batalkan validasi tiket",
  "promo.create": "Buat promo",
  "promo.update": "Ubah promo",
  "promo.activate": "Aktifkan promo",
  "promo.deactivate": "Nonaktifkan promo",
  "promo.delete": "Hapus promo",
  "movie.create": "Buat film",
  "movie.update": "Ubah film",
  "movie.hide": "Sembunyikan film",
  "movie.show": "Tampilkan film",
  "movie.delete": "Hapus film",
  "showtime.create": "Buat jadwal",
  "showtime.update": "Ubah jadwal",
  "showtime.delete": "Hapus jadwal",
  "showtime.generate": "Isi jadwal otomatis",
  "cinema.create": "Buat bioskop",
  "cinema.update": "Ubah bioskop",
  "cinema.delete": "Hapus bioskop",
  "points.adjust": "Sesuaikan poin",
  "admin.grant": "Jadikan admin",
  "admin.revoke": "Cabut akses admin",
};

// Ringkasan isi detail log: hanya kolom yang berguna dibaca manusia
function summary(d) {
  if (!d || typeof d !== "object") return "";
  const keys = [
    "reason",
    "title",
    "name",
    "movie",
    "customer",
    "delta",
    "note",
    "force",
    "balance_after",
    "showtimes_repriced",
    "created",
    "removed",
  ];
  return keys
    .filter((k) => d[k] !== undefined && d[k] !== null && d[k] !== "")
    .map(
      (k) =>
        `${k}: ${typeof d[k] === "boolean" ? (d[k] ? "ya" : "tidak") : d[k]}`,
    )
    .join(" · ");
}

export default function Log() {
  const [offset, setOffset] = useState(0);
  const { data, loading, error, reload } = useAsync(
    () => call("admin_log_list", { p_limit: LIMIT, p_offset: offset }),
    [offset],
  );
  return (
    <Page
      id="log-admin"
      title="Log aktivitas"
      sub="Semua aksi admin tercatat di sini (siapa, apa, kapan). Log hanya bisa ditambah oleh sistem dan tidak bisa diubah atau dihapus dari panel ini."
    >
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.total === 0 && (
        <Empty title="Belum ada aktivitas">
          Aksi admin akan muncul di sini.
        </Empty>
      )}
      {data && data.total > 0 && (
        <>
          <TableWrap label="Log aktivitas admin">
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr>
                  <th className={th}>Waktu</th>
                  <th className={th}>Admin</th>
                  <th className={th}>Aksi</th>
                  <th className={th}>Sasaran</th>
                  <th className={th}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${td} whitespace-nowrap text-xs`}>
                      {fmtDateTime(r.created_at)}
                    </td>
                    <td className={`${td} text-xs`}>{r.admin_email || "-"}</td>
                    <td className={`${td} font-bold`}>
                      {ACTION[r.action] || r.action}
                    </td>
                    <td className={`${td} text-xs`}>{r.target || "-"}</td>
                    <td
                      className={`${td} max-w-[22rem] break-words text-xs text-ink-2`}
                    >
                      {summary(r.detail)}
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
    </Page>
  );
}
