import { EDTFTypes, EExtensionProp, ETokenResolvedType, TCreateTokenMetaData, TRGBA, TTokenData } from "../types";
import { hexToRgba, rgbaToHex } from "./color";
import { convertPropPath, getValuePath, transformExtentionPropFallbackPath } from "./helper";

export function processTokenExtension(token: TTokenData, params: TCreateTokenMetaData) {
  let variable = null;
  switch (token.extensionProps?.$type.toUpperCase()) {
    case EExtensionProp.ALPHA:
      variable = processAlphaExtension(token, params)
      break;
  }

  return variable
}

function processAlphaExtension(token: TTokenData, params: TCreateTokenMetaData): Variable | null {
  if (!token.extensionProps) {
    return null
  }

  let variable: Variable | null = null;
  const refValue = params.localVariables.find(({ name }) => token.extensionProps && name === getValuePath(token.extensionProps.$base))
  let applyToModes = params.collection.modes.filter(({ name }) => token.extensionProps?.$modes?.includes(name))
  let fallbackModes = params.collection.modes.filter(({ name }) => !token.extensionProps?.$modes?.includes(name))

  if (!applyToModes.length) {
    applyToModes = params.collection.modes
  }

  token.name = convertPropPath(token.name, token.extensionProps.$type)
  token.type = EDTFTypes.COLOR

  const fallbackTokenPath = transformExtentionPropFallbackPath(token.path)
  const fallbackValue = figma.variables.getLocalVariables().find(({ name }) => name === fallbackTokenPath)
  let existingToken = params.localVariables.find(({ name }) => name === token.name) || null


  if (!existingToken) {
    variable = figma.variables.createVariable(token.name, params.collection.id, ETokenResolvedType.COLOR)
  } else {
    variable = existingToken
  }

  applyToModes.forEach(({ modeId }) => {
    if (variable && refValue) {
      const refHexColor = rgbaToHex(refValue.valuesByMode[modeId] as TRGBA)
      const newRefColor = hexToRgba(refHexColor + token.extensionProps?.$value)
      variable.setValueForMode(modeId, newRefColor)
    }
  })

  if (applyToModes.length !== params.collection.modes.length && fallbackModes.length) {
    fallbackModes.forEach(({ modeId }) => {
      if (variable && refValue && fallbackValue) {
        const variableAlias = figma.variables.createVariableAlias(fallbackValue)
        variable.setValueForMode(modeId, variableAlias)
      }
    })
  }

  return variable
}