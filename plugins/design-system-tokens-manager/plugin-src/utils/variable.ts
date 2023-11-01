import { EDTFCompositeTypes, EDTFTypes, EExtensionKey, ETokenResolvedType, TBorderProps, TCreateTokenMetaData, TEffectProps, TExtension, TFontProps, TTokenData, TTokenIterationArgs, TTranspiledData, TValueForMode } from "../types"
import { parseColor } from './color'
import { processTokenExtension } from "./extension"
import { getExtendedAliasValue, getValuePath, hasAliasValue, hasExtendedAliasValue } from "./helper"
import { processTypographyTokens } from "./composites/typography"
import { processBorderTokens } from "./composites/border"
import { processEffectsTokens } from "./composites/effects"

export async function iterateTokens(params: TTokenIterationArgs): Promise<TTranspiledData['status']['tokens']> {
  const { tokens, collection, localVariables, data, styles, isSkipStyles } = params
  const resolvedValue = await tokens.reduce(async (response, token): Promise<TTranspiledData['status']['tokens']> => {
    await response
    const added = []
    const failed = []

    if (collection) {
      try {
        switch (token.type) {
          case EDTFCompositeTypes.TYPOGRAPHY:
            processTypographyTokens({ type: token.type, value: token.value as TFontProps }, token, params)
            break;
          case EDTFCompositeTypes.BORDER:
            processBorderTokens({ type: token.type, value: token.value as TBorderProps }, token, params)
            break;
          case EDTFCompositeTypes.SHADOW:
            if (!isSkipStyles) {
              processEffectsTokens({ type: token.type, value: token.value as TEffectProps }, token, params)
            }
            break;

          default:
            createToken(token, {
              collection,
              metaData: data.$metaData,
              localVariables,
              styles,
            })
            added.push(token.name)
            break;
        }
      } catch (error) {
        failed.push(token.name)
      }
    }

    return {
      ...response,
      added: [
        ...(await response).added,
        ...added
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

export function createToken(token: TTokenData, params: TCreateTokenMetaData) {
  try {
    const { collection, metaData, localVariables } = params
    let existingToken: Variable | null = localVariables.find(({ name }) => name === token.name) || null

    if (!existingToken) {
      if (token.isExtension) {
        existingToken = processTokenExtension(token, params) || null
      } else {
        existingToken = figma.variables.createVariable(token.name, collection.id, getResolvedTokenType(token.type))
      }
    }

    if (existingToken) {
      setVariableModeValues(existingToken, token, { metaData, collection, localVariables, styles: params.styles })
    }

    return token
  } catch (error) {
    return null
  }
}

export async function setVariableModeValues(variable: Variable, token: TTokenData, params: TCreateTokenMetaData) {
  const { metaData, collection, localVariables } = params
  const [defaultMode] = metaData.$modes
  let availableModes = collection.modes

  token = await resolveValueType(token, variable, params)
  availableModes.forEach((mode) => {
    if (!token.isExtension) {
      setValueForMode({ mode, defaultMode }, variable, token, params)
    }
  })
}

async function setValueForMode({ mode: { modeId, name }, defaultMode }: TValueForMode, variable: Variable, token: TTokenData, params: TCreateTokenMetaData) {
  if (token.variableAlias) {
    return variable.setValueForMode(modeId, token.variableAlias)
  }

  if (name === defaultMode) {
    variable.setValueForMode(modeId, token.value)
  } else if (token.$extension?.mode && token.$extension?.mode[name]) {
    if (hasAliasValue(token.$extension[EExtensionKey.EXTENSION_TYPE_MODE] && token.$extension[EExtensionKey.EXTENSION_TYPE_MODE][name])) {
      const modeReferenceVariable = processTokenAliasValue(token.$extension[EExtensionKey.EXTENSION_TYPE_MODE][name], params)

      if (modeReferenceVariable?.id) {
        const variableAlias = figma.variables.createVariableAlias(modeReferenceVariable)
        variable.setValueForMode(modeId, variableAlias)
      }
    } else if (token.$extension[EExtensionKey.EXTENSION_TYPE_MODE]) {
      variable.setValueForMode(modeId, await processTokenValue(token.type, token.$extension[EExtensionKey.EXTENSION_TYPE_MODE][name], token, params))
    }
  } else if (!token.$extension?.mode || !token.$extension?.mode[name]) {
    variable.setValueForMode(modeId, token.value)
  }
}

export function processTokenAliasValue(value: TTokenData['value'], params?: TCreateTokenMetaData) {
  let referenceVariable = null
  params = params || { localVariables: figma.variables.getLocalVariables() } as TCreateTokenMetaData

  if (hasExtendedAliasValue(value)) {
    const extendedTokenRefName = getExtendedAliasValue(value)
    referenceVariable = params.localVariables.find(({ name }) => name === extendedTokenRefName)
  } else if (hasAliasValue(value)) {
    const tokenRefName = getValuePath(value)
    referenceVariable = params.localVariables.find(({ name }) => name === tokenRefName)
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
    if (modeId && token.$extension?.mode[modeId]) {
      token.$extension[EExtensionKey.EXTENSION_TYPE_MODE][modeId] = processTokenValue(token.type, token.$extension[EExtensionKey.EXTENSION_TYPE_MODE][modeId], token, params)

      return token
    } else if (token.isExtension && token.$extension?.style) {

      return token
    } else if (token.isExtension && !modeId) {
      return token
    }

    token.value = await processTokenValue(token.type, token.value, token, params)
  } catch (error) {
    console.error('Parsing value failed!', error)
  } finally {
    return token
  }
}

async function processTokenValue(type: TTokenData['type'], value: TTokenData['value'] | TExtension['mode'][0], token: TTokenData, params: TCreateTokenMetaData) {
  try {
    switch (type) {
      case EDTFTypes.COLOR:
        value = parseColor(value)
        break

      case EDTFTypes.DIMENSION:
        value = value
        break

      case EDTFCompositeTypes.BORDER:
      case EDTFCompositeTypes.SHADOW:
        console.warn('BORDER TOKEN', value)
        value = JSON.stringify(value)
        break
    }

    return value
  } catch (error) {
    throw new Error("Value parsing error")
  }
}

function getResolvedTokenType(type: TTokenData['type']) {
  switch (type) {
    case EDTFTypes.COLOR:
      return ETokenResolvedType.COLOR

    case EDTFTypes.DIMENSION:
    case EDTFCompositeTypes.TYPOGRAPHY:
    case EDTFTypes.FONTFAMILY:
      return ETokenResolvedType.STRING

    case EDTFTypes.NUMBER:
      return ETokenResolvedType.FLOAT

    case EDTFCompositeTypes.BORDER:
      return ETokenResolvedType.STRING

    default:
      return ETokenResolvedType.STRING
  }
}
