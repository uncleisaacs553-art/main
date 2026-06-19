// Persistent 3D backdrop: a modernist villa rendered as an architectural
// scale-model under studio light. The camera orbits the model as the page
// scrolls, and drifts gently with the pointer. Built from primitives only.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export default function initScene(onReady) {
  const canvas = document.getElementById("scene");
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    document.body.classList.add("no-webgl");
    return null;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c0c0e, 22, 46);

  // Soft studio reflections for the metal + glass.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(10, 4, 11);

  // ---- Lighting --------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x4a4a58, 0x080808, 0.55));

  const key = new THREE.DirectionalLight(0xffe7c4, 2.4);
  key.position.set(-9, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -16; key.shadow.camera.right = 16;
  key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x88a2ff, 0.7);
  rim.position.set(10, 6, -10);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffb86b, 18, 18, 2);
  warm.position.set(0, 2.6, 1.5);
  scene.add(warm);

  // ---- Materials -------------------------------------------------------
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xd9d1c2, roughness: 0.82, metalness: 0.02 });
  const matStone = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.85, metalness: 0.05 });
  const matBrass = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.28, metalness: 1.0 });
  const matWater = new THREE.MeshStandardMaterial({ color: 0x0c2730, roughness: 0.06, metalness: 0.35, emissive: 0x06303a, emissiveIntensity: 0.25 });
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffca7d, emissive: 0xffb265, emissiveIntensity: 0.9, roughness: 1 });
  const matTrunk = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 });
  const matLeaf = new THREE.MeshStandardMaterial({ color: 0x223a2c, roughness: 0.9 });
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x20262b, roughness: 0.08, metalness: 0,
    transmission: 0.9, transparent: true, opacity: 0.45, ior: 1.45, thickness: 0.6,
    envMapIntensity: 1.2,
  });

  // ---- Build the villa -------------------------------------------------
  const villa = new THREE.Group();
  scene.add(villa);

  const box = (w, h, d, mat, x, y, z, opts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    villa.add(m);
    return m;
  };

  // Display plinth + grounding
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.8, 0.4, 64), matStone);
  plinth.position.y = -0.2; plinth.receiveShadow = true; plinth.castShadow = false;
  villa.add(plinth);

  // Reflecting pool
  box(5, 0.12, 2.4, matWater, 3.2, 0.02, 2.4, { cast: false });

  // Ground-floor volume
  box(6, 2.6, 4, matWhite, 0, 1.3, 0);
  // Lit interior + glass on the front face
  box(5.4, 2.1, 0.06, matGlow, 0, 1.35, 1.9, { cast: false });
  box(5.5, 2.2, 0.08, matGlass, 0, 1.35, 2.02, { cast: false });

  // Cantilevered upper volume (offset back + to the side)
  box(4.6, 2.2, 5.4, matWhite, -0.7, 3.95, -0.3);
  // Glass band along the cantilever's exposed long side
  box(0.08, 1.7, 4.6, matGlass, 1.62, 3.95, -0.3, { cast: false });
  box(0.06, 1.6, 4.4, matGlow, 1.55, 3.95, -0.3, { cast: false });

  // Roof slab, overhanging
  box(5.4, 0.2, 6.4, matWhite, -0.6, 5.15, -0.3);

  // Slender brass columns carrying the cantilever's front edge
  [-2.4, -0.6, 1.5].forEach((x) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 16), matBrass);
    c.position.set(x, 1.35, 2.45); c.castShadow = true;
    villa.add(c);
  });

  // Brass trim line at the base parapet
  const trim = new THREE.Mesh(new THREE.BoxGeometry(6.05, 0.06, 4.05), matBrass);
  trim.position.set(0, 2.63, 0); trim.castShadow = false;
  villa.add(trim);

  // A few sculptural trees for scale + warmth
  const tree = (x, z, s = 1) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2 * s, 8), matTrunk);
    trunk.position.y = 0.6 * s; trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 * s, 0), matLeaf);
    crown.position.y = 1.5 * s; crown.castShadow = true; crown.scale.y = 1.3;
    g.add(trunk, crown); g.position.set(x, 0, z);
    villa.add(g);
  };
  tree(-4.2, 3.4, 1.1); tree(-5.4, 1.2, 0.85); tree(4.6, -2.2, 1.0);

  // ---- Atmospheric particles ------------------------------------------
  const COUNT = reduceMotion ? 60 : 240;
  const pgeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = Math.random() * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 26;
  }
  pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: 0xc9a86a, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(particles);

  // ---- Interaction state ----------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scrollEnd = window.innerHeight * 4;
  const showcase = document.getElementById("showcase");
  const computeEnd = () => {
    scrollEnd = showcase ? Math.max(showcase.offsetTop, window.innerHeight) : window.innerHeight * 4;
  };
  computeEnd();

  const target = new THREE.Vector3(0, 1.4, 0);
  const lerp = (a, b, t) => a + (b - a) * t;

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeEnd();
  }
  window.addEventListener("resize", resize, { passive: true });

  // ---- Render loop -----------------------------------------------------
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    const p = Math.min(Math.max(window.scrollY / scrollEnd, 0), 1);
    const ease = p * p * (3 - 2 * p); // smoothstep

    // Smooth the pointer
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Orbit: hero angle -> showcase angle, with a slow idle drift
    const idle = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.05;
    const theta = lerp(0.62, -0.7, ease) + idle + pointer.x * 0.25;
    const radius = lerp(13, 10.5, ease);
    const height = lerp(4.2, 2.6, ease) - pointer.y * 0.6;

    camera.position.x = Math.sin(theta) * radius;
    camera.position.z = Math.cos(theta) * radius;
    camera.position.y = height;
    target.y = lerp(1.6, 1.2, ease);
    camera.lookAt(target);

    if (!reduceMotion) {
      particles.rotation.y = t * 0.02;
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] += 0.004;
        if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = 0;
      }
      pgeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    tick();
  });

  if (typeof onReady === "function") onReady();
  return { renderer, scene, camera };
}
