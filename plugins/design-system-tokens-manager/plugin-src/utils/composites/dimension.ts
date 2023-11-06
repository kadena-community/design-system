import { TJsonData, TTokenData, TTokenIterationArgs } from "../../types";
import { getAliasAbsoluteValue } from "../extension";
import { hasAliasValue, parseDimensionUnit } from "../helper";
import { createToken } from "../variable";

type TProcessToken = {
  token: TTokenData,
  collection: TTokenIterationArgs['collection']
  value: TTokenData['value']
  type: TTokenData['type']
  allVariables: TTokenIterationArgs['allVariables']
  mode: TTokenIterationArgs['collection']['modes'][0]
}

export async function processDimensionsTokens({ type, value }: { type: TTokenData['type'], value: any }, token: TTokenData, params: TTokenIterationArgs, payload: TJsonData) {
  const { collection, allVariables, styles, data } = params

  await createToken(token, {
    collection,
    metaData: data.$metaData,
    allVariables,
    styles,
  }, payload)

  return Promise.resolve(true)
}