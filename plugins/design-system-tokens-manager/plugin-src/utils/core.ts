import { EConstants, EDTFCompositeTypes, EExtensionProp, METADATA_KEYS, TCollectionPayload, TPathData, TPreProcessedDataObject, TProcessedData, TTokenData } from "../types";
import { getCollectionName, getCollectionVersion } from "./collection";
import { deconstructPath, getValueByPath } from "./helper";
import { processToken } from './mappers/token'

export function iterateJson(jsonObj: any, path: string[] = []): TPreProcessedDataObject {
  try {
    const { key } = deconstructPath(path)

    if (METADATA_KEYS.includes(key as EConstants)) {
      return []
    }

    const type = (jsonObj?.$type || '')

    if (typeof jsonObj === 'object') {
      switch (type) {
        case EDTFCompositeTypes.TYPOGRAPHY:
        case EDTFCompositeTypes.BORDER:
        case EDTFCompositeTypes.SHADOW:
          return [
            {
              path: `${path.join(EConstants.DOT_PATH_DELIMITER)}.${EConstants.TYPE_KEY}`,
              value: jsonObj.$type
            },
            {
              path: `${path.join(EConstants.DOT_PATH_DELIMITER)}.${EConstants.VALUE_KEY}`,
              value: jsonObj.$value
            },
          ]

        default:
          if (Array.isArray(jsonObj)) {
            const [item] = jsonObj

            if (item[EConstants.METADATA_KEY_NAME]) {
              return jsonObj.reduce((acc, item) => {
                const parentPath = [...path, item.$name].join(EConstants.DOT_PATH_DELIMITER)

                return [
                  ...acc,
                  { path: `${parentPath}.${EConstants.TYPE_KEY}`, value: item[EConstants.TYPE_KEY] },
                  { path: `${parentPath}.${EConstants.VALUE_KEY}`, value: { ...item.$value } },
                ];
              }, [] as { path: string; value: any }[])
            } else {
              return [{
                path: path.join(EConstants.DOT_PATH_DELIMITER),
                value: jsonObj.join(', ')
              }]
            }

          } else {
            return Object.keys(jsonObj).reduce((acc, key) => {
              const value = jsonObj[key];
              const newPath = [...path, key];
              return acc.concat(iterateJson(value, newPath));
            }, [] as { path: string; value: any }[]);
          }
      }
    } else {
      return [{ path: path.join(EConstants.DOT_PATH_DELIMITER), value: jsonObj }];
    }
  } catch (error) {
    console.error('Error reading data object', error)
    return []
  }
}

export async function processData(data: TPreProcessedDataObject, sourceData: TCollectionPayload['payload']): Promise<TProcessedData> {
  const modes: string[] = []

  const processedData: TProcessedData['$tokens'] = await data.reduce(async (resolvedData, pathData: TPathData) => {
    const { path } = pathData
    const { key, parentKey } = deconstructPath(path)

    if (parentKey === EExtensionProp.MODE) {
      modes.push(key)
    }

    if (key !== EConstants.VALUE_KEY) {
      return await resolvedData
    }

    const checkPath = path.replace(`${EConstants.DOT_PATH_DELIMITER}${parentKey}${EConstants.DOT_PATH_DELIMITER}${EConstants.VALUE_KEY}`, '')
    const valueObj = getValueByPath({ sourceData }, checkPath)
    let refToken = {}

    if (Array.isArray(valueObj)) {
      const refPath = path.replace(`${EConstants.DOT_PATH_DELIMITER}${parentKey}${EConstants.DOT_PATH_DELIMITER}${EConstants.VALUE_KEY}`, '')
      refToken = (getValueByPath({ sourceData }, refPath) as { $name: string }[]).find(({ $name }) => $name === parentKey) || {}
    }

    return {
      ...await resolvedData,
      ...processToken(pathData, { data, sourceData, refToken })
    }

  }, Promise.resolve({}))

  return {
    $metaData: {
      $modes: [EConstants.DEFAULT_MODE as string, ...[...new Set(modes)].sort()],
      $collectionName: getCollectionName(sourceData),
      $version: getCollectionVersion(sourceData),
    },
    $tokens: processedData,
  }
}
