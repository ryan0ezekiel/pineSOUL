import { useEffect, useRef } from 'react';
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

const DISMISS_MS = 3000;

export default function Toast({ toasts = [], onDismiss }) {
  // Keep a ref to onDismiss so the timeout callback always sees the latest version
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Track creation timestamps so dismissed toasts don't reset remaining toasts' timers
  const createdRef = useRef(new Map());

  const MAX_TOASTS = 5;

  useEffect(() => {
    if (!toasts.length || !onDismissRef.current) return;

    // Auto-dismiss excess toasts (keep only the newest MAX_TOASTS)
    if (toasts.length > MAX_TOASTS) {
      const excess = toasts.slice(0, toasts.length - MAX_TOASTS);
      excess.forEach((t) => onDismissRef.current?.(t.id));
      return;
    }

    // Prune timestamps for toasts that no longer exist
    for (const id of createdRef.current.keys()) {
      if (!toasts.some((t) => t.id === id)) {
        createdRef.current.delete(id);
      }
    }

    const timers = toasts.map((t) => {
      // Record creation time for new toasts
      if (!createdRef.current.has(t.id)) {
        createdRef.current.set(t.id, Date.now());
      }
      const elapsed = Date.now() - createdRef.current.get(t.id);
      const remaining = Math.max(0, DISMISS_MS - elapsed);
      return setTimeout(() => {
        createdRef.current.delete(t.id);
        onDismissRef.current?.(t.id);
      }, remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 min-w-[280px] max-w-[380px] pointer-events-none" role="log" aria-label="Notifications" aria-live="polite">
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
              <p className={`flex-1 text-sm leading-snug ${config.text}`} role={toast.type === 'error' ? 'alert' : 'status'}>
                {toast.message}
              </p>

              {/* Close button */}
              <button
                onClick={() => onDismiss?.(toast.id)}
                aria-label="Dismiss notification"
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
