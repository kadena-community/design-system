import {
  EConstants,
  EDTFTypes,
  EExtensionProp,
  TCreateTokenMetaData,
  TDesignTokenFormat,
  TExtensionGeneratorGroup,
  TJsonData,
  TRGBA,
  TTokenData,
  TTokenExtensions
} from "../types";
import { hexToRgba, rgbaToHex } from "./color";
import { TDeconstructPath, computePathByName, deconstructPath, getValueByPath, getValuePath, hasAliasValue } from "./helper";
import { getResolvedTokenType } from "./variable";

export function mapTokenExtensions(refToken: TDesignTokenFormat, params: TDeconstructPath) {
  const { $extensions } = refToken
  const key = params.groupName as keyof TTokenExtensions
  const groupName = $extensions?.[key] as TExtensionGeneratorGroup

  if (groupName?.[params.parentKey]) {
    const $base = groupName[params.parentKey].$base ?? null
    const map = {
      ...($extensions ?? {}),
      [params.groupName]: {
        [params.parentKey]: {
          ...groupName[params.parentKey],
          ...($base ? { $base } : {}),
        },
      },
    }
    return map
  }

  return $extensions
}

export async function processTokenExtension(token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData): Promise<{ token: TTokenData, variable: Variable | null }> {
  let variable = null;
  const extensionPropType = token.type

  if (extensionPropType === EDTFTypes.COLOR) {
    switch (token.modifier) {
      case EExtensionProp.ALPHA:
        const { token: updatedToken, variable: updatedVariable } = await processAlphaExtension(token, params, payload) ?? {}
        variable = updatedVariable
        token = updatedToken
        break;
      case EExtensionProp.HUE:
      default:
        variable = figma.variables.createVariable(token.name, params.collection.id, getResolvedTokenType(token.type))
        break;
    }
  } else if (extensionPropType === EDTFTypes.FONTWEIGHT) {
    variable = figma.variables.createVariable(token.name, params.collection.id, getResolvedTokenType(token.type))
  }

  return {
    variable,
    token,
  }
}

export function getTokenExtensionModifier(groupName: TTokenData['groupName']): TTokenData['modifier'] {
  switch (groupName) {
    case EExtensionProp.ALPHA:
      return EExtensionProp.ALPHA
    case EExtensionProp.HUE:
      return EExtensionProp.HUE

    default:
      return groupName as TTokenData['modifier']
  }
}

async function processAlphaExtension(token: TTokenData, params: TCreateTokenMetaData, payload: TJsonData): Promise<{ token: TTokenData, variable: Variable | null }> {
  try {
    const variable = figma.variables.createVariable(token.name, params.collection.id, getResolvedTokenType(token.type))

    token.value = await processColor({ token }, payload) ?? token.value

    return {
      variable,
      token,
    }

  } catch (error) {
    console.error('Error adding alpha to base color', error)
  }

  return {
    variable: null,
    token,
  }
}

type TProcessColor = {
  token: TTokenData
  mode?: {
    id: string,
    name: string
  }
}

function hasModifierExtensions(extensions: TTokenData['extensions']) {
  if (extensions) {
    const extensionsKeys = Object.keys(extensions)
    return extensionsKeys.includes(EExtensionProp.ALPHA) || extensionsKeys.includes(EExtensionProp.HUE)
  }

  return false
}

export async function processColor({ mode, token }: TProcessColor, payload: TJsonData): Promise<TTokenData['value'] | null> {
  const value = token.prevValue
  const isModifierColor = token.isExtension && hasModifierExtensions(token.extensions)
  const { name: modeName, id: modeId } = mode ?? {}
  const modeColor = modeName && token.extensions?.[EExtensionProp.MODE]?.[modeName] ? token.extensions[EExtensionProp.MODE][modeName] : null
  const baseColor = isModifierColor && token.extensions?.alpha?.[token.parentKey].$base ? token.extensions?.alpha?.[token.parentKey].$base : null
  let newColor: TTokenData['value'] | Variable | null = baseColor ?? modeColor
  let checkPath, refColor

  if (!modeColor && !baseColor) {
    const { rootKey } = deconstructPath(token.path)
    const [rootPath] = token.name.split(`${EConstants.TOKEN_NAME_DELIMITER}${rootKey}${EConstants.TOKEN_NAME_DELIMITER}`)
    checkPath = computePathByName(`${rootPath}${EConstants.TOKEN_NAME_DELIMITER}${rootKey}`)
    refColor = getValueByPath({ sourceData: payload }, checkPath) as TTokenData['value'] | undefined

    if (refColor) {
      newColor = refColor
    }
  }

  if (newColor) {
    if (hasAliasValue(newColor)) {
      const resolvedValue = await getAliasAbsoluteValue(newColor as string, value, { modeId, modeName })

      if (typeof resolvedValue === 'object' && typeof (resolvedValue as TRGBA)?.r !== 'undefined' && isModifierColor && typeof value === 'number') {
        return rgbaToHex({ ...(resolvedValue as TRGBA), a: Number(value) / 100 })
      } else if (typeof resolvedValue === 'object' && (resolvedValue as TRGBA)?.r) {
        if (isModifierColor && typeof value === 'number') {
          return rgbaToHex({ ...(resolvedValue as TRGBA), a: Number(value) / 100 })
        } else if (typeof value === 'number') {
          return rgbaToHex({ ...(resolvedValue as TRGBA), a: Number(value) / 100 })
        } else if (typeof resolvedValue === 'object') {
          return rgbaToHex({ ...(resolvedValue as TRGBA), a: 1 })
        }
      } else if (hasAliasValue(newColor)) {
        return await getAliasAbsoluteValue(newColor as string, value, { modeId, modeName }) as string | number
      }
    } else if (typeof value === 'number' && typeof newColor === 'string') {
      return rgbaToHex({ ...hexToRgba(newColor), a: Number(value) / 100 })
    } else if (typeof value === 'string' && typeof newColor === 'string') {
      return rgbaToHex({ ...hexToRgba(newColor), a: 1 })
    }
  }

  return newColor ?? value
}

type TAliasRetrievalParams = {
  modeId: string | undefined
  modeName: string | undefined
  allVariables?: Variable[]
}

export async function getAliasAbsoluteValue(value: string | Variable, startValue: TTokenData['prevValue'], params: TAliasRetrievalParams): Promise<Variable['valuesByMode'][0] | string | number | Variable> {
  let { modeId, allVariables } = params
  allVariables = allVariables ?? figma.variables.getLocalVariables()

  if (typeof value === 'string' && hasAliasValue(value)) {
    const aliasValue = getValuePath(value)
    const refValue = allVariables.find(({ name }) => name === aliasValue)

    if (refValue && modeId) {
      const refVariable = await figma.variables.importVariableByKeyAsync(refValue?.key)
      const nestedVariable = figma.variables.getVariableById((refVariable?.valuesByMode[modeId] as unknown as Variable).id)

      if (nestedVariable?.valuesByMode?.[modeId]) {
        return nestedVariable.valuesByMode[modeId]
      }

      const refResolvedValue: any /* VariableAlias */ = refValue['valuesByMode'][modeId]

      if ((refResolvedValue as VariableAlias).type === "VARIABLE_ALIAS") {
        return await getAliasAbsoluteValue(refValue, startValue, { ...params, allVariables })
      }

      if (typeof refResolvedValue === 'object' && typeof startValue === 'number') {
        return refResolvedValue
      }

      return refValue.valuesByMode[modeId]
    }

    return value
  } else if (typeof value === 'object' && modeId && value.valuesByMode[modeId]) {
    const resolvedValue = allVariables.find(({ id }) => id === value.id)
    const resolvedValueByMode = resolvedValue?.valuesByMode?.[modeId] as unknown as Variable | undefined

    if (resolvedValueByMode?.id) {
      const alias = figma.variables.getVariableById(resolvedValueByMode.id)
      const resolvedColor = alias?.valuesByMode[modeId]

      return resolvedColor ?? value
    }

    return resolvedValue ?? value
  }

  return value
}
