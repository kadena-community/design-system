import { TJsonData } from "../../plugin-src/types";
import { publish } from "../main";
import { EActions } from "../types";
export const processTokens = (jsonData: TJsonData, isReset: boolean) => {
  publish({
    type: EActions.CREATE_COLLECTION,
    params: {
      name: getCollectionName(jsonData),
      isReset,
      payload: jsonData,
    },
  });
}

const getCollectionName = ({ $name, $version }: TJsonData) => {
  return `${$name} - ${$version}`;
}
