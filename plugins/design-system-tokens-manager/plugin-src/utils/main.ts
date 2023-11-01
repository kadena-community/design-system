import { TAction, TCollectionPayload } from "../types";
import { iterateJson, processData, transpileData } from "./core";

export async function init(data: TAction<TCollectionPayload>, isInit = true) {
  const { params } = data

  if (params?.payload) {
    const preProcessedData = iterateJson(params.payload);
    const processedData = await processData(preProcessedData, params.payload)
    const transpiledData = await transpileData(processedData, params as TCollectionPayload)

    if (isInit && Object.keys(processedData.$tokens).length !== transpiledData.variables.local.length) {
      setTimeout(() => {
        init({
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