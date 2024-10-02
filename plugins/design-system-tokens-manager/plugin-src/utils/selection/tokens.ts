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
  key: string;
  name: string;
  modes?: Record<string, any>;
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
      key: collection.key,
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
      key: textStyle.key,
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
        key: collection.key,
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
    if ('fills' in node) {
      const fills = node.fills as Paint[];
      const boundVariables = node.boundVariables
      
      if (fills && boundVariables) {
        const d = fills.map(async () => {
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
        });
        
        await Promise.all(d);
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

    console.log({ tokens, collections })
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
  libraryName: string;
}

export type TConsumedTeamLibraryVariable = LibraryVariable & { collectionKey: string}

export type TTeamLibraryData = {
  tokens: TConsumedTeamLibraryVariable[] | null;
  collections: TConsumedTeamLibraryCollection[];
}

export const getLibraryReferences = async (): Promise<TTeamLibraryData> => {
  const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  const tokens: TConsumedTeamLibraryVariable[] = []
  // const textStyles = figma.

  collections.forEach(async (collection) => {
    const allTokens = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);

    tokens.push(...allTokens.map(token => ({
      name: token.name,
      key: token.name,
      resolvedType: token.resolvedType,
      collectionKey: collection.key,
    })));
  });

  return {
    tokens,
    collections: collections.map(collection => ({
      key: collection.key,
      name: collection.name,
      libraryName: collection.libraryName,
    }))
  }
}

export const getTokenVariables = async (data: TPostMessageTransferProps) => {
  const referencedVariables: Variable[] = [];

  if (data.payload.collection.key) {
    const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(data.payload.collection.key);
    const filteredVariables = variables.filter(variable => data.payload.tokens.find(token => token.name === variable.name));
    const promise = data.payload.tokens.map(async (token) => {
      const refToken = filteredVariables.find(variable => variable.name === token.name);
  
      if (refToken) {
        const importedVariable = await figma.variables.importVariableByKeyAsync(refToken.key);
        if (importedVariable) {
          referencedVariables.push(importedVariable);
        }
      }
    });

    await Promise.all(promise);
  }

  updateSelectionVariables(data.payload.selection, referencedVariables);
}

export const updateSelectionVariables = async (selection: Readonly<SceneNode[]>, newVariables: Variable[]) => {
  async function traverseFills(node: SceneNode) {
    if ('fills' in node) {
      const fills = node.fills as Paint[];
      const boundVariables = node.boundVariables
      
      if (fills && boundVariables?.fills) {
        if ('boundVariables' in fills[0]) {
          const newFill = [...node.fills as SolidPaint[]];

          if (newFill[0].boundVariables?.color?.type === 'VARIABLE_ALIAS') {
            const token = await figma.variables.getVariableByIdAsync(newFill[0].boundVariables.color.id);

            if (token) {
              const newToken = newVariables.find(newVariable => newVariable.name === token.name);

              if (newToken) {
                newFill[0] = figma.variables.setBoundVariableForPaint(newFill[0], 'color', newToken);
              }
            }

            node.fills = newFill;
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
