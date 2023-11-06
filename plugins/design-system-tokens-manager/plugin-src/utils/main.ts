import { TAction, TCollectionPayload } from "../types";
import { iterateJson, processData } from "./core";
import { mapper } from '../utils/mappers/base'

export async function init(data: TAction<TCollectionPayload>, isInit = true) {
  const { params } = data

  if (params?.payload) {
    const preProcessedData = iterateJson(params.payload);
    const processedData = await processData(preProcessedData, params.payload)
    const mappedData = await mapper(processedData, params as TCollectionPayload)

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