import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SelectionFooter, TFooterProps } from '../../components/Footer';

import styles from './style.module.css';
import { TConsumedToken, TConsumedVariableCollection } from '../../../plugin-src/utils/selection/tokens';
import { useSelection } from '../../hooks/selection';

export const SelectionView = ({ footerProps }: { footerProps: TFooterProps }) => {
  const sourceRef = useRef<HTMLSelectElement>(null);
  const targetRef = useRef<HTMLSelectElement>(null);
  const matchingVariablesRef = useRef<HTMLSelectElement>(null);
  const [sourceValue, setSourceValue] = useState<TConsumedVariableCollection | null>(null);
  const [targetValues, setTargetValues] = useState<TConsumedVariableCollection[]>([]);
  const [collectionVariables, setCollectionVariables] = useState<TConsumedToken[]>([]);
  const [allCollectionVariables, setAllCollectionVariables] = useState<TConsumedToken[]>([]);
  const [matchingVariables, setMatchingVariables] = useState<TConsumedToken[]>([]);
  
  const {
    selectionData,
    team,
    getCollectionVariablesCount,
    doTransfer,
  } = useSelection();

  const setValueHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectionData) {
      const [selectedOption] = event.target.selectedOptions;
      const collectionIdPrefix = `VariableCollectionId:${selectedOption.value}`;
      const matchingCollection = selectionData.figma.references.collections.find(
        (collection) => collection.id.startsWith(collectionIdPrefix)
      )

      if (!matchingCollection && team?.library?.data?.collections) {
        const teamLibCollection = team.library.data.collections.find(
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
          console.error('No matching collection found', team?.library?.data?.collections);
          return;
        }
      }

      setSourceValue(matchingCollection ?? null);
    }
  }, [, selectionData, setSourceValue]);

  const setTargetCollectionsHandler = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = event.target.selectedOptions;
    const selectedValues = Array.from(selectedOptions).map(option => option.value);
    
    setTargetValues(
      selectionData?.figma.references.collections.filter(
        (collection) => selectedValues.includes(collection.id)
      ) ?? []
    )
  }, [selectionData, setTargetValues]);

  const getSourceTokenByKey = useCallback((key: string) => {
    if (team.library.data?.tokens) {
      return team.library.data?.tokens.find((variable) => variable.key === key);
    }

    return null
  }, [team]);

  const transferCollectionHandler = useCallback(() => {
    if (sourceValue && matchingVariables.length && selectionData?.selection) {
      doTransfer({
        selection: selectionData.selection,
        tokens: matchingVariables,
        collection: sourceValue,
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

  // useEffect(() => {
  //   matchingVariables.forEach((variable) => {
  //     console.log('-- variable', variable);
  //   });
  // }, [matchingVariables]);

  useEffect(() => {
    console.log('-- targetValues', targetValues);
  }, [targetValues]);

  useEffect(() => {
    if (selectionData) {
      setAllCollectionVariables(selectionData.figma.references.tokens)
      setCollectionVariables(
        selectionData.figma.references.tokens
          .filter((token) => token.variableCollectionId !== sourceValue?.id)
          .filter((token) => targetValues.some((collection) => collection.id === token.variableCollectionId))
      );
    } else {
      setAllCollectionVariables([]);
      setCollectionVariables([]);
    }
  }, [selectionData, sourceValue, targetValues, setCollectionVariables, setAllCollectionVariables]);

  useEffect(() => {
    if (sourceValue) {
    }
    console.log('sourceValue', sourceValue);
  }, [sourceValue]);

  return (
    <div className={styles.wrapper}>
      <div>
        {team.library.data ? 
          <>
            <div><strong>Library collections</strong></div>
            <ul className={styles.list}>
              {
                team.library.data.collections.map((collection) => (
                  <li key={collection.key}>{collection.name} ({getCollectionVariablesCount(collection.key)})</li>
                ))
              }
            </ul>
          </>
          : <div>No library collections found</div>
        }
      </div>
      {
        selectionData?.selection ? (
          <div className={styles.container}>
            {
              selectionData?.figma.references.collections.length ? 
              (
                <>
                  <div><strong>Collection{selectionData.figma.references.collections.length > 1 ? 's' : ''} used for the selection</strong></div>
                  <ul className={styles.list}>
                    {
                      selectionData.figma.references.collections.map((collection) => (
                        <li key={collection.id}>{collection.name}</li>
                      ))
                    }
                  </ul>
                </>
              )
              : <div>No collections found for selection</div>
            }

            <div className={styles.comparison_wrapper}>
              <div className={[styles.col, styles.source].join(' ')}>
                <div>Destination Library Collection</div>
                <select ref={sourceRef} onChange={setValueHandler}>
                  <option>Select Library</option>
                  {
                    team?.library?.data?.collections.map((collection) => (
                      <option key={collection.key} value={collection.key}>{collection.name} ({getCollectionVariablesCount(collection.key)})</option>
                    ))
                  }
                </select>
              </div>
              <div className={[styles.col, styles.target].join(' ')}>
                <div>Target Collection Tokens</div>

                <select disabled={!sourceValue} ref={targetRef} onChange={setTargetCollectionsHandler} multiple>
                  {
                    selectionData?.figma.references.collections.map((collection) => (
                      <option disabled={collection.id === sourceValue?.id} key={collection.id} value={collection.id}>{collection.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            
            {sourceValue && (
              <div className={styles.comparison_wrapper}>
                <div className={[styles.col, styles.source].join(' ')}>
                  <div>Matching Variables ({collectionVariables.length} / {allCollectionVariables.length})</div>
                  <select onChange={changeMatchingVariablesHandler} ref={matchingVariablesRef} multiple>
                    {
                      collectionVariables?.map((variable) => (
                        <option
                          key={variable.id}
                          disabled={variable.id === sourceValue?.id}
                          value={variable.id}
                        >
                          {variable.name} {"\t ->"} {getSourceTokenByKey(variable.name)?.key}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.container}>

          </div>
        )
      }
      <SelectionFooter view={footerProps.view} setView={footerProps.setView}>
        <button onClick={transferCollectionHandler}>Transfer</button>
      </SelectionFooter>
    </div>
  );
};

export default Selection;