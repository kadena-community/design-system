import React, { useCallback, useEffect, useState } from "react"

import styles from "./style.module.css";
import { EViews } from "../types";
import { useSelection } from "../hooks/selection";

export type TFooterProps = {
  view: string | null;
  setView: React.Dispatch<React.SetStateAction<string | null>>;
  children?: React.ReactNode;
};

export const Footer = ({ setView, children }: TFooterProps) => {
  const selectionTokenHandler = useCallback(() => {
    setView(EViews.SELECTION);
  }, []);

  return (
    <div className={styles.footers}>
      <button data-variant="outline" onClick={selectionTokenHandler}>Swap Variables</button>
      <div>
        {children}
      </div>
    </div>
  )
}

export const SelectionFooter = ({ hasTeamLibData, setView, children }: TFooterProps & { hasTeamLibData: boolean }) => {
  const {
    loadTeamLibraryData,
  } = useSelection();

  const selectionTokenHandler = useCallback(() => {
    setView(EViews.FORM);
  }, []);

  return (
    <div className={styles.footers}>
      <div className={styles.startButtons}>
        <button data-variant="outline" onClick={selectionTokenHandler}>Import Tokens</button>
      </div>
      <div className={styles.endButtons}>
        {!hasTeamLibData ? <button data-variant="outline" onClick={loadTeamLibraryData}>Load Libraries</button> : <></>}
        {children}
      </div>
    </div>
  )
}
