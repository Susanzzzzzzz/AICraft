// Pet module — Rabbit, Parrot, Turtle with follow logic and idle animations
import * as THREE from 'three';

export const PetType = {
  RABBIT: 'rabbit',
  PARROT: 'parrot',
  TURTLE: 'turtle',
};

export class Pet {
  constructor(type, scene) {
    this.type = type;
    this.scene = scene;
    this.group = new THREE.Group();
    this.parts = {};
    this.animTime = 0;

    this._build();

    // Set layers to 1 to avoid raycast selection (same as SteveModel)
    this.group.traverse((child) => {
      child.layers.set(1);
    });

    this.scene.add(this.group);
  }

  _build() {
    switch (this.type) {
      case PetType.RABBIT:
        this._buildRabbit();
        break;
      case PetType.PARROT:
        this._buildParrot();
        break;
      case PetType.TURTLE:
        this._buildTurtle();
        break;
      default:
        this._buildRabbit();
        break;
    }
  }

  _buildRabbit() {
    const matWhite = new THREE.MeshLambertMaterial({ color: 0xF5F5F5 });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.12, 8, 8);
    this.parts.body = new THREE.Mesh(bodyGeo, matWhite);
    this.parts.body.position.set(0, 0.12, 0);
    this.group.add(this.parts.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.07, 8, 8);
    this.parts.head = new THREE.Mesh(headGeo, matWhite);
    this.parts.head.position.set(0, 0.24, -0.03);
    this.group.add(this.parts.head);

    // Left ear (tall thin box on top of head)
    const earGeo = new THREE.BoxGeometry(0.02, 0.1, 0.02);
    this.parts.earL = new THREE.Mesh(earGeo, matWhite.clone());
    this.parts.earL.position.set(-0.025, 0.29, -0.03);
    this.group.add(this.parts.earL);

    // Right ear
    this.parts.earR = new THREE.Mesh(earGeo, matWhite.clone());
    this.parts.earR.position.set(0.025, 0.29, -0.03);
    this.group.add(this.parts.earR);

    // Tail (small white sphere at back)
    const tailGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const tailMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    this.parts.tail = new THREE.Mesh(tailGeo, tailMat);
    this.parts.tail.position.set(0, 0.08, 0.12);
    this.group.add(this.parts.tail);
  }

  _buildParrot() {
    const matGreen = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const matOrange = new THREE.MeshLambertMaterial({ color: 0xFF9800 });
    const matBlue = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
    const matRed = new THREE.MeshLambertMaterial({ color: 0xF44336 });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.08, 8, 8);
    this.parts.body = new THREE.Mesh(bodyGeo, matGreen);
    this.parts.body.position.set(0, 0.1, 0);
    this.group.add(this.parts.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.05, 8, 8);
    this.parts.head = new THREE.Mesh(headGeo, matGreen);
    this.parts.head.position.set(0, 0.19, -0.03);
    this.group.add(this.parts.head);

    // Beak (cone pointing forward)
    const beakGeo = new THREE.ConeGeometry(0.02, 0.04, 4);
    this.parts.beak = new THREE.Mesh(beakGeo, matOrange);
    this.parts.beak.position.set(0, 0.17, -0.08);
    this.parts.beak.rotation.x = -Math.PI / 2; // Rotate to point along -Z
    this.group.add(this.parts.beak);

    // Left wing
    const wingGeo = new THREE.BoxGeometry(0.08, 0.02, 0.04);
    this.parts.wingL = new THREE.Mesh(wingGeo, matBlue);
    this.parts.wingL.position.set(-0.08, 0.1, 0);
    this.group.add(this.parts.wingL);

    // Right wing
    this.parts.wingR = new THREE.Mesh(wingGeo, matBlue.clone());
    this.parts.wingR.position.set(0.08, 0.1, 0);
    this.group.add(this.parts.wingR);

    // Tail (red feather)
    const tailGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
    this.parts.tail = new THREE.Mesh(tailGeo, matRed);
    this.parts.tail.position.set(0, 0.06, 0.08);
    this.group.add(this.parts.tail);
  }

  _buildTurtle() {
    const matShell = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const matLightGreen = new THREE.MeshLambertMaterial({ color: 0x8BC34A });
    const matDeco = new THREE.MeshLambertMaterial({ color: 0xA5D6A7 });

    // Shell (squished sphere, y-scale 0.6)
    const shellGeo = new THREE.SphereGeometry(0.12, 8, 8);
    this.parts.shell = new THREE.Mesh(shellGeo, matShell);
    this.parts.shell.position.set(0, 0.1, 0);
    this.parts.shell.scale.y = 0.6;
    this.group.add(this.parts.shell);

    // Shell decoration: cross-shaped light green stripes on top
    const stripeGeo = new THREE.BoxGeometry(0.14, 0.01, 0.02);

    const stripe1 = new THREE.Mesh(stripeGeo, matDeco.clone());
    stripe1.position.set(0, 0.1, 0.06);
    this.group.add(stripe1);

    const stripe2 = new THREE.Mesh(stripeGeo, matDeco.clone());
    stripe2.position.set(0, 0.1, -0.06);
    this.group.add(stripe2);

    const stripe3 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.14), matDeco.clone());
    stripe3.position.set(0.06, 0.1, 0);
    this.group.add(stripe3);

    const stripe4 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.14), matDeco.clone());
    stripe4.position.set(-0.06, 0.1, 0);
    this.group.add(stripe4);

    // Head
    const headGeo = new THREE.BoxGeometry(0.05, 0.04, 0.06);
    this.parts.head = new THREE.Mesh(headGeo, matLightGreen);
    this.parts.head.position.set(0, 0.06, -0.15);
    this.group.add(this.parts.head);

    // 4 Legs
    const legGeo = new THREE.BoxGeometry(0.03, 0.02, 0.03);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x8BC34A });

    const legPositions = [
      [-0.06, 0.02, -0.08],
      [0.06, 0.02, -0.08],
      [-0.06, 0.02, 0.08],
      [0.06, 0.02, 0.08],
    ];

    this.parts.legs = [];
    for (const pos of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat.clone());
      leg.position.set(pos[0], pos[1], pos[2]);
      this.group.add(leg);
      this.parts.legs.push(leg);
    }
  }

  update(dt, playerPos, playerYaw) {
    // Follow: fixed offset from player (right, up, behind in world space)
    const OFFSET = [0.8, 0.3, 0.8];
    this.group.position.set(
      playerPos[0] + OFFSET[0],
      playerPos[1] + OFFSET[1],
      playerPos[2] + OFFSET[2]
    );

    // Face the same direction as player
    this.group.rotation.y = playerYaw + Math.PI;

    // Play idle animation
    this.animTime += dt;
    this._animate();
  }

  _animate() {
    switch (this.type) {
      case PetType.RABBIT:
        this._animateRabbit();
        break;
      case PetType.PARROT:
        this._animateParrot();
        break;
      case PetType.TURTLE:
        this._animateTurtle();
        break;
    }
  }

  _animateRabbit() {
    // Y-axis bounce
    const bounce = Math.sin(this.animTime * 6) * 0.02;
    this.group.position.y += bounce;

    // Ear wiggle
    if (this.parts.earL) {
      const wiggle = Math.sin(this.animTime * 4) * 0.1;
      this.parts.earL.rotation.z = wiggle;
      this.parts.earR.rotation.z = -wiggle;
    }
  }

  _animateParrot() {
    // Wing flap (z-rotation)
    if (this.parts.wingL) {
      const flap = Math.sin(this.animTime * 4) * 0.3;
      this.parts.wingL.rotation.z = flap;
      this.parts.wingR.rotation.z = -flap;
    }
  }

  _animateTurtle() {
    // Head extend/retract along Z axis
    if (this.parts.head) {
      const headOffset = Math.sin(this.animTime * 1.5) * 0.03;
      this.parts.head.position.z = -0.15 + headOffset;
    }
  }

  remove() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
