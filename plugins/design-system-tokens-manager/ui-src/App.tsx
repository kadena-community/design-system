import React from "react";
import "./App.css";

import styles from "./style.module.css";
import { Form } from "./components/Form";

function App() {
  return (
    <main className={styles.wrapper}>
      <Form />
    </main>
  );
}

export default App;
