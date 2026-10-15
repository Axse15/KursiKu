// Mengambil film "sedang tayang" dari TMDB, lalu menulis import.sql
// untuk ditempel di Supabase > SQL Editor.
//
// Pemakaian (Node 18+):   node scripts/import-tmdb.mjs
// Butuh file .env.import berisi satu baris:   TMDB_TOKEN=<API Read Access Token>
//
// Token TMDB hanya dipakai di komputermu saat skrip ini jalan. Tidak masuk ke aplikasi web.
import fs from "node:fs";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const COUNT = 1000;
const ID_COUNT = 1000; // target film Indonesia dari COUNT (sisanya film luar negeri)

// warna cadangan kalau gambar poster gagal dimuat
const PALETTE = [
  ["#7c2d12", "#1c1917"],
  ["#1e3a8a", "#0f172a"],
  ["#3b0764", "#0c0a09"],
  ["#14532d", "#0f172a"],
  ["#831843", "#1e1b4b"],
  ["#134e4a", "#1c1917"],
];

export function readToken() {
  if (process.env.TMDB_TOKEN) return process.env.TMDB_TOKEN.trim();
  try {
    const line = fs
      .readFileSync(".env.import", "utf8")
      .replace(/^\uFEFF/, "") // sebagian editor Windows menambah BOM di awal file
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith("TMDB_TOKEN="));
    return line
      ? line
          .slice("TMDB_TOKEN=".length)
          .trim()
          .replace(/^["']|["']$/g, "")
      : "";
  } catch {
    return "";
  }
}

async function get(path, params, token) {
  const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok)
    throw new Error(
      `TMDB ${res.status} untuk ${path}: ${(await res.text()).slice(0, 200)}`,
    );
  return res.json();
}

const usable = (m) => m.poster_path && !m.adult;
const ymd = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

// Film buatan Indonesia (bahasa asli: Indonesia) yang rilis di bioskop Indonesia dalam ~75 hari terakhir.
async function indonesianFilms(token) {
  const base = {
    language: "id-ID",
    with_original_language: "id",
    sort_by: "popularity.desc",
    include_adult: "false",
    page: 1,
  };
  let list =
    (
      await get(
        "/discover/movie",
        {
          ...base,
          region: "ID",
          with_release_type: "2|3",
          "release_date.gte": ymd(daysAgo(75)),
          "release_date.lte": ymd(new Date()),
        },
        token,
      )
    ).results || [];
  if (list.filter(usable).length < ID_COUNT) {
    // rentang diperlebar kalau film Indonesia yang baru rilis sedikit
    const more =
      (
        await get(
          "/discover/movie",
          {
            ...base,
            "primary_release_date.gte": ymd(daysAgo(180)),
            "primary_release_date.lte": ymd(new Date()),
          },
          token,
        )
      ).results || [];
    const seen = new Set(list.map((m) => m.id));
    list = [...list, ...more.filter((m) => !seen.has(m.id))];
  }
  return list.filter(usable);
}

// Campuran: sekitar idCount film Indonesia + sisanya film luar negeri yang sedang tayang di Indonesia.
export async function fetchMovies(token, count = COUNT, idCount = ID_COUNT) {
  const local = (await indonesianFilms(token)).slice(0, idCount);

  let intl =
    (
      await get(
        "/movie/now_playing",
        { language: "id-ID", region: "ID", page: 1 },
        token,
      )
    ).results || [];
  intl = intl.filter((m) => m.original_language !== "id");
  if (local.length + intl.filter(usable).length < count) {
    // daftar khusus Indonesia kadang pendek; lengkapi dengan daftar global
    const more =
      (await get("/movie/now_playing", { language: "id-ID", page: 1 }, token))
        .results || [];
    const seen = new Set(intl.map((m) => m.id));
    intl = [
      ...intl,
      ...more.filter((m) => !seen.has(m.id) && m.original_language !== "id"),
    ];
  }

  const seen = new Set(local.map((m) => m.id));
  const list = [
    ...local,
    ...intl
      .filter((m) => usable(m) && !seen.has(m.id))
      .slice(0, Math.max(0, count - local.length)),
  ];

  const items = [];
  for (const m of list) {
    const d = await get(
      `/movie/${m.id}`,
      {
        language: "id-ID",
        append_to_response: "videos",
        include_video_language: "id,en",
      },
      token,
    );
    let overview = d.overview;
    if (!overview)
      overview = (await get(`/movie/${m.id}`, { language: "en-US" }, token))
        .overview;

    const trailers = (d.videos?.results || []).filter(
      (v) => v.site === "YouTube" && v.type === "Trailer",
    );
    const trailer = trailers.find((v) => v.official) || trailers[0];

    items.push({
      tmdb_id: m.id,
      origin:
        (d.original_language || m.original_language) === "id" ? "ID" : "luar", // hanya untuk ringkasan di terminal
      title: d.title || m.title,
      genre: d.genres?.[0]?.name || "Film",
      duration_min: d.runtime > 0 ? d.runtime : 100,
      synopsis: (overview || "Sinopsis belum tersedia.")
        .replace(/\s+/g, " ")
        .trim(),
      poster_url: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `${IMG}/w1280${d.backdrop_path}` : null,
      vote_average: d.vote_average
        ? Math.round(d.vote_average * 10) / 10
        : null,
      trailer_key: trailer?.key || null,
      release_date: d.release_date || null,
    });
  }
  return items;
}

const esc = (s) => `'${String(s).replaceAll("'", "''")}'`;
const val = (v) => (v == null || v === "" ? "null" : esc(v));

// Membuang film lama yang tidak ikut daftar impor ini. Jadwalnya ikut terhapus otomatis (ON DELETE CASCADE).
// Film yang sudah pernah dipesan TIDAK disentuh, supaya tiket pengguna tetap valid.
function cleanSql(items) {
  const ids = items.map((m) => m.tmdb_id).join(", ");
  return `-- Bersih-bersih (opsi --bersih): buang film lama yang tidak ada di daftar ini dan belum pernah dipesan.
delete from movies m
 where m.tmdb_id is not null
   and m.tmdb_id not in (${ids})
   and not exists (
     select 1 from bookings b join showtimes s on s.id = b.showtime_id where s.movie_id = m.id
   );

`;
}
export function buildSql(items) {
  const rows = items.map((m) => {
    const [from, to] = PALETTE[m.tmdb_id % PALETTE.length];
    return `(${m.tmdb_id}, ${esc(m.title)}, ${esc(m.genre)}, ${m.duration_min}, 'NR', ${esc(m.synopsis)}, '${from}', '${to}', ${val(m.poster_url)}, ${val(m.backdrop_url)}, ${m.vote_average == null ? "null" : m.vote_average}, ${val(m.trailer_key)}, ${val(m.release_date)})`;
  });

  return `-- Dibuat otomatis dari TMDB oleh scripts/import-tmdb.mjs
-- Aman dijalankan berulang: film yang sama diperbarui, bukan digandakan.
insert into movies
  (tmdb_id, title, genre, duration_min, rating, synopsis, poster_from, poster_to, poster_url, backdrop_url, vote_average, trailer_key, release_date)
values
${rows.join(",\n")}
on conflict (tmdb_id) do update set
  title = excluded.title,
  genre = excluded.genre,
  duration_min = excluded.duration_min,
  synopsis = excluded.synopsis,
  poster_url = excluded.poster_url,
  backdrop_url = excluded.backdrop_url,
  vote_average = excluded.vote_average,
  trailer_key = excluded.trailer_key,
  release_date = excluded.release_date;

-- Jadwal dummy 3 hari ke depan, hanya untuk film yang belum punya jadwal mendatang.
insert into showtimes (movie_id, starts_at, studio, price_regular, price_premium)
select m.id,
       (((now() at time zone 'Asia/Jakarta')::date + d) + v.t) at time zone 'Asia/Jakarta',
       'Studio ' || (1 + (m.id % 3)),
       45000,
       65000
from movies m
cross join generate_series(0, 2) as d
cross join (values (time '13:00'), (time '16:30'), (time '19:45')) as v(t)
where m.tmdb_id is not null
  and not exists (select 1 from showtimes s where s.movie_id = m.id and s.starts_at > now());
`;
}

export async function run() {
  const token = readToken();
  if (!token) {
    console.error(
      "TMDB_TOKEN belum diisi. Buat file .env.import berisi satu baris: TMDB_TOKEN=tokenmu",
    );
    process.exit(1);
  }
  const items = await fetchMovies(token);
  if (items.length === 0)
    throw new Error("Tidak ada film yang didapat dari TMDB.");
  const clean = process.argv.includes("--bersih");
  fs.writeFileSync("import.sql", buildSql(items, { clean }), "utf8");
  const nId = items.filter((m) => m.origin === "ID").length;
  console.log(
    `Selesai: ${items.length} film ditulis ke import.sql (${nId} film Indonesia, ${items.length - nId} film luar negeri)${clean ? " + pembersihan film lama" : ""}`,
  );
  for (const m of items) console.log(` - [${m.origin}] ${m.title}`);
}

// Supaya bisa diuji tanpa menjalankan jaringan sungguhan.
if (!globalThis.__TMDB_TEST__) {
  run().catch((e) => {
    console.error("Gagal:", e.message);
    process.exit(1);
  });
}
