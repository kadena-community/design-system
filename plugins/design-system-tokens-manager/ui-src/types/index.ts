export enum EViews {
  SELECTION = "selection",
  FORM = "form",
}

export enum EExtensions {
  MODE = "mode",
  MODIFIER = "modifier",
}

export enum EActions {
  CREATE_COLLECTION,
  SELECTION_CHANGE,
  CHECK_SELECTION,
  TEAM_LIBRARY_DATA,
  GET_COLLECTION_VARIABLES,
  RELOAD_SWAP_UI,
}

export type TActionParams<T> = T | {
  [key: string]: any
}

export type TDataContext = "foundation" | "button"
