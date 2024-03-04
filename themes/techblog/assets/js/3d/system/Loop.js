import { Timer } from 'three/examples/jsm/misc/Timer.js'

const timer = new Timer()

class Loop {
  constructor(renderer) {
    this.renderer = renderer
  }

  start(render) {
    this.renderer.setAnimationLoop(() => {
      timer.update()
      const delta = timer.getDelta()

      // render a frame
      render(delta)
    })
  }

  stop() {
    this.renderer.setAnimationLoop(null)
  }
}

export { Loop }
