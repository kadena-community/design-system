import { useMemo } from 'react';
import { applyMiddleware, combineReducers, EmptyObject, ReducersMapObject, Store } from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import { composeWithDevTools } from 'redux-devtools-extension';
import thunkMiddleware from 'redux-thunk';

import { getAllReducers, initialStates } from './reducers';

type TStore = Store<EmptyObject & {
  [x: string]: unknown;
}, never> & {
  dispatch: unknown;
} | null

let store: TStore;

type TPreloadState = {
  [key: string]: any
}

type TAllReducers = ReducersMapObject<{ [x: string]: any }, any>

function initStore(preloadedState: TPreloadState) {
  return configureStore({
    reducer: combineReducers(getAllReducers() as TAllReducers),
    preloadedState,
    enhancers: [
      composeWithDevTools(applyMiddleware(thunkMiddleware)),
    ]
  }) as TStore
}

export const initializeStore = (preloadState?: any) => {
  let _store = store ?? initStore(preloadState);

  if (preloadState && store) {
    _store = initStore({
      ...store.getState(),
      ...preloadState,
    });

    store = null;
  }

  if (typeof window === 'undefined') return _store;

  if (!store) store = _store;

  return _store;
};

export const useStore = (initialState?: any) => useMemo(() => {
  return initializeStore({
    ...initialStates,
    ...initialState
  })
}, [initialState]);
