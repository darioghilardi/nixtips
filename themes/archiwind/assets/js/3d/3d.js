import { createCamera, updateCamera } from './components/camera.js'
import { createLights, updateLightsPosition } from './components/lights.js'
import { addModelToScene, createModelsGroup } from './components/models.js'
import { createScene } from './components/scene.js'
import { Loop } from './system/Loop.js'
import { Resizer } from './system/Resizer.js'
import { createControls, updateControls } from './system/controls.js'
import { createRenderer, disposeRenderer } from './system/renderer.js'
import { isInViewport } from './utils.js'

let camera
let renderer
let scene
let controls
let modelsGroup
let topLight
let leftLight
let rightLight
let ambientLight
let needsRender = false
let loop
let oldMouseCoords = 0
let mouseInertia = 0

export const setup3dPlot = (Alpine) => {
  Alpine.data('plot3d', (el) => ({
    init() {
      const world = new World(el)
      world.init()
      world.start()
    },
  }))
}

class World {
  constructor(el) {
    const container = el

    camera = createCamera(container)
    scene = createScene()
    renderer = createRenderer()
    modelsGroup = createModelsGroup()
    modelsGroup.name = 'models'
    ;({ ambientLight, topLight, leftLight, rightLight } = createLights())
    loop = new Loop(renderer)

    controls = createControls(camera, renderer.domElement)

    scene.add(modelsGroup, ambientLight, topLight, leftLight, rightLight)
    const resizer = new Resizer(container, camera, renderer)

    // Add canvas to the DOM
    renderer.domElement.style.width = '100%'
    renderer.domElement.setAttribute('id', 'canvas-container')
    container.prepend(renderer.domElement)

    // rendering on demand
    window.addEventListener('resize', this.requestRender)

    window.addEventListener('mousemove', (e) => {
      const width = container.clientWidth
      const coords = e.clientX / width - 0.5

      mouseInertia += coords - oldMouseCoords
      oldMouseCoords = coords
    })
  }

  async init() {
    const sceneProperties = await addModelToScene('model.glb', modelsGroup)

    // Calculate the scene properties
    this.updateScene(sceneProperties)
  }

  updateScene({ cameraNear, cameraFar, maxDimension }) {
    // Adjust the camera
    updateCamera(camera, cameraNear, cameraFar)

    // Update the lights positions
    updateLightsPosition(topLight, leftLight, rightLight, maxDimension)

    updateControls(controls, maxDimension)

    this.requestRender()
  }

  // call this function instead of render() when something was changed
  requestRender() {
    needsRender = true
  }

  render(delta) {
    needsRender = (controls.update(delta) || needsRender) && isInViewport(renderer.domElement)

    mouseInertia *= 0.97

    controls.azimuthAngle += (0.07 + mouseInertia) * delta

    if (needsRender) {
      needsRender = false

      renderer.render(scene, camera)
    }
  }

  start() {
    loop.start((delta) => this.render(delta))
    this.requestRender()
  }

  // Clean the scene
  destroy() {
    loop.stop()

    disposeRenderer(renderer)

    window.removeEventListener('resize', this.requestRender)
  }
}

export default World
