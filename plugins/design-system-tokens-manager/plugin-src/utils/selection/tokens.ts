import { TPostMessageTransferProps } from ".";
import { loadAllStyles } from "../helper";

export type TExtractedTokens = {
  type: string;
  tokenName: string;
  nodeId: string;
  nodeName: string
}

// type BoundVariable = {
//   collection: string;
//   index: number;
//   variableAlias: string;
// };

export type TConsumedToken = {
  id: string;
  key: string;
  name: string;
  resolvedType: string;
  description: string;
  valuesByMode: Record<string, any>;
  variableCollectionId: string;
}

export type TConsumedVariableCollection = {
  id: string;
  variableCollectionId: string;
  key: string;
  name: string;
  modes?: Record<string, any>;
  isRemote: boolean;
  variables?: TConsumedToken['id'][];
}

export type TConsumedTeamLibraryCollection = {
  key: string;
  name: string;
  variableCollectionId: string;
  libraryName?: string;
}

export type TConsumedTeamLibraryVariable = LibraryVariable & { collectionKey: string}

export type TTeamLibraryData = {
  tokens: TConsumedTeamLibraryVariable[] | null;
  collections: TConsumedTeamLibraryCollection[];
}

export type TLocalLibraryData = {
  tokens: TConsumedTeamLibraryVariable[] | null;
  collections: TConsumedTeamLibraryCollection[];
}

export type TLocalTokenReference = { id: string; collectionName: string }

const tokensList = (tokens: TConsumedToken[], token: Variable | null, key: string | null) => {
  if (!tokens.find(__token => __token.id === token?.id) && token) {
    tokens.push({
      id: token.id,
      key: token.key,
      name: token.name,
      resolvedType: token.resolvedType,
      description: token.description,
      valuesByMode: token.valuesByMode,
      variableCollectionId: token.variableCollectionId,
    });
  }

  return tokens;
}

const collectionsList = (collections: TConsumedVariableCollection[], collection: VariableCollection | null) => {
  if (!collections.find(__collection => __collection.id === collection?.id) && collection) {
    collections.push({
      id: collection.id,
      variableCollectionId: collection.id,
      key: collection.key,
      isRemote: collection.remote,
      name: collection.name,
      modes: collection.modes,
      variables: collection.variableIds,
    });
  }

  return collections;
}

const textStyleList = (textStyles: TConsumedVariableCollection[], textStyle: VariableCollection | null) => {
  if (!textStyles.find(__textStyle => __textStyle.id === textStyle?.id) && textStyle) {
    textStyles.push({
      id: textStyle.id,
      variableCollectionId: textStyle.id,
      key: textStyle.key,
      isRemote: textStyle.remote,
      name: textStyle.name,
      modes: textStyle.modes,
      variables: textStyle.variableIds,
    });
  }

  return textStyles;
}

const getCollectionById = async (id: string) => {
  const collection = await figma.variables.getVariableCollectionByIdAsync(id)
  return collection;
}

export const extractTokensFromSelection = async (selection: Readonly<SceneNode[]>) => {
  const tokens = tokensList([], null, null);
  const collections = collectionsList([], null);
  // const textStyles = textStyleList([], null);

  
  async function traverseNode(node: SceneNode) {
    if (node.boundVariables) {
      await Promise.all(Object.values(node.boundVariables).map(async (variable, index) => {
        const key = Object.keys(node.boundVariables ?? [])[index];

        if (Array.isArray(variable)) {
          await Promise.all(variable.map(async (v) => {
            if (v.type === 'VARIABLE_ALIAS' && typeof v.id === 'string') {
              const token = await figma.variables.getVariableByIdAsync(v.id);
              if (token) {
                tokensList(tokens, token, key);
              }

              if (token?.variableCollectionId) {
                const collection = await getCollectionById(token.variableCollectionId);
                collectionsList(collections, collection)
              }
            }
          }));
        } else if (variable.type === 'VARIABLE_ALIAS' && typeof variable.id === 'string') {
          const token = await figma.variables.getVariableByIdAsync(variable.id);
          
          if (token) {
            tokensList(tokens, token, key);
          }

          if (token?.variableCollectionId) {
            const collection = await getCollectionById(token.variableCollectionId);
            collectionsList(collections, collection)
          }
        }
      }));

      if ('children' in node) {
        await Promise.all(node.children.map(async (child) => await traverseNode(child)));
      }
    }
  }

  await Promise.all(selection.map(async (node) => await traverseNode(node)));

  return {
    tokens,
    collections,
    // textStyles,
  };
}

export const getLibraryReferences = async (): Promise<TTeamLibraryData> => {
  const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  const tokens: TConsumedTeamLibraryVariable[] = []

  const d = collections.map(async (collection) => {
    const allTokens = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);

    tokens.push(...allTokens.map(token => ({
      name: token.name,
      key: token.name,
      resolvedType: token.resolvedType,
      collectionKey: collection.key,
    })));
  });

  await Promise.all(d);

  return {
    tokens,
    collections: collections.map(collection => ({
      key: collection.key,
      name: collection.name,
      variableCollectionId: collection.key,
      libraryName: collection.libraryName,
    }))
  }
}

export const getLocalLibraryReferences = async (): Promise<TLocalLibraryData> => {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: TConsumedTeamLibraryVariable[] = []

  await Promise.all(collections.map(async (collection) => {
    const variables = collection.variableIds

    await Promise.all(variables.map(async (variableId) => {
      const variable = await figma.variables.getVariableByIdAsync(variableId);

      if (variable) {
        tokens.push({
          name: variable.name,
          key: variable.name,
          resolvedType: variable.resolvedType,
          collectionKey: collection.key,
        });
      }

      return variable;
    }));
  }));

  return {
    tokens,
    collections: collections.map(collection => ({
      key: collection.key,
      name: collection.name,
      variableCollectionId: collection.id,
      // libraryName: collection.libraryName,
    }))
  }
}

export const getTokenVariables = async (data: TPostMessageTransferProps) => {
  const referencedVariables: Variable[] = [];
  let filteredVariables: (Variable | LibraryVariable)[] = [];

  if (data.payload.collection.key) {
    if (data.payload.collection.isRemote) {
      const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(data.payload.collection.key);
      filteredVariables = variables.filter(variable => data.payload.tokens.find(token => token.name === variable.name));
    } else {
      const variables = await figma.variables.getLocalVariablesAsync();
      
      filteredVariables = variables.filter(variable => 
        data.payload.tokens.find(token => token.name === variable.name) &&
        variable.variableCollectionId === data.payload.collection.variableCollectionId
      );
    }

    await Promise.all(data.payload.tokens.map(async (token) => {
      const refToken = filteredVariables.find(variable => variable.name === token.name);
  
      if (refToken) {
        const importedVariable = await figma.variables.importVariableByKeyAsync(refToken.key);
        if (importedVariable) {
          referencedVariables.push(importedVariable);
        }
      }
    }));
  }

  return referencedVariables;
}

export const updateSelectionVariables = async (newVariables: Variable[]) => {
  if (newVariables.length === 0) {
    console.error('No variables to update');
    return
  }

  async function traverseNode(node: SceneNode) {
    const keys = Object.keys(node.boundVariables ?? []);

    if (node.boundVariables) {
      await Promise.all(Object.values(node.boundVariables).map(async (variable, index) => await updateNode(variable, newVariables, node, keys, index)));
    }

    if ('children' in node) {
      await Promise.all(node.children.map(async (child) => await traverseNode(child)));
    }
  }

  await Promise.all(figma.currentPage.selection.map(async (node) => await traverseNode(node)));
}

async function updateNode(
  variable: VariableAlias | VariableAlias[] | { readonly [propertyName: string]: VariableAlias; },
  newVariables: Variable[],
  node: SceneNode,
  keys: string[],
  index: number
) {

  if (keys[index] === 'fills' || keys[index] === 'strokes' ) {
    const paints = (node as SceneNode & { fills?: Paint[], strokes?: Paint[] })[keys[index] as 'fills' | 'strokes'] as Paint[];

    if (paints && variable) {
      const newPaints = [...paints as SolidPaint[]];
      const updatedPaints = await Promise.all(newPaints.map(async (paint) => await updatePaint(node, paint, newVariables)));
      
      (node as SceneNode & { fills?: Paint[], strokes?: Paint[] })[keys[index] as 'fills' | 'strokes'] = updatedPaints.filter(paint => paint !== undefined) as Paint[];
    }
  } else if (Array.isArray(variable)) {
    await Promise.all(variable.map(async (v) => {
      if (v.type === 'VARIABLE_ALIAS' && typeof v.id === 'string') {
        const token = await figma.variables.getVariableByIdAsync(v.id);
        
        if (token) {
          const newToken = newVariables.find(newVariable => newVariable.name === token.name);

          if (newToken) {
            node.setBoundVariable(keys[index] as VariableBindableNodeField | VariableBindableTextField, newToken);
          }
        }
      }
    }));
  } else if (variable.type === 'VARIABLE_ALIAS' && typeof variable.id === 'string') {
    const token = await figma.variables.getVariableByIdAsync(variable.id);
    
    if (token) {
      const newToken = newVariables.find(newVariable => newVariable.name === token.name);

      if (newToken) {
        node.setBoundVariable(keys[index] as VariableBindableNodeField | VariableBindableTextField, newToken);
      }
    }
  }
}

async function updatePaint(node: SceneNode, paint: SolidPaint | ColorStop, newVariables: Variable[], isGradient = false) {
  {
    if (paint.boundVariables?.color?.type === 'VARIABLE_ALIAS') {
      const token = await figma.variables.getVariableByIdAsync(paint.boundVariables.color.id);

      if (token) {
        const newToken = newVariables.find(newVariable => newVariable.name === token.name);

        if (newToken && !isGradient) {
          paint = figma.variables.setBoundVariableForPaint(paint as SolidPaint, 'color', newToken);
        }

        return paint
      }
    } else if ('gradientStops' in paint) {
      if ('gradientStops' in paint) {
        const stops: VariableAlias[] = []
        const gradientStops = await Promise.all(
          (paint as unknown as GradientPaint).gradientStops
            .map(async (stop) => {
              if (stop.boundVariables?.color?.type === 'VARIABLE_ALIAS') {
                const token = await figma.variables.getVariableByIdAsync(stop.boundVariables.color.id);
                
                if (token) {
                  const newToken = newVariables.find(newVariable => newVariable.name === token.name);

                  if (newToken) {
                    stops.push({ id: newToken.id, type: 'VARIABLE_ALIAS' })
                  }
                }
              }

              return stop
            })
        ) as ColorStop[]
        
        const gradientPaint = {
          ...paint,
          gradientStops: gradientStops.map((stop, index) => {
            return {
              ...stop,
              boundVariables: {
                color: stops[index],
              },
            }
          }),
        } as unknown as GradientPaint

        return gradientPaint
      }
    }

    return paint
  }
}
