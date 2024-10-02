import React from 'react';

import styles from "./style.module.css";

export const NoSelection = () => {
  return (
    <div className={[styles.container, styles.placeholder].join(' ')}>
      <div>
        <h1>Swap Collection Variables</h1>
        <p>Welcome to our plugin, designed to effortlessly swap entire variable collections simultaneously, saving you from the tedious task of mapping each variable individually. The only requirement is that the variable names must match, but with our easy-to-use import feature, achieving this is a breeze!</p>
        <p>To start, select one or more layers and swap your collection variables in a few clicks.</p>
      </div>
    </div>
  )
}
