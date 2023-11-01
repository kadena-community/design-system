export enum EExtensions {
  MODE = "mode",
  STYLE = "style",
}

export enum EActions {
  CREATE_COLLECTION,
}

export type TActionParams<T> = T | {
  [key: string]: any
}

export type TDataContext = "foundation" | "button"
