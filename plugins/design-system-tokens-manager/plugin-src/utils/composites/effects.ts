import { EDTFTypes, TBlurEffectProps, TJsonData, TPropIterationProps, TShadowEffectProps, TTokenData, TTokenIterationArgs } from "../../types";
import { hasAliasValue, parseDimensionUnit } from "../helper";
import { getCompositeAliasValue } from "./helpers";

export function processEffectsTokens({ type, value }: { type: TTokenData['type'], value: TShadowEffectProps | TBlurEffectProps }, token: TTokenData, params: TTokenIterationArgs, payload: TJsonData) {
  try {
    const styleName = token.name
    let effectStyle = params.styles.effects.find(({ name }) => name === styleName) || figma.createEffectStyle()

    switch (token.type) {
      case EDTFTypes.SHADOW:
        processShadowEffect(effectStyle, token, value as TShadowEffectProps)
        break;

      case EDTFTypes.BLUR:
        processBlurEffect(effectStyle, token, value as TBlurEffectProps)
        break;
    }
  } catch (error) {
    console.error(error)
  }
}

export function iterateEffectProps<T extends {}>(value: T, token: TTokenData, params?: TPropIterationProps) {
  const props = Object.keys(value).reduce((resolvedData, key): T => {
    if (params?.skipKeys?.includes(key)) {
      return {
        ...resolvedData,
        [key]: value[key as keyof T],
      }
    }

    let compositeValue: any = value[key as keyof T]

    if (compositeValue && typeof compositeValue === 'string' && hasAliasValue(compositeValue)) {
      compositeValue = getCompositeAliasValue(compositeValue)
    }

    if (typeof compositeValue === 'string') {
      compositeValue = parseDimensionUnit(token.type, token, compositeValue || 0).value ?? 0
    }

    return {
      ...resolvedData,
      [key]: compositeValue
    }
  }, {} as T)
  return props
}

function processShadowEffect(effectStyle: EffectStyle, token: TTokenData, props: TShadowEffectProps) {
  const { name, description, type } = token
  const effectValue = iterateEffectProps<TShadowEffectProps>(props, token)

  if (effectValue.color) {
    const effectProps: DropShadowEffect = {
      type: "DROP_SHADOW",
      color: effectValue.color as unknown as RGBA,
      offset: {
        x: effectValue.offsetX as number,
        y: effectValue.offsetY as number,
      },
      radius: effectValue.blur ?? 0,
      blendMode: 'NORMAL',
      visible: true,
      spread: parseDimensionUnit(type, token, props.spread ?? 0).value
    }

    effectStyle.name = name
    effectStyle.description = description
    effectStyle.effects = [effectProps]
  } else {
    effectStyle.remove()
  }
}

function processBlurEffect(effectStyle: EffectStyle, token: TTokenData, props: TBlurEffectProps) {
  try {
    const { name, description } = token
    const effectValue = iterateEffectProps<TBlurEffectProps>(props, token)

    if (effectValue.radius) {
      const effectProps: BlurEffect = {
        type: "LAYER_BLUR",
        radius: effectValue.radius ?? 0,
        visible: props.visible ?? true,
      }

      effectStyle.name = name
      effectStyle.description = description
      effectStyle.effects = [effectProps]

    } else {
      effectStyle.remove()
    }
  } catch (error) {
    console.error('Effects error', error)
  }
}
