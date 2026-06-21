// Persistent 3D backdrop: an abstract "agent network" — a glowing core ringed by
// orbiting agent nodes, wired together with light-lines, with a few floating
// dashboard panels. The camera orbits it as the page scrolls and drifts gently
// with the pointer. Built from primitives only.

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
  scene.fog = new THREE.Fog(0x06070b, 20, 48);

  // Soft studio reflections for the metal + glass.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(10, 4, 11);

  // ---- Lighting --------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x2a3550, 0x05060a, 0.6));

  const key = new THREE.DirectionalLight(0xeaf2ff, 2.1);
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

  const rimCyan = new THREE.DirectionalLight(0x43e6ff, 1.1);
  rimCyan.position.set(10, 5, -9);
  scene.add(rimCyan);

  const rimViolet = new THREE.DirectionalLight(0xa78bfa, 0.7);
  rimViolet.position.set(-8, 3, -10);
  scene.add(rimViolet);

  const coreGlow = new THREE.PointLight(0x43e6ff, 22, 20, 2);
  coreGlow.position.set(0, 1.8, 0);
  scene.add(coreGlow);

  // ---- Materials -------------------------------------------------------
  const matCore   = new THREE.MeshStandardMaterial({ color: 0x0a2730, emissive: 0x43e6ff, emissiveIntensity: 1.15, roughness: 0.35, metalness: 0.2 });
  const matFrame  = new THREE.MeshStandardMaterial({ color: 0x43e6ff, roughness: 0.25, metalness: 1.0 });
  const matNode   = new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 0.5, metalness: 0.6 });
  const matCyan   = new THREE.MeshStandardMaterial({ color: 0x0a2730, emissive: 0x43e6ff, emissiveIntensity: 1.0, roughness: 0.5 });
  const matViolet = new THREE.MeshStandardMaterial({ color: 0x1a1530, emissive: 0xa78bfa, emissiveIntensity: 0.95, roughness: 0.5 });
  const matFloor  = new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.7, metalness: 0.25 });
  const matGlass  = new THREE.MeshPhysicalMaterial({
    color: 0x16202b, roughness: 0.08, metalness: 0,
    transmission: 0.9, transparent: true, opacity: 0.42, ior: 1.4, thickness: 0.5,
    envMapIntensity: 1.2,
  });

  // ---- Build the construct --------------------------------------------
  const rig = new THREE.Group();
  rig.position.y = 1.6;
  scene.add(rig);

  // Grounding floor + faint grid
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 0.3, 64), matFloor);
  floor.position.y = -1.75; floor.receiveShadow = true;
  rig.add(floor);
  const grid = new THREE.GridHelper(22, 22, 0x43e6ff, 0x1b2433);
  grid.position.y = -1.58;
  grid.material.transparent = true; grid.material.opacity = 0.18;
  rig.add(grid);

  // Central core + rotating frame rings
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), matCore);
  core.castShadow = true;
  rig.add(core);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.03, 12, 80), matFrame);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.025, 12, 80), matFrame);
  ringA.rotation.x = Math.PI * 0.5;
  ringB.rotation.x = Math.PI * 0.3; ringB.rotation.y = Math.PI * 0.2;
  rig.add(ringA, ringB);

  // Orbiting agent nodes, wired back to the core
  const nodeCount = reduceMotion ? 8 : 13;
  const nodes = [];
  const linePts = [];
  const onMats = [matCyan, matViolet];
  for (let i = 0; i < nodeCount; i++) {
    // distribute on a sphere (golden-angle spiral)
    const t = i / nodeCount;
    const phi = Math.acos(1 - 2 * (t + 0.5 / nodeCount));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 3.6 + (i % 3) * 0.5;
    const p = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.cos(phi) * (r * 0.55),
      Math.sin(phi) * Math.sin(theta) * r
    );
    const lit = i % 3 !== 2; // ~2/3 of nodes "active"
    const mat = lit ? onMats[i % 2] : matNode;
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.2 + (lit ? 0.05 : 0), 0), mat);
    node.position.copy(p);
    node.castShadow = true;
    rig.add(node);
    nodes.push({ mesh: node, lit, phase: Math.random() * Math.PI * 2, base: mat.emissiveIntensity || 0 });

    // wire to core
    linePts.push(new THREE.Vector3(0, 0, 0), p.clone());
    // wire to the previous node (forms a mesh-y web)
    if (i > 0) { linePts.push(nodes[i - 1].mesh.position.clone(), p.clone()); }
  }

  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x43e6ff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const web = new THREE.LineSegments(lineGeo, lineMat);
  rig.add(web);

  // A few floating dashboard panels (glass + a lit face)
  const panel = (x, y, z, ry, w = 1.6, h = 1.0) => {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), matGlass);
    const lit = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.86, 0.02), matCyan);
    lit.position.z = -0.03;
    g.add(glass, lit);
    g.position.set(x, y, z); g.rotation.y = ry;
    rig.add(g);
    return g;
  };
  const panels = [
    panel(4.0, 1.4, -1.2, -0.5),
    panel(-4.1, -0.6, 0.8, 0.6, 1.4, 0.9),
    panel(1.6, 3.1, -3.4, -0.2, 1.2, 0.8),
  ];
  const panelBaseY = panels.map((p) => p.position.y);

  // ---- Atmospheric particles ------------------------------------------
  const COUNT = reduceMotion ? 60 : 260;
  const pgeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = Math.random() * 16 - 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 28;
  }
  pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: 0x8df3ff, size: 0.045, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(particles);

  // ---- Interaction state ----------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scrollEnd = window.innerHeight * 4;
  const showcase = document.querySelector(".showcase");
  const computeEnd = () => {
    scrollEnd = showcase ? Math.max(showcase.offsetTop, window.innerHeight) : window.innerHeight * 4;
  };
  computeEnd();

  const target = new THREE.Vector3(0, 1.5, 0);
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
    const height = lerp(4.2, 2.8, ease) - pointer.y * 0.6;

    camera.position.x = Math.sin(theta) * radius;
    camera.position.z = Math.cos(theta) * radius;
    camera.position.y = height;
    target.y = lerp(1.8, 1.4, ease);
    camera.lookAt(target);

    if (!reduceMotion) {
      // The construct breathes and slowly turns
      rig.rotation.y = t * 0.06;
      core.rotation.y = -t * 0.25;
      core.rotation.x = t * 0.12;
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      core.scale.setScalar(pulse);
      coreGlow.intensity = 18 + Math.sin(t * 1.6) * 6;
      ringA.rotation.z = t * 0.3;
      ringB.rotation.z = -t * 0.22;

      // Active nodes shimmer
      for (const n of nodes) {
        if (!n.lit) continue;
        n.mesh.material.emissiveIntensity = n.base * (0.7 + Math.abs(Math.sin(t * 1.4 + n.phase)) * 0.6);
      }

      // Panels bob
      panels.forEach((pl, i) => { pl.position.y = panelBaseY[i] + Math.sin(t * 0.8 + i) * 0.06; });

      particles.rotation.y = t * 0.02;
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] += 0.004;
        if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = -2;
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
