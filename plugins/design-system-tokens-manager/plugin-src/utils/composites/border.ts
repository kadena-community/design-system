import { TExtension, TTokenData, TTokenIterationArgs } from "../../types";

export function processBorderTokens({ type, value }: { type: TTokenData['type'], value: TTokenData['value'] | TExtension['mode'][0] }, token: TTokenData, params: TTokenIterationArgs) {
}