import * as THREE from 'three';
import { getGLTFClone } from './glb-model-cache.js';

const scratchBox = new THREE.Box3();
const scratchVec = new THREE.Vector3();

/**
 * Loads a GLB/GLTF asset, returning a clone that is optionally scaled and aligned.
 *
 * @param {object} options
 * @param {string} options.url - Absolute/relative URL to the GLB asset.
 * @param {boolean} [options.castShadow=false]
 * @param {boolean} [options.receiveShadow] - Defaults to same as castShadow.
 * @param {number} [options.desiredHeight] - Uniformly scale model to this height.
 * @param {number} [options.desiredWidth]
 * @param {number} [options.desiredDepth]
 * @param {boolean} [options.snapToGround=false] - Translate so min Y = 0.
 * @param {(object:THREE.Object3D)=>void} [options.onClone]
 * @returns {Promise<THREE.Object3D>}
 */
export async function createGLBModel(options) {
  const {
    url,
    castShadow = false,
    receiveShadow,
    desiredHeight,
    desiredWidth,
    desiredDepth,
    snapToGround = false,
    onClone
  } = options;

  if (!url) {
    throw new Error('createGLBModel requires a url option.');
  }

  const model = await getGLTFClone(url, {
    castShadow,
    receiveShadow,
    onClone
  });

  scratchBox.setFromObject(model);
  const size = scratchBox.getSize(scratchVec);

  let scaleFactor = 1;
  if (desiredHeight) {
    const currentHeight = size.y || 1;
    scaleFactor = desiredHeight / currentHeight;
  } else if (desiredWidth) {
    const currentWidth = size.x || 1;
    scaleFactor = desiredWidth / currentWidth;
  } else if (desiredDepth) {
    const currentDepth = size.z || 1;
    scaleFactor = desiredDepth / currentDepth;
  }

  if (scaleFactor !== 1) {
    model.scale.multiplyScalar(scaleFactor);
    model.updateMatrixWorld(true);
    scratchBox.setFromObject(model);
  }

  if (snapToGround) {
    const minY = scratchBox.min.y;
    model.position.y -= minY;
  }

  return model;
}
