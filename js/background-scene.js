/* Night/day background for Ahmad Fahril's portfolio.
   Three.js renders the 3D spheres when it can load. Canvas 2D is the offline fallback.
   No image assets are required. */

const canvas = document.getElementById("space-canvas");
const container = document.getElementById("space-background");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobile = window.matchMedia("(max-width: 700px)");
const pointer = { x: 0, y: 0 };
let theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let sceneController = null;

window.addEventListener("portfolio:themechange", event => {
  theme = event.detail.theme === "light" ? "light" : "dark";
  sceneController?.setTheme(theme);
});
window.addEventListener("pointermove", event => {
  if (event.pointerType === "touch") return;
  pointer.x = (event.clientX / window.innerWidth - .5) * 2;
  pointer.y = (event.clientY / window.innerHeight - .5) * 2;
}, { passive: true });

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// A soft circular texture for the glow around the sun and moon.
function glowTexture(THREE, rgb) {
  const surface = document.createElement("canvas");
  surface.width = surface.height = 128;
  const ctx = surface.getContext("2d");
  const radial = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  radial.addColorStop(0, `rgba(${rgb},.42)`);
  radial.addColorStop(.27, `rgba(${rgb},.21)`);
  radial.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(surface);
}

async function makeThreeScene(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile.matches, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  camera.position.set(0, 0, 18);

  const ambient = new THREE.AmbientLight(0xb4cbe8, 1.3);
  const moonLight = new THREE.DirectionalLight(0xf2f5ff, 3.2);
  moonLight.position.set(-2, 5, 12);
  scene.add(ambient, moonLight);

  const starCount = mobile.matches ? 120 : 360;
  const positions = new Float32Array(starCount * 3);
  const colorArray = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = random(-33, 33);
    positions[i * 3 + 1] = random(-22, 22);
    positions[i * 3 + 2] = random(-17, -2);
    const shade = random(.64, 1);
    colorArray[i * 3] = shade * .77;
    colorArray[i * 3 + 1] = shade * .91;
    colorArray[i * 3 + 2] = shade;
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
  const starsMaterial = new THREE.PointsMaterial({ size: mobile.matches ? .085 : .105, vertexColors: true, transparent: true, opacity: .7, sizeAttenuation: true, depthWrite: false });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  const sunGroup = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcf7a })
  );
  sunGroup.add(sun);
  const sunGlowMaterial = new THREE.SpriteMaterial({ map: glowTexture(THREE, "255,178,65"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .85 });
  const sunGlow = new THREE.Sprite(sunGlowMaterial);
  sunGlow.scale.set(8.3, 8.3, 1);
  sunGroup.add(sunGlow);
  scene.add(sunGroup);

  const moonGroup = new THREE.Group();
  const moonGeometry = new THREE.SphereGeometry(1.65, 54, 42);
  const moonMesh = new THREE.Mesh(moonGeometry, new THREE.MeshStandardMaterial({ color: 0xc2d4da, roughness: .96, metalness: 0 }));
  moonGroup.add(moonMesh);
  // Craters are shallow colored patches attached to the moon's curved surface.
  const craterMaterial = new THREE.MeshStandardMaterial({ color: 0x8cabb9, transparent: true, opacity: .36, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const craterData = [
    [-.65, .49, .22], [-.16, .72, .12], [.61, .31, .31], [.25, -.38, .19],
    [-.7, -.28, .14], [.72, -.52, .15], [-.20, -.80, .24], [.12, .17, .10]
  ];
  for (const [x, y, radius] of craterData) {
    const depth = Math.sqrt(Math.max(.05, 1 - x*x - y*y));
    const normal = new THREE.Vector3(x, y, depth).normalize();
    const crater = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), craterMaterial);
    crater.position.copy(normal).multiplyScalar(1.66);
    crater.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    moonGroup.add(crater);
  }
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE, "155,207,239"), transparent: true, opacity: .49, depthWrite: false }));
  moonGlow.scale.set(6.6, 6.6, 1);
  moonGroup.add(moonGlow);
  scene.add(moonGroup);

  let worldW = 20;
  let worldH = 12;
  let visibility = theme === "light" ? 1 : 0;
  let nextMeteor = performance.now() + random(9500, 14000);
  let meteor = null;
  let then = performance.now();
  let raf = 0;
  let isRunning = false;

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.1 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    worldH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    worldW = worldH * camera.aspect;
  }

  function launchMeteor() {
    const sx = random(-worldW*.4, worldW*.56);
    const sy = random(worldH*.17, worldH*.48);
    const start = new THREE.Vector3(sx, sy, -1.8);
    const end = start.clone().add(new THREE.Vector3(random(4, 8), random(-4.5, -2.4), 0));
    const geometry = new THREE.BufferGeometry().setFromPoints([start, start]);
    const material = new THREE.LineBasicMaterial({ color: theme === "light" ? 0xffd5a0 : 0xc3f7ff, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    const streak = new THREE.Line(geometry, material);
    streak.renderOrder = 5;
    scene.add(streak);
    meteor = { start, end, streak, geometry, material, started: performance.now(), duration: random(750, 1600) };
  }

  function updateMeteor(now) {
    if (!meteor) return;
    const t = clamp((now - meteor.started) / meteor.duration, 0, 1);
    const head = meteor.start.clone().lerp(meteor.end, t);
    const tail = meteor.start.clone().lerp(meteor.end, clamp(t - .18, 0, 1));
    meteor.geometry.setFromPoints([tail, head]);
    meteor.material.opacity = Math.sin(Math.PI * t) * (theme === "dark" ? .9 : .36);
    if (t >= 1) {
      scene.remove(meteor.streak);
      meteor.geometry.dispose();
      meteor.material.dispose();
      meteor = null;
    }
  }

  function draw(now) {
    if (!isRunning) return;
    const elapsed = Math.min((now - then) / 1000, .05);
    then = now;
    if (!reduceMotion.matches) {
      visibility += ((theme === "light" ? 1 : 0) - visibility) * Math.min(1, elapsed * 1.9);
      stars.rotation.y += elapsed * .0018;
      stars.rotation.z += elapsed * .0009;
      stars.position.x += ((pointer.x * -.37) - stars.position.x) * Math.min(1, elapsed * 1.8);
      stars.position.y += ((pointer.y * .20) - stars.position.y) * Math.min(1, elapsed * 1.8);
      if (now > nextMeteor && !meteor) {
        launchMeteor();
        nextMeteor = now + (theme === "dark" ? random(10000, 25000) : random(35000, 65000));
      }
      updateMeteor(now);
    } else visibility = theme === "light" ? 1 : 0;

    const x = worldW * (mobile.matches ? .265 : .305);
    const y = worldH * (mobile.matches ? .22 : .145);
    const targetX = x + (reduceMotion.matches ? 0 : pointer.x*.20);
    const targetY = y - (reduceMotion.matches ? 0 : pointer.y*.12);
    const floatY = reduceMotion.matches ? 0 : Math.sin(now*.00021)*.14;
    sunGroup.position.set(targetX, targetY + floatY + (1 - visibility)*worldH*1.05, -4);
    moonGroup.position.set(targetX, targetY + floatY - visibility*worldH*1.05, -4);
    sunGroup.scale.setScalar(mobile.matches ? .68 : 1);
    moonGroup.scale.setScalar(mobile.matches ? .7 : 1);
    sun.rotation.y += reduceMotion.matches ? 0 : elapsed*.06;
    moonMesh.rotation.y += reduceMotion.matches ? 0 : elapsed*.009;
    sunGlowMaterial.opacity = visibility*.85;
    moonGlow.material.opacity = (1 - visibility)*.49;
    starsMaterial.opacity = .72*(1-visibility) + .05*visibility;
    renderer.render(scene, camera);
    if (!reduceMotion.matches) raf = window.requestAnimationFrame(draw);
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    then = performance.now();
    draw(then);
  }
  function stop() { isRunning = false; window.cancelAnimationFrame(raf); }
  resize();
  container.classList.add("is-rendering");
  start();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
  reduceMotion.addEventListener?.("change", () => { stop(); start(); });
  return {
    setTheme(next) {
      theme = next;
      if (reduceMotion.matches) { visibility = next === "light" ? 1 : 0; draw(performance.now()); }
    }
  };
}

// Offline and low-power fallback: a few particles + shaded sun/moon, no download needed.
function makeCanvasFallback() {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setTheme() {} };
  let w = 0, h = 0, scale = 1;
  let starList = [];
  let meteor = null;
  let nextMeteor = performance.now() + random(10000, 15000);
  let raf = 0;
  let running = false;

  function resize() {
    w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
    scale = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.35);
    canvas.width = Math.floor(w * scale); canvas.height = Math.floor(h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    starList = Array.from({ length: mobile.matches ? 65 : 180 }, () => ({
      x: Math.random(), y: Math.random(), z: random(.2, 1), radius: random(.45, 1.45), phase: random(0, Math.PI*2)
    }));
  }

  function sphere(cx, cy, radius, isDay, now) {
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, radius*.55, cx, cy, radius*2.4);
    glow.addColorStop(0, isDay ? "rgba(255,185,86,.20)" : "rgba(156,206,240,.10)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, radius*2.4, 0, Math.PI*2); ctx.fill();
    const shaded = ctx.createRadialGradient(cx-radius*.38, cy-radius*.38, radius*.02, cx+radius*.15, cy+radius*.2, radius*1.22);
    if (isDay) {
      shaded.addColorStop(0, "#fff7bf"); shaded.addColorStop(.55, "#ffd67f"); shaded.addColorStop(1, "#f39b51");
    } else {
      shaded.addColorStop(0, "#f0f6f5"); shaded.addColorStop(.48, "#abc4d0"); shaded.addColorStop(1, "#34556e");
    }
    ctx.fillStyle = shaded;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
    if (!isDay) {
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.clip();
      const craters = [[-.45,-.18,.15],[.35,-.4,.1],[.26,.35,.19],[-.22,.46,.09],[.6,.12,.08]];
      craters.forEach(([x, y, r]) => {
        ctx.fillStyle = "rgba(61,94,118,.17)";
        ctx.beginPath(); ctx.ellipse(cx+x*radius,cy+y*radius,r*radius,r*radius*.83,0,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.restore();
  }

  function draw(now = 0) {
    ctx.clearRect(0, 0, w, h);
    const isDay = theme === "light";
    const time = reduceMotion.matches ? 0 : now * .001;
    starList.forEach(star => {
      const opacity = isDay ? .055 : (.30 + Math.sin(time*.65+star.phase)*.18)*star.z;
      const moveX = reduceMotion.matches ? 0 : pointer.x*star.z*13 + time*star.z*.35;
      const moveY = reduceMotion.matches ? 0 : pointer.y*star.z*-9;
      const x = ((star.x*w + moveX) % w + w) % w;
      const y = clamp(star.y*h + moveY, 0, h);
      ctx.fillStyle = `rgba(216,243,255,${clamp(opacity,0,1)})`;
      ctx.beginPath(); ctx.arc(x, y, star.radius*star.z, 0, Math.PI*2); ctx.fill();
    });
    const cx = w * (mobile.matches ? .82 : .79) + (reduceMotion.matches ? 0 : pointer.x*5);
    const cy = h * (mobile.matches ? .31 : .26) + (reduceMotion.matches ? 0 : Math.sin(time*.3)*6);
    sphere(cx, cy, mobile.matches ? Math.min(w*.21, 72) : Math.min(w*.105, 145), isDay, now);
    if (!reduceMotion.matches) {
      if (now > nextMeteor && !meteor) {
        meteor = { startX:random(w*.04,w*.75), startY:random(h*.05,h*.4), dx:random(w*.16,w*.36), dy:random(h*.14,h*.36), start:now, duration:random(750,1600) };
        nextMeteor = now + (isDay ? random(35000,65000) : random(10000,25000));
      }
      if (meteor) {
        const t = (now - meteor.start)/meteor.duration;
        if (t >= 1) meteor = null;
        else {
          const x = meteor.startX + meteor.dx*t, y = meteor.startY + meteor.dy*t;
          const trail = Math.min(t,.22);
          const grad = ctx.createLinearGradient(x-meteor.dx*trail,y-meteor.dy*trail,x,y);
          grad.addColorStop(0,"rgba(172,240,255,0)");
          grad.addColorStop(1,`rgba(220,251,255,${Math.sin(Math.PI*t)*(isDay ? .4 : .92)})`);
          ctx.strokeStyle=grad;ctx.lineWidth=mobile.matches?1:1.7;
          ctx.beginPath();ctx.moveTo(x-meteor.dx*trail,y-meteor.dy*trail);ctx.lineTo(x,y);ctx.stroke();
        }
      }
    }
    if (running && !reduceMotion.matches) raf = requestAnimationFrame(draw);
  }
  function start() {
    if (running) return;
    running = true;
    draw(performance.now());
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  resize(); container.classList.add("is-rendering"); start();
  window.addEventListener("resize", () => { resize(); draw(performance.now()); }, { passive:true });
  document.addEventListener("visibilitychange", () => { if(document.hidden) stop(); else start(); });
  reduceMotion.addEventListener?.("change", () => { stop(); start(); });
  return { setTheme(next) { theme = next; if (reduceMotion.matches) draw(performance.now()); } };
}

async function init() {
  if (!canvas || !container) return;
  // Dynamic import means the rest of the website still works if CDN/WebGL is unavailable.
  try {
    const THREE = await Promise.race([
      import("https://cdn.jsdelivr.net/npm/three@0.175.0/build/three.module.js"),
      wait(6500).then(() => { throw new Error("3D library loading timed out"); })
    ]);
    sceneController = await makeThreeScene(THREE);
  } catch (error) {
    console.info("3D renderer unavailable; using the built-in sky renderer.");
    sceneController = makeCanvasFallback();
  }
}

init();
