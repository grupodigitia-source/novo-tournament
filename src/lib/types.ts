export interface Player {
  id: string
  nombre: string
  nivel: string
  puntos: number
  activo: boolean
  codigo: string | null
  user_id: string | null
}
export interface Sesion {
  id: string
  fecha: string
  nivel: string
  cupo: number
  codigo: string
  estado: 'abierta' | 'cerrada' | 'cancelada'
}
export interface Inscripcion {
  id: string
  sesion_id: string
  player_id: string
  estado: 'confirmada' | 'pendiente' | 'rechazada'
}
export interface Reta {
  id: string
  jugador_a: string
  jugador_b: string
  fecha: string
  estado: 'pendiente' | 'jugada' | 'cancelada'
  sets_a: number | null
  sets_b: number | null
  ganador: string | null
  delta_a: number | null
  delta_b: number | null
  sesion_id: string | null
}
