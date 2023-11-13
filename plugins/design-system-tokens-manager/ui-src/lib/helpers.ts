import { EConstants, TJsonData } from "../../plugin-src/types";
import { publish } from "../main";
import { EActions } from "../types";

type TOptions = {
  isReset: boolean, isImportTypography: boolean
}

export const processTokens = (jsonData: TJsonData, { isReset, isImportTypography }: TOptions) => {
  publish({
    type: EActions.CREATE_COLLECTION,
    params: {
      name: getCollectionName(jsonData),
      isReset,
      isImportTypography,
      payload: jsonData,
    },
  });
}

const getCollectionName = ({ $name }: TJsonData) => {
  return $name ?? EConstants.COLLECTION_TITLE;
}
