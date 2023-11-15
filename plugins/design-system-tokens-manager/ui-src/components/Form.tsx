import React, {
  ChangeEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./style.module.css";

import advancedDataset from "../data/kda-design-system-multi-mode.raw.tokens.json";
import simpleDataset from "../data/kda-design-system-simple.raw.tokens.json";

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
  const multiMode = useRef<HTMLInputElement>(null);
  const resetVariables = useRef<HTMLInputElement>(null);
  const importTypos = useRef<HTMLInputElement>(null);
  const [typeStyles, setTypeStyles] = useState<any[]>([]);
  const [sampleData, setSampleData] = useState<string>("");
  const defaultDurationMessage = "approx. 2 seconds per style";
  const [duration, setDuration] = useState<string>(defaultDurationMessage);
  const [isResetVars, setIsResetVars] = useState<boolean>(false);
  const [isImportTypos, setIsImportTypos] = useState<boolean>(false);
  const [isMultiMode, setMultiMode] = useState<boolean>(true);

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
      if (evt?.target?.value) {
        getValue(evt?.target.value);
      }
    },
    []
  );
  const multiModeHandler = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setMultiMode(!isMultiMode);
    },
    [setMultiMode, isMultiMode]
  );
  const resetHandler = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setIsResetVars(!isResetVars);
    },
    [setIsResetVars, isResetVars]
  );
  const setTypoHandler = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setIsImportTypos(!isImportTypos);
    },
    [setIsImportTypos, isImportTypos]
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

  const loadSampleData = useCallback(
    (data: any) => {
      try {
        setSampleData(JSON.stringify(data, null, 2));
      } catch (error) {
        console.error("Error parsing the token dataset");
      }
    },
    [setSampleData]
  );

  useEffect(() => {
    calcDuration();
  }, [typeStyles]);

  useEffect(() => {
    if (code.current?.value) {
      getValue(code.current.value);
    }
  }, [code.current, sampleData]);

  useEffect(() => {
    setIsResetVars(false);
    setIsImportTypos(false);
    setMultiMode(true);
  }, [setIsResetVars, setIsImportTypos, setMultiMode]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p>
          The Design System Token Manager enables you to create your token
          variable collection(s) by providing your design system tokens in JSON
          according to the DTF Module formatting standard.{" "}
          <a
            href="https://design-tokens.github.io/community-group/format/"
            target="_blank"
            rel="noopener noreferrer"
          >
            For more information about the DTF format.
          </a>
        </p>
        <p>
          You can start by trying out the example{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              loadSampleData(simpleDataset);
            }}
          >
            simple
          </a>{" "}
          or{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              loadSampleData(advancedDataset);
            }}
          >
            advanced
          </a>{" "}
          tokens.
        </p>
      </div>
      <div className={styles.body}>
        <textarea
          spellCheck={false}
          ref={code}
          rows={10}
          placeholder="JSON Data"
          defaultValue={sampleData}
          onChange={changeHandler}
        ></textarea>
      </div>
      <div className={styles.input}>
        <label>
          <input
            type="checkbox"
            name="multimode"
            defaultChecked={isMultiMode}
            ref={multiMode}
            onChange={multiModeHandler}
          />
          <span>
            Multi-mode {isMultiMode ? "enabled" : "disabled"}.&nbsp;
            {isMultiMode ? (
              <strong>Only supported with a plan supporting multi-mode.</strong>
            ) : (
              <></>
            )}
          </span>
        </label>
      </div>
      <div className={styles.input}>
        <label>
          <input
            type="checkbox"
            name="reset"
            defaultChecked={isResetVars}
            ref={resetVariables}
            onChange={resetHandler}
          />
          <span>
            Reset existing variables.&nbsp;
            {isResetVars ? (
              <strong>Removes all variables, styles and effects.</strong>
            ) : (
              <></>
            )}
          </span>
        </label>
      </div>
      <div className={styles.input}>
        {!!typeStyles.length ? (
          <label>
            <input
              type="checkbox"
              name="typo"
              ref={importTypos}
              defaultChecked={isImportTypos}
              onChange={setTypoHandler}
            />
            <span>
              Import Typography.{" "}
              {isImportTypos ? (
                <>
                  Please note that importing {typeStyles.length ? "these" : ""}{" "}
                  text styles into Figma takes <strong>about {duration}</strong>
                  .
                </>
              ) : (
                <></>
              )}
            </span>
          </label>
        ) : (
          <></>
        )}
      </div>
      <div className={styles.footers}>
        <button onClick={importHandler}>
          {isResetVars ? "Recreate" : "Sync"} Tokens
        </button>
      </div>
    </div>
  );
};
