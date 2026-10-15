import { Component } from 'react'
import { Link } from 'react-router-dom'
import { btnPrimary } from './ui'

// Tanpa ini, satu error saat render membuat SELURUH aplikasi hilang (layar hitam kosong).
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Halaman error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm">
        <p className="font-semibold text-red-300">Halaman ini gagal ditampilkan</p>
        <p className="mt-2 break-words font-mono text-xs text-zinc-300">
          {String(this.state.error?.message || this.state.error)}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className={btnPrimary}>
            Muat ulang
          </button>
          <Link to="/" onClick={() => this.setState({ error: null })} className="flex min-h-11 items-center text-zinc-300 underline">
            Ke beranda
          </Link>
        </div>
      </div>
    )
  }
}