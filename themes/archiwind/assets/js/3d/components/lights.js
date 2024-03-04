import { DirectionalLight, HemisphereLight } from 'three'

const createLights = () => {
  const ambientLight = new HemisphereLight(0xf0f3ff, 0xffffff, 1.3)

  const topLight = new DirectionalLight('white', 1.3)

  const leftLight = new DirectionalLight('white', 0.4)
  const rightLight = new DirectionalLight('white', 0.2)

  topLight.castShadow = true
  topLight.shadow.autoUpdate = false

  topLight.shadow.mapSize.width = 1024
  topLight.shadow.mapSize.height = 1024
  topLight.shadow.radius = 1.3
  topLight.shadow.blurSamples = 10
  topLight.shadow.bias = -0.00035

  return { ambientLight, topLight, leftLight, rightLight }
}

const updateLightsPosition = (topLight, leftLight, rightLight, maxDimension) => {
  topLight.position.set(-maxDimension * 0.5, maxDimension * 2.6, maxDimension * 2)
  leftLight.position.set(-maxDimension * 2, 0, -maxDimension * 2)
  rightLight.position.set(maxDimension * 2, 0, -maxDimension * 2)

  // Shadow
  topLight.shadow.camera.left = -maxDimension * 0.8
  topLight.shadow.camera.right = maxDimension * 0.8
  topLight.shadow.camera.top = maxDimension * 0.8
  topLight.shadow.camera.bottom = -maxDimension * 0.8
  topLight.shadow.camera.near = maxDimension / 20
  topLight.shadow.camera.far = maxDimension * 10
  topLight.shadow.camera.updateProjectionMatrix()
  topLight.shadow.needsUpdate = true
}

export { createLights, updateLightsPosition }
