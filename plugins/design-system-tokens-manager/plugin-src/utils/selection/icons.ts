import { getLocalLibraryData, getTeamLibraryData } from ".";
import { EActions } from "../../../ui-src/types";
import { hasAliasValue, stripVariableName } from "../helper";
import { TConsumedTeamLibraryCollection, TConsumedTeamLibraryVariable, TLibraryData } from "./tokens";

let libData: TLibraryData | null = null
let variables: (Variable | LibraryVariable)[] = [];
let icons: { $name: string }[] = []
let collectionIcons: TIconObject[] = []
let baseIconVariable: Variable | null = null

export type TIconObject = {
  $type: string
  $name: string
  $description: string
  $style: string
  $value: string
  $dimensions: {
    width: number
    height: number
  }
}

export type TProcessSVGOptionsProps = {
  fallbackVariableRef: string;
}

export type TIconConsumedObject = {
  $name: string
  // $description: string
}

export type TPostAvailableIconsProps = {
  type: EActions.PAGE_ICONS_DATA;
  payload: {
    figma: {
      icons: TIconConsumedObject[];
    }
  }
}

export type TPostCollectionIconsProps = {
  type: EActions.PAGE_ICONS_DATA;
  payload: {
    figma: {
      icons: TIconObject[];
    }
  }
}

export type TPostSelectedIconProps = {
  type: EActions.UPDATE_ICONS;
  payload: {
    fallbackVariableRef: string;
    collection: TConsumedTeamLibraryCollection | null;
    icons: TIconObject['$name'][];
  }
}

export function setCollectionIcons(data: TIconObject[]) {
  collectionIcons = data;
}

function isComponentNode(node: BaseNode): node is ComponentNode {
  return node.type === 'COMPONENT';
}

export const getAvailableIconNames = () => {
  const result: TIconConsumedObject[] = [];

  function traverse(nodeList: SceneNode[]) {
    nodeList.forEach(node => {
      if (isComponentNode(node)) {
        result.push({
          $name: node.name,
        });
        
      }

      if ('children' in node && node.children) {
        traverse(node.children as SceneNode[]);
      }
    });
  }

  figma.currentPage.children.forEach(node => traverse([node]));

  return result;
}

export const getAvailableIcons = () => {
  const result: TIconConsumedObject[] = [];

  function traverse(nodeList: SceneNode[]) {
    nodeList.forEach(node => {
      if (isComponentNode(node)) {
        result.push({
          $name: node.name,
        });
      }

      if ('children' in node && node.children) {
        traverse(node.children as SceneNode[]);
      }
    });
  }

  figma.currentPage.children.forEach(node => traverse([node]));

  return result;
}

export const getAvailableIconComponents = () => {
  const result: ComponentNode[] = [];

  function traverse(nodeList: SceneNode[]) {
    nodeList.forEach(node => {
      if (isComponentNode(node)) {
        result.push(node);
      }

      if ('children' in node && node.children) {
        traverse(node.children as SceneNode[]);
      }
    });
  }

  figma.currentPage.children.forEach(node => traverse([node]));

  return result;
}

export const collectIcons = (obj: any, parentKeys: string[] = []): TIconObject[] => {
  const result: TIconObject[] = [];

  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('$type' in value && value.$type === 'icon') {
        result.push({
          ...value as TIconObject,
          $name: [...parentKeys, key].join('/'),
        });
      } else {
        result.push(...collectIcons(value, [...parentKeys, key]));
      }
    }
  });

  return result;
}

export const getAvailableLibraryData = async () => {
  if (!libData) {
    const teamData = await getTeamLibraryData();
    const localData = await getLocalLibraryData();

    libData = {
      teamData,
      localData,
    }
  }

  return libData;
}

export const updateSelectedIcons = async ({ icons, collection, fallbackVariableRef }: TPostSelectedIconProps['payload']) => {
  await loadVariables(collection);

  const availableIcons = getAvailableIconComponents();
  const baseRefVariableName = stripVariableName(fallbackVariableRef);

  if (!baseIconVariable) {
    baseIconVariable = await getVariableByName(baseRefVariableName, null)
  }

  await Promise.all(icons.map(async (icon) => {
    let newIcon: ComponentNode
    const figmaIcon = availableIcons.find((availableIcon) => availableIcon.name === icon);
    const iconData = collectionIcons.find((i) => i.$name === icon);

    if (!iconData) {
      return
    }

    const vector: FrameNode = await processSVG(figma.createNodeFromSvg(iconData.$value), collection, { fallbackVariableRef: baseIconVariable });
    
    if (figmaIcon) {
      figmaIcon.children.forEach((child) => child.remove());
      figmaIcon.appendChild(vector);

      newIcon = figmaIcon;
    } else {
      newIcon = figma.createComponent();
      newIcon.appendChild(vector);
      figma.currentPage.appendChild(newIcon);
    }

    newIcon.name = iconData.$name;
    newIcon.description = iconData.$description;
    newIcon.resize(iconData.$dimensions.width, iconData.$dimensions.height);
    
    const firstChildFrame = newIcon.children[0] as FrameNode;
    firstChildFrame.constraints = {
      horizontal: 'SCALE',
      vertical: 'SCALE',
    }
    
    if (firstChildFrame && firstChildFrame.name !== 'icon') {
      firstChildFrame.name = 'icon'
    }
  }));

}

async function processSVG(node: FrameNode, collection: TPostSelectedIconProps['payload']['collection'], options: {
  fallbackVariableRef: Variable | null;
}): Promise<FrameNode> {
  if ('children' in node) {
    await Promise.all(node.children.map((childNode) => replaceFills(childNode, collection, options)));
  }
  
  return node
}

async function loadVariables(collection: TPostSelectedIconProps['payload']['collection']) {
  if (collection?.isRemote) {
    variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
  } else {
    variables = await figma.variables.getLocalVariablesAsync()
  }

  return variables
}

async function replaceFills(node: SceneNode, collection: TPostSelectedIconProps['payload']['collection'], options: {
  fallbackVariableRef: Variable | null;
}): Promise<SceneNode> {
  if ('fills' in node) {
    const { fallbackVariableRef } = options
    const fills = Array.isArray(node.fills) ? [...node.fills] : [];
    
    const [fill] = fills as SolidPaint[];

    if (hasAliasValue(node.name)) {
      const name = stripVariableName(node.name);
      const variable = await getVariableByName(name, collection)


      if (variable) {
        const vectorPaint = figma.variables.setBoundVariableForPaint(
          fill,
          'color',
          variable
        );

        if (vectorPaint) {
          node.fills = [vectorPaint];
        }
      } else {
        const vectorPaintDefaultIconFill = figma.variables.setBoundVariableForPaint(
          fill,
          'color',
          fallbackVariableRef
        );

        if (vectorPaintDefaultIconFill) {
          node.fills = [vectorPaintDefaultIconFill];
        }
      }
    } else {
      const vectorPaintDefaultIconFill = figma.variables.setBoundVariableForPaint(
        fill,
        'color',
        fallbackVariableRef
      );

      if (vectorPaintDefaultIconFill) {
        node.fills = [vectorPaintDefaultIconFill];
      }
    }
  }

  return node
}

const getVariableByName = async (name: string, collection: TPostSelectedIconProps['payload']['collection']) => {
  let variable: Variable | null = null

  if (collection?.isRemote || (!collection && variables.length)) {
    const refKey = variables.find((varItem) => varItem.name === name)?.key;

    if (refKey) {
      variable = await figma.variables.importVariableByKeyAsync(refKey);
    }
  } else {
    variable = await figma.variables.getLocalVariablesAsync().then((vars) => vars.find((varItem) => varItem.name === name) || null);
  }

  return variable
}

