// 3D Island World, Environment, Lighting, and Interactive Objects in Three.js
class IslandWorld3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.interactiveObjects = []; // List of 3D hotspots player can walk near and interact
    this.timeOfDay = 'day'; // 'day', 'dusk', 'night'
    this.weather = 'sunny'; // 'sunny', 'rain', 'storm'

    this.initRenderer();
    this.initSceneAndCamera();
    this.initLighting();
    this.buildTerrain();
    this.buildOcean();
    this.buildCampfireAndShelter();
    this.populateFoliageAndRocks();
    this.buildLandmarks();
    this.initParticleSystems();

    // Instantiate Player 3D
    this.player = new Player3D(this.scene, this.camera);

    // Responsive window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Main animation loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);
  }

  initSceneAndCamera() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8);
    this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 300);
    this.camera.position.set(0, 10, 18);
  }

  initLighting() {
    // Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    // Directional Sun / Moon Light
    this.sunLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    this.sunLight.position.set(30, 45, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Campfire Point Light
    this.campfireLight = new THREE.PointLight(0xf97316, 2.5, 12, 1.8);
    this.campfireLight.position.set(0, 1, 0);
    this.scene.add(this.campfireLight);
  }

  buildTerrain() {
    // Main tropical island mesh (stylized low poly cylinder/dome)
    const islandGeo = new THREE.CylinderGeometry(32, 38, 5, 32);
    
    // Add height variations to island vertices
    const pos = islandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (y > 0) {
        const dist = Math.hypot(x, z);
        // Height elevation towards center & mountain
        let hill = Math.max(0, (30 - dist) * 0.15);
        if (x < -10 && z < -10) {
          hill += 4.5; // Mountain area elevation
        }
        pos.setY(i, y + hill + Math.sin(x * 0.5) * 0.3);
      }
    }
    islandGeo.computeVertexNormals();

    // Grass Top Material
    const islandMat = new THREE.MeshLambertMaterial({ 
      color: 0x15803d, 
      flatShading: true 
    });
    this.islandMesh = new THREE.Mesh(islandGeo, islandMat);
    this.islandMesh.position.y = -2.5;
    this.islandMesh.receiveShadow = true;
    this.scene.add(this.islandMesh);

    // Sandy Beach Ring
    const beachGeo = new THREE.RingGeometry(28, 38, 32);
    const beachMat = new THREE.MeshLambertMaterial({ color: 0xfde047, side: THREE.DoubleSide });
    const beachRing = new THREE.Mesh(beachGeo, beachMat);
    beachRing.rotation.x = -Math.PI / 2;
    beachRing.position.y = 0.05;
    beachRing.receiveShadow = true;
    this.scene.add(beachRing);
  }

  buildOcean() {
    const oceanGeo = new THREE.PlaneGeometry(350, 350, 48, 48);
    const oceanMat = new THREE.MeshLambertMaterial({ 
      color: 0x0284c7, 
      transparent: true, 
      opacity: 0.88,
      flatShading: true
    });
    this.ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -0.2;
    this.scene.add(this.ocean);
  }

  buildCampfireAndShelter() {
    this.campGroup = new THREE.Group();
    this.campGroup.position.set(0, 0, 0);

    // Campfire Stones & Logs
    const fireStoneGeo = new THREE.DodecahedronGeometry(0.35);
    const fireStoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    for (let i = 0; i < 6; i++) {
      const stone = new THREE.Mesh(fireStoneGeo, fireStoneMat);
      const angle = (i / 6) * Math.PI * 2;
      stone.position.set(Math.cos(angle) * 0.7, 0.1, Math.sin(angle) * 0.7);
      this.campGroup.add(stone);
    }

    const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
    const logMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const log1 = new THREE.Mesh(logGeo, logMat);
    log1.rotation.z = Math.PI / 3;
    log1.position.y = 0.15;
    const log2 = new THREE.Mesh(logGeo, logMat);
    log2.rotation.z = -Math.PI / 3;
    log2.position.y = 0.15;
    this.campGroup.add(log1);
    this.campGroup.add(log2);

    // Animated Fire Flame Cone
    const flameGeo = new THREE.ConeGeometry(0.4, 0.9, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.position.y = 0.5;
    this.campGroup.add(this.flameMesh);

    // Shelter Model Structure (Upgrades in real-time)
    this.shelterGroup = new THREE.Group();
    this.shelterGroup.position.set(0, 0, -3.5);
    this.campGroup.add(this.shelterGroup);
    this.updateShelterModel(0);

    this.scene.add(this.campGroup);

    // Register Camp as interactive hotspot
    this.registerInteractiveObject({
      id: 'camp',
      title: 'Nơi Trú Ẩn & Lửa Trại',
      desc: 'Nhấn [E] để Nghỉ Ngơi qua ngày hoặc Nâng cấp',
      position: new THREE.Vector3(0, 0, -1),
      radius: 4.5,
      action: () => window.game?.openShelterMenu()
    });
  }

  updateShelterModel(level) {
    // Clear old shelter children
    while (this.shelterGroup.children.length > 0) {
      this.shelterGroup.remove(this.shelterGroup.children[0]);
    }

    if (level === 0) {
      // Small leaf bed
      const bedGeo = new THREE.BoxGeometry(1.6, 0.15, 2.2);
      const bedMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.position.y = 0.1;
      this.shelterGroup.add(bed);
    } 
    else if (level === 1) {
      // Leaf A-frame Tent
      const tentGeo = new THREE.ConeGeometry(2.2, 2.4, 4);
      const tentMat = new THREE.MeshLambertMaterial({ color: 0x166534 }); // Palm leaf green
      const tent = new THREE.Mesh(tentGeo, tentMat);
      tent.rotation.y = Math.PI / 4;
      tent.position.y = 1.2;
      tent.castShadow = true;
      this.shelterGroup.add(tent);
    } 
    else if (level === 2) {
      // Wooden Hut
      const hutGeo = new THREE.BoxGeometry(3, 2.2, 2.8);
      const hutMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
      const hut = new THREE.Mesh(hutGeo, hutMat);
      hut.position.y = 1.1;
      hut.castShadow = true;
      this.shelterGroup.add(hut);

      const roofGeo = new THREE.ConeGeometry(2.6, 1.4, 4);
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 2.8;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.shelterGroup.add(roof);
    } 
    else {
      // Level 3: Stone Fortress Cabin
      const baseGeo = new THREE.BoxGeometry(4, 2.8, 3.5);
      const baseMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const fortress = new THREE.Mesh(baseGeo, baseMat);
      fortress.position.y = 1.4;
      fortress.castShadow = true;
      this.shelterGroup.add(fortress);

      const roofGeo = new THREE.ConeGeometry(3.2, 1.8, 4);
      const roofMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 3.6;
      roof.rotation.y = Math.PI / 4;
      this.shelterGroup.add(roof);
    }
  }

  populateFoliageAndRocks() {
    this.treesList = [];
    this.crabsList = [];
    this.boarsList = [];
    this.seagullsList = [];

    // 1. Procedural Palm & Pine Trees using Builder3D
    const treePositions = [
      { x: 8, z: 6, type: 'palm' }, { x: 12, z: 2, type: 'palm' }, { x: 14, z: 12, type: 'palm' }, { x: 6, z: 16, type: 'palm' },
      { x: -8, z: 8, type: 'pine' }, { x: -14, z: 4, type: 'palm' }, { x: -12, z: 14, type: 'pine' }, { x: -4, z: 18, type: 'palm' },
      { x: 10, z: -10, type: 'palm' }, { x: 16, z: -6, type: 'pine' }, { x: 8, z: -18, type: 'palm' }, { x: -8, z: -14, type: 'pine' },
      { x: -15, z: -8, type: 'palm' }, { x: 4, z: -22, type: 'palm' }, { x: -12, z: 22, type: 'palm' }, { x: 22, z: 4, type: 'palm' }
    ];

    treePositions.forEach((pos, idx) => {
      const tree = pos.type === 'pine' ? Builder3D.createPineTree(pos.x, pos.z, 1.1) : Builder3D.createPalmTree(pos.x, pos.z, 1.0);
      this.scene.add(tree);
      this.treesList.push(tree);

      this.registerInteractiveObject({
        id: `tree_${idx}`,
        title: pos.type === 'pine' ? 'Cây Rừng Nhiệt Đới' : 'Cây Dừa Đảo Hoang',
        desc: 'Nhấn [E] để Chặt Cây đốn củi 🪵',
        position: new THREE.Vector3(pos.x, 0, pos.z),
        radius: 3.8,
        action: () => window.game?.actionChopWood()
      });
    });

    // 2. Animated Crabs crawling on beach
    const crabCoords = [{ x: 22, z: 14 }, { x: -20, z: -18 }, { x: 15, z: -22 }, { x: -22, z: 12 }];
    crabCoords.forEach(pos => {
      const crab = Builder3D.createCrab(pos.x, pos.z);
      this.scene.add(crab);
      this.crabsList.push(crab);
    });

    // 3. Wild Boars roaming in Jungle
    const boarCoords = [{ x: -10, z: 12 }, { x: 12, z: 14 }];
    boarCoords.forEach(pos => {
      const boar = Builder3D.createWildBoar(pos.x, pos.z);
      this.scene.add(boar);
      this.boarsList.push(boar);
    });

    // 4. Seagulls flying above the island
    const birdCoords = [{ x: 15, y: 14, z: 15 }, { x: -20, y: 16, z: -10 }, { x: 0, y: 18, z: 25 }];
    birdCoords.forEach(pos => {
      const bird = Builder3D.createSeagull(pos.x, pos.y, pos.z);
      this.scene.add(bird);
      this.seagullsList.push(bird);
    });

    // 5. Washed-up Chest on the shore
    const chest = Builder3D.createTreasureChest(25, -8, -0.4);
    this.scene.add(chest);
    this.registerInteractiveObject({
      id: 'beach_chest',
      title: 'Rương Gỗ Cổ Dạt Bờ',
      desc: 'Nhấn [E] để Mở Rương nhận tài nguyên 📦',
      position: new THREE.Vector3(25, 0, -8),
      radius: 4.0,
      action: () => window.game?.triggerEncounterById('mysterious_chest')
    });

    // Fishing Spots around the island shore
    const fishingSpots = [
      { x: 26, z: 0, name: 'Bờ Đông Sóng Lặng' },
      { x: -26, z: 0, name: 'Bờ Tây Rạn San Hô' },
      { x: 0, z: 26, name: 'Bờ Nam Biển Nắng' },
      { x: 0, z: -26, name: 'Bờ Bắc Mũi Đá' }
    ];

    fishingSpots.forEach((spot, idx) => {
      const dockGeo = new THREE.BoxGeometry(2.2, 0.4, 4.5);
      const dockMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
      const dock = new THREE.Mesh(dockGeo, dockMat);
      dock.position.set(spot.x * 0.9, 0.2, spot.z * 0.9);
      dock.lookAt(0, 0.2, 0);
      dock.receiveShadow = true;
      this.scene.add(dock);

      this.registerInteractiveObject({
        id: `fish_${idx}`,
        title: `Bến Câu Cá: ${spot.name}`,
        desc: 'Nhấn [E] để Câu Cá & Bắt Sò 🎣',
        position: new THREE.Vector3(spot.x, 0, spot.z),
        radius: 5.5,
        action: () => window.game?.actionGoFishing()
      });
    });

    // Scattered Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.8);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 15;
      rock.position.set(Math.cos(angle) * r, 0.4, Math.sin(angle) * r);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      this.scene.add(rock);
    }
  }

  createPalmTree(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Curved Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 5, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    trunk.castShadow = true;
    group.add(trunk);

    // Palm Leaves Fronds
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const leafGeo = new THREE.ConeGeometry(1.2, 3.2, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const angle = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 1.2, 5.1, Math.sin(angle) * 1.2);
      leaf.rotation.x = Math.PI / 2.6;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Coconuts
    const nutGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const nutMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const nut1 = new THREE.Mesh(nutGeo, nutMat);
    nut1.position.set(0.3, 4.8, 0.2);
    group.add(nut1);

    return group;
  }

  buildLandmarks() {
    // 1. 🚢 Shipwreck in West Bay
    const shipGroup = new THREE.Group();
    shipGroup.position.set(-28, 0.5, -15);
    shipGroup.rotation.y = Math.PI / 6;
    shipGroup.rotation.z = 0.2; // Tilted in water

    const hullGeo = new THREE.BoxGeometry(4, 2.5, 9);
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.castShadow = true;
    shipGroup.add(hull);

    const mastGeo = new THREE.CylinderGeometry(0.12, 0.15, 6);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 3.5;
    shipGroup.add(mast);

    this.scene.add(shipGroup);

    this.registerInteractiveObject({
      id: 'landmark_shipwreck',
      title: 'Xác Tàu Cổ Đắm',
      desc: 'Nhấn [E] để Khám Phá tìm kho báu & kim loại 🚢',
      position: new THREE.Vector3(-26, 0, -14),
      radius: 6.0,
      action: () => window.game?.actionExploreLocation('shipwreck')
    });

    // 2. 🦇 Dark Cave Entrance
    const caveGroup = new THREE.Group();
    caveGroup.position.set(18, 0, -18);
    const caveRockGeo = new THREE.DodecahedronGeometry(3.5);
    const caveRockMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const caveRock = new THREE.Mesh(caveRockGeo, caveRockMat);
    caveRock.position.y = 2;
    caveGroup.add(caveRock);

    const entranceGeo = new THREE.BoxGeometry(2, 2.5, 2);
    const entranceMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const entrance = new THREE.Mesh(entranceGeo, entranceMat);
    entrance.position.set(0, 1.25, 1.8);
    caveGroup.add(entrance);

    this.scene.add(caveGroup);

    this.registerInteractiveObject({
      id: 'landmark_cave',
      title: 'Hang Động Hắc Ám',
      desc: 'Nhấn [E] để Khám Phá khai thác đá & nước ngầm 🦇',
      position: new THREE.Vector3(18, 0, -16),
      radius: 5.5,
      action: () => window.game?.actionExploreLocation('cave')
    });

    // 3. 🌋 Mountain Volcano & SOS Lighthouse
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(-18, 0, 18);
    const volGeo = new THREE.ConeGeometry(7, 9, 8);
    const volMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const vol = new THREE.Mesh(volGeo, volMat);
    vol.position.y = 4.5;
    volcanoGroup.add(vol);

    this.scene.add(volcanoGroup);

    this.registerInteractiveObject({
      id: 'landmark_volcano',
      title: 'Đỉnh Núi Lửa Hoang Đảo',
      desc: 'Nhấn [E] để Leo lên Đỉnh Núi quan sát & phát tín hiệu 🌋',
      position: new THREE.Vector3(-16, 0, 16),
      radius: 6.0,
      action: () => window.game?.actionExploreLocation('volcano')
    });
  }

  initParticleSystems() {
    // Rain Particles
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 100;
      rainPos[i + 1] = Math.random() * 50;
      rainPos[i + 2] = (Math.random() - 0.5) * 100;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6
    });
    this.rainSystem = new THREE.Points(rainGeo, rainMat);
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);
  }

  registerInteractiveObject(obj) {
    this.interactiveObjects.push(obj);
  }

  updateDayNightCycle(timeOfDay, weatherType) {
    this.timeOfDay = timeOfDay;
    this.weather = weatherType.id;

    if (this.timeOfDay === 'day') {
      this.scene.background.set(0x38bdf8); // Sky blue
      this.scene.fog.color.set(0x38bdf8);
      this.sunLight.color.set(0xffedd5);
      this.sunLight.intensity = 1.25;
      this.ambientLight.intensity = 0.55;
    } else if (this.timeOfDay === 'dusk') {
      this.scene.background.set(0xc2410c); // Sunset orange
      this.scene.fog.color.set(0x7c2d12);
      this.sunLight.color.set(0xfb923c);
      this.sunLight.intensity = 0.8;
      this.ambientLight.intensity = 0.4;
    } else {
      // Night
      this.scene.background.set(0x090d16); // Deep night
      this.scene.fog.color.set(0x090d16);
      this.sunLight.color.set(0x818cf8);
      this.sunLight.intensity = 0.25;
      this.ambientLight.intensity = 0.2;
    }

    // Weather adjustments
    if (this.weather === 'storm' || this.weather === 'rain') {
      this.rainSystem.visible = true;
      this.ambientLight.intensity *= 0.6;
    } else {
      this.rainSystem.visible = false;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update 3D Player movement & animations
    if (this.player) {
      this.player.update(delta);
      this.checkProximityToInteractiveObjects();
    }

    // 2. Animate Campfire flame flicker & light
    if (this.flameMesh) {
      const flicker = Math.sin(elapsedTime * 12) * 0.15 + 1.0;
      this.flameMesh.scale.set(flicker, flicker * 1.1, flicker);
      this.campfireLight.intensity = 2.0 + Math.sin(elapsedTime * 16) * 0.8;
    }

    // 3. Animate Ocean Waves
    if (this.ocean) {
      const pos = this.ocean.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getY(i);
        const z = Math.sin(u * 0.1 + elapsedTime * 2) * 0.2 + Math.cos(v * 0.1 + elapsedTime * 2) * 0.2;
        pos.setZ(i, z);
      }
      this.ocean.geometry.computeVertexNormals();
      this.ocean.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Animate Rain particles
    if (this.rainSystem && this.rainSystem.visible) {
      const pos = this.rainSystem.geometry.attributes.position;
      for (let i = 1; i < pos.count * 3; i += 3) {
        pos.array[i] -= 0.8;
        if (pos.array[i] < 0) pos.array[i] = 45;
      }
      pos.needsUpdate = true;
    }

    // 5. Animate Crabs crawling sideways
    if (this.crabsList) {
      this.crabsList.forEach(crab => {
        const u = crab.userData;
        const crawl = Math.sin(elapsedTime * 2 + u.timeOffset) * 1.5;
        crab.position.x = u.baseX + crawl;
        crab.rotation.y = Math.sin(elapsedTime + u.timeOffset) * 0.3;
      });
    }

    // 6. Animate Wild Boars pacing
    if (this.boarsList) {
      this.boarsList.forEach(boar => {
        const u = boar.userData;
        const walk = Math.sin(elapsedTime * 1.2) * u.patrolRadius;
        boar.position.z = u.baseZ + walk;
        boar.rotation.y = Math.cos(elapsedTime * 1.2) > 0 ? 0 : Math.PI;
      });
    }

    // 7. Animate Seagulls flying in circles & flapping wings
    if (this.seagullsList) {
      this.seagullsList.forEach(bird => {
        const u = bird.userData;
        u.angle += delta * 0.4;
        bird.position.x = u.centerX + Math.cos(u.angle) * u.radius;
        bird.position.z = u.centerZ + Math.sin(u.angle) * u.radius;
        bird.rotation.y = -u.angle - Math.PI / 2;
        
        // Wing flapping
        const flap = Math.sin(elapsedTime * u.wingSpeed) * 0.5;
        u.leftWing.rotation.z = flap;
        u.rightWing.rotation.z = -flap;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  checkProximityToInteractiveObjects() {
    const playerPos = this.player.getPosition();
    const promptEl = document.getElementById('interactionPrompt');
    const promptTitle = document.getElementById('promptTitle');
    const promptDesc = document.getElementById('promptDesc');

    let closestObj = null;
    let minDistance = Infinity;

    for (let obj of this.interactiveObjects) {
      const dist = Math.hypot(playerPos.x - obj.position.x, playerPos.z - obj.position.z);
      if (dist < obj.radius && dist < minDistance) {
        minDistance = dist;
        closestObj = obj;
      }
    }

    this.activeInteraction = closestObj;

    if (closestObj) {
      promptTitle.textContent = closestObj.title;
      promptDesc.textContent = closestObj.desc;
      promptEl.classList.remove('hidden');
    } else {
      promptEl.classList.add('hidden');
    }
  }

  triggerActiveInteraction() {
    if (this.activeInteraction && this.activeInteraction.action) {
      this.player.playActionAnimation('action');
      this.activeInteraction.action();
    }
  }
}
