// Shopkeeper Simulator 3D - Three.js 3D Store Engine
// Supports both Isometric Management View & First-Person FPS Mode (Supermarket Simulator style)

class Shop3D {
  constructor(game) {
    this.game = game;
    this.container = document.querySelector('.canvas-wrapper');
    this.viewMode = 'iso'; // 'iso' (Management 3D) or 'fps' (First-Person 3D)
    
    // Store 3D Dimensions (meters)
    this.storeWidth = 24;  // X: -12 to +12
    this.storeDepth = 18;  // Z: -9 to +9
    this.storeHeight = 5.2; // Y: 0 to 5.2

    // Three.js Core Objects
    this.scene = null;
    this.renderer = null;
    this.isoCamera = null;
    this.fpsCamera = null;
    this.activeCamera = null;
    this.controls = null; // OrbitControls for iso mode
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 3D Entities Mappings & Meshes
    this.shelfMeshes = [];
    this.customerMeshes = new Map(); // customerObj -> group
    this.staffMeshes = new Map();    // staffKey -> group
    this.dirtMeshes = new Map();     // dirtObj -> mesh
    this.floatingLabels = [];        // 3D billboards
    this.interactiveObjects = [];    // For raycasting

    // Player State for First-Person FPS Mode
    this.player = {
      pos: new THREE.Vector3(0, 1.65, 5.5), // eye height 1.65m inside entrance looking at shelves
      yaw: 0,   // horizontal look (radians)
      pitch: -0.05, // vertical look (radians)
      speed: 6.5,
      radius: 0.5,
      keys: { w: false, a: false, s: false, d: false, shift: false },
      isLocked: false,
      isMouseDown: false,
      lastMouseX: 0,
      lastMouseY: 0,
      targetedObject: null
    };

    // Textures Cache
    this.textures = {};

    this.init();
  }

  init() {
    this.generateProceduralTextures();
    this.setupScene();
    this.setupCameras();
    this.setupLights();
    this.buildStoreArchitecture();
    this.setupControlsAndInput();
    this.setupHUDOverlays();
    
    // Initial sync
    this.rebuildShelves();
  }

  // PROCEDURAL TEXTURE GENERATION (Self-contained, ultra fast & crisp)
  generateProceduralTextures() {
    // 1. Polished Supermarket Tiles
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 512;
    tileCanvas.height = 512;
    const tctx = tileCanvas.getContext('2d');
    
    tctx.fillStyle = '#0f172a';
    tctx.fillRect(0, 0, 512, 512);

    const sz = 128;
    for (let x = 0; x < 512; x += sz) {
      for (let y = 0; y < 512; y += sz) {
        const isAlt = (x / sz + y / sz) % 2 === 0;
        tctx.fillStyle = isAlt ? '#1e293b' : '#152132';
        tctx.fillRect(x + 2, y + 2, sz - 4, sz - 4);
        
        tctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        tctx.lineWidth = 2;
        tctx.strokeRect(x + 4, y + 4, sz - 8, sz - 8);
      }
    }
    const tileTex = new THREE.CanvasTexture(tileCanvas);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(6, 4.5);
    tileTex.needsUpdate = true;
    this.textures.floor = tileTex;

    // 2. Store Signboard Banner Texture
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sctx = signCanvas.getContext('2d');
    
    const grad = sctx.createLinearGradient(0, 0, 1024, 256);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#075985');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 1024, 256);

    sctx.strokeStyle = '#fef08a';
    sctx.lineWidth = 8;
    sctx.strokeRect(10, 10, 1004, 236);

    sctx.font = '900 68px "Outfit", sans-serif';
    sctx.fillStyle = '#ffffff';
    sctx.textAlign = 'center';
    sctx.shadowColor = 'rgba(0,0,0,0.6)';
    sctx.shadowBlur = 12;
    sctx.fillText('🏪 TIỆM BÁCH HÓA THỊNH VƯỢNG', 512, 110);

    sctx.shadowBlur = 0;
    sctx.font = 'bold 36px "Nunito", sans-serif';
    sctx.fillStyle = '#fef08a';
    sctx.fillText('✨ HÀNG TƯƠI MỖI NGÀY • PHỤC VỤ TẬN TÂM ✨', 512, 190);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.needsUpdate = true;
    this.textures.signboard = signTex;

    // 3. Promotional Sale Poster
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 512;
    posterCanvas.height = 768;
    const pctx = posterCanvas.getContext('2d');
    
    const pgrad = pctx.createLinearGradient(0, 0, 512, 768);
    pgrad.addColorStop(0, '#ef4444');
    pgrad.addColorStop(1, '#b91c1c');
    pctx.fillStyle = pgrad;
    pctx.fillRect(0, 0, 512, 768);

    pctx.strokeStyle = '#fbbf24';
    pctx.lineWidth = 12;
    pctx.strokeRect(15, 15, 482, 738);

    pctx.fillStyle = '#ffffff';
    pctx.font = '900 64px "Outfit", sans-serif';
    pctx.textAlign = 'center';
    pctx.fillText('SIÊU GIẢM GIÁ', 256, 160);

    pctx.font = '900 130px "Outfit", sans-serif';
    pctx.fillStyle = '#fef08a';
    pctx.fillText('-30%', 256, 320);

    pctx.font = 'bold 40px "Nunito", sans-serif';
    pctx.fillStyle = '#ffffff';
    pctx.fillText('ĐỒ UỐNG & BÁNH KẸO', 256, 440);
    pctx.fillText('MUA 2 TẶNG 1', 256, 520);
    pctx.font = '32px "Nunito", sans-serif';
    pctx.fillText('Áp dụng hôm nay!', 256, 640);

    const posterTex = new THREE.CanvasTexture(posterCanvas);
    posterTex.needsUpdate = true;
    this.textures.poster = posterTex;

    // 4. Warehouse Door Texture
    const whCanvas = document.createElement('canvas');
    whCanvas.width = 512;
    whCanvas.height = 512;
    const wctx = whCanvas.getContext('2d');
    wctx.fillStyle = '#334155';
    wctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      wctx.fillStyle = (y % 64 === 0) ? '#475569' : '#1e293b';
      wctx.fillRect(0, y, 512, 30);
    }
    for (let x = 0; x < 512; x += 40) {
      wctx.fillStyle = (x % 80 === 0) ? '#f59e0b' : '#0f172a';
      wctx.beginPath();
      wctx.moveTo(x, 220);
      wctx.lineTo(x + 30, 220);
      wctx.lineTo(x - 10, 270);
      wctx.lineTo(x - 40, 270);
      wctx.fill();
    }
    wctx.font = 'bold 36px "Outfit", sans-serif';
    wctx.fillStyle = '#ffffff';
    wctx.textAlign = 'center';
    wctx.fillText('📦 KHO HÀNG (STAFF ONLY)', 256, 180);

    const whTex = new THREE.CanvasTexture(whCanvas);
    whTex.needsUpdate = true;
    this.textures.warehouseDoor = whTex;

    // 5. Welcome Door Mat
    const matCanvas = document.createElement('canvas');
    matCanvas.width = 512;
    matCanvas.height = 256;
    const mctx = matCanvas.getContext('2d');
    mctx.fillStyle = '#b45309';
    mctx.fillRect(0, 0, 512, 256);
    mctx.strokeStyle = '#fef3c7';
    mctx.lineWidth = 8;
    mctx.strokeRect(12, 12, 488, 232);
    mctx.font = '900 64px "Outfit", sans-serif';
    mctx.fillStyle = '#fef3c7';
    mctx.textAlign = 'center';
    mctx.fillText('WELCOME', 256, 145);

    const matTex = new THREE.CanvasTexture(matCanvas);
    matTex.needsUpdate = true;
    this.textures.welcomeMat = matTex;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1120');
    this.scene.fog = new THREE.FogExp2('#0b1120', 0.012);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const oldCanvas = document.getElementById('shop-canvas');
    if (oldCanvas) {
      oldCanvas.style.display = 'none'; // hide 2D canvas
    }
    this.renderer.domElement.id = 'three-viewport';
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupCameras() {
    const aspect = this.container.clientWidth / this.container.clientHeight;

    // 1. Isometric / Management Camera (Top-down tilted)
    this.isoCamera = new THREE.PerspectiveCamera(45, aspect, 0.5, 200);
    this.isoCamera.position.set(0, 18, 19);
    this.isoCamera.lookAt(0, 1.2, 0);

    // OrbitControls for Iso Mode
    if (window.THREE && THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.isoCamera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxPolarAngle = Math.PI / 2.1;
      this.controls.minDistance = 6;
      this.controls.maxDistance = 35;
      this.controls.target.set(0, 1.2, 0);
    }

    // 2. First-Person FPS Camera
    this.fpsCamera = new THREE.PerspectiveCamera(72, aspect, 0.1, 150);
    this.fpsCamera.position.copy(this.player.pos);
    this.fpsCamera.lookAt(0, 1.65, -5);

    // Default to Isometric
    this.activeCamera = this.isoCamera;
  }

  setupLights() {
    // Soft Ambient Light
    const ambient = new THREE.AmbientLight(0xfff6ea, 0.7);
    this.scene.add(ambient);

    // Directional Sunlight
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.75);
    sunLight.position.set(10, 25, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    const d = 16;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);

    // Ceiling Fluorescent Panel Lights
    const panelCols = [-6, 0, 6];
    const panelRows = [-4, 2];

    panelCols.forEach(px => {
      panelRows.forEach(pz => {
        const light = new THREE.PointLight(0xfffaed, 0.7, 14, 1.4);
        light.position.set(px, this.storeHeight - 0.2, pz);
        this.scene.add(light);
      });
    });

    // Cashier Register Accent Spotlight
    const cashierSpot = new THREE.SpotLight(0x38bdf8, 1.2, 8, Math.PI / 4, 0.4);
    cashierSpot.position.set(-8, this.storeHeight - 0.5, 2.5);
    cashierSpot.target.position.set(-8, 1, 2.5);
    this.scene.add(cashierSpot);
    this.scene.add(cashierSpot.target);
  }

  // BUILD 3D SUPERMARKET ARCHITECTURE
  buildStoreArchitecture() {
    const W = this.storeWidth;
    const D = this.storeDepth;
    const H = this.storeHeight;

    // 1. FLOOR
    const floorGeo = new THREE.PlaneGeometry(W, D);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.floor,
      roughness: 0.35,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. CEILING
    const ceilGeo = new THREE.PlaneGeometry(W, D);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    this.scene.add(ceil);

    // 3. WALLS
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    // Back Wall (Z = -D/2)
    const backWallGeo = new THREE.BoxGeometry(W, H, 0.4);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, H / 2, -D / 2);
    this.scene.add(backWall);

    // Glowing Store Banner on Back Wall
    const signGeo = new THREE.PlaneGeometry(12, 3);
    const signMat = new THREE.MeshBasicMaterial({ map: this.textures.signboard });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, H - 2.0, -D / 2 + 0.22);
    this.scene.add(signMesh);

    // Promotional Posters on Back Wall
    const posterGeo = new THREE.PlaneGeometry(1.6, 2.4);
    const posterMat = new THREE.MeshBasicMaterial({ map: this.textures.poster });
    const poster1 = new THREE.Mesh(posterGeo, posterMat);
    poster1.position.set(-8.5, 2.4, -D / 2 + 0.22);
    this.scene.add(poster1);

    // Warehouse Door on Back Wall
    const whGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const whMat = new THREE.MeshBasicMaterial({ map: this.textures.warehouseDoor });
    const whMesh = new THREE.Mesh(whGeo, whMat);
    whMesh.position.set(9, 1.6, -D / 2 + 0.22);
    this.scene.add(whMesh);

    // Industrial Storage Crates
    this.createStorageCrates(9, 0, -D / 2 + 1.2);

    // Left Wall (X = -W/2)
    const leftWallGeo = new THREE.BoxGeometry(0.4, H, D);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-W / 2, H / 2, 0);
    this.scene.add(leftWall);

    // Right Wall (X = W/2)
    const rightWallGeo = new THREE.BoxGeometry(0.4, H, D);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(W / 2, H / 2, 0);
    this.scene.add(rightWall);

    // Beverage Coolers along Left Wall
    this.createWallBeverageFridges(-W / 2 + 0.8, -2, 6);

    // Front Wall / Glass Storefront (Z = D/2)
    this.buildGlassStorefront(W, H, D);

    // 4. CHECKOUT COUNTER (Quầy thu ngân)
    this.buildCheckoutCounter(-8, 0, 2.5);

    // 5. AIR CONDITIONER (on left side wall)
    this.buildAirConditioner(-W / 2 + 0.35, H - 0.9, -4);

    // 6. STREET & EXTERIOR OUTSIDE FRONT GLASS
    this.buildExteriorStreet(W, D);

    // 7. SECURITY FIXTURES (Cổng từ, Chó giữ tiệm, Gương cầu lồi)
    this.updateSecurityFixtures();
  }

  // 3D SECURITY FIXTURES (Cổng từ, Chó giữ tiệm, Gương cầu lồi)
  updateSecurityFixtures() {
    if (!this.securityGroup) {
      this.securityGroup = new THREE.Group();
      this.scene.add(this.securityGroup);
    }
    // Clear old security meshes
    while (this.securityGroup.children.length > 0) {
      this.securityGroup.remove(this.securityGroup.children[0]);
    }
    this.securityGateLEDs = [];
    this.dogGroup = null;
    this.dogTailPivot = null;

    const upgs = this.game.purchasedUpgrades || [];

    // 1. Security Sensor Gates (Cổng từ tại lối vào x = -8, z = 7.8)
    if (upgs.includes('security_gates')) {
      const gatePositions = [-9.3, -6.7]; // Two gates flanking entrance door
      gatePositions.forEach(gx => {
        const gatePillar = new THREE.Group();
        gatePillar.position.set(gx, 0, 7.8);

        // Base plate
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.08, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
        );
        base.position.y = 0.04;
        gatePillar.add(base);

        // Vertical frame bars
        const barGeo = new THREE.BoxGeometry(0.06, 1.7, 0.08);
        const barMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        [-0.32, 0.32].forEach(bz => {
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.position.set(0, 0.9, bz);
          gatePillar.add(bar);
        });

        // Top cap bar
        const topCap = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.1, 0.76),
          new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        topCap.position.set(0, 1.75, 0);
        gatePillar.add(topCap);

        // Acrylic transparent sensory panel in center
        const acrylic = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 1.55, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.1 })
        );
        acrylic.position.set(0, 0.9, 0);
        gatePillar.add(acrylic);

        // Top Status LED (Green normal, red alert)
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.05, 0.25),
          new THREE.MeshBasicMaterial({ color: 0x10b981 })
        );
        led.position.set(0, 1.82, 0);
        gatePillar.add(led);
        this.securityGateLEDs.push(led);

        this.securityGroup.add(gatePillar);
      });
    }

    // 2. Shop Dog "Vàng" (Chó giữ tiệm ngồi cạnh lối vào)
    if (upgs.includes('shop_dog')) {
      const dog = new THREE.Group();
      dog.position.set(-5.8, 0, 6.2);
      dog.rotation.y = -Math.PI / 3.5; // looking toward entrance

      const furMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }); // Golden amber fur
      const darkFurMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
      const noseMat = new THREE.MeshStandardMaterial({ color: 0x18181b });

      // Dog body (Sitting pose)
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.65), furMat);
      body.position.set(0, 0.32, 0);
      body.rotation.x = -0.3; // slanting back sitting
      dog.add(body);

      // Dog Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.36), furMat);
      head.position.set(0, 0.68, 0.24);
      dog.add(head);

      // Dog Snout & Nose
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), furMat);
      snout.position.set(0, 0.6, 0.44);
      dog.add(snout);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), noseMat);
      nose.position.set(0, 0.65, 0.55);
      dog.add(nose);

      // Floppy Ears
      [-0.18, 0.18].forEach(ex => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.12), darkFurMat);
        ear.position.set(ex, 0.7, 0.22);
        ear.rotation.z = ex > 0 ? -0.2 : 0.2;
        dog.add(ear);
      });

      // Eyes
      [-0.09, 0.09].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), noseMat);
        eye.position.set(ex, 0.72, 0.4);
        dog.add(eye);
      });

      // Front Legs
      [-0.14, 0.14].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), furMat);
        leg.position.set(lx, 0.22, 0.26);
        dog.add(leg);
      });

      // Wagging Tail
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0.22, -0.32);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), darkFurMat);
      tail.position.set(0, 0.14, -0.06);
      tail.rotation.x = -0.6;
      tailPivot.add(tail);
      dog.add(tailPivot);
      this.dogTailPivot = tailPivot;

      // Collar with golden bell
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      collar.position.set(0, 0.54, 0.18);
      dog.add(collar);

      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8 })
      );
      bell.position.set(0, 0.48, 0.36);
      dog.add(bell);

      this.dogGroup = dog;
      this.securityGroup.add(dog);
    }

    // 3. Convex Mirror (Gương cầu lồi góc trần nhìn bao quát)
    if (upgs.includes('convex_mirror')) {
      const mirrorGroup = new THREE.Group();
      mirrorGroup.position.set(-11.4, this.storeHeight - 0.7, -8.3);

      // Support bracket rod
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 })
      );
      rod.position.set(0.3, -0.2, 0.3);
      rod.rotation.z = Math.PI / 4;
      mirrorGroup.add(rod);

      // Convex Dome Mirror (Silver Chrome Reflective Sphere Segment)
      const mirrorDomeGeo = new THREE.SphereGeometry(0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2);
      const mirrorDomeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.05
      });
      const dome = new THREE.Mesh(mirrorDomeGeo, mirrorDomeMat);
      dome.rotation.x = Math.PI / 3;
      dome.rotation.y = -Math.PI / 4;
      mirrorGroup.add(dome);

      // Orange Security Rim
      const rimGeo = new THREE.TorusGeometry(0.76, 0.05, 12, 32);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 3;
      rim.rotation.y = -Math.PI / 4;
      mirrorGroup.add(rim);

      this.securityGroup.add(mirrorGroup);
    }
  }

  // Industrial crates near warehouse door
  createStorageCrates(x, y, z) {
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const crateGeo = new THREE.BoxGeometry(1.1, 0.9, 1.1);

    const positions = [
      [x - 0.6, y + 0.45, z],
      [x + 0.6, y + 0.45, z],
      [x, y + 1.35, z - 0.1]
    ];
    positions.forEach(pos => {
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(pos[0], pos[1], pos[2]);
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.scene.add(crate);
    });
  }

  // Wall Beverage Display Fridges with glowing glass doors
  createWallBeverageFridges(x, zStart, length) {
    const fridgeGroup = new THREE.Group();
    const frameGeo = new THREE.BoxGeometry(1.2, 3.2, length);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, 1.6, zStart);
    fridgeGroup.add(frame);

    const glassGeo = new THREE.PlaneGeometry(length - 0.4, 2.8);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x + 0.61, 1.6, zStart);
    fridgeGroup.add(glass);

    const coldLight = new THREE.PointLight(0x38bdf8, 0.8, 6);
    coldLight.position.set(x + 0.4, 1.6, zStart);
    fridgeGroup.add(coldLight);

    this.scene.add(fridgeGroup);
  }

  // Glass Storefront & Sliding Doors
  buildGlassStorefront(W, H, D) {
    const frontGroup = new THREE.Group();
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

    const topFrameGeo = new THREE.BoxGeometry(W, 0.8, 0.4);
    const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
    topFrame.position.set(0, H - 0.4, D / 2);
    frontGroup.add(topFrame);

    const glassGeo = new THREE.BoxGeometry(W, H - 0.8, 0.1);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, (H - 0.8) / 2, D / 2);
    frontGroup.add(glassMesh);

    // Welcome Door Mat
    const matGeo = new THREE.PlaneGeometry(2.4, 1.4);
    const matMaterial = new THREE.MeshBasicMaterial({ map: this.textures.welcomeMat });
    const matMesh = new THREE.Mesh(matGeo, matMaterial);
    matMesh.rotation.x = -Math.PI / 2;
    matMesh.position.set(-8, 0.02, D / 2 - 1.0);
    this.scene.add(matMesh);

    this.scene.add(frontGroup);
  }

  // Supermarket Checkout Counter (Quầy thu ngân L-shape)
  buildCheckoutCounter(x, y, z) {
    this.checkoutGroup = new THREE.Group();
    this.checkoutGroup.position.set(x, y, z);

    const deskMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.3 });

    const deskGeo = new THREE.BoxGeometry(3.4, 1.0, 1.4);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.5, 0);
    desk.castShadow = true;
    desk.receiveShadow = true;
    this.checkoutGroup.add(desk);

    // L-wing
    const wingGeo = new THREE.BoxGeometry(1.2, 1.0, 1.8);
    const wing = new THREE.Mesh(wingGeo, deskMat);
    wing.position.set(-1.1, 0.5, 1.2);
    wing.castShadow = true;
    this.checkoutGroup.add(wing);

    // Counter Top
    const topGeo = new THREE.BoxGeometry(3.6, 0.08, 1.5);
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(0, 1.04, 0);
    this.checkoutGroup.add(top);

    // POS Terminal & Screen
    const monitorStandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const standGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.25);
    const stand = new THREE.Mesh(standGeo, monitorStandMat);
    stand.position.set(0.3, 1.18, 0.2);
    this.checkoutGroup.add(stand);

    const screenGeo = new THREE.BoxGeometry(0.65, 0.45, 0.05);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0.3, 1.4, 0.2);
    screen.rotation.x = -0.2;
    this.checkoutGroup.add(screen);

    // Barcode Scanner Gun
    const scannerGeo = new THREE.BoxGeometry(0.12, 0.18, 0.22);
    const scannerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const scanner = new THREE.Mesh(scannerGeo, scannerMat);
    scanner.position.set(0.8, 1.15, 0.15);
    this.checkoutGroup.add(scanner);

    // Laser scan light indicator (red)
    const scanLaserGeo = new THREE.PlaneGeometry(0.25, 0.04);
    const scanLaserMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const scanLaser = new THREE.Mesh(scanLaserGeo, scanLaserMat);
    scanLaser.rotation.x = -Math.PI / 2;
    scanLaser.position.set(0.8, 1.12, 0.35);
    this.checkoutGroup.add(scanLaser);

    // Lucky Cat & Tip Jar
    this.buildLuckyCat(1.3, 1.08, -0.2);
    this.buildTipJar(-0.6, 1.08, 0.3);

    desk.userData = { type: 'checkout' };
    this.interactiveObjects.push(desk);

    this.scene.add(this.checkoutGroup);
  }

  // Animated Lucky Cat (Maneki Neko) with waving golden paw
  buildLuckyCat(x, y, z) {
    const catGroup = new THREE.Group();
    catGroup.position.set(x, y, z);

    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

    const bodyGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const body = new THREE.Mesh(bodyGeo, goldMat);
    body.position.y = 0.18;
    body.scale.set(1, 1.2, 0.9);
    catGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.y = 0.4;
    catGroup.add(head);

    [-0.08, 0.08].forEach(ex => {
      const earGeo = new THREE.ConeGeometry(0.05, 0.09, 4);
      const ear = new THREE.Mesh(earGeo, redMat);
      ear.position.set(ex, 0.52, 0);
      catGroup.add(ear);
    });

    const pawGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.16);
    const paw = new THREE.Mesh(pawGeo, goldMat);
    paw.position.set(0.15, 0.32, 0.08);
    paw.rotation.z = -0.4;
    catGroup.add(paw);
    this.luckyCatPaw = paw;

    this.checkoutGroup.add(catGroup);
  }

  // Tip Jar
  buildTipJar(x, y, z) {
    const jarGroup = new THREE.Group();
    jarGroup.position.set(x, y, z);

    const jarGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.28, 16);
    const jarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1
    });
    const jar = new THREE.Mesh(jarGeo, jarMat);
    jar.position.y = 0.14;
    jarGroup.add(jar);

    const coinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), coinMat);
      coin.position.set((Math.random() - 0.5) * 0.1, 0.05 + i * 0.02, (Math.random() - 0.5) * 0.1);
      jarGroup.add(coin);
    }

    this.checkoutGroup.add(jarGroup);
  }

  // Air Conditioner unit on side wall
  buildAirConditioner(x, y, z) {
    this.acGroup = new THREE.Group();
    this.acGroup.position.set(x, y, z);
    this.acGroup.rotation.y = Math.PI / 2;

    const acGeo = new THREE.BoxGeometry(2.4, 0.6, 0.45);
    const acMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const ac = new THREE.Mesh(acGeo, acMat);
    this.acGroup.add(ac);

    const ledGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.9, -0.15, 0.24);
    this.acGroup.add(led);

    this.scene.add(this.acGroup);
  }

  // Exterior sidewalk & street outside glass storefront
  buildExteriorStreet(W, D) {
    const streetGroup = new THREE.Group();

    const sidewalkGeo = new THREE.PlaneGeometry(W + 10, 8);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, -0.05, D / 2 + 4);
    streetGroup.add(sidewalk);

    const roadGeo = new THREE.PlaneGeometry(W + 20, 16);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.15, D / 2 + 16);
    streetGroup.add(road);

    const lampX = 8;
    const lampZ = D / 2 + 3.5;
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(lampX, 2.25, lampZ);
    streetGroup.add(pole);

    const lampLight = new THREE.PointLight(0xfef08a, 1.2, 14);
    lampLight.position.set(lampX, 4.5, lampZ);
    streetGroup.add(lampLight);

    this.scene.add(streetGroup);
  }

  // 3D SHELVES & DYNAMIC PRODUCT MODELS
  rebuildShelves() {
    this.shelfMeshes.forEach(s => {
      this.scene.remove(s.group);
      const idx = this.interactiveObjects.indexOf(s.hitBox);
      if (idx !== -1) this.interactiveObjects.splice(idx, 1);
    });
    this.shelfMeshes = [];

    const shelves = this.game.shelves || [];
    const count = shelves.length;

    for (let i = 0; i < count; i++) {
      const s = shelves[i];
      let posX, posZ;

      if (i < 4) {
        posX = -4.5 + (i % 4) * 3.4;
        posZ = -2.5;
      } else if (i < 8) {
        posX = -3.0 + ((i - 4) % 4) * 3.4;
        posZ = 2.0;
      } else {
        posX = -3.0 + ((i - 8) % 4) * 3.4;
        posZ = 5.8;
      }

      s.x3d = posX;
      s.z3d = posZ;

      const w2d = (this.game.canvas && this.game.canvas.width) ? this.game.canvas.width : 650;
      const h2d = (this.game.canvas && this.game.canvas.height) ? this.game.canvas.height : 420;
      s.x = Math.floor((posX / 24 + 0.5) * w2d);
      s.y = Math.floor((posZ / 18 + 0.5) * h2d);

      const shelfGroup = this.createShelfUnit(s, i);
      shelfGroup.position.set(posX, 0, posZ);
      this.scene.add(shelfGroup);

      this.shelfMeshes.push({
        group: shelfGroup,
        shelfData: s,
        index: i,
        hitBox: shelfGroup.userData.hitBox,
        productGroup: shelfGroup.userData.productGroup,
        labelMesh: shelfGroup.userData.labelMesh
      });
    }
  }

  // Create single Gondola Supermarket Shelving Unit
  createShelfUnit(shelfData, index) {
    const group = new THREE.Group();
    const width = 2.7;
    const height = 2.2;
    const depth = 0.9;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
    const shelfBoardMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const edgeTrimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });

    [-width / 2, width / 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, depth), frameMat);
      post.position.set(px, height / 2, 0);
      post.castShadow = true;
      group.add(post);
    });

    const backGeo = new THREE.BoxGeometry(width, height, 0.05);
    const back = new THREE.Mesh(backGeo, frameMat);
    back.position.set(0, height / 2, 0);
    group.add(back);

    const tiersY = [0.35, 1.05, 1.75];
    tiersY.forEach(ty => {
      const bFront = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 0.06, depth * 0.45), shelfBoardMat);
      bFront.position.set(0, ty, depth * 0.23);
      bFront.castShadow = true;
      bFront.receiveShadow = true;
      group.add(bFront);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, 0.02), edgeTrimMat);
      trim.position.set(0, ty + 0.03, depth * 0.46);
      group.add(trim);
    });

    // Hitbox for raycasting
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.2, height, depth + 0.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(0, height / 2, 0);
    hitBox.userData = { type: 'shelf', index: index, shelfData: shelfData };
    group.add(hitBox);
    group.userData.hitBox = hitBox;
    this.interactiveObjects.push(hitBox);

    const productGroup = new THREE.Group();
    group.add(productGroup);
    group.userData.productGroup = productGroup;
    this.updateShelfProductModels(productGroup, shelfData);

    const labelMesh = this.createShelfLabelBillboard(shelfData, index);
    labelMesh.position.set(0, height + 0.45, 0);
    group.add(labelMesh);
    group.userData.labelMesh = labelMesh;
    this.floatingLabels.push(labelMesh);

    return group;
  }

  updateShelfProductModels(productGroup, shelfData) {
    while (productGroup.children.length > 0) {
      productGroup.remove(productGroup.children[0]);
    }

    if (!shelfData.itemId || shelfData.quantity <= 0) return;

    const item = GAME_ITEMS.find(i => i.id === shelfData.itemId);
    if (!item) return;

    const maxVisual = 12;
    const visualCount = Math.max(1, Math.min(maxVisual, Math.ceil((shelfData.quantity / shelfData.maxQuantity) * maxVisual)));

    const cat = item.category || 'drink';
    let geo, mat;

    if (cat === 'drink') {
      geo = new THREE.CylinderGeometry(0.08, 0.08, 0.24, 12);
      const color = item.id.includes('water') ? 0x38bdf8 :
                    item.id.includes('soda') ? 0xef4444 :
                    item.id.includes('tea') ? 0xd97706 : 0x78350f;
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    } else if (cat === 'snack') {
      geo = new THREE.BoxGeometry(0.18, 0.24, 0.09);
      const color = item.id.includes('chips') ? 0xf59e0b :
                    item.id.includes('cookie') ? 0xd97706 : 0xa855f7;
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    } else if (cat === 'food') {
      geo = new THREE.CylinderGeometry(0.12, 0.09, 0.2, 12);
      mat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    } else if (cat === 'electronics') {
      geo = new THREE.BoxGeometry(0.18, 0.06, 0.24);
      mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.2 });
    } else {
      geo = new THREE.BoxGeometry(0.12, 0.22, 0.12);
      mat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
    }

    const tiersY = [0.47, 1.17, 1.87];
    const itemsPerTier = 4;

    for (let k = 0; k < visualCount; k++) {
      const tierIdx = Math.floor(k / itemsPerTier) % tiersY.length;
      const colIdx = k % itemsPerTier;

      const pMesh = new THREE.Mesh(geo, mat);
      const px = -0.9 + colIdx * 0.6;
      const py = tiersY[tierIdx];
      const pz = 0.24;

      pMesh.position.set(px, py, pz);
      pMesh.castShadow = true;
      productGroup.add(pMesh);
    }
  }

  // Floating 3D Billboard Shelf Tag (Rendered with clean opaque dark card)
  createShelfLabelBillboard(shelfData, index) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    const redraw = () => {
      // Solid dark container
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 384, 160);

      ctx.strokeStyle = shelfData.itemId ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 378, 154);

      const item = shelfData.itemId ? GAME_ITEMS.find(i => i.id === shelfData.itemId) : null;
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 24px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`KỆ #${index + 1}`, 18, 38);

      if (item) {
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${item.icon} ${item.name}`, 18, 80);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 26px "Outfit", sans-serif';
        ctx.fillText(`${(shelfData.price || item.basePrice).toLocaleString('vi-VN')}₫`, 18, 116);

        const pct = shelfData.maxQuantity > 0 ? (shelfData.quantity / shelfData.maxQuantity) : 0;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(18, 128, 220, 16);
        ctx.fillStyle = pct > 0.3 ? '#34d399' : '#f87171';
        ctx.fillRect(18, 128, 220 * pct, 16);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px "Nunito", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${shelfData.quantity}/${shelfData.maxQuantity}`, 360, 142);
      } else {
        ctx.font = 'bold 34px "Outfit", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('+ Kệ Đang Trống', 18, 90);
        ctx.font = '24px "Nunito", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('(Click / Nhấn E để xếp hàng)', 18, 130);
      }
    };

    redraw();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const planeGeo = new THREE.PlaneGeometry(1.6, 0.68);
    const planeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.userData = { canvas, ctx, texture: tex, redraw, shelfData, index };

    return mesh;
  }

  // 3D HUMANOID CHARACTERS (Khách hàng & Nhân viên)
  createHumanoidMesh(config) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: config.skinColor || 0xffdbac, roughness: 0.5 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: config.clothesColor || 0x3b82f6, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: config.pantsColor || 0x1e293b, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor || 0x1f2937, roughness: 0.8 });

    const torsoGeo = new THREE.BoxGeometry(0.48, 0.65, 0.28);
    const torso = new THREE.Mesh(torsoGeo, clothesMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    const headGeo = new THREE.BoxGeometry(0.34, 0.36, 0.34);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.6;
    head.castShadow = true;
    group.add(head);

    const hairGeo = new THREE.BoxGeometry(0.36, 0.14, 0.36);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.76;
    group.add(hair);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    [-0.08, 0.08].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.02), eyeMat);
      eye.position.set(ex, 1.62, 0.18);
      group.add(eye);
    });

    const armGeo = new THREE.BoxGeometry(0.12, 0.52, 0.12);
    
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.32, 1.32, 0);
    const leftArm = new THREE.Mesh(armGeo, clothesMat);
    leftArm.position.y = -0.24;
    leftArm.castShadow = true;
    leftArmPivot.add(leftArm);
    group.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.32, 1.32, 0);
    const rightArm = new THREE.Mesh(armGeo, clothesMat);
    rightArm.position.y = -0.24;
    rightArm.castShadow = true;
    rightArmPivot.add(rightArm);
    group.add(rightArmPivot);

    const legGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.14, 0.72, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.y = -0.32;
    leftLeg.castShadow = true;
    leftLegPivot.add(leftLeg);
    group.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.14, 0.72, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.y = -0.32;
    rightLeg.castShadow = true;
    rightLegPivot.add(rightLeg);
    group.add(rightLegPivot);

    if (config.prop === 'basket') {
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.22), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
      basket.position.set(0, -0.22, 0.18);
      rightArmPivot.add(basket);
    } else if (config.prop === 'broom') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), new THREE.MeshStandardMaterial({ color: 0x854d0e }));
      handle.position.set(0.08, -0.3, 0.2);
      handle.rotation.x = 0.3;
      rightArmPivot.add(handle);
      const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0xa855f7 }));
      bristles.position.set(0.08, -0.9, 0.38);
      rightArmPivot.add(bristles);
    } else if (config.prop === 'crate') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
      box.position.set(0, 1.05, 0.38);
      group.add(box);
    }

    // Speech Bubble Billboard above head
    const speechCanvas = document.createElement('canvas');
    speechCanvas.width = 320;
    speechCanvas.height = 120;
    const speechTex = new THREE.CanvasTexture(speechCanvas);
    speechTex.needsUpdate = true;
    const speechMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.55),
      new THREE.MeshBasicMaterial({ map: speechTex, depthWrite: false, transparent: true, side: THREE.DoubleSide })
    );
    speechMesh.position.y = 2.25;
    speechMesh.visible = false;
    group.add(speechMesh);

    // Alert Indicator (!) Billboard above head for shoplifters / alerted thieves
    const alertCanvas = document.createElement('canvas');
    alertCanvas.width = 128;
    alertCanvas.height = 128;
    const actx = alertCanvas.getContext('2d');
    actx.beginPath();
    actx.arc(64, 64, 56, 0, Math.PI * 2);
    actx.fillStyle = '#ef4444';
    actx.fill();
    actx.lineWidth = 8;
    actx.strokeStyle = '#ffffff';
    actx.stroke();
    actx.font = '900 80px "Outfit", sans-serif';
    actx.fillStyle = '#ffffff';
    actx.textAlign = 'center';
    actx.textBaseline = 'middle';
    actx.fillText('!', 64, 66);

    const alertTex = new THREE.CanvasTexture(alertCanvas);
    alertTex.needsUpdate = true;
    const alertMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.7),
      new THREE.MeshBasicMaterial({ map: alertTex, depthWrite: false, transparent: true, side: THREE.DoubleSide })
    );
    alertMesh.position.y = 2.45;
    alertMesh.visible = false;
    group.add(alertMesh);

    // HitBox for Raycasting (Clicking / Aiming [E])
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.9, 0.85),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.95;
    group.add(hitBox);

    group.userData = {
      leftArmPivot, rightArmPivot,
      leftLegPivot, rightLegPivot,
      torso,
      speechMesh, speechCanvas, speechTex,
      alertMesh, hitBox,
      walkPhase: Math.random() * 10
    };

    return group;
  }

  // SIMULATION ENTITIES UPDATE (Position & Animations)
  syncSimulationEntities(dt) {
    const W2D = (this.game.canvas && this.game.canvas.width) ? this.game.canvas.width : 650;
    const H2D = (this.game.canvas && this.game.canvas.height) ? this.game.canvas.height : 420;

    const to3D = (x2d, y2d) => {
      const x3d = ((x2d / W2D) - 0.5) * 22;
      const z3d = ((y2d / H2D) - 0.5) * 16;
      return { x: x3d, z: z3d };
    };

    // 1. CUSTOMERS
    const activeCustomers = this.game.customers || [];
    const activeCustSet = new Set(activeCustomers);

    for (let [cust, mesh] of this.customerMeshes.entries()) {
      if (!activeCustSet.has(cust)) {
        if (mesh.userData && mesh.userData.hitBox) {
          const idx = this.interactiveObjects.indexOf(mesh.userData.hitBox);
          if (idx !== -1) this.interactiveObjects.splice(idx, 1);
        }
        this.scene.remove(mesh);
        this.customerMeshes.delete(cust);
      }
    }

    activeCustomers.forEach(c => {
      let mesh = this.customerMeshes.get(c);
      if (!mesh) {
        const isThief = c.archetype && c.archetype.type === 'thief';
        const clothesColor = isThief ? 0x111827 :
                             c.archetype.id === 'student' ? 0x38bdf8 :
                             c.archetype.id === 'wealthy' ? 0xf59e0b :
                             c.archetype.id === 'office' ? 0x475569 : 0xec4899;
        
        mesh = this.createHumanoidMesh({
          clothesColor,
          hairColor: isThief ? 0x000000 : 0x27272a,
          prop: isThief ? null : 'basket'
        });
        mesh.userData.customer = c;
        mesh.userData.type = 'customer';
        if (mesh.userData.hitBox) {
          mesh.userData.hitBox.userData = { type: 'customer', customerObj: c };
          this.interactiveObjects.push(mesh.userData.hitBox);
        }
        this.scene.add(mesh);
        this.customerMeshes.set(c, mesh);
      }

      const p3 = to3D(c.x, c.y);
      const oldX = mesh.position.x;
      const oldZ = mesh.position.z;
      mesh.position.set(p3.x, 0, p3.z);

      const dx = p3.x - oldX;
      const dz = p3.z - oldZ;
      const isMoving = Math.sqrt(dx * dx + dz * dz) > 0.005;
      if (isMoving) {
        mesh.rotation.y = Math.atan2(dx, dz);
        mesh.userData.walkPhase += dt * 9;
      } else {
        mesh.userData.walkPhase = 0;
      }

      const wp = mesh.userData.walkPhase;
      mesh.userData.leftLegPivot.rotation.x = Math.sin(wp) * 0.45;
      mesh.userData.rightLegPivot.rotation.x = -Math.sin(wp) * 0.45;
      mesh.userData.leftArmPivot.rotation.x = -Math.sin(wp) * 0.45;
      mesh.userData.rightArmPivot.rotation.x = Math.sin(wp) * 0.45;
      mesh.position.y = isMoving ? Math.abs(Math.sin(wp * 2)) * 0.06 : 0;

      // Speech bubble
      const sbMesh = mesh.userData.speechMesh;
      if (c.speech && c.speechTimer > 0) {
        sbMesh.visible = true;
        const cv = mesh.userData.speechCanvas;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, 320, 120);
        ctx.fillStyle = c.archetype && c.archetype.type === 'thief' ? '#ef4444' : '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.fillRect(4, 4, 312, 112);
        ctx.strokeRect(4, 4, 312, 112);

        ctx.font = 'bold 26px "Nunito", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(c.speech, 160, 68);
        mesh.userData.speechTex.needsUpdate = true;
        sbMesh.lookAt(this.activeCamera.position);
      } else {
        sbMesh.visible = false;
      }

      // Alert badge pulsating above alerted suspect
      const alertBadge = mesh.userData.alertMesh;
      if (alertBadge) {
        if (c.isAlerted) {
          alertBadge.visible = true;
          const pulse = 1.0 + Math.sin(Date.now() / 120) * 0.22;
          alertBadge.scale.set(pulse, pulse, 1);
          alertBadge.lookAt(this.activeCamera.position);
        } else {
          alertBadge.visible = false;
        }
      }
    });

    // 2. STAFF
    const staffKeys = [
      { key: 'staff_cashier', label: 'THU NGÂN', color: 0x10b981, prop: null, defaultX: -7.6, defaultZ: 1.8 },
      { key: 'staff_restocker', label: 'TIẾP HÀNG', color: 0x0284c7, prop: 'crate', defaultX: 7.5, defaultZ: -4.5 },
      { key: 'staff_janitor', label: 'LAO CÔNG', color: 0xa855f7, prop: 'broom', defaultX: 0, defaultZ: 0 },
      { key: 'staff_security', label: 'BẢO VỆ', color: 0xf59e0b, prop: null, defaultX: -8.0, defaultZ: 6.5 }
    ];

    staffKeys.forEach(sk => {
      const isHired = this.game.hiredStaff && this.game.hiredStaff.includes(sk.key);
      let mesh = this.staffMeshes.get(sk.key);

      if (isHired && !mesh) {
        mesh = this.createHumanoidMesh({
          clothesColor: sk.color,
          pantsColor: 0x1e293b,
          prop: sk.prop
        });
        mesh.userData.staffKey = sk.key;
        mesh.userData.type = 'staff';
        this.scene.add(mesh);
        this.staffMeshes.set(sk.key, mesh);
      } else if (!isHired && mesh) {
        this.scene.remove(mesh);
        this.staffMeshes.delete(sk.key);
        mesh = null;
      }

      if (mesh && isHired) {
        const ent = this.game.staffEntities ? this.game.staffEntities[sk.key] : null;
        let p3;
        if (ent && typeof ent.x === 'number') {
          p3 = to3D(ent.x, ent.y);
        } else {
          p3 = { x: sk.defaultX, z: sk.defaultZ };
        }

        const oldX = mesh.position.x;
        const oldZ = mesh.position.z;
        mesh.position.set(p3.x, 0, p3.z);

        const dx = p3.x - oldX;
        const dz = p3.z - oldZ;
        const isMoving = Math.sqrt(dx * dx + dz * dz) > 0.005;

        if (isMoving) {
          mesh.rotation.y = Math.atan2(dx, dz);
          mesh.userData.walkPhase += dt * 8;
        } else {
          mesh.userData.walkPhase = 0;
          if (sk.key === 'staff_cashier') mesh.rotation.y = -Math.PI / 2;
        }

        const wp = mesh.userData.walkPhase;
        mesh.userData.leftLegPivot.rotation.x = Math.sin(wp) * 0.45;
        mesh.userData.rightLegPivot.rotation.x = -Math.sin(wp) * 0.45;
        mesh.userData.leftArmPivot.rotation.x = -Math.sin(wp) * 0.45;
        mesh.userData.rightArmPivot.rotation.x = Math.sin(wp) * 0.45;
      }
    });

    // 3. DIRT PATCHES
    const dirtPatches = this.game.dirtPatches || [];
    const dirtSet = new Set(dirtPatches);

    for (let [dObj, dMesh] of this.dirtMeshes.entries()) {
      if (!dirtSet.has(dObj)) {
        this.scene.remove(dMesh);
        const idx = this.interactiveObjects.indexOf(dMesh);
        if (idx !== -1) this.interactiveObjects.splice(idx, 1);
        this.dirtMeshes.delete(dObj);
      }
    }

    dirtPatches.forEach(d => {
      let dMesh = this.dirtMeshes.get(d);
      if (!dMesh) {
        const p3 = to3D(d.x, d.y);
        const dGeo = new THREE.CircleGeometry(0.5, 16);
        const dMat = new THREE.MeshBasicMaterial({ color: 0x78350f, transparent: true, opacity: 0.65 });
        dMesh = new THREE.Mesh(dGeo, dMat);
        dMesh.rotation.x = -Math.PI / 2;
        dMesh.position.set(p3.x, 0.015, p3.z);
        dMesh.userData = { type: 'dirt', dirtObj: d };
        this.scene.add(dMesh);
        this.dirtMeshes.set(d, dMesh);
        this.interactiveObjects.push(dMesh);
      }
    });

    // 4. ANIMATE LUCKY CAT PAW
    if (this.luckyCatPaw) {
      this.luckyCatPaw.rotation.x = Math.sin(Date.now() / 150) * 0.35;
    }

    // 5. BILLBOARD LABELS ALWAYS FACE ACTIVE CAMERA
    this.floatingLabels.forEach(lbl => {
      lbl.lookAt(this.activeCamera.position);
    });

    // 6. ANIMATE SECURITY FIXTURES (Dog tail & Sensor Gate LEDs)
    if (this.dogTailPivot) {
      this.dogTailPivot.rotation.y = Math.sin(Date.now() / 130) * 0.55;
    }
    if (this.securityGateLEDs && this.securityGateLEDs.length > 0) {
      const anyAlarm = activeCustomers.some(c => c.alarmTriggered);
      const ledColor = anyAlarm ? ((Math.floor(Date.now() / 200) % 2 === 0) ? 0xef4444 : 0x7f1d1d) : 0x10b981;
      this.securityGateLEDs.forEach(led => led.material.color.setHex(ledColor));
    }
  }

  // FIRST-PERSON PLAYER MOVEMENT & COLLISION
  updatePlayerMovement(dt) {
    if (this.viewMode !== 'fps') return;

    const p = this.player;

    // Movement using exact camera forward/right world vectors
    const forwardDir = new THREE.Vector3();
    this.fpsCamera.getWorldDirection(forwardDir);
    forwardDir.y = 0;
    forwardDir.normalize();

    const rightDir = new THREE.Vector3().crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();
    if (p.keys.w) moveVector.add(forwardDir);
    if (p.keys.s) moveVector.sub(forwardDir);
    if (p.keys.d) moveVector.sub(rightDir);
    if (p.keys.a) moveVector.add(rightDir);

    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize();
      const speed = p.keys.shift ? p.speed * 1.5 : p.speed;
      p.pos.addScaledVector(moveVector, speed * dt);

      // Store Boundaries Collision
      const minX = -this.storeWidth / 2 + 1.2;
      const maxX = this.storeWidth / 2 - 1.2;
      const minZ = -this.storeDepth / 2 + 1.2;
      const maxZ = this.storeDepth / 2 - 1.2;

      p.pos.x = Math.max(minX, Math.min(maxX, p.pos.x));
      p.pos.z = Math.max(minZ, Math.min(maxZ, p.pos.z));
    }

    // Update FPS Camera position and rotation
    this.fpsCamera.position.copy(p.pos);
    this.fpsCamera.rotation.order = 'YXZ';
    this.fpsCamera.rotation.y = p.yaw + Math.PI;
    this.fpsCamera.rotation.x = p.pitch;

    this.checkFPSInteraction();
  }

  // FPS Mode: Raycast from center of crosshair
  checkFPSInteraction() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.fpsCamera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    const promptEl = document.getElementById('fps-interact-prompt');
    const promptText = document.getElementById('fps-prompt-text');

    if (intersects.length > 0 && intersects[0].distance < 3.8) {
      const hit = intersects[0].object;
      const data = hit.userData;
      this.player.targetedObject = data;

      if (promptEl && promptText) {
        promptEl.classList.remove('hidden');
        if (data.type === 'shelf') {
          const s = this.game.shelves[data.index];
          const item = s && s.itemId ? GAME_ITEMS.find(i => i.id === s.itemId) : null;
          promptText.innerText = item ? `Châm hàng [${item.name}]` : `Chọn hàng đặt lên Kệ #${data.index + 1}`;
        } else if (data.type === 'dirt') {
          promptText.innerText = 'Lau dọn vết bẩn 🧹';
        } else if (data.type === 'checkout') {
          promptText.innerText = 'Tính tiền cho khách 🔔';
        } else if (data.type === 'customer') {
          promptText.innerText = 'Khám xét nghi phạm 🔍 / Chặn hỏi [E]';
        }
      }
    } else {
      this.player.targetedObject = null;
      if (promptEl) promptEl.classList.add('hidden');
    }
  }

  // INTERACTION DISPATCHER (Both Click and [E] key)
  triggerInteraction(targetData) {
    if (!targetData) return;

    if (targetData.type === 'shelf') {
      const s = this.game.shelves[targetData.index];
      if (!s.itemId) {
        this.game.openShelfAssignModal(targetData.index);
      } else {
        this.game.restockShelfManual(targetData.index);
        this.refreshShelfLabel(targetData.index);
      }
    } else if (targetData.type === 'dirt') {
      const dObj = targetData.dirtObj;
      const idx = this.game.dirtPatches.indexOf(dObj);
      if (idx !== -1) {
        this.game.dirtPatches.splice(idx, 1);
        this.game.cleanliness = Math.min(100, this.game.cleanliness + 5);
        if (window.gameAudio) gameAudio.playSweep();
        this.game.addFloatingText('✨ Sạch!', dObj.x, dObj.y, '#34d399');
        this.game.updateStatsUI();
      }
    } else if (targetData.type === 'checkout') {
      this.game.manualCheckoutClick();
    } else if (targetData.type === 'customer') {
      if (targetData.customerObj) {
        this.game.interactWithCustomer(targetData.customerObj);
      }
    }
  }

  refreshShelfLabel(index) {
    const sMesh = this.shelfMeshes.find(m => m.index === index);
    if (sMesh) {
      if (sMesh.labelMesh && sMesh.labelMesh.userData.redraw) {
        sMesh.labelMesh.userData.redraw();
        sMesh.labelMesh.userData.texture.needsUpdate = true;
      }
      if (sMesh.productGroup) {
        this.updateShelfProductModels(sMesh.productGroup, this.game.shelves[index]);
      }
    }
  }

  refreshAllShelfLabels() {
    this.shelfMeshes.forEach(sMesh => {
      if (sMesh.labelMesh && sMesh.labelMesh.userData.redraw) {
        sMesh.labelMesh.userData.redraw();
        sMesh.labelMesh.userData.texture.needsUpdate = true;
      }
      if (sMesh.productGroup) {
        this.updateShelfProductModels(sMesh.productGroup, this.game.shelves[sMesh.index]);
      }
    });
  }

  // CONTROLS & EVENT BINDINGS
  setupControlsAndInput() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') this.player.keys.w = true;
      if (k === 'a') this.player.keys.a = true;
      if (k === 's') this.player.keys.s = true;
      if (k === 'd') this.player.keys.d = true;
      if (e.key === 'Shift') this.player.keys.shift = true;

      if (k === 'v') {
        this.toggleViewMode();
      }

      if (k === 'e' && this.viewMode === 'fps') {
        if (this.player.targetedObject) {
          this.triggerInteraction(this.player.targetedObject);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') this.player.keys.w = false;
      if (k === 'a') this.player.keys.a = false;
      if (k === 's') this.player.keys.s = false;
      if (k === 'd') this.player.keys.d = false;
      if (e.key === 'Shift') this.player.keys.shift = false;
    });

    const dom = this.renderer.domElement;

    // PointerLock & Mouse look
    dom.addEventListener('click', (e) => {
      if (this.viewMode === 'fps') {
        if (document.pointerLockElement !== dom) {
          dom.requestPointerLock();
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.player.isLocked = (document.pointerLockElement === dom);
    });

    dom.addEventListener('mousedown', (e) => {
      if (this.viewMode === 'fps') {
        this.player.isMouseDown = true;
        this.player.lastMouseX = e.clientX;
        this.player.lastMouseY = e.clientY;

        if (e.button === 0 && this.player.targetedObject) {
          this.triggerInteraction(this.player.targetedObject);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.player.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.viewMode === 'fps') {
        if (this.player.isLocked || this.player.isMouseDown) {
          const dx = e.movementX !== undefined && this.player.isLocked ? e.movementX : (e.clientX - this.player.lastMouseX);
          const dy = e.movementY !== undefined && this.player.isLocked ? e.movementY : (e.clientY - this.player.lastMouseY);
          this.player.lastMouseX = e.clientX;
          this.player.lastMouseY = e.clientY;

          const sensitivity = 0.003;
          this.player.yaw -= dx * sensitivity;
          this.player.pitch -= dy * sensitivity;
          this.player.pitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, this.player.pitch));
        }
      }
    });

    // Isometric Click Raycaster (Management Mode)
    dom.addEventListener('click', (e) => {
      if (this.viewMode !== 'iso') return;

      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.isoCamera);
      const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        this.triggerInteraction(hit.userData);
      }
    });
  }

  // TOGGLE BETWEEN ISOMETRIC & FIRST-PERSON FPS VIEW
  toggleViewMode(forcedMode = null) {
    this.viewMode = forcedMode || (this.viewMode === 'iso' ? 'fps' : 'iso');

    const crosshair = document.getElementById('fps-crosshair');
    const promptEl = document.getElementById('fps-interact-prompt');
    const modeBadge = document.getElementById('camera-mode-badge');
    const hintEl = document.getElementById('view-mode-hint');

    if (this.viewMode === 'fps') {
      this.activeCamera = this.fpsCamera;
      if (this.controls) this.controls.enabled = false;
      if (crosshair) crosshair.classList.remove('hidden');
      if (modeBadge) modeBadge.innerText = '🚶 GÓC NHÌN THỨ NHẤT (FPS)';
      if (hintEl) hintEl.innerHTML = '⌨️ <b>W,A,S,D:</b> Đi lại | <b>Chuột:</b> Xoay nhìn | <b>[E] / Click:</b> Tương tác | <b>[V]:</b> Đổi góc nhìn';
      this.game.log('🎥 Đã chuyển sang Góc nhìn thứ nhất (WASD để đi lại trong tiệm)!');
    } else {
      if (document.exitPointerLock && document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.activeCamera = this.isoCamera;
      if (this.controls) this.controls.enabled = true;
      if (crosshair) crosshair.classList.add('hidden');
      if (promptEl) promptEl.classList.add('hidden');
      if (modeBadge) modeBadge.innerText = '🎥 GÓC NHÌN QUẢN LÝ 3D';
      if (hintEl) hintEl.innerHTML = '🖱️ <b>Chuột trái:</b> Xoay tiệm | <b>Chuột phải:</b> Di chuyển | <b>Cuộn chuột:</b> Thu phóng | <b>[V]:</b> Góc nhìn thứ nhất';
      this.game.log('🎥 Đã chuyển sang Góc nhìn Quản lý Toàn cảnh 3D!');
    }
  }

  // HUD OVERLAYS & CAMERA BUTTONS
  setupHUDOverlays() {
    const toolbar = document.createElement('div');
    toolbar.className = 'camera-toolbar-3d';
    toolbar.innerHTML = `
      <div class="cam-badge" id="camera-mode-badge">🎥 GÓC NHÌN QUẢN LÝ 3D</div>
      <button id="btn-toggle-camera-mode" class="cam-btn" title="Chuyển đổi giữa góc nhìn Quản lý 3D và Góc nhìn thứ nhất (Phím V)">
        🔄 Đổi góc nhìn [Phím V]
      </button>
      <button id="btn-reset-camera" class="cam-btn-secondary" title="Đặt lại góc nhìn camera">
        📍 Căn giữa
      </button>
    `;
    this.container.appendChild(toolbar);

    const crosshair = document.createElement('div');
    crosshair.id = 'fps-crosshair';
    crosshair.className = 'fps-crosshair hidden';
    crosshair.innerHTML = `<span>+</span>`;
    this.container.appendChild(crosshair);

    const prompt = document.createElement('div');
    prompt.id = 'fps-interact-prompt';
    prompt.className = 'fps-interact-prompt hidden';
    prompt.innerHTML = `
      <span class="key-badge">E</span>
      <span id="fps-prompt-text">Tương tác</span>
    `;
    this.container.appendChild(prompt);

    const hint = document.createElement('div');
    hint.id = 'view-mode-hint';
    hint.className = 'view-mode-hint';
    hint.innerHTML = `🖱️ <b>Chuột trái:</b> Xoay tiệm | <b>Chuột phải:</b> Di chuyển | <b>Cuộn chuột:</b> Thu phóng | <b>[V]:</b> Góc nhìn thứ nhất`;
    this.container.appendChild(hint);

    document.getElementById('btn-toggle-camera-mode').onclick = () => this.toggleViewMode();
    document.getElementById('btn-reset-camera').onclick = () => {
      if (this.controls) {
        this.isoCamera.position.set(0, 18, 19);
        this.controls.target.set(0, 1.2, 0);
        this.controls.update();
      }
      this.player.pos.set(0, 1.65, 5.5);
      this.player.yaw = 0;
      this.player.pitch = -0.05;
    };
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.isoCamera.aspect = w / h;
    this.isoCamera.updateProjectionMatrix();

    this.fpsCamera.aspect = w / h;
    this.fpsCamera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
  }

  // MAIN RENDER LOOP (Called every frame from game.loop)
  update(dt) {
    if (this.viewMode === 'iso' && this.controls) {
      this.controls.update();
    } else if (this.viewMode === 'fps') {
      this.updatePlayerMovement(dt);
    }

    this.syncSimulationEntities(dt);
  }

  render() {
    if (!this.renderer || !this.scene || !this.activeCamera) return;
    this.renderer.render(this.scene, this.activeCamera);
  }
}
