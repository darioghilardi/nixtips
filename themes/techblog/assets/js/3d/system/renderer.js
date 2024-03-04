import { SRGBColorSpace, WebGLRenderer, VSMShadowMap } from 'three'

const createRenderer = () => {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true })

  // disable in prod
  renderer.debug.checkShaderErrors = false

  renderer.outputColorSpace = SRGBColorSpace

  // enable shadows
  renderer.shadowMap.enabled = true
  renderer.shadowMapSoft = true
  renderer.shadowMap.type = VSMShadowMap

  return renderer
}

const disposeRenderer = (renderer) => {
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.context = null
}

export { createRenderer, disposeRenderer }
