import { DoubleSide, Group, NearestFilter, SRGBColorSpace } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { calculateSceneParams } from './scene'

const createModelsGroup = () => {
  return new Group()
}

const setupModel = (data) => {
  data.scene.traverse((child) => {
    if (child.isMesh) {
      // Compute normals for correct lighting
      if (child.geometry.getAttribute('normal') === undefined) {
        child.geometry.computeVertexNormals()
      }
      setupMaterial(child.material)

      child.castShadow = true
      child.receiveShadow = true
    }
  })

  return data.scene
}

const disposeObject = (model) => {
  model.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose()
      disposeMaterial(child.material)

      if (child.userData && child.userData.depthRenderTarget) {
        child.userData.depthRenderTarget.depthTexture.dispose()
        child.userData.depthRenderTarget.dispose()
      }
    }
  })
}

const disposeMaterial = (material) => {
  if (material.map) {
    // free CPU related resources
    if (material.map.source.data.close) {
      // ImageBitmap used for non compressed textures by GLTFLoader
      material.map.source.data.close()
    } else {
      // KTX2Loader uses TypedArray for compressed textures
      for (const mipmap of material.map.mipmaps) {
        mipmap.data = null
      }
    }

    // dispose GPU resources
    material.map.dispose()
  }
  material.dispose()
}

const addModelToScene = async (url, modelsGroup, fileId, ktx2Loader) => {
  // Load the model
  const { model } = await loadModel(url, fileId, ktx2Loader)

  // Add the new model to the models group
  modelsGroup.add(model)

  return calculateSceneParams(modelsGroup)
}

const loadModel = async (url) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

  const loader = new GLTFLoader()
  loader.setDRACOLoader(dracoLoader)

  // Load the model
  const modelData = await loader.loadAsync(url)

  // free the memory
  dracoLoader.dispose()

  // Setup the model aspect
  const model = setupModel(modelData)

  return { model }
}
const setupMaterial = (material) => {
  material.side = DoubleSide
  material.shadowSide = DoubleSide
  material.metalness = 0
  material.roughness = 1
  material.flatShading = true

  if (material.map) {
    material.map.colorSpace = SRGBColorSpace
    // material.map.magFilter = NearestFilter // for old simulations
    // use NearestFilter because mipmaps look bad
    material.map.minFilter = NearestFilter
  }

  return material
}

export {
  createModelsGroup,
  addModelToScene,
  createModelsMaterials,
  getAvailableFields,
  unloadAllMaterials,
  loadFieldMaterials,
  changeModelsMaterial,
  applySolidMaterial,
  toggleComfortLevel,
  disposeObject,
  disposeMaterial,
  isDirectionalField,
  resetComfortLevel,
  getMeshByName,
  createKTX2Loader,
  showTempSolidMaterial,
}
