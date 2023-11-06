import {
  EDTFTypes,
  EExtensionProp,
  ETokenResolvedType,
  TBorderProps,
  TCreateTokenMetaData,
  TEffectProps,
  TExtension,
  TFontProps,
  TJsonData,
  TTokenData,
  TTokenIterationArgs,
  TTranspiledData,
  TValueForMode
} from "../types"
import { parseColor } from './color'
import { processColor, processTokenExtension } from "./extension"
import { getExtendedAliasValue, getValuePath, hasAliasValue, hasExtendedAliasValue, parseDimensionUnit } from "./helper"
import { processTypographyTokens } from "./composites/typography"
import { processBorderTokens } from "./composites/border"
import { processEffectsTokens } from "./composites/effects"
import { processDimensionsTokens } from "./composites/dimension"

export async function iterateTokens(params: TTokenIterationArgs): Promise<TTranspiledData['status']['tokens']> {
  const { tokens, collection, allVariables, data, styles, isSkipStyles, payload } = params
  const resolvedValue = await tokens.reduce(async (response, token): Promise<TTranspiledData['status']['tokens']> => {
    await response
    const added = []
    const failed = []

    if (collection) {
      try {
        switch (token.type) {
          case EDTFTypes.TYPOGRAPHY:
            processTypographyTokens({ type: token.type, value: token.value as TFontProps }, token, params, payload)
            break;
          case EDTFTypes.BORDER:
            processBorderTokens({ type: token.type, value: token.value as TBorderProps }, token, params, payload)
            break;
          case EDTFTypes.SHADOW:
          case EDTFTypes.BLUR:
            if (!isSkipStyles) {
              processEffectsTokens({ type: token.type, value: token.value as TEffectProps }, token, params, payload)
            }
            break;
          case EDTFTypes.NUMBER:
          case EDTFTypes.DIMENSION:
            await processDimensionsTokens({ type: token.type, value: token.value as TEffectProps }, token, params, payload)
            break;

          default:
            await createToken(token, {
              collection,
              metaData: data.$metaData,
              allVariables,
              styles,
            }, payload) ? added.push(token.name) : failed.push(token.name)
            break;
        }
      } catch (error) {
        failed.push(token.name)
      }
    }

    return {
      ...(await response),
      added: [
        ...(await response).added,
        ...added,
      ],
      failed: [
        ...(await response).failed,
        ...failed
      ],

    }

  }, Promise.resolve({
    added: [],
    failed: [],
  }) as Promise<TTranspiledData['status']['tokens']>)

  return resolvedValue
}

export function getLocalVariables() {
  return figma.variables.getLocalVariables()
}

export async function createToken(token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData) {
  try {
    const { collection, metaData, allVariables } = params
    let variableData: Variable | null = allVariables.find(({ name }) => name === token.name) || null

    if (!variableData) {
      if (token.isExtension) {
        const { variable, token: updatedToken } = await processTokenExtension(token, params, payload) ?? {}
        token = updatedToken
        variableData = variable
      } else {
        variableData = figma.variables.createVariable(token.name, collection.id, getResolvedTokenType(token.type))
      }
    }

    if (variableData) {
      await setVariableModeValues(variableData, token, { metaData, collection, allVariables, styles: params.styles }, payload)
    }

    return variableData
  } catch (error) {
    return null
  }
}

export async function setVariableModeValues(variable: Variable, token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData) {
  const { metaData, collection } = params
  const [defaultMode] = metaData.$modes
  let availableModes = collection.modes

  token = await resolveValueType(token, variable, params)

  availableModes.forEach((mode) => {
    if (token?.extensions?.[EExtensionProp.MODE]) {
      if (typeof token?.extensions?.[EExtensionProp.MODE][mode.name] !== 'undefined') {
        token.value = token?.extensions?.[EExtensionProp.MODE][mode.name]
      }

      setValueForModeExtension({ mode, defaultMode }, variable, token, params, payload)
    } else {
      setValueForMode({ mode, defaultMode }, variable, token, params, payload)
    }
  })
}

async function setValueForMode({ mode: { modeId, name }, defaultMode }: TValueForMode, variable: Variable, token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData) {
  try {
    if (token.variableAlias) {
      return doSaveValueForMode(variable, modeId, token.variableAlias, token)
    }

    if (name === defaultMode || !token.extensions?.[EExtensionProp.MODE][name]) {
      token = processTokenUnitValue(token)
      doSaveValueForMode(variable, modeId, token.value, token)
    } else if (token.extensions?.[EExtensionProp.MODE][name]) {
      const root = token.extensions[EExtensionProp.MODE]
      const rootMode = root[name]

      if (rootMode && hasAliasValue(rootMode)) {
        const modeReferenceVariable = processTokenAliasValue(rootMode, params)

        if (modeReferenceVariable?.id) {
          const variableAlias = figma.variables.createVariableAlias(modeReferenceVariable)
          doSaveValueForMode(variable, modeId, variableAlias, token)
        } else {
          token = processTokenUnitValue(token)
          doSaveValueForMode(variable, modeId, token.value, token)
        }
      } else if (token.extensions[EExtensionProp.MODE]) {
        token = processTokenUnitValue(token)
        doSaveValueForMode(variable, modeId, await processTokenValue(token.type, rootMode, token, params), token)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

export function doSaveValueForMode(variable: Variable, modeId: TValueForMode['mode']['modeId'], value: any, token: TTokenData): Variable | void {
  try {
    if (value && !hasAliasValue(value)) {
      variable.setValueForMode(modeId, value)

      return variable
    }
  } catch (error) {
    console.error(value, error, token, variable)
  }
}

async function setValueForModeExtension({ mode: { modeId, name }, defaultMode }: TValueForMode, variable: Variable, token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData) {
  try {
    const modeVariant = token.extensions?.[EExtensionProp.MODE][name]

    if (modeVariant) {
      token.value = token.extensions?.[EExtensionProp.MODE][name] ?? token.value
    }

    switch (token.type) {
      case EDTFTypes.COLOR:
        if (token.variableAlias) {
          return doSaveValueForMode(variable, modeId, token.variableAlias, token)
        }

        const processedColor = await processColor({
          token,
          mode: {
            name,
            id: modeId
          },
        }, payload)
        token.value = processedColor ?? token.value

        if (token.value && typeof token.value === 'string' && !hasAliasValue(token.value)) {
          token.value = parseColor(token.value)
        }
        break;

      case EDTFTypes.NUMBER:
      case EDTFTypes.DIMENSION:
        if (token.value && hasAliasValue(token.value)) {
          const modeReferenceVariable = processTokenAliasValue(token.value, params)

          if (modeReferenceVariable?.id) {
            const variableAlias = figma.variables.createVariableAlias(modeReferenceVariable)
            doSaveValueForMode(variable, modeId, variableAlias, token)
          }
        } else {
          token.value = parseDimensionUnit(token.type, token, token.value || 0).value ?? 0
        }
        break;

      case EDTFTypes.NUMBER:
      default:
        token.value = `${token.value}`.trim()
        break;
    }

    doSaveValueForMode(variable, modeId, token.value, token)
  } catch (error) {
    console.error(error)
  }
}

function processTokenUnitValue(token: TTokenData) {
  switch (token.type) {
    case EDTFTypes.NUMBER:
    case EDTFTypes.DIMENSION:
      if (!hasAliasValue(token.value) && typeof token.value === 'string') {
        token.value = parseDimensionUnit(token.type, token, token.value || 0).value ?? 0
      }
      break;
  }

  return token
}

export function processTokenAliasValue(value: TTokenData['value'], params?: TCreateTokenMetaData) {
  let referenceVariable = null
  params = params ?? { allVariables: figma.variables.getLocalVariables() } as TCreateTokenMetaData

  if (hasExtendedAliasValue(value)) {
    const extendedTokenRefName = getExtendedAliasValue(value)
    referenceVariable = params.allVariables.find(({ name }) => name === extendedTokenRefName)
  } else if (hasAliasValue(value)) {
    const tokenRefName = getValuePath(value)
    referenceVariable = params.allVariables.find(({ name }) => name === tokenRefName)
  }

  return referenceVariable
}

function processAliasValues(token: TTokenData, params: TCreateTokenMetaData) {
  if (hasAliasValue(token.value)) {
    const referenceVariable = processTokenAliasValue(token.value, params)

    if (referenceVariable?.id) {
      const variableAlias = figma.variables.createVariableAlias(referenceVariable)
      token.variableAlias = variableAlias
    }
  }

  return token
}

export async function resolveValueType(token: TTokenData, variable: Variable, params: TCreateTokenMetaData) {
  token = processAliasValues(token, params)

  if (token.variableAlias) {
    return token
  }

  token = await parseTokenValue(token, params)

  return token
}

async function parseTokenValue(token: TTokenData, params: TCreateTokenMetaData, modeId?: TValueForMode['mode']['modeId'],) {
  try {
    if (modeId && token.extensions?.[EExtensionProp.MODE][modeId]) {
      token.extensions[EExtensionProp.MODE][modeId] = await processTokenValue(token.type, token.extensions[EExtensionProp.MODE][modeId], token, params)

      return token
    } else if (token.isExtension && (token.extensions?.[EExtensionProp.ALPHA] || token.extensions?.[EExtensionProp.HUE])) {

      return token
    } else if (token.isExtension && !modeId) {
      return token
    }

    token.value = await processTokenValue(token.type, token.value, token, params)
  } catch (error) {
    console.error('Parsing value failed!', error)
  }

  return token
}

async function processTokenValue(type: TTokenData['type'], value: TTokenData['value'] | TExtension['mode'][0], token: TTokenData, params: TCreateTokenMetaData) {
  try {
    switch (type) {
      case EDTFTypes.COLOR:
        value = value && typeof value === 'string' && !hasAliasValue(value) ? parseColor(value) : value
        break

      case EDTFTypes.BORDER:
      case EDTFTypes.SHADOW:
      case EDTFTypes.BLUR:
        value = typeof value === 'object' ? JSON.stringify(value) : value
        break
    }

    return value
  } catch (error) {
    throw new Error("Value parsing error")
  }
}

export function getResolvedTokenType(type: TTokenData['type']) {
  switch (type) {
    case EDTFTypes.COLOR:
      return ETokenResolvedType.COLOR

    case EDTFTypes.TYPOGRAPHY:
    case EDTFTypes.FONTFAMILY:
    case EDTFTypes.SHADOW:
    case EDTFTypes.BLUR:
    case EDTFTypes.BORDER:
      return ETokenResolvedType.STRING

    case EDTFTypes.NUMBER:
    case EDTFTypes.DIMENSION:
      return ETokenResolvedType.FLOAT

    default:
      return ETokenResolvedType.STRING
  }
}
