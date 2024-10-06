import { useCallback, useEffect, useState } from "react";
import { TPostMessage } from "../../plugin-src/types";
import { EActions } from "../types";
import { TLocalLibraryData, TTeamLibraryData } from "../../plugin-src/utils/selection/tokens";
import { TPostMessageTransferProps } from "../../plugin-src/utils/selection";

export type TSelectionHook = {
  reloadSwapUI: () => void;
} | undefined

export const useSelection = (options?: TSelectionHook) => {
  const [data, setData] = useState<TPostMessage['payload'] | null>(null);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [teamLibData, setTeamLibData] = useState<TTeamLibraryData>()
  const [localLibData, setLocalLibData] = useState<TLocalLibraryData>()
  const [hasTeamLibData, setHasTeamLibData] = useState<boolean>(false);
  const [hasLocalLibData, setHasLocalLibData] = useState<boolean>(false);

  const loadLibraryData = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: EActions.LIBRARY_DATA } }, '*');
  }, []);

  const initCallback = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: EActions.CHECK_SELECTION } }, '*');
    loadLibraryData();
  }, [loadLibraryData]);

  const doTransfer = useCallback((data: TPostMessageTransferProps['payload']) => {
    parent.postMessage({ pluginMessage: { type: EActions.UPDATE_COLLECTION_VARIABLES, payload: data } }, '*');
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

  const getTeamCollectionVariablesCount = useCallback((collectionKey: string) => {
    if (teamLibData?.tokens) {
      return teamLibData?.tokens?.filter((token) => token.collectionKey === collectionKey).length;
    }

    return 0
  }, [teamLibData]);

  const getLocalCollectionVariablesCount = useCallback((collectionKey: string) => {
    if (localLibData?.tokens) {
      return localLibData?.tokens?.filter((token) => token.collectionKey === collectionKey).length;
    }

    return 0
  }, [localLibData]);

  useEffect(() => {
    initCallback()

    onmessage = (event) => {
      const message = event.data.pluginMessage;
      
      if (message.type === EActions.SELECTION_CHANGE) {
        changeSelectionHandler(message);
      }

      if (message.type === EActions.LIBRARY_DATA) {
        if (!hasTeamLibData) {
          setTeamLibData({
            ...message.payload.figma.teamLib,
          });
        }

        if (!hasLocalLibData) {
          setLocalLibData({
            ...message.payload.figma.localLib,
          });
        }
      }

      if (message.type === EActions.RELOAD_SWAP_UI && typeof options?.reloadSwapUI === 'function') {
        options.reloadSwapUI();
      }
    }

    return () => {
      onmessage = null;
    }
  }, [initCallback, changeSelectionHandler, setTeamLibData, setLocalLibData, hasTeamLibData, hasLocalLibData, setHasTeamLibData, setHasLocalLibData]);

  useEffect(() => {
    setHasTeamLibData(!!(teamLibData?.collections && teamLibData?.tokens));
  }, [teamLibData])

  useEffect(() => {
    setHasLocalLibData(!!(localLibData?.collections && localLibData?.tokens));
  }, [localLibData])

  return {
    selectionData: data,
    team: teamLibData,
    local: localLibData,
    hasSelection,
    hasTeamLibData,
    hasLocalLibData,
    setHasSelection,
    getTeamCollectionVariablesCount,
    getLocalCollectionVariablesCount,
    changeSelection: changeSelectionHandler,
    loadLibraryData,
    doTransfer,
  }
};