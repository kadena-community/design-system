import { EConstants, EDimensionUnit, TAction, TCollectionPayload, TDesignTokenFormat, TFontProps, TJsonData, TTokenData, TTokenExtensions, EExtensionProp, TTokenIterationArgs, TCreateTokenMetaData } from "../../types";
import { getAliasAbsoluteValue } from "../extension";
import { convertNameToPath, getValueByPath, hasAliasValue, parseDimensionUnit, parseFontSize } from "../helper";
import { getAliasVariable, getResolvedTokenType, processTokenAliasValue } from "../variable";

export async function processTypographyTokens({ type, value }: { type: TTokenData['type'], value: TFontProps }, token: TDesignTokenFormat, params: TTokenIterationArgs, payload: TJsonData) {
  try {
    let textStyle = params.styles.texts.find(({ name }) => name === token[EConstants.METADATA_KEY_NAME]) || figma.createTextStyle()
    
    textStyle.name = token[EConstants.METADATA_KEY_NAME] ?? ''
    textStyle.description = token[EConstants.DESCRIPTION_KEY] ?? ''

    const {
      fontFamily,
      fontWeight,
      fontSize,
      letterSpacing,
      lineHeight,
    } = value

    if (fontFamily && hasAliasValue(fontFamily)) {
      const fontFamilyVariable = getAliasVariable(fontFamily, params as unknown as TCreateTokenMetaData)
      textStyle.setBoundVariable('fontFamily', fontFamilyVariable)
    }
    
    if (fontWeight && hasAliasValue(fontWeight)) {
      const fontWeightVariable = getAliasVariable(String(fontWeight), params as unknown as TCreateTokenMetaData)
      textStyle.setBoundVariable('fontStyle', fontWeightVariable)
    }
    
    if (fontSize && hasAliasValue(fontSize)) {
      const fontSizeVariable = getAliasVariable(String(fontSize), params as unknown as TCreateTokenMetaData)
      textStyle.setBoundVariable('fontSize', fontSizeVariable)
    }
    
    if (letterSpacing && hasAliasValue(letterSpacing)) {
      const letterSpacingVariable = getAliasVariable(String(letterSpacing), params as unknown as TCreateTokenMetaData)
      textStyle.setBoundVariable('letterSpacing', letterSpacingVariable)
    } else if (letterSpacing) {
      const parsedValue = parseDimensionUnit('letterSpacing', null, value.letterSpacing as TTokenData['value'])
      const newValue = parsedValue.value ? parsedValue : { value: 0, unit: EDimensionUnit.PIXELS }
      textStyle.letterSpacing = newValue as LetterSpacing
    }
    
    if (lineHeight && hasAliasValue(lineHeight)) {
      const lineHeightVariable = getAliasVariable(String(lineHeight), params as unknown as TCreateTokenMetaData)
      textStyle.setBoundVariable('lineHeight', lineHeightVariable)
    } else if (lineHeight) {
      const newValue = parseDimensionUnit('lineHeight', null, value.lineHeight as TTokenData['value'], { unit: EDimensionUnit.AUTO })
      textStyle.lineHeight = newValue as LineHeight
    }
  } catch (error) {
    console.error(error)
  }

  return JSON.stringify(value)
}

function getTypographyAliasValue(value: string): TFontProps | string | null {
  let response = null
  const variableAliasValue = processTokenAliasValue(value)

  if (variableAliasValue) {
    const [firstModeValue] = Object.values(variableAliasValue.valuesByMode)
    response = firstModeValue as string
  }

  return response ?? null
}

function getFontFamily(value: TFontProps | string | null): string | null {
  let response = null

  if (typeof value === 'object') {
    value = value?.fontFamily ?? null
  }

  if (value && hasAliasValue(value)) {
    response = getTypographyAliasValue(value) ?? value
  } else {
    response = value
  }

  if (typeof response === 'object') {
    response = response?.fontFamily as string | null
  }

  return response ?? null
}

async function getFontStyle(value: TFontProps['fontWeight'], params: TTokenIterationArgs, extensions: TTokenExtensions | null): Promise<string> {
  if (typeof value === 'string') {
    if (hasAliasValue(value)) {
      const [{ modeId, name: modeName }] = params.collection.modes
      value = await getAliasAbsoluteValue(value, value, { modeId, modeName, allVariables: params.allVariables }) as string
    }

    return value
  } else if (typeof value === 'number') {
    switch (value) {
      case 100:
        value = 'Thin'
        break;
      case 200:
        value = 'Extra-Light'
        break;
      case 300:
        value = 'Light'
        break;
      case 400:
        value = 'Normal'
        break;
      case 500:
        value = 'Medium'
        break;
      case 600:
        value = 'Semi-Bold'
        break;
      case 700:
        value = 'Bold'
        break;
      case 800:
        value = 'Extra-bold'
        break;
      case 900:
        value = 'Black'
        break;
      case 950:
        value = 'Extra-black'
        break;

      default:
        value = 'Regular'
        break;
    }
  }

  return value ?? 'Regular'
}

export type tokenStrings = string[]

export async function getTypographyTokens(tokenStrings: tokenStrings, params: TTokenIterationArgs, payload: TJsonData) {
  const tokens = await tokenStrings.reduce(async (res, tokenName) => {
    const name = convertNameToPath(tokenName)
    const token = getValueByPath({ sourceData: payload }, name)
    token.$name = tokenName

    if (token?.[EConstants.VALUE_KEY]) {
      await processTypographyTokens({ type: token.type, value: token[EConstants.VALUE_KEY] as TFontProps }, token, params, payload)
    }

    return [
      ...(await res),
      token
    ]
  }, Promise.resolve([] as string[]))
}
