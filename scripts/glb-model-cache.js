import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
const cache = new Map();
/**
 * Fetches and caches a GLTF/GLB scene, returning a clone so callers can mutate
 * instances without affecting the cached source.
 * @param {string} url Absolute or relative URL to the GLTF/GLB asset.
 * @param {object} [options]
 * @param {boolean} [options.castShadow=false] Enable castShadow on meshes.
 * @param {boolean} [options.receiveShadow=options.castShadow] Enable receiveShadow on meshes.
 * @param {(scene:THREE.Object3D)=>void} [options.onClone] Optional hook run after cloning.
 * @returns {Promise<THREE.Object3D>}
 */
export async function getGLTFClone(url, options = {}) {
  let cached = cache.get(url);
  if (!cached) {
    cached = loader.loadAsync(url).then((gltf) => {
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) {
        throw new Error(`GLTF at ${url} does not contain a scene.`);
      }
      return root;
    });
    cache.set(url, cached);
  }
  const source = await cached;
  const clone = source.clone(true);
  const castShadow = options.castShadow === true;
  const receiveShadow = options.receiveShadow === true || (options.receiveShadow === undefined && castShadow);
  if (castShadow || receiveShadow) {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
  }
  if (typeof options.onClone === 'function') {
    options.onClone(clone);
  }
  return clone;
}