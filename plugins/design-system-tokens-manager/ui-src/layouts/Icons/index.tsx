import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import stylesRoot from "../style.module.css";
import styles from "./style.module.css";

import jsonData from "../../../../../builds/tokens/kda-design-system.raw.tokens.json";

import { Footer, TFooterProps } from "../../components/Footer";
import { EActions } from "../../types";
import { TIconObject } from "../../../plugin-src/utils/selection/icons";
import { useIcon } from "../../hooks/icons";
import { TConsumedTeamLibraryCollection, TConsumedVariableCollection } from "../../../plugin-src/utils/selection/tokens";

export const Icons = ({ view, setView }: TFooterProps) => {
  const [sourceValue, setSourceValue] = useState<TConsumedTeamLibraryCollection | null>(null);
  const [icons, setIcons] = useState<TIconObject[]>([]);
  const [filteredIcons, setFilteredIcons] = useState<TIconObject['$name'][]>([]);
  const [selectedIcons, setSelectedIcons] = useState<TIconObject['$name'][]>([]);
  const [existingIcons, setExistingIcons] = useState<TIconObject['$name'][]>([]);
  const [existingIconsInSelection, setExistingIconsInSelection] = useState<TIconObject['$name'][]>([]);
  const [hasSearchQuery, setHasQuery] = useState<boolean>(false);
  const [hasAliasReferences, setHasAliasReferences] = useState<boolean>(false);
  const [hasFallbackAliasReferences, setHasFallbackAliasReferences] = useState<boolean>(false);
  const iconSelectorRef = useRef<HTMLSelectElement>(null);
  const fallbackVariableRef = useRef<HTMLInputElement>(null);

  const {
    existingIcons: _existingIcons,
    teamLibData,
    localLibData,
    fetchExistingIcons,
    doTransfer,
    checkIconIdIsVariableRef,
    getTeamCollectionVariablesCount,
    getLocalCollectionVariablesCount,
  } = useIcon();

  const isDisabled = useMemo(() => {
    return !selectedIcons.length // || selectedIcons.length > 100;
  }, [selectedIcons, sourceValue]);

  const setValueHandler = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [selectedOption] = e.target.selectedOptions;
    const targetId = selectedOption.parentElement?.id


    if (selectedOption.value) {
      const selectedCollection = teamLibData?.collections.find((collection) => collection.key === selectedOption.value) ||
        localLibData?.collections.find((collection) => collection.key === selectedOption.value);

      if (selectedCollection) {
        setSourceValue({
          isRemote: targetId === 'team',
          key: selectedCollection.key,
          name: selectedCollection.name,
          variableCollectionId: selectedCollection.variableCollectionId,
        });
      }
    } else {
      setSourceValue(null);
    }
  }, [teamLibData, localLibData, setSourceValue]);
  
  const collectIcons = useCallback((obj: any, parentKeys: string[] = []): TIconObject[] => {
    const result: TIconObject[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        if ('$type' in value && value.$type === 'icon') {
          result.push({
            ...value as TIconObject,
            $name: [...parentKeys, key].join('/'),
          });
        } else {
          result.push(...collectIcons(value, [...parentKeys, key]));
        }
      }
    });
  
    return result;
  }, []);
  
  const importHandler = useCallback(() => {
    doTransfer(selectedIcons, sourceValue, fallbackVariableRef.current?.value || '');
    fetchExistingIcons();
  }, [selectedIcons, sourceValue]);

  const getIconNames = useMemo(() => {
    return icons.map((icon) => icon.$name);
  }, [icons]);

  const getIconsCount = useMemo(() => {
    return icons.length;
  }, [icons]);

  const changeMatchingIcons = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedOptionIcons = getIconNames
      .filter((iconName) => {
        return selectedOptions
          .some((selectedOption) => selectedOption.value === iconName);
      }, [] as string[])
    ;

    setSelectedIcons(selectedOptionIcons);
  }, [getIconNames, setSelectedIcons]);

  const selectAllHandler = useCallback(() => {
    if (iconSelectorRef.current) {
      const allOptions = Array.from(iconSelectorRef.current.options)
      const selectedOptions = allOptions.filter((option) => option.selected);
      const selection = allOptions.length === selectedOptions.length ? [] : hasSearchQuery ? filteredIcons : getIconNames
      
      setSelectedIcons(selection);
    }
  }, [hasSearchQuery, filteredIcons, getIconNames, setSelectedIcons]);

  const searchForIconsHandler = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value.toLowerCase();

    if (!searchValue) {
      setFilteredIcons([]);
      setHasQuery(false);
      return;
    }
    
    const filteredIcons = getIconNames.filter((icon) => icon.toLowerCase().includes(searchValue));
    
    setHasQuery(true);
    setFilteredIcons(filteredIcons);
  }, [setFilteredIcons, setHasQuery, getIconNames]);

  const selectionExistingIcons = useMemo(() => {
    if (selectedIcons?.length && existingIcons) {
      const existingIconsInSelection = selectedIcons.filter((selectedIcon) => existingIcons.some((existingIcon) => existingIcon === selectedIcon));

      return existingIconsInSelection;
    }

    return [];
  }, [existingIcons, selectedIcons]);

  const getImportLabel = useCallback(() => {
    const texts = []
    let tokensCount = 0

    if (existingIconsInSelection.length) {
      texts.push(`${existingIconsInSelection.length} existing`)
      tokensCount += existingIconsInSelection.length
    }

    if (selectedIcons.length - existingIconsInSelection.length) {
      texts.push(`${selectedIcons.length - existingIconsInSelection.length} new`)
      tokensCount += selectedIcons.length - existingIconsInSelection.length
    }

    const prefix = texts.length ? ' ' : '';
    const suffix = texts.length ? (tokensCount > 1) ? 'icons' : 'icon' : '';
    
    return prefix + texts.join(' & ') + ' ' + suffix;
  }, [existingIconsInSelection, selectedIcons]);

  const getIconByName = useCallback((icon: TIconObject['$name']) => {
    const iconObject = icons.find((iconObject) => iconObject.$name === icon);

    if (iconObject) {
      return iconObject.$value;
    }

    return '';
  }, [icons]);
  
  useEffect(() => {
    // parent.postMessage({ pluginMessage: { type: EActions.ICON_SELECTION_CHANGE } }, '*');
    setExistingIconsInSelection(selectionExistingIcons);
    // selectedIcons.forEach(hasThisIcon);
    const hasRef = checkIconIdIsVariableRef(icons, selectedIcons)

    setHasAliasReferences(hasRef);
    setHasFallbackAliasReferences(!hasRef)
  }, [selectedIcons, setExistingIconsInSelection, selectionExistingIcons, setHasAliasReferences, setHasFallbackAliasReferences, checkIconIdIsVariableRef]);
  
  useEffect(() => {
    if (hasSearchQuery) {
      setSelectedIcons(selectedIcons.filter((icon) => filteredIcons.some((filteredIcon) => filteredIcon === icon)));
    }
  }, [setSelectedIcons, filteredIcons, hasSearchQuery]);

  useEffect(() => {
    if (_existingIcons?.length) {
      setExistingIcons(_existingIcons.reduce((res, icon) => [...res, icon.$name], [] as TIconObject['$name'][]));
    }
  }, [setExistingIcons, _existingIcons]);

  useEffect(() => {
    const rawIcons = collectIcons(jsonData);
    
    setIcons(rawIcons);

    parent.postMessage({ pluginMessage: { type: EActions.INIT_ALL_ICONS, payload: { figma: { icons: rawIcons } } } }, '*');
  }, []);

  return (
    <div className={stylesRoot.wrapper}>
      <div className={[stylesRoot.body, styles.column, styles.iconsBody].join(' ')}>
        <h4 style={{maxWidth:'100%'}}>
          <span>Select the icons to be updated/added 
            ({selectedIcons.length} / {(hasSearchQuery ? filteredIcons.length : getIconsCount)})
          </span>
          <button onClick={selectAllHandler}>{selectedIcons.length === getIconsCount ? 'Deselect all' : 'Select All'}</button>
        </h4>
        <div className={styles.container}>
          <div className={styles.selector}>
            <input type="search" placeholder="Search icons" onChange={searchForIconsHandler} />
            <select ref={iconSelectorRef} onChange={changeMatchingIcons} multiple size={6}>
              {
                (filteredIcons.length || hasSearchQuery ? filteredIcons : getIconNames)?.map((icon) => {
                  
                  return (
                    <option
                      key={icon}
                      value={icon}
                      title={icon}
                      selected={selectedIcons.some((matchingIcon) => matchingIcon === icon)}
                    >
                      {icon}
                    </option>
                  )
                })
              }
            </select>
            {
              (hasAliasReferences || hasFallbackAliasReferences) && teamLibData && localLibData ? <div>
                {
                  hasAliasReferences ? 
                    <h4>Replace color variable references with the following collection variables:</h4>
                    :
                    hasFallbackAliasReferences ?
                      <h4>Assign variable as fallback icon color:</h4>
                      :
                      null
                }
                <select className={styles.collectionSelect} onChange={setValueHandler}>
                  <option value="">Select Collection</option>
                  <optgroup id='team' label='Team Library Collections'>
                    {
                      teamLibData?.collections.map((collection) => (
                        <option selected={collection.key === sourceValue?.key} key={collection.key} value={collection.key}>{collection.name} ({getTeamCollectionVariablesCount(collection.key)})</option>
                      ))
                    }
                  </optgroup>
                  <optgroup id='local' label='Local Collections'>
                    {
                      localLibData?.collections.map((collection) => (
                        <option selected={collection.key === sourceValue?.key} key={collection.key} value={collection.key}>{collection.name} ({getLocalCollectionVariablesCount(collection.key)})</option>
                      ))
                    }
                  </optgroup>
                </select>
                {
                  hasFallbackAliasReferences && sourceValue?.key ? 
                    <input className={styles.inputFallback} ref={fallbackVariableRef} type="text" placeholder="Token reference (e.g. kda/foundation/color/icon/base/default)" defaultValue="" />
                    : null
                }  
              </div>
            : null}
          </div>
          <div className={styles.details}>
            <div className={styles.iconsWrapper}>
              <SelectionPreview selectedIcons={selectedIcons} icons={icons} existingIcons={existingIcons || []} />
            </div>
          </div>
        </div>
      </div>
      
      <Footer view={view} setView={setView}>
        <button disabled={isDisabled} onClick={importHandler}>Import{getImportLabel()}</button>
      </Footer>
    </div>
  );
};

const SelectionPreview = ({ selectedIcons, icons, existingIcons }: { selectedIcons: TIconObject['$name'][], existingIcons: TIconObject['$name'][], icons: TIconObject[] }) => {
  const [innerHTML, setInnerHTML] = useState<string>('');
  
  const isActive = useCallback((icon: TIconObject['$name']) => {
    return existingIcons.some((i) => i === icon);
  }, [existingIcons]);

  const createIcons = useCallback(() => {
    setInnerHTML(
      selectedIcons.map((icon) => {
        const iconData = icons.find((i) => i.$name === icon);
    
        if (iconData) {
          return `<div class="${[styles.icon, isActive(icon) ? styles.update : styles.new].join(' ')}">${iconData.$value}</div>`;
        }
    
        return '';
      }).join('')
    );
  }, [selectedIcons, setInnerHTML, icons, isActive]);

  useEffect(() => {
    createIcons()
  }, [existingIcons, createIcons])

  return <div className={styles.iconsWrapper} dangerouslySetInnerHTML={{ __html: innerHTML }} />
}
