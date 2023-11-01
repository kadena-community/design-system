import React /*, { useState } */ from "react";
import { useStore } from "./store";
import "./App.css";

import styles from "./style.module.css";
import { Form } from "./components/Form";

function App() {
  const store = useStore();
  // const [states, setStates] = useState(store?.getState());

  return (
    <main className={styles.wrapper}>
      <Form />
    </main>
  );
}

export default App;
