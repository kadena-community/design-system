import { useCallback, useEffect, useState } from "react";
import { TPostMessage } from "../../plugin-src/types";
import { EActions } from "../types";
import { TTeamLibraryData } from "../../plugin-src/utils/selection/tokens";
import { TPostMessageTransferProps } from "../../plugin-src/utils/selection";

export type TSelectionHook = {
  reloadSwapUI: () => void;
} | undefined

export const useSelection = (options?: TSelectionHook) => {
  const [data, setData] = useState<TPostMessage['payload'] | null>(null);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [teamLibData, setTeamLibData] = useState<TTeamLibraryData>()
  const [hasTeamLibData, setHasTeamLibData] = useState<boolean>(false);

  const loadTeamLibraryData = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: EActions.TEAM_LIBRARY_DATA } }, '*');
  }, []);

  const initCallback = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: EActions.CHECK_SELECTION } }, '*');
    loadTeamLibraryData();
  }, [loadTeamLibraryData]);

  const doTransfer = useCallback((data: TPostMessageTransferProps['payload']) => {
    parent.postMessage({ pluginMessage: { type: EActions.GET_COLLECTION_VARIABLES, payload: data } }, '*');
  }, []);

  const changeSelectionHandler = useCallback((data: MessageEvent<{ type: EActions, payload: TPostMessage['payload'] }>['data']) => {
    if (data.payload.selection.length) {
      setHasSelection(true);
      setData(data.payload);
    } else {
      setHasSelection(false);
      setData(null);
    }
  }, [setHasSelection, setData]);

  const getCollectionVariablesCount = useCallback((collectionKey: string) => {
    if (teamLibData?.tokens) {
      return teamLibData?.tokens?.filter((token) => token.collectionKey === collectionKey).length;
    }

    return 0
  }, [teamLibData]);

  useEffect(() => {
    initCallback()

    onmessage = (event) => {
      const message = event.data.pluginMessage;
      
      if (message.type === EActions.SELECTION_CHANGE) {
        changeSelectionHandler(message);
      }

      if (message.type === EActions.TEAM_LIBRARY_DATA) {
        setTeamLibData({
          ...message.payload.figma.teamLib,
        });
      }

      if (message.type === EActions.RELOAD_SWAP_UI && typeof options?.reloadSwapUI === 'function') {
        options.reloadSwapUI();
      }
    }

    return () => {
      onmessage = null;
    }
  }, [initCallback, changeSelectionHandler, setTeamLibData]);

  useEffect(() => {
    setHasTeamLibData(!!(teamLibData?.collections && teamLibData?.tokens));
  }, [teamLibData])

  return {
    selectionData: data,
    team: teamLibData,
    hasSelection,
    hasTeamLibData,
    setHasSelection,
    getCollectionVariablesCount,
    changeSelection: changeSelectionHandler,
    loadTeamLibraryData,
    doTransfer,
  }
};