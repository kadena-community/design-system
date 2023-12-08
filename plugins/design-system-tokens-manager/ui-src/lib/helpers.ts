import { EConstants, TJsonData } from "../../plugin-src/types";
import { publish } from "../main";
import { EActions } from "../types";

type TOptions = {
  isReset: boolean, isImportTypography: boolean, isImportIcons: boolean
}

export const processTokens = (jsonData: TJsonData, { isReset, isImportTypography, isImportIcons }: TOptions) => {
  publish({
    type: EActions.CREATE_COLLECTION,
    params: {
      name: getCollectionName(jsonData),
      isReset,
      isImportTypography,
      isImportIcons,
      payload: jsonData,
    },
  });
}

const getCollectionName = ({ $name }: TJsonData) => {
  return $name ?? EConstants.COLLECTION_TITLE;
}

interface NestedObject {
  [key: string]: any;
}

export function findAllKeyValuePairs(obj: NestedObject, targetKey: string, targetValue: any): any[] {
  let results: any = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (key === targetKey && value === targetValue) {
        results.push(obj);
      }

      if (typeof value === 'object' && value !== null) {
        const nestedResults = findAllKeyValuePairs(value, targetKey, targetValue);
        results = [
          ...results,
          ...nestedResults,
        ];
      }
    }
  }

  return results;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes ? 's' : ''}`);
  }

  if (remainingSeconds > 0) {
    parts.push(`${remainingSeconds} second${remainingSeconds ? 's' : ''}`);
  }

  const formattedTime = parts.join(' ');

  return formattedTime;
}

