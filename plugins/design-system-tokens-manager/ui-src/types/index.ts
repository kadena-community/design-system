export enum EExtensions {
  MODE = "mode",
  MODIFIER = "modifier",
}

export enum EActions {
  CREATE_COLLECTION,
}

export type TActionParams<T> = T | {
  [key: string]: any
}

export type TDataContext = "foundation" | "button"
