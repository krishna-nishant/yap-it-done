import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

// Button that leans toward the cursor (GSAP quickTo) and springs back.
export default function MagneticButton({ children, className = '', strength = 0.25, ...props }) {
  const ref = useRef(null)

  const { contextSafe } = useGSAP({ scope: ref })

  const onMove = contextSafe((e) => {
    const el = ref.current
    const r = el.getBoundingClientRect()
    gsap.to(el, {
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
      duration: 0.4,
      ease: 'power3.out',
    })
  })
  const onLeave = contextSafe(() => gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }))
  const onDown = contextSafe(() => gsap.to(ref.current, { scale: 0.95, duration: 0.12 }))
  const onUp = contextSafe(() => gsap.to(ref.current, { scale: 1, duration: 0.3, ease: 'back.out(3)' }))

  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onMouseDown={onDown} onMouseUp={onUp} className={className} {...props}>
      {children}
    </button>
  )
}
