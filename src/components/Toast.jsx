import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

const TYPE_CONFIG = {
  error: {
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: AlertCircle,
    iconColor: '#f87171',
  },
  success: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle,
    iconColor: '#34d399',
  },
  info: {
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    icon: Info,
    iconColor: '#38bdf8',
  },
};

const variants = {
  initial: { opacity: 0, x: 80, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.95, transition: { duration: 0.2 } },
};

export default function Toast({ toasts = [], onDismiss }) {
  // Keep a ref to onDismiss so the timeout callback always sees the latest version
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!toasts.length || !onDismissRef.current) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        onDismissRef.current?.(t.id);
      }, 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 min-w-[280px] max-w-[380px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`
                pointer-events-auto
                relative flex items-start gap-3 px-4 py-3
                ${config.bg} ${config.border}
                border backdrop-blur-xl rounded-xl shadow-2xl
              `}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                <Icon size={18} color={config.iconColor} strokeWidth={2} />
              </div>

              {/* Message */}
              <p className={`flex-1 text-sm leading-snug ${config.text}`}>
                {toast.message}
              </p>

              {/* Close button */}
              <button
                onClick={() => onDismiss?.(toast.id)}
                className="shrink-0 p-0.5 rounded-md opacity-40 hover:opacity-100 transition-opacity text-iron-400 hover:text-iron-200"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
