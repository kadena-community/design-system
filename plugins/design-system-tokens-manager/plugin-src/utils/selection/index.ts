import { EActions } from "../../../ui-src/types";
import { localData, setLocalData, setTeamData, teamData } from "../../code";
import { getAvailableIcons } from "./icons";
import { extractTokensFromSelection, getLibraryReferences, getLocalLibraryReferences, TConsumedToken, TConsumedVariableCollection, TLocalLibraryData, TTeamLibraryData } from "./tokens";

export type TPostmessageData = {
  selection: Readonly<SceneNode[]>;
  figma: {
    references: {
      tokens: TConsumedToken[];
      collections: TConsumedVariableCollection[];
    };
  }
};

export type TPostmessageTeamData = {
  figma: {
    teamLib: TTeamLibraryData;
    localLib: TLocalLibraryData;
  }
};

export type TPostMessageProps = {
  type: EActions;
  payload: TPostmessageData;
}

export type TPostReloadUIProps = {
  type: EActions;
}

export type TPostMessageTeamProps = {
  type: EActions;
  payload: TPostmessageTeamData;
}

export type TPostMessageTransferProps = {
  type: EActions;
  payload: {
    messages: {
      success: string;
      error: string;
    },
    selection: Readonly<SceneNode[]>;
    tokens: TConsumedToken[];
    collection: TConsumedVariableCollection;
  }
}

export const getPageSelection = () => {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    const message:TPostReloadUIProps = {
      type: EActions.RELOAD_SWAP_UI,
    }

    figma.ui.postMessage(message);

    return
  }

  postPageData(selection);

  return selection;
}

export const postPageData = async (selection: Readonly<SceneNode[]>) => {
  const references = await extractTokensFromSelection(selection)
  
  const message:TPostMessageProps = {
    type: EActions.SELECTION_CHANGE,
    payload: {
      selection,
      figma: {
        references: {
          ...references,
        },
      },
    },
  }

  figma.ui.postMessage(message);
}

export const getTeamLibraryData = async () => {
  if (!teamData) {
    const teamLib = await getLibraryReferences();
    
    setTeamData(teamLib)
  }

  return teamData;
}

export const getLocalLibraryData = async () => {
  if (!localData) {
    const localLib = await getLocalLibraryReferences();
    
    setLocalData(localLib)
  }

  return localData;
}

export const postLibraryData = (teamLib: TTeamLibraryData, localLib: TLocalLibraryData) => {
  const message:TPostMessageTeamProps = {
    type: EActions.LIBRARY_DATA,
    payload: {
      figma: {
        teamLib,
        localLib,
      },
    },
  }

  figma.ui.postMessage(message);
}

export const postAvailableIcons = () => {
  const icons = getAvailableIcons();
  
  figma.ui.postMessage({
    type: EActions.PAGE_ICONS_DATA,
    payload: {
      figma: {
        icons,
      },
    },
  });
}

export const reloadSwapUI = () => {
  figma.ui.postMessage({ type: EActions.RELOAD_SWAP_UI });
}


