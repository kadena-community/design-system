import { EDimensionUnit, TExtension, TFontProps, TTokenData, TTokenIterationArgs } from "../../types";
import { hasAliasValue, parseDimensionUnit, parseFontSize } from "../helper";
import { processTokenAliasValue } from "../variable";

export async function processTypographyTokens({ type, value }: { type: TTokenData['type'], value: TTokenData['value'] | TExtension['mode'][0] }, token: TTokenData, params: TTokenIterationArgs) {
  try {
    if (typeof value === 'object') {
      value = await Object.keys(value).reduce(async (resolvedValue, key) => {
        return {
          ...await resolvedValue,
          [key]: hasAliasValue(value[key]) ? getTypographyAliasValue(value, key) : value[key],
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
    } = value

    let textStyle = params.styles.texts.find(({ name }) => name === textStyleName) || figma.createTextStyle()

    const family = getFontFamily(fontFamily)
    const style = getFontStyle(fontWeight)

    if (family) {
      await figma.loadFontAsync({ family, style })


      textStyle.name = textStyleName
      textStyle.fontName = {
        family,
        style,
      }
      textStyle.fontSize = parseFontSize(fontSize)
      textStyle.letterSpacing = parseDimensionUnit('letterSpacing', token, letterSpacing) as LetterSpacing
      textStyle.lineHeight = parseDimensionUnit('lineHeight', token, lineHeight, { unit: EDimensionUnit.AUTO }) as LineHeight
      textStyle.description = token.description
    }

  } catch (error) {
    console.error(error)
  }

  return JSON.stringify(value)
}

function getTypographyAliasValue(value: TTokenData['value'] | TExtension['mode'][0], key: string) {
  const variableAliasValue = processTokenAliasValue(value[key])

  if (variableAliasValue) {
    const [firstModeValue] = Object.values(variableAliasValue.valuesByMode)
    value = firstModeValue
  }

  return value
}

function getFontFamily(value: TFontProps['fontFamily']): string | null {
  return value || null
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

  return value || 'Regular'
}
