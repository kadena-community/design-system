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

const getCollectionById = (id: string) => {
  return figma.variables.getVariableCollectionById(id);
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

export const extractTokensFromSelection = (selection: Readonly<SceneNode[]>) => {
  const tokens = tokensList([], null);
  const collections = collectionsList([], null);

  function traverseFills(node: SceneNode) {
    if ('fills' in node) {
      const fills = node.fills as Paint[];
      const boundVariables = node.boundVariables
      
      if (fills && boundVariables) {
        fills.forEach(() => {
          if (boundVariables) {
            boundVariables.fills?.forEach(variable => {
              if (variable.type === 'VARIABLE_ALIAS') {
                const token = figma.variables.getVariableById(variable.id);
  
                if (token) {
                  tokensList(tokens, token);
                }
  
                if (token?.variableCollectionId) {
                  const collection = getCollectionById(token.variableCollectionId);
                  collectionsList(collections, collection)
                }
              }
            });
          }
        });
      }
    }
  }
  
  function traverseStrokes(node: SceneNode) {
    if ('strokes' in node) {
      const strokes = node.strokes as Paint[];
      const boundVariables = node.boundVariables
      
      if (strokes && boundVariables) {
        strokes.forEach(() => {
          if (boundVariables) {
            boundVariables.strokes?.forEach(variable => {
              if (variable.type === 'VARIABLE_ALIAS') {
                const token = figma.variables.getVariableById(variable.id);
  
                if (token) {
                  tokensList(tokens, token);
                }
  
                if (token?.variableCollectionId) {
                  const collection = getCollectionById(token.variableCollectionId);
                  collectionsList(collections, collection)
                }
              }
            });
          }
        });
      }
    }
  }
  
  // @WIP
  function traverseText(node: SceneNode) {
    if (node.type === 'TEXT') {
      node = node as TextNode;
      const textVariable = node.boundVariables;
    }
  }

  function traverseNode(node: SceneNode) {
    traverseFills(node)
    traverseStrokes(node)
    traverseText(node)
      
    if ('children' in node) {
      node.children.forEach(child => traverseNode(child));
    }
  }

  selection.forEach(node => traverseNode(node));

  return {
    tokens,
    collections,
  };
}

export type TConsumedTeamLibraryCollection = {
  key: string;
  name: string;
  libraryName: string;
}

export type TConsumedTeamLibraryVariable = LibraryVariable & { collectionId: string}

export type TTeamLibraryData = {
  tokens: TConsumedTeamLibraryVariable[] | null;
  collections: TConsumedTeamLibraryCollection[];
}

export const getLibraryReferences = async (): Promise<TTeamLibraryData> => {
  const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  const tokens: TConsumedTeamLibraryVariable[] = []

  collections.forEach(async (collection) => {
    const allTokens = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);

    tokens.push(...allTokens.map(token => ({
      name: token.name,
      key: token.name,
      resolvedType: token.resolvedType,
      collectionId: collection.key,
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
  console.log({data})
  const referencedVariables: Variable[] = [];

  if (data.payload.collection.key) {
    const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(data.payload.collection.key);
    const filteredVariables = variables.filter(variable => data.payload.tokens.find(token => token.name === variable.name));
    const promises = data.payload.tokens.map(async (token) => {
      const refToken = filteredVariables.find(variable => variable.name === token.name);
  
      if (refToken) {
        const importedVariable = await figma.variables.importVariableByKeyAsync(refToken.key);
        if (importedVariable) {
          referencedVariables.push(importedVariable);
        }
      }
    });

    await Promise.all(promises);
  }

  updateSelectionVariables(data.payload.selection, referencedVariables);
}

export const updateSelectionVariables = async (selection: Readonly<SceneNode[]>, newVariables: Variable[]) => {
  function traverseFills(node: SceneNode) {
    if ('fills' in node) {
      const fills = node.fills as Paint[];
      const boundVariables = node.boundVariables
      
      if (fills && boundVariables?.fills) {
        if ('boundVariables' in fills[0]) {
          const newFill = [...node.fills as SolidPaint[]];

          if (newFill[0].boundVariables?.color?.type === 'VARIABLE_ALIAS') {
            const token = figma.variables.getVariableById(newFill[0].boundVariables.color.id);

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

  function traverseStrokes(node: SceneNode) {
    if ('strokes' in node) {
      const strokes = node.strokes as Paint[];
      const boundVariables = node.boundVariables
      
      if (strokes && boundVariables?.strokes) {
        if ('boundVariables' in strokes[0]) {
          const newStroke = [...node.strokes as SolidPaint[]];

          if (newStroke[0].boundVariables?.color?.type === 'VARIABLE_ALIAS') {
            const token = figma.variables.getVariableById(newStroke[0].boundVariables.color.id);

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

  function traverseNode(node: SceneNode) {
    traverseFills(node)
    traverseStrokes(node)
      
    if ('children' in node) {
      node.children.forEach(child => traverseNode(child));
    }
  }

  figma.currentPage.selection.forEach(node => traverseNode(node));

  console.log({ selection: figma.currentPage.selection });
}


// if ('fills' in node && node.fillStyleId) {
//   const fillStyle = figma.getStyleById(node.fillStyleId);
//   tokens.push({ type: 'fill', name: fillStyle?.name || 'Unnamed Fill', id: node.fillStyleId });
// }

// // Collect stroke style
// if ('strokes' in node && node.strokeStyleId) {
//   const strokeStyle = figma.getStyleById(node.strokeStyleId);
//   tokens.push({ type: 'stroke', name: strokeStyle?.name || 'Unnamed Stroke', id: node.strokeStyleId });
// }

// // Collect text style
// if (node.type === 'TEXT' && node.textStyleId) {
//   const textStyle = figma.getStyleById(node.textStyleId);
//   tokens.push({ type: 'text', name: textStyle?.name || 'Unnamed Text', id: node.textStyleId });
// }

// // Collect effect style
// if ('effects' in node && node.effectStyleId) {
//   const effectStyle = figma.getStyleById(node.effectStyleId);
//   tokens.push({ type: 'effect', name: effectStyle?.name || 'Unnamed Effect', id: node.effectStyleId });
// }

// // Collect grid style
// if ('layoutGrids' in node && node.gridStyleId) {
//   const gridStyle = figma.getStyleById(node.gridStyleId);
//   tokens.push({ type: 'grid', name: gridStyle?.name || 'Unnamed Grid', id: node.gridStyleId });
// }
