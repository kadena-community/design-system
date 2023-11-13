import { EActions } from "../ui-src/types";
import { TAction } from "./types";
import { init } from "./utils/main";

figma.showUI(__html__, {
  height: 400,
  width: 320,
  themeColors: true,
});

type TFonts = {
  family: string,
  style: string
}[]

figma.ui.onmessage = async (action: TAction<any>) => {
  switch (action.type) {
    case EActions.CREATE_COLLECTION:
      figma.notify(`Loading Design System`, { error: false })

      if (action.params.payload.$fonts && Array.isArray(action.params.payload.$fonts) && action.params.payload.$fonts.length) {
        const fontsToLoad: TFonts = action.params.payload.$fonts;
        await Promise.all(fontsToLoad.map(figma.loadFontAsync))
      }

      setTimeout(async () => {
        await init(action)
      }, 0);
      break;

    default:
      figma.closePlugin();
      break;
  }

};
