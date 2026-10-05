// Builder3D: Thư viện tạo các mô hình & thực thể 3D sinh động, dễ mở rộng cho hoang đảo

class Builder3D {
  // 1. Tạo cây Dừa / Cây Nhiệt Đới
  static createPalmTree(x, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.set(scale, scale, scale);

    // Thân cây cong tự nhiên
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 5, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Lá dừa xòe
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x15803d, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const leafGeo = new THREE.ConeGeometry(1.2, 3.4, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const angle = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 1.2, 5.1, Math.sin(angle) * 1.2);
      leaf.rotation.x = Math.PI / 2.5;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Quả dừa
    const nutMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const nutGeo = new THREE.SphereGeometry(0.24, 6, 6);
    const nut = new THREE.Mesh(nutGeo, nutMat);
    nut.position.set(0.25, 4.7, 0.2);
    group.add(nut);

    return group;
  }

  // 2. Tạo cây Thông / Cây Bụi Rậm
  static createPineTree(x, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.set(scale, scale, scale);

    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c2e0b });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x166534, flatShading: true });
    [2.2, 3.3, 4.3].forEach((y, idx) => {
      const coneGeo = new THREE.ConeGeometry(2.0 - idx * 0.45, 1.8, 6);
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = y;
      cone.castShadow = true;
      group.add(cone);
    });

    return group;
  }

  // 3. Tạo Cua Biển 3D Bò Trên Bãi Cát
  static createCrab(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.15, z);

    // Mai cua màu đỏ cam
    const shellGeo = new THREE.SphereGeometry(0.4, 8, 6);
    shellGeo.scale(1.2, 0.6, 1);
    const shellMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.castShadow = true;
    group.add(shell);

    // Mắt cua
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    [-0.2, 0.2].forEach(posX => {
      const eyeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2), shellMat);
      eyeStem.position.set(posX, 0.3, 0.35);
      group.add(eyeStem);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), eyeMat);
      eye.position.set(posX, 0.4, 0.37);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), pupilMat);
      pupil.position.set(posX, 0.4, 0.43);
      group.add(eye);
      group.add(pupil);
    });

    // 2 Càng cua
    const clawMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    [-0.55, 0.55].forEach(posX => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 5), clawMat);
      claw.position.set(posX, 0.15, 0.45);
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = posX > 0 ? -0.4 : 0.4;
      group.add(claw);
    });

    // Chân cua
    const legMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    [-0.4, -0.2, 0.2, 0.4].forEach(offsetZ => {
      [-0.45, 0.45].forEach(side => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), legMat);
        leg.position.set(side, 0, offsetZ);
        leg.rotation.z = side > 0 ? -Math.PI / 3 : Math.PI / 3;
        group.add(leg);
      });
    });

    group.userData = {
      baseX: x,
      baseZ: z,
      walkSpeed: 0.02 + Math.random() * 0.02,
      timeOffset: Math.random() * 10
    };

    return group;
  }

  // 4. Tạo Lợn Rừng 3D Trong Rừng Sâu
  static createWildBoar(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.4, z);

    // Thân lợn
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.75, 0.7);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Đầu & Mõm
    const headGeo = new THREE.BoxGeometry(0.65, 0.55, 0.55);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0.8, 0.15, 0);
    head.castShadow = true;
    group.add(head);

    const snoutGeo = new THREE.BoxGeometry(0.3, 0.3, 0.35);
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(1.2, 0.05, 0);
    group.add(snout);

    // Nanh sắc
    const tuskMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    [-0.18, 0.18].forEach(posZ => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), tuskMat);
      tusk.position.set(1.15, 0.2, posZ);
      tusk.rotation.z = -Math.PI / 3;
      group.add(tusk);
    });

    // 4 Chân
    const legGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
    [[-0.4, -0.25], [-0.4, 0.25], [0.4, -0.25], [0.4, 0.25]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(lx, -0.45, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    group.userData = {
      baseX: x,
      baseZ: z,
      patrolRadius: 4.5,
      speed: 0.015
    };

    return group;
  }

  // 5. Tạo Chim Hải Âu 3D Bay Lượn
  static createSeagull(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Thân chim
    const bodyGeo = new THREE.ConeGeometry(0.2, 0.8, 5);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Mỏ chim vàng
    const beakGeo = new THREE.ConeGeometry(0.07, 0.25, 4);
    const beakMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0, 0.5);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);

    // 2 Cánh đập
    const wingGeo = new THREE.BoxGeometry(0.8, 0.04, 0.3);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.45, 0, 0);
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.45, 0, 0);
    group.add(rightWing);

    group.userData = {
      leftWing,
      rightWing,
      centerX: 0,
      centerZ: 0,
      radius: Math.hypot(x, z),
      angle: Math.atan2(z, x),
      flySpeed: 0.02 + Math.random() * 0.01,
      wingSpeed: 10
    };

    return group;
  }

  // 6. Tạo Rương Gỗ Kho Báu Cổ
  static createTreasureChest(x, z, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0.25, z);
    group.rotation.y = rotY;

    // Đáy rương
    const boxGeo = new THREE.BoxGeometry(1.0, 0.6, 0.7);
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.castShadow = true;
    group.add(box);

    // Nắp vòm
    const lidGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.0, 8, 1, false, 0, Math.PI);
    const lidMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.3;
    group.add(lid);

    // Khóa kim loại vàng
    const lockGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
    const lockMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0.15, 0.37);
    group.add(lock);

    return group;
  }
}
