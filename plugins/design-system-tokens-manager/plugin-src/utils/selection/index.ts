import { EActions } from "../../../ui-src/types";
import { setTeamData, teamData } from "../../code";
import { extractTokensFromSelection, getLibraryReferences, TConsumedTeamLibraryCollection, TConsumedToken, TConsumedVariableCollection, TLocalTokenReference, TTeamLibraryData } from "./tokens";

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
  }
};

export type TPostMessageProps = {
  type: EActions;
  payload: TPostmessageData;
}

export type TPostMessageTeamProps = {
  type: EActions;
  payload: TPostmessageTeamData;
}

export type TPostMessageTransferProps = {
  type: EActions;
  payload: {
    selection: Readonly<SceneNode[]>;
    tokens: TConsumedToken[];
    collection: TConsumedVariableCollection;
  }
}

export const getPageSelecion = () => {
  const selection = figma.currentPage.selection;

  postPageData(selection);

  return selection;
}

export const postPageData = (selection: Readonly<SceneNode[]>) => {
  const references = extractTokensFromSelection(selection)
  
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

  postTeamLibraryData(teamData);

  return teamData;
}

export const postTeamLibraryData = (teamLib: TTeamLibraryData) => {
  const message:TPostMessageTeamProps = {
    type: EActions.TEAM_LIBRARY_DATA,
    payload: {
      figma: {
        teamLib,
      },
    },
  }

  figma.ui.postMessage(message);
}


