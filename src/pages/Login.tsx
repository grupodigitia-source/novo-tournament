import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'
import { ErrorMsg } from '../components/ui'

export default function Login() {
  const [rol, setRol] = useState<'jugador' | 'admin'>('jugador')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [params] = useSearchParams()
  const nav = useNavigate()
  const next = params.get('next') ?? undefined

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setErr('Correo o contraseña incorrectos.'); setBusy(false); return }
    const { data: adm } = await supabase.rpc('ranked_is_admin')
    if (rol === 'admin') {
      if (adm) { nav('/admin'); return }
      const { data: existe } = await supabase.rpc('ranked_admin_exists')
      if (!existe) {
        const { data: ok } = await supabase.rpc('ranked_claim_admin')
        if (ok) { nav('/admin'); return }
      }
      setErr('Esta cuenta no tiene permisos de administrador.'); setBusy(false); return
    }
    nav(next ?? '/perfil')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <div className="card rise w-full p-7">
        <div className="mb-6 flex justify-center"><Logo size={40} /></div>
        <h1 className="mb-1 text-center text-xl font-bold">Novo Tournament Beta</h1>
        <p className="mb-5 text-center text-sm text-soft">Ranked · Baaxal Bosques</p>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-btn bg-off p-1">
          {(['jugador', 'admin'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRol(r)} className={`rounded-btn py-2 text-sm font-semibold transition ${rol === r ? 'bg-white shadow-card' : 'text-soft'}`}>
              {r === 'jugador' ? 'Jugador' : 'Administrador'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Correo</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><label className="label">Contraseña</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
          <ErrorMsg msg={err} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        {rol === 'jugador' ? (
          <p className="mt-5 text-center text-sm text-soft">¿Primera vez? <Link className="font-semibold text-terra" to={'/registro' + (next ? `?next=${encodeURIComponent(next)}` : '')}>Crea tu cuenta</Link></p>
        ) : (
          <p className="mt-5 text-center text-xs text-soft">Si aún no existe ningún administrador, la primera cuenta que entre aquí lo será. Primero créala desde "Jugador → Crea tu cuenta".</p>
        )}
      </div>
    </div>
  )
}
