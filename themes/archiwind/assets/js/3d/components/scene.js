import { Box3, Vector3, Scene } from 'three'
import { max } from '../utils.js'

function createScene() {
  const scene = new Scene()

  return scene
}

// Given the scene in a particular state, calculate the bounding
// box, the center and the other parameters to refresh the camera
const calculateSceneParams = (modelsGroup) => {
  // Calculate the bounding box
  let boundingBox = new Box3()
  boundingBox.setFromObject(modelsGroup)

  // Get the center of the bounding box
  let center = new Vector3()
  boundingBox.getCenter(center)

  // Shift the group position to the center of the scene
  modelsGroup.position.sub(center)

  // Get the size of the bounding box
  let groupSize = new Vector3()
  boundingBox.getSize(groupSize)

  // Get the new bounding box center
  boundingBox.getCenter(center)

  // Width and depth are inverted because the camera
  // shows the model from the direction of the wind.
  // With this inversion width and depth are in line
  // with what the user see on model load.
  const dimensions = {
    width: groupSize.z,
    height: groupSize.y,
    depth: groupSize.x,
  }
  const maxDimension = max(dimensions)

  return {
    center: center,
    dimensions: dimensions,
    maxDimension: maxDimension,
    cameraNear: maxDimension / 20,
    cameraFar: maxDimension * 80,
  }
}

export { createScene, calculateSceneParams }
