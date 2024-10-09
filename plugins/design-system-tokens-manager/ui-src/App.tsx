import React, { useState } from "react";
import "./App.css";

import styles from "./style.module.css";
import { Selection } from "./layouts/Selection";
import { Form } from "./layouts/Form";
import { Icons } from "./layouts/Icons";
import { EViews } from "./types";

function App() {
  const [view, setView] = useState<string|null>(EViews.ICONS);
  
  return (
    <main className={styles.wrapper}>
      {
        view === EViews.SELECTION ? <Selection view={view} setView={setView} /> : null
      }
      {
        view === EViews.FORM ? <Form view={view} setView={setView} /> : null
      }
      {
        view === EViews.ICONS ? <Icons view={view} setView={setView} /> : null
      }
    </main>
  );
}

export default App;
