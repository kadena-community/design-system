export enum EViews {
  SELECTION = "selection",
  FORM = "form",
  ICONS = "icons",
}

export enum EExtensions {
  MODE = "mode",
  MODIFIER = "modifier",
}

export enum EActions {
  CREATE_COLLECTION,
  SELECTION_CHANGE,
  CHECK_SELECTION,
  LIBRARY_DATA,
  UPDATE_COLLECTION_VARIABLES,
  RELOAD_SWAP_UI,
  COLLECT_EXISTING_ICONS,
  PAGE_ICONS_DATA,
  UPDATE_ICONS,
  ICON_SELECTION_CHANGE,
  INIT_ALL_ICONS,
}

export type TActionParams<T> = T | {
  [key: string]: any
}

export type TDataContext = "foundation" | "button"
