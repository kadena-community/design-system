import { EActions } from "../ui-src/types";
import { TAction } from "./types";
import { init } from "./utils/main";
import { getLocalLibraryData, getPageSelection, getTeamLibraryData, postLibraryData, reloadSwapUI, TPostMessageTransferProps } from "./utils/selection";
import { getTokenVariables, updateSelectionVariables } from "./utils/selection/tokens";

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
      getPageSelection();
      break;

    case EActions.LIBRARY_DATA:
      const teamData = await getTeamLibraryData();
      const localData = await getLocalLibraryData();
      
      postLibraryData(teamData, localData);
      break;

    case EActions.UPDATE_COLLECTION_VARIABLES:
      const variables = action as unknown as TPostMessageTransferProps;
      try {
        const referencedVariables = await getTokenVariables(variables);

        if (referencedVariables.length) {
          await updateSelectionVariables(referencedVariables);
        } else {
          return figma.notify('Unable to find referenced variables', { timeout: 10000, error: true });
        }
        
        figma.notify(variables.payload.messages.success, { timeout: 10000 });
        reloadSwapUI();
        getPageSelection();
      } catch (error) {
        console.error(error);
        figma.notify(variables.payload.messages.error, { timeout: 10000, error: true });
        reloadSwapUI();
        getPageSelection();
      }
      break;

    default:
      figma.closePlugin()
      break;
  }
};

export let teamData: any = null
export let localData: any = null

export const setTeamData = (data: any) => {
  return teamData = data
}

export const setLocalData = (data: any) => {
  return localData = data
}

const initLoad = async () => {
  const _teamData = await getTeamLibraryData();
  const _localData = await getLocalLibraryData();
  
  postLibraryData(_teamData, _localData);
}

const loadAllPages = async () => {
  await figma.loadAllPagesAsync();
  
  figma.on("documentchange", initLoad)
  figma.on("run", initLoad)
  
  figma.on("selectionchange", () => {
    getPageSelection();
  });
};

loadAllPages();
