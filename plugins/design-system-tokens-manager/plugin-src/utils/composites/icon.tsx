import { EConstants, EDTFTypes } from "../../types";
import { addIcon, addedIconPaths } from "../core";
import { hasAliasValue, stripVariableName } from "../helper";

type TSVGMetaData = {
  $description: string;
  $path: string[];
  $type: string;
  $style: string;
  $dimensions: {
    width: number;
    height: number;
  };
};

let allVariables: Variable[] = [];
export let frame: FrameNode | null;
let vectorPaint: SolidPaint | undefined;
let vectorMonoPaint: SolidPaint | undefined;
const frameGroup = EConstants.ICONS_FRAME_NAME;

export function clearState() {
  frame = null;
}

function createFrame() {
  frame = figma.currentPage.findOne(
    (n) => n.name === frameGroup
  ) as FrameNode | null;

  if (!frame) {
    frame = figma.createFrame();
    frame.x = 0;
    frame.y = 0;
    frame.name = frameGroup;
    frame.layoutMode = "HORIZONTAL";
    frame.layoutSizingHorizontal = "HUG";
    frame.layoutSizingVertical = "HUG";
    frame.layoutPositioning = "AUTO";
    frame.overflowDirection = "HORIZONTAL";
    frame.minWidth = 24 * 20 + 19 * 16;
    frame.maxWidth = 24 * 20 + 19 * 16;
    frame.layoutWrap = "WRAP";
    frame.itemSpacing = 16;
    frame.counterAxisSpacing = 16;
    frame.fills = [];
  }

  return frame;
}

function setCurrentPageToIcons() {
  let currentPage = figma.currentPage;

  if (currentPage.name !== EConstants.PAGE_ICONS) {
    currentPage =
      figma.root.children.find((p) => p.name === EConstants.PAGE_ICONS) ||
      figma.currentPage;

    if (currentPage) {
      figma.currentPage = currentPage;
    }
  }
}

function createComponent(
  svg: string,
  name: string,
  token: null | Variable,
  metaData: TSVGMetaData
): FrameNode {
  const svgComponent = figma.createNodeFromSvg(svg);
  svgComponent.name = name;
  svgComponent.constraints = {
    horizontal: "SCALE",
    vertical: "SCALE",
  };
  svgComponent.resizeWithoutConstraints(
    metaData.$dimensions.width,
    metaData.$dimensions.height
  );

  const svgPaths = [...svgComponent.children] as VectorNode[];

  svgComponent.fills = [];

  svgPaths.forEach((node) => {
    if (hasAliasValue(node.name)) {
      if (token) {
        const name = stripVariableName(node.name);
        const variable = allVariables.find(
          (variable) => variable.name === name
        );

        if (variable) {
          const [fill] = node.fills as SolidPaint[];

          vectorPaint = figma.variables.setBoundVariableForPaint(
            fill,
            EDTFTypes.COLOR,
            variable
          );

          if (vectorPaint) {
            node.fills = [vectorPaint];
          }
        }
      }
    } else {
      const [fill] = node.fills as SolidPaint[];

      if (!vectorMonoPaint && token) {
        vectorMonoPaint = figma.variables.setBoundVariableForPaint(
          fill,
          EDTFTypes.COLOR,
          token
        );
      }

      if (vectorMonoPaint) {
        node.fills = [vectorMonoPaint];
      }
    }
  });

  return svgComponent;
}

function updateComponent(
  svg: string,
  name: string,
  token: null | Variable,
  metaData: TSVGMetaData
): FrameNode["children"] {
  return createComponent(svg, name, token, metaData).children;
}

export function createSVG(
  metaData: TSVGMetaData,
  svg: string,
  iconToken: null | Variable
) {
  try {
    let SVGComponent;
    setCurrentPageToIcons();

    if (!allVariables.length) {
      allVariables = figma.variables.getLocalVariables("COLOR");
    }

    let name = metaData.$path.pop();
    const path = metaData.$path.join(EConstants.TOKEN_NAME_DELIMITER);

    const componentName = `${path}${EConstants.TOKEN_NAME_DELIMITER}${name}`;
    let component = figma.currentPage.children.find(
      (node) => node.name === componentName && node.type === "COMPONENT"
    ) as FrameNode | undefined;

    if (!component) {
      component = figma.currentPage.children.find(
        (node) => node.name === frameGroup
      ) as FrameNode | undefined;

      if (component) {
        component = component.children.find(
          (node) => node.name === componentName
        ) as FrameNode | undefined;
      }
    }

    if (!component) {
      component = createComponent(svg, componentName, iconToken, metaData);
      component.name = componentName;
      SVGComponent = figma.createComponentFromNode(component);
    } else {
      const newContent = updateComponent(
        svg,
        componentName,
        iconToken,
        metaData
      );
      component.children.forEach((vector) => vector.remove());
      newContent.forEach((child) => component?.appendChild(child));
    }

    if (
      SVGComponent &&
      metaData.$description &&
      SVGComponent.description !== metaData.$description
    ) {
      SVGComponent.description = metaData.$description;
    }

    addIcon(componentName);

    return true;
  } catch (error) {
    console.error("Error creating SVG icon", error);
    throw new Error("ERROR");
  }
}

export async function clearUnusedIcons(): Promise<void> {
  setCurrentPageToIcons();

  try {
    let emptyFrames = figma.currentPage.children.filter(
      (node) => node?.type === "FRAME"
    ) as FrameNode[] | undefined;
    emptyFrames?.forEach(
      (frame) => frame && !frame?.children?.length && frame?.remove()
    );

    if (!frame) {
      frame = figma.currentPage.findOne(
        (n) => n.name === frameGroup
      ) as FrameNode | null;
    }

    const unusedIcons =
      frame?.children.filter((node) => !addedIconPaths.includes(node.name)) ??
      [];

    if (!unusedIcons.length) {
      layoutAllIcons();
      return Promise.resolve();
    }

    unusedIcons?.forEach(async (node, index) => {
      node?.remove();

      if (unusedIcons.length - 1 === index) {
        layoutAllIcons();
        return Promise.resolve(true);
      }
    });
  } catch (error) {
    console.error("Error creating SVG icon 2", error);
  }
}

function layoutAllIcons() {
  setCurrentPageToIcons();

  if (!frame) {
    frame = createFrame();
  }

  if (frame && !frame.children.length) {
    figma.currentPage.children
      .filter((node) => node.type === "COMPONENT")
      .forEach((component) => frame?.appendChild(component));
  } else if (frame.children) {
    const addedIconComponents: string[] = frame.children
      .filter((node) => node.type === "COMPONENT")
      .reduce((res, { name }) => [...res, name], [] as string[]);
    figma.currentPage.children
      .filter(
        (node) =>
          node.type === "COMPONENT" && !addedIconComponents.includes(node.name)
      )
      .forEach((component) => frame?.appendChild(component));
  }
}
