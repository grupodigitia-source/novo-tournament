import { Link, NavLink, Outlet } from 'react-router-dom'
import { Decor } from './Decor'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-btn px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-off text-ink' : 'text-soft hover:text-ink'}`

export function Layout() {
  const { session, player, isAdmin, signOut } = useAuth()
  return (
    <div className="relative min-h-screen bg-bg2/40">
      <Decor />
      <header className="sticky top-0 z-30 border-b border-line glass no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={link}>Tabla</NavLink>
            <NavLink to="/retas" className={link}>Retas</NavLink>
            <NavLink to="/tv" className={link}>TV</NavLink>
            {isAdmin && <NavLink to="/admin" className={link}>Admin</NavLink>}
            {session ? (
              <>
                {player && <NavLink to="/perfil" className={link}>{player.codigo}</NavLink>}
                <button className="btn-ghost !py-1.5" onClick={() => void signOut()}>Salir</button>
              </>
            ) : (
              <Link to="/login" className="btn-primary !py-1.5">Entrar</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  )
}
