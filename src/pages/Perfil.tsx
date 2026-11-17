import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Empty, NivelBadge, Title } from '../components/ui'

export default function Perfil() {
  const { session, player, loading, isAdmin } = useAuth()
  const [optin, setOptin] = useState<boolean | null>(null)
  useEffect(() => {
    if (!session) return
    supabase.from('ranked_player_profiles').select('acepta_comunicaciones').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setOptin(data ? Boolean(data.acepta_comunicaciones) : null))
  }, [session])
  if (loading) return <Empty>Cargando…</Empty>
  if (!session) return <Navigate to="/login" replace />
  if (!player) return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/registro" replace />

  const toggle = async (v: boolean) => {
    setOptin(v)
    await supabase.from('ranked_player_profiles').update({ acepta_comunicaciones: v }).eq('user_id', session.user.id)
  }
  return (
    <div className="mx-auto max-w-md">
      <Title>Mi perfil</Title>
      <div className="card rise p-6">
        <div className="flex items-center justify-between">
          <div><div className="text-lg font-bold">{player.nombre}</div><div className="mt-1"><NivelBadge nivel={player.nivel} /></div></div>
          <div className="text-right"><div className="text-3xl font-bold tabular-nums">{player.puntos}</div><div className="text-xs text-soft">puntos</div></div>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 rounded-card border border-line p-5">
          <QRCodeSVG value={player.codigo ?? player.id} size={150} fgColor="#111111" />
          <div className="text-sm font-bold tracking-widest">{player.codigo}</div>
          <div className="text-xs text-soft">Tu ID de jugador</div>
        </div>
        {optin !== null && (
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 text-sm">
            <span>Recibir información de retas y torneos</span>
            <input type="checkbox" role="switch" className="h-5 w-9 cursor-pointer accent-[#C17A5A]" checked={optin} onChange={(e) => void toggle(e.target.checked)} />
          </label>
        )}
      </div>
    </div>
  )
}
