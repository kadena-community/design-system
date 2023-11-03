import {
  EDTFTypes,
  EExtensionProp,
  TCreateTokenMetaData,
  TDesignTokenFormat,
  TExtensionGeneratorGroup,
  TTokenData,
  TTokenExtensions
} from "../types";
import { hexToRgba, rgbaToHex } from "./color";
import { TDeconstructPath, getValuePath, hasAliasValue } from "./helper";
import { getResolvedTokenType } from "./variable";

export function mapTokenExtensions(refToken: TDesignTokenFormat, params: TDeconstructPath) {
  const { $extensions } = refToken
  const key = params.groupName as keyof TTokenExtensions
  const groupName = $extensions?.[key] as TExtensionGeneratorGroup

  if (groupName?.[params.parentKey]) {
    const $base = groupName[params.parentKey].$base ?? refToken.$value
    const map = {
      ...($extensions ?? {}),
      [params.groupName]: {
        [params.parentKey]: {
          ...groupName[params.parentKey],
          $base,
        },
      },
    }
    return map
  }

  return $extensions
}

export async function processTokenExtension(token: TTokenData, params: TCreateTokenMetaData): Promise<{ token: TTokenData, variable: Variable | null }> {
  let variable = null;
  const extensionPropType = token.type

  if (extensionPropType === EDTFTypes['COLOR']) {
    switch (token.modifier) {
      case EExtensionProp['ALPHA']:
        const { token: updatedToken, variable: updatedVariable } = await processAlphaExtension(token, params) ?? {}
        variable = updatedVariable
        token = updatedToken
        break;
      // case EExtensionProp['HUE']:
      // break;
      // default:
      // break;
    }
  }

  return {
    variable,
    token,
  }
}

export function getTokenExtensionModifier(groupName: TTokenData['groupName']): TTokenData['modifier'] {
  switch (groupName) {
    case EExtensionProp['ALPHA']:
      return EExtensionProp['ALPHA']
    case EExtensionProp['HUE']:
      return EExtensionProp['HUE']

    default:
      return groupName as TTokenData['modifier']
  }
}

async function processAlphaExtension(token: TTokenData, params: TCreateTokenMetaData): Promise<{ token: TTokenData, variable: Variable | null }> {
  try {
    const variable = figma.variables.createVariable(token.name, params.collection.id, getResolvedTokenType(token.type))

    token.value = await processColor({
      value: token.prevValue,
      extensions: token.extensions,
      parentKey: token.parentKey
    })

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
  value: TTokenData['value'],
  extensions: TTokenData['extensions'],
  parentKey: TTokenData['parentKey']
  mode?: {
    id: string,
    name: string
  }
}

export async function processColor({ value, extensions, parentKey, mode }: TProcessColor): Promise<TTokenData['value']> {
  const { name: modeName, id: modeId } = mode ?? {}
  const modeColor = modeName ? extensions?.[EExtensionProp.MODE]?.[modeName] : null
  const baseColor = extensions?.alpha?.[parentKey].$base
  let newColor = modeColor ?? baseColor

  if (newColor) {
    if (hasAliasValue(newColor)) {
      const resolvedValue = await getAliasAbsoluteValue(newColor, value, { modeId, modeName })

      if (resolvedValue && typeof resolvedValue.r) {
        return rgbaToHex({ ...resolvedValue, a: Number(value) / 100 })
      } else if (hasAliasValue(newColor)) {
        return await getAliasAbsoluteValue(newColor, value, { modeId, modeName })
      }

    } else if (typeof value === 'number') {
      return rgbaToHex({ ...hexToRgba(newColor), a: Number(value) / 100 })
    }
  }

  return newColor ?? value
}

type TAliasRetrievalParams = {
  modeId: string | undefined
  modeName: string | undefined
  allVariables?: Variable[]
}

async function getAliasAbsoluteValue(value: any, startValue: TTokenData['prevValue'], params: TAliasRetrievalParams): Promise<any> {
  let { modeId, allVariables } = params
  allVariables = allVariables ?? figma.variables.getLocalVariables()

  if (hasAliasValue(value)) {
    const aliasValue = getValuePath(value)
    const refValue = allVariables.find(({ name }) => name === aliasValue)

    if (refValue && modeId) {
      const refVariable = await figma.variables.importVariableByKeyAsync(refValue?.key)
      const nestedVariable = figma.variables.getVariableById((refVariable?.valuesByMode[modeId] as unknown as Variable).id)

      if (nestedVariable?.valuesByMode?.[modeId]) {
        return nestedVariable.valuesByMode[modeId]
      }
    }

    if (refValue && modeId) {
      const refResolvedValue: any /* VariableAlias */ = refValue['valuesByMode'][modeId]

      if ((refResolvedValue as VariableAlias).type === "VARIABLE_ALIAS") {
        return await getAliasAbsoluteValue(refValue, startValue, { ...params, allVariables })
      }

      if (typeof refResolvedValue === 'object' && typeof startValue === 'number') {
        return refResolvedValue
      }

      return refValue
    }

    return refValue
  } else if (typeof value === 'object' && modeId && value.valuesByMode[modeId]) {
    const resolvedValue = allVariables.find(({ id }) => id === value.id)
    const resolvedValueByMode = resolvedValue?.valuesByMode?.[modeId] as unknown as Variable | undefined

    if (resolvedValueByMode?.id) {
      const alias = figma.variables.getVariableById(resolvedValueByMode.id)
      const resolvedColor = alias?.valuesByMode[modeId]

      return resolvedColor
    }

    return resolvedValue
  }

  return await value
}
