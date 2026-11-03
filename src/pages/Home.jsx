import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCinema } from '../lib/cinema'
import { useFilms } from '../lib/films'
import { fmtDayChip, fmtWhen, rupiah } from '../lib/config'
import { buildFeatured } from '../lib/featured'
import { useRanking } from '../lib/useRanking'
import { fmtReleaseShort, untilLabel } from '../lib/release'
import Banner from '../components/Banner'
import MovieCard from '../components/MovieCard'
import PromoStrip from '../components/PromoStrip'
import { Empty, ErrorBox, Poster, SectionTitle, Skeleton } from '../components/ui'

const PREVIEW = 10 // jumlah kartu di beranda; selebihnya lewat "Lihat semua"
const TOP_N = 5 // jumlah film di petak "Film terlaris"

// Pintu masuk kecil di bawah banner: satu baris berisi judul, keterangan singkat, dan panah.
function QuickTile({ to, tone, title, hint, badge = null }) {
  return (
    <Link to={to} className={`group nb-card nb-lift flex items-center justify-between gap-3 p-3 sm:p-4 ${tone}`}>
      <span className="min-w-0">
        <span className="block font-display text-lg font-extrabold leading-tight tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-2">{hint}</span>
      </span>
      {badge != null ? (
        <span className="tnum hidden size-10 shrink-0 place-items-center rounded-xl border-2 border-edge bg-panel text-lg font-extrabold sm:grid">{badge}</span>
      ) : (
        <span aria-hidden="true" className="shrink-0 text-xl font-bold group-hover:translate-x-0.5">
          ›
        </span>
      )}
    </Link>
  )
}

// Petak "Film terlaris" di beranda: rekomendasi utama + 5 teratas. Kalau datanya gagal dimuat, petak disembunyikan
// (beranda tidak boleh ikut error hanya karena peringkat). Isi lengkapnya di halaman Terlaris.
function TopSellers({ ranking }) {
  const { rows, loading, error } = ranking
  if (error) return null
  if (loading || !rows) return <Skeleton className="h-64" />
  if (rows.length === 0) return null
  const best = rows[0]
  const list = rows.slice(0, TOP_N)
  return (
    <section aria-labelledby="terlaris-home" className="grid gap-5 lg:grid-cols-12">
      <div className="nb-card flex items-center gap-4 bg-tile-yellow p-4 sm:gap-5 sm:p-5 lg:col-span-5">
        <Poster movie={best.movie} showMeta={false} compact className="aspect-[2/3] w-24 shrink-0 rounded-lg shadow-nb sm:w-28" />
        <div className="min-w-0 self-center">
          <h2 id="terlaris-home" className="text-sm font-bold text-ink-2">
            Rekomendasi untukmu
          </h2>
          <Link to={`/film/${best.movie.id}`} className="mt-1 block font-display text-2xl font-extrabold leading-tight tracking-tight hover:underline sm:text-3xl">
            {best.movie.title}
          </Link>
          {best.values.tickets > 0 && (
            <p className="tnum mt-1 text-sm">
              <strong>{best.values.tickets}</strong> tiket terjual dalam 30 hari terakhir
            </p>
          )}
          <Link to={`/film/${best.movie.id}`} className="nb-lift mt-3 inline-flex min-h-11 items-center rounded-xl border-2 border-edge bg-ink px-5 text-sm font-bold text-page shadow-nb">
            Lihat jadwal
          </Link>
        </div>
      </div>

      <div className="nb-card p-4 sm:p-5 lg:col-span-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-xl font-extrabold leading-tight tracking-tight">Film terlaris</h2>
          <Link to="/terlaris" className="inline-flex min-h-11 items-center text-sm font-bold underline">
            Lihat peringkat lengkap <span aria-hidden="true">›</span>
          </Link>
        </div>
        <ol className="mt-2 space-y-1">
          {list.map((r) => (
            <li key={r.movie.id}>
              <Link to={`/film/${r.movie.id}`} className="flex min-h-11 items-center gap-3 rounded-lg px-1 hover:bg-raised">
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-lg border-2 border-edge bg-panel text-sm font-extrabold">
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.movie.title}</span>
                <span className="tnum shrink-0 text-xs text-ink-2">
                  {r.values.tickets > 0 ? `${r.values.tickets} tiket` : 'Belum ada penjualan'}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default function Home() {
  const [tab, setTab] = useState('now') // 'now' | 'soon'
  const { cinemas, selected, error: cinemaError, reload: reloadCinemas } = useCinema()
  const cinemaId = selected?.id ?? null
  const { data, loading, error, reload, next, fromPrice, bestDeal, info, nowShowing, upcoming } = useFilms(cinemaId)
  const ranking = useRanking() // dipanggil sebelum return awal supaya urutan hook tetap

  if (cinemaError) {
    return (
      <ErrorBox
        message={`Data bioskop gagal dimuat: ${cinemaError}. Pastikan file supabase-cinema-auth.sql sudah dijalankan di Supabase.`}
        onRetry={reloadCinemas}
      />
    )
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[26rem]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-44 shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (data.movies.length === 0) {
    return (
      <Empty title="Belum ada film">
        Isi data lewat <code>supabase.sql</code> atau <code>import.sql</code>.
      </Empty>
    )
  }

  // Banner: satu slide per kategori (promo, rating, populer, baru, segera), pilihan filmnya berganti tiap hari
  const slides = buildFeatured({ nowShowing, upcoming, info, bestDeal })
  const soonSorted = upcoming
  const nowSorted = [...nowShowing].sort((a, b) => new Date(next[a.id]) - new Date(next[b.id]))

  const card = (m) => {
    const d = bestDeal[m.id]
    return (
      <li key={m.id} className="w-40 shrink-0 sm:w-44 lg:w-48">
        <MovieCard
          movie={m}
          tag={info[m.id].status === 'new' ? 'new' : null}
          deal={d ? { pct: d.pct, day: fmtDayChip(d.at).top } : null}
          left={fmtWhen(next[m.id])}
          right={
            <>
              <span className="sr-only">Mulai </span>
              {rupiah(fromPrice[m.id])}
            </>
          }
        />
      </li>
    )
  }

  const tabBtn = (key, label, count) => (
    <button
      type="button"
      aria-pressed={tab === key}
      onClick={() => setTab(key)}
      className={`flex min-h-11 items-center gap-2 rounded-xl border-2 border-edge px-4 text-sm font-bold transition-colors ${
        tab === key ? 'bg-ink text-page' : 'bg-panel text-ink hover:bg-raised'
      }`}
    >
      {label} <span className="tnum text-xs opacity-80">{count}</span>
    </button>
  )

  const list = tab === 'now' ? nowSorted : soonSorted

  return (
    <div className="space-y-10 sm:space-y-12">
      <h1 className="sr-only">KursiKu: pesan tiket bioskop</h1>

      {/* 1. satu banner besar, tanpa petak lain di sampingnya */}
      {slides.length > 0 ? <Banner key={cinemaId ?? 'all'} slides={slides} next={next} /> : null}

      {/* 2. empat pintu masuk dalam satu baris tipis */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <QuickTile
          to="/sedang-tayang"
          tone="bg-tile-yellow"
          title="Sedang tayang"
          hint={`${nowShowing.length} film bisa dipesan`}
          badge={nowShowing.length}
        />
        <QuickTile
          to="/segera-hadir"
          tone="bg-tile-lilac"
          title="Coming soon"
          hint={`${upcoming.length} film akan datang`}
          badge={upcoming.length}
        />
        <PromoStrip className="col-span-2 lg:col-span-1" />
        <QuickTile
          to="/bioskop"
          tone="bg-tile-green"
          title={selected ? 'Bioskop pilihanmu' : 'Pilihan bioskop'}
          hint={selected ? `${selected.name}, ${selected.city}` : `Semua ${cinemas.length} cabang KursiKu`}
        />
      </div>

      {/* 3. deretan poster yang digeser ke samping: sedang tayang / coming soon */}
      <section aria-labelledby="pilihan-judul">
        <SectionTitle
          id="pilihan-judul"
          sub={
            tab === 'now'
              ? selected
                ? `${selected.name}, ${selected.city}`
                : `Dari semua ${cinemas.length} cabang KursiKu`
              : 'Belum bisa dipesan. Jadwal dan tiket dibuka saat film rilis.'
          }
          aside={
            <Link to={tab === 'now' ? '/sedang-tayang' : '/segera-hadir'} className="inline-flex min-h-11 items-center text-sm font-bold text-accent-ink underline">
              Lihat semua {list.length} film
            </Link>
          }
        >
          Pilih film
        </SectionTitle>

        <div role="group" aria-label="Jenis daftar film" className="mb-5 flex flex-wrap gap-2">
          {tabBtn('now', 'Sedang tayang', nowShowing.length)}
          {tabBtn('soon', 'Coming soon', upcoming.length)}
        </div>

        {list.length === 0 ? (
          <Empty title={tab === 'now' ? 'Belum ada jadwal tayang' : 'Belum ada film yang akan datang'}>
            {tab === 'now'
              ? 'Jadwal dibuat otomatis setiap hari. Coba muat ulang halaman beberapa saat lagi.'
              : 'Daftar film yang akan datang diperbarui otomatis dari TMDB setiap hari.'}
          </Empty>
        ) : (
          <ul className="rail relative -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-1 sm:mx-0 sm:px-1">
            {tab === 'now'
              ? list.slice(0, PREVIEW).map((m) => card(m))
              : list.slice(0, PREVIEW).map((m) => (
                  <li key={m.id} className="w-40 shrink-0 sm:w-44 lg:w-48">
                    <MovieCard movie={m} tag="soon" left={`Rilis ${fmtReleaseShort(info[m.id].date)}`} right={untilLabel(info[m.id].days)} />
                  </li>
                ))}
          </ul>
        )}
      </section>

      {/* 4. rekomendasi + peringkat */}
      <TopSellers ranking={ranking} />
    </div>
  )
}
