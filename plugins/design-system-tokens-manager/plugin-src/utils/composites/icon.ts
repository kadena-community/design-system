import { EConstants, EDTFTypes } from "../../types"

type TSVGMetaData = {
  $description: string
  $path: string[]
}

export function createSVG(metaData: TSVGMetaData, svg: string, iconToken: null | Variable) {
  try {
    let currentPage = figma.currentPage

    if (currentPage.name !== EConstants.PAGE_ICONS) {
      currentPage = figma.root.children.find(p => p.name === EConstants.PAGE_ICONS) || figma.currentPage

      if (currentPage) {
        figma.currentPage = currentPage
      }
    }

    const [width, height] = [24, 24]
    let [name, ...path] = metaData.$path.reverse()
    const checkComponent = figma.currentPage.findOne(n => n.name === name)
    const frameGroup = EConstants.ICONS_FRAME_NAME
    let frame = figma.currentPage.findOne(n => n.name === frameGroup) as FrameNode | null
    path = path.filter(d => !([EConstants.NAMESPACE_ROOT, EConstants.NAMESPACE_FOUNDATION, frameGroup] as string[]).includes(d))

    if (checkComponent) {
      return
    }

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
      frame.maxWidth = 100 * width
      frame.layoutWrap = 'WRAP'
      frame.itemSpacing = 16
      frame.counterAxisSpacing = 16
      frame.fills = []
    }

    const componentName = [...path.reverse(), name.split('_').join('-')].join(EConstants.TOKEN_NAME_DELIMITER)

    const existingComponent = frame.children.find(node => node.name === componentName) as ComponentNode
    let newComponent

    console.log('existingComponent', frame.children, existingComponent)

    if (!existingComponent) {
      newComponent = figma.createComponent()
      newComponent.resizeWithoutConstraints(width, height)
      newComponent.name = componentName
    } else {
      existingComponent.children.forEach(vector => vector.remove())
    }

    const component = existingComponent || newComponent

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

    const svgPaths = [...new Set(svgComponent.children)] as unknown as VectorNode[]
    svgPaths.forEach(node => {
      const [fill] = node.fills as Paint[]

      if (fill.type === 'SOLID' && iconToken) {
        node.fills = [figma.variables.setBoundVariableForPaint(fill, EDTFTypes.COLOR, iconToken)]
      }

      return node
    })

    component.appendChild(svgComponent)
    frame.appendChild(component)
  } catch (error) {
    console.error('Error creating SVG icon', error)
  }
}