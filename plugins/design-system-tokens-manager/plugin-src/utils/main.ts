import { EConstants, TAction, TCollectionPayload } from "../types";
import { addedIconPaths, iterateJson, processData } from "./core";
import { mapper } from '../utils/mappers/base'
import { getTypographyTokens } from "./composites/typography";
import { clearUnusedIcons } from "./composites/icon";

export async function init(data: TAction<TCollectionPayload>, isInit = true) {
  const { params } = data

  if (params?.payload) {
    if (params.isImportIcons && !isInit) {
      let iconsPage = figma.root.children.find(p => p.name === EConstants.PAGE_ICONS)

      if (!iconsPage) {
        iconsPage = figma.createPage()
        iconsPage.name = EConstants.PAGE_ICONS
      }
    }

    const preProcessedData = iterateJson(params.payload, [], isInit, params as TCollectionPayload);
    const processedData = await processData(preProcessedData, params.payload)
    const mappedData = await mapper(processedData, params as TCollectionPayload)

    if (!isInit && params.isImportTypography) {
      await getTypographyTokens(mappedData.status.tokens.typography, {
        allVariables: mappedData.variables.local,
        collection: mappedData.collections.items[0],
        data: processedData,
        payload: data.params?.payload,
        styles: mappedData.styles,
        tokens: mappedData.variables.tokens,
      }, params.payload)
    }

    if (!isInit && params.isImportIcons) {
      await clearUnusedIcons()
    }

    if (isInit && Object.keys(processedData.$tokens).length !== mappedData.variables.local.length) {
      setTimeout(async () => {
        await init({
          ...data,
          params: {
            ...data.params,
            isReset: false,
          }
        }, false)
      }, 100);
    }
  }
}