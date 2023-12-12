# Design Tokens
Design tokens are a powerful tool for maintaining visual consistency and streamlining the design and development process in Kadena products.

## Name-Value Pairings
Design tokens are name and value pairings representing small, repeatable design decisions. They include colors, font styles, white space units, and motion animations. Example: `color.icon.positive` for a specific shade of green for icons.

## What are themes?
Themes are collections of token values designed to achieve a specific look or style. Examples include light and dark modes, with plans for high-contrast and non-color themes. Themes allow for consistent application of color schemes and styles across the entire product.

## Benefits
Design tokens simplify design and development by standardizing decisions and handovers between teams. Changes to design tokens affect the entire system, ensuring no hard-coded values for faster progress. Automated tooling facilitates quick adoption by designers and developers. Tokens also enable consistency across the product landscape.

## How to read tokens
Quickly accessing tokens to work faster in design and development requires a good understanding of the structure of the naming convention.

![Design Token Namespace](https://raw.githubusercontent.com/kadena-community/design-system/main/assets/images/doc/namespace.png)

A design token's name is descriptive, and each part communicates one piece of its usage.

### Namespace
Scopes the foundation, allowing for local extensibility. It can be specific components or products.

### Base
The base represents the type of visual design attribute or foundational style (e.g., color, spacing, size).

### Property
Specifies the UI element the token applies to (e.g., background, border, shadow).

### Modifier
Modifiers provide additional details about the token's purpose (e.g., color role, emphasis, interaction state). Not every token has a modifier (e.g., `kda.foundation.spacing`).

## Usage
All design tokens and usage descriptions are accessible in Figma as variables and code.

## Best practices

### Meaning over Specific Values
Choose tokens based on meaning where applicable, not specific values.

![Use design tokens that fit your specific situation.](https://raw.githubusercontent.com/kadena-community/design-system/main/assets/images/doc/do-meaning.png)

![Avoid using tokens just because the color appears to match. This can break the experience in other applications or themes.](https://raw.githubusercontent.com/kadena-community/design-system/main/assets/images/doc/dont-meaning.png)


By adhering to these principles and practices, Kadena ensures a cohesive and efficient design and development process, fostering visual consistency across its products. The structured approach to design tokens facilitates collaboration and scalability in the evolving product design landscape.