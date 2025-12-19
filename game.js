// 99 Nights in the Snow Arctic
// A survival horror game inspired by 99 Nights in the Forest

// ============================================
// GAME STATE
// ============================================
const gameState = {
    // Core state
    isPlaying: false,
    isPaused: false,
    isNight: false,
    currentNight: 1,
    
    // Lobby state
    inLobby: true,
    selectedClass: null,
    
    // Class definitions
    classes: {
        warrior: {
            name: 'Warrior',
            color: 0xc41e3a,
            description: 'Deals +50% damage, +25 HP',
            damageBonus: 1.5,
            healthBonus: 25,
            speedBonus: 1.0,
            gatherBonus: 1.0,
            icon: '⚔️',
            weapon: {
                name: 'Katana',
                icon: '🗡️',
                damage: 35,
                description: 'A razor-sharp blade from distant lands',
                attackSpeed: 1.2
            }
        },
        scout: {
            name: 'Scout',
            color: 0x228b22,
            description: '+40% movement speed, ranged attacks',
            damageBonus: 1.0,
            healthBonus: 0,
            speedBonus: 1.4,
            gatherBonus: 1.0,
            icon: '🏹',
            weapon: {
                name: 'Bow & Arrow',
                icon: '🏹',
                damage: 25,
                description: 'Strike from a safe distance',
                attackSpeed: 0.8,
                ranged: true,
                range: 20
            }
        },
        survivor: {
            name: 'Survivor',
            color: 0x4169e1,
            description: '+100% gathering, balanced combat',
            damageBonus: 1.0,
            healthBonus: 0,
            speedBonus: 1.0,
            gatherBonus: 2.0,
            icon: '🛡️',
            weapon: {
                name: 'Sword & Shield',
                icon: '⚔️🛡️',
                damage: 20,
                description: 'Block attacks, reduce damage taken',
                attackSpeed: 1.0,
                blockChance: 0.3 // 30% chance to block
            }
        }
    },
    
    // Player inventory & equipment (hotbar slots 1-9)
    hotbar: [
        null, // Slot 1
        null, // Slot 2
        null, // Slot 3
        null, // Slot 4
        null, // Slot 5
        null, // Slot 6
        null, // Slot 7
        null, // Slot 8
        null, // Slot 9
    ],
    selectedSlot: 0, // Currently selected hotbar slot (0-8)
    
    // Legacy inventory reference (for compatibility)
    inventory: {
        weapon: null,
        tool: null,
        bag: null,
    },
    
    // Item definitions
    items: {
        oldAxe: {
            name: 'Old Rusty Axe',
            icon: '🪓',
            type: 'tool',
            description: 'A weathered axe, still gets the job done',
            chopBonus: 1.0
        },
        oldSack: {
            name: 'Worn Leather Sack',
            icon: '🎒',
            type: 'bag',
            description: 'A tattered sack, holds your supplies',
            capacity: 50
        }
    },
    
    // Portals in lobby
    portals: [],
    
    // Time (in seconds, 0-120 for a full day/night cycle)
    time: 0,
    dayDuration: 60,      // 60 seconds of day
    nightDuration: 60,    // 60 seconds of night
    
    // Resources
    wood: 0,
    pelts: 0,           // From wolves
    thickPelts: 0,      // From polar bears
    tusks: 0,           // From mammoths
    
    // Player gear
    gear: {
        wolfCoat: false,      // Basic cold protection
        bearArmor: false,     // Heavy protection
        mammothBoots: false,  // Speed boost
    },
    
    // Player
    playerPosition: { x: 0, y: 1.6, z: 0 },
    playerRotation: { x: 0, y: 0 },
    moveSpeed: 5,
    playerHealth: 100,
    baseDamage: 20,
    
    // Santa (the monster)
    santaActive: false,
    santaPosition: { x: 50, y: 2, z: 50 },
    santaSpeed: 2,
    santaSmartness: 1, // Increases each game
    
    // Campfire
    campfireStrength: 100,
    campfireRadius: 15,
    campfireMaxStrength: 150,
    
    // Trees (collision objects)
    trees: [],
    treeCollisionRadius: 1.5,
    
    // Dropped items in the world
    droppedItems: [],
    
    // Placed objects (crafting bench, etc.)
    placedObjects: [],
    
    // Crafting bench state
    nearCraftingBench: false,
    
    // Creatures
    creatures: [],
    
    // Snow Guards
    snowGuards: [],
    
    // Special Events
    windWhisperShown: false,
    raidActive: false,
    
    // Crafting
    craftingOpen: false,
    
    // Settings
    mouseSensitivity: 0.002
};

// ============================================
// THREE.JS SETUP
// ============================================
let scene, camera, renderer;
let campfire, campfireLight;
let santa;
let clock;
let keys = {};
let isPointerLocked = false;
let lobbyObjects = []; // Store lobby objects for cleanup

// First-person hand/item view
let fpsScene, fpsCamera;
let fpsHand = null;
let currentHeldItem = null;
let handBobTime = 0;
let isAttacking = false;
let attackTime = 0;

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 100);
    
    // Camera (first person)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clock for delta time
    clock = new THREE.Clock();
    
    // Start in lobby
    createLobby();
    
    // Initialize first-person hand view
    initFPSHands();
    
    // Handle resize
    window.addEventListener('resize', onWindowResize);
}

// ============================================
// FIRST-PERSON HAND/ITEM VIEW
// ============================================
function initFPSHands() {
    // Create a separate scene for FPS hands (rendered on top)
    fpsScene = new THREE.Scene();
    
    // Camera for FPS view (narrower FOV for weapon view)
    fpsCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    fpsCamera.position.set(0, 0, 0);
    
    // Add a dim light for the hands
    const handLight = new THREE.DirectionalLight(0xffffff, 1);
    handLight.position.set(1, 1, 1);
    fpsScene.add(handLight);
    
    const handAmbient = new THREE.AmbientLight(0x666666);
    fpsScene.add(handAmbient);
}

function createFPSHand(itemType) {
    // Remove existing hand
    if (fpsHand) {
        fpsScene.remove(fpsHand);
        fpsHand = null;
    }
    
    if (!itemType) return;
    
    const handGroup = new THREE.Group();
    
    // Create arm/hand base
    const skinMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xdeb887, // Tan skin color
        roughness: 0.8 
    });
    
    // Forearm
    const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8),
        skinMaterial
    );
    forearm.rotation.x = Math.PI / 2.5;
    forearm.position.set(0.15, -0.15, -0.25);
    handGroup.add(forearm);
    
    // Hand/palm
    const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.1),
        skinMaterial
    );
    palm.position.set(0.15, -0.12, -0.38);
    palm.rotation.x = 0.3;
    handGroup.add(palm);
    
    // Fingers (simplified)
    const fingerMaterial = skinMaterial;
    for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.015, 0.08, 6),
            fingerMaterial
        );
        finger.position.set(0.12 + i * 0.02, -0.11, -0.44);
        finger.rotation.x = 0.5;
        handGroup.add(finger);
    }
    
    // Thumb
    const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.018, 0.06, 6),
        fingerMaterial
    );
    thumb.position.set(0.09, -0.1, -0.38);
    thumb.rotation.z = -0.5;
    thumb.rotation.x = 0.3;
    handGroup.add(thumb);
    
    // Add the specific item being held
    const itemMesh = createHeldItem(itemType);
    if (itemMesh) {
        handGroup.add(itemMesh);
    }
    
    // Position the hand in bottom-right of view
    handGroup.position.set(0.35, -0.35, -0.5);
    
    fpsScene.add(handGroup);
    fpsHand = handGroup;
    currentHeldItem = itemType;
    
    return handGroup;
}

function createHeldItem(itemType) {
    const itemGroup = new THREE.Group();
    
    switch (itemType) {
        case 'katana':
        case 'Katana': {
            // Katana blade
            const bladeMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xcccccc, 
                metalness: 0.9, 
                roughness: 0.1 
            });
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.5, 0.04),
                bladeMaterial
            );
            blade.position.set(0, 0.15, 0);
            itemGroup.add(blade);
            
            // Blade edge highlight
            const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(0.005, 0.48, 0.02),
                edgeMaterial
            );
            edge.position.set(0.01, 0.15, 0);
            itemGroup.add(edge);
            
            // Handle wrap
            const handleMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2a1a0a, 
                roughness: 0.9 
            });
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8),
                handleMaterial
            );
            handle.position.set(0, -0.15, 0);
            itemGroup.add(handle);
            
            // Guard (tsuba)
            const guardMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333, 
                metalness: 0.7 
            });
            const guard = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.01, 0.06),
                guardMaterial
            );
            guard.position.set(0, -0.05, 0);
            itemGroup.add(guard);
            
            itemGroup.position.set(0.15, -0.05, -0.4);
            itemGroup.rotation.x = -0.3;
            itemGroup.rotation.z = 0.2;
            break;
        }
        
        case 'axe':
        case 'Old Rusty Axe': {
            // Axe handle (wood)
            const handleMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b4513, 
                roughness: 0.9 
            });
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8),
                handleMaterial
            );
            handle.position.set(0, 0, 0);
            itemGroup.add(handle);
            
            // Axe head (rusty metal)
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b5a2b, 
                metalness: 0.5, 
                roughness: 0.7 
            });
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.08, 0.03),
                headMaterial
            );
            head.position.set(0.05, 0.18, 0);
            itemGroup.add(head);
            
            // Axe blade edge
            const bladeShape = new THREE.Shape();
            bladeShape.moveTo(0, 0);
            bladeShape.lineTo(0.08, 0.05);
            bladeShape.lineTo(0.08, -0.05);
            bladeShape.lineTo(0, 0);
            
            const extrudeSettings = { depth: 0.025, bevelEnabled: false };
            const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
            const blade = new THREE.Mesh(bladeGeometry, headMaterial);
            blade.position.set(0.08, 0.14, -0.012);
            itemGroup.add(blade);
            
            itemGroup.position.set(0.18, -0.08, -0.42);
            itemGroup.rotation.x = 0.5;
            itemGroup.rotation.z = -0.3;
            break;
        }
        
        case 'sack':
        case 'Worn Leather Sack': {
            // Sack body (leather pouch)
            const sackMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b6914, 
                roughness: 0.95 
            });
            const sack = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                sackMaterial
            );
            sack.scale.set(1, 1.2, 0.8);
            sack.position.set(0, 0, 0);
            itemGroup.add(sack);
            
            // Sack opening/neck
            const neckMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x654321, 
                roughness: 0.9 
            });
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.06, 0.05, 8),
                neckMaterial
            );
            neck.position.set(0, 0.12, 0);
            itemGroup.add(neck);
            
            // Rope tie
            const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
            const rope = new THREE.Mesh(
                new THREE.TorusGeometry(0.05, 0.008, 8, 16),
                ropeMaterial
            );
            rope.position.set(0, 0.1, 0);
            rope.rotation.x = Math.PI / 2;
            itemGroup.add(rope);
            
            itemGroup.position.set(0.2, -0.15, -0.45);
            itemGroup.rotation.x = 0.2;
            break;
        }
        
        case 'bow':
        case 'Bow & Arrow': {
            // Bow body (curved wood)
            const bowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b4513, 
                roughness: 0.8 
            });
            
            // Create curved bow using a torus segment
            const bowCurve = new THREE.Mesh(
                new THREE.TorusGeometry(0.2, 0.015, 8, 16, Math.PI),
                bowMaterial
            );
            bowCurve.rotation.z = Math.PI / 2;
            bowCurve.position.set(0, 0, 0);
            itemGroup.add(bowCurve);
            
            // Bowstring
            const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5dc });
            const string = new THREE.Mesh(
                new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4),
                stringMaterial
            );
            string.position.set(-0.1, 0, 0);
            itemGroup.add(string);
            
            // Arrow
            const arrowShaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6),
                new THREE.MeshStandardMaterial({ color: 0x654321 })
            );
            arrowShaft.rotation.z = Math.PI / 2;
            arrowShaft.position.set(0.05, 0, 0);
            itemGroup.add(arrowShaft);
            
            // Arrow head
            const arrowHead = new THREE.Mesh(
                new THREE.ConeGeometry(0.02, 0.05, 4),
                new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8 })
            );
            arrowHead.rotation.z = -Math.PI / 2;
            arrowHead.position.set(0.25, 0, 0);
            itemGroup.add(arrowHead);
            
            // Feathers
            const featherMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
            for (let i = 0; i < 3; i++) {
                const feather = new THREE.Mesh(
                    new THREE.BoxGeometry(0.04, 0.02, 0.002),
                    featherMaterial
                );
                feather.position.set(-0.12, 0, 0);
                feather.rotation.x = (i / 3) * Math.PI * 2;
                itemGroup.add(feather);
            }
            
            itemGroup.position.set(0.1, -0.1, -0.4);
            itemGroup.rotation.y = -0.3;
            itemGroup.rotation.z = 0.1;
            break;
        }
        
        case 'sword':
        case 'Sword & Shield': {
            // Sword
            const swordBlade = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.35, 0.01),
                new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 })
            );
            swordBlade.position.set(0, 0.1, 0);
            itemGroup.add(swordBlade);
            
            const swordHandle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8),
                new THREE.MeshStandardMaterial({ color: 0x4a3728 })
            );
            swordHandle.position.set(0, -0.12, 0);
            itemGroup.add(swordHandle);
            
            const swordGuard = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.02),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7 })
            );
            swordGuard.position.set(0, -0.05, 0);
            itemGroup.add(swordGuard);
            
            // Shield (on the side)
            const shieldMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4169e1, 
                metalness: 0.3, 
                roughness: 0.6 
            });
            const shield = new THREE.Mesh(
                new THREE.CircleGeometry(0.12, 8),
                shieldMaterial
            );
            shield.position.set(-0.15, 0, 0.05);
            shield.rotation.y = 0.5;
            itemGroup.add(shield);
            
            // Shield rim
            const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(0.12, 0.01, 8, 16),
                rimMaterial
            );
            rim.position.set(-0.15, 0, 0.05);
            rim.rotation.y = 0.5;
            itemGroup.add(rim);
            
            // Shield boss (center)
            const boss = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 8, 8),
                rimMaterial
            );
            boss.position.set(-0.15, 0, 0.08);
            itemGroup.add(boss);
            
            itemGroup.position.set(0.12, -0.08, -0.4);
            itemGroup.rotation.x = -0.2;
            itemGroup.rotation.z = 0.15;
            break;
        }
        
        case 'torch':
        case 'Torch': {
            // Torch handle
            const handleMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4a3728, 
                roughness: 0.9 
            });
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.025, 0.3, 8),
                handleMaterial
            );
            handle.position.set(0, 0, 0);
            itemGroup.add(handle);
            
            // Torch head (wrapped cloth)
            const headMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b4513, 
                roughness: 0.95 
            });
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                headMaterial
            );
            head.position.set(0, 0.18, 0);
            head.scale.set(1, 1.3, 1);
            itemGroup.add(head);
            
            // Flame (glowing)
            const flameMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff6600,
                transparent: true,
                opacity: 0.9
            });
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.1, 8),
                flameMaterial
            );
            flame.position.set(0, 0.28, 0);
            flame.name = 'torchFlame';
            itemGroup.add(flame);
            
            // Inner flame
            const innerFlame = new THREE.Mesh(
                new THREE.ConeGeometry(0.025, 0.07, 8),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            innerFlame.position.set(0, 0.26, 0);
            itemGroup.add(innerFlame);
            
            // Point light for torch glow
            const torchLight = new THREE.PointLight(0xff6600, 0.5, 2);
            torchLight.position.set(0, 0.25, 0);
            itemGroup.add(torchLight);
            
            itemGroup.position.set(0.18, -0.1, -0.42);
            itemGroup.rotation.x = 0.3;
            itemGroup.rotation.z = -0.2;
            break;
        }
        
        default:
            // Empty hand - just show the hand
            return null;
    }
    
    return itemGroup;
}

function updateFPSHand(deltaTime) {
    if (!fpsHand || gameState.inLobby) return;
    
    // Idle bobbing animation
    handBobTime += deltaTime * 2;
    
    // Check if player is moving
    const isMoving = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    const bobAmount = isMoving ? 0.015 : 0.005;
    const bobSpeed = isMoving ? 8 : 2;
    
    // Apply bobbing
    fpsHand.position.y = -0.35 + Math.sin(handBobTime * bobSpeed) * bobAmount;
    fpsHand.position.x = 0.35 + Math.cos(handBobTime * bobSpeed * 0.5) * bobAmount * 0.5;
    
    // Attack animation
    if (isAttacking) {
        attackTime += deltaTime * 8;
        
        if (attackTime < 1) {
            // Swing forward
            fpsHand.rotation.x = -attackTime * 0.8;
            fpsHand.position.z = -0.5 - attackTime * 0.1;
        } else if (attackTime < 2) {
            // Return to normal
            const returnProgress = attackTime - 1;
            fpsHand.rotation.x = -0.8 * (1 - returnProgress);
            fpsHand.position.z = -0.6 + returnProgress * 0.1;
        } else {
            // Reset
            isAttacking = false;
            attackTime = 0;
            fpsHand.rotation.x = 0;
            fpsHand.position.z = -0.5;
        }
    }
    
    // Animate torch flame if holding torch
    if (currentHeldItem === 'Torch' || currentHeldItem === 'torch') {
        fpsHand.traverse(child => {
            if (child.name === 'torchFlame') {
                child.scale.x = 1 + Math.sin(Date.now() * 0.02) * 0.2;
                child.scale.z = 1 + Math.cos(Date.now() * 0.02) * 0.2;
            }
        });
    }
}

function triggerAttackAnimation() {
    if (!isAttacking) {
        isAttacking = true;
        attackTime = 0;
    }
}

function updateHeldItemFromHotbar() {
    const selectedItem = gameState.hotbar[gameState.selectedSlot];
    
    if (!selectedItem) {
        // Empty slot - hide hand
        if (fpsHand) {
            fpsScene.remove(fpsHand);
            fpsHand = null;
            currentHeldItem = null;
        }
        return;
    }
    
    // Determine item type from name
    let itemType = null;
    const itemName = selectedItem.name || '';
    
    if (itemName.includes('Katana')) {
        itemType = 'katana';
    } else if (itemName.includes('Axe')) {
        itemType = 'axe';
    } else if (itemName.includes('Sack') || itemName.includes('sack')) {
        itemType = 'sack';
    } else if (itemName.includes('Bow')) {
        itemType = 'bow';
    } else if (itemName.includes('Sword') || itemName.includes('Shield')) {
        itemType = 'sword';
    } else if (itemName.includes('Torch')) {
        itemType = 'torch';
    }
    
    // Only recreate if item changed
    if (itemType !== currentHeldItem) {
        createFPSHand(itemType);
    }
}

// ============================================
// CHRISTMAS LOBBY
// ============================================
function createLobby() {
    gameState.inLobby = true;
    lobbyObjects = [];
    
    // Clear any existing objects
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
    
    // Cozy indoor lighting
    scene.background = new THREE.Color(0x1a0a0a);
    scene.fog = new THREE.Fog(0x1a0a0a, 15, 50);
    
    // Warm ambient light
    const ambientLight = new THREE.AmbientLight(0xffaa66, 0.4);
    scene.add(ambientLight);
    lobbyObjects.push(ambientLight);
    
    // Floor (wooden planks)
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3728,
        roughness: 0.9 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    lobbyObjects.push(floor);
    
    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a2a1a,
        roughness: 0.8 
    });
    
    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 10),
        wallMaterial
    );
    backWall.position.set(0, 5, -15);
    scene.add(backWall);
    lobbyObjects.push(backWall);
    
    // Side walls
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 10),
        wallMaterial
    );
    leftWall.position.set(-15, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    lobbyObjects.push(leftWall);
    
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 10),
        wallMaterial
    );
    rightWall.position.set(15, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
    lobbyObjects.push(rightWall);
    
    // Ceiling with exposed beams
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 })
    );
    ceiling.position.y = 10;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    lobbyObjects.push(ceiling);
    
    // Add ceiling beams
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 });
    for (let i = -10; i <= 10; i += 5) {
        const beam = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.5, 0.8),
            beamMaterial
        );
        beam.position.set(0, 9.5, i);
        scene.add(beam);
        lobbyObjects.push(beam);
    }
    
    // Central fireplace
    createLobbyFireplace();
    
    // Christmas tree
    createChristmasTree();
    
    // Create the three class portals
    createClassPortals();
    
    // Decorations
    createChristmasDecorations();
    
    // Position player in lobby
    camera.position.set(0, 1.6, 8);
    gameState.playerRotation = { x: 0, y: 0 };
    camera.rotation.set(0, 0, 0);
}

function createLobbyFireplace() {
    const fireplaceGroup = new THREE.Group();
    
    // Stone hearth
    const hearthMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
    
    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.5, 2),
        hearthMaterial
    );
    base.position.set(0, 0.25, -13);
    fireplaceGroup.add(base);
    
    // Back
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(4, 4, 0.5),
        hearthMaterial
    );
    back.position.set(0, 2, -14);
    fireplaceGroup.add(back);
    
    // Sides
    const leftSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 3, 2),
        hearthMaterial
    );
    leftSide.position.set(-1.75, 1.5, -13);
    fireplaceGroup.add(leftSide);
    
    const rightSide = leftSide.clone();
    rightSide.position.x = 1.75;
    fireplaceGroup.add(rightSide);
    
    // Fire
    const fireGeometry = new THREE.ConeGeometry(0.8, 1.5, 8);
    const fireMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500,
        transparent: true,
        opacity: 0.9
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(0, 1, -13.2);
    fire.name = 'lobbyFire';
    fireplaceGroup.add(fire);
    
    // Inner flame
    const innerFire = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 })
    );
    innerFire.position.set(0, 0.9, -13.2);
    fireplaceGroup.add(innerFire);
    
    // Fireplace light
    const fireLight = new THREE.PointLight(0xff6600, 2, 15);
    fireLight.position.set(0, 2, -12);
    fireLight.castShadow = true;
    fireplaceGroup.add(fireLight);
    
    // Stockings
    const stockingColors = [0xc41e3a, 0x228b22, 0xffd700];
    for (let i = -1; i <= 1; i++) {
        const stocking = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.8, 0.2),
            new THREE.MeshStandardMaterial({ color: stockingColors[i + 1] })
        );
        stocking.position.set(i * 0.8, 2.5, -13.7);
        fireplaceGroup.add(stocking);
    }
    
    scene.add(fireplaceGroup);
    lobbyObjects.push(fireplaceGroup);
}

function createChristmasTree() {
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3728 })
    );
    trunk.position.y = 0.5;
    treeGroup.add(trunk);
    
    // Tree layers (bigger than forest trees)
    const treeLayers = [
        { y: 1.5, radius: 2, height: 2 },
        { y: 3, radius: 1.6, height: 1.8 },
        { y: 4.2, radius: 1.2, height: 1.5 },
        { y: 5.2, radius: 0.8, height: 1.2 },
        { y: 6, radius: 0.4, height: 0.8 }
    ];
    
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x0a4a0a, roughness: 0.8 });
    treeLayers.forEach(layer => {
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(layer.radius, layer.height, 8),
            treeMaterial
        );
        cone.position.y = layer.y;
        cone.castShadow = true;
        treeGroup.add(cone);
    });
    
    // Star on top
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3),
        starMaterial
    );
    star.position.y = 6.7;
    star.rotation.y = Math.PI / 4;
    treeGroup.add(star);
    
    // Star light
    const starLight = new THREE.PointLight(0xffd700, 1, 8);
    starLight.position.set(0, 6.7, 0);
    treeGroup.add(starLight);
    
    // Ornaments (colorful balls)
    const ornamentColors = [0xc41e3a, 0x4169e1, 0xffd700, 0x228b22, 0xff69b4];
    for (let i = 0; i < 25; i++) {
        const ornament = new THREE.Mesh(
            new THREE.SphereGeometry(0.12),
            new THREE.MeshStandardMaterial({ 
                color: ornamentColors[i % ornamentColors.length],
                metalness: 0.8,
                roughness: 0.2
            })
        );
        const angle = Math.random() * Math.PI * 2;
        const height = 1.5 + Math.random() * 4;
        const radius = 0.5 + (5.5 - height) * 0.35;
        ornament.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        treeGroup.add(ornament);
    }
    
    // Garland (string lights effect)
    const garlandMaterial = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    for (let i = 0; i < 40; i++) {
        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.05),
            garlandMaterial
        );
        const angle = (i / 40) * Math.PI * 8;
        const height = 1.5 + (i / 40) * 4.5;
        const radius = 0.6 + (5.5 - height) * 0.3;
        light.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        treeGroup.add(light);
    }
    
    // Presents under tree
    const presentColors = [0xc41e3a, 0x4169e1, 0x228b22, 0xffd700];
    for (let i = 0; i < 6; i++) {
        const present = new THREE.Mesh(
            new THREE.BoxGeometry(0.5 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.2),
            new THREE.MeshStandardMaterial({ color: presentColors[i % presentColors.length] })
        );
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.5 + Math.random() * 0.8;
        present.position.set(
            Math.cos(angle) * dist,
            0.2,
            Math.sin(angle) * dist
        );
        present.rotation.y = Math.random() * Math.PI;
        treeGroup.add(present);
        
        // Ribbon
        const ribbon = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xffd700 })
        );
        ribbon.position.copy(present.position);
        ribbon.position.y += 0.1;
        treeGroup.add(ribbon);
    }
    
    treeGroup.position.set(-8, 0, -8);
    scene.add(treeGroup);
    lobbyObjects.push(treeGroup);
}

function createClassPortals() {
    gameState.portals = [];
    
    const portalClasses = ['warrior', 'scout', 'survivor'];
    const portalPositions = [
        { x: -6, z: -10 },   // Left - Warrior
        { x: 0, z: -12 },    // Center - Scout
        { x: 6, z: -10 }     // Right - Survivor
    ];
    
    portalClasses.forEach((className, index) => {
        const classData = gameState.classes[className];
        const pos = portalPositions[index];
        
        const portalGroup = new THREE.Group();
        
        // Portal frame (stone arch)
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555,
            roughness: 0.9 
        });
        
        // Left pillar
        const leftPillar = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 4, 0.5),
            frameMaterial
        );
        leftPillar.position.set(-1.2, 2, 0);
        portalGroup.add(leftPillar);
        
        // Right pillar
        const rightPillar = leftPillar.clone();
        rightPillar.position.x = 1.2;
        portalGroup.add(rightPillar);
        
        // Arch top
        const archTop = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.5, 0.5),
            frameMaterial
        );
        archTop.position.set(0, 4.25, 0);
        portalGroup.add(archTop);
        
        // Portal surface (glowing)
        const portalGeometry = new THREE.PlaneGeometry(2, 3.5);
        const portalMaterial = new THREE.MeshBasicMaterial({
            color: classData.color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const portalSurface = new THREE.Mesh(portalGeometry, portalMaterial);
        portalSurface.position.set(0, 2.25, 0.1);
        portalSurface.name = 'portalSurface';
        portalGroup.add(portalSurface);
        
        // Portal inner glow
        const innerGlow = new THREE.Mesh(
            new THREE.PlaneGeometry(1.5, 3),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })
        );
        innerGlow.position.set(0, 2.25, 0.15);
        portalGroup.add(innerGlow);
        
        // Portal light
        const portalLight = new THREE.PointLight(classData.color, 2, 8);
        portalLight.position.set(0, 2.5, 1);
        portalGroup.add(portalLight);
        
        // Class icon sign above portal
        const signGeometry = new THREE.PlaneGeometry(2, 0.6);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${classData.icon} ${classData.name.toUpperCase()}`, 128, 42);
        
        const signTexture = new THREE.CanvasTexture(canvas);
        const signMaterial = new THREE.MeshBasicMaterial({ 
            map: signTexture,
            transparent: true
        });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(0, 5, 0);
        portalGroup.add(sign);
        
        // Swirling particles effect
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 0.5;
            particlePositions[i] = Math.cos(angle) * radius;
            particlePositions[i + 1] = 0.5 + Math.random() * 3.5;
            particlePositions[i + 2] = 0.2 + Math.random() * 0.3;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: classData.color,
            size: 0.08,
            transparent: true,
            opacity: 0.8
        });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.name = 'portalParticles';
        portalGroup.add(particles);
        
        portalGroup.position.set(pos.x, 0, pos.z);
        portalGroup.rotation.y = Math.PI; // Face the player
        
        scene.add(portalGroup);
        lobbyObjects.push(portalGroup);
        
        gameState.portals.push({
            mesh: portalGroup,
            className: className,
            x: pos.x,
            z: pos.z,
            radius: 1.5
        });
    });
}

function createChristmasDecorations() {
    // Wreaths on walls
    const wreathMaterial = new THREE.MeshStandardMaterial({ color: 0x0a4a0a });
    const wreathPositions = [
        { x: -10, y: 4, z: -14.5, ry: 0 },
        { x: 10, y: 4, z: -14.5, ry: 0 }
    ];
    
    wreathPositions.forEach(pos => {
        const wreath = new THREE.Mesh(
            new THREE.TorusGeometry(0.8, 0.2, 8, 16),
            wreathMaterial
        );
        wreath.position.set(pos.x, pos.y, pos.z);
        wreath.rotation.y = pos.ry;
        scene.add(wreath);
        lobbyObjects.push(wreath);
        
        // Red bow
        const bow = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.3, 0.1),
            new THREE.MeshStandardMaterial({ color: 0xc41e3a })
        );
        bow.position.set(pos.x, pos.y - 0.8, pos.z + 0.1);
        scene.add(bow);
        lobbyObjects.push(bow);
    });
    
    // Candles on tables
    const candlePositions = [
        { x: 8, z: 0 },
        { x: -8, z: 5 },
        { x: 10, z: -5 }
    ];
    
    candlePositions.forEach(pos => {
        // Small table
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 1, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3728 })
        );
        table.position.set(pos.x, 0.5, pos.z);
        scene.add(table);
        lobbyObjects.push(table);
        
        // Candle
        const candle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
        );
        candle.position.set(pos.x, 1.2, pos.z);
        scene.add(candle);
        lobbyObjects.push(candle);
        
        // Flame
        const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.15, 8),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        flame.position.set(pos.x, 1.5, pos.z);
        scene.add(flame);
        lobbyObjects.push(flame);
        
        // Candle light
        const candleLight = new THREE.PointLight(0xff6600, 0.5, 5);
        candleLight.position.set(pos.x, 1.5, pos.z);
        scene.add(candleLight);
        lobbyObjects.push(candleLight);
    });
    
    // Hanging lights (garland across ceiling)
    const garlandLight = new THREE.MeshBasicMaterial({ color: 0xffff88 });
    for (let x = -12; x <= 12; x += 2) {
        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.1),
            garlandLight
        );
        bulb.position.set(x, 9, 0);
        scene.add(bulb);
        lobbyObjects.push(bulb);
        
        const light = new THREE.PointLight(0xffffaa, 0.3, 4);
        light.position.set(x, 9, 0);
        scene.add(light);
        lobbyObjects.push(light);
    }
    
    // Snow effect outside windows (if we add windows)
    // For now, add some atmospheric fog particles
    const dustCount = 200;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    
    for (let i = 0; i < dustCount * 3; i += 3) {
        dustPositions[i] = (Math.random() - 0.5) * 28;
        dustPositions[i + 1] = Math.random() * 9;
        dustPositions[i + 2] = (Math.random() - 0.5) * 28;
    }
    
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
        color: 0xffddaa,
        size: 0.03,
        transparent: true,
        opacity: 0.4
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.name = 'lobbyDust';
    scene.add(dust);
    lobbyObjects.push(dust);
}

function checkPortalCollision() {
    if (!gameState.inLobby) return;
    
    for (const portal of gameState.portals) {
        const dist = Math.sqrt(
            Math.pow(camera.position.x - portal.x, 2) +
            Math.pow(camera.position.z - portal.z, 2)
        );
        
        if (dist < portal.radius) {
            enterForest(portal.className);
            return;
        }
    }
}

function enterForest(className) {
    gameState.selectedClass = className;
    gameState.inLobby = false;
    
    const classData = gameState.classes[className];
    
    // Apply class bonuses
    gameState.playerHealth = 100 + classData.healthBonus;
    gameState.moveSpeed = 5 * classData.speedBonus;
    
    // Populate hotbar with starting items
    // Slot 1: Class weapon
    gameState.hotbar[0] = {
        ...classData.weapon,
        equipped: true
    };
    
    // Slot 2: Old Axe (marked as old)
    gameState.hotbar[1] = { 
        ...gameState.items.oldAxe, 
        equipped: true,
        isOld: true
    };
    
    // Slot 3: Old Sack (marked as old)
    gameState.hotbar[2] = { 
        ...gameState.items.oldSack, 
        equipped: true,
        isOld: true
    };
    
    // Slots 4-9: Empty for now
    for (let i = 3; i < 9; i++) {
        gameState.hotbar[i] = null;
    }
    
    // Set selected slot to weapon (slot 1)
    gameState.selectedSlot = 0;
    
    // Set active weapon for combat
    gameState.inventory.weapon = gameState.hotbar[0];
    gameState.inventory.tool = gameState.hotbar[1];
    gameState.inventory.bag = gameState.hotbar[2];
    
    // Show class selection message
    showClassSelected(classData);
    
    // Update UI - hide lobby hints, show forest UI
    document.getElementById('lobby-ui').style.display = 'none';
    document.getElementById('forest-ui').style.display = 'block';
    
    // Update class display
    const classDisplay = document.getElementById('current-class');
    if (classDisplay) {
        classDisplay.textContent = `${classData.icon} ${classData.name}`;
    }
    
    // Update equipment display
    updateEquipmentUI();
    
    // Clean up lobby
    lobbyObjects.forEach(obj => scene.remove(obj));
    lobbyObjects = [];
    gameState.portals = [];
    
    // Create the forest world
    createWorld();
    setupLighting();
    createSanta();
    
    // Position player at campfire
    camera.position.set(0, 1.6, 5);
    gameState.playerRotation = { x: 0, y: 0 };
    camera.rotation.set(0, 0, 0);
    
    // Update health display with bonus
    updateUI();
    
    // Create the first-person held item view
    updateHeldItemFromHotbar();
}

function selectHotbarSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex > 8) return;
    
    gameState.selectedSlot = slotIndex;
    
    // Update UI
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, index) => {
        if (index === slotIndex) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    });
    
    // Update selected item info
    const selectedItem = gameState.hotbar[slotIndex];
    const infoElement = document.getElementById('selected-item-name');
    if (infoElement) {
        if (selectedItem) {
            infoElement.textContent = `${selectedItem.icon} ${selectedItem.name}`;
        } else {
            infoElement.textContent = 'Empty slot';
        }
    }
    
    // Update the active weapon/tool for combat
    if (selectedItem) {
        if (selectedItem.damage !== undefined) {
            gameState.inventory.weapon = selectedItem;
        }
    }
    
    // Update the first-person held item view
    updateHeldItemFromHotbar();
}

function updateHotbarUI() {
    const slots = document.querySelectorAll('.hotbar-slot');
    
    gameState.hotbar.forEach((item, index) => {
        const slot = slots[index];
        if (!slot) return;
        
        const iconEl = slot.querySelector('.slot-icon');
        const nameEl = slot.querySelector('.slot-name');
        
        if (item) {
            iconEl.textContent = item.icon;
            nameEl.textContent = item.name.split(' ')[0]; // First word only
            slot.title = item.description || item.name;
            
            // Mark old items
            if (item.isOld) {
                slot.classList.add('old-item');
            } else {
                slot.classList.remove('old-item');
            }
        } else {
            iconEl.textContent = '—';
            nameEl.textContent = '';
            slot.title = 'Empty';
            slot.classList.remove('old-item');
        }
    });
    
    // Update selected slot highlight
    selectHotbarSlot(gameState.selectedSlot);
}

function updateEquipmentUI() {
    // Now uses hotbar system
    updateHotbarUI();
}

function showClassSelected(classData) {
    const message = document.createElement('div');
    message.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 10px;">${classData.icon}</div>
        <div style="font-size: 1.5rem; font-weight: bold;">${classData.name} Selected!</div>
        <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${classData.description}</div>
    `;
    message.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        color: #e8f4f8;
        text-shadow: 0 0 20px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1000;
        animation: fadeInOut 3s ease-in-out forwards;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
}

function createWorld() {
    // Ground - snowy terrain
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    
    // Add some height variation for snow drifts
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 0.3; // Small height variations
    }
    groundGeometry.computeVertexNormals();
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe8f4f8,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create campfire
    createCampfire();
    
    // Create trees
    createTrees();
    
    // Create creatures
    createCreatures();
    
    // Add some snow particles (ambient)
    createSnowParticles();
    
    // Create distant mountains
    createMountains();
    
    // Create stars and moon for nighttime
    createStarsAndMoon();
    
    // Set initial bright daytime sky
    scene.background.setHex(0x87CEEB);
    scene.fog.color.setHex(0x87CEEB);
}

function createCampfire() {
    const campfireGroup = new THREE.Group();
    
    // Stone ring
    const ringGeometry = new THREE.TorusGeometry(1, 0.2, 8, 16);
    const stoneMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        roughness: 0.9 
    });
    const ring = new THREE.Mesh(ringGeometry, stoneMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    campfireGroup.add(ring);
    
    // Logs
    const logGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const logMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3728,
        roughness: 0.8 
    });
    
    for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(logGeometry, logMaterial);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = (i * Math.PI) / 4;
        log.position.y = 0.2;
        campfireGroup.add(log);
    }
    
    // Fire (simple cone for now)
    const fireGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const fireMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500,
        transparent: true,
        opacity: 0.8
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.y = 0.8;
    fire.name = 'fire';
    campfireGroup.add(fire);
    
    // Inner fire glow
    const innerFireGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const innerFireMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.9
    });
    const innerFire = new THREE.Mesh(innerFireGeometry, innerFireMaterial);
    innerFire.position.y = 0.7;
    campfireGroup.add(innerFire);
    
    campfireGroup.position.set(0, 0, 0);
    scene.add(campfireGroup);
    campfire = campfireGroup;
    
    // Campfire light
    campfireLight = new THREE.PointLight(0xff6600, 2, 20);
    campfireLight.position.set(0, 1, 0);
    campfireLight.castShadow = true;
    scene.add(campfireLight);
}

function createTrees() {
    const treePositions = [];
    
    // Generate tree positions (avoiding campfire area)
    for (let i = 0; i < 50; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * 150;
            z = (Math.random() - 0.5) * 150;
        } while (Math.sqrt(x * x + z * z) < 15); // Keep away from campfire
        
        treePositions.push({ x, z, chopped: false, wood: 3 });
    }
    
    // Create tree meshes
    treePositions.forEach((pos, index) => {
        const tree = createTree();
        tree.position.set(pos.x, 0, pos.z);
        tree.userData = { index, ...pos, type: 'tree' };
        scene.add(tree);
        gameState.trees.push({ mesh: tree, x: pos.x, z: pos.z, chopped: false, wood: 3 });
    });
}

function createTree() {
    const treeGroup = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a3728,
        roughness: 0.9 
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Snow-covered pine layers
    const leafMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a4a1a,
        roughness: 0.8 
    });
    const snowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe8f4f8,
        roughness: 0.9 
    });
    
    const layers = [
        { y: 3, radius: 2, height: 2 },
        { y: 4.5, radius: 1.5, height: 1.8 },
        { y: 5.8, radius: 1, height: 1.5 },
        { y: 6.8, radius: 0.5, height: 1 }
    ];
    
    layers.forEach(layer => {
        const coneGeometry = new THREE.ConeGeometry(layer.radius, layer.height, 8);
        const cone = new THREE.Mesh(coneGeometry, leafMaterial);
        cone.position.y = layer.y;
        cone.castShadow = true;
        treeGroup.add(cone);
        
        // Snow cap on top
        const snowCapGeometry = new THREE.ConeGeometry(layer.radius * 0.9, layer.height * 0.3, 8);
        const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
        snowCap.position.y = layer.y + layer.height * 0.4;
        treeGroup.add(snowCap);
    });
    
    // Random rotation and scale
    treeGroup.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    treeGroup.scale.set(scale, scale, scale);
    
    return treeGroup;
}

// ============================================
// CREATURES
// ============================================
function createCreatures() {
    // Create wolves (fast, drop pelts)
    for (let i = 0; i < 5; i++) {
        createCreature('wolf');
    }
    
    // Create polar bears (tough, drop thick pelts)
    for (let i = 0; i < 3; i++) {
        createCreature('polarBear');
    }
    
    // Create mammoths (rare, drop tusks)
    for (let i = 0; i < 2; i++) {
        createCreature('mammoth');
    }
}

function createCreature(type) {
    const creatureGroup = new THREE.Group();
    let health, speed, damage, drops, collisionRadius;
    
    switch (type) {
        case 'wolf':
            // Gray wolf body
            const wolfBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
            const wolfBody = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 1.5),
                wolfBodyMaterial
            );
            wolfBody.position.y = 0.5;
            creatureGroup.add(wolfBody);
            
            // Wolf head
            const wolfHead = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.35, 0.5),
                new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 })
            );
            wolfHead.position.set(0, 0.55, 0.85);
            creatureGroup.add(wolfHead);
            
            // Wolf snout (pointy nose)
            const wolfSnout = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.15, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 })
            );
            wolfSnout.position.set(0, 0.45, 1.1);
            creatureGroup.add(wolfSnout);
            
            // Wolf nose
            const wolfNose = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x111111 })
            );
            wolfNose.position.set(0, 0.48, 1.25);
            creatureGroup.add(wolfNose);
            
            // Pointy ears!
            const wolfEarMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
            const wolfEarGeometry = new THREE.ConeGeometry(0.1, 0.25, 4);
            
            const wolfEarLeft = new THREE.Mesh(wolfEarGeometry, wolfEarMaterial);
            wolfEarLeft.position.set(-0.15, 0.85, 0.75);
            wolfEarLeft.rotation.x = 0.2;
            creatureGroup.add(wolfEarLeft);
            
            const wolfEarRight = new THREE.Mesh(wolfEarGeometry, wolfEarMaterial);
            wolfEarRight.position.set(0.15, 0.85, 0.75);
            wolfEarRight.rotation.x = 0.2;
            creatureGroup.add(wolfEarRight);
            
            // Wolf eyes (glowing yellow)
            const wolfEye1 = new THREE.Mesh(
                new THREE.SphereGeometry(0.05),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            wolfEye1.position.set(-0.1, 0.6, 1.05);
            creatureGroup.add(wolfEye1);
            
            const wolfEye2 = wolfEye1.clone();
            wolfEye2.position.set(0.1, 0.6, 1.05);
            creatureGroup.add(wolfEye2);
            
            // Wolf legs
            const wolfLegMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
            const wolfLegGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6);
            
            const wolfLegPositions = [
                [-0.2, 0.2, 0.4],  // front left
                [0.2, 0.2, 0.4],   // front right
                [-0.2, 0.2, -0.4], // back left
                [0.2, 0.2, -0.4]   // back right
            ];
            wolfLegPositions.forEach(pos => {
                const leg = new THREE.Mesh(wolfLegGeometry, wolfLegMaterial);
                leg.position.set(...pos);
                creatureGroup.add(leg);
            });
            
            // Wolf tail (bushy, sticking out!)
            const wolfTail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.15, 0.6, 8),
                new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 })
            );
            wolfTail.position.set(0, 0.55, -0.9);
            wolfTail.rotation.x = -0.8; // Angle it upward/outward
            creatureGroup.add(wolfTail);
            
            // Fluffy tail tip
            const wolfTailTip = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 })
            );
            wolfTailTip.position.set(0, 0.8, -1.2);
            creatureGroup.add(wolfTailTip);
            
            health = 30;
            speed = 4;
            damage = 10;
            drops = { type: 'pelts', amount: 2 };
            collisionRadius = 1;
            break;
            
        case 'polarBear':
            // White polar bear - big fluffy body
            const bearBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
            const bearBody = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.3, 2.2),
                bearBodyMaterial
            );
            bearBody.position.y = 0.8;
            creatureGroup.add(bearBody);
            
            // Bear head (rounder)
            const bearHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.9 })
            );
            bearHead.scale.set(1, 0.9, 1);
            bearHead.position.set(0, 1.2, 1.3);
            creatureGroup.add(bearHead);
            
            // Cute round ears! 🐻
            const bearEarMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.9 });
            
            const bearEarLeft = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                bearEarMaterial
            );
            bearEarLeft.position.set(-0.35, 1.55, 1.15);
            creatureGroup.add(bearEarLeft);
            
            const bearEarRight = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                bearEarMaterial
            );
            bearEarRight.position.set(0.35, 1.55, 1.15);
            creatureGroup.add(bearEarRight);
            
            // Inner ear (pink/darker)
            const innerEarMaterial = new THREE.MeshStandardMaterial({ color: 0xccbbbb, roughness: 0.9 });
            const bearInnerEarLeft = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                innerEarMaterial
            );
            bearInnerEarLeft.position.set(-0.35, 1.55, 1.22);
            creatureGroup.add(bearInnerEarLeft);
            
            const bearInnerEarRight = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                innerEarMaterial
            );
            bearInnerEarRight.position.set(0.35, 1.55, 1.22);
            creatureGroup.add(bearInnerEarRight);
            
            // Bear snout
            const bearSnout = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.25, 0.35),
                new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
            );
            bearSnout.position.set(0, 1.0, 1.7);
            creatureGroup.add(bearSnout);
            
            // Bear nose (black)
            const bearNose = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x111111 })
            );
            bearNose.position.set(0, 1.05, 1.88);
            creatureGroup.add(bearNose);
            
            // Bear eyes (small, dark)
            const bearEyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const bearEyeLeft = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 8, 8),
                bearEyeMaterial
            );
            bearEyeLeft.position.set(-0.15, 1.25, 1.7);
            creatureGroup.add(bearEyeLeft);
            
            const bearEyeRight = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 8, 8),
                bearEyeMaterial
            );
            bearEyeRight.position.set(0.15, 1.25, 1.7);
            creatureGroup.add(bearEyeRight);
            
            // Small teeny legs!
            const bearLegMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.9 });
            const bearLegGeometry = new THREE.CylinderGeometry(0.18, 0.2, 0.35, 8);
            
            const bearLegPositions = [
                [-0.5, 0.18, 0.6],   // front left
                [0.5, 0.18, 0.6],    // front right
                [-0.5, 0.18, -0.6],  // back left
                [0.5, 0.18, -0.6]    // back right
            ];
            
            bearLegPositions.forEach((pos, index) => {
                const leg = new THREE.Mesh(bearLegGeometry, bearLegMaterial);
                leg.position.set(...pos);
                creatureGroup.add(leg);
                
                // Big paws with claws!
                const paw = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25, 0.08, 0.3),
                    bearLegMaterial
                );
                paw.position.set(pos[0], 0.04, pos[2] + 0.05);
                creatureGroup.add(paw);
                
                // Big claws! (3 per paw)
                const clawMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
                for (let c = -1; c <= 1; c++) {
                    const claw = new THREE.Mesh(
                        new THREE.ConeGeometry(0.03, 0.12, 6),
                        clawMaterial
                    );
                    claw.position.set(pos[0] + c * 0.07, 0.02, pos[2] + 0.2);
                    claw.rotation.x = Math.PI / 2;
                    creatureGroup.add(claw);
                }
            });
            
            // Small stubby tail
            const bearTail = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                bearBodyMaterial
            );
            bearTail.position.set(0, 0.7, -1.2);
            creatureGroup.add(bearTail);
            
            health = 80;
            speed = 2;
            damage = 25;
            drops = { type: 'thickPelts', amount: 2 };
            collisionRadius = 1.5;
            break;
            
        case 'mammoth':
            // Brown mammoth body
            const mammothBody = new THREE.Mesh(
                new THREE.BoxGeometry(3, 2.5, 4),
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
            );
            mammothBody.position.y = 2;
            creatureGroup.add(mammothBody);
            
            // Mammoth head
            const mammothHead = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 1.5, 1.5),
                new THREE.MeshStandardMaterial({ color: 0x7a3d10, roughness: 0.9 })
            );
            mammothHead.position.set(0, 2.5, 2.5);
            creatureGroup.add(mammothHead);
            
            // Mammoth trunk
            const mammothTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.3, 2, 8),
                new THREE.MeshStandardMaterial({ color: 0x6b3510, roughness: 0.9 })
            );
            mammothTrunk.position.set(0, 1.5, 3.2);
            mammothTrunk.rotation.x = Math.PI / 4;
            creatureGroup.add(mammothTrunk);
            
            // Mammoth tusks
            const tuskMaterial = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.5 });
            const tuskGeometry = new THREE.CylinderGeometry(0.1, 0.2, 2, 8);
            
            const leftTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
            leftTusk.position.set(-0.8, 2, 3);
            leftTusk.rotation.z = Math.PI / 6;
            leftTusk.rotation.x = -Math.PI / 4;
            creatureGroup.add(leftTusk);
            
            const rightTusk = new THREE.Mesh(tuskGeometry, tuskMaterial);
            rightTusk.position.set(0.8, 2, 3);
            rightTusk.rotation.z = -Math.PI / 6;
            rightTusk.rotation.x = -Math.PI / 4;
            creatureGroup.add(rightTusk);
            
            // Mammoth legs (thick and sturdy)
            const mammothLegMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3d10, roughness: 0.9 });
            const mammothLegGeometry = new THREE.CylinderGeometry(0.4, 0.5, 2, 8);
            
            const mammothLegPositions = [
                [-1, 1, 1.2],   // front left
                [1, 1, 1.2],    // front right
                [-1, 1, -1.2],  // back left
                [1, 1, -1.2]    // back right
            ];
            
            mammothLegPositions.forEach(pos => {
                const leg = new THREE.Mesh(mammothLegGeometry, mammothLegMaterial);
                leg.position.set(...pos);
                creatureGroup.add(leg);
                
                // Big flat feet
                const foot = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.6, 0.3, 8),
                    mammothLegMaterial
                );
                foot.position.set(pos[0], 0.15, pos[2]);
                creatureGroup.add(foot);
            });
            
            health = 150;
            speed = 1.5;
            damage = 40;
            drops = { type: 'tusks', amount: 2 };
            collisionRadius = 3;
            break;
    }
    
    // Position creature randomly (away from campfire)
    let x, z;
    do {
        x = (Math.random() - 0.5) * 120;
        z = (Math.random() - 0.5) * 120;
    } while (Math.sqrt(x * x + z * z) < 25);
    
    creatureGroup.position.set(x, 0, z);
    creatureGroup.userData = { type: 'creature', creatureType: type };
    scene.add(creatureGroup);
    
    gameState.creatures.push({
        mesh: creatureGroup,
        type: type,
        health: health,
        maxHealth: health,
        speed: speed,
        damage: damage,
        drops: drops,
        collisionRadius: collisionRadius,
        x: x,
        z: z,
        state: 'wander', // wander, chase, dead
        wanderTarget: { x: x, z: z },
        attackCooldown: 0
    });
}

function updateCreatures(deltaTime) {
    gameState.creatures.forEach(creature => {
        if (creature.state === 'dead') return;
        
        const distToPlayer = Math.sqrt(
            Math.pow(camera.position.x - creature.mesh.position.x, 2) +
            Math.pow(camera.position.z - creature.mesh.position.z, 2)
        );
        
        // Check if player is close - start chasing
        const aggroRange = creature.type === 'mammoth' ? 15 : 20;
        if (distToPlayer < aggroRange) {
            creature.state = 'chase';
        } else if (distToPlayer > aggroRange + 10) {
            creature.state = 'wander';
        }
        
        if (creature.state === 'chase') {
            // Move toward player
            const dirX = camera.position.x - creature.mesh.position.x;
            const dirZ = camera.position.z - creature.mesh.position.z;
            const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
            
            if (dist > creature.collisionRadius + 1) {
                creature.mesh.position.x += (dirX / dist) * creature.speed * deltaTime;
                creature.mesh.position.z += (dirZ / dist) * creature.speed * deltaTime;
            }
            
            // Look at player
            creature.mesh.lookAt(camera.position.x, creature.mesh.position.y, camera.position.z);
            
            // Attack if close enough
            if (distToPlayer < creature.collisionRadius + 1.5 && creature.attackCooldown <= 0) {
                // Check for block (Survivor with Shield - must have shield selected)
                const selectedItem = gameState.hotbar[gameState.selectedSlot];
                if (selectedItem && selectedItem.blockChance && Math.random() < selectedItem.blockChance) {
                    showBlockedText();
                    creature.attackCooldown = 1.5;
                } else {
                // Player takes damage
                    let actualDamage = creature.damage;
                    if (gameState.gear.bearArmor) actualDamage *= 0.5;
                    
                gameState.playerHealth -= actualDamage;
                creature.attackCooldown = 1.5; // 1.5 second cooldown
                
                // Visual feedback
                showDamageFlash();
                }
            }
        } else {
            // Wander randomly
            const wanderDist = Math.sqrt(
                Math.pow(creature.wanderTarget.x - creature.mesh.position.x, 2) +
                Math.pow(creature.wanderTarget.z - creature.mesh.position.z, 2)
            );
            
            if (wanderDist < 2) {
                // Pick new wander target
                creature.wanderTarget.x = creature.mesh.position.x + (Math.random() - 0.5) * 20;
                creature.wanderTarget.z = creature.mesh.position.z + (Math.random() - 0.5) * 20;
            }
            
            // Move toward wander target slowly
            const dirX = creature.wanderTarget.x - creature.mesh.position.x;
            const dirZ = creature.wanderTarget.z - creature.mesh.position.z;
            const dist = Math.sqrt(dirX * dirX + dirZ * dirZ);
            
            if (dist > 0.5) {
                creature.mesh.position.x += (dirX / dist) * creature.speed * 0.3 * deltaTime;
                creature.mesh.position.z += (dirZ / dist) * creature.speed * 0.3 * deltaTime;
                creature.mesh.lookAt(creature.wanderTarget.x, creature.mesh.position.y, creature.wanderTarget.z);
            }
        }
        
        // Update attack cooldown
        if (creature.attackCooldown > 0) {
            creature.attackCooldown -= deltaTime;
        }
        
        // Update position tracking
        creature.x = creature.mesh.position.x;
        creature.z = creature.mesh.position.z;
    });
}

function attackCreature(creature) {
    // Get currently selected item from hotbar
    const selectedItem = gameState.hotbar[gameState.selectedSlot];
    
    // Calculate damage from weapon + class bonus
    const classBonus = gameState.selectedClass ? 
        gameState.classes[gameState.selectedClass].damageBonus : 1;
    
    // Use selected item damage if it's a weapon, otherwise base damage
    const weaponDamage = (selectedItem && selectedItem.damage !== undefined) ? 
        selectedItem.damage : gameState.baseDamage;
    
    const damage = weaponDamage * classBonus;
    creature.health -= damage;
    
    // Show damage number
    showDamageNumber(damage, creature.mesh.position);
    
    // Flash red
    creature.mesh.traverse(child => {
        if (child.isMesh && child.material) {
            const originalColor = child.material.color.getHex();
            child.material.color.setHex(0xff0000);
            setTimeout(() => {
                child.material.color.setHex(originalColor);
            }, 100);
        }
    });
    
    if (creature.health <= 0) {
        killCreature(creature);
    }
}

function showDamageNumber(damage, position) {
    const damageText = document.createElement('div');
    damageText.textContent = `-${Math.round(damage)}`;
    damageText.style.cssText = `
        position: fixed;
        top: 45%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 1.5rem;
        font-weight: bold;
        color: #ff6b6b;
        text-shadow: 0 0 10px rgba(0,0,0,0.8), 2px 2px 0 #000;
        pointer-events: none;
        z-index: 1000;
        animation: damageFloat 0.8s ease-out forwards;
    `;
    document.body.appendChild(damageText);
    setTimeout(() => damageText.remove(), 800);
}

function killCreature(creature) {
    creature.state = 'dead';
    
    // Apply class gather bonus to loot
    const classBonus = gameState.selectedClass ? 
        gameState.classes[gameState.selectedClass].gatherBonus : 1;
    const lootAmount = Math.floor(creature.drops.amount * classBonus);
    
    // Drop loot
    gameState[creature.drops.type] += lootAmount;
    showLootText(`+${lootAmount} ${getResourceEmoji(creature.drops.type)}`);
    
    // Animate death (fall over)
    const fallAnimation = () => {
        if (creature.mesh.rotation.x < Math.PI / 2) {
            creature.mesh.rotation.x += 0.1;
            requestAnimationFrame(fallAnimation);
        } else {
            // Remove after a delay
            setTimeout(() => {
                scene.remove(creature.mesh);
            }, 3000);
        }
    };
    fallAnimation();
}

function getResourceEmoji(type) {
    const emojis = {
        pelts: '🐺',
        thickPelts: '🐻‍❄️',
        tusks: '🦣'
    };
    return emojis[type] || '📦';
}

function showDamageFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0.3);
        pointer-events: none;
        z-index: 1000;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);
}

function showBlockedText() {
    const blocked = document.createElement('div');
    blocked.textContent = '🛡️ BLOCKED!';
    blocked.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 1.8rem;
        font-weight: bold;
        color: #4169e1;
        text-shadow: 0 0 20px rgba(65, 105, 225, 0.8), 2px 2px 0 #000;
        pointer-events: none;
        z-index: 1000;
        animation: blockPop 0.6s ease-out forwards;
    `;
    document.body.appendChild(blocked);
    setTimeout(() => blocked.remove(), 600);
}

function showLootText(text) {
    const loot = document.createElement('div');
    loot.textContent = text;
    loot.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 2rem;
        color: #ffd700;
        text-shadow: 0 0 10px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1000;
        animation: floatUp 1s ease-out forwards;
    `;
    document.body.appendChild(loot);
    setTimeout(() => loot.remove(), 1000);
}

// ============================================
// CULTISTS (Night 5 Raid Enemies)
// ============================================
function spawnCultist(type, x, z) {
    const cultistGroup = new THREE.Group();
    let health, speed, damage, attacksFirePriority;
    
    // Helper function to add humanoid legs (Santa-style)
    function addLegs(group, legColor, bootColor, yOffset) {
        const legMaterial = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.7 });
        const bootMaterial = new THREE.MeshStandardMaterial({ color: bootColor, roughness: 0.8 });
        
        [-0.25, 0.25].forEach(xPos => {
            // Thigh
            const thigh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8),
                legMaterial
            );
            thigh.position.set(xPos, yOffset + 0.3, 0.1);
            thigh.rotation.x = 0.4;
            group.add(thigh);
            
            // Shin
            const shin = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.08, 0.5, 8),
                legMaterial
            );
            shin.position.set(xPos, yOffset - 0.15, 0.05);
            shin.rotation.x = -0.2;
            group.add(shin);
            
            // Boot
            const boot = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.12, 0.25),
                bootMaterial
            );
            boot.position.set(xPos, yOffset - 0.4, 0.1);
            group.add(boot);
        });
    }
    
    // Helper function to add humanoid arms
    function addArms(group, armColor, yOffset, hasWeaponRight) {
        const armMaterial = new THREE.MeshStandardMaterial({ color: armColor, roughness: 0.7 });
        
        // Left arm
        const leftUpper = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8),
            armMaterial
        );
        leftUpper.position.set(-0.45, yOffset, 0);
        leftUpper.rotation.z = Math.PI / 3;
        group.add(leftUpper);
        
        const leftLower = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8),
            armMaterial
        );
        leftLower.position.set(-0.65, yOffset - 0.3, 0.1);
        leftLower.rotation.x = -0.5;
        group.add(leftLower);
        
        // Right arm (may hold weapon)
        if (!hasWeaponRight) {
            const rightUpper = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8),
                armMaterial
            );
            rightUpper.position.set(0.45, yOffset, 0);
            rightUpper.rotation.z = -Math.PI / 3;
            group.add(rightUpper);
            
            const rightLower = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8),
                armMaterial
            );
            rightLower.position.set(0.65, yOffset - 0.3, 0.1);
            rightLower.rotation.x = -0.5;
            group.add(rightLower);
        }
    }
    
    switch (type) {
        case 'axeCultist':
            // === AXE CULTIST - Blue coat, humanoid, holding axe ===
            const axeCoatColor = 0x2244aa; // Blue coat
            const axeSkinColor = 0xddccbb;
            
            // Body (blue coat)
            const axeBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.45, 1.4, 8),
                new THREE.MeshStandardMaterial({ color: axeCoatColor, roughness: 0.7 })
            );
            axeBody.position.y = 1.7;
            cultistGroup.add(axeBody);
            
            // Head
            const axeHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.25, 12, 12),
                new THREE.MeshStandardMaterial({ color: axeSkinColor, roughness: 0.6 })
            );
            axeHead.position.y = 2.6;
            cultistGroup.add(axeHead);
            
            // Hood
            const axeHood = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0x1a3388, roughness: 0.8 })
            );
            axeHood.position.y = 2.65;
            axeHood.rotation.x = 0.3;
            cultistGroup.add(axeHood);
            
            // Glowing red eyes
            const axeEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const axeEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.04), axeEyeMat);
            axeEye1.position.set(-0.08, 2.65, 0.2);
            cultistGroup.add(axeEye1);
            const axeEye2 = axeEye1.clone();
            axeEye2.position.set(0.08, 2.65, 0.2);
            cultistGroup.add(axeEye2);
            
            // Add legs
            addLegs(cultistGroup, axeCoatColor, 0x222222, 0.9);
            
            // Add left arm
            addArms(cultistGroup, axeCoatColor, 2.2, true);
            
            // Right arm holding axe
            const axeArmUpper = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8),
                new THREE.MeshStandardMaterial({ color: axeCoatColor, roughness: 0.7 })
            );
            axeArmUpper.position.set(0.45, 2.2, 0);
            axeArmUpper.rotation.z = -0.8;
            cultistGroup.add(axeArmUpper);
            
            const axeArmLower = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8),
                new THREE.MeshStandardMaterial({ color: axeCoatColor, roughness: 0.7 })
            );
            axeArmLower.position.set(0.7, 2.0, 0.2);
            axeArmLower.rotation.x = -0.8;
            cultistGroup.add(axeArmLower);
            
            // Battle Axe
            const axeHandle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
                new THREE.MeshStandardMaterial({ color: 0x4a3020 })
            );
            axeHandle.position.set(0.85, 2.2, 0.3);
            axeHandle.rotation.x = -0.5;
            cultistGroup.add(axeHandle);
            
            const axeBlade = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.4, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 })
            );
            axeBlade.position.set(0.85, 2.65, 0.35);
            cultistGroup.add(axeBlade);
            
            health = 40;
            speed = 3;
            damage = 15;
            attacksFirePriority = 0.3;
            break;
            
        case 'bowCultist':
            // === BOW CULTIST - Red coat with pink stripes and gold sparkles ===
            const bowCoatColor = 0xcc2222; // Red coat
            const bowStripeColor = 0xff88aa; // Pink stripes
            
            // Body (red coat)
            const bowBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 1.3, 8),
                new THREE.MeshStandardMaterial({ color: bowCoatColor, roughness: 0.6 })
            );
            bowBody.position.y = 1.65;
            cultistGroup.add(bowBody);
            
            // Pink stripes on coat
            for (let i = 0; i < 3; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.06, 0.5),
                    new THREE.MeshStandardMaterial({ color: bowStripeColor, roughness: 0.5 })
                );
                stripe.position.y = 1.3 + i * 0.35;
                cultistGroup.add(stripe);
            }
            
            // Gold sparkles (small gold spheres)
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
            for (let i = 0; i < 8; i++) {
                const sparkle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.03, 6, 6),
                    goldMat
                );
                const angle = Math.random() * Math.PI * 2;
                const height = 1.2 + Math.random() * 0.9;
                sparkle.position.set(
                    Math.cos(angle) * 0.35,
                    height,
                    Math.sin(angle) * 0.35
                );
                cultistGroup.add(sparkle);
            }
            
            // Head
            const bowHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.22, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0xddccbb, roughness: 0.6 })
            );
            bowHead.position.y = 2.5;
            cultistGroup.add(bowHead);
            
            // Hood (red with pink trim)
            const bowHood = new THREE.Mesh(
                new THREE.ConeGeometry(0.28, 0.4, 8),
                new THREE.MeshStandardMaterial({ color: bowCoatColor, roughness: 0.7 })
            );
            bowHood.position.y = 2.75;
            cultistGroup.add(bowHood);
            
            // Glowing green eyes
            const bowEyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const bowEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.035), bowEyeMat);
            bowEye1.position.set(-0.07, 2.55, 0.18);
            cultistGroup.add(bowEye1);
            const bowEye2 = bowEye1.clone();
            bowEye2.position.set(0.07, 2.55, 0.18);
            cultistGroup.add(bowEye2);
            
            // Add legs
            addLegs(cultistGroup, bowCoatColor, 0x331111, 0.85);
            
            // Add arms
            addArms(cultistGroup, bowCoatColor, 2.1, true);
            
            // Right arm with bow
            const bowArmUpper = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8),
                new THREE.MeshStandardMaterial({ color: bowCoatColor, roughness: 0.7 })
            );
            bowArmUpper.position.set(0.4, 2.1, 0.1);
            bowArmUpper.rotation.z = -Math.PI / 2.5;
            cultistGroup.add(bowArmUpper);
            
            // Bow
            const bowCurve = new THREE.Mesh(
                new THREE.TorusGeometry(0.35, 0.025, 8, 16, Math.PI),
                new THREE.MeshStandardMaterial({ color: 0x5a4030 })
            );
            bowCurve.position.set(0.7, 2.0, 0.25);
            bowCurve.rotation.y = Math.PI / 2;
            bowCurve.rotation.z = Math.PI / 2;
            cultistGroup.add(bowCurve);
            
            // Quiver on back
            const quiver = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8),
                new THREE.MeshStandardMaterial({ color: 0x442211 })
            );
            quiver.position.set(0, 1.8, -0.25);
            quiver.rotation.x = 0.2;
            cultistGroup.add(quiver);
            
            health = 25;
            speed = 2.5;
            damage = 12;
            attacksFirePriority = 0.5;
            break;
            
        case 'juggernaut':
            // === JUGGERNAUT - Full armor, helmet with horns ===
            const armorColor = 0x3a3a4a;
            const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.4, metalness: 0.7 });
            
            // Massive armored body
            const jugBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6, 0.7, 2.0, 8),
                armorMat
            );
            jugBody.position.y = 2.0;
            cultistGroup.add(jugBody);
            
            // Chest plate
            const chestPlate = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 1.0, 0.4),
                new THREE.MeshStandardMaterial({ color: 0x4a4a5a, metalness: 0.8, roughness: 0.3 })
            );
            chestPlate.position.set(0, 2.2, 0.25);
            cultistGroup.add(chestPlate);
            
            // Massive armored shoulders with spikes
            const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, metalness: 0.7 });
            [-0.7, 0.7].forEach(xPos => {
                const shoulder = new THREE.Mesh(
                    new THREE.SphereGeometry(0.35, 8, 8),
                    shoulderMat
                );
                shoulder.position.set(xPos, 2.7, 0);
                shoulder.scale.set(1.2, 0.8, 1);
                cultistGroup.add(shoulder);
                
                // Shoulder spike
                const shoulderSpike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.1, 0.4, 6),
                    shoulderMat
                );
                shoulderSpike.position.set(xPos * 1.1, 2.9, 0);
                shoulderSpike.rotation.z = xPos > 0 ? -0.5 : 0.5;
                cultistGroup.add(shoulderSpike);
            });
            
            // Giant helmet
            const jugHelmet = new THREE.Mesh(
                new THREE.SphereGeometry(0.45, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.8 })
            );
            jugHelmet.position.y = 3.4;
            jugHelmet.scale.set(1, 1.1, 1);
            cultistGroup.add(jugHelmet);
            
            // Helmet face plate
            const facePlate = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.4, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9 })
            );
            facePlate.position.set(0, 3.35, 0.35);
            cultistGroup.add(facePlate);
            
            // Glowing visor slit
            const visor = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.06, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xff4400 })
            );
            visor.position.set(0, 3.4, 0.42);
            cultistGroup.add(visor);
            
            // HORNS on helmet!
            const hornMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 });
            [-0.3, 0.3].forEach(xPos => {
                const horn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.1, 0.6, 8),
                    hornMat
                );
                horn.position.set(xPos, 3.7, -0.1);
                horn.rotation.x = -0.5;
                horn.rotation.z = xPos > 0 ? -0.4 : 0.4;
                cultistGroup.add(horn);
            });
            
            // Armored legs
            const legArmorMat = new THREE.MeshStandardMaterial({ color: armorColor, metalness: 0.6, roughness: 0.4 });
            [-0.3, 0.3].forEach(xPos => {
                const thigh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8),
                    legArmorMat
                );
                thigh.position.set(xPos, 0.9, 0.05);
                thigh.rotation.x = 0.2;
                cultistGroup.add(thigh);
                
                const shin = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.12, 0.6, 8),
                    legArmorMat
                );
                shin.position.set(xPos, 0.35, 0);
                cultistGroup.add(shin);
                
                const boot = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.15, 0.3),
                    new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.5 })
                );
                boot.position.set(xPos, 0.08, 0.05);
                cultistGroup.add(boot);
            });
            
            // Massive armored arms
            [-1, 1].forEach(side => {
                const upperArm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.12, 0.6, 8),
                    legArmorMat
                );
                upperArm.position.set(side * 0.75, 2.3, 0);
                upperArm.rotation.z = side * 0.6;
                cultistGroup.add(upperArm);
                
                const lowerArm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.1, 0.5, 8),
                    legArmorMat
                );
                lowerArm.position.set(side * 0.95, 1.9, 0.15);
                lowerArm.rotation.x = -0.4;
                cultistGroup.add(lowerArm);
                
                // Armored fist
                const fist = new THREE.Mesh(
                    new THREE.SphereGeometry(0.12, 8, 8),
                    legArmorMat
                );
                fist.position.set(side * 1.0, 1.6, 0.25);
                cultistGroup.add(fist);
            });
            
            // Giant war hammer
            const hammerHandle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
                new THREE.MeshStandardMaterial({ color: 0x3a2a1a })
            );
            hammerHandle.position.set(1.1, 2.0, 0.3);
            hammerHandle.rotation.x = -0.3;
            hammerHandle.rotation.z = -0.2;
            cultistGroup.add(hammerHandle);
            
            const hammerHead = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.4, 0.4),
                new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.9 })
            );
            hammerHead.position.set(1.2, 2.7, 0.35);
            cultistGroup.add(hammerHead);
            
            health = 150;
            speed = 1.0;
            damage = 40;
            attacksFirePriority = 0.7;
            break;
            
        case 'snowKing':
            // === SNOW KING - Very buff, ginormous armor, giant battle axe, huge helmet, angry eyes ===
            const kingArmorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a5a, roughness: 0.3, metalness: 0.8 });
            const kingGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
            
            // MASSIVE buff body
            const kingBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.9, 2.5, 8),
                kingArmorMat
            );
            kingBody.position.y = 2.25;
            cultistGroup.add(kingBody);
            
            // Ginormous chest armor
            const kingChest = new THREE.Mesh(
                new THREE.BoxGeometry(1.3, 1.4, 0.6),
                new THREE.MeshStandardMaterial({ color: 0x3a3a6a, metalness: 0.85, roughness: 0.25 })
            );
            kingChest.position.set(0, 2.5, 0.2);
            cultistGroup.add(kingChest);
            
            // Gold trim on chest
            const goldTrim = new THREE.Mesh(
                new THREE.BoxGeometry(1.35, 0.1, 0.65),
                kingGoldMat
            );
            goldTrim.position.set(0, 3.15, 0.2);
            cultistGroup.add(goldTrim);
            
            // GINORMOUS shoulder armor
            [-0.85, 0.85].forEach(xPos => {
                const shoulder = new THREE.Mesh(
                    new THREE.SphereGeometry(0.45, 8, 8),
                    kingArmorMat
                );
                shoulder.position.set(xPos, 3.2, 0);
                shoulder.scale.set(1.3, 1, 1.2);
                cultistGroup.add(shoulder);
                
                // Multiple spikes on shoulders
                for (let s = 0; s < 3; s++) {
                    const spike = new THREE.Mesh(
                        new THREE.ConeGeometry(0.08, 0.5, 6),
                        kingArmorMat
                    );
                    spike.position.set(xPos * 1.2, 3.4 + s * 0.15, -0.2 + s * 0.15);
                    spike.rotation.z = xPos > 0 ? -0.6 : 0.6;
                    spike.rotation.x = -0.3;
                    cultistGroup.add(spike);
                }
            });
            
            // HUGE helmet
            const kingHelmet = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 10, 10),
                new THREE.MeshStandardMaterial({ color: 0x1a1a3a, metalness: 0.9 })
            );
            kingHelmet.position.y = 4.1;
            kingHelmet.scale.set(1, 1.2, 1);
            cultistGroup.add(kingHelmet);
            
            // Helmet crown/crest
            const helmetCrest = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.6, 0.8),
                kingGoldMat
            );
            helmetCrest.position.set(0, 4.5, -0.1);
            cultistGroup.add(helmetCrest);
            
            // Helmet face guard
            const faceGuard = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x0a0a2a, metalness: 0.95 })
            );
            faceGuard.position.set(0, 4.0, 0.45);
            cultistGroup.add(faceGuard);
            
            // ANGRY glowing eyes (larger, more intense)
            const angryEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const kingEye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08), angryEyeMat);
            kingEye1.position.set(-0.15, 4.05, 0.52);
            cultistGroup.add(kingEye1);
            const kingEye2 = kingEye1.clone();
            kingEye2.position.set(0.15, 4.05, 0.52);
            cultistGroup.add(kingEye2);
            
            // Angry eye glow
            const eyeGlow = new THREE.PointLight(0xff0000, 0.5, 3);
            eyeGlow.position.set(0, 4.05, 0.6);
            cultistGroup.add(eyeGlow);
            
            // Massive buff arms
            [-1, 1].forEach(side => {
                const upperArm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2, 0.18, 0.8, 8),
                    kingArmorMat
                );
                upperArm.position.set(side * 0.9, 2.8, 0);
                upperArm.rotation.z = side * 0.5;
                cultistGroup.add(upperArm);
                
                const lowerArm = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8),
                    kingArmorMat
                );
                lowerArm.position.set(side * 1.15, 2.3, 0.2);
                lowerArm.rotation.x = -0.5;
                cultistGroup.add(lowerArm);
                
                // Armored gauntlet
                const gauntlet = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.25, 0.25),
                    kingArmorMat
                );
                gauntlet.position.set(side * 1.2, 1.9, 0.35);
                cultistGroup.add(gauntlet);
            });
            
            // Massive buff legs
            [-0.35, 0.35].forEach(xPos => {
                const thigh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.22, 0.18, 0.9, 8),
                    kingArmorMat
                );
                thigh.position.set(xPos, 0.95, 0.05);
                thigh.rotation.x = 0.15;
                cultistGroup.add(thigh);
                
                const shin = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.15, 0.7, 8),
                    kingArmorMat
                );
                shin.position.set(xPos, 0.35, 0);
                cultistGroup.add(shin);
                
                const boot = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25, 0.2, 0.35),
                    new THREE.MeshStandardMaterial({ color: 0x1a1a3a, metalness: 0.7 })
                );
                boot.position.set(xPos, 0.1, 0.05);
                cultistGroup.add(boot);
            });
            
            // GIANT BATTLE AXE
            const giantAxeHandle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8),
                new THREE.MeshStandardMaterial({ color: 0x3a2010 })
            );
            giantAxeHandle.position.set(1.3, 2.5, 0.4);
            giantAxeHandle.rotation.x = -0.2;
            giantAxeHandle.rotation.z = -0.15;
            cultistGroup.add(giantAxeHandle);
            
            // Double-sided axe blade
            const axeBladeMain = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.8, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.95, roughness: 0.1 })
            );
            axeBladeMain.position.set(1.35, 3.5, 0.5);
            cultistGroup.add(axeBladeMain);
            
            // Other side of axe
            const axeBladeBack = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.6, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.95, roughness: 0.1 })
            );
            axeBladeBack.position.set(1.35, 3.5, 0.3);
            cultistGroup.add(axeBladeBack);
            
            // Gold decoration on axe
            const axeGold = new THREE.Mesh(
                new THREE.TorusGeometry(0.15, 0.03, 8, 16),
                kingGoldMat
            );
            axeGold.position.set(1.35, 3.5, 0.4);
            cultistGroup.add(axeGold);
            
            health = 200;
            speed = 1.5;
            damage = 50;
            attacksFirePriority = 0.9;
            break;
    }
    
    cultistGroup.position.set(x, 0, z);
    scene.add(cultistGroup);
    
    gameState.snowGuards.push({
        mesh: cultistGroup,
        type: type,
        health: health,
        maxHealth: health,
        speed: speed,
        damage: damage,
        attacksFirePriority: attacksFirePriority || 0.3,
        x: x,
        z: z,
        attackCooldown: 0
    });
}

function updateSnowGuards(deltaTime) {
    gameState.snowGuards.forEach((guard, index) => {
        if (guard.health <= 0) return;

        // Campfire is at origin (0, 0)
        const campfireX = 0;
        const campfireZ = 0;
        
        // Distance to player
        const dirToPlayerX = camera.position.x - guard.mesh.position.x;
        const dirToPlayerZ = camera.position.z - guard.mesh.position.z;
        const distToPlayer = Math.sqrt(dirToPlayerX * dirToPlayerX + dirToPlayerZ * dirToPlayerZ);
        
        // Distance to campfire
        const dirToFireX = campfireX - guard.mesh.position.x;
        const dirToFireZ = campfireZ - guard.mesh.position.z;
        const distToFire = Math.sqrt(dirToFireX * dirToFireX + dirToFireZ * dirToFireZ);
        
        // Decide target based on attacksFirePriority (during raids)
        let targetX, targetZ, targetDist;
        const attackingFire = gameState.raidActive && Math.random() < (guard.attacksFirePriority || 0.3);
        
        if (attackingFire && distToFire > 2) {
            // Target the campfire
            targetX = dirToFireX;
            targetZ = dirToFireZ;
            targetDist = distToFire;
        } else {
            // Target the player
            targetX = dirToPlayerX;
            targetZ = dirToPlayerZ;
            targetDist = distToPlayer;
        }

        // Move toward target
        if (targetDist > 2) {
            guard.mesh.position.x += (targetX / targetDist) * guard.speed * deltaTime;
            guard.mesh.position.z += (targetZ / targetDist) * guard.speed * deltaTime;
        }

        // Look at current target
        if (attackingFire && distToFire <= 3) {
            guard.mesh.lookAt(campfireX, guard.mesh.position.y, campfireZ);
        } else {
            guard.mesh.lookAt(camera.position.x, guard.mesh.position.y, camera.position.z);
        }

        // Attack campfire if close (during raid)
        if (gameState.raidActive && distToFire < 3 && guard.attackCooldown <= 0) {
            // Attack the campfire!
            gameState.campfireStrength -= guard.damage * 0.5;
            guard.attackCooldown = 2;
            
            // Visual feedback - flash the campfire
            if (campfire) {
                campfire.traverse(child => {
                    if (child.isMesh && child.material) {
                        const origColor = child.material.color ? child.material.color.getHex() : 0;
                        if (child.material.color) {
                            child.material.color.setHex(0xff0000);
                            setTimeout(() => child.material.color.setHex(origColor), 100);
                        }
                    }
                });
            }
            
            // Check if campfire is destroyed
            if (gameState.campfireStrength <= 0) {
                gameState.campfireStrength = 0;
                showCampfireDestroyedGameOver();
                return;
            }
        }
        // Attack player if close
        else if (distToPlayer < 2.5 && guard.attackCooldown <= 0) {
            // Check for block (Survivor with Shield - must have shield selected)
            const selectedItem = gameState.hotbar[gameState.selectedSlot];
            if (selectedItem && selectedItem.blockChance && Math.random() < selectedItem.blockChance) {
                showBlockedText();
                guard.attackCooldown = 2;
            } else {
                const actualDamage = gameState.gear.bearArmor ? guard.damage * 0.5 : guard.damage;
                gameState.playerHealth -= actualDamage;
                guard.attackCooldown = 2;
                showDamageFlash();
            }
        }

        if (guard.attackCooldown > 0) {
            guard.attackCooldown -= deltaTime;
        }

        guard.x = guard.mesh.position.x;
        guard.z = guard.mesh.position.z;
    });
}

function attackSnowGuard(guard) {
    // Get currently selected item from hotbar
    const selectedItem = gameState.hotbar[gameState.selectedSlot];
    
    // Calculate damage from weapon + class bonus
    const classBonus = gameState.selectedClass ? 
        gameState.classes[gameState.selectedClass].damageBonus : 1;
    
    const weaponDamage = (selectedItem && selectedItem.damage !== undefined) ? 
        selectedItem.damage : gameState.baseDamage;
    
    const damage = weaponDamage * classBonus;
    guard.health -= damage;
    
    // Show damage number
    showDamageNumber(damage, guard.mesh.position);
    
    // Flash
    guard.mesh.traverse(child => {
        if (child.isMesh && child.material && !child.material.transparent) {
            const originalColor = child.material.color.getHex();
            child.material.color.setHex(0xff0000);
            setTimeout(() => {
                child.material.color.setHex(originalColor);
            }, 100);
        }
    });
    
    if (guard.health <= 0) {
        // Death animation
        const fallAnim = () => {
            if (guard.mesh.rotation.x < Math.PI / 2) {
                guard.mesh.rotation.x += 0.15;
                requestAnimationFrame(fallAnim);
            } else {
                setTimeout(() => {
                    scene.remove(guard.mesh);
                    const idx = gameState.snowGuards.indexOf(guard);
                    if (idx > -1) gameState.snowGuards.splice(idx, 1);
                }, 1000);
            }
        };
        fallAnim();
    }
}

// ============================================
// SPECIAL EVENTS
// ============================================
function checkSpecialEvents() {
    // Day 5 Wind Whisper Event
    if (gameState.currentNight === 5 && !gameState.windWhisperShown && !gameState.isNight) {
        // Check if it's late in the day (last 20% of day)
        const totalCycleTime = gameState.dayDuration + gameState.nightDuration;
        const cycleTime = gameState.time % totalCycleTime;
        const dayProgress = cycleTime / gameState.dayDuration;
        
        if (dayProgress > 0.8) {
            showWindWhisper();
            gameState.windWhisperShown = true;
        }
    }
}

function showWindWhisper() {
    const whisper = document.getElementById('wind-whisper');
    whisper.style.display = 'block';
    whisper.style.animation = 'whisperFade 5s ease-in-out';
    
    // Play spooky wind sound effect (if we had audio)
    
    setTimeout(() => {
        whisper.style.display = 'none';
    }, 5000);
}

function triggerCultistRaid() {
    gameState.raidActive = true;
    
    // Spawn cultists around the CAMPFIRE (they want to destroy it!)
    const campfireX = 0; // Campfire is at origin
    const campfireZ = 0;
    const distance = 35;
    
    // Spawn 4 Axe Cultists
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
        const x = campfireX + Math.cos(angle) * distance;
        const z = campfireZ + Math.sin(angle) * distance;
        spawnCultist('axeCultist', x, z);
    }
    
    // Spawn 2 Bow Cultists (further back)
    for (let i = 0; i < 2; i++) {
        const angle = (i / 2) * Math.PI + Math.PI / 4;
        const x = campfireX + Math.cos(angle) * (distance + 10);
        const z = campfireZ + Math.sin(angle) * (distance + 10);
        spawnCultist('bowCultist', x, z);
    }
    
    // Spawn a Juggernaut
    spawnCultist('juggernaut',
        campfireX + Math.cos(Math.PI / 3) * (distance + 5),
        campfireZ + Math.sin(Math.PI / 3) * (distance + 5)
    );
    
    // Spawn the Snow King!
    spawnCultist('snowKing',
        campfireX + Math.cos(Math.PI * 5/4) * (distance + 8),
        campfireZ + Math.sin(Math.PI * 5/4) * (distance + 8)
    );

    // Show raid warning
    const warning = document.getElementById('warning');
    document.getElementById('warning-text').textContent = '🔥 CULTIST RAID! PROTECT YOUR FIRE! 🔥';
    warning.style.display = 'block';
    setTimeout(() => {
        warning.style.display = 'none';
        document.getElementById('warning-text').textContent = 'HE IS COMING';
    }, 4000);
}

function createSnowParticles() {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 100;     // x
        positions[i + 1] = Math.random() * 50;          // y
        positions[i + 2] = (Math.random() - 0.5) * 100; // z
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    
    const snow = new THREE.Points(geometry, material);
    snow.name = 'snowParticles';
    scene.add(snow);
}

function createStarsAndMoon() {
    // Create stars - many small white dots in the sky
    const starCount = 500;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        // Position stars in a large dome above the scene
        const radius = 150 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2; // Horizontal angle
        const phi = Math.random() * Math.PI * 0.4; // Vertical angle (upper dome only)
        
        starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);     // x
        starPositions[i + 1] = radius * Math.cos(phi) + 20;              // y (offset up)
        starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta); // z
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        transparent: true,
        opacity: 0.9
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.name = 'stars';
    stars.visible = false; // Hidden during day
    scene.add(stars);
    gameState.stars = stars;
    
    // Create moon - giant gray ball
    const moonGeometry = new THREE.SphereGeometry(12, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xcccccc
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(80, 100, -50); // High in the sky
    moon.name = 'moon';
    moon.visible = false; // Hidden during day
    scene.add(moon);
    gameState.moon = moon;
    
    // Add a subtle glow around the moon
    const moonGlowGeometry = new THREE.SphereGeometry(14, 32, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.2
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    moon.add(moonGlow);
}

function createMountains() {
    const mountainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a3a5a,
        roughness: 0.9 
    });
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 80 + Math.random() * 20;
        
        const mountainGeometry = new THREE.ConeGeometry(
            15 + Math.random() * 10, 
            30 + Math.random() * 20, 
            4
        );
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        mountain.position.set(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        mountain.rotation.y = Math.random() * Math.PI;
        scene.add(mountain);
        
        // Snow cap
        const snowCapGeometry = new THREE.ConeGeometry(5 + Math.random() * 3, 8, 4);
        const snowCapMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xe8f4f8,
            roughness: 0.9 
        });
        const snowCap = new THREE.Mesh(snowCapGeometry, snowCapMaterial);
        snowCap.position.set(
            mountain.position.x,
            25 + Math.random() * 10,
            mountain.position.z
        );
        scene.add(snowCap);
    }
}

function setupLighting() {
    // Ambient light - brighter for daytime feel
    const ambientLight = new THREE.AmbientLight(0x87CEEB, 0.6);
    scene.add(ambientLight);
    gameState.ambientLight = ambientLight;
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    gameState.directionalLight = directionalLight;
}

function createSanta() {
    const santaGroup = new THREE.Group();
    
    // Body (red coat)
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1, 2.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b0000,
        roughness: 0.7 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    santaGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a1a1a, // Dark, creepy
        roughness: 0.6 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 4;
    santaGroup.add(head);
    
    // Glowing red eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 4, 0.4);
    santaGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 4, 0.4);
    santaGroup.add(rightEye);
    
    // Evil Santa hat
    const hatGeometry = new THREE.ConeGeometry(0.4, 1, 8);
    const hatMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b0000,
        roughness: 0.7 
    });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 4.7;
    hat.rotation.z = 0.2; // Slightly tilted
    santaGroup.add(hat);
    
    // === BENT LEGS ===
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    
    // Left leg - bent at knee
    const leftLegGroup = new THREE.Group();
    // Thigh (angled forward)
    const leftThigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.15, 0.9, 8),
        legMaterial
    );
    leftThigh.position.set(0, 0.45, 0.2);
    leftThigh.rotation.x = 0.6; // Bent forward
    leftLegGroup.add(leftThigh);
    // Knee joint
    const leftKnee = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        legMaterial
    );
    leftKnee.position.set(0, 0.15, 0.55);
    leftLegGroup.add(leftKnee);
    // Shin (angled down)
    const leftShin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.8, 8),
        legMaterial
    );
    leftShin.position.set(0, -0.25, 0.4);
    leftShin.rotation.x = -0.4; // Bent back down
    leftLegGroup.add(leftShin);
    // Boot
    const leftBoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.4),
        bootMaterial
    );
    leftBoot.position.set(0, -0.55, 0.25);
    leftLegGroup.add(leftBoot);
    leftLegGroup.position.set(-0.35, 1.0, 0);
    santaGroup.add(leftLegGroup);
    
    // Right leg - bent at knee (mirrored)
    const rightLegGroup = new THREE.Group();
    const rightThigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.15, 0.9, 8),
        legMaterial
    );
    rightThigh.position.set(0, 0.45, 0.2);
    rightThigh.rotation.x = 0.6;
    rightLegGroup.add(rightThigh);
    const rightKnee = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        legMaterial
    );
    rightKnee.position.set(0, 0.15, 0.55);
    rightLegGroup.add(rightKnee);
    const rightShin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.8, 8),
        legMaterial
    );
    rightShin.position.set(0, -0.25, 0.4);
    rightShin.rotation.x = -0.4;
    rightLegGroup.add(rightShin);
    const rightBoot = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.4),
        bootMaterial
    );
    rightBoot.position.set(0, -0.55, 0.25);
    rightLegGroup.add(rightBoot);
    rightLegGroup.position.set(0.35, 1.0, 0);
    santaGroup.add(rightLegGroup);
    
    // === BENT ARMS WITH WHITE GLOVES AND CLAWS ===
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7 });
    const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }); // White gloves
    const clawMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    
    // Left arm - bent at elbow
    const leftArmGroup = new THREE.Group();
    // Upper arm
    const leftUpperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.7, 8),
        armMaterial
    );
    leftUpperArm.position.set(-0.35, 0, 0);
    leftUpperArm.rotation.z = Math.PI / 2 + 0.3;
    leftArmGroup.add(leftUpperArm);
    // Elbow joint
    const leftElbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        armMaterial
    );
    leftElbow.position.set(-0.65, -0.15, 0);
    leftArmGroup.add(leftElbow);
    // Forearm (bent down and forward)
    const leftForearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.6, 8),
        armMaterial
    );
    leftForearm.position.set(-0.75, -0.45, 0.2);
    leftForearm.rotation.x = -0.8;
    leftForearm.rotation.z = 0.3;
    leftArmGroup.add(leftForearm);
    // White glove (hand)
    const leftGlove = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        gloveMaterial
    );
    leftGlove.position.set(-0.8, -0.7, 0.45);
    leftArmGroup.add(leftGlove);
    // Razor sharp claws extending from glove (5 long deadly claws)
    for (let i = 0; i < 5; i++) {
        const claw = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.6, 8),  // Thinner and longer = sharper!
            clawMaterial
        );
        const angle = (i - 2) * 0.35;
        claw.position.set(
            -0.8 + Math.sin(angle) * 0.1,
            -0.85,
            0.5 + Math.cos(angle) * 0.1
        );
        claw.rotation.x = -0.6;
        claw.rotation.z = angle * 0.5;
        leftArmGroup.add(claw);
    }
    leftArmGroup.position.set(-0.8, 3.2, 0);
    santaGroup.add(leftArmGroup);
    
    // Right arm - bent at elbow (mirrored)
    const rightArmGroup = new THREE.Group();
    const rightUpperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.12, 0.7, 8),
        armMaterial
    );
    rightUpperArm.position.set(0.35, 0, 0);
    rightUpperArm.rotation.z = -(Math.PI / 2 + 0.3);
    rightArmGroup.add(rightUpperArm);
    const rightElbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        armMaterial
    );
    rightElbow.position.set(0.65, -0.15, 0);
    rightArmGroup.add(rightElbow);
    const rightForearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.6, 8),
        armMaterial
    );
    rightForearm.position.set(0.75, -0.45, 0.2);
    rightForearm.rotation.x = -0.8;
    rightForearm.rotation.z = -0.3;
    rightArmGroup.add(rightForearm);
    // White glove (hand)
    const rightGlove = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        gloveMaterial
    );
    rightGlove.position.set(0.8, -0.7, 0.45);
    rightArmGroup.add(rightGlove);
    // Razor sharp claws extending from glove (5 long deadly claws)
    for (let i = 0; i < 5; i++) {
        const claw = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.6, 8),  // Thinner and longer = sharper!
            clawMaterial
        );
        const angle = (i - 2) * 0.35;
        claw.position.set(
            0.8 + Math.sin(angle) * 0.1,
            -0.85,
            0.5 + Math.cos(angle) * 0.1
        );
        claw.rotation.x = -0.6;
        claw.rotation.z = -angle * 0.5;
        rightArmGroup.add(claw);
    }
    rightArmGroup.position.set(0.8, 3.2, 0);
    santaGroup.add(rightArmGroup);
    
    // Point light for eyes (creepy glow)
    const eyeLight = new THREE.PointLight(0xff0000, 0.5, 5);
    eyeLight.position.set(0, 4, 0.5);
    santaGroup.add(eyeLight);
    
    santaGroup.position.set(50, 0, 50);
    santaGroup.visible = false; // Hidden until night
    scene.add(santaGroup);
    santa = santaGroup;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update FPS camera aspect ratio too
    if (fpsCamera) {
        fpsCamera.aspect = window.innerWidth / window.innerHeight;
        fpsCamera.updateProjectionMatrix();
    }
}

// ============================================
// COLLISION DETECTION
// ============================================
function checkCollision(newX, newZ) {
    // Check tree collisions
    for (const tree of gameState.trees) {
        if (tree.chopped) continue;
        
        const dist = Math.sqrt(
            Math.pow(newX - tree.x, 2) + 
            Math.pow(newZ - tree.z, 2)
        );
        
        if (dist < gameState.treeCollisionRadius) {
            return true; // Collision!
        }
    }
    
    // Check creature collisions
    for (const creature of gameState.creatures) {
        if (creature.state === 'dead') continue;
        
        const dist = Math.sqrt(
            Math.pow(newX - creature.x, 2) + 
            Math.pow(newZ - creature.z, 2)
        );
        
        if (dist < creature.collisionRadius) {
            return true;
        }
    }
    
    // Check snow guard collisions
    for (const guard of gameState.snowGuards) {
        if (guard.health <= 0) continue;
        
        const dist = Math.sqrt(
            Math.pow(newX - guard.x, 2) + 
            Math.pow(newZ - guard.z, 2)
        );
        
        if (dist < 1) {
            return true;
        }
    }
    
    return false; // No collision
}

// ============================================
// CONTROLS
// ============================================
function setupControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        // Number keys 1-9 for hotbar selection
        if (e.code.startsWith('Digit') && gameState.isPlaying && !gameState.inLobby && !gameState.craftingOpen) {
            const digit = parseInt(e.code.charAt(5));
            if (digit >= 1 && digit <= 9) {
                selectHotbarSlot(digit - 1);
            }
        }
        
        // F to interact with campfire (add wood)
        if (e.code === 'KeyF' && gameState.isPlaying && !gameState.inLobby && !gameState.craftingOpen) {
            tryFeedFire();
        }
        
        // E for crafting bench interaction (only in forest, not lobby)
        if (e.code === 'KeyE' && gameState.isPlaying && !gameState.isPaused && !gameState.inLobby) {
            tryInteractCraftingBench();
        }
        
        // Escape to pause/close menus
        if (e.code === 'Escape') {
            if (gameState.craftingOpen) {
                toggleCrafting();
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Mouse movement for looking
    document.addEventListener('mousemove', (e) => {
        if (!isPointerLocked || !gameState.isPlaying || gameState.craftingOpen) return;
        
        gameState.playerRotation.y -= e.movementX * gameState.mouseSensitivity;
        gameState.playerRotation.x -= e.movementY * gameState.mouseSensitivity;
        
        // Clamp vertical rotation
        gameState.playerRotation.x = Math.max(
            -Math.PI / 2, 
            Math.min(Math.PI / 2, gameState.playerRotation.x)
        );
        
        camera.rotation.order = 'YXZ';
        camera.rotation.y = gameState.playerRotation.y;
        camera.rotation.x = gameState.playerRotation.x;
    });
    
    // Click for interactions
    document.addEventListener('click', (e) => {
        if (!gameState.isPlaying) return;
        
        // Request pointer lock if not locked
        if (!isPointerLocked && !gameState.craftingOpen) {
            document.body.requestPointerLock();
            return;
        }
        
        // Try to interact with objects (only in forest)
        if (!gameState.craftingOpen && !gameState.inLobby) {
            tryInteract();
            // Trigger attack animation
            triggerAttackAnimation();
        }
    });
    
    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === document.body;
    });
}

function tryInteract() {
    // Raycast from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Check trees
    const treeMeshes = gameState.trees.filter(t => !t.chopped).map(t => t.mesh);
    const treeIntersects = raycaster.intersectObjects(treeMeshes, true);
    
    if (treeIntersects.length > 0 && treeIntersects[0].distance < 5) {
        // Find the tree group
        let treeGroup = treeIntersects[0].object;
        while (treeGroup.parent && treeGroup.parent !== scene) {
            treeGroup = treeGroup.parent;
        }
        
        // Chop tree
        const treeData = gameState.trees.find(t => t.mesh === treeGroup);
        if (treeData && !treeData.chopped) {
            chopTree(treeData);
            return;
        }
    }
    
    // Check creatures
    const creatureMeshes = gameState.creatures.filter(c => c.state !== 'dead').map(c => c.mesh);
    const creatureIntersects = raycaster.intersectObjects(creatureMeshes, true);
    
    if (creatureIntersects.length > 0 && creatureIntersects[0].distance < 4) {
        let creatureGroup = creatureIntersects[0].object;
        while (creatureGroup.parent && creatureGroup.parent !== scene) {
            creatureGroup = creatureGroup.parent;
        }
        
        const creature = gameState.creatures.find(c => c.mesh === creatureGroup);
        if (creature && creature.state !== 'dead') {
            attackCreature(creature);
            return;
        }
    }
    
    // Check snow guards
    const guardMeshes = gameState.snowGuards.filter(g => g.health > 0).map(g => g.mesh);
    const guardIntersects = raycaster.intersectObjects(guardMeshes, true);
    
    if (guardIntersects.length > 0 && guardIntersects[0].distance < 4) {
        let guardGroup = guardIntersects[0].object;
        while (guardGroup.parent && guardGroup.parent !== scene) {
            guardGroup = guardGroup.parent;
        }
        
        const guard = gameState.snowGuards.find(g => g.mesh === guardGroup);
        if (guard && guard.health > 0) {
            attackSnowGuard(guard);
            return;
        }
    }
}

function chopTree(treeData) {
    // Apply class gather bonus
    const classBonus = gameState.selectedClass ? 
        gameState.classes[gameState.selectedClass].gatherBonus : 1;
    const logsToSpawn = Math.floor(treeData.wood * classBonus);
    
    // Visual feedback - tree falls
    treeData.chopped = true;
    
    // Get tree position before it falls
    const treeX = treeData.mesh.position.x;
    const treeZ = treeData.mesh.position.z;
    
    // Animate tree falling
    const fallAnimation = () => {
        if (treeData.mesh.rotation.x < Math.PI / 2) {
            treeData.mesh.rotation.x += 0.05;
            requestAnimationFrame(fallAnimation);
        } else {
            // Spawn log items where tree fell
            for (let i = 0; i < logsToSpawn; i++) {
                const offsetX = (Math.random() - 0.5) * 3;
                const offsetZ = (Math.random() - 0.5) * 3;
                spawnDroppedItem('log', treeX + offsetX, treeZ + offsetZ);
            }
            
            // Remove tree after falling
            setTimeout(() => {
                scene.remove(treeData.mesh);
            }, 1000);
        }
    };
    fallAnimation();
    
    // Show floating text
    showFloatingText(`🪵 x${logsToSpawn} dropped!`, camera.position);
}

function spawnDroppedItem(type, x, z) {
    const itemGroup = new THREE.Group();
    
    if (type === 'log') {
        // Create a log mesh
        const logGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
        const logMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9 
        });
        const log = new THREE.Mesh(logGeometry, logMaterial);
        log.rotation.z = Math.PI / 2;
        log.position.y = 0.2;
        log.castShadow = true;
        itemGroup.add(log);
        
        // Add a glow effect
        const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.2;
        glow.name = 'itemGlow';
        itemGroup.add(glow);
    }
    
    itemGroup.position.set(x, 0, z);
    scene.add(itemGroup);
    
    gameState.droppedItems.push({
        mesh: itemGroup,
        type: type,
        x: x,
        z: z,
        value: 1, // Each log = 1 wood
        pickupRadius: 1.5
    });
}

function updateDroppedItems(deltaTime) {
    // Animate dropped items (bob up and down, rotate glow)
    gameState.droppedItems.forEach((item, index) => {
        if (!item.mesh) return;
        
        // Bob animation
        item.mesh.position.y = Math.sin(Date.now() * 0.003 + index) * 0.1 + 0.1;
        
        // Pulse glow
        const glow = item.mesh.getObjectByName('itemGlow');
        if (glow) {
            glow.material.opacity = 0.2 + Math.sin(Date.now() * 0.005) * 0.15;
        }
        
        // Check if player is close enough to pick up
        const dist = Math.sqrt(
            Math.pow(camera.position.x - item.x, 2) +
            Math.pow(camera.position.z - item.z, 2)
        );
        
        if (dist < item.pickupRadius) {
            pickupItem(item, index);
        }
    });
}

function pickupItem(item, index) {
    // Add to inventory based on type
    if (item.type === 'log') {
        gameState.wood += item.value;
        showLootText(`+${item.value} 🪵`);
    }
    
    // Remove from scene
    scene.remove(item.mesh);
    gameState.droppedItems.splice(index, 1);
    
    updateUI();
}

function showFloatingText(text, position) {
    // For now, just update the wood count visually
    const woodCount = document.getElementById('wood-count');
    woodCount.style.transform = 'scale(1.3)';
    woodCount.style.color = '#ffd700';
    setTimeout(() => {
        woodCount.style.transform = 'scale(1)';
        woodCount.style.color = '#e8f4f8';
    }, 300);
}

// ============================================
// GAME LOOP
// ============================================
function update(deltaTime) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Update player movement (works in both lobby and game)
    updatePlayerMovement(deltaTime);
    
    // Lobby mode - just check portal collisions and animate
    if (gameState.inLobby) {
        checkPortalCollision();
        updateLobbyEffects(deltaTime);
        return;
    }
    
    // Update time
    updateTime(deltaTime);
    
    // Update creatures
    updateCreatures(deltaTime);
    
    // Update snow guards
    updateSnowGuards(deltaTime);
    
    // Update Santa
    if (gameState.isNight) {
        updateSanta(deltaTime);
    }
    
    // Check special events
    checkSpecialEvents();
    
    // Update visual effects
    updateEffects(deltaTime);
    
    // Update dropped items
    updateDroppedItems(deltaTime);
    
    // Update placed objects (crafting bench proximity)
    updatePlacedObjects();
    
    // Update UI
    updateUI();
    
    // Regenerate health near campfire
    updateHealthRegen(deltaTime);
    
    // Check death conditions
    checkDeathConditions();
}

function updateHealthRegen(deltaTime) {
    // Check distance to campfire (campfire is at origin 0,0)
    const distToFire = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.z * camera.position.z
    );
    
    // If within campfire radius, regenerate health
    if (distToFire < gameState.campfireRadius) {
        // Calculate max health based on class
        const classBonus = gameState.selectedClass ? 
            gameState.classes[gameState.selectedClass].healthBonus : 0;
        const maxHealth = 100 + classBonus;
        
        // Medium-fast regen: about 15 HP per second when close to fire
        // Closer = faster regen
        const regenRate = 15 * (1 - distToFire / gameState.campfireRadius);
        
        if (gameState.playerHealth < maxHealth) {
            gameState.playerHealth = Math.min(
                maxHealth, 
                gameState.playerHealth + regenRate * deltaTime
            );
            
            // Visual feedback - show healing particles occasionally
            if (Math.random() < 0.05) {
                showHealingEffect();
            }
        }
    }
}

function showHealingEffect() {
    const heal = document.createElement('div');
    heal.textContent = '+';
    heal.style.cssText = `
        position: fixed;
        top: ${35 + Math.random() * 10}%;
        left: ${48 + Math.random() * 4}%;
        font-size: 1.2rem;
        font-weight: bold;
        color: #44ff44;
        text-shadow: 0 0 10px rgba(68, 255, 68, 0.8);
        pointer-events: none;
        z-index: 1000;
        animation: healFloat 1s ease-out forwards;
    `;
    document.body.appendChild(heal);
    setTimeout(() => heal.remove(), 1000);
}

function updateLobbyEffects(deltaTime) {
    // Animate portal particles
    gameState.portals.forEach(portal => {
        const particles = portal.mesh.getObjectByName('portalParticles');
        if (particles) {
            particles.rotation.y += deltaTime * 0.5;
        }
        
        // Pulse portal surface
        const surface = portal.mesh.getObjectByName('portalSurface');
        if (surface && surface.material) {
            surface.material.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
        }
    });
    
    // Animate lobby fire
    scene.traverse(obj => {
        if (obj.name === 'lobbyFire') {
            obj.scale.x = 1 + Math.sin(Date.now() * 0.01) * 0.1;
            obj.scale.z = 1 + Math.cos(Date.now() * 0.01) * 0.1;
        }
    });
    
    // Animate dust particles
    const dust = scene.getObjectByName('lobbyDust');
    if (dust) {
        const positions = dust.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += deltaTime * 0.1;
            if (positions[i + 1] > 9) {
                positions[i + 1] = 0.5;
            }
        }
        dust.geometry.attributes.position.needsUpdate = true;
    }
}

function updateTime(deltaTime) {
    gameState.time += deltaTime;
    
    const totalCycleTime = gameState.dayDuration + gameState.nightDuration;
    const cycleTime = gameState.time % totalCycleTime;
    
    const wasNight = gameState.isNight;
    gameState.isNight = cycleTime >= gameState.dayDuration;
    
    // Night started
    if (!wasNight && gameState.isNight) {
        onNightStart();
    }
    
    // Day started (new night completed)
    if (wasNight && !gameState.isNight) {
        onDayStart();
    }
    
    // Update time bar
    const timeBar = document.getElementById('time-bar');
    const timeIcon = document.getElementById('time-icon');
    
    if (gameState.isNight) {
        const nightProgress = (cycleTime - gameState.dayDuration) / gameState.nightDuration;
        timeBar.style.width = `${(1 - nightProgress) * 100}%`;
        timeBar.style.background = 'linear-gradient(90deg, #1a1a4e, #4a0080)';
        timeIcon.textContent = '🌙';
    } else {
        const dayProgress = cycleTime / gameState.dayDuration;
        timeBar.style.width = `${(1 - dayProgress) * 100}%`;
        timeBar.style.background = 'linear-gradient(90deg, #ffd700, #ff8c00)';
        timeIcon.textContent = '☀️';
    }
}

function onNightStart() {
    // Show warning
    const warning = document.getElementById('warning');
    warning.style.display = 'block';
    setTimeout(() => {
        warning.style.display = 'none';
    }, 3000);
    
    // Activate Santa
    gameState.santaActive = true;
    santa.visible = true;
    
    // Position Santa far away
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 20;
    santa.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
    );
    
    // Darken the scene for night
    scene.fog.color.setHex(0x0a0a12);
    scene.background.setHex(0x0a0a12);
    
    // Show stars and moon at night
    if (gameState.stars) gameState.stars.visible = true;
    if (gameState.moon) gameState.moon.visible = true;
    
    // Dim the lights for night
    if (gameState.ambientLight) gameState.ambientLight.intensity = 0.15;
    if (gameState.directionalLight) gameState.directionalLight.intensity = 0.2;
    
    // Day 5 special raid!
    if (gameState.currentNight === 5 && gameState.windWhisperShown) {
        setTimeout(() => {
            triggerCultistRaid();
        }, 2000);
    }
}

function onDayStart() {
    gameState.currentNight++;
    document.getElementById('current-night').textContent = gameState.currentNight;
    
    // Deactivate Santa
    gameState.santaActive = false;
    santa.visible = false;
    
    // Lighten the scene - bright icy blue daytime sky
    scene.fog.color.setHex(0x87CEEB);
    scene.background.setHex(0x87CEEB);
    
    // Show bright daytime - hide stars and moon
    if (gameState.stars) gameState.stars.visible = false;
    if (gameState.moon) gameState.moon.visible = false;
    
    // Brighten the lights for day
    if (gameState.ambientLight) gameState.ambientLight.intensity = 0.6;
    if (gameState.directionalLight) gameState.directionalLight.intensity = 0.8;
    
    // Santa gets smarter each night
    gameState.santaSpeed += 0.1 * gameState.santaSmartness;
    
    // Clear raid state
    gameState.raidActive = false;
    
    // Check win condition
    if (gameState.currentNight > 99) {
        showVictory();
    }
}

function updatePlayerMovement(deltaTime) {
    if (gameState.craftingOpen) return;
    
    const moveVector = new THREE.Vector3();
    
    if (keys['KeyW']) moveVector.z -= 1;
    if (keys['KeyS']) moveVector.z += 1;
    if (keys['KeyA']) moveVector.x -= 1;
    if (keys['KeyD']) moveVector.x += 1;
    
    if (moveVector.length() > 0) {
        moveVector.normalize();
        
        // Speed boost from mammoth boots (only in forest)
        let speed = gameState.moveSpeed;
        if (!gameState.inLobby && gameState.gear.mammothBoots) {
            speed *= 1.3;
        }
        moveVector.multiplyScalar(speed * deltaTime);
        
        // Apply rotation
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.playerRotation.y);
        
        // Calculate new position
        const newX = camera.position.x + moveVector.x;
        const newZ = camera.position.z + moveVector.z;
        
        if (gameState.inLobby) {
            // Lobby bounds checking
            const lobbyBounds = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };
            const clampedX = Math.max(lobbyBounds.minX, Math.min(lobbyBounds.maxX, newX));
            const clampedZ = Math.max(lobbyBounds.minZ, Math.min(lobbyBounds.maxZ, newZ));
            camera.position.x = clampedX;
            camera.position.z = clampedZ;
        } else {
            // Forest collision detection
        if (!checkCollision(newX, newZ)) {
            camera.position.x = newX;
            camera.position.z = newZ;
        } else {
            // Try sliding along obstacles
            if (!checkCollision(newX, camera.position.z)) {
                camera.position.x = newX;
            } else if (!checkCollision(camera.position.x, newZ)) {
                camera.position.z = newZ;
            }
        }
        
        // Keep player in bounds
        const maxDistance = 90;
        const distFromCenter = Math.sqrt(
            camera.position.x * camera.position.x + 
            camera.position.z * camera.position.z
        );
        if (distFromCenter > maxDistance) {
            const scale = maxDistance / distFromCenter;
            camera.position.x *= scale;
            camera.position.z *= scale;
            }
        }
        
        // Fixed height
        camera.position.y = 1.6;
    }
}

function updateSanta(deltaTime) {
    if (!gameState.santaActive) return;
    
    // Calculate distance from player to campfire
    const playerDistFromFire = Math.sqrt(
        camera.position.x * camera.position.x + 
        camera.position.z * camera.position.z
    );
    
    // Santa is repelled by fire
    const santaDistFromFire = Math.sqrt(
        santa.position.x * santa.position.x + 
        santa.position.z * santa.position.z
    );
    
    // Direction to player
    const dirToPlayer = new THREE.Vector3(
        camera.position.x - santa.position.x,
        0,
        camera.position.z - santa.position.z
    ).normalize();
    
    // If player is near fire, Santa circles around
    if (playerDistFromFire < gameState.campfireRadius) {
        // Circle around the campfire, looking for an opening
        const angle = Math.atan2(santa.position.z, santa.position.x);
        const circleAngle = angle + deltaTime * 0.5;
        const circleDistance = gameState.campfireRadius + 5;
        
        santa.position.x += (Math.cos(circleAngle) * circleDistance - santa.position.x) * deltaTime;
        santa.position.z += (Math.sin(circleAngle) * circleDistance - santa.position.z) * deltaTime;
    } else {
        // Player outside fire - CHASE!
        santa.position.x += dirToPlayer.x * gameState.santaSpeed * deltaTime;
        santa.position.z += dirToPlayer.z * gameState.santaSpeed * deltaTime;
    }
    
    // Santa looks at player
    santa.lookAt(camera.position.x, santa.position.y, camera.position.z);
    
    // Keep Santa away from fire center
    if (santaDistFromFire < gameState.campfireRadius) {
        const pushDir = new THREE.Vector3(santa.position.x, 0, santa.position.z).normalize();
        santa.position.x = pushDir.x * gameState.campfireRadius;
        santa.position.z = pushDir.z * gameState.campfireRadius;
    }
}

function updateEffects(deltaTime) {
    // Animate campfire
    if (campfire) {
        const fire = campfire.getObjectByName('fire');
        if (fire) {
            fire.scale.x = 1 + Math.sin(Date.now() * 0.01) * 0.1;
            fire.scale.z = 1 + Math.cos(Date.now() * 0.01) * 0.1;
        }
    }
    
    // Animate campfire light
    if (campfireLight) {
        campfireLight.intensity = 2 + Math.sin(Date.now() * 0.005) * 0.3;
    }
    
    // Animate snow particles
    const snow = scene.getObjectByName('snowParticles');
    if (snow) {
        const positions = snow.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= deltaTime * 2; // Fall down
            if (positions[i + 1] < 0) {
                positions[i + 1] = 50; // Reset to top
            }
        }
        snow.geometry.attributes.position.needsUpdate = true;
    }
}

function updateUI() {
    document.getElementById('wood-count').textContent = gameState.wood;
    document.getElementById('health-count').textContent = Math.round(gameState.playerHealth);
    document.getElementById('pelts-count').textContent = gameState.pelts;
    document.getElementById('thick-pelts-count').textContent = gameState.thickPelts;
    document.getElementById('tusks-count').textContent = gameState.tusks;
    
    // Update health bar color
    const healthCount = document.getElementById('health-count');
    if (gameState.playerHealth < 30) {
        healthCount.style.color = '#ff4444';
    } else if (gameState.playerHealth < 60) {
        healthCount.style.color = '#ffaa44';
    } else {
        healthCount.style.color = '#44ff44';
    }
    
    // Update crafting item states
    updateCraftingItems();
}

function checkDeathConditions() {
    // Health death
    if (gameState.playerHealth <= 0) {
        playerDeath('health');
        return;
    }
    
    // Santa catch
    if (gameState.santaActive) {
        const distToSanta = Math.sqrt(
            Math.pow(camera.position.x - santa.position.x, 2) +
            Math.pow(camera.position.z - santa.position.z, 2)
        );
        
        if (distToSanta < 2) {
            playerDeath('santa');
        }
    }
}

function playerDeath(cause) {
    gameState.isPlaying = false;
    document.exitPointerLock();
    
    if (cause === 'health') {
        document.getElementById('nights-survived').textContent = gameState.currentNight - 1;
        document.getElementById('death-screen').style.display = 'flex';
    } else if (cause === 'santa') {
        document.getElementById('santa-nights-survived').textContent = gameState.currentNight - 1;
        document.getElementById('santa-death-screen').style.display = 'flex';
    }
}

function showCampfireDestroyedGameOver() {
    gameState.isPlaying = false;
    gameState.raidActive = false;
    document.exitPointerLock();
    
    // Create the campfire destroyed screen if it doesn't exist
    let fireDeathScreen = document.getElementById('fire-death-screen');
    if (!fireDeathScreen) {
        fireDeathScreen = document.createElement('div');
        fireDeathScreen.id = 'fire-death-screen';
        fireDeathScreen.style.cssText = `
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        fireDeathScreen.innerHTML = `
            <div style="text-align: center; color: white; font-family: 'Courier New', monospace;">
                <h1 style="font-size: 4em; color: #ff4400; text-shadow: 0 0 30px #ff0000;">🔥 FIRE EXTINGUISHED 🔥</h1>
                <p style="font-size: 1.5em; color: #aaa; margin: 20px 0;">The cultists destroyed your campfire...</p>
                <p style="font-size: 1.2em; color: #888;">Without warmth, you froze in the arctic night.</p>
                <p style="font-size: 1.5em; margin: 30px 0;">Survived <span style="color: #ff8800; font-size: 2em;">${gameState.currentNight - 1}</span> nights</p>
                <button id="fire-restart-button" style="
                    padding: 15px 40px;
                    font-size: 1.3em;
                    background: #ff4400;
                    color: white;
                    border: none;
                    cursor: pointer;
                    margin-top: 20px;
                    font-family: 'Courier New', monospace;
                ">TRY AGAIN</button>
            </div>
        `;
        document.getElementById('game-container').appendChild(fireDeathScreen);
        
        document.getElementById('fire-restart-button').addEventListener('click', () => {
            fireDeathScreen.style.display = 'none';
            restartGame();
        });
    } else {
        fireDeathScreen.querySelector('span').textContent = gameState.currentNight - 1;
        fireDeathScreen.style.display = 'flex';
    }
}

function showVictory() {
    gameState.isPlaying = false;
    document.exitPointerLock();
    // TODO: Victory screen
    alert('YOU SURVIVED 99 NIGHTS! You win!');
}

// ============================================
// CRAFTING
// ============================================
function toggleCrafting() {
    gameState.craftingOpen = !gameState.craftingOpen;
    document.getElementById('crafting-menu').style.display = 
        gameState.craftingOpen ? 'block' : 'none';
    
    if (gameState.craftingOpen) {
        document.exitPointerLock();
    }
}

// ============================================
// FIRE & CRAFTING BENCH INTERACTIONS
// ============================================
function tryFeedFire() {
    // Check if player is near the campfire
    const distToFire = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.z * camera.position.z
    );
    
    if (distToFire < 5) {
        // Near the fire - try to add wood
        if (gameState.wood >= 1) {
            gameState.wood -= 1;
            gameState.campfireStrength = Math.min(
                gameState.campfireMaxStrength, 
                gameState.campfireStrength + 15
            );
            gameState.campfireRadius = Math.min(25, gameState.campfireRadius + 1);
            
            // Visual feedback
            showLootText('🔥 Fire strengthened!');
            
            // Make fire bigger temporarily
            if (campfireLight) {
                campfireLight.intensity = 4;
                setTimeout(() => {
                    campfireLight.intensity = 2;
                }, 500);
            }
            
            updateUI();
        } else {
            showLootText('❌ No wood to add!');
        }
    } else {
        // Check if near a crafting bench to show hint
        showInteractionHint('Get closer to the fire (F to add wood)');
    }
}

function tryInteractCraftingBench() {
    // First check if near the campfire (basic crafting)
    const distToFire = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.z * camera.position.z
    );
    
    if (distToFire < 6) {
        toggleCrafting();
        return;
    }
    
    // Check if near a placed crafting bench
    for (const obj of gameState.placedObjects) {
        if (obj.type === 'craftingBench') {
            const dist = Math.sqrt(
                Math.pow(camera.position.x - obj.x, 2) +
                Math.pow(camera.position.z - obj.z, 2)
            );
            
            if (dist < 3) {
                toggleCrafting();
                return;
            }
        }
    }
    
    showInteractionHint('Get closer to the fire or a Crafting Bench (E)');
}

function showInteractionHint(text) {
    const hint = document.createElement('div');
    hint.textContent = text;
    hint.style.cssText = `
        position: fixed;
        bottom: 150px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #87ceeb;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.9rem;
        pointer-events: none;
        z-index: 1000;
        border: 1px solid rgba(135, 206, 250, 0.3);
    `;
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 2000);
}

function updatePlacedObjects() {
    // Check proximity to crafting benches
    gameState.nearCraftingBench = false;
    
    for (const obj of gameState.placedObjects) {
        if (obj.type === 'craftingBench') {
            const dist = Math.sqrt(
                Math.pow(camera.position.x - obj.x, 2) +
                Math.pow(camera.position.z - obj.z, 2)
            );
            
            if (dist < 3) {
                gameState.nearCraftingBench = true;
            }
        }
    }
    
    // Also check fire proximity for crafting
    const distToFire = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.z * camera.position.z
    );
    
    // Update interaction prompt
    const prompt = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');
    
    if (distToFire < 6) {
        prompt.style.display = 'block';
        promptText.textContent = 'E - Craft | F - Add Wood';
    } else if (gameState.nearCraftingBench) {
        prompt.style.display = 'block';
        promptText.textContent = 'E - Open Crafting Bench';
    } else {
        prompt.style.display = 'none';
    }
}

function placeCraftingBench() {
    // Place a crafting bench in front of the player
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.playerRotation.y);
    
    const placeX = camera.position.x + direction.x * 3;
    const placeZ = camera.position.z + direction.z * 3;
    
    // Create crafting bench mesh
    const benchGroup = new THREE.Group();
    
    // Table top
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    tableTop.position.y = 1;
    tableTop.castShadow = true;
    benchGroup.add(tableTop);
    
    // Legs
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 });
    const legGeometry = new THREE.BoxGeometry(0.15, 1, 0.15);
    
    const positions = [
        [-0.6, 0.5, -0.35],
        [0.6, 0.5, -0.35],
        [-0.6, 0.5, 0.35],
        [0.6, 0.5, 0.35]
    ];
    
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(...pos);
        leg.castShadow = true;
        benchGroup.add(leg);
    });
    
    // Tools on table
    const hammer = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    hammer.position.set(-0.4, 1.2, 0);
    hammer.rotation.z = 0.3;
    benchGroup.add(hammer);
    
    const saw = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.05, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    saw.position.set(0.3, 1.15, 0);
    benchGroup.add(saw);
    
    benchGroup.position.set(placeX, 0, placeZ);
    scene.add(benchGroup);
    
    gameState.placedObjects.push({
        mesh: benchGroup,
        type: 'craftingBench',
        x: placeX,
        z: placeZ
    });
    
    showLootText('🔨 Crafting Bench placed!');
}

function updateCraftingItems() {
    const items = document.querySelectorAll('.craft-item');
    items.forEach(item => {
        const itemType = item.dataset.item;
        const canCraft = canCraftItem(itemType);
        
        if (canCraft) {
            item.classList.remove('disabled');
        } else {
            item.classList.add('disabled');
        }
        
        // Show "OWNED" for gear already crafted
        if (['wolfCoat', 'bearArmor', 'mammothBoots'].includes(itemType) && gameState.gear[itemType]) {
            item.classList.add('owned');
        }
    });
}

function canCraftItem(item) {
    const recipes = {
        craftingBench: { wood: 10 },
        wall: { wood: 5 },
        torch: { wood: 3 },
        wolfCoat: { pelts: 4 },
        bearArmor: { thickPelts: 3 },
        mammothBoots: { tusks: 2 }
    };
    
    const recipe = recipes[item];
    if (!recipe) return false;
    
    // Check if already owned (for gear)
    if (gameState.gear[item]) return false;
    
    for (const [resource, amount] of Object.entries(recipe)) {
        if (gameState[resource] < amount) return false;
    }
    return true;
}

function getCraftingCost(item) {
    const recipes = {
        craftingBench: { wood: 10 },
        wall: { wood: 5 },
        torch: { wood: 3 },
        wolfCoat: { pelts: 4 },
        bearArmor: { thickPelts: 3 },
        mammothBoots: { tusks: 2 }
    };
    return recipes[item] || {};
}

function craft(itemType) {
    if (!canCraftItem(itemType)) return;
    
    const cost = getCraftingCost(itemType);
    
    // Deduct resources
    for (const [resource, amount] of Object.entries(cost)) {
        gameState[resource] -= amount;
    }
    
    switch (itemType) {
        case 'craftingBench':
            placeCraftingBench();
            toggleCrafting(); // Close menu after placing
            break;
        case 'torch':
            // Add torch to first empty hotbar slot
            addToHotbar({
                name: 'Torch',
                icon: '🔦',
                type: 'tool',
                description: 'Lights up the dark',
                light: true
            });
            showLootText('🔦 Torch crafted!');
            break;
        case 'wall':
            placeWall();
            break;
        case 'wolfCoat':
            gameState.gear.wolfCoat = true;
            showLootText('🧥 Wolf Coat equipped!');
            break;
        case 'bearArmor':
            gameState.gear.bearArmor = true;
            showLootText('🛡️ Bear Armor equipped!');
            break;
        case 'mammothBoots':
            gameState.gear.mammothBoots = true;
            showLootText('👢 Mammoth Boots equipped!');
            break;
    }
    
    updateUI();
}

function addToHotbar(item) {
    // Find first empty slot
    for (let i = 0; i < gameState.hotbar.length; i++) {
        if (gameState.hotbar[i] === null) {
            gameState.hotbar[i] = item;
            updateHotbarUI();
            
            // If added to currently selected slot, update held item
            if (i === gameState.selectedSlot) {
                updateHeldItemFromHotbar();
            }
            return true;
        }
    }
    showLootText('❌ Hotbar full!');
    return false;
}

function placeWall() {
    // Place a snow wall in front of the player
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.playerRotation.y);
    
    const placeX = camera.position.x + direction.x * 2;
    const placeZ = camera.position.z + direction.z * 2;
    
    // Create wall mesh
    const wallGeometry = new THREE.BoxGeometry(3, 2, 0.5);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe8f4f8, 
        roughness: 0.9 
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(placeX, 1, placeZ);
    wall.rotation.y = gameState.playerRotation.y;
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    
    gameState.placedObjects.push({
        mesh: wall,
        type: 'wall',
        x: placeX,
        z: placeZ
    });
    
    showLootText('🧱 Wall placed!');
}

// ============================================
// GAME INITIALIZATION
// ============================================
function init() {
    initThreeJS();
    setupControls();
    
    // Setup UI event listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('santa-restart-button').addEventListener('click', restartGame);
    document.getElementById('close-crafting').addEventListener('click', toggleCrafting);
    
    // Crafting items
    document.querySelectorAll('.craft-item').forEach(item => {
        item.addEventListener('click', () => {
            craft(item.dataset.item);
        });
    });
    
    // Hotbar slot clicks
    document.querySelectorAll('.hotbar-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            const slotIndex = parseInt(slot.dataset.slot);
            selectHotbarSlot(slotIndex);
        });
    });
    
    // Hide loading, show start screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    }, 1500);
    
    // Add CSS animation for floating text
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            0% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
        }
        @keyframes whisperFade {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
        }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
            20% { opacity: 1; transform: translateX(-50%) translateY(0); }
            80% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        @keyframes damageFloat {
            0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(1.3); }
        }
        @keyframes blockPop {
            0% { opacity: 1; transform: translateX(-50%) scale(0.5); }
            50% { opacity: 1; transform: translateX(-50%) scale(1.2); }
            100% { opacity: 0; transform: translateX(-50%) scale(1); }
        }
        @keyframes healFloat {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-30px); }
        }
    `;
    document.head.appendChild(style);
    
    // Initially hide forest UI elements
    const lobbyUI = document.getElementById('lobby-ui');
    const forestUI = document.getElementById('forest-ui');
    if (lobbyUI) lobbyUI.style.display = 'block';
    if (forestUI) forestUI.style.display = 'none';
    
    // Start render loop
    animate();
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    
    // Show lobby UI instead of forest UI initially
    document.getElementById('lobby-ui').style.display = 'block';
    document.getElementById('forest-ui').style.display = 'none';
    
    gameState.isPlaying = true;
    gameState.inLobby = true;
    gameState.selectedClass = null;
    gameState.time = 0;
    gameState.currentNight = 1;
    gameState.wood = 0;
    gameState.pelts = 0;
    gameState.thickPelts = 0;
    gameState.tusks = 0;
    gameState.playerHealth = 100;
    
    // Reset to lobby
    createLobby();
    
    // Request pointer lock
    document.body.requestPointerLock();
}

function restartGame() {
    // Hide death screens
    document.getElementById('death-screen').style.display = 'none';
    document.getElementById('santa-death-screen').style.display = 'none';
    
    // Show lobby UI
    document.getElementById('lobby-ui').style.display = 'block';
    document.getElementById('forest-ui').style.display = 'none';
    
    // Reset game state
    gameState.isPlaying = true;
    gameState.inLobby = true;
    gameState.selectedClass = null;
    gameState.time = 0;
    gameState.currentNight = 1;
    gameState.wood = 0;
    gameState.pelts = 0;
    gameState.thickPelts = 0;
    gameState.tusks = 0;
    gameState.playerHealth = 100;
    gameState.santaActive = false;
    gameState.isNight = false;
    gameState.windWhisperShown = false;
    gameState.raidActive = false;
    gameState.gear = { wolfCoat: false, bearArmor: false, mammothBoots: false };
    gameState.moveSpeed = 5;
    gameState.inventory = { weapon: null, tool: null, bag: null };
    gameState.hotbar = [null, null, null, null, null, null, null, null, null];
    gameState.selectedSlot = 0;
    
    // Clear snow guards
    gameState.snowGuards.forEach(guard => {
        scene.remove(guard.mesh);
    });
    gameState.snowGuards = [];
    
    // Clear creatures
    gameState.creatures.forEach(creature => {
        scene.remove(creature.mesh);
    });
    gameState.creatures = [];
    
    // Clear trees
    gameState.trees.forEach(tree => {
        scene.remove(tree.mesh);
    });
    gameState.trees = [];
    
    // Clear dropped items
    gameState.droppedItems.forEach(item => {
        scene.remove(item.mesh);
    });
    gameState.droppedItems = [];
    
    // Clear placed objects
    gameState.placedObjects.forEach(obj => {
        scene.remove(obj.mesh);
    });
    gameState.placedObjects = [];
    gameState.nearCraftingBench = false;
    
    // Increase Santa smartness for next run
    gameState.santaSmartness += 0.2;
    gameState.santaSpeed = 2 + gameState.santaSmartness;
    
    // Clear the first-person hand view
    if (fpsHand) {
        fpsScene.remove(fpsHand);
        fpsHand = null;
        currentHeldItem = null;
    }
    
    // Go back to lobby
    createLobby();
    
    // Update UI
    document.getElementById('current-night').textContent = 1;
    updateUI();
    
    // Request pointer lock
    document.body.requestPointerLock();
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    update(deltaTime);
    
    // Update FPS hand animation
    updateFPSHand(deltaTime);
    
    // Render main scene
    renderer.render(scene, camera);
    
    // Render FPS hands on top (only in forest, not lobby)
    if (fpsScene && fpsCamera && fpsHand && !gameState.inLobby && gameState.isPlaying) {
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(fpsScene, fpsCamera);
        renderer.autoClear = true;
    }
}

// Start the game
init();
