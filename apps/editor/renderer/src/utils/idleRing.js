const ACTIVE_RGB = [52, 211, 153]; // emerald-400
const INACTIVE_RGB = [148, 163, 184]; // slate-400
const CLOSED_RGB = [100, 116, 139]; // slate-500
const IDLE_MAX_MS = 15 * 60 * 1000;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const lerp = (from, to, ratio) => Math.round(from + (to - from) * ratio);

const toRgba = (rgb, alpha = 0.9) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

export const resolveIdleRingColor = ({ idleMs, isClosed = false } = {}) => {
  if (isClosed) {
    return toRgba(CLOSED_RGB, 0.7);
  }
  if (!Number.isFinite(idleMs)) {
    return toRgba(INACTIVE_RGB, 0.6);
  }
  const ratio = clamp01(idleMs / IDLE_MAX_MS);
  const mixed = [
    lerp(ACTIVE_RGB[0], INACTIVE_RGB[0], ratio),
    lerp(ACTIVE_RGB[1], INACTIVE_RGB[1], ratio),
    lerp(ACTIVE_RGB[2], INACTIVE_RGB[2], ratio),
  ];
  return toRgba(mixed, 0.9);
};

export const resolveIdleRingStyle = ({ idleMs, isClosed = false } = {}) => ({
  borderColor: resolveIdleRingColor({ idleMs, isClosed }),
});

export const IDLE_RING_MAX_MS = IDLE_MAX_MS;
