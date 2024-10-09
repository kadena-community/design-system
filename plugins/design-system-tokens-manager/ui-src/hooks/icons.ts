import { useCallback, useEffect, useMemo, useState } from "react";
// import { TPostMessage } from "../../plugin-src/types";
import { EActions } from "../types";
import { TIconConsumedObject, TIconObject, TPostAvailableIconsProps, TPostSelectedIconProps } from "../../plugin-src/utils/selection/icons";
import { TConsumedTeamLibraryCollection, TLocalLibraryData, TTeamLibraryData } from "../../plugin-src/utils/selection/tokens";
import { hasAliasValue } from "../../plugin-src/utils/helper";
// import collection from "../store/reducers/collection";

export type TIconsHook = {} | undefined

export const useIcon = (options?: TIconsHook) => {
  const [data, setData] = useState<TIconConsumedObject[] | null>(null);
  const [teamLibData, setTeamLibData] = useState<TTeamLibraryData>()
  const [localLibData, setLocalLibData] = useState<TLocalLibraryData>()
  const [hasTeamLibData, setHasTeamLibData] = useState<boolean>(false);
  const [hasLocalLibData, setHasLocalLibData] = useState<boolean>(false);
  
  const fetchExistingIcons = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: EActions.COLLECT_EXISTING_ICONS } }, '*');
  }, []);

  const initCallback = useCallback(() => {
    fetchExistingIcons();
  }, [fetchExistingIcons]);

  const checkIconIdIsVariableRef = useCallback((allIcons: TIconObject[], icons: string[]) => {
    const regex = /id="\{([a-zA-Z0-9_.]+)\}"/g;

    return icons.some((icon) => {
      const refIcon = allIcons.find((i) => i.$name === icon);

      if (refIcon) {
        const svgString = refIcon.$value;
        const matches = [...svgString.matchAll(regex)];
    
        return matches.some(match => {
          const [, id] = match;
          
          if (hasAliasValue(`{${id}}`)) {
            return true;
          }
    
          return false;
        });
      }

      return false
    });
  }, []);

  const doTransfer = useCallback((data: TPostSelectedIconProps['payload']['icons'], collectionData: TConsumedTeamLibraryCollection | null, fallbackVariableRef: string) => {
    parent.postMessage(
      { pluginMessage: {
        type: EActions.UPDATE_ICONS,
        payload: {
          fallbackVariableRef,
          collection: collectionData,
          icons: data
        }
      }
    }, '*');
  }, []);

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
      
      if (
        message.type === EActions.PAGE_ICONS_DATA ||
        message.type === EActions.COLLECT_EXISTING_ICONS
      ) {
        setData(event.data.pluginMessage.payload.figma.icons);
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
    }

    return () => {
      onmessage = null;
    }
  }, [initCallback, setData]);

  useEffect(() => {
    setHasTeamLibData(!!(teamLibData?.collections && teamLibData?.tokens));
  }, [teamLibData])

  useEffect(() => {
    setHasLocalLibData(!!(localLibData?.collections && localLibData?.tokens));
  }, [localLibData])
  
  return {
    existingIcons: data,
    fetchExistingIcons,
    doTransfer,
    checkIconIdIsVariableRef,
    getTeamCollectionVariablesCount,
    getLocalCollectionVariablesCount,
    teamLibData,
    localLibData,
    hasTeamLibData,
    hasLocalLibData,
  }
};