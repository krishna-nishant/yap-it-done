import { useRef } from 'react'
import gsap from 'gsap'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(GSAPSplitText, useGSAP)

// React Bits–style split text: characters rise in with a soft blur.
export default function SplitText({ text, as: Tag = 'span', className = '', delay = 0, stagger = 0.025 }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      if (!ref.current) return
      const split = GSAPSplitText.create(ref.current, { type: 'chars,words', charsClass: 'inline-block' })
      gsap.from(split.chars, {
        yPercent: 60,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 0.8,
        ease: 'expo.out',
        stagger,
        delay,
      })
      return () => split.revert()
    },
    { scope: ref, dependencies: [text] },
  )

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text}
    </Tag>
  )
}
