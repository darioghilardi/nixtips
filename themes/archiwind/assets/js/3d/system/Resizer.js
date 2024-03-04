const setSize = (container, camera, renderer) => {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()

  renderer.setSize(container.clientWidth, container.clientHeight, false)
  renderer.setPixelRatio(window.devicePixelRatio)
}

class Resizer {
  constructor(container, camera, renderer) {
    // set initial size on load
    setSize(container, camera, renderer)

    // set the size again if a resize occurs
    window.addEventListener('resize', () => {
      setSize(container, camera, renderer)
    })
  }

  onResize() {}
}

export { Resizer }
