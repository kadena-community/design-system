import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SelectionFooter, TFooterProps } from '../../components/Footer';

import styles from './style.module.css';
import { TConsumedToken, TConsumedVariableCollection } from '../../../plugin-src/utils/selection/tokens';
import { useSelection } from '../../hooks/selection';
import { NoSelection } from './placeholder';
import { EActions } from '../../types';

export const SelectionView = ({ footerProps }: { footerProps: TFooterProps }) => {
  const [sourceTargetId, setSourceTargetId] = useState<"team" | "local" | null>(null);
  const [sourceValue, setSourceValue] = useState<TConsumedVariableCollection | null>(null);
  const [targetValues, setTargetValues] = useState<TConsumedVariableCollection[]>([]);
  const [collectionVariables, setCollectionVariables] = useState<TConsumedToken[]>([]);
  const [allCollectionVariables, setAllCollectionVariables] = useState<TConsumedToken[]>([]);
  const [matchingVariables, setMatchingVariables] = useState<TConsumedToken[]>([]);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);
  
  const resetSelection = useCallback(function () {
    setTargetValues([]);
    setSourceValue(null);
    setMatchingVariables([]);
    setIsAllSelected(false);
    setHasSelection(false);
  }, [setTargetValues, setSourceValue, setMatchingVariables, setIsAllSelected]);

  const reselectCollection = useCallback(function () {
    setTargetValues([]);
    setSourceValue(null);
    setMatchingVariables([]);
    setIsAllSelected(false);
  }, [setTargetValues, setSourceValue, setMatchingVariables, setIsAllSelected]);

  const {
    selectionData,
    team,
    local,
    hasTeamLibData,
    hasSelection,
    setHasSelection,
    getTeamCollectionVariablesCount,
    getLocalCollectionVariablesCount,
    doTransfer,
  } = useSelection({
    reloadSwapUI: resetSelection,
  });


  const setValueHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectionData) {
      const [selectedOption] = event.target.selectedOptions;
      const targetId = selectedOption.parentElement?.id

      if (!selectedOption.value || !targetId) {
        reselectCollection();
        return
      }

      setSourceTargetId(targetId as 'team' | 'local');

      const collectionIdPrefix = `VariableCollectionId:${selectedOption.value}`;
      const matchingCollection = selectionData.figma.references.collections.find(
        (collection) => collection.id.startsWith(collectionIdPrefix)
      )

      if (!matchingCollection && team?.collections && targetId === 'team') {
        const teamLibCollection = team.collections.find(
          (collection) => collection.key === selectedOption.value
        );

        if (teamLibCollection) {
          return setSourceValue({
            id: `VariableCollectionId:${teamLibCollection.key}`,
            key: teamLibCollection.key,
            variableCollectionId: teamLibCollection.variableCollectionId,
            isRemote: true,
            name: teamLibCollection.name,
            // modes: undefined,
            // variables: undefined,
          });
        } else {
          console.error('No matching team collection found', team?.collections);
          return;
        }
      } else if (!matchingCollection && local?.collections && targetId === 'local') {
        const localLibCollection = local.collections.find(
          (collection) => collection.key === selectedOption.value
        );

        if (localLibCollection) {
          return setSourceValue({
            id: localLibCollection.key,
            variableCollectionId: localLibCollection.variableCollectionId,
            key: localLibCollection.key,
            isRemote: false,
            name: localLibCollection.name,
            // modes: undefined,
            // variables: undefined,
          });
        } else {
          console.error('No matching local collection found', local?.collections);
          return;
        }
      }

      setSourceValue(matchingCollection ?? null);

      if (targetValues.length > 0) {
        setTargetValues([]);
      }
    }
  }, [team, local, selectionData, targetValues, setTargetValues, setSourceValue, reselectCollection, setSourceTargetId]);

  const setTargetCollectionsHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = event.target.selectedOptions;
    const selectedValues = Array.from(selectedOptions).map(option => option.value);
    
    setTargetValues(
      selectionData?.figma.references.collections.filter(
        (collection) => selectedValues.includes(collection.id)
      ) ?? []
    )

    if (matchingVariables.length > 0) {
      setMatchingVariables([]);
    }
  }, [selectionData, matchingVariables, setTargetValues, setMatchingVariables]);

  const getSourceTokenByKey = useCallback((key: string) => {
    let token = null;

    if (sourceTargetId === "team" && team?.tokens) {
      token = team.tokens.find((variable) => variable.key === key);
    } else if (sourceTargetId === "local" && local?.tokens) {
      token = local.tokens.find((variable) => variable.key === key);
    }

    return token
  }, [team, local, sourceTargetId]);

  const transferCollectionHandler = useCallback(() => {
    if (sourceValue && matchingVariables.length && selectionData?.selection) {
      doTransfer({
        selection: selectionData.selection,
        tokens: matchingVariables,
        collection: sourceValue,
        messages: {
          success: `Collection variables within selection swapped successfully to ${sourceValue.name}`,
          error: 'Failed to swap collection',
        }
      });
    }
  }, [selectionData, sourceValue, matchingVariables]);

  const changeMatchingVariablesHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = event.target.selectedOptions;
    const selectedValues = Array.from(selectedOptions).map(option => option.value);
    
    setMatchingVariables(
      collectionVariables.filter((variable) => selectedValues.includes(variable.id))
    );
  }, [setMatchingVariables, collectionVariables]);

  const selectAllMatchingVariablesHandler = useCallback(() => {
    setMatchingVariables(isAllSelected ? [] : collectionVariables);
  }, [setMatchingVariables, collectionVariables, isAllSelected]);

  const checkIfSourceCollection = useCallback((collection: TConsumedVariableCollection) => {
    if (sourceValue && sourceTargetId === 'local') {
      return sourceValue.id === collection.key;
    }
    
    return sourceValue?.id === collection.id;
  }, [sourceTargetId, sourceValue]);

  useEffect(() => {
    setIsAllSelected(collectionVariables.length === matchingVariables.length);
  }, [collectionVariables, matchingVariables]);

  useEffect(() => {
    if (selectionData) {
      setAllCollectionVariables(selectionData.figma.references.tokens)
      setCollectionVariables(
        selectionData.figma.references.tokens
          .filter((token) => getSourceTokenByKey(token.name)?.key)
          .filter((token) => token.variableCollectionId !== sourceValue?.id)
          .filter((token) => targetValues.some((collection) => collection.id === token.variableCollectionId))
      );
    } else {
      setAllCollectionVariables([]);
      setCollectionVariables([]);
    }
  }, [selectionData, sourceValue, targetValues, setCollectionVariables, setAllCollectionVariables]);

  return (
    <div className={styles.wrapper}>
      {
        hasSelection && selectionData?.selection ? (
          <div className={styles.container}>
            <div className={styles.comparison_wrapper}>
              <div className={[styles.col, styles.source].join(' ')}>
                <h4>Replace the collections existing in your selection with:</h4>
                <select onChange={setValueHandler}>
                  <option value="">Select Collection</option>
                  <optgroup id='team' label='Team Library Collections'>
                    {
                      team?.collections.map((collection) => (
                        <option selected={collection.key === sourceValue?.key} key={collection.key} value={collection.key}>{collection.name} ({getTeamCollectionVariablesCount(collection.key)})</option>
                      ))
                    }
                  </optgroup>
                  <optgroup id='local' label='Local Collections'>
                    {
                      local?.collections.map((collection) => (
                        <option selected={collection.key === sourceValue?.key} key={collection.key} value={collection.key}>{collection.name} ({getLocalCollectionVariablesCount(collection.key)})</option>
                      ))
                    }
                  </optgroup>
                </select>
              </div>
              <div className={[styles.col, styles.target].join(' ')}>
                <h4>Select a collection{selectionData.figma.references.collections.length > 1 ? '(s)' : ''} to swap with the previously chosen:</h4>

                <select disabled={!sourceValue} onChange={setTargetCollectionsHandler} multiple size={2}>
                  {
                    selectionData?.figma.references.collections.map((collection) => (
                      <option
                        disabled={checkIfSourceCollection(collection)}
                        key={collection.id}
                        value={collection.id}
                        selected={targetValues.some((target) => target.id === collection.id)}
                      >
                        {collection.name}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
            
            {sourceValue && targetValues.length ? (
              <div className={styles.comparison_wrapper}>
                <div className={[styles.col, styles.source].join(' ')}>
                  <h4 style={{maxWidth:'100%'}}><span>Select the variables to be swapped ({matchingVariables.length} / {collectionVariables.length})</span> <button onClick={selectAllMatchingVariablesHandler}>{matchingVariables.length === collectionVariables.length ? 'Deselect all' : 'Select All'}</button></h4>
                  <select onChange={changeMatchingVariablesHandler} multiple size={6}>
                    {
                      collectionVariables?.map((variable) => {
                        const targetKey = getSourceTokenByKey(variable.name)?.key
                        const title = `${variable.name}\n${targetKey}`
                        const label = variable.name
                        return (
                          <option
                            key={variable.id}
                            disabled={variable.id === sourceValue?.id}
                            value={variable.id}
                            title={title}
                            selected={matchingVariables.some((matchingVariable) => matchingVariable.id === variable.id)}
                          >
                            {label}
                          </option>
                        )
                      })
                    }
                  </select>
                </div>
              </div>
            ): <></>}
          </div>
        ) : (
          <NoSelection />
        )
      }
      <SelectionFooter hasTeamLibData={hasTeamLibData} view={footerProps.view} setView={footerProps.setView}>
        <button disabled={matchingVariables.length === 0} onClick={transferCollectionHandler}>Swap{sourceValue?.name ? ' to '+sourceValue?.name : ''}</button>
      </SelectionFooter>
    </div>
  );
};

export default Selection;
