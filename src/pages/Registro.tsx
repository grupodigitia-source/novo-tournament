import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { guardarPendiente, useAuth } from '../context/AuthContext'
import { NIVELES } from '../lib/niveles'
import { Logo } from '../components/Logo'
import { ErrorMsg } from '../components/ui'

const TIEMPOS = ['Menos de 6 meses', '6 meses a 1 año', '1 a 3 años', 'Más de 3 años']
const GENEROS = ['Mujer', 'Hombre', 'Otro', 'Prefiero no decir']

export default function Registro() {
  const [paso, setPaso] = useState(1)
  const [f, setF] = useState({ nombre: '', email: '', password: '', nivel: 'Bronce', tiempo: TIEMPOS[0], edad: '', genero: GENEROS[0], cp: '', optin: false })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revisaCorreo, setRevisaCorreo] = useState(false)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/perfil'
  const { refresh } = useAuth()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }))

  const avanzar = (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    if (paso === 1) {
      if (f.password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.')
    }
    if (paso === 3) {
      const edad = Number(f.edad)
      if (!(edad >= 8 && edad <= 90)) return setErr('Escribe una edad válida.')
      if (!/^\d{5}$/.test(f.cp)) return setErr('El código postal tiene 5 dígitos.')
    }
    if (paso < 4) setPaso(paso + 1); else void terminar()
  }

  const terminar = async () => {
    setBusy(true); setErr(null)
    const pend = { nombre: f.nombre.trim(), nivel: f.nivel, edad: Number(f.edad), genero: f.genero, cp: f.cp, tiempo: f.tiempo, optin: f.optin }
    const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password })
    if (error) { setErr(error.message); setBusy(false); return }
    if (!data.session) { guardarPendiente(pend); setRevisaCorreo(true); setBusy(false); return }
    const { error: e2 } = await supabase.rpc('ranked_registrar_jugador', {
      p_nombre: pend.nombre, p_nivel: pend.nivel, p_edad: pend.edad, p_genero: pend.genero, p_cp: pend.cp, p_tiempo: pend.tiempo, p_optin: pend.optin,
    })
    if (e2) { setErr('No se pudo crear tu perfil: ' + e2.message); setBusy(false); return }
    await refresh(); nav(next)
  }

  if (revisaCorreo) return (
    <div className="mx-auto max-w-md"><div className="card rise p-7 text-center">
      <h1 className="mb-2 text-xl font-bold">Revisa tu correo</h1>
      <p className="text-sm text-soft">Te enviamos un enlace para confirmar tu cuenta. Al entrar por primera vez terminaremos de crear tu perfil automáticamente.</p>
      <Link to="/login" className="btn-primary mt-5">Ir a entrar</Link>
    </div></div>
  )

  return (
    <div className="mx-auto max-w-md">
      <div className="card rise p-7">
        <div className="mb-5 flex justify-center"><Logo size={36} /></div>
        <div className="mb-5 flex gap-1.5">{[1, 2, 3, 4].map((n) => <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= paso ? 'bg-terra' : 'bg-bg2'}`} />)}</div>
        <form onSubmit={avanzar} className="space-y-4" key={paso}>
          {paso === 1 && <div className="space-y-4 pop">
            <h1 className="text-lg font-bold">Crea tu cuenta</h1>
            <div><label className="label">Nombre</label><input className="input" required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
            <div><label className="label">Correo</label><input className="input" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className="label">Contraseña</label><input className="input" type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} /></div>
          </div>}
          {paso === 2 && <div className="space-y-4 pop">
            <h1 className="text-lg font-bold">Tu nivel de juego</h1>
            <div className="grid grid-cols-1 gap-2">
              {NIVELES.map((n) => (
                <button type="button" key={n.nombre} onClick={() => set('nivel', n.nombre)} className={`flex items-center justify-between rounded-btn border px-3 py-2 text-left text-sm transition ${f.nivel === n.nombre ? 'border-terra bg-terra/5' : 'border-line hover:bg-off'}`}>
                  <span><b>{n.nombre}</b> · {n.cat}</span><span className="text-xs text-soft">{n.desc}</span>
                </button>
              ))}
            </div>
            <div><label className="label">¿Cuánto tiempo llevas jugando?</label>
              <select className="input" value={f.tiempo} onChange={(e) => set('tiempo', e.target.value)}>{TIEMPOS.map((t) => <option key={t}>{t}</option>)}</select></div>
          </div>}
          {paso === 3 && <div className="space-y-4 pop">
            <h1 className="text-lg font-bold">Sobre ti</h1>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Edad</label><input className="input" inputMode="numeric" required value={f.edad} onChange={(e) => set('edad', e.target.value.replace(/\D/g, '').slice(0, 2))} /></div>
              <div><label className="label">Código postal</label><input className="input" inputMode="numeric" required value={f.cp} onChange={(e) => set('cp', e.target.value.replace(/\D/g, '').slice(0, 5))} /></div>
            </div>
            <div><label className="label">Género</label>
              <select className="input" value={f.genero} onChange={(e) => set('genero', e.target.value)}>{GENEROS.map((g) => <option key={g}>{g}</option>)}</select></div>
            <p className="text-xs text-soft">Estos datos son privados: solo tú y el administrador los ven.</p>
          </div>}
          {paso === 4 && <div className="space-y-4 pop">
            <h1 className="text-lg font-bold">Casi listo</h1>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-btn border border-line p-3">
              <span className="text-sm">Quiero recibir información de nuevas retas y torneos.</span>
              <input type="checkbox" role="switch" className="mt-1 h-5 w-9 cursor-pointer accent-[#C17A5A]" checked={f.optin} onChange={(e) => set('optin', e.target.checked)} />
            </label>
            <p className="text-xs text-soft">Es opcional y puedes cambiarlo cuando quieras.</p>
          </div>}
          <ErrorMsg msg={err} />
          <div className="flex gap-2">
            {paso > 1 && <button type="button" className="btn-ghost" onClick={() => setPaso(paso - 1)}>Atrás</button>}
            <button className="btn-primary flex-1" disabled={busy}>{paso === 4 ? (busy ? 'Creando…' : 'Crear cuenta') : 'Continuar'}</button>
          </div>
        </form>
        <p className="mt-5 text-center text-sm text-soft">¿Ya tienes cuenta? <Link className="font-semibold text-terra" to={'/login' + (params.get('next') ? `?next=${encodeURIComponent(next)}` : '')}>Entrar</Link></p>
      </div>
    </div>
  )
}
