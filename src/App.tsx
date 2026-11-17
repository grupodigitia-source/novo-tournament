import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Tabla from './pages/Tabla'
import Retas from './pages/Retas'
import TV from './pages/TV'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Unirse from './pages/Unirse'
import Perfil from './pages/Perfil'
import AdminLayout from './pages/admin/AdminLayout'
import Jugadores from './pages/admin/Jugadores'
import Programar from './pages/admin/Programar'
import EnVivo from './pages/admin/EnVivo'
import Resultados from './pages/admin/Resultados'
import Simulador from './pages/admin/Simulador'
import QRPrint from './pages/admin/QRPrint'
import { configured } from './lib/supabase'

export default function App() {
  if (!configured) return <p className="p-8 text-sm">Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Revisa .env.example.</p>
  return (
    <Routes>
      <Route path="/tv" element={<TV />} />
      <Route element={<Layout />}>
        <Route index element={<Tabla />} />
        <Route path="retas" element={<Retas />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="r/:codigo" element={<Unirse />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Jugadores />} />
          <Route path="programar" element={<Programar />} />
          <Route path="vivo" element={<EnVivo />} />
          <Route path="resultados"element={<Resultados />} />
          <Route path="simulador" element={<Simulador />} />
          <Route path="qr/:id" element={<QRPrint />} />
        </Route>
        <Route path="*" element={<p className="text-sm text-soft">Página no encontrada.</p>} />
      </Route>
    </Routes>
  )
}
