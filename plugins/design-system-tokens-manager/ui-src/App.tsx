import React, { useState } from "react";
import "./App.css";

import styles from "./style.module.css";
import { Selection } from "./layouts/Selection";
import { Form } from "./layouts/Form";
import { EViews } from "./types";

function App() {
  const [view, setView] = useState<string|null>(EViews.SELECTION);
  
  return (
    <main className={styles.wrapper}>
      {
        view === EViews.SELECTION ? (
          <Selection view={view} setView={setView} />
        ) : <Form view={view} setView={setView} />
      }
    </main>
  );
}

export default App;
