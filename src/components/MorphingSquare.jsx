import { motion } from 'framer-motion'

export default function MorphingSquare({ message = 'CARGANDO...' }) {
  return (
    <div className="flex flex-col gap-3 items-center justify-center">
      <motion.div
        className="w-10 h-10 bg-accent-soft rounded-lg"
        animate={{
          borderRadius: ['6%', '50%', '6%'],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {message && <div className="text-sm text-muted tracking-[2px]">{message}</div>}
    </div>
  )
}
