import { EConstants, EDTFCompositeTypes, EExtensionKey, METADATA_KEYS, TCollectionPayload, TJsonData, TPathData, TPreProcessedDataObject, TPreTranspiledData, TProcessedData, TTokenData, TTokenDataTranspiled, TTokenRootValue, TTranspiledData, TTranspiledTokenData } from "../types";
import { getCollectionName, getCollectionVersion, initCollection } from "./collection";
import { convertPathToName, deconstructPath, getValueByPath, hasAliasValue, setVariableDataType } from "./helper";
import { getLocalVariables, iterateTokens } from "./variable";

export function iterateJson(jsonObj: any, path: string[] = []): TPreProcessedDataObject {
  try {
    const { key } = deconstructPath(path)

    if (METADATA_KEYS.includes(key as EConstants)) {
      return []
    }

    const type = (jsonObj?.$type || '').toUpperCase()

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

  const processedData = await data.reduce((resolvedData, { path, value }: TPathData) => {
    const { key, parentKey, groupName, isExtension, rootKey, refKey } = deconstructPath(path.split(EConstants.DOT_PATH_DELIMITER))
    const [rootValuePath] = path.split(`${EConstants.DOT_PATH_DELIMITER}${rootKey}${EConstants.DOT_PATH_DELIMITER}${groupName}`)
    const getPath = `${rootValuePath}${EConstants.DOT_PATH_DELIMITER}${rootKey}`
    let rootValue = isExtension ? getValueByPath(sourceData, getPath) : null
    const fallbackValue = isExtension ? rootValue.$value : null
    const parentPath = [...path.split(`${EConstants.DOT_PATH_DELIMITER}${key}`), EConstants.EXTENSIONS].filter(d => d).join(EConstants.DOT_PATH_DELIMITER)
    const $extension = getValueByPath(sourceData, parentPath)

    if (rootValue) {
      rootValue = {
        ...rootValue,
        extensionType: parentKey,
      } as TTokenRootValue
    }

    if (parentKey === EExtensionKey.EXTENSION_TYPE_MODE) {
      modes.push(key)
    }

    if (key !== EConstants.VALUE_KEY) {
      return resolvedData
    }

    const tokenPathParts = path.split(EConstants.DOT_PATH_DELIMITER)
    tokenPathParts.pop()
    const tokenPath = [...(tokenPathParts || [])].join(EConstants.DOT_PATH_DELIMITER)
    const values = getValueByPath(sourceData, tokenPath)

    const checkArrayPath = tokenPath.split(EConstants.DOT_PATH_DELIMITER)
    const levelPath = checkArrayPath.pop()
    const checkPath = checkArrayPath.join(EConstants.DOT_PATH_DELIMITER)
    const checkValues = getValueByPath(sourceData, checkPath)

    if (!values) {
      const newValues = getNewValues(checkValues, {
        checkPath,
        levelPath,
        sourceData,
        rootValue,
        fallbackValue,
      })

      return {
        ...resolvedData,
        ...newValues,
      }
    }


    return resolveData(resolvedData, {
      tokenPath,
      rootKey,
      path,
      title: values ? values[EConstants.TITLE_KEY] : null,
      value,
      key: key as string,
      parentKey,
      groupName,
      isExtension,
      description: values ? values[EConstants.DESCRIPTION_KEY] : null,
      type: setVariableDataType(values[EConstants.TYPE_KEY]),
      ...(isExtension || !$extension ? {} : { $extension }),
      ...(!!rootKey && isExtension ? {
        extensionProps: {
          ...rootValue[groupName][parentKey],
          $refKey: refKey,
        }
      } : {}),
      fallbackValue,
    })
  }, Promise.resolve({}) as Promise<TProcessedData['$tokens']>)

  return {
    $metaData: {
      $modes: [EConstants.DEFAULT_MODE as string, ...[...new Set(modes)].sort()],
      $collectionName: getCollectionName(sourceData),
      $version: getCollectionVersion(sourceData),
    },
    $tokens: processedData,
  }
}

type TNewValuesParams = {
  checkPath: string,
  levelPath?: string,
  sourceData: TJsonData,
  rootValue: {
    [key: string]: any
  },
  fallbackValue: string,
}

function getNewValues(checkValues: any, params: TNewValuesParams) {
  const {
    checkPath,
    levelPath,
    sourceData,
    rootValue,
    fallbackValue,
  } = params
  return checkValues.reduce((acc: any, nestedValues: any) => {
    const path = `${checkPath}${EConstants.DOT_PATH_DELIMITER}${levelPath}`
    const [levelName] = (path.split(EConstants.DOT_PATH_DELIMITER)).reverse()

    if (levelName === nestedValues.$name) {
      const { key, parentKey, groupName, isExtension, rootKey, refKey } = deconstructPath(path.split(EConstants.DOT_PATH_DELIMITER))

      const nestedParentPath = [...path.split(`${EConstants.DOT_PATH_DELIMITER}${key}`), EConstants.EXTENSIONS].filter(d => d).join(EConstants.DOT_PATH_DELIMITER)
      const $nestedExtension = getValueByPath(sourceData, nestedParentPath)
      const nestedTitle = nestedValues ? nestedValues[EConstants.TITLE_KEY] : null

      return resolveData(acc, {
        tokenPath: `${checkPath}${EConstants.DOT_PATH_DELIMITER}${nestedTitle || parentKey}`,
        rootKey,
        path,
        title: nestedTitle,
        value: nestedValues.$value,
        key,
        parentKey,
        groupName,
        isExtension,
        description: nestedValues ? nestedValues[EConstants.DESCRIPTION_KEY] : null,
        type: setVariableDataType(nestedValues[EConstants.TYPE_KEY]),
        ...(isExtension || !$nestedExtension ? {} : { $extension: $nestedExtension }),
        ...(!!rootKey && isExtension ? {
          extensionProps: {
            ...rootValue[groupName][parentKey],
            $refKey: refKey,
          }
        } : {}),
        fallbackValue,
      })
    }

    return acc
  }, {} as TResolveDataParams)
}

function getProcessDataValues(params: TResolveDataParams) {
  const {
    tokenPath,
    fallbackValue,
    ...restParams
  } = params

  return {
    [tokenPath]: {
      ...restParams,
      ...(fallbackValue ? { fallbackValue } : {}),
      name: convertPathToName(tokenPath),
    }
  }
}

type TResolveDataParams = {
  tokenPath: string
  rootKey: string
  path: string
  title: string
  value: string
  key: string
  parentKey: string
  groupName: string
  isExtension: boolean
  description: string
  type: string
  fallbackValue: string
}

function resolveData(data: any, params: TResolveDataParams) {
  return {
    ...data,
    ...getProcessDataValues(params)
  }
}

export async function preTranspileData(data: TProcessedData, payload: TCollectionPayload): Promise<TPreTranspiledData> {
  const aliases: TTokenData[] = []
  const tokens: TTokenData[] = []
  const texts: TextStyle[] = []
  const effects: EffectStyle[] = []

  const newData = await Object.values(data.$tokens).reduce(async (allTokens, token) => {
    const isAlias = hasAliasValue(token.value)

    if (isAlias) {
      aliases.push(token)
    } else {
      tokens.push(token)
    }

    return [
      ...await allTokens,
      {
        ...token,
        isAlias,
      }
    ]
  }, Promise.resolve([]) as Promise<TTokenDataTranspiled[]>)
  return {
    source: newData,
    aliases,
    tokens,
    styles: {
      texts,
      effects,
    }
  }
}

export async function transpileData(data: TProcessedData, params: TCollectionPayload): Promise<TTranspiledData> {
  const { payload } = params
  const {
    tokens,
    aliases,
    styles,
  } = await preTranspileData(data, params)
  let addedTokens: string[] = []
  let failedTokens: string[] = []

  const {
    collection
  } = initCollection(params, data)
  const localVariables = getLocalVariables()
  styles.texts = figma.getLocalTextStyles()
  styles.effects = figma.getLocalEffectStyles()

  if (payload && collection) {
    const { added: tokensAdded, failed: tokensFailed } = await iterateTokens({ collection, data, localVariables, tokens, styles })
    const { added: aliasesAdded, failed: aliasesFailed } = await iterateTokens({ collection, data, localVariables, tokens: aliases, styles, isSkipStyles: true })
    addedTokens = [
      ...addedTokens,
      ...tokensAdded,
      ...aliasesAdded,
    ]
    failedTokens = [
      ...failedTokens,
      ...tokensFailed,
      ...aliasesFailed,
    ]
  }

  return {
    collections: {
      items: [
        ...(collection ? [collection] : [])
      ]
    },
    variables: {
      local: localVariables,
      tokens,
      aliases,
      sum: tokens.length + aliases.length,
    },
    styles,
    status: {
      tokens: {
        added: addedTokens,
        failed: failedTokens,
      }
    }
  }
}
