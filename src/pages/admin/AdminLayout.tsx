import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Empty } from '../../components/ui'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-btn px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-terra text-white' : 'text-soft hover:bg-off hover:text-ink'}`

export default function AdminLayout() {
  const { isAdmin, session, loading } = useAuth()
  if (loading) return <Empty>Cargando…</Empty>
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Empty>Esta sección es solo para administradores.</Empty>
  return (
    <div>
      <nav className="no-print mb-6 flex flex-wrap gap-1">
        <NavLink to="/admin" end className={tab}>Jugadores</NavLink>
        <NavLink to="/admin/programar" className={tab}>Programar reta</NavLink>
        <NavLink to="/admin/resultados" className={tab}>Capturar resultado</NavLink>
        <NavLink to="/admin/simulador" className={tab}>Simulador</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
