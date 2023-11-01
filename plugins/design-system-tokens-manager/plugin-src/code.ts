import { EActions } from "../ui-src/types";
import { TAction } from "./types";
import { init } from "./utils/main";

figma.showUI(__html__, {
  height: 400,
  width: 320,
  themeColors: true,
});

figma.ui.onmessage = async (action: TAction<any>) => {
  switch (action.type) {
    case EActions.CREATE_COLLECTION:
      await init(action)
      break;

    default:
      figma.closePlugin();
      break;
  }

};
