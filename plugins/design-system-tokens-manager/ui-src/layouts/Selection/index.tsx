import React, { useCallback, useEffect, useState } from "react";
import { EActions } from "../../types";
import { SelectionView } from "./elements";
import { TFooterProps } from "../../components/Footer";
import { TPostMessage } from "../../../plugin-src/types";
import { useSelection } from "../../hooks/selection";

import styles from "./style.module.css";

export const Selection = ({ view, setView }: TFooterProps) => {
  const {
    selectionData,
    hasSelection,
  } = useSelection();

  return (
    <div className={styles.selectionView}>
      {
        hasSelection && selectionData?.selection ? 
        <SelectionView footerProps={{ view, setView }} />
        : <>Nothing is selected</>
      }
    </div>
  )
};
