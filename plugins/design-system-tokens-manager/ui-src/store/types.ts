export type IActions<State, Action extends string | number | symbol> = {
  [key in Action]: (state: State, action: { [key: string]: any; }) => State;
};

