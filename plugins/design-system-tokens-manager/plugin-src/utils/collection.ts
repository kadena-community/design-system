import { TCollectionPayload, TJsonData, TProcessedData } from "../types";

export function initCollection(data: TCollectionPayload, source: TProcessedData) {
  try {
    const { name, payload, isReset } = data
    let collection: VariableCollection | null = null

    if (name && payload) {
      collection = findLocalCollection(name)

      if (collection && isReset) {
        collection.remove()
        collection = null
        figma.notify('Collection already exists therefor this collection is replaced', { error: true, timeout: 2000 })
      }

      if (!collection) {
        collection = figma.variables.createVariableCollection(name)
      }

      setCollectionModes(collection, source)

      if (collection) {
        figma.notify(`Collection "${name}" ${isReset ? 'created' : 'updated'}`, { error: false, timeout: 2000 })
      }
    }

    return {
      collection,
    }
  } catch (error) {
    console.error(error)
    throw new Error('Error')
  }
}

function setCollectionModes(collection: VariableCollection, data: TProcessedData) {
  if (collection) {
    const [defaultMode, ...sourceModes] = data.$metaData.$modes
    const [mode, ...modes] = collection.modes

    const missingModes = sourceModes.filter((mode) => !modes.find(({ modeId }) => mode !== modeId))

    collection.renameMode(mode.modeId, defaultMode)

    modes.forEach((mode) => {
      collection.renameMode(mode.modeId, mode.name)
    })

    missingModes.forEach((mode) => {
      collection.addMode(mode)
    })
  }
}

function findLocalCollection(name: string) {
  const collections = getLocalCollections()
  const collection = collections.find((collection) => collection.name === name)
  return collection || null
}

function getLocalCollections(ids?: string[]) {
  const all = figma.variables.getLocalVariableCollections();

  if (!ids) {
    return all;
  }

  return all.filter((c) => ids.includes(c.id));
}

export function getCollectionName(data: TJsonData) {
  return `${data.$name} - ${data.$version}`
}

export function getCollectionVersion(data: TJsonData) {
  return data.$version
}
