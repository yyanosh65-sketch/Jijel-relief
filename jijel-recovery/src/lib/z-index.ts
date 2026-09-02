/** Shared stacking scale for map overlays, drawers, and modals. */
export const Z_MAP_TILES = "z-10";
export const Z_MAP_LEGEND = "z-20";
export const Z_MAP_FLOATING = "z-30";
export const Z_MAP_HINT = "z-[300]";
export const Z_DRAWER = "z-40";
export const Z_MAP_PRIMARY_ACTION = "z-[400]";
export const Z_MODAL = "z-50";

export const MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-[9000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md";

export const MODAL_SHELL_CLASS =
  "relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl";

export const MODAL_HEADER_CLASS =
  "shrink-0 border-b border-slate-800 bg-slate-900 p-5";

export const MODAL_BODY_SCROLL_CLASS =
  "modal-body-scroll flex-1 space-y-4 overflow-y-auto p-6";
