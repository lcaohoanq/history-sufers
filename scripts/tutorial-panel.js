import * as THREE from 'three';
import { POINT_OBJECT_GUIDE, PENALTY_OBJECT_GUIDE } from './constants.js';
import {
  BallotBox,
  BribeEnvelope,
  CorruptedThrone,
  HammerAndSickle,
  MisbalancedScale,
  PuppetManipulation,
  ReformGears,
  RuleOfLawState,
  UnityHands
} from '../js/object.js';

const OBJECT_PREVIEW_MAP = {
  hammerandsickle: {
    ctor: HammerAndSickle
  },
  ballotbox: {
    ctor: BallotBox
  },
  ruleoflawstate: {
    ctor: RuleOfLawState
  },
  reformgears: {
    ctor: ReformGears
  },
  unityhands: {
    ctor: UnityHands
  },
  bribeEnvelope: {
    ctor: BribeEnvelope
  },
  corruptedThrone: {
    ctor: CorruptedThrone
  },
  puppetManipulation: {
    ctor: PuppetManipulation
  },
  misbalancedScale: {
    ctor: MisbalancedScale
  }
};

const previews = [];
let animationStarted = false;

function ensureAnimation() {
  if (!animationStarted && previews.length > 0) {
    animationStarted = true;
    requestAnimationFrame(animatePreviews);
  }
}

function animatePreviews() {
  previews.forEach((preview) => {
    const { object, renderer, scene, camera } = preview;

    if (object?.update) {
      try {
        object.update();
      } catch (err) {
        console.warn('Preview update failed:', err);
      }
    } else if (object?.mesh) {
      object.mesh.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
  });

  if (animationStarted) {
    requestAnimationFrame(animatePreviews);
  }
}

function createPreview(container, guide) {
  const config = OBJECT_PREVIEW_MAP[guide.type];
  if (!config || !config.ctor) {
    return;
  }

  const previewOptions = guide.preview || {};
  const size = Math.max(container.clientWidth || 110, 90);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(size, size);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  hemisphere.position.set(0, 300, 0);
  scene.add(hemisphere);

  const directional = new THREE.DirectionalLight(0xffffff, 0.55);
  directional.position.set(150, 300, 400);
  scene.add(directional);

  const camera = new THREE.PerspectiveCamera(45, 1, 5, 5000);
  const cameraY = previewOptions.cameraY ?? 200;
  const cameraZ = previewOptions.cameraZ ?? 650;
  const lookAtY = previewOptions.lookAtY ?? 100;
  camera.position.set(0, cameraY, cameraZ);
  camera.lookAt(new THREE.Vector3(0, lookAtY, 0));

  let objectInstance = null;
  try {
    objectInstance = new config.ctor(
      0,
      previewOptions.y ?? 0,
      0,
      previewOptions.scale ?? 1.2
    );
    if (objectInstance?.mesh) {
      scene.add(objectInstance.mesh);
    }
  } catch (err) {
    console.error(`Failed to initialize preview for ${guide.type}:`, err);
    container.innerHTML = '<div class="point-object-preview-error">Không hiển thị được</div>';
    return;
  }

  previews.push({
    renderer,
    scene,
    camera,
    object: objectInstance
  });
  ensureAnimation();
}

function buildObjectList(listId, guides) {
  const listElement = document.getElementById(listId);
  if (!listElement) {
    return;
  }

  listElement.innerHTML = '';

  guides.forEach((guide) => {
    const listItem = document.createElement('li');
    listItem.className = 'point-object-item';

    const previewContainer = document.createElement('div');
    previewContainer.className = 'point-object-preview';
    listItem.appendChild(previewContainer);

    const infoContainer = document.createElement('div');
    infoContainer.className = 'point-object-info';

    const nameElement = document.createElement('span');
    nameElement.className = 'object-name';
    nameElement.textContent = guide.name;
    infoContainer.appendChild(nameElement);

    if (guide.description) {
      const descElement = document.createElement('span');
      descElement.className = 'object-desc';
      descElement.textContent = guide.description;
      infoContainer.appendChild(descElement);
    }

    listItem.appendChild(infoContainer);
    listElement.appendChild(listItem);

    createPreview(previewContainer, guide);
  });
}

function initTabs() {
  const tabsContainer = document.getElementById('tutorialTabs');
  if (!tabsContainer) {
    return false;
  }

  const tabButtons = Array.from(
    tabsContainer.querySelectorAll('.tab-button[data-target]')
  );

  const sections = new Map();
  tabButtons.forEach((button) => {
    const targetId = button.getAttribute('data-target');
    if (!targetId) {
      return;
    }
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      sections.set(targetId, targetSection);
    }
  });

  const activateTab = (targetId) => {
    tabButtons.forEach((button) => {
      const isActive = button.getAttribute('data-target') === targetId;
      button.classList.toggle('active', isActive);
    });

    sections.forEach((section, id) => {
      if (id === targetId) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  };

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      if (targetId && sections.has(targetId)) {
        activateTab(targetId);
      }
    });
  });

  const defaultTab =
    tabButtons.find((button) => button.classList.contains('active'))?.getAttribute('data-target') ||
    tabButtons[0]?.getAttribute('data-target');

  if (defaultTab && sections.has(defaultTab)) {
    activateTab(defaultTab);
  }

  return true;
}

function initTutorialPanel() {
  if (!initTabs()) {
    return;
  }

  buildObjectList('pointObjectList', POINT_OBJECT_GUIDE);
  buildObjectList('penaltyObjectList', PENALTY_OBJECT_GUIDE);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTutorialPanel);
} else {
  initTutorialPanel();
}
