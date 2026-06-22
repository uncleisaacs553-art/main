// Persistent 3D backdrop: a polished brass bell, hung from a timber yoke and
// lit like a studio object. It swings gently — "ringing" — while the camera
// orbits it as the page scrolls and drifts with the pointer. Concentric
// "sound" rings pulse outward in time with the swing. Built from primitives.

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
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0f17, 20, 44);

  // Soft studio reflections for the polished brass.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(9, 4, 11);

  // ---- Lighting --------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x46506a, 0x070809, 0.55));

  const key = new THREE.DirectionalLight(0xffe7bd, 2.5);
  key.position.set(-8, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 48;
  key.shadow.camera.left = -14; key.shadow.camera.right = 14;
  key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6f8dff, 0.85);
  rim.position.set(10, 6, -9);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffc06b, 16, 16, 2);
  warm.position.set(0, 3.2, 2.2);
  scene.add(warm);

  // ---- Materials -------------------------------------------------------
  const matBrass = new THREE.MeshStandardMaterial({
    color: 0xd8a64a, roughness: 0.26, metalness: 1.0, envMapIntensity: 1.25,
    side: THREE.DoubleSide,
  });
  const matBrassDark = new THREE.MeshStandardMaterial({ color: 0xa9842f, roughness: 0.38, metalness: 1.0 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.85, metalness: 0.04 });
  const matStone = new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.9, metalness: 0.05 });
  const matRing = new THREE.MeshBasicMaterial({
    color: 0xf2c870, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });

  const PIVOT_Y = 3.5; // height of the yoke axis the bell hangs from

  // ---- Display plinth + grounding -------------------------------------
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.9, 0.4, 64), matStone);
  plinth.position.y = -0.2; plinth.receiveShadow = true; plinth.castShadow = false;
  scene.add(plinth);

  const plinthTrim = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.05, 12, 80), matBrassDark);
  plinthTrim.rotation.x = Math.PI / 2; plinthTrim.position.y = 0.0;
  scene.add(plinthTrim);

  // ---- Timber yoke + A-frame stand (static) ---------------------------
  const stand = new THREE.Group();
  scene.add(stand);

  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.6, 24), matWood);
  yoke.rotation.z = Math.PI / 2; yoke.position.y = PIVOT_Y;
  yoke.castShadow = true; stand.add(yoke);

  // Brass collars where the bell's straps meet the yoke
  [-0.55, 0.55].forEach((x) => {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.22, 20), matBrassDark);
    collar.rotation.z = Math.PI / 2; collar.position.set(x, PIVOT_Y, 0);
    stand.add(collar);
  });

  // Two A-frame uprights, each a pair of splayed legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.16, PIVOT_Y + 0.5, 16);
  [-2.1, 2.1].forEach((x) => {
    [-0.9, 0.9].forEach((z) => {
      const leg = new THREE.Mesh(legGeo, matWood);
      const lean = (PIVOT_Y + 0.5) / 2;
      leg.position.set(x - Math.sign(x) * 0.18, lean - 0.25, z);
      leg.rotation.z = Math.sign(x) * 0.16;
      leg.rotation.x = -Math.sign(z) * 0.22;
      leg.castShadow = true;
      stand.add(leg);
    });
    // little cap block at the apex
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 2.1), matWood);
    cap.position.set(x, PIVOT_Y, 0); cap.castShadow = true;
    stand.add(cap);
  });

  // ---- The bell (swings about the yoke axis) --------------------------
  const bell = new THREE.Group();
  bell.position.set(0, PIVOT_Y, 0);
  scene.add(bell);

  // Bell silhouette, lathed around Y. y=0 at the crown, body hangs downward.
  const profile = [
    [0.06, 0.18], [0.24, 0.10], [0.32, 0.0], [0.42, -0.28],
    [0.54, -0.62], [0.68, -1.02], [0.85, -1.52], [1.05, -2.06],
    [1.34, -2.6], [1.74, -3.0], [2.02, -3.18], [2.04, -3.32],
    [1.86, -3.30], [1.80, -3.12],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bellMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), matBrass);
  bellMesh.castShadow = true; bellMesh.receiveShadow = true;
  bell.add(bellMesh);

  // Crown loop on top + connecting stud
  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.34, 16), matBrass);
  stud.position.y = 0.22; stud.castShadow = true; bell.add(stud);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 16, 32), matBrass);
  loop.position.y = 0.5; loop.castShadow = true; bell.add(loop);

  // Two decorative brass bands around the waist
  [-1.4, -2.4].forEach((y, i) => {
    const r = i === 0 ? 1.0 : 1.55;
    const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 12, 64), matBrassDark);
    band.rotation.x = Math.PI / 2; band.position.y = y; bell.add(band);
  });

  // Clapper: a rod hung from inside the crown with a ball at the end
  const clapper = new THREE.Group();
  bell.add(clapper);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 12), matBrassDark);
  rod.position.y = -1.4; clapper.add(rod);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), matBrass);
  ball.position.y = -2.7; ball.castShadow = true; clapper.add(ball);

  // ---- Concentric "sound" rings ---------------------------------------
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.03, 8, 90), matRing.clone());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    ring.visible = !reduceMotion;
    scene.add(ring);
    rings.push(ring);
  }

  // ---- Atmospheric particles (golden motes) ---------------------------
  const COUNT = reduceMotion ? 60 : 260;
  const pgeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 1] = Math.random() * 13;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
  }
  pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: 0xe7b24c, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
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

    // The bell swings like a pendulum; the clapper lags slightly behind.
    if (!reduceMotion) {
      const swing = Math.sin(t * 1.05) * 0.13;
      bell.rotation.z = swing;
      clapper.rotation.z = Math.sin(t * 1.05 - 0.5) * 0.18;

      // Sound rings expand and fade on each swing-through (twice per period)
      const phase = (t * 1.05) / Math.PI; // ring event ~ every half period
      rings.forEach((ring, i) => {
        const local = (phase + i / rings.length) % 1;
        const s = 1 + local * 2.4;
        ring.scale.set(s, s, s);
        ring.material.opacity = Math.max(0, 0.5 * (1 - local)) * 0.6;
      });
    }

    // Orbit: hero angle -> showcase angle, with a slow idle drift
    const idle = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.05;
    const theta = lerp(0.6, -0.62, ease) + idle + pointer.x * 0.25;
    const radius = lerp(12.5, 9.8, ease);
    const height = lerp(4.0, 2.6, ease) - pointer.y * 0.6;

    camera.position.x = Math.sin(theta) * radius;
    camera.position.z = Math.cos(theta) * radius;
    camera.position.y = height;
    target.y = lerp(1.7, 1.2, ease);
    camera.lookAt(target);

    if (!reduceMotion) {
      particles.rotation.y = t * 0.02;
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] += 0.004;
        if (arr[i * 3 + 1] > 13) arr[i * 3 + 1] = 0;
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
