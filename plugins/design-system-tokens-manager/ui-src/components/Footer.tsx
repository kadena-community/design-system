import React, { useCallback } from "react"

import styles from "./style.module.css";
import { EViews } from "../types";

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
      <button data-variant="outline" onClick={selectionTokenHandler}>Selection Tokens</button>
      <div>
        {children}
      </div>
    </div>
  )
}

export const SelectionFooter = ({ setView, children }: TFooterProps) => {
  const selectionTokenHandler = useCallback(() => {
    setView(EViews.FORM);
  }, []);

  return (
    <div className={styles.footers}>
      <button data-variant="outline" onClick={selectionTokenHandler}>Import Tokens</button>
      <div>
        {children}
      </div>
    </div>
  )
}
