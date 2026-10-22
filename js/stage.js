/* TT Brush Writing: the courtyard, in Three.js (from TT Pinyin Pop's garden).
   A Chinese courtyard on a sunny day: stone paving, a white wall with a grey tiled top and a round moon gate (bamboo
   behind it), red lanterns along the wall, plum trees in pink blossom, and over the wall a pagoda on a hill and the
   misty, pointy karst mountains of Guilin. On the wall either side of the gate hang two scrolls, 山 and 水 in brush
   ink with a red seal: "mountains and water" (山水) is the oldest subject of Chinese painting and calligraphy.
   The writing paper itself is a 2D canvas over all this (js/paper.js); the boys and their friends stand where the
   paper leaves room. BW.stage.unproject / perPx / project turn screen pixels into the courtyard and back. */
(function () {
  'use strict';
  const T = THREE;
  const BW = (window.BW = window.BW || {});
  const { makeCanvas, toTexture, radialTexture, emojiTexture, rand, pick: pickOne } = Kit.gfx;

  let renderer = null, scene = null, camera = null, W = 1, H = 1;
  const clouds = [], lanterns = [];
  let t = 0;

  // ---------------------------------------------------------------- textures

  function skyTexture() {
    const [c, g] = makeCanvas(4, 512);
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#3b9df0');
    gr.addColorStop(0.42, '#8ccdf8');
    gr.addColorStop(0.6, '#d9f0fb');
    gr.addColorStop(0.68, '#fff3dc');
    gr.addColorStop(1, '#f2e2c4');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    return toTexture(c);
  }
  // square stone slabs with darker joints
  function pavingTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#8f8a80';
    g.fillRect(0, 0, 256, 256);
    const tones = ['#c9c2b3', '#bfb8a8', '#d2ccbe', '#c4bcae', '#b9b2a3'];
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = pickOne(tones);
        g.fillRect(x * 128 + 3, y * 128 + 3, 122, 122);
        for (let i = 0; i < 160; i++) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(90,80,60,0.08)' : 'rgba(255,255,255,0.1)';
          g.fillRect(x * 128 + 3 + Math.random() * 120, y * 128 + 3 + Math.random() * 120, 2, 2);
        }
      }
    const tex = toTexture(c, [70, 70]);
    tex.anisotropy = 4;
    return tex;
  }
  function cloudTexture() {
    const [c, g] = makeCanvas(256, 128);
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[70, 80, 38], [120, 62, 50], [175, 78, 40], [100, 92, 32], [150, 95, 30], [205, 92, 24], [45, 98, 22]]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 30, 0, 125);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(1, 'rgba(170,200,235,0.5)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
    return toTexture(c);
  }
  // the moon gate: white plaster with a round doorway cut out, framed in grey brick
  function gateTexture() {
    const [c, g] = makeCanvas(512, 376); // the same shape as the wall piece (6 x 4.4)
    const cx = 256, cy = 196, r = 156;
    g.fillStyle = '#f7f3ea';
    g.fillRect(0, 0, 512, 376);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillRect(cx - r * 0.55, cy, r * 1.1, 376 - cy); // the doorway reaches the ground
    g.globalCompositeOperation = 'source-over';
    g.lineWidth = 20;
    g.strokeStyle = '#7d8088';
    g.beginPath();
    g.arc(cx, cy, r + 10, Math.PI - 0.95, 0.95, false);
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#5c5f66';
    for (let a = 0; a < 36; a++) {
      const k = Math.PI - 0.95 + (a / 35) * (Math.PI + 1.9);
      g.beginPath();
      g.moveTo(cx + Math.cos(k) * r, cy + Math.sin(k) * r);
      g.lineTo(cx + Math.cos(k) * (r + 20), cy + Math.sin(k) * (r + 20));
      g.stroke();
    }
    return toTexture(c);
  }
  // a hanging scroll: a silk mount, cream paper, one character in brush ink and a little red seal
  function scrollTexture(ch) {
    const [c, g] = makeCanvas(160, 384);
    g.fillStyle = '#cfd8d3';
    g.fillRect(0, 0, 160, 384);
    g.fillStyle = '#b7c4be';
    g.fillRect(0, 0, 160, 40);
    g.fillRect(0, 344, 160, 40);
    g.fillStyle = '#fbf3dc';
    g.fillRect(16, 52, 128, 280);
    const ch0 = BW.byChar && BW.byChar[ch];
    if (ch0) {
      g.save();
      g.translate(22, 110);
      g.scale(1.16, 1.16);
      for (const s of ch0.s) BW.ink.draw(g, s, '#1d1b1a');
      g.restore();
    }
    g.fillStyle = '#c8261e';
    g.fillRect(104, 290, 22, 22);
    g.fillStyle = '#fbf3dc';
    g.fillRect(109, 295, 5, 5);
    g.fillRect(116, 302, 5, 5);
    return toTexture(c);
  }

  const lambert = (color, o = {}) => new T.MeshLambertMaterial(Object.assign({ color }, o));
  function box(w, h, d, mat, x, y, z, parent = scene) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  function buildGarden() {
    scene.background = skyTexture();
    scene.fog = new T.Fog(0xe4eef2, 40, 170);
    scene.add(new T.HemisphereLight(0xfff6e8, 0x8a7f6a, 0.95));
    const sun = new T.DirectionalLight(0xfff0d8, 1.0);
    sun.position.set(10, 16, 12);
    scene.add(sun);

    // stone paving
    const ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshLambertMaterial({ map: pavingTexture() }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // the karst mountains far away: tall rounded peaks in misty blue-green
    const peakGeo = new T.SphereGeometry(1, 20, 14);
    for (const [x, z, w, h, col] of [[-95, -150, 16, 46, 0x7fa8a0], [-70, -140, 13, 36, 0x88b0a6], [-48, -155, 15, 52, 0x7aa29c], [-22, -145, 11, 34, 0x8fb5aa],
      [5, -160, 17, 48, 0x7ca59e], [30, -142, 12, 38, 0x8ab2a7], [55, -152, 15, 50, 0x7fa79f], [82, -144, 13, 36, 0x8db4a9], [108, -156, 16, 46, 0x7ea69f],
      [-120, -158, 15, 40, 0x86ada4], [-35, -175, 18, 58, 0x9bbdb4], [70, -178, 18, 60, 0x9bbdb4]]) {
      const m = new T.Mesh(peakGeo, lambert(col));
      m.scale.set(w, h, w * 0.8);
      m.position.set(x, 0, z);
      scene.add(m);
    }
    // green hills in front of them
    for (const [x, z, r, col] of [[-60, -110, 40, 0x6fa957], [-5, -120, 46, 0x79b25e], [50, -112, 42, 0x6aa553], [100, -118, 40, 0x74ad59]]) {
      const h = new T.Mesh(new T.SphereGeometry(r, 28, 14), lambert(col));
      h.scale.set(1, 0.28, 0.6);
      h.position.set(x, 0, z);
      scene.add(h);
    }

    // a pagoda on a hill: seven tiers, red posts and dark flared roofs
    const pagoda = new T.Group();
    const wallMat = lambert(0xb8322a), roofMat = lambert(0x3d4048), goldMat = lambert(0xe2b23c);
    let y = 0;
    for (let i = 0; i < 7; i++) {
      const r = 3.2 - i * 0.32, h = i === 0 ? 3.2 : 2.3;
      const body = new T.Mesh(new T.CylinderGeometry(r * 0.78, r * 0.8, h, 8), wallMat);
      body.position.y = y + h / 2;
      pagoda.add(body);
      y += h;
      const roof = new T.Mesh(new T.CylinderGeometry(r * 0.5, r * 1.32, 0.9, 8), roofMat);
      roof.position.y = y + 0.3;
      pagoda.add(roof);
      y += 0.6;
    }
    const spire = new T.Mesh(new T.ConeGeometry(0.4, 3, 8), goldMat);
    spire.position.y = y + 1.5;
    pagoda.add(spire);
    pagoda.position.set(-34, 6, -95);
    pagoda.scale.setScalar(1.4);
    scene.add(pagoda);

    // the white wall with its grey tiled top, and the moon gate in the middle
    const WZ = -11, WH = 4.4, GW = 6;
    const plaster = lambert(0xf7f3ea), tiles = lambert(0x575b63), ridge = lambert(0x3e4148);
    for (const side of [-1, 1]) {
      const len = 70;
      box(len, WH, 0.5, plaster, side * (GW / 2 + len / 2), WH / 2, WZ);
      box(len, 0.3, 0.6, lambert(0x9a958b), side * (GW / 2 + len / 2), 0.15, WZ + 0.05); // a grey plinth
    }
    const gate = new T.Mesh(new T.PlaneGeometry(GW, WH), new T.MeshLambertMaterial({ map: gateTexture(), alphaTest: 0.5, side: T.DoubleSide }));
    gate.position.set(0, WH / 2, WZ + 0.26);
    scene.add(gate);
    const gateBack = gate.clone();
    gateBack.position.z = WZ - 0.26;
    scene.add(gateBack);
    // the tiled top: an overhang, a pitched roof and a ridge
    box(GW + 140, 0.32, 1.3, tiles, 0, WH + 0.16, WZ);
    box(GW + 140, 0.5, 0.7, tiles, 0, WH + 0.5, WZ);
    box(GW + 140, 0.22, 0.36, ridge, 0, WH + 0.86, WZ);
    // little tile ends along the front edge
    const capGeo = new T.CylinderGeometry(0.13, 0.13, 0.12, 10);
    for (let x = -40; x <= 40; x += 0.55) {
      const cap = new T.Mesh(capGeo, ridge);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(x, WH + 0.06, WZ + 0.68);
      scene.add(cap);
    }
    // bamboo through the gate and over the wall
    const bambooMats = [0x4f9a3e, 0x5aa846, 0x468c37].map((c) => lambert(c));
    const leafTex = emojiTexture('🍃');
    for (let i = 0; i < 22; i++) {
      const x = rand(-9, 9), z = WZ - rand(1.5, 6), h = rand(6, 10);
      const stalk = new T.Mesh(new T.CylinderGeometry(0.09, 0.11, h, 6), pickOne(bambooMats));
      stalk.position.set(x, h / 2, z);
      stalk.rotation.z = rand(-0.08, 0.08);
      scene.add(stalk);
      for (let k = 0; k < 3; k++) {
        const leaf = new T.Sprite(new T.SpriteMaterial({ map: leafTex, transparent: true }));
        leaf.position.set(x + rand(-0.6, 0.6), h * rand(0.55, 1), z + 0.2);
        leaf.scale.setScalar(rand(0.8, 1.3));
        scene.add(leaf);
      }
    }

    // red lanterns along the wall, gold caps and a tassel, swaying
    const red = new T.MeshPhongMaterial({ color: 0xe12a22, emissive: 0x5a0a06, shininess: 40 });
    const gold = new T.MeshPhongMaterial({ color: 0xf2c14e, emissive: 0x3a2a00 });
    const tassel = lambert(0xd12a20);
    const lanGeo = new T.SphereGeometry(0.5, 18, 14), capG = new T.CylinderGeometry(0.22, 0.26, 0.14, 12), tasG = new T.BoxGeometry(0.07, 0.45, 0.07);
    for (const x of [-21, -15, -9, -4.4, 4.4, 9, 15, 21]) {
      const lan = new T.Group();
      const body = new T.Mesh(lanGeo, red);
      body.scale.set(1, 0.86, 1);
      lan.add(body);
      const top = new T.Mesh(capG, gold);
      top.position.y = 0.47;
      lan.add(top);
      const bot = new T.Mesh(capG, gold);
      bot.position.y = -0.47;
      lan.add(bot);
      const tas = new T.Mesh(tasG, tassel);
      tas.position.y = -0.78;
      lan.add(tas);
      // its glow
      const glow = new T.Sprite(new T.SpriteMaterial({ map: radialTexture(64, [[0, 'rgba(255,190,90,0.55)'], [1, 'rgba(255,120,40,0)']]), transparent: true, depthWrite: false }));
      glow.scale.setScalar(2.2);
      lan.add(glow);
      const holder = new T.Group();
      holder.position.set(x, WH - 0.15, WZ + 0.9);
      lan.position.y = -0.85;
      holder.add(lan);
      const cord = new T.Mesh(new T.BoxGeometry(0.03, 0.4, 0.03), ridge);
      cord.position.y = -0.2;
      holder.add(cord);
      holder.userData.ph = rand(0, 6);
      scene.add(holder);
      lanterns.push(holder);
    }

    // plum trees in blossom, one each side of the yard
    const barkMat = lambert(0x4a3226);
    const blossomTex = ['🌸', '🌸', '💮'].map((e) => emojiTexture(e));
    function plum(x, z, s, flip) {
      const tr = new T.Group();
      const limb = (x0, y0, len, a, r) => {
        const m = new T.Mesh(new T.CylinderGeometry(r * 0.6, r, len, 6), barkMat);
        m.position.set(x0 + (Math.sin(-a) * len) / 2, y0 + (Math.cos(a) * len) / 2, 0);
        m.rotation.z = a;
        tr.add(m);
        return [x0 + Math.sin(-a) * len, y0 + Math.cos(a) * len];
      };
      const [tx, ty] = limb(0, 0, 3, 0.12 * flip, 0.3);
      const tips = [limb(tx, ty, 2.2, 0.7 * flip, 0.16), limb(tx, ty, 2.4, -0.5 * flip, 0.16), limb(tx, ty, 1.8, 0.1, 0.13)];
      const [bx, by] = limb(0, 1.8, 2, -0.9 * flip, 0.15);
      tips.push([bx, by]);
      for (const [px, py] of tips)
        for (let i = 0; i < 9; i++) {
          const b = new T.Sprite(new T.SpriteMaterial({ map: pickOne(blossomTex), transparent: true }));
          b.position.set(px + rand(-0.9, 0.9), py + rand(-0.7, 0.7), rand(-0.5, 0.5));
          b.scale.setScalar(rand(0.45, 0.7));
          tr.add(b);
        }
      tr.position.set(x, 0, z);
      tr.scale.setScalar(s);
      scene.add(tr);
    }
    plum(-13, -7, 1.25, 1);
    plum(14, -8, 1.3, -1);
    plum(-27, -9, 1.1, -1);
    plum(28, -9.5, 1.15, 1);

    // stone planters with little pines by the gate
    const potMat = lambert(0xa49d90), pineMat = lambert(0x2f7a3a, { flatShading: true });
    for (const x of [-4.4, 4.4]) {
      box(1.4, 0.8, 1.4, potMat, x, 0.4, -8.6);
      for (const [dy, r] of [[1.3, 0.9], [2, 0.7], [2.6, 0.45]]) {
        const p = new T.Mesh(new T.IcosahedronGeometry(r, 0), pineMat);
        p.position.set(x, dy, -8.6);
        p.scale.y = 0.6;
        scene.add(p);
      }
    }

    // the sun and clouds
    const halo = new T.Sprite(new T.SpriteMaterial({ map: radialTexture(256, [[0, 'rgba(255,250,215,0.95)'], [0.25, 'rgba(255,236,160,0.6)'], [1, 'rgba(255,230,150,0)']]), transparent: true, depthWrite: false, fog: false }));
    halo.position.set(40, 50, -130);
    halo.scale.setScalar(50);
    scene.add(halo);
    const ct = cloudTexture();
    for (let i = 0; i < 7; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.92 }));
      s.position.set(rand(-100, 100), rand(26, 54), rand(-125, -100));
      const k = rand(16, 28);
      s.scale.set(k, k / 2, 1);
      s.userData.v = rand(0.6, 1.4);
      scene.add(s);
      clouds.push(s);
    }

    // the two scrolls, 山 and 水, either side of the gate, with wooden rods top and bottom
    const rodMat = lambert(0x5a3a26);
    for (const [x, ch] of [[-6.4, '山'], [6.4, '水']]) {
      const sc = new T.Mesh(new T.PlaneGeometry(1.25, 3), new T.MeshLambertMaterial({ map: scrollTexture(ch) }));
      sc.position.set(x, 2.35, WZ + 0.27);
      scene.add(sc);
      for (const y of [0.83, 3.87]) {
        const rod = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.45, 8), rodMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(x, y, WZ + 0.3);
        scene.add(rod);
      }
    }
  }

  // ---------------------------------------------------------------- the camera and the screen

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(40, 1, 0.1, 400);
    buildGarden();
    resize();
  }

  function resize() {
    W = Math.max(1, innerWidth);
    H = Math.max(1, innerHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const portrait = H > W;
    camera.position.set(0, 2.5, portrait ? 16 : 14);
    camera.lookAt(0, portrait ? 4.8 : 3.9, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  const tmpV = new T.Vector3(), tmpD = new T.Vector3(), fwd = new T.Vector3();
  // the world point under screen pixel (x, y): on the plane z = zPlane, or on the ground (y = 0) with ground = true
  function unproject(x, y, zPlane, ground, out = new T.Vector3()) {
    tmpV.set((x / W) * 2 - 1, -(y / H) * 2 + 1, 0.5).unproject(camera);
    tmpD.copy(tmpV).sub(camera.position).normalize();
    const k = ground ? -camera.position.y / tmpD.y : (zPlane - camera.position.z) / tmpD.z;
    return out.copy(camera.position).addScaledVector(tmpD, k);
  }
  // world units per CSS pixel at world point p
  function perPx(p) {
    camera.getWorldDirection(fwd);
    const depth = tmpV.copy(p).sub(camera.position).dot(fwd);
    return (2 * depth * Math.tan((camera.fov * Math.PI) / 360)) / H;
  }
  function project(p) {
    tmpV.copy(p).project(camera);
    return { x: (tmpV.x + 1) * 0.5 * W, y: (1 - tmpV.y) * 0.5 * H };
  }

  // ---------------------------------------------------------------- every frame

  function update(dt) {
    t += dt;
    for (const c of clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 120) c.position.x = -120;
    }
    for (const l of lanterns) l.rotation.z = Math.sin(t * 1.1 + l.userData.ph) * 0.06;
  }
  function render() {
    // a size change can come just before a frame (headless Chrome): keep the renderer in step
    if (innerWidth !== W || innerHeight !== H) resize();
    renderer.render(scene, camera);
  }

  BW.stage = {
    init, resize, update, render, unproject, perPx, project,
    get scene() { return scene; },
    get camera() { return camera; },
    get size() { return { W, H }; },
  };
})();
