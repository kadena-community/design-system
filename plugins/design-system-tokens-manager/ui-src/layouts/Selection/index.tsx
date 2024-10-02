import React from "react";
import { SelectionView } from "./elements";
import { SelectionFooter, TFooterProps } from "../../components/Footer";
import { useSelection } from "../../hooks/selection";
import { NoSelection } from "./placeholder";

import styles from "./style.module.css";

export const Selection = ({ view, setView }: TFooterProps) => {
  const {
    selectionData,
    hasSelection,
    hasTeamLibData,
  } = useSelection();

  return (
    <div className={styles.selectionView}>
      {
        hasSelection && selectionData?.selection ? 
        <SelectionView footerProps={{ view, setView }} />
        : 
        <div className={styles.wrapper}>
          <NoSelection />
          <SelectionFooter hasTeamLibData={hasTeamLibData} setView={setView} view={view} />
        </div>
      }
    </div>
  )
};
