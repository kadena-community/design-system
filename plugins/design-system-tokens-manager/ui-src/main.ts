import { TAction } from "../plugin-src/types"

export const publish = (action: TAction<any>) => {
  parent.postMessage(
    { pluginMessage: action },
    '*',
  )
}
