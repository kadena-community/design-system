import { EConstants, EDTFTypes } from "../../types"

type TSVGMetaData = {
  $description: string
  $path: string[]
}

export let frame: FrameNode | null
let vectorPaint: SolidPaint | undefined

export function clearState() {
  frame = null
}

function createFrame() {
  const frameGroup = EConstants.ICONS_FRAME_NAME
  frame = figma.currentPage.findOne(n => n.name === frameGroup) as FrameNode | null

  if (!frame) {
    frame = figma.createFrame()
    frame.x = 0
    frame.y = 0
    frame.name = frameGroup
    frame.layoutMode = 'HORIZONTAL'
    frame.layoutSizingHorizontal = 'HUG'
    frame.layoutSizingVertical = 'HUG'
    frame.layoutPositioning = 'AUTO'
    frame.overflowDirection = 'HORIZONTAL'
    frame.minWidth = 24 * 20 + (19 * 16)
    frame.maxWidth = 24 * 20 + (19 * 16)
    frame.layoutWrap = 'WRAP'
    frame.itemSpacing = 16
    frame.counterAxisSpacing = 16
    frame.fills = []
  }

  return frame
}

function setCurrentPageToIcons() {
  let currentPage = figma.currentPage

  if (currentPage.name !== EConstants.PAGE_ICONS) {
    currentPage = figma.root.children.find(p => p.name === EConstants.PAGE_ICONS) || figma.currentPage

    if (currentPage) {
      figma.currentPage = currentPage
    }
  }
}

export function createSVG(metaData: TSVGMetaData, svg: string, iconToken: null | Variable) {
  try {
    setCurrentPageToIcons()

    const [width, height] = [24, 24]
    let name = metaData.$path.pop()
    const path = metaData.$path.join(EConstants.TOKEN_NAME_DELIMITER)

    if (!frame) {
      frame = createFrame()
    }

    const componentName = `${path}${EConstants.TOKEN_NAME_DELIMITER}${name}`
    let component = frame.children.find(node => node.name === componentName) as ComponentNode | undefined

    if (!component) {
      component = figma.createComponent()
      component.resizeWithoutConstraints(width, height)
      component.name = componentName
    } else {
      component.children.forEach(vector => vector.remove())
    }

    if (metaData.$description) {
      component.description = metaData.$description
    }

    const svgComponent = figma.createNodeFromSvg(svg)
    svgComponent.name = `icon@${width}x${height}`
    svgComponent.constraints = {
      horizontal: "SCALE",
      vertical: "SCALE"
    }
    svgComponent.fills = []

    const svgPaths = [...svgComponent.children] as VectorNode[]

    svgPaths.forEach(node => {
      if (!vectorPaint && iconToken) {
        const [fill] = node.fills as SolidPaint[]

        vectorPaint = figma.variables.setBoundVariableForPaint(fill, EDTFTypes.COLOR, iconToken)
      }

      if (vectorPaint) {
        node.fills = [vectorPaint]
      }
    })

    component.appendChild(svgComponent)
    frame.appendChild(component)

    return true
  } catch (error) {
    console.error('Error creating SVG icon', error)
    return false
  }
}

export async function clearUnusedIcons(paths: string[]): Promise<void> {
  setCurrentPageToIcons()

  const unusedIcons = frame?.children.filter(node => !paths.includes(node.name)) || []

  if (!unusedIcons.length) {
    return Promise.resolve()
  }

  unusedIcons.forEach(async (node, index) => {
    node.remove()

    if (unusedIcons.length - 1 === index) {
      return Promise.resolve(true)
    }
  })
}
