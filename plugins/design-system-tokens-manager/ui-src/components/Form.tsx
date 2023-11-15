import React, {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./style.module.css";

import jsonData from "../../../../builds/tokens/kda-design-system.raw.tokens.json";
import {
  EConstants,
  EDTFCompositeTypes,
  TJsonData,
} from "../../plugin-src/types";
import {
  findAllKeyValuePairs,
  formatDuration,
  processTokens,
} from "../lib/helpers";

export const Form = () => {
  const code = useRef<HTMLTextAreaElement>(null);
  const resetVariables = useRef<HTMLInputElement>(null);
  const importTypos = useRef<HTMLInputElement>(null);
  const [typeStyles, setTypeStyles] = useState<any[]>([]);
  const defaultDurationMessage = "approx. 2 seconds per style";
  const [duration, setDuration] = useState<string>(defaultDurationMessage);

  const getValue = useCallback(
    (value: string) => {
      try {
        setTypeStyles(
          findAllKeyValuePairs(
            JSON.parse(value),
            EConstants.TYPE_KEY as string,
            EDTFCompositeTypes.TYPOGRAPHY
          )
        );
      } catch (error) {
        setTypeStyles([]);
        setDuration(defaultDurationMessage);
        console.error(
          "Failed parsing the value, provide a valid JSON.",
          error,
          value
        );
      }
    },
    [setTypeStyles]
  );
  const changeHandler = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (evt.target?.value) {
        getValue(evt.target.value);
      }
    },
    []
  );

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

  const calcDuration = useCallback(() => {
    if (!typeStyles.length) return defaultDurationMessage;

    setDuration(
      `${formatDuration(typeStyles.length)} for ${
        typeStyles.length
      } text styles`
    );
  }, [typeStyles, setDuration]);

  useEffect(() => {
    calcDuration();
  }, [typeStyles]);

  useEffect(() => {
    if (code.current?.value) {
      getValue(code.current.value);
    }
  }, [code.current]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p>Provide your Design Tokens Format in JSON</p>
        <p>
          <a
            href="https://design-tokens.github.io/community-group/format/"
            target="_blank"
            rel="noopener noreferrer"
          >
            For more information about the DTF format.
          </a>
        </p>
      </div>
      <div className={styles.body}>
        <textarea
          spellCheck={false}
          ref={code}
          rows={10}
          placeholder="JSON Data"
          defaultValue={JSON.stringify(jsonData, null, 2)}
          onChange={changeHandler}
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
          <span>
            Reset existing variables.&nbsp;
            <strong style={{ color: "red" }}>
              Removes all variables, styles and effects.
            </strong>
          </span>
        </label>
      </div>
      <div className={styles.input}>
        <label>
          <input type="checkbox" name="reset" ref={importTypos} value="true" />
          <span>
            Import Typography. Please note that importing{" "}
            {typeStyles.length ? "these" : ""} text styles into Figma takes{" "}
            <strong style={{ color: "#ff6600" }}>about {duration}</strong>.
          </span>
        </label>
      </div>
      <div className={styles.footers}>
        <button onClick={importHandler}>Import Tokens</button>
      </div>
    </div>
  );
};
