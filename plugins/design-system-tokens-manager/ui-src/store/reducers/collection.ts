import { TCollection } from "../../types/collection";
import { IActions } from "../types";

export const storeKey = 'COLLECTION';

export enum EActions {
  GET_ONE = 'GET_ONE',
  GET_ALL = 'GET_ALL',
  SET = 'SET',
  DEFAULT = 'GET_ALL',
}

export type TState = {
  collection: TCollection
  items: TCollection['items'],
  item: TCollection['items'][0]
}

export const initState = {
  name: 'Init collection name 1',
};

export default <IActions<TState, EActions>>{
  [EActions.GET_ONE]: (state, { name }) => {
    const item = state.collection.items.find((item: { name: string; }) => item.name === name)
    return {
      ...state,
      item,
    }
  },
  [EActions.SET]: (state) => {

    return state;
  },
  [EActions.GET_ALL]: (state) => {
    return state;
  },
};


