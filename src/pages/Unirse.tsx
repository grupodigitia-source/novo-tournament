import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Empty } from '../components/ui'

const MSG: Record<string, { t: string; d: string }> = {
  confirmada: { t: 'Estás inscrito', d: 'Tu lugar en la reta está confirmado. Nos vemos en la cancha.' },
  pendiente: { t: 'Solicitud en revisión', d: 'Esta reta es de un nivel distinto al tuyo. El administrador revisará tu solicitud.' },
  llena: { t: 'Cupo lleno', d: 'Esta reta ya no tiene lugares disponibles.' },
  cerrada: { t: 'Reta cerrada', d: 'Las inscripciones de esta reta ya están cerradas.' },
  rechazada: { t: 'Solicitud rechazada', d: 'El administrador no aprobó tu inscripción a esta reta.' },
}

export default function Unirse() {
  const { codigo = '' } = useParams()
  const { session, player, loading } = useAuth()
  const [estado, setEstado] = useState<string | null>(null)
  const [ya, setYa] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const hecho = useRef(false)

  useEffect(() => {
    if (!session || !player || hecho.current) return
    hecho.current = true
    supabase.rpc('ranked_inscribirme', { p_codigo: codigo }).then(({ data, error }) => {
      if (error) setErr(error.message.includes('sesion_no_existe') ? 'Este QR no corresponde a ninguna reta.' : error.message)
      else { setEstado((data as { estado: string }).estado); setYa(Boolean((data as { ya_inscrito?: boolean }).ya_inscrito)) }
    })
  }, [session, player, codigo])

  if (loading) return <Empty>Cargando…</Empty>
  const next = encodeURIComponent(`/r/${codigo}`)
  if (!session) return <Navigate to={`/login?next=${next}`} replace />
  if (!player) return <Navigate to={`/registro?next=${next}`} replace />

  const m = estado ? MSG[estado] : null
  return (
    <div className="mx-auto max-w-md"><div className="card rise p-7 text-center">
      {err ? <><h1 className="mb-2 text-xl font-bold">No se pudo inscribir</h1><p className="text-sm text-neg">{err}</p></>
        : m ? <><h1 className="mb-2 text-xl font-bold">{ya ? 'Ya estabas inscrito' : m.t}</h1><p className="text-sm text-soft">{m.d}</p></>
        : <p className="text-sm text-soft">Inscribiéndote…</p>}
      <Link to="/retas" className="btn-ghost mt-5">Ver retas</Link>
    </div></div>
  )
}
