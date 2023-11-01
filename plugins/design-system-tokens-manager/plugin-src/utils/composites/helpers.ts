import { TExtension, TTokenData } from "../../types"
import { processTokenAliasValue } from "../variable"

export function getCompositeAliasValue(value: TTokenData['value'] | TExtension['mode'][0]) {
  const variableAliasValue = processTokenAliasValue(value)

  if (variableAliasValue) {
    const [firstModeValue] = Object.values(variableAliasValue.valuesByMode)
    value = firstModeValue
  }

  return value
}

