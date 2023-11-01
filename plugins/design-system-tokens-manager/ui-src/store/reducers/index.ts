import COLLECTION_REDUCER, { EActions as COLLECTION_ACTIONS, initState as COLLECTION_STATES, storeKey as COLLECTION, TState as TCollectionState } from './collection';
import TOKEN_REDUCER, { EActions as TOKEN_ACTIONS, initState as TOKEN_STATES, storeKey as TOKEN, TState as TTokenState } from './token';

interface ICombinedReducers {
  [reducerName: string]: unknown;
}

type TAllReducers = [
  string,
  typeof COLLECTION_REDUCER | typeof TOKEN_REDUCER,
  typeof COLLECTION_ACTIONS | typeof TOKEN_ACTIONS
][]

/**
 *
 * SET REDUCERS HERE
 *
 */
const allReducers: TAllReducers = [
  [COLLECTION, COLLECTION_REDUCER, COLLECTION_ACTIONS],
  [TOKEN, TOKEN_REDUCER, TOKEN_ACTIONS],
];

export const initialStates = {
  [COLLECTION]: COLLECTION_STATES,
  [TOKEN]: TOKEN_STATES,
};
/**
 *
 *
 */

type TReducer = typeof COLLECTION_REDUCER | typeof TOKEN_REDUCER
type TReducerActions = typeof COLLECTION_ACTIONS | typeof TOKEN_ACTIONS
type TState = TCollectionState & TTokenState

type TReducerKeys = keyof TReducer
type TReducerAction = {
  type: TReducerKeys;
};


const getReducer =
  (Actions: TReducer, EActions: TReducerActions) =>
    (state: TState, action: TReducerAction) => {
      const actionToCall = typeof Actions[action.type] === 'function' ? action.type : EActions.DEFAULT;
      return Actions[actionToCall](state, action) || null;
    };

export const getAllReducers = (): ICombinedReducers =>
  allReducers.reduce((combinedReducers, [reducerKey, actions, actionTypes]) => {
    return {
      ...combinedReducers,
      [reducerKey]: getReducer(actions, actionTypes),
    };
  }, {});
