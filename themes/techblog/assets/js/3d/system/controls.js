import CameraControls from 'camera-controls'

// from https://github.com/yomotsu/camera-controls#important
import {
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix4,
  Spherical,
  Box3,
  Sphere,
  Raycaster,
} from 'three'

const subsetOfTHREE = {
  Vector2: Vector2,
  Vector3: Vector3,
  Vector4: Vector4,
  Quaternion: Quaternion,
  Matrix4: Matrix4,
  Spherical: Spherical,
  Box3: Box3,
  Sphere: Sphere,
  Raycaster: Raycaster,
}

CameraControls.install({ THREE: subsetOfTHREE })

const createControls = (camera, canvas) => {
  const controls = new CameraControls(camera, canvas)

  controls.draggingSmoothTime = 0.05
  controls.smoothTime = 0.1

  //enable to keep camera on the same level when panning
  controls.verticalDragToForward = true

  // limit vertical rotation
  controls.maxPolarAngle = Math.PI / 2
  controls.zoom(1)

  controls.disconnect()

  return controls
}

const updateControls = (controls, maxDimension) => {
  // Lock the range of max zoom-out for the orbit controls
  controls.maxDistance = maxDimension * 2.0
  controls.minDistance = maxDimension * 0.03
  controls.maxDimension = maxDimension

  controls.setLookAt(0, maxDimension * 0.5, maxDimension * 1.2, 0, maxDimension * -0.114, 0, false)
}

export { createControls, updateControls }
