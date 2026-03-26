export const PREVIEW_FONT_STACK =
  'Menlo, Monaco, "SF Mono", "Hiragino Sans GB", "PingFang SC", "Noto Sans CJK SC", "Courier New", monospace';
export const PREVIEW_FONT_SIZE = 13;
export const PREVIEW_COLS = 120;
export const PREVIEW_ROWS = 30;
export const PREVIEW_TARGET_WIDTH = 320;
export const PREVIEW_MAX_HEIGHT = Math.round(PREVIEW_TARGET_WIDTH * 1.618);
export const PREVIEW_MIN_HEIGHT = Math.round(PREVIEW_TARGET_WIDTH * 0.62);
export const PREVIEW_SCROLLBACK = 800;
export const PREVIEW_BG = '#0b0d12';
export const PREVIEW_FG = '#e2e8f0';
export const PREVIEW_LINES = 90;
export const PREVIEW_REFRESH_MS = 200;
export const PREVIEW_ATTACH_DELAY_MS = 200;
export const PREVIEW_WARMUP_DELAY_MS = 160;

export const HUD_ROW_COUNT = 3;
export const HUD_TILE_HEIGHT = 96;
export const HUD_TILE_GAP = 8;
export const HUD_GRID_HEIGHT = HUD_ROW_COUNT * HUD_TILE_HEIGHT + (HUD_ROW_COUNT - 1) * HUD_TILE_GAP;
export const HUD_HEADER_HEIGHT = 32;
export const HUD_COLLAPSED_HEIGHT = HUD_HEADER_HEIGHT + HUD_GRID_HEIGHT + 32;
export const HUD_FIXED_HEIGHT = Math.round(HUD_COLLAPSED_HEIGHT * 0.58);

export const CARD_GAP = 10;
export const CARD_MARGIN = 12;
export const HOVER_INFO_HEIGHT = 24;
export const HOVER_OPEN_DELAY = 140;
export const HOVER_CLOSE_DELAY = 120;
export const ROW_TOP_TOLERANCE = 6;
