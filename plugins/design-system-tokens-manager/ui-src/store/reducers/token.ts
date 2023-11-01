import { TToken } from "../../types/token";
import { IActions } from "../types";

export const storeKey = 'TOKEN';

export enum EActions {
  GET_ONE = 'GET_ONE',
  GET_ALL = 'GET_ALL',
  SET = 'SET',
  DEFAULT = 'GET_ALL',
}

export type TState = {
  token: TToken
  items: TToken['items'],
  item: TToken['items'][0]
}

export const initState = {
  name: 'Init token name 1',
};

export default <IActions<TState, EActions>>{
  [EActions.GET_ONE]: (state, { name }) => {
    const item = state.token.items.find((item: { name: string; }) => item.name === name)
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


