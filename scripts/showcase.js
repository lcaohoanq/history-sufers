import {
  BallotBox,
  BribeEnvelope,
  ColonialGate,
  CorruptedThrone,
  HammerAndSickle,
  MisbalancedScale,
  PuppetManipulation,
  ReformGears,
  RuleOfLawState,
  Tree,
  UnityHands,
  HighBarrier
} from '../js/object.js';
import * as THREE from 'three';
// Store all renderers, scenes, cameras, and objects
const displays = [];
const objectTypes = [
  {
    name: 'Default Tree',
    constructor: Tree,
    options: { y: 0, scale: 0.5 }
  },
  {
    name: 'HammerAndSickle',
    constructor: HammerAndSickle,
    options: { y: 100, scale: 1.5 }
  },
  {
    name: 'BribeEnvelope',
    constructor: BribeEnvelope,
    options: { y: 50, scale: 1.5 }
  },
  {
    name: 'BallotBox',
    constructor: BallotBox,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'RuleOfLawState',
    constructor: RuleOfLawState,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'ReformGears',
    constructor: ReformGears,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'UnityHands',
    constructor: UnityHands,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'CorruptedThrone',
    constructor: CorruptedThrone,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'PuppetManipulation',
    constructor: PuppetManipulation,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'MisbalancedScale',
    constructor: MisbalancedScale,
    options: { y: 0, scale: 1.5 }
  },
  {
    name: 'ColonialGate',
    constructor: ColonialGate,
    options: { y: 0, scale: 0.5 }
  },
  {
    name: 'HighBarrier',
    constructor: HighBarrier,
    options: { y: 0, scale: 0.5 }
  }
];

// Set up the display areas for each object
function init() {
  const showcaseElement = document.getElementById('showcase');

  // Define categories mapping for better organization
  const categoryMap = {
    // Collectible items
    hammerandsickle: {
      category: 'collectible',
      label: 'Vật phẩm thu thập'
    },
    bribeenvelope: {
      category: 'collectible',
      label: 'Vật phẩm thu thập'
    },
    ballotbox: { category: 'collectible', label: 'Vật phẩm thu thập' },

    // Special objects
    ruleoflawstate: { category: 'special', label: 'Biểu tượng đặc biệt' },
    reformgears: {
      category: 'special',
      label: 'Biểu tượng đặc biệt'
    },
    unityhands: { category: 'special', label: 'Biểu tượng đặc biệt' },
    puppetmanipulation: {
      category: 'special',
      label: 'Biểu tượng đặc biệt'
    },
    misbalancedscale: {
      category: 'special',
      label: 'Biểu tượng đặc biệt'
    },
    colonialgate: {
      category: 'obstacle',
      label: 'Vật cản nguy hiểm'
    }
  };

  // Create a display for each object type
  objectTypes.forEach((type) => {
    // Create container
    const displayDiv = document.createElement('div');
    displayDiv.className = 'object-display';

    // Determine the category for this object
    const objType = type.name.toLowerCase();
    const categoryInfo = categoryMap[objType] || {
      category: 'other',
      label: 'Khác'
    };

    // Add data attributes for filtering
    displayDiv.setAttribute('data-category', categoryInfo.category);
    displayDiv.setAttribute('data-name', objType);

    // Create view area
    const viewDiv = document.createElement('div');
    viewDiv.className = 'object-view';
    displayDiv.appendChild(viewDiv);

    // Create category label
    const categoryLabel = document.createElement('div');
    categoryLabel.className = 'category-label';
    categoryLabel.innerText = categoryInfo.label;
    displayDiv.appendChild(categoryLabel);

    // Create info area with object name and description
    const infoDiv = document.createElement('div');
    infoDiv.className = 'object-info';

    // Add more descriptive information based on object type
    let description = '';
    if (categoryInfo.category === 'obstacle') {
      description = 'Chạm vào sẽ kết thúc trò chơi';
    } else if (categoryInfo.category === 'collectible') {
      description = 'Thu thập để nhận điểm';
    } else if (categoryInfo.category === 'special') {
      description = 'Đối tượng đặc biệt trong game';
    }

    infoDiv.innerHTML = `
            <h3>${type.name}</h3>
            <p class="object-description">${description}</p>
          `;
    displayDiv.appendChild(infoDiv);

    showcaseElement.appendChild(displayDiv);

    // Set up THREE.js scene for this display
    setupScene(viewDiv, type);
  });
}

function setupScene(container, objectType) {
  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Create scene
  const scene = new THREE.Scene();

  // Add light
  const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  scene.add(light);

  // Add ambient light
  const ambient = new THREE.AmbientLight(0x404040);
  scene.add(ambient);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create camera
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    1,
    10000
  );
  camera.position.set(0, 0, 800);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  // Create object
  let object;
  try {
    object = new objectType.constructor(
      0,
      objectType.options?.y || -200,
      0,
      objectType.options?.scale || 1
    );
    scene.add(object.mesh);
  } catch (e) {
    console.error(`Error creating object ${objectType.name}:`, e);
  }

  // Store the display info
  displays.push({
    renderer,
    scene,
    camera,
    object,
    originalPosition: object ? { ...object.mesh.position } : null
  });

  // Start animation
  animate(displays.length - 1);
}

function animate(index) {
  const display = displays[index];

  if (display.object && display.object.update) {
    try {
      display.object.update();
    } catch (e) {
      console.warn(`Error updating object at index ${index}:`, e);
      // Remove the update function to prevent further errors
      display.object.update = null;
    }
  }

  display.renderer.render(display.scene, display.camera);
  requestAnimationFrame(() => animate(index));
}

// Control functions
function rotateAll(amount) {
  displays.forEach((display) => {
    if (display.object && display.object.mesh) {
      display.object.mesh.rotation.y += amount;
    }
  });
}

function moveAll(x, y, z) {
  displays.forEach((display) => {
    if (display.object && display.object.mesh) {
      display.object.mesh.position.x += x;
      display.object.mesh.position.y += y;
      display.object.mesh.position.z += z;
    }
  });
}

function resetView() {
  displays.forEach((display) => {
    if (display.object && display.object.mesh && display.originalPosition) {
      display.object.mesh.position.set(
        display.originalPosition.x,
        display.originalPosition.y,
        display.originalPosition.z
      );
      display.object.mesh.rotation.set(0, 0, 0);
    }
  });
}

// Object filtering function
function filterObjects() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  document.querySelectorAll('.object-display').forEach((display) => {
    // Get object type from data attributes
    const objectType = display.getAttribute('data-name');
    const objectCategory = display.getAttribute('data-category');

    if (!objectType) return;

    // Check if the object matches the search term
    const matchesSearch = objectType.includes(searchTerm);

    // Check if the object matches the selected category
    const matchesCategory = category === 'all' || objectCategory === category;

    // Show or hide based on both conditions
    if (matchesSearch && matchesCategory) {
      display.classList.remove('hidden-object');
    } else {
      display.classList.add('hidden-object');
    }
  });
}

window.addEventListener('load', init);
