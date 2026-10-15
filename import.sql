-- Dibuat otomatis dari TMDB oleh scripts/import-tmdb.mjs
-- Aman dijalankan berulang: film yang sama diperbarui, bukan digandakan.
insert into movies
  (tmdb_id, title, genre, duration_min, rating, synopsis, poster_from, poster_to, poster_url, backdrop_url, vote_average, trailer_key, release_date)
values
(1423191, 'Resident Evil', 'Kengerian', 95, 'NR', 'Medical courier Bryan unwittingly finds himself fighting for survival as one fateful, horrifying night collapses around him in chaos.', '#14532d', '#0f172a', 'https://image.tmdb.org/t/p/w500/i7UyjfPio0VFHB9rBUZSFyhOoM8.jpg', 'https://image.tmdb.org/t/p/w1280/3icyRAqgakNcQn6aDVz9libFmBA.jpg', 7.3, 'mNd1gb19A-c', '2026-09-16'),
(1101412, 'Fall 2: Deadpoint', 'Cerita Seru', 98, 'NR', 'On a perilous climb across Thailand''s Mount Kwan, two climbers become trapped thousands of feet above the ground, where vertigo-inducing heights, sheer exposure, and impossible odds turn every moment into a fight for survival.', '#831843', '#1e1b4b', 'https://image.tmdb.org/t/p/w500/fgSm5ylwiXbIHn8UbUXDjk9RRu4.jpg', 'https://image.tmdb.org/t/p/w1280/yBDxqDB29kpH9VojTytjGWBgmdJ.jpg', 7.3, 'Krs0VDIjhmE', '2026-09-01'),
(1377237, 'Runner', 'Aksi', 97, 'NR', 'A former soldier is thrown into a brutal race against time when a critical medical delivery makes him and his unlikely partner the targets of a ruthless cartel. As the mission spirals into a deadly manhunt, every detour, delay, and bullet pushes them closer to failure. With betrayal closing in from every side, they must survive the chase and deliver their cargo to save the life of a little girl.', '#14532d', '#0f172a', 'https://image.tmdb.org/t/p/w500/yBKMAIj7clP42UkFejhGDBBoTpb.jpg', 'https://image.tmdb.org/t/p/w1280/npXZNWjOEYrqdMDPQ11SGBrXqAG.jpg', 8.3, 'B6Z9MM1LhEA', '2026-09-07'),
(1400837, 'Other Mommy', 'Kengerian', 93, 'NR', 'Young Bela forms a relationship with a sinister entity in her home that looks uncannily like her own mother, drawing her into a terrifying and increasingly dark world.', '#134e4a', '#1c1917', 'https://image.tmdb.org/t/p/w500/fGRNCssTRrhYZxNzykGGCoMsAVq.jpg', 'https://image.tmdb.org/t/p/w1280/ncm7djsVTHQQMX2HEbEVxMUFchG.jpg', 6, '-mnTITqqiT0', '2026-10-07'),
(1058424, '호프', 'Cerita Fiksi', 157, 'NR', 'In the remote South Korean village of Hope Harbor, police chief Bum-seok and officer Sung-ae are called to investigate a mysterious creature wreaking havoc on the community. But all is not as it seems, and perceptions can be misleading. What begins as ignorance plants the seed of disaster, escalating through human conflict into a tragedy of cosmic proportions.', '#7c2d12', '#1c1917', 'https://image.tmdb.org/t/p/w500/ptqlN6mDIAqJjVA86J5eOoG82zc.jpg', 'https://image.tmdb.org/t/p/w1280/xBcKnWJHodUpvzUVIWTuNMnvEwl.jpg', 7.2, 'OFaJzL83y0Q', '2026-07-15'),
(1302904, 'Practical Magic 2', 'Percintaan', 130, 'NR', 'The Owens sisters must confront the dark curse that threatens to unravel their family once and for all.', '#831843', '#1e1b4b', 'https://image.tmdb.org/t/p/w500/ogwQOLbCfncjvBhFb5l0OmQH8KC.jpg', 'https://image.tmdb.org/t/p/w1280/oIglj0Jy9duG4LnrRUpH8n001Pk.jpg', 6.3, 'Ho10_4IX1jE', '2026-09-09'),
(1248832, 'Digger', 'Komedi', 129, 'NR', 'The most powerful man in the world embarks on a frantic mission to prove he is humanity''s savior before the disaster he''s unleashed destroys everything.', '#831843', '#1e1b4b', 'https://image.tmdb.org/t/p/w500/1ATXKrIPJyKNwnJ6lcG088Sa6zi.jpg', 'https://image.tmdb.org/t/p/w1280/b7t3r39Oll5qPxBKzLZ8eHMBD7l.jpg', 7.5, 'job8V254NAE', '2026-09-28'),
(299534, 'Avengers: Endgame', 'Petualangan', 181, 'NR', 'Terdampar di luar angkasa tanpa persediaan makanan dan minuman, Tony Stark berusaha mengirim pesan untuk Pepper Potts dimana persediaan oksigen mulai menipis. Sementara itu para Avengers yang tersisa harus menemukan cara untuk mengembalikan 50% mahluk di seluruh dunia yang telah dilenyapkan oleh Thanos.', '#3b0764', '#0c0a09', 'https://image.tmdb.org/t/p/w500/bR8ISy1O9XQxqiy0fQFw2BX72RQ.jpg', 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg', 8.2, 'L2NAh3CIdig', '2019-04-24'),
(1283515, 'Verity', 'Misteri', 114, 'NR', 'Lowen Ashleigh, hired to ghostwrite for best-selling author Verity Crawford, uncovers Verity''s autobiographical notes, and becomes involved in what may prove to be a lethal conspiracy.', '#1e3a8a', '#0f172a', 'https://image.tmdb.org/t/p/w500/zPHfsaiMZT1HNz1ZS55iyLKZkFG.jpg', 'https://image.tmdb.org/t/p/w1280/3BoHXmGAfC2qO4wnCpMYV0BzpHD.jpg', 6.3, 'xdPMKhjMSFs', '2026-09-30'),
(1263337, 'Heart of the Beast', 'Petualangan', 101, 'NR', 'After a harrowing plane crash, Special Forces officer James Belmont and his combat dog, Odin, find themselves stranded deep in the Alaskan wilderness. Together, they are forced into a brutal fight for survival against the elements.', '#1e3a8a', '#0f172a', 'https://image.tmdb.org/t/p/w500/1ApfSA8JTqeha3GTFEY8syV4auq.jpg', 'https://image.tmdb.org/t/p/w1280/bicMU6xVD5deVyKP2azpyx7xkmH.jpg', 7.4, 'UkMuGKqAux4', '2026-09-19')
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
