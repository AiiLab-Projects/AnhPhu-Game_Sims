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
      keys: { w: false, a: false, s: false, d: false, arrowUp: false, arrowDown: false, arrowLeft: false, arrowRight: false, q: false, shift: false },
      isLocked: false,
      isMouseDown: false,
      lastMouseX: 0,
      lastMouseY: 0,
      targetedObject: null,
      speedBoostTimer: 0
    };

    // Textures Cache
    this.textures = {};

    // Exterior Street Simulation Entities
    this.slidingDoors = null;
    this.trafficCars = [];
    this.pedestrians = [];
    this.cameraTransition = null;
    this.riverBoat = null;
    this.waterSurfaces = [];
    this.lotusMeshes = [];

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

    // 6. Exterior Sidewalk Paver Tiles
    const swCanvas = document.createElement('canvas');
    swCanvas.width = 512;
    swCanvas.height = 512;
    const swCtx = swCanvas.getContext('2d');
    swCtx.fillStyle = '#475569';
    swCtx.fillRect(0, 0, 512, 512);
    const swTile = 64;
    for (let x = 0; x < 512; x += swTile) {
      for (let y = 0; y < 512; y += swTile) {
        const isOffset = ((x / swTile + y / swTile) % 2 === 0);
        swCtx.fillStyle = isOffset ? '#64748b' : '#526176';
        swCtx.fillRect(x + 2, y + 2, swTile - 4, swTile - 4);
        swCtx.strokeStyle = 'rgba(255,255,255,0.08)';
        swCtx.lineWidth = 2;
        swCtx.strokeRect(x + 3, y + 3, swTile - 6, swTile - 6);
      }
    }
    const swTex = new THREE.CanvasTexture(swCanvas);
    swTex.wrapS = THREE.RepeatWrapping;
    swTex.wrapT = THREE.RepeatWrapping;
    swTex.repeat.set(12, 3);
    swTex.needsUpdate = true;
    this.textures.sidewalk = swTex;

    // 7. Asphalt Road with Pedestrian Zebra Crosswalk
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 512;
    const rCtx = roadCanvas.getContext('2d');
    rCtx.fillStyle = '#1e293b';
    rCtx.fillRect(0, 0, 1024, 512);

    // Center Dashed Yellow Lane Divider (across width)
    rCtx.strokeStyle = '#facc15';
    rCtx.lineWidth = 8;
    rCtx.setLineDash([32, 24]);
    rCtx.beginPath();
    rCtx.moveTo(0, 256);
    rCtx.lineTo(1024, 256);
    rCtx.stroke();
    rCtx.setLineDash([]);

    // Zebra Crosswalk (marked in center of road facing store entrance)
    rCtx.fillStyle = '#f8fafc';
    const zebraStart = 380;
    const zebraEnd = 540;
    for (let x = zebraStart; x < zebraEnd; x += 36) {
      rCtx.fillRect(x, 40, 22, 432);
    }
    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.ClampToEdgeWrapping;
    roadTex.repeat.set(1, 1);
    roadTex.needsUpdate = true;
    this.textures.road = roadTex;

    // 8. Storefront Striped Canopy Awning
    const awnCanvas = document.createElement('canvas');
    awnCanvas.width = 256;
    awnCanvas.height = 256;
    const aCtx = awnCanvas.getContext('2d');
    const stripeW = 32;
    for (let x = 0; x < 256; x += stripeW) {
      aCtx.fillStyle = (x / stripeW) % 2 === 0 ? '#0284c7' : '#fef08a';
      aCtx.fillRect(x, 0, stripeW, 256);
    }
    const awnTex = new THREE.CanvasTexture(awnCanvas);
    awnTex.wrapS = THREE.RepeatWrapping;
    awnTex.wrapT = THREE.RepeatWrapping;
    awnTex.repeat.set(3, 1);
    awnTex.needsUpdate = true;
    this.textures.awning = awnTex;

    // 9. Outdoor Beverage Vending Machine Front Texture
    const vmCanvas = document.createElement('canvas');
    vmCanvas.width = 512;
    vmCanvas.height = 1024;
    const vmCtx = vmCanvas.getContext('2d');
    
    // Glossy Blue/Cyan Machine Body
    const vmGrad = vmCtx.createLinearGradient(0, 0, 512, 1024);
    vmGrad.addColorStop(0, '#0369a1');
    vmGrad.addColorStop(1, '#082f49');
    vmCtx.fillStyle = vmGrad;
    vmCtx.fillRect(0, 0, 512, 1024);

    // Glowing Header Display
    vmCtx.fillStyle = '#38bdf8';
    vmCtx.fillRect(20, 25, 472, 110);
    vmCtx.fillStyle = '#0f172a';
    vmCtx.font = '900 48px "Outfit", sans-serif';
    vmCtx.textAlign = 'center';
    vmCtx.fillText('🧊 COLD DRINKS ⚡', 256, 95);

    // Display Glass Window with Drink Cans
    vmCtx.fillStyle = '#0c4a6e';
    vmCtx.fillRect(25, 160, 462, 540);
    vmCtx.strokeStyle = 'rgba(255,255,255,0.4)';
    vmCtx.lineWidth = 4;
    vmCtx.strokeRect(25, 160, 462, 540);

    // Rows of Colorful Soda & Energy Drink Cans
    const rowColors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    const rowNames = ['COLA', 'SODA', 'ENERGY', 'GRAPE'];
    for (let r = 0; r < 4; r++) {
      const cy = 200 + r * 125;
      for (let c = 0; c < 4; c++) {
        const cx = 55 + c * 105;
        // Can body
        vmCtx.fillStyle = rowColors[r];
        vmCtx.fillRect(cx, cy, 65, 80);
        // Can rim
        vmCtx.fillStyle = '#e2e8f0';
        vmCtx.fillRect(cx + 4, cy - 6, 57, 6);
        vmCtx.fillRect(cx + 4, cy + 80, 57, 6);
        // Can label text
        vmCtx.fillStyle = '#ffffff';
        vmCtx.font = '900 13px sans-serif';
        vmCtx.textAlign = 'center';
        vmCtx.fillText(rowNames[r], cx + 32, cy + 45);
        // Green purchase button below can
        vmCtx.fillStyle = '#22c55e';
        vmCtx.beginPath();
        vmCtx.arc(cx + 32, cy + 100, 10, 0, Math.PI * 2);
        vmCtx.fill();
      }
    }

    // Coin slot & digital payment screen
    vmCtx.fillStyle = '#0f172a';
    vmCtx.fillRect(30, 725, 452, 90);
    vmCtx.fillStyle = '#4ade80';
    vmCtx.font = 'bold 28px monospace';
    vmCtx.textAlign = 'left';
    vmCtx.fillText('15.000₫ [BAM E]', 50, 780);

    // Can Drop Dispenser Chute at bottom
    vmCtx.fillStyle = '#1e293b';
    vmCtx.fillRect(40, 840, 432, 140);
    vmCtx.strokeStyle = '#475569';
    vmCtx.lineWidth = 6;
    vmCtx.strokeRect(40, 840, 432, 140);
    vmCtx.fillStyle = '#94a3b8';
    vmCtx.font = 'bold 22px sans-serif';
    vmCtx.textAlign = 'center';
    vmCtx.fillText('PUSH FOR DRINKS 🥤', 256, 920);

    const vmTex = new THREE.CanvasTexture(vmCanvas);
    vmTex.needsUpdate = true;
    this.textures.vending = vmTex;

    // 10. A-Frame Sidewalk Chalkboard Standee Texture
    const cbCanvas = document.createElement('canvas');
    cbCanvas.width = 512;
    cbCanvas.height = 768;
    const cbCtx = cbCanvas.getContext('2d');
    cbCtx.fillStyle = '#18181b'; // Chalkboard dark slate
    cbCtx.fillRect(0, 0, 512, 768);

    // Wooden Frame Border
    cbCtx.strokeStyle = '#78350f';
    cbCtx.lineWidth = 24;
    cbCtx.strokeRect(12, 12, 488, 744);

    // Chalk Handwriting
    cbCtx.textAlign = 'center';
    cbCtx.font = '900 38px "Outfit", cursive, sans-serif';
    cbCtx.fillStyle = '#fef08a';
    cbCtx.fillText('🏪 TIỆM BÁCH HÓA', 256, 90);
    cbCtx.fillText('VUI VẺ', 256, 140);

    cbCtx.strokeStyle = '#38bdf8';
    cbCtx.lineWidth = 4;
    cbCtx.beginPath();
    cbCtx.moveTo(70, 165);
    cbCtx.lineTo(442, 165);
    cbCtx.stroke();

    cbCtx.font = 'bold 30px "Nunito", sans-serif';
    cbCtx.fillStyle = '#ffffff';
    cbCtx.fillText('⭐ SIÊU KHUYẾN MÃI ⭐', 256, 220);

    cbCtx.font = '26px "Nunito", sans-serif';
    cbCtx.fillStyle = '#a7f3d0';
    cbCtx.fillText('🥤 Nước ngọt mát lạnh', 256, 290);
    cbCtx.fillText('🍿 Snack & Bánh kẹo', 256, 350);
    cbCtx.fillText('🍜 Mì ăn liền các loại', 256, 410);

    cbCtx.fillStyle = '#fef08a';
    cbCtx.font = '900 34px "Outfit", sans-serif';
    cbCtx.fillText('GIẢM ĐẾN 30%!', 256, 490);

    cbCtx.fillStyle = '#38bdf8';
    cbCtx.font = 'bold 26px "Nunito", sans-serif';
    cbCtx.fillText('👉 Bấm [E] để Vẫy Gọi Khách!', 256, 580);
    cbCtx.font = '22px "Nunito", sans-serif';
    cbCtx.fillStyle = '#94a3b8';
    cbCtx.fillText('(Tăng lượng khách & uy tín)', 256, 625);

    const cbTex = new THREE.CanvasTexture(cbCanvas);
    cbTex.needsUpdate = true;
    this.textures.chalkboard = cbTex;

    // 11. Opposite Street Buildings Textures
    const makeFacadeTex = (title, bannerColor, accentColor, detailText) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');
      // Wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 512, 512);
      // Ground floor storefront
      ctx.fillStyle = bannerColor;
      ctx.fillRect(20, 20, 472, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 256, 95);

      // Window display
      ctx.fillStyle = accentColor;
      ctx.fillRect(30, 160, 452, 210);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 24px "Nunito", sans-serif';
      ctx.fillText(detailText, 256, 270);

      // Upper floor windows
      ctx.fillStyle = '#fef08a';
      [80, 200, 320, 420].forEach(wx => {
        ctx.fillRect(wx - 25, 400, 50, 70);
      });

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    };

    this.textures.cafeFacade = makeFacadeTex('☕ CÀ PHÊ PHỐ CỔ', '#78350f', '#0f172a', 'Espresso • Trà Sữa • Bánh Ngọt');
    this.textures.pharmacyFacade = makeFacadeTex('💊 HIỆU THUỐC 24/7', '#059669', '#064e3b', 'Thuốc Chuẩn GPP • Tận Tâm');
    this.textures.bakeryFacade = makeFacadeTex('🥐 TIỆM BÁNH MÌ', '#d97706', '#7c2d12', 'Bánh Mì Nóng Giòn Mỗi Sáng');

    // 12. Animated River & Lake Water Caustic Waves Texture
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 512;
    wCanvas.height = 512;
    const waterCtx = wCanvas.getContext('2d');
    waterCtx.fillStyle = '#0284c7';
    waterCtx.fillRect(0, 0, 512, 512);
    // Caustic water ripple waves
    for (let i = 0; i < 40; i++) {
      const qy = (i * 26) % 512;
      waterCtx.strokeStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(224, 242, 254, 0.35)';
      waterCtx.lineWidth = 3 + (i % 3);
      waterCtx.beginPath();
      waterCtx.moveTo(0, qy);
      for (let x = 0; x <= 512; x += 32) {
        const ny = qy + Math.sin((x / 60) + i) * 8 + Math.cos(x / 40) * 4;
        waterCtx.lineTo(x, ny);
      }
      waterCtx.stroke();
    }
    const waterTex = new THREE.CanvasTexture(wCanvas);
    waterTex.wrapS = THREE.RepeatWrapping;
    waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(4, 8);
    waterTex.needsUpdate = true;
    this.textures.water = waterTex;

    // 13. Floating Lotus Pad & Flower Texture
    const lotCanvas = document.createElement('canvas');
    lotCanvas.width = 256;
    lotCanvas.height = 256;
    const lctx = lotCanvas.getContext('2d');
    // Round lily pad with notch
    lctx.fillStyle = '#15803d';
    lctx.beginPath();
    lctx.arc(128, 128, 110, 0.25, Math.PI * 1.95);
    lctx.lineTo(128, 128);
    lctx.fill();
    // Veins
    lctx.strokeStyle = '#22c55e';
    lctx.lineWidth = 3;
    for (let a = 0.3; a < Math.PI * 1.9; a += 0.4) {
      lctx.beginPath();
      lctx.moveTo(128, 128);
      lctx.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
      lctx.stroke();
    }
    // Pink lotus flower in center
    lctx.fillStyle = '#ec4899';
    for (let p = 0; p < 8; p++) {
      const pa = (p / 8) * Math.PI * 2;
      lctx.beginPath();
      lctx.ellipse(128 + Math.cos(pa) * 22, 128 + Math.sin(pa) * 22, 18, 10, pa, 0, Math.PI * 2);
      lctx.fill();
    }
    lctx.fillStyle = '#fef08a';
    lctx.beginPath();
    lctx.arc(128, 128, 12, 0, Math.PI * 2);
    lctx.fill();
    const lotusTex = new THREE.CanvasTexture(lotCanvas);
    lotusTex.needsUpdate = true;
    this.textures.lotus = lotusTex;

    // 14. Stone Masonry for Bridge Piers & Balustrades
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = 512;
    bsCanvas.height = 512;
    const bsctx = bsCanvas.getContext('2d');
    bsctx.fillStyle = '#475569';
    bsctx.fillRect(0, 0, 512, 512);
    const bsh = 40;
    const bsw = 80;
    for (let y = 0; y < 512; y += bsh) {
      const rowOffset = (y / bsh) % 2 === 0 ? 0 : bsw / 2;
      for (let x = -bsw; x < 512 + bsw; x += bsw) {
        bsctx.fillStyle = (x + y) % 3 === 0 ? '#64748b' : ((x + y) % 3 === 1 ? '#526075' : '#3d4a5c');
        bsctx.fillRect(x + rowOffset + 2, y + 2, bsw - 4, bsh - 4);
        bsctx.strokeStyle = '#1e293b';
        bsctx.lineWidth = 2;
        bsctx.strokeRect(x + rowOffset + 2, y + 2, bsw - 4, bsh - 4);
      }
    }
    const bsTex = new THREE.CanvasTexture(bsCanvas);
    bsTex.wrapS = THREE.RepeatWrapping;
    bsTex.wrapT = THREE.RepeatWrapping;
    bsTex.repeat.set(4, 4);
    bsTex.needsUpdate = true;
    this.textures.bridgeStone = bsTex;

    // 15. Vietnamese Alley Ochre Wall & Signs
    const alCanvas = document.createElement('canvas');
    alCanvas.width = 512;
    alCanvas.height = 512;
    const alctx = alCanvas.getContext('2d');
    alctx.fillStyle = '#d97706'; // Warm yellow ochre plaster
    alctx.fillRect(0, 0, 512, 512);
    // Weathered plaster specks
    alctx.fillStyle = '#b45309';
    for (let k = 0; k < 60; k++) {
      alctx.fillRect(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 30, 4 + Math.random() * 12);
    }
    // Vintage French-Indochine green louvered window
    alctx.fillStyle = '#047857';
    alctx.fillRect(60, 100, 160, 220);
    alctx.fillRect(290, 100, 160, 220);
    alctx.strokeStyle = '#fef08a';
    alctx.lineWidth = 4;
    alctx.strokeRect(60, 100, 160, 220);
    alctx.strokeRect(290, 100, 160, 220);
    const alTex = new THREE.CanvasTexture(alCanvas);
    alTex.wrapS = THREE.RepeatWrapping;
    alTex.wrapT = THREE.RepeatWrapping;
    alTex.repeat.set(2, 2);
    alTex.needsUpdate = true;
    this.textures.alleyWall = alTex;

    // 16. Lake Park Lush Lawn Grass Texture
    const grCanvas = document.createElement('canvas');
    grCanvas.width = 512;
    grCanvas.height = 512;
    const grctx = grCanvas.getContext('2d');
    grctx.fillStyle = '#166534';
    grctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      for (let y = 0; y < 512; y += 16) {
        if ((x + y) % 3 === 0) {
          grctx.fillStyle = '#15803d';
          grctx.fillRect(x, y, 16, 16);
        } else if ((x + y) % 5 === 0) {
          grctx.fillStyle = '#22c55e';
          grctx.fillRect(x + 2, y + 2, 8, 8);
        }
      }
    }
    const grTex = new THREE.CanvasTexture(grCanvas);
    grTex.wrapS = THREE.RepeatWrapping;
    grTex.wrapT = THREE.RepeatWrapping;
    grTex.repeat.set(8, 8);
    grTex.needsUpdate = true;
    this.textures.parkGrass = grTex;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1120');
    // Panoramic city depth with scenic atmosphere
    this.scene.fog = new THREE.Fog('#0b1120', 35, 145);

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

    // 1. Isometric / Management Camera (Top-down tilted with full city panoramic range)
    this.isoCamera = new THREE.PerspectiveCamera(45, aspect, 0.5, 300);
    this.isoCamera.position.set(0, 18, 19);
    this.isoCamera.lookAt(0, 1.2, 0);

    // OrbitControls for Iso Mode
    if (window.THREE && THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.isoCamera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxPolarAngle = Math.PI / 2.05;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 110; // Extended zoom to view entire city, river & lake
      this.controls.target.set(0, 1.2, 0);
    }

    // 2. First-Person FPS Camera
    this.fpsCamera = new THREE.PerspectiveCamera(72, aspect, 0.1, 250);
    this.fpsCamera.position.copy(this.player.pos);
    this.fpsCamera.lookAt(0, 1.65, -5);

    // Default to Isometric
    this.activeCamera = this.isoCamera;
  }

  setupLights() {
    // Soft Ambient Light
    const ambient = new THREE.AmbientLight(0xfff6ea, 0.78);
    this.scene.add(ambient);

    // Directional Sunlight covering entire expansive city, river, bridge and lake
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.88);
    sunLight.position.set(15, 36, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 135;
    const d = 48;
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

  // Glass Storefront with Automatic Sliding Doors & Street Façade
  buildGlassStorefront(W, H, D) {
    const frontGroup = new THREE.Group();
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.2
    });
    const doorGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.1,
      metalness: 0.3
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.15 });

    const wallZ = D / 2; // 9.0

    // Top Header Frame above all front glass
    const topFrameGeo = new THREE.BoxGeometry(W, 0.8, 0.4);
    const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
    topFrame.position.set(0, H - 0.4, wallZ);
    frontGroup.add(topFrame);

    // Left glass wall: from X = -12 to X = -9.6 (width = 2.4, center = -10.8)
    const leftGlassGeo = new THREE.BoxGeometry(2.4, H - 0.8, 0.1);
    const leftGlass = new THREE.Mesh(leftGlassGeo, glassMat);
    leftGlass.position.set(-10.8, (H - 0.8) / 2, wallZ);
    frontGroup.add(leftGlass);

    // Left door pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, 0.35), frameMat);
    leftPillar.position.set(-9.6, H / 2, wallZ);
    frontGroup.add(leftPillar);

    // Right door pillar
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, 0.35), frameMat);
    rightPillar.position.set(-6.4, H / 2, wallZ);
    frontGroup.add(rightPillar);

    // Door Header Transom glass (above the sliding doors: Y from 3.3 to H - 0.8)
    const transomHeight = (H - 0.8) - 3.3;
    if (transomHeight > 0) {
      const transomGeo = new THREE.BoxGeometry(3.0, transomHeight, 0.1);
      const transomGlass = new THREE.Mesh(transomGeo, glassMat);
      transomGlass.position.set(-8.0, 3.3 + transomHeight / 2, wallZ);
      frontGroup.add(transomGlass);
    }

    // Door Track Beam
    const trackBeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.35), frameMat);
    trackBeam.position.set(-8.0, 3.3, wallZ);
    frontGroup.add(trackBeam);

    // 2 Automatic Sliding Glass Door Panels
    // Left Door Panel
    const leftDoor = new THREE.Group();
    const lDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.15, 0.08), doorGlassMat);
    lDoorPanel.position.set(0, 1.575, 0);
    leftDoor.add(lDoorPanel);
    const lFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.1), frameMat);
    lFrameTop.position.set(0, 3.15, 0);
    leftDoor.add(lFrameTop);
    const lFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.1), frameMat);
    lFrameBottom.position.set(0, 0.05, 0);
    leftDoor.add(lFrameBottom);
    // Vertical chrome handle
    const lHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.12), chromeMat);
    lHandle.position.set(0.62, 1.5, 0);
    leftDoor.add(lHandle);
    leftDoor.position.set(-8.75, 0, wallZ);
    frontGroup.add(leftDoor);

    // Right Door Panel
    const rightDoor = new THREE.Group();
    const rDoorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.15, 0.08), doorGlassMat);
    rDoorPanel.position.set(0, 1.575, 0);
    rightDoor.add(rDoorPanel);
    const rFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.1), frameMat);
    rFrameTop.position.set(0, 3.15, 0);
    rightDoor.add(rFrameTop);
    const rFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.1, 0.1), frameMat);
    rFrameBottom.position.set(0, 0.05, 0);
    rightDoor.add(rFrameBottom);
    const rHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.12), chromeMat);
    rHandle.position.set(-0.62, 1.5, 0);
    rightDoor.add(rHandle);
    rightDoor.position.set(-7.25, 0, wallZ);
    frontGroup.add(rightDoor);

    this.slidingDoors = {
      left: leftDoor,
      right: rightDoor,
      leftClosedX: -8.75,
      rightClosedX: -7.25,
      leftOpenX: -10.15,
      rightOpenX: -5.85,
      currentOpen: 0,
      targetOpen: 0
    };

    // Right large storefront showcase glass (from X = -6.4 to +12, width = 18.4, center = 2.8)
    const rightGlassGeo = new THREE.BoxGeometry(18.4, H - 0.8, 0.1);
    const rightGlass = new THREE.Mesh(rightGlassGeo, glassMat);
    rightGlass.position.set(2.8, (H - 0.8) / 2, wallZ);
    frontGroup.add(rightGlass);

    // Vertical Mullions every 3.6m along the right showcase glass
    for (let mx = -2.8; mx <= 9.5; mx += 3.6) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, H - 0.8, 0.2), frameMat);
      mullion.position.set(mx, (H - 0.8) / 2, wallZ);
      frontGroup.add(mullion);
    }

    // Modern Striped Awning above entrance
    this.buildEntranceAwning(frontGroup, -8.0, 3.8, wallZ);

    // Grand Storefront Signboard above roof facing the street
    this.buildGrandOutdoorSign(frontGroup, 0, H + 0.9, wallZ + 0.1);

    // Welcome Door Mat inside & outside entrance
    const matGeo = new THREE.PlaneGeometry(2.4, 1.4);
    const matMaterial = new THREE.MeshBasicMaterial({ map: this.textures.welcomeMat });
    const matMeshIn = new THREE.Mesh(matGeo, matMaterial);
    matMeshIn.rotation.x = -Math.PI / 2;
    matMeshIn.position.set(-8, 0.02, wallZ - 1.0);
    this.scene.add(matMeshIn);

    const matMeshOut = new THREE.Mesh(matGeo, matMaterial);
    matMeshOut.rotation.x = -Math.PI / 2;
    matMeshOut.position.set(-8, 0.02, wallZ + 1.0);
    this.scene.add(matMeshOut);

    this.scene.add(frontGroup);
  }

  // Entrance Striped Awning Canopy
  buildEntranceAwning(parentGroup, centerX, baseY, baseZ) {
    const awningGroup = new THREE.Group();
    const width = 6.8;
    const depth = 2.6;
    const drop = 0.7;

    const canvasMat = new THREE.MeshStandardMaterial({
      map: this.textures.awning,
      roughness: 0.65,
      side: THREE.DoubleSide
    });

    const awningMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), canvasMat);
    awningMesh.position.set(centerX, baseY - drop / 2, baseZ + depth / 2);
    awningMesh.rotation.x = Math.atan2(drop, depth);
    awningGroup.add(awningMesh);

    // Front Valance fringe
    const valanceMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.4), valanceMat);
    valance.position.set(centerX, baseY - drop - 0.2, baseZ + depth);
    awningGroup.add(valance);

    // Support metal struts
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
    [-width / 2 + 0.3, width / 2 - 0.3].forEach(sx => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, depth * 1.05), strutMat);
      strut.position.set(centerX + sx, baseY - drop / 2, baseZ + depth / 2);
      strut.rotation.x = Math.PI / 2 - Math.atan2(drop, depth);
      awningGroup.add(strut);
    });

    parentGroup.add(awningGroup);
  }

  // Grand Storefront Signboard above roof
  buildGrandOutdoorSign(parentGroup, x, y, z) {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, y, z);

    // Signboard backplate
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(16, 1.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    signGroup.add(plate);

    // Signboard face with graphic texture
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(15.6, 1.6),
      new THREE.MeshBasicMaterial({ map: this.textures.signboard })
    );
    face.position.z = 0.16;
    signGroup.add(face);

    // 2 Accent Spotlights pointing up at sign
    [-5, 5].forEach(lx => {
      const spot = new THREE.SpotLight(0xfffaed, 1.5, 9, Math.PI / 4, 0.3);
      spot.position.set(lx, y - 0.6, z + 2.0);
      spot.target.position.set(lx, y, z);
      this.scene.add(spot);
      this.scene.add(spot.target);
    });

    parentGroup.add(signGroup);
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

  // COMPREHENSIVE EXTERIOR CITY ENVIRONMENT: STREET, RIVER, BRIDGE, ALLEY & LAKE
  buildExteriorStreet(W, D) {
    this.streetGroup = new THREE.Group();
    const frontZ = D / 2; // 9.0

    // 1. Main Sidewalk in front of Store (Z: 9.0 -> 17.0, X: -22 to +15)
    const swGeo = new THREE.PlaneGeometry(37, 8);
    const swMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalk,
      roughness: 0.75,
      metalness: 0.05
    });
    const sidewalk = new THREE.Mesh(swGeo, swMat);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(-3.5, 0.01, frontZ + 4);
    sidewalk.receiveShadow = true;
    this.streetGroup.add(sidewalk);

    // Stone Curb Edge along Sidewalk (Z = 17.0)
    const curbGeo = new THREE.BoxGeometry(37, 0.22, 0.35);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(-3.5, 0.05, frontZ + 8);
    this.streetGroup.add(curb);

    // 2. Asphalt Road with Zebra Crosswalk (Z: 17.0 -> 33.0, width 44m from X = -22 to +22)
    const roadGeo = new THREE.PlaneGeometry(44, 16);
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.road,
      roughness: 0.85
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.06, frontZ + 16);
    road.receiveShadow = true;
    this.streetGroup.add(road);

    // 3. Opposite Sidewalk (Z: 33.0 -> 38.0, width 44m)
    const oppSwGeo = new THREE.PlaneGeometry(44, 5);
    const oppSw = new THREE.Mesh(oppSwGeo, swMat);
    oppSw.rotation.x = -Math.PI / 2;
    oppSw.position.set(0, 0.01, frontZ + 25.5);
    oppSw.receiveShadow = true;
    this.streetGroup.add(oppSw);

    // 4. Street Trees & Planter Flower Boxes along curb
    this.createStreetTreesAndFlowers(frontZ);

    // 5. Street Lamps (Đèn đường chiếu sáng ban đêm)
    this.createStreetLamps(frontZ);

    // 6. Interactive Outdoor Vending Machine (Máy bán nước tự động)
    this.createOutdoorVendingMachine(-4.2, 0, frontZ + 1.2);

    // 7. Interactive Chalkboard Standee (Bảng quảng cáo vỉa hè)
    this.createSidewalkStandee(-8.0, 0, frontZ + 3.2);

    // 8. Park Bench (Băng ghế ngoài phố)
    this.createOutdoorBench(7.5, 0, frontZ + 2.0);

    // 9. Parked Motorbike & Bicycle (Xe máy & Xe đạp đỗ trước quán)
    this.createParkedVehicles(3.2, 0, frontZ + 1.8);

    // 10. Delivery Cargo Pallet (Khu kiện hàng vừa giao tới)
    this.createDeliveryPallet(-13.5, 0, frontZ + 1.5);

    // 11. Street Public Trash Bin (Thùng rác ngoài phố)
    this.createStreetTrashBin(-11.5, 0, frontZ + 1.5);

    // 12. Dòng sông & Bờ kè đá (River & Stone Embankments)
    this.createRiverAndEmbankment(frontZ);

    // 13. Cây cầu vòm đá (Arched Stone Bridge spanning across River)
    this.createArchedBridge(frontZ);

    // 14. Hẻm phố cổ truyền Việt Nam (Narrow Vietnamese Townhouse Alley)
    this.createVietnameseAlley(frontZ);

    // 15. Hồ nước & Thủy Tạ (Scenic Lake Park, Lotus & Lake Pavilion)
    this.createLakeParkAndPavilion();

    // 16. Nhà & Thành phố (City Buildings, Townhouses & Skyline)
    this.createSurroundingCityBuildings(frontZ);

    // 17. Animated Traffic Cars across Road & Bridge
    this.initStreetTraffic(frontZ + 16);

    // 18. Pedestrians on Sidewalk & Bridge
    this.initSidewalkPedestrians(frontZ + 5.0);

    this.scene.add(this.streetGroup);
  }


  // Street Trees with Stone Planters and Colorful Flowers
  createStreetTreesAndFlowers(frontZ) {
    const treeXPositions = [-14, -1, 14];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.9 });
    const leavesDark = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const leavesLight = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const flowerColors = [0xef4444, 0xfbbf24, 0xec4899, 0x38bdf8];

    treeXPositions.forEach(tx => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, frontZ + 6.8);

      // Stone Planter Box
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), planterMat);
      planter.position.y = 0.175;
      treeGroup.add(planter);

      // Soil inside planter
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 1.45), soilMat);
      soil.position.y = 0.35;
      treeGroup.add(soil);

      // Tree Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 8), trunkMat);
      trunk.position.y = 1.9;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Tiered Low-Poly Leaf Canopy
      const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.0, 7), leavesDark);
      leaf1.position.y = 3.6;
      leaf1.castShadow = true;
      treeGroup.add(leaf1);

      const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 7), leavesLight);
      leaf2.position.y = 4.6;
      leaf2.castShadow = true;
      treeGroup.add(leaf2);

      const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 7), leavesDark);
      leaf3.position.y = 5.4;
      treeGroup.add(leaf3);

      // Colorful flowers around trunk base
      for (let fi = 0; fi < 6; fi++) {
        const ang = (fi / 6) * Math.PI * 2;
        const dist = 0.52;
        const fMat = new THREE.MeshStandardMaterial({ color: flowerColors[fi % flowerColors.length] });
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), fMat);
        flower.position.set(Math.cos(ang) * dist, 0.44, Math.sin(ang) * dist);
        treeGroup.add(flower);
      }

      this.streetGroup.add(treeGroup);
    });
  }

  // Modern Street Lamps with Warm Ambient Illumination
  createStreetLamps(frontZ) {
    const lampX = [-8, 8];
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    lampX.forEach(lx => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(lx, 0, frontZ + 7.4);

      // Base collar
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.5, 8), poleMat);
      base.position.y = 0.25;
      lampGroup.add(base);

      // Vertical Pole (height 4.6m)
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.6, 8), poleMat);
      pole.position.y = 2.55;
      lampGroup.add(pole);

      // Curved top arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), poleMat);
      arm.position.set(0, 4.75, -0.35);
      lampGroup.add(arm);

      // Lantern head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.45), headMat);
      head.position.set(0, 4.68, -0.7);
      lampGroup.add(head);

      // Glowing lens
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.38), glassMat);
      lens.position.set(0, 4.54, -0.7);
      lampGroup.add(lens);

      // Warm street illumination light
      const lampLight = new THREE.PointLight(0xfef08a, 1.1, 16, 1.2);
      lampLight.position.set(0, 4.4, -0.7);
      lampGroup.add(lampLight);

      this.streetGroup.add(lampGroup);
    });
  }

  // Interactive Outdoor Vending Machine (Máy bán nước)
  createOutdoorVendingMachine(x, y, z) {
    const vmGroup = new THREE.Group();
    vmGroup.position.set(x, y, z);

    // Body Cabinet
    const bodyGeo = new THREE.BoxGeometry(1.4, 2.4, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.3, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    body.receiveShadow = true;
    vmGroup.add(body);

    // Front Panel with Texture
    const frontGeo = new THREE.PlaneGeometry(1.3, 2.3);
    const frontMat = new THREE.MeshBasicMaterial({ map: this.textures.vending });
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.set(0, 1.2, 0.46);
    vmGroup.add(front);

    // Soft Glowing Accent Light
    const vmLight = new THREE.PointLight(0x38bdf8, 0.9, 4.5);
    vmLight.position.set(0, 1.5, 0.8);
    vmGroup.add(vmLight);

    // Interactive Hitbox
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.5, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 1.2;
    hitBox.userData = { type: 'vending_machine' };
    vmGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    this.streetGroup.add(vmGroup);
  }

  // Interactive Sidewalk A-Frame Chalkboard Standee (Bảng quảng cáo)
  createSidewalkStandee(x, y, z) {
    const standeeGroup = new THREE.Group();
    standeeGroup.position.set(x, y, z);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const boardMat = new THREE.MeshBasicMaterial({ map: this.textures.chalkboard });

    // Front Board (leaning slightly backward)
    const fBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.3), boardMat);
    fBoard.position.set(0, 0.72, 0.15);
    fBoard.rotation.x = -0.15;
    standeeGroup.add(fBoard);

    // Back Board
    const bBoard = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.3), boardMat);
    bBoard.position.set(0, 0.72, -0.15);
    bBoard.rotation.x = 0.15;
    bBoard.rotation.y = Math.PI;
    standeeGroup.add(bBoard);

    // Wooden A-Frame Legs
    [-0.44, 0.44].forEach(lx => {
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), frameMat);
      leg1.position.set(lx, 0.75, 0.16);
      leg1.rotation.x = -0.15;
      standeeGroup.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), frameMat);
      leg2.position.set(lx, 0.75, -0.16);
      leg2.rotation.x = 0.15;
      standeeGroup.add(leg2);
    });

    // Interactive Hitbox
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.6, 0.9),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.75;
    hitBox.userData = { type: 'sidewalk_sign' };
    standeeGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    this.streetGroup.add(standeeGroup);
  }

  // Interactive Park Bench (Băng ghế nghỉ ngơi ngoài phố)
  createOutdoorBench(x, y, z) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    // 2 Cast Iron Leg Frames
    [-0.9, 0.9].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), ironMat);
      leg.position.set(lx, 0.25, 0);
      benchGroup.add(leg);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), ironMat);
      arm.position.set(lx, 0.65, -0.25);
      benchGroup.add(arm);
    });

    // Seat Wood Slats
    for (let si = -0.22; si <= 0.22; si += 0.11) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 0.08), woodMat);
      slat.position.set(0, 0.5, si);
      benchGroup.add(slat);
    }

    // Backrest Wood Slats
    for (let bi = 0.65; bi <= 0.95; bi += 0.12) {
      const bSlat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.04), woodMat);
      bSlat.position.set(0, bi, -0.28);
      benchGroup.add(bSlat);
    }

    // Interactive Hitbox
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.1, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.55;
    hitBox.userData = { type: 'bench' };
    benchGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    this.streetGroup.add(benchGroup);
  }

  // Parked Motorbike & Bicycle (Xe máy & Xe đạp đỗ trước quán)
  createParkedVehicles(x, y, z) {
    const vGroup = new THREE.Group();
    vGroup.position.set(x, y, z);

    // 1. Vietnamese Scooter / Motorbike (Xe tay ga)
    const scooter = new THREE.Group();
    scooter.position.set(0, 0, 0);
    scooter.rotation.y = 0.2;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }); // Red sporty scooter
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });

    // Scooter Body & Floorboard
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 1.3), bodyMat);
    sBody.position.set(0, 0.45, 0);
    scooter.add(sBody);

    // Seat
    const sSeat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.75), blackMat);
    sSeat.position.set(0, 0.74, -0.15);
    scooter.add(sSeat);

    // Front Handlebars & Fairing
    const sFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.75, 0.35), bodyMat);
    sFront.position.set(0, 0.65, 0.5);
    scooter.add(sFront);

    const sBars = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65), chromeMat);
    sBars.rotation.z = Math.PI / 2;
    sBars.position.set(0, 1.05, 0.45);
    scooter.add(sBars);

    // Headlight
    const sLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    sLight.position.set(0, 0.9, 0.68);
    scooter.add(sLight);

    // 2 Wheels (Black rubber cylinders)
    [-0.55, 0.55].forEach(wz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 12), blackMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.24, wz);
      scooter.add(wheel);
    });

    vGroup.add(scooter);

    // 2. Commuter Bicycle parked next to scooter
    const bike = new THREE.Group();
    bike.position.set(1.1, 0, 0.1);
    bike.rotation.y = -0.15;
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5 }); // Cyan frame

    // Frame tubes
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7), bikeMat);
    topTube.rotation.x = Math.PI / 2;
    topTube.position.set(0, 0.68, 0);
    bike.add(topTube);

    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75), bikeMat);
    downTube.rotation.x = Math.PI / 4;
    downTube.position.set(0, 0.45, 0.2);
    bike.add(downTube);

    // Bicycle Wheels
    [-0.5, 0.5].forEach(bwz => {
      const bWheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 20), blackMat);
      bWheel.rotation.y = Math.PI / 2;
      bWheel.position.set(0, 0.3, bwz);
      bike.add(bWheel);
    });

    vGroup.add(bike);
    this.streetGroup.add(vGroup);
  }

  // Delivery Cargo Pallet (Khu kiện hàng giao tới)
  createDeliveryPallet(x, y, z) {
    const palletGroup = new THREE.Group();
    palletGroup.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });

    // Wooden Pallet Base
    const palletBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.4), woodMat);
    palletBase.position.y = 0.07;
    palletGroup.add(palletBase);

    // 3 Stacked Cardboard Delivery Boxes
    const boxConfigs = [
      { sx: 0.65, sy: 0.5, sz: 0.65, px: -0.28, py: 0.39, pz: -0.25 },
      { sx: 0.6, sy: 0.55, sz: 0.6, px: 0.3, py: 0.41, pz: 0.22 },
      { sx: 0.55, sy: 0.45, sz: 0.55, px: 0.0, py: 0.88, pz: 0.0 }
    ];

    boxConfigs.forEach(b => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(b.sx, b.sy, b.sz), boxMat);
      box.position.set(b.px, b.py, b.pz);
      box.castShadow = true;
      palletGroup.add(box);
    });

    // Interactive Hitbox
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.3, 1.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.65;
    hitBox.userData = { type: 'delivery_pallet' };
    palletGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    this.streetGroup.add(palletGroup);
  }

  // Street Public Trash Bin (Thùng rác ngoài phố)
  createStreetTrashBin(x, y, z) {
    const binGroup = new THREE.Group();
    binGroup.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });

    // Bin Cylinder Body
    const binBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 12), metalMat);
    binBody.position.y = 0.45;
    binGroup.add(binBody);

    // Green Hood/Lid
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.15, 12), greenMat);
    lid.position.y = 0.92;
    binGroup.add(lid);

    // Interactive Hitbox
    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.2, 0.9),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.5;
    hitBox.userData = { type: 'outdoor_trash' };
    binGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    this.streetGroup.add(binGroup);
  }

  // 12. DÒNG SÔNG & BỜ KÈ ĐÁ (Scenic River & Stone Embankments)
  createRiverAndEmbankment(frontZ) {
    const riverGroup = new THREE.Group();
    const riverMinX = -38;
    const riverMaxX = -22;
    const riverCenterX = (riverMinX + riverMaxX) / 2; // -30
    const riverWidth = riverMaxX - riverMinX; // 16
    const riverLength = 84;
    const riverCenterZ = 30;
    const waterY = -1.25;

    // 1. Water Surface Mesh with caustic reflection
    const waterGeo = new THREE.PlaneGeometry(riverWidth, riverLength);
    const waterMat = new THREE.MeshStandardMaterial({
      map: this.textures.water,
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88
    });
    const riverWater = new THREE.Mesh(waterGeo, waterMat);
    riverWater.rotation.x = -Math.PI / 2;
    riverWater.position.set(riverCenterX, waterY, riverCenterZ);
    riverWater.receiveShadow = true;
    riverGroup.add(riverWater);
    this.waterSurfaces.push(riverWater);

    // River Bed (Bottom Sand/Mud)
    const bedGeo = new THREE.PlaneGeometry(riverWidth, riverLength);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });
    const riverBed = new THREE.Mesh(bedGeo, bedMat);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(riverCenterX, waterY - 1.2, riverCenterZ);
    riverGroup.add(riverBed);

    // 2. Stone Embankments (Bờ kè đá hai bên sông)
    const bankWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.bridgeStone,
      roughness: 0.8,
      metalness: 0.1
    });
    const stoneRailMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    const warmGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    [riverMaxX, riverMinX].forEach((bx, bIdx) => {
      const isEastBank = bIdx === 0;
      const wallNormal = isEastBank ? -1 : 1;

      // Vertical Stone Retaining Wall
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, riverLength), bankWallMat);
      wallMesh.position.set(bx + wallNormal * 0.4, -0.1, riverCenterZ);
      wallMesh.receiveShadow = true;
      riverGroup.add(wallMesh);

      // Stone Coping Curb at top of bank
      const coping = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, riverLength), stoneRailMat);
      coping.position.set(bx + wallNormal * 0.4, 0.08, riverCenterZ);
      riverGroup.add(coping);

      // Stone Balustrade (Lan can bờ kè) - broken at bridge crossing (Z from 16.5 to 33.5)
      const balustradeSegments = [
        { zStart: -12, zEnd: 16.5 },
        { zStart: 33.5, zEnd: 72 }
      ];

      balustradeSegments.forEach(seg => {
        const segLen = seg.zEnd - seg.zStart;
        const segCenterZ = (seg.zStart + seg.zEnd) / 2;

        // Top handrail
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, segLen), stoneRailMat);
        handrail.position.set(bx + wallNormal * 0.2, 0.85, segCenterZ);
        riverGroup.add(handrail);

        // Baluster posts every 3.2m
        for (let pz = seg.zStart; pz <= seg.zEnd; pz += 3.2) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.24), stoneRailMat);
          post.position.set(bx + wallNormal * 0.2, 0.45, pz);
          post.castShadow = true;
          riverGroup.add(post);

          // Classical Riverside Lanterns on selected posts
          if (Math.abs(pz % 9.6) < 1.0) {
            const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8), lampPoleMat);
            lanternPost.position.set(bx + wallNormal * 0.2, 1.7, pz);
            riverGroup.add(lanternPost);

            const lanternHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), warmGlowMat);
            lanternHead.position.set(bx + wallNormal * 0.2, 2.7, pz);
            riverGroup.add(lanternHead);

            const lanternLight = new THREE.PointLight(0xfef08a, 0.85, 12, 1.5);
            lanternLight.position.set(bx + wallNormal * 0.2, 2.7, pz);
            riverGroup.add(lanternLight);
          }
        }
      });

      // Riverside Stone Landing Steps (Bậc thang đá xuống bến sông)
      const stepsZ = isEastBank ? 8.0 : 42.0;
      for (let s = 0; s < 5; s++) {
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.24, 3.2), bankWallMat);
        stepMesh.position.set(bx + wallNormal * (0.8 + s * 0.4), -0.15 - s * 0.22, stepsZ);
        stepMesh.receiveShadow = true;
        riverGroup.add(stepMesh);
      }
    });

    // 3. Floating Vietnamese Wooden Sampan Boat (Chiếc thuyền nan mộc mạc)
    const boat = new THREE.Group();
    boat.position.set(-29.5, waterY + 0.15, 7.8);
    boat.rotation.y = 0.35;

    const boatWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, side: THREE.DoubleSide });

    // Boat Hull (slender wooden canoe shape)
    const hullBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 5.2), boatWoodMat);
    hullBase.position.y = 0.1;
    hullBase.castShadow = true;
    boat.add(hullBase);

    // Pointed Bow (Mũi thuyền)
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 4), boatWoodMat);
    bow.rotation.x = -Math.PI / 2;
    bow.position.set(0, 0.22, 3.1);
    boat.add(bow);

    // Stern (Đuôi thuyền)
    const stern = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 4), boatWoodMat);
    stern.rotation.x = Math.PI / 2;
    stern.position.set(0, 0.22, -3.0);
    boat.add(stern);

    // Arched Bamboo Mat Canopy (Mui thuyền lá tre)
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 2.4, 16, 1, true, 0, Math.PI),
      canopyMat
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 0.45, 0.1);
    boat.add(canopy);

    // Wooden Oar (Mái chèo gác đuôi thuyền)
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2), darkWoodMat);
    oar.position.set(0.7, 0.45, -2.1);
    oar.rotation.x = 0.5;
    oar.rotation.z = -0.3;
    boat.add(oar);

    // Lantern hanging at the bow
    const boatLantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), warmGlowMat);
    boatLantern.position.set(0, 0.4, 3.5);
    boat.add(boatLantern);

    const bLight = new THREE.PointLight(0xfef08a, 0.7, 6);
    bLight.position.set(0, 0.4, 3.5);
    boat.add(bLight);

    riverGroup.add(boat);
    this.riverBoat = boat;

    this.streetGroup.add(riverGroup);
  }

  // 13. CÂY CẦU VÒM ĐÁ (Arched Stone Bridge across the River)
  createArchedBridge(frontZ) {
    const bridgeGroup = new THREE.Group();
    const bridgeMinX = -38;
    const bridgeMaxX = -22;
    const bridgeCenterX = -30;
    const bridgeSpan = bridgeMaxX - bridgeMinX; // 16m
    const bridgeZ = frontZ + 16; // 25.0
    const bridgeWidth = 16.0; // Z: 17.0 -> 33.0

    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.textures.bridgeStone,
      roughness: 0.7,
      metalness: 0.1
    });
    const stonePillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
    const lanternGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const redAccentMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });

    // 1. Arched Bridge Road Deck (Gently curving roadway)
    const segments = 12;
    const deckMat = new THREE.MeshStandardMaterial({
      map: this.textures.road,
      roughness: 0.8
    });

    for (let i = 0; i < segments; i++) {
      const segWidth = bridgeSpan / segments;
      const x1 = bridgeMinX + i * segWidth;
      const x2 = x1 + segWidth;
      const cx = (x1 + x2) / 2;

      // Parabolic arch profile
      const t = (cx - bridgeCenterX) / (bridgeSpan / 2);
      const archY = Math.max(0, (1 - t * t) * 0.38);

      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(segWidth + 0.05, 0.6, bridgeWidth), stoneMat);
      segMesh.position.set(cx, archY - 0.25, bridgeZ);
      segMesh.receiveShadow = true;
      bridgeGroup.add(segMesh);

      // Roadway asphalt surface on top
      const roadTop = new THREE.Mesh(new THREE.PlaneGeometry(segWidth + 0.02, bridgeWidth - 4.0), deckMat);
      roadTop.rotation.x = -Math.PI / 2;
      roadTop.position.set(cx, archY + 0.06, bridgeZ);
      roadTop.receiveShadow = true;
      bridgeGroup.add(roadTop);

      // Sidewalk walkways on north & south sides of bridge
      const swMat = new THREE.MeshStandardMaterial({ map: this.textures.sidewalk, roughness: 0.75 });
      [-bridgeWidth / 2 + 1.0, bridgeWidth / 2 - 1.0].forEach(sz => {
        const swMesh = new THREE.Mesh(new THREE.PlaneGeometry(segWidth + 0.02, 2.0), swMat);
        swMesh.rotation.x = -Math.PI / 2;
        swMesh.position.set(cx, archY + 0.08, bridgeZ + sz);
        bridgeGroup.add(swMesh);
      });
    }

    // 2. Central River Pier & Cutwaters Under Bridge
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const centralPier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, bridgeWidth + 1.2), pierMat);
    centralPier.position.set(bridgeCenterX, -0.2, bridgeZ);
    bridgeGroup.add(centralPier);

    [-bridgeWidth / 2 - 0.6, bridgeWidth / 2 + 0.6].forEach(pz => {
      const cutwater = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.6, 4), pierMat);
      cutwater.position.set(bridgeCenterX, -0.2, bridgeZ + pz);
      cutwater.rotation.y = Math.PI / 4;
      bridgeGroup.add(cutwater);
    });

    // 3. Ornate Bridge Stone Balustrades (Lan can cầu)
    [-bridgeWidth / 2 + 0.15, bridgeWidth / 2 - 0.15].forEach(sideZ => {
      for (let i = 0; i < segments; i++) {
        const segWidth = bridgeSpan / segments;
        const cx = bridgeMinX + (i + 0.5) * segWidth;
        const t = (cx - bridgeCenterX) / (bridgeSpan / 2);
        const archY = Math.max(0, (1 - t * t) * 0.38);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(segWidth + 0.05, 0.16, 0.22), railMat);
        rail.position.set(cx, archY + 0.95, bridgeZ + sideZ);
        bridgeGroup.add(rail);

        const baluster = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), stonePillarMat);
        baluster.position.set(cx, archY + 0.5, bridgeZ + sideZ);
        baluster.castShadow = true;
        bridgeGroup.add(baluster);
      }
    });

    // 4. Four Monumental Bridgehead Lantern Pillars (Trụ cầu tứ trụ phong cách cổ kính)
    const cornerOffsets = [
      { x: bridgeMaxX, z: bridgeZ - bridgeWidth / 2 },
      { x: bridgeMaxX, z: bridgeZ + bridgeWidth / 2 },
      { x: bridgeMinX, z: bridgeZ - bridgeWidth / 2 },
      { x: bridgeMinX, z: bridgeZ + bridgeWidth / 2 }
    ];

    cornerOffsets.forEach(pos => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(pos.x, 0, pos.z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, 1.1), stonePillarMat);
      base.position.y = 0.6;
      base.castShadow = true;
      pillarGroup.add(base);

      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), redAccentMat);
      shaft.position.y = 2.0;
      shaft.castShadow = true;
      pillarGroup.add(shaft);

      const pRoof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 4), stonePillarMat);
      pRoof.position.y = 3.3;
      pRoof.rotation.y = Math.PI / 4;
      pillarGroup.add(pRoof);

      const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.48), lanternGlowMat);
      chamber.position.y = 2.9;
      pillarGroup.add(chamber);

      const pLight = new THREE.PointLight(0xfef08a, 1.1, 14, 1.4);
      pLight.position.set(0, 2.9, 0);
      pillarGroup.add(pLight);

      bridgeGroup.add(pillarGroup);
    });

    // 5. Interactive Bridge Viewpoint Hitbox
    const viewHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 2.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    viewHitbox.position.set(bridgeCenterX, 0.9, bridgeZ - bridgeWidth / 2 + 1.2);
    viewHitbox.userData = { type: 'bridge_view' };
    bridgeGroup.add(viewHitbox);
    this.interactiveObjects.push(viewHitbox);

    this.streetGroup.add(bridgeGroup);
  }

  // 14. HẺM PHỐ CỔ TRUYỀN VIỆT NAM (Narrow Townhouse Alley)
  createVietnameseAlley(frontZ) {
    const alleyGroup = new THREE.Group();
    const alleyX = 17.5; // center of alley
    const alleyWidth = 4.8;
    const alleyMinZ = frontZ; // 9.0
    const alleyMaxZ = 43.0; // connects directly to the Lake Park!
    const alleyLen = alleyMaxZ - alleyMinZ;
    const alleyCenterZ = (alleyMinZ + alleyMaxZ) / 2;

    const alleyWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.alleyWall,
      roughness: 0.75,
      metalness: 0.05
    });
    const stoneFloorMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalk,
      roughness: 0.85
    });

    // 1. Cobblestone Pavement Floor in Alley
    const floorGeo = new THREE.PlaneGeometry(alleyWidth, alleyLen);
    const floor = new THREE.Mesh(floorGeo, stoneFloorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(alleyX, 0.02, alleyCenterZ);
    floor.receiveShadow = true;
    alleyGroup.add(floor);

    // 2. Flanking Multi-Story Vietnamese Townhouses (Nhà ống phố cổ màu vàng nghệ)
    // Left side townhouses: X = 15.1
    const leftHouses = [
      { z: 15, len: 10, h: 9.5, color: 0xd97706 },
      { z: 27, len: 12, h: 12.0, color: 0xb45309 },
      { z: 38, len: 8, h: 8.5, color: 0x92400e }
    ];
    leftHouses.forEach(h => {
      const house = new THREE.Mesh(new THREE.BoxGeometry(6.0, h.h, h.len), alleyWallMat);
      house.position.set(alleyX - alleyWidth / 2 - 3.0, h.h / 2, h.z);
      house.receiveShadow = true;
      house.castShadow = true;
      alleyGroup.add(house);

      // Balconies with ornate black iron railings
      for (let by = 3.6; by < h.h - 1.5; by += 3.2) {
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.9, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
        );
        balcony.position.set(alleyX - alleyWidth / 2 + 0.35, by, h.z);
        alleyGroup.add(balcony);

        // Bougainvillea flowers (Hoa giấy tím hồng rực rỡ)
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.7 });
        const flowerPot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.8), flowerMat);
        flowerPot.position.set(alleyX - alleyWidth / 2 + 0.35, by + 0.5, h.z);
        alleyGroup.add(flowerPot);
      }
    });

    // Right side townhouses: X = 19.9
    const rightHouses = [
      { z: 14, len: 9, h: 11.0, color: 0xd97706 },
      { z: 25, len: 11, h: 13.5, color: 0x78350f },
      { z: 37, len: 11, h: 9.0, color: 0xb45309 }
    ];
    rightHouses.forEach(h => {
      const house = new THREE.Mesh(new THREE.BoxGeometry(6.0, h.h, h.len), alleyWallMat);
      house.position.set(alleyX + alleyWidth / 2 + 3.0, h.h / 2, h.z);
      house.receiveShadow = true;
      house.castShadow = true;
      alleyGroup.add(house);

      // Wooden French-style louvered shutter windows
      for (let wy = 3.2; wy < h.h - 1.5; wy += 3.0) {
        const shutterMat = new THREE.MeshStandardMaterial({ color: 0x047857 }); // Indochine green
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 1.2), shutterMat);
        win.position.set(alleyX + alleyWidth / 2 + 0.05, wy, h.z);
        alleyGroup.add(win);
      }
    });

    // 3. Overhead Crisscrossing Festive String Lights (Dây đèn lồng phố cổ lung linh)
    const lanternColors = [0xfef08a, 0xef4444, 0x38bdf8, 0xfbbf24];
    for (let lz = alleyMinZ + 4; lz <= alleyMaxZ - 4; lz += 4.5) {
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, alleyWidth * 1.05), wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(alleyX, 4.2, lz);
      alleyGroup.add(wire);

      // 3 hanging glowing lanterns on each wire
      [-alleyWidth * 0.3, 0, alleyWidth * 0.3].forEach((ox, li) => {
        const lColor = lanternColors[(Math.floor(lz) + li) % lanternColors.length];
        const lanternMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8),
          new THREE.MeshBasicMaterial({ color: lColor })
        );
        lanternMesh.position.set(alleyX + ox, 3.85, lz);
        lanternMesh.scale.set(1, 1.3, 1);
        alleyGroup.add(lanternMesh);

        if (li === 1 && lz % 9 < 5) {
          const sLight = new THREE.PointLight(lColor, 0.7, 7, 1.8);
          sLight.position.set(alleyX, 3.7, lz);
          alleyGroup.add(sLight);
        }
      });
    }

    // 4. Vietnamese Street Food Cart (Xe đẩy Bánh mì & Nước mía vỉa hè)
    const cartX = alleyX + 1.2;
    const cartZ = 18.0;
    const cart = new THREE.Group();
    cart.position.set(cartX, 0, cartZ);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });

    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.9), steelMat);
    cartBody.position.y = 0.55;
    cartBody.castShadow = true;
    cart.add(cartBody);

    const showcase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.8), glassMat);
    showcase.position.set(0, 1.3, 0);
    cart.add(showcase);

    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    for (let bi = -0.5; bi <= 0.5; bi += 0.25) {
      const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8), breadMat);
      loaf.rotation.z = Math.PI / 2;
      loaf.position.set(bi, 1.15, 0);
      cart.add(loaf);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6), steelMat);
    pole.position.set(0.7, 1.3, 0);
    cart.add(pole);

    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 8), blueMat);
    umbrella.position.set(0.7, 2.5, 0);
    cart.add(umbrella);

    const stoolMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    [-0.8, -1.3].forEach(sx => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12), stoolMat);
      stool.position.set(sx, 0.16, 0.6);
      cart.add(stool);
    });

    const signGeo = new THREE.PlaneGeometry(1.4, 0.25);
    const signTex = new THREE.CanvasTexture((() => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥖 BÁNH MÌ NÓNG', 128, 42);
      return c;
    })());
    const cartSign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: signTex }));
    cartSign.position.set(0, 0.95, 0.46);
    cart.add(cartSign);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.8, 1.6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 0.9;
    hitBox.userData = { type: 'alley_food' };
    cart.add(hitBox);
    this.interactiveObjects.push(hitBox);

    alleyGroup.add(cart);

    this.streetGroup.add(alleyGroup);
  }

  // 15. HỒ NƯỚC & THỦY TẠ (Scenic Lake Park, Lotus & Lake Pavilion)
  createLakeParkAndPavilion() {
    const lakeGroup = new THREE.Group();
    const parkMinX = 5.0;
    const parkMaxX = 36.0;
    const parkMinZ = 42.0;
    const parkMaxZ = 68.0;
    const parkWidth = parkMaxX - parkMinX; // 31m
    const parkLength = parkMaxZ - parkMinZ; // 26m
    const parkCenterX = (parkMinX + parkMaxX) / 2; // 20.5
    const parkCenterZ = (parkMinZ + parkMaxZ) / 2; // 55.0

    const lakeMinX = 8.5;
    const lakeMaxX = 33.5;
    const lakeMinZ = 45.0;
    const lakeMaxZ = 65.0;
    const lakeCenterX = 21.0;
    const lakeCenterZ = 55.0;
    const lakeWaterY = -0.4;

    const grassMat = new THREE.MeshStandardMaterial({
      map: this.textures.parkGrass,
      roughness: 0.9
    });
    const stonePathMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalk,
      roughness: 0.8
    });
    const lakeWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.bridgeStone,
      roughness: 0.8
    });

    // 1. Lush Green Lawn Ground
    const groundGeo = new THREE.PlaneGeometry(parkWidth + 8, parkLength + 8);
    const ground = new THREE.Mesh(groundGeo, grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(parkCenterX, -0.02, parkCenterZ);
    ground.receiveShadow = true;
    lakeGroup.add(ground);

    // 2. Lake Water Basin
    const waterW = lakeMaxX - lakeMinX; // 25m
    const waterL = lakeMaxZ - lakeMinZ; // 20m
    const lakeWaterGeo = new THREE.PlaneGeometry(waterW, waterL);
    const lakeWaterMat = new THREE.MeshStandardMaterial({
      map: this.textures.water,
      color: 0x0369a1,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const lakeWater = new THREE.Mesh(lakeWaterGeo, lakeWaterMat);
    lakeWater.rotation.x = -Math.PI / 2;
    lakeWater.position.set(lakeCenterX, lakeWaterY, lakeCenterZ);
    lakeWater.receiveShadow = true;
    lakeGroup.add(lakeWater);
    this.waterSurfaces.push(lakeWater);

    // Stone Embankment around lake perimeter
    const curbH = 0.55;
    const curbThick = 0.8;
    const sWall = new THREE.Mesh(new THREE.BoxGeometry(waterW + 1.6, curbH, curbThick), lakeWallMat);
    sWall.position.set(lakeCenterX, -0.15, lakeMinZ);
    lakeGroup.add(sWall);

    const nWall = new THREE.Mesh(new THREE.BoxGeometry(waterW + 1.6, curbH, curbThick), lakeWallMat);
    nWall.position.set(lakeCenterX, -0.15, lakeMaxZ);
    lakeGroup.add(nWall);

    const wWall = new THREE.Mesh(new THREE.BoxGeometry(curbThick, curbH, waterL), lakeWallMat);
    wWall.position.set(lakeMinX, -0.15, lakeCenterZ);
    lakeGroup.add(wWall);

    const eWall = new THREE.Mesh(new THREE.BoxGeometry(curbThick, curbH, waterL), lakeWallMat);
    eWall.position.set(lakeMaxX, -0.15, lakeCenterZ);
    lakeGroup.add(eWall);

    // 3. Floating Lotus Pads & Pink Lotus Flowers (Hoa sen & lá sen bồng bềnh)
    this.lotusMeshes = [];
    const lotusMat = new THREE.MeshStandardMaterial({
      map: this.textures.lotus,
      transparent: true,
      roughness: 0.4
    });
    const lotusPositions = [
      { x: 13, z: 49, s: 1.4 },
      { x: 15, z: 52, s: 1.1 },
      { x: 12, z: 61, s: 1.5 },
      { x: 27, z: 48, s: 1.3 },
      { x: 29, z: 53, s: 1.6 },
      { x: 28, z: 62, s: 1.2 },
      { x: 24, z: 63, s: 1.4 },
      { x: 16, z: 46, s: 1.2 }
    ];

    lotusPositions.forEach(lp => {
      const lotusPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * lp.s, 1.6 * lp.s), lotusMat);
      lotusPlane.rotation.x = -Math.PI / 2;
      lotusPlane.rotation.z = Math.random() * Math.PI * 2;
      lotusPlane.position.set(lp.x, lakeWaterY + 0.02, lp.z);
      lakeGroup.add(lotusPlane);
      this.lotusMeshes.push(lotusPlane);
    });

    // 4. Weeping Willow Trees along Park Promenade (Cây Liễu rủ ven hồ)
    const willowPositions = [
      { x: 7.2, z: 46 },
      { x: 7.2, z: 58 },
      { x: 34.5, z: 46 },
      { x: 34.5, z: 59 },
      { x: 20.5, z: 66.5 }
    ];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

    willowPositions.forEach(pos => {
      const tree = new THREE.Group();
      tree.position.set(pos.x, 0, pos.z);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 4.2, 8), trunkMat);
      trunk.position.y = 2.1;
      trunk.rotation.z = (Math.random() - 0.5) * 0.2;
      tree.add(trunk);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), leafMat);
      crown.position.y = 4.2;
      crown.scale.set(1.4, 0.9, 1.4);
      tree.add(crown);

      for (let w = 0; w < 10; w++) {
        const ang = (w / 10) * Math.PI * 2;
        const rad = 1.3 + (w % 2) * 0.4;
        const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.02, 2.2, 6), leafMat);
        vine.position.set(Math.cos(ang) * rad, 3.1, Math.sin(ang) * rad);
        vine.rotation.x = (Math.random() - 0.5) * 0.2;
        tree.add(vine);
      }

      lakeGroup.add(tree);
    });

    // 5. Wooden Footbridge to Central Lake Pavilion (Cầu gỗ dẫn ra Thủy Tạ)
    const bridgeStartX = 20.0;
    const bridgeStartZ = lakeMinZ - 1.5; // 43.5
    const bridgeEndZ = 52.0;
    const bridgeLen = bridgeEndZ - bridgeStartZ; // 8.5m
    const bridgeW = 2.4;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });

    const wDeck = new THREE.Mesh(new THREE.BoxGeometry(bridgeW, 0.18, bridgeLen), woodMat);
    wDeck.position.set(bridgeStartX, 0.15, (bridgeStartZ + bridgeEndZ) / 2);
    wDeck.receiveShadow = true;
    lakeGroup.add(wDeck);

    for (let bz = bridgeStartZ + 1.8; bz <= bridgeEndZ - 0.5; bz += 2.2) {
      [-bridgeW / 2 + 0.2, bridgeW / 2 - 0.2].forEach(bx => {
        const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2), darkWoodMat);
        stilt.position.set(bridgeStartX + bx, -0.3, bz);
        lakeGroup.add(stilt);
      });
    }

    [-bridgeW / 2 + 0.1, bridgeW / 2 - 0.1].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, bridgeLen), darkWoodMat);
      rail.position.set(bridgeStartX + rx, 0.85, (bridgeStartZ + bridgeEndZ) / 2);
      lakeGroup.add(rail);

      for (let pz = bridgeStartZ; pz <= bridgeEndZ; pz += 1.8) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 0.12), darkWoodMat);
        post.position.set(bridgeStartX + rx, 0.45, pz);
        lakeGroup.add(post);
      }
    });

    // 6. Hexagonal Lake Pavilion (Thủy Tạ Ngắm Sen cổ truyền)
    const pavX = bridgeStartX; // 20.0
    const pavZ = 55.5;
    const pavY = 0.15;
    const pavR = 3.6; // radius

    const pavGroup = new THREE.Group();
    pavGroup.position.set(pavX, pavY, pavZ);

    const redPillarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const tileRoofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
    const goldFinialMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });

    const pavFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(pavR, pavR + 0.2, 0.35, 6),
      woodMat
    );
    pavFloor.position.y = 0.1;
    pavFloor.receiveShadow = true;
    pavGroup.add(pavFloor);

    const pavBase = new THREE.Mesh(
      new THREE.CylinderGeometry(pavR - 0.2, pavR, 1.2, 6),
      lakeWallMat
    );
    pavBase.position.y = -0.6;
    pavGroup.add(pavBase);

    for (let c = 0; c < 6; c++) {
      const ang = (c / 6) * Math.PI * 2;
      const colX = Math.cos(ang) * (pavR - 0.5);
      const colZ = Math.sin(ang) * (pavR - 0.5);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8), redPillarMat);
      col.position.set(colX, 1.6, colZ);
      col.castShadow = true;
      pavGroup.add(col);
    }

    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(pavR + 0.8, 1.2, 6), tileRoofMat);
    roof1.position.y = 3.5;
    roof1.castShadow = true;
    pavGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(pavR - 0.6, 1.4, 6), tileRoofMat);
    roof2.position.y = 4.4;
    roof2.castShadow = true;
    pavGroup.add(roof2);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldFinialMat);
    finial.position.y = 5.25;
    pavGroup.add(finial);

    for (let l = 0; l < 6; l++) {
      const ang = (l / 6) * Math.PI * 2 + Math.PI / 6;
      const lx = Math.cos(ang) * (pavR + 0.3);
      const lz = Math.sin(ang) * (pavR + 0.3);
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      lantern.position.set(lx, 2.9, lz);
      lantern.scale.set(1, 1.25, 1);
      pavGroup.add(lantern);
    }

    const pavLight = new THREE.PointLight(0xfef08a, 1.3, 12, 1.2);
    pavLight.position.set(0, 2.6, 0);
    pavGroup.add(pavLight);

    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.6, 0.7, 12),
      stonePathMat
    );
    table.position.y = 0.55;
    pavGroup.add(table);

    for (let st = 0; st < 4; st++) {
      const sang = (st / 4) * Math.PI * 2;
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 8), stonePathMat);
      stool.position.set(Math.cos(sang) * 1.3, 0.4, Math.sin(sang) * 1.3);
      pavGroup.add(stool);
    }

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.5, 4.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.y = 1.2;
    hitBox.userData = { type: 'lake_pavilion' };
    pavGroup.add(hitBox);
    this.interactiveObjects.push(hitBox);

    lakeGroup.add(pavGroup);

    this.streetGroup.add(lakeGroup);
  }

  // 16. NHÀ & THÀNH PHỐ (Surrounding City Buildings & Distant Skyline)
  createSurroundingCityBuildings(frontZ) {
    const buildingsGroup = new THREE.Group();
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    // 1. Opposite Shophouses along North side of Avenue (Z: 41.5)
    // Carefully arranged so they DO NOT block the alley (X in [15.0, 20.5])
    const shophouseSpecs = [
      {
        x: -18, w: 7, h: 14, d: 7.5,
        color: 0x334155, title: 'CĂN HỘ PHỐ MỚI',
        facadeTex: null
      },
      {
        x: -10, w: 7, h: 8.5, d: 7.5,
        color: 0x78350f, title: 'CÀ PHÊ PHỐ CỔ',
        facadeTex: this.textures.cafeFacade
      },
      {
        x: -3, w: 6.5, h: 8, d: 7.5,
        color: 0x059669, title: 'HIỆU THUỐC 24/7',
        facadeTex: this.textures.pharmacyFacade
      },
      {
        x: 4.5, w: 7.5, h: 7.5, d: 7.5,
        color: 0xd97706, title: 'TIỆM BÁNH MÌ',
        facadeTex: this.textures.bakeryFacade
      },
      {
        x: 11.5, w: 5.5, h: 10.5, d: 7.5,
        color: 0x475569, title: 'KHÁCH SẠN PHỐ CỔ',
        facadeTex: null
      },
      // (Alley opening at X in [15.0, 20.5])
      {
        x: 24.5, w: 7.5, h: 12.0, d: 7.5,
        color: 0x0284c7, title: 'TÒA NHÀ THƯƠNG MẠI',
        facadeTex: null
      },
      {
        x: 32.5, w: 7.5, h: 15.0, d: 7.5,
        color: 0x1e293b, title: 'TRUNG TÂM TÀI CHÍNH',
        facadeTex: null
      }
    ];

    shophouseSpecs.forEach(s => {
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.w, s.h, s.d),
        new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.7 })
      );
      bMesh.position.set(s.x, s.h / 2, frontZ + 32.5);
      bMesh.receiveShadow = true;
      bMesh.castShadow = true;
      buildingsGroup.add(bMesh);

      if (s.facadeTex) {
        const facadePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(s.w - 0.4, 5.2),
          new THREE.MeshBasicMaterial({ map: s.facadeTex })
        );
        facadePlane.position.set(s.x, 3.0, frontZ + 32.5 - s.d / 2 - 0.05);
        facadePlane.rotation.y = Math.PI;
        buildingsGroup.add(facadePlane);
      } else {
        for (let wy = 3.2; wy < s.h - 1.2; wy += 2.4) {
          for (let wx = -s.w / 2 + 1.4; wx <= s.w / 2 - 1.4; wx += 2.0) {
            const win = new THREE.Mesh(
              new THREE.PlaneGeometry(1.0, 1.3),
              new THREE.MeshBasicMaterial({ color: (Math.random() > 0.3) ? 0xfef08a : 0x1e293b })
            );
            win.position.set(s.x + wx, wy, frontZ + 32.5 - s.d / 2 - 0.05);
            win.rotation.y = Math.PI;
            buildingsGroup.add(win);
          }
        }
      }

      const roof = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.4, 0.35, s.d + 0.4), roofMat);
      roof.position.set(s.x, s.h + 0.18, frontZ + 32.5);
      buildingsGroup.add(roof);
    });

    // 2. West Riverbank City Townhouses (Bờ tây sông)
    const westBuildings = [
      { x: -44, z: 12, w: 7, h: 12, d: 8, color: 0x334155 },
      { x: -44, z: 22, w: 7, h: 16, d: 9, color: 0x0f172a },
      { x: -44, z: 34, w: 7, h: 10, d: 8, color: 0xd97706 }
    ];
    westBuildings.forEach(wb => {
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(wb.w, wb.h, wb.d),
        new THREE.MeshStandardMaterial({ color: wb.color, roughness: 0.7 })
      );
      bMesh.position.set(wb.x, wb.h / 2, wb.z);
      bMesh.receiveShadow = true;
      buildingsGroup.add(bMesh);

      for (let wy = 3.0; wy < wb.h - 1.5; wy += 2.4) {
        for (let wz = -wb.d / 2 + 1.5; wz <= wb.d / 2 - 1.5; wz += 2.2) {
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(1.1, 1.3),
            new THREE.MeshBasicMaterial({ color: (Math.random() > 0.25) ? 0xfef08a : 0x1e293b })
          );
          win.position.set(wb.x + wb.w / 2 + 0.05, wy, wb.z + wz);
          win.rotation.y = Math.PI / 2;
          buildingsGroup.add(win);
        }
      }
    });

    // 3. Distant City Skyline Silhouettes (Cao ốc chọc trời hậu cảnh)
    const skylineZ = 85.0;
    const skylineSpecs = [
      { x: -35, w: 14, h: 38, d: 10, color: 0x0f172a },
      { x: -18, w: 12, h: 46, d: 10, color: 0x1e293b },
      { x: 0, w: 16, h: 52, d: 12, color: 0x0f172a },
      { x: 18, w: 12, h: 42, d: 10, color: 0x1e293b },
      { x: 35, w: 15, h: 36, d: 10, color: 0x0f172a }
    ];
    skylineSpecs.forEach(sky => {
      const skyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sky.w, sky.h, sky.d),
        new THREE.MeshStandardMaterial({ color: sky.color, roughness: 0.85 })
      );
      skyMesh.position.set(sky.x, sky.h / 2, skylineZ);
      buildingsGroup.add(skyMesh);

      for (let y = 6; y < sky.h - 4; y += 3.5) {
        for (let x = -sky.w / 2 + 1.8; x <= sky.w / 2 - 1.8; x += 2.2) {
          if (Math.random() > 0.45) {
            const wPlane = new THREE.Mesh(
              new THREE.PlaneGeometry(1.2, 1.6),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            wPlane.position.set(sky.x + x, y, skylineZ - sky.d / 2 - 0.05);
            wPlane.rotation.y = Math.PI;
            buildingsGroup.add(wPlane);
          }
        }
      }
    });

    this.streetGroup.add(buildingsGroup);
  }

  // Initialize Animated Street Traffic (Xe cộ qua lại trên đường)
  initStreetTraffic(roadZ) {
    this.trafficCars = [];

    // Helper to build low-poly vehicle model
    const createCarModel = (bodyColor, isTaxi = false, isVan = false) => {
      const car = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.3 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, opacity: 0.7, transparent: true });
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

      const carLen = isVan ? 5.2 : 4.4;
      const carWid = isVan ? 2.1 : 1.9;
      const carHgt = isVan ? 2.4 : 1.4;

      // Lower Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(carLen, 0.6, carWid), bodyMat);
      chassis.position.y = 0.55;
      chassis.castShadow = true;
      car.add(chassis);

      // Cabin / Greenhouse
      const cabinLen = isVan ? 3.8 : 2.5;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, carHgt * 0.6, carWid * 0.9), glassMat);
      cabin.position.set(isVan ? -0.4 : -0.2, 0.85 + (carHgt * 0.3), 0);
      car.add(cabin);

      // Cabin Roof
      const cRoof = new THREE.Mesh(new THREE.BoxGeometry(cabinLen + 0.1, 0.08, carWid * 0.92), bodyMat);
      cRoof.position.set(isVan ? -0.4 : -0.2, 0.85 + (carHgt * 0.6), 0);
      car.add(cRoof);

      // Taxi Roof Sign
      if (isTaxi) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.35), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        sign.position.set(-0.2, 0.85 + (carHgt * 0.6) + 0.15, 0);
        car.add(sign);
      }

      // Headlights
      [-carWid / 2 + 0.3, carWid / 2 - 0.3].forEach(lz => {
        const hLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.28), lightMat);
        hLight.position.set(carLen / 2 + 0.02, 0.55, lz);
        car.add(hLight);
      });

      // 4 Wheels
      const wheels = [];
      const wxOffsets = [-carLen * 0.3, carLen * 0.3];
      const wzOffsets = [-carWid / 2 - 0.05, carWid / 2 + 0.05];

      wxOffsets.forEach(wx => {
        wzOffsets.forEach(wz => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12), wheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.32, wz);
          wheel.castShadow = true;
          car.add(wheel);
          wheels.push(wheel);
        });
      });

      return { mesh: car, wheels };
    };

    // 1. Yellow City Taxi traveling Right (speed +8.5 m/s, Z = roadZ - 3.5)
    const taxi = createCarModel(0xfacc15, true, false);
    taxi.mesh.position.set(-18, 0, roadZ - 3.5);
    this.trafficCars.push({
      ...taxi,
      speed: 8.5,
      direction: 1, // moving +X
      minX: -42,
      maxX: 42
    });
    this.streetGroup.add(taxi.mesh);

    // 2. Blue Delivery Van traveling Left (speed -6.5 m/s, Z = roadZ + 3.5)
    const van = createCarModel(0x0284c7, false, true);
    van.mesh.position.set(20, 0, roadZ + 3.5);
    van.mesh.rotation.y = Math.PI; // facing -X
    this.trafficCars.push({
      ...van,
      speed: -6.5,
      direction: -1, // moving -X
      minX: -42,
      maxX: 42
    });
    this.streetGroup.add(van.mesh);

    // 3. Red Compact Sedan traveling Right (speed +10.0 m/s, Z = roadZ - 1.5)
    const sedan = createCarModel(0xef4444, false, false);
    sedan.mesh.position.set(2, 0, roadZ - 1.5);
    this.trafficCars.push({
      ...sedan,
      speed: 10.0,
      direction: 1,
      minX: -42,
      maxX: 42
    });
    this.streetGroup.add(sedan.mesh);
  }

  // Initialize Sidewalk Pedestrians (Người đi bộ dạo phố)
  initSidewalkPedestrians(sidewalkZ) {
    this.pedestrians = [];
    const pedConfigs = [
      { startX: -16, speed: 1.8, dir: 1, color: 0xec4899 },
      { startX: 12, speed: -1.5, dir: -1, color: 0x10b981 },
      { startX: -4, speed: 1.6, dir: 1, color: 0xa855f7 }
    ];

    pedConfigs.forEach(cfg => {
      const pMesh = this.createHumanoidMesh({
        clothesColor: cfg.color,
        hairColor: 0x27272a,
        prop: null
      });
      pMesh.position.set(cfg.startX, 0, sidewalkZ + (Math.random() - 0.5) * 1.5);
      this.streetGroup.add(pMesh);

      this.pedestrians.push({
        mesh: pMesh,
        speed: cfg.speed,
        dir: cfg.dir,
        minX: -26,
        maxX: 26,
        walkPhase: Math.random() * Math.PI
      });
    });
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

  // FIRST-PERSON PLAYER MOVEMENT & COLLISION (Seamless City, River Bridge, Alley & Lake Park Walk)
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
    if (p.keys.w || p.keys.arrowUp) moveVector.add(forwardDir);
    if (p.keys.s || p.keys.arrowDown) moveVector.sub(forwardDir);
    if (p.keys.d || p.keys.arrowRight) moveVector.sub(rightDir);
    if (p.keys.a || p.keys.arrowLeft) moveVector.add(rightDir);

    // Keyboard rotation helper with Q
    if (p.keys.q) p.yaw += 2.2 * dt;

    // Speed boost timer from energy drink or banh mi
    if (p.speedBoostTimer > 0) {
      p.speedBoostTimer -= dt;
      if (p.speedBoostTimer <= 0) {
        p.speedBoostTimer = 0;
        this.game.log('⚡ Hiệu ứng Tăng Tốc Độ Di Chuyển đã hết.');
      }
    }

    if (moveVector.lengthSq() > 0.001) {
      moveVector.normalize();
      let speed = p.keys.shift ? p.speed * 1.5 : p.speed;
      if (p.speedBoostTimer > 0) speed *= 1.4;

      const deltaMove = moveVector.clone().multiplyScalar(speed * dt);
      const targetX = p.pos.x + deltaMove.x;
      const targetZ = p.pos.z + deltaMove.z;

      // Door opening corridor
      const doorMinX = -9.6;
      const doorMaxX = -6.4;
      const wallZ = this.storeDepth / 2; // 9.0

      // 1. Z-axis & In/Out Store Boundary Logic:
      let newZ = targetZ;
      let newX = targetX;

      if (p.pos.z <= wallZ) {
        // Player currently inside store
        if (targetZ > wallZ) {
          // Attempting to step outside: allowed ONLY if in doorway
          if (p.pos.x >= doorMinX && p.pos.x <= doorMaxX) {
            newZ = targetZ; // Walk out onto sidewalk & street!
          } else {
            newZ = Math.min(wallZ - 0.2, targetZ); // Blocked by front glass wall
          }
        } else {
          // Inside store back wall collision
          newZ = Math.max(-this.storeDepth / 2 + 1.2, targetZ);
        }
      } else {
        // Player currently outside in the expansive city!
        if (targetZ < wallZ) {
          // Attempting to re-enter store: allowed ONLY if in doorway
          if (p.pos.x >= doorMinX && p.pos.x <= doorMaxX) {
            newZ = targetZ; // Walk back inside store!
          } else {
            newZ = Math.max(wallZ + 0.2, targetZ); // Blocked by storefront glass
          }
        } else {
          // Max outdoor city depth (Lake park far boundary)
          newZ = Math.min(67.0, targetZ);
        }
      }

      // 2. Zone-Specific Collisions & Boundaries
      if (newZ <= wallZ) {
        // Inside store width boundaries
        const minX = -this.storeWidth / 2 + 1.2; // -10.8
        const maxX = this.storeWidth / 2 - 1.2;  // 10.8
        newX = Math.max(minX, Math.min(maxX, targetX));
      } else {
        // Outside in city:
        // Overall city X-bounds
        newX = Math.max(-43.0, Math.min(35.5, targetX));

        // River Safety Check: River is at X in [-38, -22].
        // Player can ONLY cross if on the Bridge (Z in [16.5, 33.5])!
        if (newX < -22.0 && newX > -38.0) {
          if (newZ < 16.5 || newZ > 33.5) {
            if (p.pos.x >= -22.0) newX = -22.0;
            else if (p.pos.x <= -38.0) newX = -38.0;
            else newZ = Math.max(16.5, Math.min(33.5, newZ));
          }
        }

        // Alley & Lake Entrance Constraints:
        // North of the main street sidewalk (Z > 38.0):
        if (newZ > 38.0) {
          if (newZ <= 42.0) {
            // Must be within the alley corridor
            newX = Math.max(15.0, Math.min(20.2, newX));
          } else {
            // Inside Lake Park (Z in [42.0, 67.0], X in [5.0, 35.5])
            newX = Math.max(5.0, Math.min(35.5, newX));

            // Lake Water Safety Check:
            // Deep water is at X in [8.5, 33.5], Z in [44.5, 65.5].
            // Player is allowed on the Wooden Footbridge & Lake Pavilion: X in [18.2, 21.8], Z in [43.5, 58.5].
            const inWaterBox = (newX > 8.5 && newX < 33.5 && newZ > 44.5 && newZ < 65.5);
            const onBridgeOrPavilion = (newX >= 18.2 && newX <= 21.8 && newZ >= 43.5 && newZ <= 58.5);

            if (inWaterBox && !onBridgeOrPavilion) {
              // Constrain to nearest promenade edge
              if (p.pos.z <= 44.5) newZ = 44.5;
              else if (p.pos.z >= 65.5) newZ = 65.5;
              else if (p.pos.x <= 8.5) newX = 8.5;
              else if (p.pos.x >= 33.5) newX = 33.5;
              else {
                newX = Math.max(18.5, Math.min(21.5, newX));
              }
            }
          }
        }
      }

      p.pos.x = newX;
      p.pos.z = newZ;
    }

    // Dynamic Elevation (Smooth Bridge Arch curve when crossing)
    if (p.pos.x <= -22.0 && p.pos.x >= -38.0 && p.pos.z >= 16.5 && p.pos.z <= 33.5) {
      const bridgeCenter = -30.0;
      const bridgeHalfSpan = 8.0;
      const t = Math.abs(p.pos.x - bridgeCenter) / bridgeHalfSpan;
      const archH = Math.max(0, (1 - t * t) * 0.38);
      p.pos.y = 1.65 + archH;
    } else {
      p.pos.y = 1.65;
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

    if (intersects.length > 0 && intersects[0].distance < 4.2) {
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
        } else if (data.type === 'vending_machine') {
          promptText.innerText = 'Máy bán nước: Uống nước tăng lực [E] ⚡';
        } else if (data.type === 'sidewalk_sign') {
          promptText.innerText = 'Bảng hiệu: Vẫy gọi khách vào tiệm [E] 📢';
        } else if (data.type === 'bench') {
          promptText.innerText = 'Ngồi nghỉ ngơi ngắm phố [E] ☕';
        } else if (data.type === 'delivery_pallet') {
          promptText.innerText = 'Kiện hàng giao tới: Xếp nhanh lên kệ [E] 📦';
        } else if (data.type === 'outdoor_trash') {
          promptText.innerText = 'Dọn rác trước tiệm [E] 🧹';
        } else if (data.type === 'bridge_view') {
          promptText.innerText = 'Đứng trên cầu ngắm dòng sông thơ mộng [E] 🌉';
        } else if (data.type === 'alley_food') {
          promptText.innerText = 'Xe bánh mì hẻm phố: Ăn bánh mì giòn tan [E] 🥖';
        } else if (data.type === 'lake_pavilion') {
          promptText.innerText = 'Thủy Tạ: Ngắm hoa sen giữa hồ nước [E] 🪷';
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
    } else if (targetData.type === 'vending_machine') {
      if (window.gameAudio) gameAudio.playChaChing();
      this.player.speedBoostTimer = 45; // 45s of speed boost
      const extraMoney = 15000;
      this.game.money += extraMoney;
      this.game.todayRevenue += extraMoney;
      this.game.allTimeRevenue += extraMoney;
      this.game.addFloatingText('⚡ UỐNG BÒ HÚC: +CHẠY NHANH & +15.000₫!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#fbbf24');
      this.game.log('⚡ Bạn đã mua lon Nước Tăng Lực từ máy bán nước ngoài phố! Tốc độ di chuyển tăng 40% trong 45s và máy thu về +15.000₫!');
      this.game.updateStatsUI();
    } else if (targetData.type === 'sidewalk_sign') {
      if (window.gameAudio) gameAudio.playClick();
      this.game.reputation = Math.min(100, this.game.reputation + 2);
      if (this.game.isOpen) {
        this.game.spawnCustomer();
        this.game.spawnCustomer();
      }
      this.game.addFloatingText('📢 VẪY KHÁCH: +2 UY TÍN & KHÁCH VÀO TIỆM!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#38bdf8');
      this.game.log('📢 Bạn đứng vẫy tay và phát tờ rơi cạnh bảng hiệu vỉa hè! Khách đi đường bị thu hút tấp nập kéo vào tiệm!');
      this.game.updateStatsUI();
    } else if (targetData.type === 'bench') {
      if (window.gameAudio) gameAudio.playClick();
      this.game.addFloatingText('☕ Thư giãn ngắm phố...', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#a7f3d0');
      this.game.log('🌿 Bạn ngồi nghỉ ngơi trên băng ghế ngoài vỉa hè, hít thở không khí phố xá thoáng mát.');
    } else if (targetData.type === 'delivery_pallet') {
      this.game.quickRestockAll();
      this.game.log('📦 Bạn kiểm tra kiện hàng vừa giao tới ngoài vỉa hè và chuyển nhanh hàng vào kệ!');
    } else if (targetData.type === 'outdoor_trash') {
      if (window.gameAudio) gameAudio.playSweep();
      this.game.cleanliness = Math.min(100, this.game.cleanliness + 8);
      this.game.addFloatingText('🧹 Vỉa hè sạch bong!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#34d399');
      this.game.log('🧹 Bạn đã thu dọn rác trước cửa tiệm, vỉa hè sạch sẽ thu hút người đi bộ!');
      this.game.updateStatsUI();
    } else if (targetData.type === 'bridge_view') {
      if (window.gameAudio) gameAudio.playClick();
      this.game.reputation = Math.min(100, this.game.reputation + 3);
      this.game.addFloatingText('🌉 Ngắm sông: +3 Uy tín!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#38bdf8');
      this.game.log('🌉 Bạn tựa vào lan can cầu đá ngắm nhìn dòng sông lấp lánh và con thuyền nan bồng bềnh. Cảm xúc thanh thản, tiệm nhận +3 Uy tín!');
      this.game.updateStatsUI();
    } else if (targetData.type === 'alley_food') {
      if (window.gameAudio) gameAudio.playChaChing();
      this.player.speedBoostTimer = 40;
      this.game.addFloatingText('🥖 BÁNH MÌ GIÒN TAN: +TỐC ĐỘ CHẠY!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#f59e0b');
      this.game.log('🥖 Bạn ghé xe bánh mì đầu hẻm ăn một ổ bánh mì chả nóng giòn rụm! Tốc độ di chuyển tăng 40% trong 40 giây!');
    } else if (targetData.type === 'lake_pavilion') {
      if (window.gameAudio) gameAudio.playChaChing();
      this.game.reputation = Math.min(100, this.game.reputation + 5);
      this.game.addFloatingText('🪷 Thư giãn ngắm sen: +5 Uy tín!', (this.game.canvas ? this.game.canvas.width : 600) * 0.5, 180, '#ec4899');
      this.game.log('🪷 Bạn ngồi nghỉ chân trong Thủy Tạ giữa hồ sen thanh bình, ngắm nhìn những đóa sen hồng ngát hương. Uy tín tăng thêm +5 điểm!');
      this.game.updateStatsUI();
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

  // CONTROLS & EVENT BINDINGS (Arrow Keys [↑ ↓ ← →] & WASD Support)
  setupControlsAndInput() {
    window.addEventListener('keydown', (e) => {
      // Don't capture keys if typing in modal input/textarea
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const k = e.key.toLowerCase();

      // Arrow Keys & WASD mapping
      if (k === 'w' || e.key === 'ArrowUp') {
        this.player.keys.w = true;
        this.player.keys.arrowUp = true;
        if (e.key === 'ArrowUp') e.preventDefault();
      }
      if (k === 's' || e.key === 'ArrowDown') {
        this.player.keys.s = true;
        this.player.keys.arrowDown = true;
        if (e.key === 'ArrowDown') e.preventDefault();
      }
      if (k === 'a' || e.key === 'ArrowLeft') {
        this.player.keys.a = true;
        this.player.keys.arrowLeft = true;
        if (e.key === 'ArrowLeft') e.preventDefault();
      }
      if (k === 'd' || e.key === 'ArrowRight') {
        this.player.keys.d = true;
        this.player.keys.arrowRight = true;
        if (e.key === 'ArrowRight') e.preventDefault();
      }
      if (k === 'q') this.player.keys.q = true;
      if (e.key === 'Shift') this.player.keys.shift = true;

      if (k === 'v') {
        this.toggleViewMode();
      }

      // Interaction with [E], [Space], or [Enter]
      if ((k === 'e' || e.code === 'Space' || e.key === 'Enter') && this.viewMode === 'fps') {
        if (this.player.targetedObject) {
          e.preventDefault();
          this.triggerInteraction(this.player.targetedObject);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') {
        this.player.keys.w = false;
        this.player.keys.arrowUp = false;
      }
      if (k === 's' || e.key === 'ArrowDown') {
        this.player.keys.s = false;
        this.player.keys.arrowDown = false;
      }
      if (k === 'a' || e.key === 'ArrowLeft') {
        this.player.keys.a = false;
        this.player.keys.arrowLeft = false;
      }
      if (k === 'd' || e.key === 'ArrowRight') {
        this.player.keys.d = false;
        this.player.keys.arrowRight = false;
      }
      if (k === 'q') this.player.keys.q = false;
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
      if (hintEl) hintEl.innerHTML = '⌨️ <b>Mũi tên [↑ ↓ ← →] / WASD:</b> Đi lại | <b>[Space] / [Enter] / [E]:</b> Tương tác | <b>[V]:</b> Đổi góc nhìn';
      this.game.log('🎥 Đã chuyển sang Góc nhìn thứ nhất (Phím Mũi Tên [↑ ↓ ← →] hoặc WASD để đi lại trong tiệm & ngoài phố)!');
    } else {
      if (document.exitPointerLock && document.pointerLockElement) {
        document.exitPointerLock();
      }
      this.activeCamera = this.isoCamera;
      if (this.controls) this.controls.enabled = true;
      if (crosshair) crosshair.classList.add('hidden');
      if (promptEl) promptEl.classList.add('hidden');
      if (modeBadge) modeBadge.innerText = '🎥 GÓC NHÌN QUẢN LÝ 3D';
      if (hintEl) hintEl.innerHTML = '⌨️ <b>Phím Mũi tên [↑ ↓ ← →]:</b> Lướt xem toàn cảnh | <b>Chuột:</b> Xoay & Thu phóng | <b>[V]:</b> Góc nhìn thứ nhất';
      this.game.log('🎥 Đã chuyển sang Góc nhìn Quản lý Toàn cảnh 3D (Phím Mũi Tên để lướt xem quán)!');
    }
  }

  // HUD OVERLAYS & CAMERA BUTTONS (Indoor, Outdoor Street, Bridge & River, Lake Park, Alley)
  setupHUDOverlays() {
    const toolbar = document.createElement('div');
    toolbar.className = 'camera-toolbar-3d';
    toolbar.innerHTML = `
      <div class="cam-badge" id="camera-mode-badge">🎥 GÓC NHÌN QUẢN LÝ 3D</div>
      <button id="btn-view-indoor" class="cam-btn-view cam-btn-indoor active" title="Xem nhanh toàn cảnh bên trong cửa hàng">
        🏠 Trong tiệm
      </button>
      <button id="btn-view-outdoor" class="cam-btn-view cam-btn-outdoor" title="Xem nhanh toàn cảnh phố xá bên ngoài">
        🌳 Ngoài phố
      </button>
      <button id="btn-view-bridge" class="cam-btn-view cam-btn-bridge" title="Xem nhanh Cây Cầu Đá & Dòng Sông thơ mộng">
        🌉 Cầu & Sông
      </button>
      <button id="btn-view-lake" class="cam-btn-view cam-btn-lake" title="Xem nhanh Hồ Nước & Thủy Tạ ngắm hoa sen">
        🪷 Hồ nước
      </button>
      <button id="btn-view-alley" class="cam-btn-view cam-btn-alley" title="Xem nhanh Hẻm Phố Cổ truyền Việt Nam">
        🏘️ Hẻm phố
      </button>
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
      <span class="key-badge">Space / E</span>
      <span id="fps-prompt-text">Tương tác</span>
    `;
    this.container.appendChild(prompt);

    const hint = document.createElement('div');
    hint.id = 'view-mode-hint';
    hint.className = 'view-mode-hint';
    hint.innerHTML = `⌨️ <b>Phím Mũi tên [↑ ↓ ← →] / WASD:</b> Di chuyển | <b>[Space] / [Enter] / [E]:</b> Tương tác | <b>[V]:</b> Đổi góc nhìn`;
    this.container.appendChild(hint);

    // 1. Click: Smooth glide to indoor store view
    document.getElementById('btn-view-indoor').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(0, 18, 19),
        new THREE.Vector3(0, 1.2, 0),
        'btn-view-indoor',
        '🎥 Đang xem toàn cảnh Trong Tiệm!'
      );
    };

    // 2. Click: Smooth glide to outdoor street view
    document.getElementById('btn-view-outdoor').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(-2, 14, 27),
        new THREE.Vector3(-2, 1.0, 13),
        'btn-view-outdoor',
        '🎥 Đang xem toàn cảnh Phố Xá Bên Ngoài!'
      );
    };

    // 3. Click: Smooth glide to Bridge & River view
    document.getElementById('btn-view-bridge').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(-30, 15, 42),
        new THREE.Vector3(-30, 0.5, 25),
        'btn-view-bridge',
        '🌉 Đang ngắm Cây Cầu Đá bắc qua Dòng Sông thơ mộng!'
      );
    };

    // 4. Click: Smooth glide to Lake Park & Lotus Pavilion view
    document.getElementById('btn-view-lake').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(20, 18, 75),
        new THREE.Vector3(20, 1.5, 54),
        'btn-view-lake',
        '🪷 Đang xem Hồ Sen & Thủy Tạ thanh tịnh!'
      );
    };

    // 5. Click: Smooth glide to Alley view
    document.getElementById('btn-view-alley').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(17.5, 13, 38),
        new THREE.Vector3(17.5, 1.5, 24),
        'btn-view-alley',
        '🏘️ Đang xem Hẻm Phố Cổ lung linh ánh đèn!'
      );
    };

    document.getElementById('btn-toggle-camera-mode').onclick = () => this.toggleViewMode();
    document.getElementById('btn-reset-camera').onclick = () => {
      this.transitionToView(
        new THREE.Vector3(0, 18, 19),
        new THREE.Vector3(0, 1.2, 0),
        'btn-view-indoor',
        '📍 Đã căn giữa camera.'
      );
      this.player.pos.set(0, 1.65, 5.5);
      this.player.yaw = 0;
      this.player.pitch = -0.05;
    };
  }

  // Smooth Camera Glide Transition between Indoor & Outdoor Views
  transitionToView(targetCamPos, targetLookAt, activeBtnId, logMsg) {
    if (this.viewMode === 'fps') {
      this.toggleViewMode('iso');
    }

    document.querySelectorAll('.cam-btn-view').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');

    if (this.controls) {
      this.cameraTransition = {
        isTransitioning: true,
        startPos: this.isoCamera.position.clone(),
        targetPos: targetCamPos.clone(),
        startLookAt: this.controls.target.clone(),
        targetLookAt: targetLookAt.clone(),
        progress: 0,
        duration: 0.65
      };
    }
    if (logMsg && this.game && this.game.log) {
      this.game.log(logMsg);
    }
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

  // Automatic Sliding Glass Doors Animation
  updateSlidingDoors(dt) {
    if (!this.slidingDoors) return;

    // Check if player or any customer is near the entrance door (X: -8.0, Z: 9.0)
    let someoneNearDoor = false;
    if (this.viewMode === 'fps') {
      const pDist = Math.hypot(this.player.pos.x - (-8.0), this.player.pos.z - 9.0);
      if (pDist < 4.5) someoneNearDoor = true;
    }
    if (!someoneNearDoor && this.game.customers) {
      for (let c of this.game.customers) {
        const m = this.customerMeshes.get(c);
        if (m) {
          const cDist = Math.hypot(m.position.x - (-8.0), m.position.z - 9.0);
          if (cDist < 3.8) {
            someoneNearDoor = true;
            break;
          }
        }
      }
    }

    this.slidingDoors.targetOpen = someoneNearDoor ? 1.0 : 0.0;
    const diff = this.slidingDoors.targetOpen - this.slidingDoors.currentOpen;
    this.slidingDoors.currentOpen += diff * Math.min(1.0, dt * 6.5);

    const sd = this.slidingDoors;
    sd.left.position.x = sd.leftClosedX + (sd.leftOpenX - sd.leftClosedX) * sd.currentOpen;
    sd.right.position.x = sd.rightClosedX + (sd.rightOpenX - sd.rightClosedX) * sd.currentOpen;
  }

  // Animated Traffic Cars along Road
  updateStreetTraffic(dt) {
    if (!this.trafficCars || this.trafficCars.length === 0) return;

    this.trafficCars.forEach(car => {
      car.mesh.position.x += car.speed * dt;

      // Rotate wheels with movement speed
      if (car.wheels) {
        car.wheels.forEach(w => {
          w.rotation.x += car.speed * dt * 3.5;
        });
      }

      // Wrap around road boundaries
      if (car.direction > 0 && car.mesh.position.x > car.maxX) {
        car.mesh.position.x = car.minX;
      } else if (car.direction < 0 && car.mesh.position.x < car.minX) {
        car.mesh.position.x = car.maxX;
      }
    });
  }

  // Animated Sidewalk Pedestrians
  updateSidewalkPedestrians(dt) {
    if (!this.pedestrians || this.pedestrians.length === 0) return;

    this.pedestrians.forEach(ped => {
      ped.mesh.position.x += ped.speed * dt;
      ped.walkPhase += dt * 7.5;

      // Leg & Arm swinging
      if (ped.mesh.userData && ped.mesh.userData.leftLegPivot) {
        ped.mesh.userData.leftLegPivot.rotation.x = Math.sin(ped.walkPhase) * 0.45;
        ped.mesh.userData.rightLegPivot.rotation.x = -Math.sin(ped.walkPhase) * 0.45;
        ped.mesh.userData.leftArmPivot.rotation.x = -Math.sin(ped.walkPhase) * 0.45;
        ped.mesh.userData.rightArmPivot.rotation.x = Math.sin(ped.walkPhase) * 0.45;
        ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase * 2)) * 0.05;
      }

      // Face direction of walking
      ped.mesh.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

      // Wrap around boundaries
      if (ped.dir > 0 && ped.mesh.position.x > ped.maxX) {
        ped.mesh.position.x = ped.minX;
      } else if (ped.dir < 0 && ped.mesh.position.x < ped.minX) {
        ped.mesh.position.x = ped.maxX;
      }
    });
  }

  // Water ripples, boat bobbing and lotus swaying animation
  updateWaterAnimation(dt) {
    if (this.textures && this.textures.water) {
      this.textures.water.offset.y += dt * 0.035;
      this.textures.water.offset.x += dt * 0.012;
    }
    if (this.riverBoat) {
      const t = Date.now() / 900;
      this.riverBoat.position.y = -1.1 + Math.sin(t) * 0.045;
      this.riverBoat.rotation.z = Math.sin(t * 0.9) * 0.035;
      this.riverBoat.rotation.x = Math.cos(t * 0.7) * 0.02;
    }
    if (this.lotusMeshes && this.lotusMeshes.length > 0) {
      const now = Date.now() / 1100;
      this.lotusMeshes.forEach((lotus, idx) => {
        lotus.position.y = -0.38 + Math.sin(now + idx) * 0.012;
      });
    }
  }

  // MAIN RENDER LOOP (Called every frame from game.loop)
  update(dt) {
    if (this.cameraTransition && this.cameraTransition.isTransitioning) {
      const ct = this.cameraTransition;
      ct.progress += dt / ct.duration;
      const t = Math.min(1.0, ct.progress);
      // Smooth cubic ease out curve
      const ease = 1 - Math.pow(1 - t, 3);

      this.isoCamera.position.lerpVectors(ct.startPos, ct.targetPos, ease);
      if (this.controls) {
        this.controls.target.lerpVectors(ct.startLookAt, ct.targetLookAt, ease);
        this.controls.update();
      }

      if (t >= 1.0) {
        ct.isTransitioning = false;
      }
    } else if (this.viewMode === 'iso' && this.controls) {
      this.updateIsoPan(dt);
      this.controls.update();
    } else if (this.viewMode === 'fps') {
      this.updatePlayerMovement(dt);
    }

    this.updateSlidingDoors(dt);
    this.updateStreetTraffic(dt);
    this.updateSidewalkPedestrians(dt);
    this.updateWaterAnimation(dt);
    this.syncSimulationEntities(dt);
  }

  // Smoothly pan camera around store and street with Arrow Keys in Isometric View
  updateIsoPan(dt) {
    if (!this.controls) return;
    const p = this.player;
    const panSpeed = 22.0 * dt;
    const panVec = new THREE.Vector3();

    if (p.keys.arrowUp || p.keys.w) panVec.z -= panSpeed;
    if (p.keys.arrowDown || p.keys.s) panVec.z += panSpeed;
    if (p.keys.arrowLeft || p.keys.a) panVec.x -= panSpeed;
    if (p.keys.arrowRight || p.keys.d) panVec.x += panSpeed;

    if (panVec.lengthSq() > 0) {
      this.isoCamera.position.add(panVec);
      this.controls.target.add(panVec);
    }
  }

  render() {
    if (!this.renderer || !this.scene || !this.activeCamera) return;
    this.renderer.render(this.scene, this.activeCamera);
  }
}
