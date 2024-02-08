import {
  TCollectionPayload,
  TPreProcessedDataObject,
  TPathData,
  TProcessedData,
  EConstants,
  TTokenData,
  TDesignTokenFormat,
  EExtensionProp,
} from "../../types";
import { getTokenExtensionModifier, mapTokenExtensions } from "../extension";
import {
  convertPathToName,
  deconstructPath,
  getValueByPath
} from "../helper";
import { parseToken } from "./parse";

export type TProcessPathDataArgs = { data: TPreProcessedDataObject, sourceData: TCollectionPayload['payload'], refToken: any }

export function processToken(pathData: TPathData, payloadData: TProcessPathDataArgs): TProcessedData['$tokens'] {
  const { path, value } = pathData
  const name = convertPathToName(path)
  const pathDataConst = deconstructPath(path)
  const { key, parentKey, groupName, isExtension, rootKey } = pathDataConst
  const pathDelimiter = isExtension ? EConstants.EXTENSIONS : key
  const [refPath] = path.split(`${EConstants.DOT_PATH_DELIMITER}${pathDelimiter}`)
  let refToken: TDesignTokenFormat = getValueByPath(payloadData, refPath)
  const modeVariants = refToken?.$extensions?.[EExtensionProp.MODE]
  let altTokenData = {}

  if (!refToken) {
    const { refToken: _refToken } = payloadData
    altTokenData = {
      name: name ?? _refToken.$name,
      description: refToken?.[EConstants.DESCRIPTION_KEY] ?? _refToken?.[EConstants.DESCRIPTION_KEY],
      title: (refToken?.[EConstants.TITLE_KEY] ?? parentKey) ?? _refToken?.[EConstants.TITLE_KEY],
      type: refToken?.[EConstants.TYPE_KEY] ?? _refToken?.[EConstants.TYPE_KEY],
    }
  }

  const token: TTokenData = {
    name,
    type: refToken?.[EConstants.TYPE_KEY],
    title: refToken?.[EConstants.TITLE_KEY] ?? parentKey,
    description: refToken?.[EConstants.DESCRIPTION_KEY],
    value,
    prevValue: value,
    key,
    parentKey,
    groupName,
    path,
    rootKey,
    modifier: getTokenExtensionModifier(refToken?.$extensions),
    extensions: isExtension || !!modeVariants ? mapTokenExtensions(refToken, pathDataConst) : refToken?.[EConstants.EXTENSIONS] || null,
    isExtension,
    ...altTokenData,
  }

  token.isExtension = !!token.extensions

  return parseToken(token)
}


