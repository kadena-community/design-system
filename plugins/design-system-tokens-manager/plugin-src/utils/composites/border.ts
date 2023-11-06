import { EConstants, EDTFCompositeTypes, EDTFTypes, EDimensionUnit, TExtension, TJsonData, TTokenData, TTokenIterationArgs } from "../../types";
import { getSymbolByUnit, parseDimensionUnit } from "../helper";
import { createToken } from "../variable";

export async function processBorderTokens({ type, value }: { type: TTokenData['type'], value: TTokenData['value'] | TExtension['mode'][0] }, token: TTokenData, params: TTokenIterationArgs, payload: TJsonData) {
  const { collection, allVariables, styles, data } = params
  let { width, style, color } = value

  const rootName = token.name
  Object.keys(value).forEach(async (propKey: string) => {
    token.name = `${rootName}${EConstants.TOKEN_NAME_DELIMITER}${propKey}`
    switch (propKey) {
      case "width":
        const parsedWidth = parseDimensionUnit(EDTFTypes.NUMBER, token, width, { unit: EDimensionUnit.PIXELS })

        if (parsedWidth.value) {
          width = parsedWidth.value + getSymbolByUnit(parsedWidth.unit)
        }

        await createToken({
          ...token,
          type: EDTFTypes.DIMENSION,
          value: width,
        }, {
          collection,
          metaData: data.$metaData,
          allVariables,
          styles,
        }, payload)
        break;
      case "color":
        await createToken({
          ...token,
          type: EDTFTypes.COLOR,
          value: color,
        }, {
          collection,
          metaData: data.$metaData,
          allVariables,
          styles,
        }, payload)

        break;
      case "style":
        await createToken({
          ...token,
          type: EDTFTypes.CUSTOM,
          value: style,
        }, {
          collection,
          metaData: data.$metaData,
          allVariables,
          styles,
        }, payload)
        break;
    }
  })

  return Promise.resolve(true)
}
