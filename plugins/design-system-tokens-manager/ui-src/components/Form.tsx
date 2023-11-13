import React, { useCallback, useRef } from "react";
import styles from "./style.module.css";

import jsonData from "../../../../builds/tokens/kda-design-system.raw.tokens.json";
import { TJsonData } from "../../plugin-src/types";
import { processTokens } from "../lib/helpers";

export const Form = () => {
  const code = useRef<HTMLTextAreaElement>(null);
  const resetVariables = useRef<HTMLInputElement>(null);
  const importTypos = useRef<HTMLInputElement>(null);

  const importHandler = useCallback(() => {
    try {
      const data: TJsonData = JSON.parse(code.current?.value || "{}");
      const isReset = resetVariables.current?.checked || false;
      const isImportTypography = importTypos.current?.checked || false;
      processTokens(data, { isReset, isImportTypography });
    } catch (error) {
      console.error("Error parsing data", error);
    }
  }, [code, resetVariables, importTypos]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p>Introduction paragraph</p>
      </div>
      <div className={styles.body}>
        <textarea
          ref={code}
          rows={10}
          placeholder="Your DTF json data"
          defaultValue={JSON.stringify(jsonData, null, 2)}
        ></textarea>
      </div>
      <div className={styles.input}>
        <label>
          <input
            type="checkbox"
            name="reset"
            ref={resetVariables}
            value="true"
          />
          Reset existing variables
        </label>
      </div>
      <div className={styles.input}>
        <label>
          <input type="checkbox" name="reset" ref={importTypos} value="true" />
          Import Typography (importing text styles into Figma takes about 2
          seconds)
        </label>
      </div>
      <div className={styles.footers}>
        <input type="button" value="Import tokens" onClick={importHandler} />
      </div>
    </div>
  );
};
