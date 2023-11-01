import { EActions, TActionParams, TDataContext } from '../../ui-src/types'

export enum EConstants {
  METADATA_KEY_NAME = '$name',
  METADATA_KEYS_VERSION = '$version',
  PRESERVED_KEY_SYMBOL = '$',
  VALUE_KEY = '$value',
  TYPE_KEY = '$type',
  DESCRIPTION_KEY = '$description',
  TITLE_KEY = '$title',
  EXTENSIONS = '$extensions',
  DOT_PATH_DELIMITER = '.',
  DEFAULT_MODE = 'light',
  TOKEN_NAME_DELIMITER = '/',
  BASE_FONT_SIZE = 16,
}

export enum EDTFTypes {
  COLOR = 'COLOR',
  DIMENSION = 'DIMENSION',
  FONTFAMILY = 'FONTFAMILY',
  NUMBER = 'NUMBER',
}

export enum EDTFCompositeTypes {
  BORDER = 'BORDER',
  TRANSITION = 'TRANSITION',
  SHADOW = 'SHADOW',
  GRADIENT = 'GRADIENT',
  TYPOGRAPHY = 'TYPOGRAPHY',
}

export enum ETokenResolvedType {
  COLOR = 'COLOR',
  BOOLEAN = 'BOOLEAN',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  EFFECT = 'EFFECT',
}

export enum EExtensionProp {
  ALPHA = 'ALPHA',
}

export enum EExtensionPropPath {
  ALPHA = '@',
}

export const METADATA_KEYS = [
  EConstants.METADATA_KEY_NAME,
  EConstants.METADATA_KEYS_VERSION,
]

export enum EExtensionKey {
  EXTENSION_TYPE_MODIFIER = 'modifier',
  EXTENSION_TYPE_MODE = 'mode',
}

export type TExtensionTypeStyle = {
  [key: string]: any
}
export type TExtensionTypeMode = {
  [key: string]: string
}

export type TAction<T> = {
  type: EActions
  params?: TActionParams<T>,
}

export type TCollectionPayload = {
  name: string
  isReset: boolean
  payload: TJsonData
}

export type TJsonData = {
  kda: {
    context: TDataContext
  },
  $name: string,
  $version: `${number}.${number}.${number}`
}

/**
 * utils/core.ts
 */

export type TPathData = {
  path: string
  value: string
}
export type TPreProcessedDataObject = TPathData[]

export type TProcessedData = {
  $metaData: {
    $collectionName: string,
    $modes: string[],
    $version: TJsonData['$version'],
  },
  $tokens: {
    [key: TTokenKey]: TTokenData
  }
}

type TExtensionKeys =
  EExtensionKey.EXTENSION_TYPE_MODE |
  EExtensionKey.EXTENSION_TYPE_MODIFIER

export type TExtension = {
  [key in TExtensionKeys]?: any
}
export type TTokenRootValue = {
  $description: string,
  $extensions: TExtension,
  extensionType: TTokenData['type'],
}
export type TTokenKey = string
export type TTokenData = {
  name: string,
  type: EDTFTypes | EDTFCompositeTypes,
  title: string,
  description: string,
  value: string,
  variableAlias?: VariableAlias,
  fallbackValue?: any | null,
  key: string,
  parentKey: string,
  groupName: string,
  path: string,
  rootKey: string,
  extensionProps?: {
    $base: string,
    $modes: string[],
    $refKey: string,
    $type: EExtensionProp,
    $value: any,
  },
  $extension?: TExtension,
  isExtension: boolean,
}

export type TTokenDataTranspiled = TTokenData & {
  isAlias: boolean
}

export type TPreTranspiledData = {
  source: TTokenDataTranspiled[],
  aliases: TTokenData[],
  tokens: TTokenData[],
  styles: {
    texts: TextStyle[]
    effects: EffectStyle[]
  }
}

export type TTranspiledTokenData = {
  local: Variable[],
  tokens: TTokenData[],
  aliases: TTokenData[],
  sum: number,
}

export type TTokenMetaData = {
  collectionId: string
  modes: TTokenMetaData
}

export type TTranspiledCollectionData = {
  items: VariableCollection[]
}

export type TTranspiledData = {
  variables: TTranspiledTokenData,
  collections: TTranspiledCollectionData,
  styles: TPreTranspiledData['styles'],
  status: {
    tokens: {
      added: string[],
      failed: string[]
    }
  }
}

export type TCreateTokenMetaData = {
  collection: VariableCollection,
  metaData: TProcessedData['$metaData']
  localVariables: Variable[]
  styles: TPreTranspiledData['styles']
}

export type TValueForMode = {
  mode: VariableCollection['modes'][0]
  defaultMode: string
}

export type TTokenIterationArgs = {
  tokens: TTokenData[],
  collection: VariableCollection,
  data: TProcessedData,
  localVariables: Variable[]
  styles: TPreTranspiledData['styles']
  isSkipStyles?: boolean,
}

export type TRGBA = { r: number; g: number; b: number; a: number }

export type TFontProps = {
  fontFamily?: string,
  fontSize?: number,
  fontWeight?: string | number,
  letterSpacing?: string,
  lineHeight?: string | number,
}

export enum EDimensionUnitSymbol {
  REMS = 'rem',
  PIXELS = 'px',
  PERCENT = '%'
}

export enum EDimensionUnit {
  AUTO = 'AUTO',
  PIXELS = 'PIXELS',
  PERCENT = 'PERCENT'
}

export type TEffectProps = {
  color?: string,
  offsetX?: number,
  offsetY?: number,
  blur?: number,
  spread?: number
}

export type TStrokeStyle = "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "outset" | "inset"

export type TBorderProps = {
  color?: string,
  width?: string,
  style?: TStrokeStyle
}
