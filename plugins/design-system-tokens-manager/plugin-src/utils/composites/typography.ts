import { EConstants, EDimensionUnit, TFontProps, TTokenData, TTokenIterationArgs } from "../../types";
import { hasAliasValue, parseDimensionUnit, parseFontSize } from "../helper";
import { processTokenAliasValue } from "../variable";

export async function processTypographyTokens({ type, value }: { type: TTokenData['type'], value: TFontProps }, token: TTokenData, params: TTokenIterationArgs) {
  try {
    let checkValue = {
      ...value as { [key: string]: any }
    }

    if (typeof checkValue === 'object') {
      checkValue = await Object.keys(checkValue).reduce(async (resolve, key) => {
        let setValue = null

        if (hasAliasValue(checkValue[key])) {
          const fontAliasValue = getTypographyAliasValue(checkValue[key])

          if (typeof fontAliasValue === 'object' && fontAliasValue?.fontFamily) {
            setValue = fontAliasValue?.fontFamily ?? null
          } else {
            setValue = fontAliasValue as TFontProps['fontFamily']
          }
          // }
        } else {
          setValue = checkValue[key]
        }

        if (typeof setValue === 'string' && ['fontSize', 'lineHeight'].includes(key)) {
          setValue = parseDimensionUnit(type, token, setValue || 0).value ?? 0
        }

        return {
          ...await resolve,
          [key]: setValue,
        }
      }, Promise.resolve({}))
    }

    const textStyleName = token.name
    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
    } = checkValue

    const family = getFontFamily(fontFamily)
    const style = getFontStyle(fontWeight)

    if (!family) {
      return value
    }

    let textStyle = params.styles.texts.find(({ name }) => name === textStyleName) || figma.createTextStyle()

    if (family) {
      try {
        await figma.loadFontAsync({ family, style })
      } catch (error) {
        console.warn('Something happend while loading the font', error)
      }

      textStyle.name = textStyleName
      textStyle.fontName = {
        family,
        style,
      }
      textStyle.fontSize = fontSize ? parseFontSize(fontSize) : EConstants.BASE_FONT_SIZE
      textStyle.letterSpacing = parseDimensionUnit('letterSpacing', token, letterSpacing ?? 0) as LetterSpacing

      if (lineHeight) {
        textStyle.lineHeight = parseDimensionUnit('lineHeight', token, lineHeight, { unit: EDimensionUnit.AUTO }) as LineHeight
      }

      textStyle.description = token.description
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

function getFontStyle(value: TFontProps['fontWeight']): string {
  if (typeof value === 'string') {
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
