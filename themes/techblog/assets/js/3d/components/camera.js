import { PerspectiveCamera } from 'three'

const createCamera = (container) => {
  const { clientWidth, clientHeight } = container
  const camera = new PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 100)

  return camera
}

const updateCamera = (camera, cameraNear, cameraFar) => {
  camera.near = cameraNear
  camera.far = cameraFar
  camera.updateProjectionMatrix()
}

export { createCamera, updateCamera }
