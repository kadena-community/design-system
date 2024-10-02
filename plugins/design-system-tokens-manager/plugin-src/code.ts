import { EActions } from "../ui-src/types";
import { TAction } from "./types";
import { init } from "./utils/main";
import { getPageSelecion, getTeamLibraryData, postTeamLibraryData, TPostMessageTransferProps } from "./utils/selection";
import { getLibraryReferences, getTokenVariables, TConsumedToken } from "./utils/selection/tokens";

figma.showUI(__html__, {
  height: 440,
  width: 520,
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
      }, 0)
      break;

    case EActions.CHECK_SELECTION:
      getPageSelecion();
      break;

    case EActions.TEAM_LIBRARY_DATA:
      await getTeamLibraryData();
      break;

    case EActions.GET_COLLECTION_VARIABLES:
      const data = action as unknown as TPostMessageTransferProps;
      
      await getTokenVariables(data);
      break;

    default:
      figma.closePlugin()
      break;
  }
};

export let teamData: any = null

export const setTeamData = (data: any) => {
  return teamData = data
}

figma.on("run", async () => {
  await getTeamLibraryData();
})

figma.on("selectionchange", () => {
  getPageSelecion();
});
