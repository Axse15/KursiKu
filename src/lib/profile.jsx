import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Profil pengguna yang sudah login: nama panggilan + bioskop favorit.
// Disimpan di tabel "profiles" (hanya pemiliknya yang bisa membaca/mengubah, diatur oleh RLS di database).
const ProfileContext = createContext({
  enabled: false, // false = di luar ProfileProvider
  profile: null,
  loading: false,
  error: '',
  save: async () => {},
  reset: async () => {},
})

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.id ?? null
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setProfile(null)
    setError('')
    if (!uid) {
      setLoading(false)
      return () => {
        active = false
      }
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message)
        else setProfile(data)
      })
      .catch((e) => active && setError(e.message || 'Gagal memuat profil'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [uid])

  // Simpan (buat kalau belum ada, ubah kalau sudah ada). Melempar error supaya halaman bisa menampilkannya.
  const save = useCallback(
    async ({ nickname, favorite_cinema_id }) => {
      if (!uid) throw new Error('Kamu belum masuk.')
      const clean = (nickname || '').trim().slice(0, 30)
      const row = { id: uid, nickname: clean || null, favorite_cinema_id: favorite_cinema_id ?? null }
      const { data, error: err } = await supabase.from('profiles').upsert(row, { onConflict: 'id' }).select().single()
      if (err) throw err
      setProfile(data)
      setError('')
      return data
    },
    [uid]
  )

  const reset = useCallback(async () => {
    if (!uid) return
    const { error: err } = await supabase.from('profiles').delete().eq('id', uid)
    if (err) throw err
    setProfile(null)
  }, [uid])

  const value = useMemo(
    () => ({ enabled: true, profile, loading, error, save, reset }),
    [profile, loading, error, save, reset]
  )
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfile = () => useContext(ProfileContext)