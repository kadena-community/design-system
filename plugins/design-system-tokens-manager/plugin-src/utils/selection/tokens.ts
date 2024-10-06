import { TPostMessageTransferProps } from ".";

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

const tokensList = (tokens: TConsumedToken[], token: Variable | null) => {
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

export type TLocalTokenReference = { id: string; collectionName: string }

const getLocalTokens = (): {
  tokens: TLocalTokenReference[];
  collections: TConsumedVariableCollection[];
} => {
  const collections = figma.variables.getLocalVariableCollections();

  const allVariables: TLocalTokenReference[] = [];
  const allCollections: TConsumedVariableCollection[] = [];

  collections.forEach(({ id, name, modes, variableIds }) => {
    const collection = figma.variables.getVariableCollectionById(id);
    const collectionExists = allCollections.find(c => c.id === id);
    
    if (collection && !collectionExists) {
      allCollections.push({
        id: id,
        variableCollectionId: id,
        key: collection.key,
        isRemote: false,
        name: name,
        modes: modes,
        variables: variableIds,
      });
    }

    if (variableIds) {
      variableIds.forEach(variableId => {
        allVariables.push({
          id: variableId,
          collectionName: name,
        });
      });
    }
  });
  
  return {
    tokens: allVariables,
    collections: allCollections,
  }
}

export const extractTokensFromSelection = async (selection: Readonly<SceneNode[]>) => {
  const tokens = tokensList([], null);
  const collections = collectionsList([], null);
  const textStyles = textStyleList([], null);

  async function traverseFills(node: SceneNode) {
    if ('boundVariables' in node) {
      const boundVariables = node.boundVariables

      if (boundVariables) {
        if (boundVariables.fills) {
          const e = boundVariables.fills?.map(async(variable) => {
            if (variable.type === 'VARIABLE_ALIAS') {
              const token = await figma.variables.getVariableByIdAsync(variable.id);
              
              if (token) {
                tokensList(tokens, token);
              }

              if (token?.variableCollectionId) {
                const collection = await getCollectionById(token.variableCollectionId);
                collectionsList(collections, collection)
              }
            }
          });

          await Promise.all(e);
        }
      }
    }
  }
  
  async function traverseStrokes(node: SceneNode) {
    if ('strokes' in node) {
      const strokes = node.strokes as Paint[];
      const boundVariables = node.boundVariables
      
      if (strokes && boundVariables) {
        const d = strokes.map(async () => {
          if (boundVariables.strokes) {
            const e = boundVariables.strokes?.map(async (variable) => {
              if (variable.type === 'VARIABLE_ALIAS') {
                const token = await figma.variables.getVariableByIdAsync(variable.id);
  
                if (token) {
                  tokensList(tokens, token);
                }
  
                if (token?.variableCollectionId) {
                  const collection = await getCollectionById(token.variableCollectionId);
                  collectionsList(collections, collection)
                }
              }
            });

            await Promise.all(e);
          }
        });

        await Promise.all(d);
      }
    }
  }
  
  // @WIP - Text Styles
  async function traverseText(node: SceneNode) {
    if (node.type === 'TEXT') {
      node = node as TextNode;
      let textStyle = figma.getStyleById(node.textStyleId as string);
      
      if (textStyle) {
        textStyle = await figma.importStyleByKeyAsync(textStyle.key);
      }
    }
  }

  async function traverseNode(node: SceneNode) {
    await traverseFills(node)
    await traverseStrokes(node)
    // await traverseText(node)
      
    if ('children' in node) {
      await Promise.all(
        node.children.map(async (child) => await traverseNode(child))
      );
    }
  }

  await Promise.all(
    selection.map(async (node) => await traverseNode(node))
  );

  return {
    tokens,
    collections,
    textStyles,
  };
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

  async function traverseFills(node: SceneNode) {
    if ('fills' in node) {
      const fills = node.fills as Paint[];
      const boundVariables = node.boundVariables
      
      if (fills && boundVariables?.fills) {
        if ('boundVariables' in fills[0]) {
          const newFill = [...node.fills as SolidPaint[]];

          if (newFill[0].boundVariables?.color?.type === 'VARIABLE_ALIAS') {
            let token = await figma.variables.getVariableByIdAsync(newFill[0].boundVariables.color.id);

            if (token) {
              const newToken = newVariables.find(newVariable => newVariable.name === token.name);

              if (newToken) {
                newFill[0] = figma.variables.setBoundVariableForPaint(newFill[0], 'color', newToken);
              }
            }

            node.fills = newFill;
          } else {
            // @WIP No bound variables in fill
          }
        }
      }
    }
  }

  async function traverseStrokes(node: SceneNode) {
    if ('strokes' in node) {
      const strokes = node.strokes as Paint[];
      const boundVariables = node.boundVariables
      
      if (strokes && boundVariables?.strokes) {
        if ('boundVariables' in strokes[0]) {
          const newStroke = [...node.strokes as SolidPaint[]];

          if (newStroke[0].boundVariables?.color?.type === 'VARIABLE_ALIAS') {
            const token = await figma.variables.getVariableByIdAsync(newStroke[0].boundVariables.color.id);

            if (token) {
              const newToken = newVariables.find(newVariable => newVariable.name === token.name);

              if (newToken) {
                newStroke[0] = figma.variables.setBoundVariableForPaint(newStroke[0], 'color', newToken);
              }
            }

            node.strokes = newStroke;
          }
        }
      }
    }
  }

  async function traverseNode(node: SceneNode) {
    await traverseFills(node)
    await traverseStrokes(node)
      
    if ('children' in node) {
      await Promise.all(node.children.map(async (child) => await traverseNode(child)));
    }
  }

  await Promise.all(
    figma.currentPage.selection.map(async (node) => await traverseNode(node))
  );

  
}
