-- =====================================================================
-- KursiKu - skema database + data contoh
-- Jalankan SEKALI di Supabase: SQL Editor -> New query -> paste -> Run
-- (menjalankan ulang akan menggandakan data contoh film dan jadwal)
-- =====================================================================

-- ---------- TABEL ----------
create table if not exists public.movies (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  genre        text not null,
  duration_min int  not null check (duration_min > 0),
  age_rating   text not null,
  synopsis     text not null,
  poster_from  text not null,   -- warna awal gradien poster
  poster_to    text not null    -- warna akhir gradien poster
);

create table if not exists public.showtimes (
  id            uuid primary key default gen_random_uuid(),
  movie_id      uuid not null references public.movies(id) on delete cascade,
  starts_at     timestamptz not null,
  studio        text not null,
  price_regular int not null check (price_regular >= 0),
  price_premium int not null check (price_premium >= 0)
);
create index if not exists showtimes_movie_time_idx
  on public.showtimes (movie_id, starts_at);

-- Satu baris = satu kursi. Satu pesanan = beberapa baris dengan booking_code sama.
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  booking_code  text not null,
  showtime_id   uuid not null references public.showtimes(id) on delete cascade,
  seat_code     text not null check (seat_code ~ '^[A-H](10|[1-9])$'),
  customer_name text not null check (char_length(customer_name) between 1 and 30),
  price         int  not null check (price >= 0),
  created_at    timestamptz not null default now(),
  -- INI YANG MENCEGAH KURSI DOBEL-BOOKING, ditegakkan oleh database:
  constraint bookings_unique_seat unique (showtime_id, seat_code)
);
create index if not exists bookings_code_idx on public.bookings (booking_code);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.movies    enable row level security;
alter table public.showtimes enable row level security;
alter table public.bookings  enable row level security;

-- Semua orang boleh membaca film, jadwal, dan pesanan
create policy "movies_read"    on public.movies    for select to anon, authenticated using (true);
create policy "showtimes_read" on public.showtimes for select to anon, authenticated using (true);
create policy "bookings_read"  on public.bookings  for select to anon, authenticated using (true);

-- Semua orang boleh membuat pesanan. Tidak ada policy UPDATE / DELETE,
-- jadi pesanan tidak bisa diubah atau dihapus lewat aplikasi.
create policy "bookings_insert" on public.bookings for insert to anon, authenticated with check (true);

-- ---------- DATA CONTOH: FILM (semua fiktif) ----------
insert into public.movies (title, genre, duration_min, age_rating, synopsis, poster_from, poster_to) values
 ('Senja di Kota Tua',   'Drama',      112, '13+', 'Seorang arsitek muda kembali ke kota kelahirannya untuk menyelamatkan gedung tua peninggalan kakeknya, dan menemukan rahasia keluarga yang selama ini tersembunyi.', '#B5651D', '#2B1B3D'),
 ('Langit Terakhir',     'Fiksi Ilmiah', 128, '13+', 'Di tahun 2150, satu pesawat antariksa membawa sisa umat manusia mencari rumah baru. Kru-nya harus memilih antara harapan dan kebenaran.', '#1F4E79', '#0B0F1A'),
 ('Operasi Bayangan',    'Aksi',       119, '17+', 'Mantan agen intelijen ditarik kembali ke lapangan untuk menggagalkan jaringan penyelundup di tengah kota pelabuhan yang tak pernah tidur.', '#7A1F1F', '#1A1A2E'),
 ('Kopi dan Hujan',      'Romantis',   104, 'SU',  'Dua pemilik kedai kopi bersaing di jalan yang sama, sampai hujan deras mengurung mereka berdua di satu malam yang panjang.', '#3E6B5A', '#1B2A3A'),
 ('Gerbang Waktu',       'Petualangan', 124, 'SU', 'Tiga sahabat menemukan pintu tua di perpustakaan sekolah yang membawa mereka ke berbagai zaman, dengan satu aturan: harus pulang sebelum fajar.', '#6B3FA0', '#14213D'),
 ('Rumah Kelabu',        'Misteri',    108, '17+', 'Seorang penulis menyewa rumah terpencil untuk menyelesaikan novelnya, tetapi catatan di dinding rumah itu mulai menuliskan hal-hal yang belum terjadi.', '#4A4E5A', '#0F1117');

-- ---------- DATA CONTOH: JADWAL (30 hari ke depan, 3 sesi per hari) ----------
-- Jam dalam WIB (Asia/Jakarta). Jika jadwal sudah habis, jalankan ulang
-- HANYA blok insert ini (tanpa blok film di atas).
insert into public.showtimes (movie_id, starts_at, studio, price_regular, price_premium)
select m.id,
       ((current_date + d.day) + s.slot) at time zone 'Asia/Jakarta',
       'Studio ' || (1 + ((m.rn + s.ord) % 3)),
       50000,
       75000
from (select id, row_number() over (order by title)::int as rn from public.movies) m
cross join generate_series(0, 29) as d(day)
cross join (values (time '12:30', 1), (time '15:45', 2), (time '19:15', 3)) as s(slot, ord);
