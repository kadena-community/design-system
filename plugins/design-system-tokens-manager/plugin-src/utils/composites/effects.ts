import { TEffectProps, TTokenData, TTokenIterationArgs } from "../../types";
import { hasAliasValue, parseDimensionUnit } from "../helper";
import { getCompositeAliasValue } from "./helpers";

export function processEffectsTokens({ type, value }: { type: TTokenData['type'], value: TEffectProps }, token: TTokenData, params: TTokenIterationArgs) {
  try {
    const styleName = token.name
    let effectStyle = params.styles.effects.find(({ name }) => name === styleName) || figma.createEffectStyle()

    const effectValue = Object.keys(value).reduce((resolvedData, key) => {
      let compositeValue = value[key as keyof TEffectProps]

      if (compositeValue && hasAliasValue(compositeValue)) {
        compositeValue = getCompositeAliasValue(compositeValue)
      }

      if (typeof compositeValue === 'string') {
        compositeValue = parseDimensionUnit(type, token, compositeValue || 0).value || 0
      }

      return {
        ...resolvedData,
        [key]: compositeValue
      }
    }, {} as TEffectProps)

    if (effectValue.color) {
      const effectProps: DropShadowEffect = {
        type: "DROP_SHADOW",
        color: effectValue.color as unknown as RGBA,
        offset: {
          x: effectValue.offsetX as number,
          y: effectValue.offsetY as number,
        },
        radius: effectValue.blur || 0,
        blendMode: 'NORMAL',
        visible: true,
        spread: parseDimensionUnit(type, token, value.spread || 0).value
      }

      effectStyle.name = styleName
      effectStyle.description = token.description
      effectStyle.effects = [effectProps]
    }
  } catch (error) {
    console.error(error)
  }
}