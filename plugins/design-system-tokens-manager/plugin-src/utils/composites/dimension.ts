import { TTokenData, TTokenIterationArgs } from "../../types";
import { createToken } from "../variable";

export async function processDimensionsTokens({ type, value }: { type: TTokenData['type'], value: any }, token: TTokenData, params: TTokenIterationArgs) {
  const { collection, allVariables, styles, data } = params
  await createToken(token, {
    collection,
    metaData: data.$metaData,
    allVariables,
    styles,
  })
}