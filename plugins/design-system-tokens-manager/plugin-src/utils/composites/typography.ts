import { EConstants, EDimensionUnit, TAction, TCollectionPayload, TDesignTokenFormat, TFontProps, TJsonData, TTokenData, TTokenIterationArgs } from "../../types";
import { getAliasAbsoluteValue } from "../extension";
import { convertNameToPath, getValueByPath, hasAliasValue, parseDimensionUnit, parseFontSize } from "../helper";
import { processTokenAliasValue } from "../variable";

export async function processTypographyTokens({ type, value }: { type: TTokenData['type'], value: TFontProps }, token: TDesignTokenFormat, params: TTokenIterationArgs, payload: TJsonData) {
  try {
    let checkValue = {
      ...value as { [key: string]: any }
    }

    const tokenData = {
      ...token,
      name: token[EConstants.METADATA_KEY_NAME],
      description: token[EConstants.DESCRIPTION_KEY],
      value: token[EConstants.VALUE_KEY],
      type: token[EConstants.TYPE_KEY],
      title: token[EConstants.TITLE_KEY],
      prevValue: token[EConstants.VALUE_KEY],
    } as unknown as TTokenData

    if (typeof checkValue === 'object') {
      checkValue = await Object.keys(checkValue).reduce(async (resolve, key) => {
        let setValue = null

        if (hasAliasValue(checkValue[key])) {
          const { collection: { modes } } = params
          const [baseMode] = modes
          const fontRefPropValue = await getAliasAbsoluteValue(checkValue[key], checkValue[key], { modeId: baseMode.modeId, modeName: baseMode.name }) as Variable | undefined

          if (typeof fontRefPropValue !== 'undefined') {
            setValue = fontRefPropValue
          }
        } else if (checkValue[key]) {
          setValue = checkValue[key]
        }

        if (typeof setValue === 'string' && ['fontSize', 'lineHeight'].includes(key)) {
          setValue = parseDimensionUnit(type, tokenData, setValue || 0).value ?? 0
        }

        return {
          ...await resolve,
          ...(setValue ? { [key]: setValue } : {}),
        }
      }, Promise.resolve({}))
    }

    const textStyleName = tokenData.name
    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
    } = checkValue

    if (!params.allVariables.length) {
      return JSON.stringify(value)
    }

    const family = getFontFamily(fontFamily)
    const style = await getFontStyle(fontWeight, params)

    if (!family) {
      return value
    }

    let textStyle = params.styles.texts.find(({ name }) => name === textStyleName) || figma.createTextStyle()

    if (family) {
      try {
        textStyle.name = textStyleName
        textStyle.fontName = {
          family,
          style,
        }
        textStyle.fontSize = fontSize ? parseFontSize(fontSize) : EConstants.BASE_FONT_SIZE
      } catch (error) {
        console.error('Error loading font', error)
      }

      const parsedLetterSpacing = parseDimensionUnit('letterSpacing', tokenData, letterSpacing ?? 0) as LetterSpacing | undefined

      if (parsedLetterSpacing) {
        textStyle.letterSpacing = parsedLetterSpacing
      } else {
        textStyle.letterSpacing = { value: 0, unit: EDimensionUnit.PIXELS }
      }

      if (lineHeight) {
        textStyle.lineHeight = parseDimensionUnit('lineHeight', tokenData, lineHeight, { unit: EDimensionUnit.AUTO }) as LineHeight
      }

      textStyle.description = tokenData.description
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

async function getFontStyle(value: TFontProps['fontWeight'], params: TTokenIterationArgs): Promise<string> {
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
