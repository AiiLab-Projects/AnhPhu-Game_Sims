// 3D Player Character & Controller for Three.js
class Player3D {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Movement state
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0.18;
    this.rotationY = 0;
    this.isMoving = false;
    this.isAction = false;
    this.actionTimer = 0;
    this.actionType = 'none';

    // Camera follow parameters
    this.cameraDistance = 14;
    this.cameraHeight = 8;
    this.cameraAngle = Math.PI * 0.25;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Input keys
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowup: false,
      arrowdown: false,
      arrowleft: false,
      arrowright: false,
      space: false,
      e: false
    };

    this.joystickVector = { x: 0, y: 0 };
    this.walkCycle = 0;

    this.createCharacterMesh();
    this.setupInputListeners();
  }

  createCharacterMesh() {
    this.meshGroup = new THREE.Group();

    // 1. Torso / Body (Explorer Vest)
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Khaki safari shirt
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 1.35;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.meshGroup.add(this.torso);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfbbf24 }); // Skin tone
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 2.15;
    this.head.castShadow = true;
    this.meshGroup.add(this.head);

    // Explorer Safari Hat
    const hatBrimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12);
    const hatTopGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.35, 12);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0x78350f }); // Leather brown
    
    this.hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    this.hatBrim.position.y = 2.45;
    this.meshGroup.add(this.hatBrim);

    this.hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    this.hatTop.position.y = 2.65;
    this.meshGroup.add(this.hatTop);

    // Face details (Eyes)
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 2.18, 0.28);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 2.18, 0.28);
    this.meshGroup.add(leftEye);
    this.meshGroup.add(rightEye);

    // 3. Backpack (Survival Bag)
    const bagGeo = new THREE.BoxGeometry(0.6, 0.75, 0.35);
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x15803d }); // Forest Green Bag
    this.backpack = new THREE.Mesh(bagGeo, bagMat);
    this.backpack.position.set(0, 1.4, -0.38);
    this.backpack.castShadow = true;
    this.meshGroup.add(this.backpack);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.25, 0.85, 0.25);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.58, 1.35, 0);
    this.leftArm.castShadow = true;
    this.meshGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.58, 1.35, 0);
    this.rightArm.castShadow = true;
    this.meshGroup.add(this.rightArm);

    // Tool held in right hand (Axe / Fishing Rod model attachment)
    const toolHandleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
    const toolHandleMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    this.toolHandle = new THREE.Mesh(toolHandleGeo, toolHandleMat);
    this.toolHandle.position.set(0, -0.4, 0.3);
    this.toolHandle.rotation.x = Math.PI / 3;
    
    const axeHeadGeo = new THREE.BoxGeometry(0.1, 0.25, 0.3);
    const axeHeadMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    this.axeHead = new THREE.Mesh(axeHeadGeo, axeHeadMat);
    this.axeHead.position.set(0, 0.35, 0);
    this.toolHandle.add(this.axeHead);
    this.rightArm.add(this.toolHandle);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a }); // Denim blue pants
    
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.24, 0.45, 0);
    this.leftLeg.castShadow = true;
    this.meshGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.24, 0.45, 0);
    this.rightLeg.castShadow = true;
    this.meshGroup.add(this.rightLeg);

    // Shadow blob
    const shadowGeo = new THREE.CircleGeometry(0.85, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
    this.shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.05;
    this.meshGroup.add(this.shadowBlob);

    // Position player near campsite center
    this.meshGroup.position.set(0, 0.1, 4);
    this.scene.add(this.meshGroup);
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(key)) {
        this.keys[key] = true;
      }
      if (key === '1') window.game?.actionChopWood();
      if (key === '2') window.game?.actionGoFishing();
      if (key === '3') window.game?.actionBuildShelter();
      if (key === '4') window.game?.openCraftModal();
      if (key === '5') window.game?.actionRestAndSleep();
      if (key === 'e' || key === ' ') {
        window.game?.handleContextInteraction();
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(key)) {
        this.keys[key] = false;
      }
    });

    // Mouse drag for camera rotation
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('.glass-card') || e.target.closest('.glass-bar') || e.target.closest('.modal-card')) return;
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const deltaX = e.clientX - this.lastMouseX;
      this.cameraAngle -= deltaX * 0.006;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // Zoom on wheel
    window.addEventListener('wheel', (e) => {
      if (e.target.closest('.diary-scroll') || e.target.closest('.guide-body') || e.target.closest('.modal-body')) return;
      this.cameraDistance = Math.max(7, Math.min(26, this.cameraDistance + e.deltaY * 0.015));
    }, { passive: true });

    // Touch Joystick for mobile
    this.setupTouchJoystick();
  }

  setupTouchJoystick() {
    const base = document.querySelector('.joystick-base');
    const stick = document.getElementById('joystickStick');
    const mobileBtn = document.getElementById('btnMobileAction');

    if (!base || !stick) return;

    let touchId = null;
    let centerX = 0, centerY = 0;

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }, { passive: false });

    base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          const dx = touch.clientX - centerX;
          const dy = touch.clientY - centerY;
          const dist = Math.min(45, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);
          
          stick.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
          this.joystickVector.x = (Math.cos(angle) * dist) / 45;
          this.joystickVector.y = (Math.sin(angle) * dist) / 45;
        }
      }
    }, { passive: false });

    const resetJoystick = (e) => {
      stick.style.transform = `translate(0px, 0px)`;
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
      touchId = null;
    };

    base.addEventListener('touchend', resetJoystick);
    base.addEventListener('touchcancel', resetJoystick);

    mobileBtn?.addEventListener('click', () => {
      window.game?.handleContextInteraction();
    });
  }

  playActionAnimation(type) {
    this.isAction = true;
    this.actionType = type;
    this.actionTimer = 0;
  }

  update(delta = 0.016) {
    let moveX = 0;
    let moveZ = 0;

    // Keyboard movement
    if (this.keys.w || this.keys.arrowup) moveZ -= 1;
    if (this.keys.s || this.keys.arrowdown) moveZ += 1;
    if (this.keys.a || this.keys.arrowleft) moveX -= 1;
    if (this.keys.d || this.keys.arrowright) moveX += 1;

    // Add Joystick input
    if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
      moveX += this.joystickVector.x;
      moveZ += this.joystickVector.y;
    }

    const inputLength = Math.hypot(moveX, moveZ);
    this.isMoving = inputLength > 0.1;

    if (this.isMoving) {
      // Rotate movement relative to camera angle
      const angle = Math.atan2(moveX, moveZ) + this.cameraAngle;
      const targetSpeed = this.speed;

      this.velocity.x = Math.sin(angle) * targetSpeed;
      this.velocity.z = Math.cos(angle) * targetSpeed;

      // Smooth rotate player facing direction
      this.rotationY = angle;
      this.meshGroup.rotation.y = this.rotationY;

      // Update position
      this.meshGroup.position.x += this.velocity.x;
      this.meshGroup.position.z += this.velocity.z;

      // Island boundary clamp (keep on island radius ~34m)
      const distFromCenter = Math.hypot(this.meshGroup.position.x, this.meshGroup.position.z);
      if (distFromCenter > 34) {
        const clampAngle = Math.atan2(this.meshGroup.position.z, this.meshGroup.position.x);
        this.meshGroup.position.x = Math.cos(clampAngle) * 34;
        this.meshGroup.position.z = Math.sin(clampAngle) * 34;
      }

      // Procedural walking animation (swinging arms & legs)
      this.walkCycle += delta * 12;
      const swing = Math.sin(this.walkCycle) * 0.45;
      
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
      this.torso.position.y = 1.35 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
    } else {
      // Idle breathing & reset limbs
      this.walkCycle += delta * 2;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.torso.position.y = 1.35 + Math.sin(this.walkCycle) * 0.03;
    }

    // Action animation override (Chop / Fish / Hammer)
    if (this.isAction) {
      this.actionTimer += delta * 8;
      const chopSwing = Math.sin(this.actionTimer) * 1.3;
      this.rightArm.rotation.x = -0.5 + chopSwing;
      if (this.actionTimer > Math.PI * 2) {
        this.isAction = false;
        this.rightArm.rotation.x = 0;
      }
    }

    // Camera follow player position smoothly
    const camTargetX = this.meshGroup.position.x + Math.sin(this.cameraAngle) * this.cameraDistance;
    const camTargetZ = this.meshGroup.position.z + Math.cos(this.cameraAngle) * this.cameraDistance;
    const camTargetY = this.meshGroup.position.y + this.cameraHeight;

    this.camera.position.lerp(new THREE.Vector3(camTargetX, camTargetY, camTargetZ), 0.1);
    this.camera.lookAt(
      this.meshGroup.position.x,
      this.meshGroup.position.y + 1.2,
      this.meshGroup.position.z
    );
  }

  getPosition() {
    return this.meshGroup.position;
  }
}
