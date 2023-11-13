import { TCollectionPayload, TPreMappedData, TProcessedData, TTokenData, TTokenMappedData, TTranspiledData } from "../../types"
import { initCollection } from "../collection"
import { hasAliasValue, loadAllStyles } from "../helper"
import { getLocalVariables, iterateTokens } from "../variable"

let addedTokens: string[] = []
let failedTokens: string[] = []
let typographyTokens: string[] = []

export async function prepareMapper(data: TProcessedData, payload: TCollectionPayload): Promise<TPreMappedData> {
  const aliases: TTokenData[] = []
  const tokens: TTokenData[] = []
  const texts: TextStyle[] = []
  const effects: EffectStyle[] = []

  const newData = await Object.values(data.$tokens).reduce(async (allTokens, token) => {
    const isAlias = hasAliasValue(token.value)

    if (isAlias) {
      aliases.push(token)
    } else {
      tokens.push(token)
    }

    return [
      ...await allTokens,
      {
        ...token,
        isAlias,
      }
    ]
  }, Promise.resolve([]) as Promise<TTokenMappedData[]>)

  return {
    source: newData,
    aliases,
    tokens,
    styles: {
      texts,
      effects,
    }
  }
}

export async function mapper(data: TProcessedData, params: TCollectionPayload): Promise<TTranspiledData> {
  const { payload } = params
  let {
    tokens,
    aliases,
    styles,
  } = await prepareMapper(data, params)
  const {
    collection
  } = initCollection(params, data)

  const allVariables = getLocalVariables()
  styles = loadAllStyles(styles)

  if (params.isReset) {
    styles.effects.forEach((style) => style.remove())
    styles.texts.forEach((style) => style.remove())
    styles.effects = []
    styles.texts = []
  }

  if (payload && collection) {
    const { added: tokensAdded, failed: tokensFailed, typography: tokensTypoFailed } = await iterateTokens({ collection, data, allVariables, tokens, styles, payload })
    const { added: aliasesAdded, failed: aliasesFailed, typography: aliasesTypoFailed } = await iterateTokens({ collection, data, allVariables, tokens: aliases, styles, isSkipStyles: true, payload })
    addedTokens = [
      ...addedTokens,
      ...tokensAdded,
      ...aliasesAdded,
    ]
    failedTokens = [
      ...failedTokens,
      ...tokensFailed,
      ...aliasesFailed,
    ]
    typographyTokens = [...new Set([
      ...typographyTokens,
      ...tokensTypoFailed,
      ...aliasesTypoFailed
    ])]
  }

  return {
    collections: {
      items: [
        ...(collection ? [collection] : [])
      ]
    },
    variables: {
      local: allVariables,
      tokens,
      aliases,
      sum: tokens.length + aliases.length,
    },
    styles,
    status: {
      tokens: {
        added: addedTokens,
        failed: failedTokens,
        typography: typographyTokens,
      }
    }
  }
}
