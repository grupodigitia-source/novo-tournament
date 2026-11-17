export type Nivel = 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Diamante' | 'Élite' | 'Leyenda'

export const NIVELES: { nombre: Nivel; cat: string; desc: string }[] = [
  { nombre: 'Bronce', cat: '7ª', desc: 'Estás empezando' },
  { nombre: 'Plata', cat: '6ª', desc: 'Ya mantienes el punto' },
  { nombre: 'Oro', cat: '5ª', desc: 'Juego constante' },
  { nombre: 'Platino', cat: '4ª', desc: 'Competitivo' },
  { nombre: 'Diamante', cat: '3ª', desc: 'Muy competitivo' },
  { nombre: 'Élite', cat: '2ª', desc: 'Nivel de torneo' },
  { nombre: 'Leyenda', cat: '1ª', desc: 'La cima' },
]

export const nivelIdx = (n: string) => NIVELES.findIndex((x) => x.nombre === n)
export const nivelCat = (n: string) => NIVELES[nivelIdx(n)]?.cat ?? ''

/** Puede unirse a retas de su nivel o de un nivel arriba. */
export const puedeUnirse = (jugador: string, reta: string) => {
  const d = nivelIdx(reta) - nivelIdx(jugador)
  return d === 0 || d === 1
}
