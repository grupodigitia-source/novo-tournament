import { useEffect } from 'react'

/** Expone --mx, --my (mouse 0..1) y --sp (avance de scroll 0..1) para la decoración. */
export function useScrollFx() {
  useEffect(() => {
    const root = document.documentElement
    const onMove = (e: MouseEvent) => {
      root.style.setProperty('--mx', String(e.clientX / window.innerWidth))
      root.style.setProperty('--my', String(e.clientY / window.innerHeight))
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      root.style.setProperty('--sp', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
    }
    onScroll()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
}
