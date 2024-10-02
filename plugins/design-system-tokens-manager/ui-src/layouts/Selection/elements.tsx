import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SelectionFooter, TFooterProps } from '../../components/Footer';

import styles from './style.module.css';
import { TConsumedToken, TConsumedVariableCollection } from '../../../plugin-src/utils/selection/tokens';
import { useSelection } from '../../hooks/selection';
import { NoSelection } from './placeholder';
import { EActions } from '../../types';

export const SelectionView = ({ footerProps }: { footerProps: TFooterProps }) => {
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
    hasTeamLibData,
    hasSelection,
    setHasSelection,
    getCollectionVariablesCount,
    doTransfer,
  } = useSelection({
    reloadSwapUI: resetSelection,
  });


  const setValueHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectionData) {
      const [selectedOption] = event.target.selectedOptions;

      if (!selectedOption.value) {
        reselectCollection();
        return
      }

      const collectionIdPrefix = `VariableCollectionId:${selectedOption.value}`;
      const matchingCollection = selectionData.figma.references.collections.find(
        (collection) => collection.id.startsWith(collectionIdPrefix)
      )

      if (!matchingCollection && team?.collections) {
        const teamLibCollection = team.collections.find(
          (collection) => collection.key === selectedOption.value
        );

        if (teamLibCollection) {
          return setSourceValue({
            id: `VariableCollectionId:${teamLibCollection.key}`,
            key: teamLibCollection.key,
            name: teamLibCollection.name,
            // modes: undefined,
            // variables: undefined,
          });
        } else {
          console.error('No matching collection found', team?.collections);
          return;
        }
      }

      setSourceValue(matchingCollection ?? null);

      if (targetValues.length > 0) {
        setTargetValues([]);
      }
    }
  }, [selectionData, targetValues, setTargetValues, setSourceValue, reselectCollection]);

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
    if (team?.tokens) {
      return team.tokens.find((variable) => variable.key === key);
    }

    return null
  }, [team]);

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
                  {
                    team?.collections.map((collection) => (
                      <option selected={collection.key === sourceValue?.key} key={collection.key} value={collection.key}>{collection.name} ({getCollectionVariablesCount(collection.key)})</option>
                    ))
                  }
                </select>
              </div>
              <div className={[styles.col, styles.target].join(' ')}>
                <h4>Select a collection{selectionData.figma.references.collections.length > 1 ? '(s)' : ''} to swap with the previously chosen:</h4>

                <select disabled={!sourceValue} onChange={setTargetCollectionsHandler} multiple size={2}>
                  {
                    selectionData?.figma.references.collections.map((collection) => (
                      <option
                        disabled={collection.id === sourceValue?.id}
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
