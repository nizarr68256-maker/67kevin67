/* ==========================================================
   CITY — SCENE FOUNDATION (Three.js) — grid-based, deterministic
   ==========================================================
   ROAD = garis grid tetap → BLOCK → BUILDING = lot dgn margin
   aman. Mobil bergerak sebagai waypoint linear di tiap ruas
   grid (rotation.y saja / yaw murni), dengan offset lane agar
   arus dua arah tidak saling menumpuk di tengah jalan.
   ========================================================== */

window.CityWorld = (function () {
	let cityScene, cityCamera, cityRenderer, cityRoot;
	let cityGroups = {};
	let canvasEl, containerEl;
	let clock = null,
		rafId = null;
	let isRunning = false;

	let terrainState = null;
	let roadLines = [];
	let roadGraph = null;
	let vehicles = [];
	let buildingRegistry = new Map();
	let laneOffsetDist = 1.8;
	let introState = null;
	let idleTime = 0;
	let cameraFocusState = null;
	let skyBalloons = [];
	let skyBirds = [];
	let onCameraIntroDoneCallback = null;

	/* ---------------- COLOR PALETTE & MATERIAL CACHE ---------------- */
	const BUILDING_COLORS = {
		residential: {
			body: [0xe8d5b7, 0xd9c6a5, 0xc9b28a, 0xe6dcc3],
			roof: [0x6b4a3a, 0x7a5a4a, 0x8a6a5a],
			window: [0x3c6bd2, 0x6b8e9c, 0x5a7a8a]
		},
		apartment: {
			body: [0xe0d6c8, 0xd0c8b8, 0xc8b8a0, 0xb8c8d8],
			band: [0xb0a090, 0xa09080, 0x90a0b0],
			window: [0x5a7a9a, 0x4a6a8a, 0x3a5a7a],
			roof: [0x4a3a2a, 0x5a4a3a]
		},
		commercial: {
			body: [0xe8c870, 0xd89050, 0xc87040, 0xe0a060],
			accent: [0xd23c3c, 0x2a7a3c, 0x3c6bd2, 0xe8b830]
		},
		office: {
			body: [0xd8d0c0, 0xc8d0d8, 0xb8c8d0],
			band: [0xa0a8b8, 0x98a0b0],
			window: [0x5a7a9a, 0x4a6a8a],
			roof: [0x4a4a4a]
		},
		tower: {
			body: [0x8898a8, 0x7890a0, 0x6a7a8a, 0xa0b0c0],
			band: [0x5a6a7a, 0x4a5a6a],
			window: [0x3a4a5a, 0x2a3a4a],
			roof: [0x2a2a2a]
		},
		kiosk: {
			body: [0xe8c840, 0xe89040, 0x40b0b0, 0xd04040],
			roof: [0xd23c3c, 0x2a7a3c, 0x3c6bd2],
			sign: [0xffffff]
		},
		minimarket: {
			body: [0xf0f0f0, 0xe8e8e8, 0xe0d8d0],
			accent: [0x2a7a3c, 0xd23c3c, 0x3c6bd2],
			sign: [0xffffff],
			glass: [0x8fc4e8]
		}
	};

	function pickFromArray(arr, seedStr) {
		let h = 0;
		for (let i = 0; i < seedStr.length; i++) {
			h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
		}
		return arr[h % arr.length];
	}

	const sharedMaterialCache = new Map();
	function getSharedMaterial(colorHex, roughness = 0.85, metalness = 0.05) {
		const key = colorHex + "_" + roughness + "_" + metalness;
		if (!sharedMaterialCache.has(key)) {
			sharedMaterialCache.set(
				key,
				new THREE.MeshStandardMaterial({
					color: colorHex,
					roughness,
					metalness
				})
			);
		}
		return sharedMaterialCache.get(key);
	}

	function makePRNG(seed) {
		let a = seed >>> 0;
		return function () {
			a |= 0;
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/* ---------------------------------------------------------- */
	function initCity(canvas, container) {
  if (isRunning) return false;

  try {
    canvasEl = canvas;
    containerEl = container || (canvas && canvas.parentElement);

    if (!canvasEl || typeof THREE === "undefined") {
      console.warn("CityWorld: canvas atau Three.js tidak tersedia.");
      return false;
    }

    const CFG = window.CITY_CONFIG || {};

    buildScene(CFG);
    buildCamera(CFG);
    buildRenderer();
    buildLighting(CFG);
    buildRoot();

    buildTerrain(CFG);
    buildRoadNetwork(CFG);
    roadGraph = buildRoadGraph(CFG);
    buildBlockGround(CFG);
    buildUrbanSurfaces(CFG);
    buildBuildings(CFG);
    buildCityCenterFountain();
    buildVegetation(CFG);
    buildStreetFurniture(CFG);
    buildStaticCars(CFG);

    buildForest(CFG);
    buildMountains(CFG);
    buildMountainClouds(CFG);

    buildVehicles(CFG);
    buildAtmosphere();
    buildSkyBalloons(CFG);
    buildSkyBirds(CFG);

    validateLayout(CFG);

    startCameraIntro(CFG);

    window.addEventListener("resize", resizeCity);
    resizeCity();

    if (!clock) {
      clock = new THREE.Clock();
    }

    isRunning = true;
    animateCity();

    return true;  // ✅ Sukses
  } catch (error) {
    console.error("[CityWorld] initCity error:", error);
    isRunning = false;
    return false; // ❌ Gagal
  }
}

	function destroyCity() {
		if (!isRunning) return;
		cancelAnimationFrame(rafId);
		window.removeEventListener("resize", resizeCity);
		if (cityRenderer) cityRenderer.dispose();
		cityScene = cityCamera = cityRenderer = cityRoot = undefined;
		cityGroups = {};
		terrainState = null;
		roadLines = [];
		roadGraph = null;
		vehicles = [];
		buildingRegistry = new Map();
		introState = null;
		idleTime = 0;
		isRunning = false;
	}

	/* ---------------- SCENE / CAMERA / RENDERER / LIGHT ---------------- */
	function buildScene(CFG) {
		const env = CFG.environment || {};
		cityScene = new THREE.Scene();
		cityScene.background = new THREE.Color(env.skyColor ?? 0x8fc4e8);
		cityScene.fog = new THREE.Fog(
			env.fogColor ?? env.skyColor ?? 0x8fc4e8,
			env.fogNear ?? 140,
			env.fogFar ?? 420
		);
	}

	function buildCamera(CFG) {
		const c = CFG.camera || {};
		cityCamera = new THREE.PerspectiveCamera(
			c.fov ?? 50,
			1,
			c.near ?? 0.5,
			c.far ?? 800
		);
		const firstIntro = c.introPath && c.introPath[0] && c.introPath[0].pos;
		const pos = firstIntro || c.startPosition || { x: 0, y: 22, z: 46 };
		const look = (c.introPath && c.introPath[0] && c.introPath[0].lookAt) ||
			c.lookAt || { x: 0, y: 0, z: 0 };
		cityCamera.position.set(pos.x, pos.y, pos.z);
		cityCamera.lookAt(look.x, look.y, look.z);
	}

	function buildRenderer() {
		cityRenderer = new THREE.WebGLRenderer({
			canvas: canvasEl,
			antialias: true
		});
		cityRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		cityRenderer.shadowMap.enabled = true;
		cityRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
		cityRenderer.outputEncoding = THREE.sRGBEncoding;
		cityRenderer.toneMapping = THREE.ACESFilmicToneMapping;
		cityRenderer.toneMappingExposure = 1.15;
	}

	function buildLighting(CFG) {
		const env = CFG.environment || {};
		const hemi = new THREE.HemisphereLight(
			env.skyHemiColor ?? 0xbfe0ff,
			env.groundHemiColor ?? 0x5c7e58,
			env.hemiIntensity ?? 0.9
		);
		cityScene.add(hemi);
		const ambient = new THREE.AmbientLight(
			env.ambientColor ?? 0xffffff,
			env.ambientIntensity ?? 0.6
		);
		cityScene.add(ambient);
		const sunPos = env.sunPosition || { x: -60, y: 120, z: 60 };
		const sun = new THREE.DirectionalLight(
			env.sunColor ?? 0xfff3da,
			env.sunIntensity ?? 1.6
		);
		sun.position.set(sunPos.x, sunPos.y, sunPos.z);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1536, 1536);
		sun.shadow.camera.left = -180;
		sun.shadow.camera.right = 180;
		sun.shadow.camera.top = 180;
		sun.shadow.camera.bottom = -180;
		sun.shadow.camera.far = 360;
		sun.shadow.bias = -0.0012;
		cityScene.add(sun);
		cityScene.add(sun.target);
	}

	function buildRoot() {
		cityRoot = new THREE.Group();
		cityRoot.name = "CityRoot";
		[
			"Environment",
			"Ground",
			"Roads",
			"Buildings",
			"Nature",
			"Vehicles",
			"Interactive"
		].forEach(name => {
			const g = new THREE.Group();
			g.name = name;
			cityGroups[name] = g;
			cityRoot.add(g);
		});
		cityScene.add(cityRoot);
	}

	/* ---------------- TERRAIN (deterministic, flat di bawah kota) ---------------- */
	function terrainNoise(x, z) {
		return (
			(Math.sin(x * 1.7 + z * 0.6) +
				Math.sin(x * 0.4 - z * 1.3) +
				Math.sin((x + z) * 0.9)) /
			3
		);
	}
	function smoothstepClamp(v, a, b) {
		const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
		return t * t * (3 - 2 * t);
	}
	function computeTerrainHeight(x, z) {
		const s = terrainState || {
			elevationScale: 0.6,
			noiseScale: 0.015,
			flattenCenter: { x: 0, z: 25 },
			flattenRadius: 110
		};

		const dist = Math.hypot(x - s.flattenCenter.x, z - s.flattenCenter.z);

		// Area kota benar-benar datar
		if (dist <= s.flattenRadius) {
			return 0;
		}

		const h =
			terrainNoise(x * s.noiseScale, z * s.noiseScale) * s.elevationScale;

		// Transisi halus di luar area kota
		const transition = smoothstepClamp(
			dist,
			s.flattenRadius,
			s.flattenRadius + 40
		);

		return h * transition;
	}
	function getTerrainHeight(x, z) {
		return computeTerrainHeight(x, z);
	}

	function buildTerrain(CFG) {
		const t = CFG.terrain || {};
		terrainState = {
			elevationScale: t.elevationScale ?? 0.6,
			noiseScale: t.noiseScale ?? 0.015,
			flattenCenter: t.flattenCenter || { x: 0, z: 25 },
			flattenRadius: t.flattenRadius ?? 220
		};

		const size = t.size ?? 420;
		const segments = t.segments ?? 90;
		const geometry = new THREE.PlaneGeometry(
			size,
			size,
			segments,
			segments
		);
		geometry.rotateX(-Math.PI / 2);

		const pos = geometry.attributes.position;
		const colors = [];
		const baseColor = new THREE.Color(t.baseColor ?? 0x4d6e4f);
		const urbanColor = new THREE.Color(t.urbanColor ?? 0x9e9e9e);
		const variation = t.colorVariation ?? 0.12;

		const flattenCenter = terrainState.flattenCenter;
		const flattenRadius = terrainState.flattenRadius;

		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i),
				z = pos.getZ(i);
			pos.setY(i, computeTerrainHeight(x, z));

			// Tentukan warna dasar: urban (di dalam flatten) atau hijau (di luar)
			const dist = Math.hypot(x - flattenCenter.x, z - flattenCenter.z);
			const c =
				dist <= flattenRadius ? urbanColor.clone() : baseColor.clone();
			c.offsetHSL(
				0,
				0,
				terrainNoise(x * 0.05 + 50, z * 0.05 + 50) * variation
			);
			colors.push(c.r, c.g, c.b);
		}
		geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(colors, 3)
		);
		geometry.computeVertexNormals();

		const material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 1,
			metalness: 0
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.name = "CityTerrain";
		mesh.receiveShadow = true;
		cityGroups.Ground.add(mesh);
	}

	/* ---------------- ROAD NETWORK — garis grid lurus ---------------- */
	function buildRoadNetwork(CFG) {
		const r = CFG.road || {};
		const width = r.width ?? 8;
		const sidewalkW = width + (r.sidewalkWidth ?? 1.6) * 2;
		laneOffsetDist = r.laneOffset ?? 1.4;

		const sidewalkOffset = 0.12;
		const roadOffset = 0.22;
		const markingOffset = 0.28;
		const intersectionOffset = 0.3;

		const roadMat = new THREE.MeshStandardMaterial({
			color: r.color ?? 0x24262b,
			roughness: 0.85
		});
		const sidewalkMat = new THREE.MeshStandardMaterial({
			color: r.sidewalkColor ?? 0xa8adb4,
			roughness: 1
		});
		const markMat = new THREE.MeshStandardMaterial({
			color: r.markingColor ?? 0xf2f2f2,
			roughness: 0.6
		});
		const intersectionMat = new THREE.MeshStandardMaterial({
			color: r.color ?? 0x24262b,
			roughness: 0.85,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1
		});

		(CFG.roads || []).forEach(def => {
			const a =
				def.axis === "x"
					? { x: def.from, z: def.at }
					: { x: def.at, z: def.from };
			const b =
				def.axis === "x"
					? { x: def.to, z: def.at }
					: { x: def.at, z: def.to };

			const ya = getTerrainHeight(a.x, a.z),
				yb = getTerrainHeight(b.x, b.z);
			const va = new THREE.Vector3(a.x, ya, a.z);
			const vb = new THREE.Vector3(b.x, yb, b.z);

			addStraightStrip(va, vb, sidewalkW, sidewalkMat, sidewalkOffset);
			addStraightStrip(va, vb, width, roadMat, roadOffset);
			addDashedMarking(va, vb, 0.25, markMat, markingOffset);

			roadLines.push({
				id: def.id,
				axis: def.axis,
				at: def.at,
				a: va,
				b: vb,
				length: va.distanceTo(vb)
			});
		});

		buildIntersections(CFG, intersectionMat, intersectionOffset, width);
	}

	function buildIntersections(CFG, material, yOffset, width) {
		for (let i = 0; i < roadLines.length; i++) {
			for (let j = i + 1; j < roadLines.length; j++) {
				const r1 = roadLines[i];
				const r2 = roadLines[j];
				if (r1.axis === r2.axis) continue;

				const vertical = r1.axis === "z" ? r1 : r2;
				const horizontal = r1.axis === "x" ? r1 : r2;

				const vx = vertical.at;
				const vz = horizontal.at;

				const vMin = Math.min(vertical.a.z, vertical.b.z);
				const vMax = Math.max(vertical.a.z, vertical.b.z);
				const hMin = Math.min(horizontal.a.x, horizontal.b.x);
				const hMax = Math.max(horizontal.a.x, horizontal.b.x);

				if (vx >= hMin && vx <= hMax && vz >= vMin && vz <= vMax) {
					const geometry = new THREE.PlaneGeometry(width, width);
					geometry.rotateX(-Math.PI / 2);
					const mesh = new THREE.Mesh(geometry, material);
					mesh.position.set(
						vx,
						getTerrainHeight(vx, vz) + yOffset,
						vz
					);
					mesh.receiveShadow = true;
					cityGroups.Roads.add(mesh);
				}
			}
		}
	}

	function addStraightStrip(a, b, width, material, yOffset) {
		const dir = new THREE.Vector3().subVectors(b, a);
		const length = dir.length();
		if (length < 0.001) return;
		dir.normalize();
		const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

		const geometry = new THREE.PlaneGeometry(width, length);
		geometry.rotateX(-Math.PI / 2);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(mid.x, mid.y + yOffset, mid.z);
		mesh.rotation.y = Math.atan2(dir.x, dir.z);
		mesh.receiveShadow = true;
		cityGroups.Roads.add(mesh);
	}

	function addDashedMarking(a, b, width, material, yOffset) {
		const dashLen = 1.4,
			gapLen = 1.6;
		const dir = new THREE.Vector3().subVectors(b, a);
		const total = dir.length();
		if (total < 0.001) return;
		dir.normalize();
		const yaw = Math.atan2(dir.x, dir.z);

		let dist = 0;
		while (dist < total) {
			const len = Math.min(dashLen, total - dist);
			const centerDist = dist + len / 2;
			const p = new THREE.Vector3()
				.copy(a)
				.addScaledVector(dir, centerDist);
			const geometry = new THREE.PlaneGeometry(width, len);
			geometry.rotateX(-Math.PI / 2);
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(p.x, p.y + yOffset, p.z);
			mesh.rotation.y = yaw;
			cityGroups.Roads.add(mesh);
			dist += dashLen + gapLen;
		}
	}

	/* ---------------- ROAD GRAPH ---------------- */
	function buildRoadGraph(CFG) {
		const nodes = new Map();
		const edges = [];
		const roadDefs = CFG.roads || [];
		const EPS = 1e-6;

		function nodeKey(x, z) {
			return x.toFixed(3) + "_" + z.toFixed(3);
		}
		function getOrCreateNode(x, z) {
			const k = nodeKey(x, z);
			let n = nodes.get(k);
			if (!n) {
				n = { key: k, x, z, y: getTerrainHeight(x, z), edges: [] };
				nodes.set(k, n);
			}
			return n;
		}

		roadDefs.forEach(def => {
			const isX = def.axis === "x";
			const lo = Math.min(def.from, def.to),
				hi = Math.max(def.from, def.to);

			const cuts = new Set([lo, hi]);
			roadDefs.forEach(other => {
				if (other === def || other.axis === def.axis) return;
				const otherLo = Math.min(other.from, other.to),
					otherHi = Math.max(other.from, other.to);
				const crosses =
					other.at >= lo - EPS &&
					other.at <= hi + EPS &&
					def.at >= otherLo - EPS &&
					def.at <= otherHi + EPS;
				if (crosses) cuts.add(other.at);
			});

			const sorted = Array.from(cuts).sort((a, b) => a - b);
			for (let i = 0; i < sorted.length - 1; i++) {
				const c0 = sorted[i],
					c1 = sorted[i + 1];
				if (Math.abs(c1 - c0) < EPS) continue;
				const p0 = isX ? { x: c0, z: def.at } : { x: def.at, z: c0 };
				const p1 = isX ? { x: c1, z: def.at } : { x: def.at, z: c1 };
				const nodeA = getOrCreateNode(p0.x, p0.z);
				const nodeB = getOrCreateNode(p1.x, p1.z);
				const a = new THREE.Vector3(nodeA.x, nodeA.y, nodeA.z);
				const b = new THREE.Vector3(nodeB.x, nodeB.y, nodeB.z);
				const edgeIndex = edges.length;
				edges.push({
					id: def.id + "#" + i,
					roadId: def.id,
					a,
					b,
					length: a.distanceTo(b),
					nodeAKey: nodeA.key,
					nodeBKey: nodeB.key
				});
				nodeA.edges.push(edgeIndex);
				nodeB.edges.push(edgeIndex);
			}
		});

		return { nodes, edges };
	}

	/* ---------------- BLOCK GROUND ---------------- */
	function buildBlockGround(CFG) {
		Object.entries(CFG.blocks || {}).forEach(([key, block]) => {
			const geometry = new THREE.PlaneGeometry(
				block.size.x,
				block.size.z
			);
			geometry.rotateX(-Math.PI / 2);
			const material = new THREE.MeshStandardMaterial({
				color: block.tint,
				transparent: true,
				opacity: 0.45,
				roughness: 1
			});
			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(
				block.center.x,
				getTerrainHeight(block.center.x, block.center.z) + 0.015,
				block.center.z
			);
			mesh.name = "Block_" + key;
			cityGroups.Ground.add(mesh);
		});
	}

	/* ---------------- URBAN SURFACES (pavement/plaza/parking/path) ---------------- */
	function buildUrbanSurfaces(CFG) {
		(CFG.surfaces || []).forEach(s => {
			let geometry;
			if (s.shape === "circle") {
				geometry = new THREE.CircleGeometry(s.radius || 5, 32);
			} else {
				geometry = new THREE.PlaneGeometry(s.size.x, s.size.z);
			}
			geometry.rotateX(-Math.PI / 2);
			const material = getSharedMaterial(s.color, 0.9, 0.05);
			const mesh = new THREE.Mesh(geometry, material);
			const y =
				getTerrainHeight(s.center.x, s.center.z) +
				(s.kind === "water"
					? 0.35
					: s.kind === "pocket-park"
						? 0.04
						: 0.05);
			mesh.position.set(s.center.x, y, s.center.z);
			mesh.rotation.y = s.rotation ?? 0;
			mesh.receiveShadow = true;
			mesh.name = "Surface_" + s.id;
			cityGroups.Ground.add(mesh);
		});
	}
	/* ---------------- ARAH HADAP RUMAH BERDASARKAN JALAN TERDEKAT ---------------- */
	function getNearestRoadDirection(x, z) {
		let minDistSq = Infinity;
		let direction = { x: 0, z: 1 }; // default utara

		for (const road of roadLines) {
			const a = road.a;
			const b = road.b;

			const abx = b.x - a.x;
			const abz = b.z - a.z;
			const apx = x - a.x;
			const apz = z - a.z;

			const denom = abx * abx + abz * abz;
			if (denom < 0.001) continue;

			const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / denom));
			const closestX = a.x + abx * t;
			const closestZ = a.z + abz * t;

			const dx = closestX - x;
			const dz = closestZ - z;
			const distSq = dx * dx + dz * dz;

			if (distSq < minDistSq) {
				minDistSq = distSq;
				const len = Math.sqrt(dx * dx + dz * dz);
				direction =
					len > 0.001 ? { x: dx / len, z: dz / len } : { x: 0, z: 1 };
			}
		}

		return direction;
	}

	/* ---------------- BUILDINGS ---------------- */
	function boxMesh(
		w,
		h,
		d,
		color,
		roughness,
		metalness,
		castShadow = true,
		receiveShadow = true
	) {
		const material = new THREE.MeshStandardMaterial({
			color,
			roughness: roughness ?? 0.85,
			metalness: metalness ?? 0.05
		});
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
		mesh.castShadow = castShadow;
		mesh.receiveShadow = receiveShadow;
		return mesh;
	}
	function cylinderMesh(
		rTop,
		rBottom,
		h,
		radialSegments,
		color,
		roughness,
		metalness,
		castShadow = true,
		receiveShadow = true
	) {
		const material = new THREE.MeshStandardMaterial({
			color,
			roughness: roughness ?? 0.6,
			metalness: metalness ?? 0.1
		});
		const mesh = new THREE.Mesh(
			new THREE.CylinderGeometry(rTop, rBottom, h, radialSegments ?? 8),
			material
		);
		mesh.castShadow = castShadow;
		mesh.receiveShadow = receiveShadow;
		return mesh;
	}
	function coneMesh(
		radius,
		h,
		radialSegments,
		color,
		roughness,
		metalness,
		castShadow = true,
		receiveShadow = true
	) {
		const material = new THREE.MeshStandardMaterial({
			color,
			roughness: roughness ?? 0.6,
			metalness: metalness ?? 0.1
		});
		const mesh = new THREE.Mesh(
			new THREE.ConeGeometry(radius, h, radialSegments ?? 6),
			material
		);
		mesh.castShadow = castShadow;
		mesh.receiveShadow = receiveShadow;
		return mesh;
	}

	function createLandmark(s) {
		const g = new THREE.Group();
		const base = boxMesh(s.x, s.y * 0.85, s.z, 0xc9d3e0, 0.4, 0.2);
		base.position.y = (s.y * 0.85) / 2;
		g.add(base);
		const spire = boxMesh(
			s.x * 0.35,
			s.y * 0.2,
			s.z * 0.35,
			0xe4ecf5,
			0.3,
			0.3,
			false
		);
		spire.position.y = s.y * 0.85 + (s.y * 0.2) / 2;
		g.add(spire);
		return g;
	}

	function createTower(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "tower";

		const bodyColor = pickFromArray(BUILDING_COLORS.tower.body, id);
		const bandColor = pickFromArray(BUILDING_COLORS.tower.band, id);
		const windowColor = pickFromArray(BUILDING_COLORS.tower.window, id);
		const roofColor = pickFromArray(BUILDING_COLORS.tower.roof, id);

		const body = boxMesh(s.x, s.y, s.z, bodyColor, 0.5, 0.15);
		body.position.y = s.y / 2;
		g.add(body);

		// Horizontal floor bands
		const bandHeight = 0.3;
		const floors = Math.max(2, Math.floor(s.y / 3));
		for (let i = 1; i <= floors; i++) {
			const y = (s.y / (floors + 1)) * i;
			const band = boxMesh(
				s.x * 1.02,
				bandHeight,
				s.z * 1.02,
				bandColor,
				0.6,
				0.2,
				false
			);
			band.position.y = y;
			g.add(band);
		}

		// Window strips on front and back
		const windowWidth = s.x * 0.6;
		const windowDepth = 0.15;
		for (let i = 0; i < floors; i++) {
			const wy = (s.y / (floors + 1)) * (i + 0.5);
			const windowFront = boxMesh(
				windowWidth,
				0.8,
				windowDepth,
				windowColor,
				0.3,
				0.4
			);
			windowFront.position.set(0, wy, s.z / 2 + 0.1);
			g.add(windowFront);
			const windowBack = boxMesh(
				windowWidth,
				0.8,
				windowDepth,
				windowColor,
				0.3,
				0.4
			);
			windowBack.position.set(0, wy, -s.z / 2 - 0.1);
			g.add(windowBack);
		}

		// Rooftop element kecil
		const roofBox = boxMesh(s.x * 0.5, 0.8, s.z * 0.5, roofColor, 0.6, 0.2);
		roofBox.position.y = s.y + 0.4;
		g.add(roofBox);

		return g;
	}
	function createOffice(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "office";

		const bodyColor = pickFromArray(BUILDING_COLORS.office.body, id);
		const bandColor = pickFromArray(BUILDING_COLORS.office.band, id);
		const windowColor = pickFromArray(BUILDING_COLORS.office.window, id);
		const roofColor = pickFromArray(BUILDING_COLORS.office.roof, id);

		const body = boxMesh(s.x, s.y, s.z, bodyColor, 0.7, 0.1);
		body.position.y = s.y / 2;
		g.add(body);

		// Horizontal bands
		const floors = Math.max(2, Math.floor(s.y / 2.5));
		const bandHeight = 0.25;
		for (let i = 1; i <= floors; i++) {
			const y = (s.y / (floors + 1)) * i;
			const band = boxMesh(
				s.x * 1.02,
				bandHeight,
				s.z * 1.02,
				bandColor,
				0.7,
				0.1
			);
			band.position.y = y;
			g.add(band);
		}

		// Window strips
		const winWidth = s.x * 0.7;
		const winDepth = 0.12;
		for (let i = 0; i < floors; i++) {
			const wy = (s.y / (floors + 1)) * (i + 0.5);
			const win = boxMesh(winWidth, 1.0, winDepth, windowColor, 0.3, 0.4);
			win.position.set(0, wy, s.z / 2 + 0.06);
			g.add(win);
			const winBack = boxMesh(
				winWidth,
				1.0,
				winDepth,
				windowColor,
				0.3,
				0.4
			);
			winBack.position.set(0, wy, -s.z / 2 - 0.06);
			g.add(winBack);
		}

		// Rooftop detail
		const roofUnit = boxMesh(
			s.x * 0.3,
			0.6,
			s.z * 0.3,
			roofColor,
			0.6,
			0.2
		);
		roofUnit.position.y = s.y + 0.3;
		g.add(roofUnit);

		return g;
	}
	function createShop(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "shop";

		const bodyColor = pickFromArray(BUILDING_COLORS.commercial.body, id);
		const accentColor = pickFromArray(
			BUILDING_COLORS.commercial.accent,
			id
		);
		const signColor = BUILDING_COLORS.kiosk.sign[0]; // putih

		const body = boxMesh(s.x, s.y * 0.75, s.z, bodyColor, 0.8, 0.05);
		body.position.y = (s.y * 0.75) / 2;
		g.add(body);

		// Awning (existing, tapi diberi warna accent)
		const awning = boxMesh(
			s.x * 1.05,
			s.y * 0.08,
			s.z * 1.15,
			accentColor,
			0.9,
			0
		);
		awning.position.y = s.y * 0.75 + 0.05;
		g.add(awning);

		// Signboard di atas awning
		const sign = boxMesh(s.x * 0.6, 0.4, 0.2, signColor, 0.5, 0);
		sign.position.set(0, s.y * 0.75 + 0.3, s.z / 2 + 0.2);
		g.add(sign);

		// Display window (kaca) di bagian depan
		const glass = boxMesh(s.x * 0.7, s.y * 0.35, 0.1, 0x8fc4e8, 0.1, 0.6);
		glass.position.set(0, s.y * 0.4, s.z / 2 + 0.05);
		g.add(glass);

		return g;
	}
	function createResidential(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "residential";

		const bodyColor = pickFromArray(BUILDING_COLORS.residential.body, id);
		const roofColor = pickFromArray(BUILDING_COLORS.residential.roof, id);
		const windowColor = pickFromArray(
			BUILDING_COLORS.residential.window,
			id
		);

		const body = boxMesh(s.x, s.y * 0.8, s.z, bodyColor, 0.9, 0);
		body.position.y = (s.y * 0.8) / 2;
		g.add(body);

		// Roof (dibuat dari dua papan miring)
		const roofLen = Math.sqrt((s.z / 2) ** 2 + (s.y * 0.2) ** 2);
		const roofAngle = Math.atan2(s.y * 0.2, s.z / 2);
		const roofThick = 0.12;

		const roofL = boxMesh(
			s.x * 1.03,
			roofThick,
			roofLen,
			roofColor,
			0.85,
			0
		);
		roofL.position.set(0, s.y * 0.8 + (s.y * 0.2) / 2, s.z / 4);
		roofL.rotation.x = roofAngle;
		g.add(roofL);

		const roofR = boxMesh(
			s.x * 1.03,
			roofThick,
			roofLen,
			roofColor,
			0.85,
			0
		);
		roofR.position.set(0, s.y * 0.8 + (s.y * 0.2) / 2, -s.z / 4);
		roofR.rotation.x = -roofAngle;
		g.add(roofR);

		// Jendela depan (dua)
		const winWidth = s.x * 0.18;
		const winHeight = s.y * 0.18;
		const winDepth = 0.1;
		[-1, 1].forEach(side => {
			const win = boxMesh(
				winWidth,
				winHeight,
				winDepth,
				windowColor,
				0.4,
				0.1
			);
			win.position.set(side * s.x * 0.28, s.y * 0.4, s.z / 2 + 0.05);
			g.add(win);
		});

		// Trim garis atap (horizontal band)
		const trim = boxMesh(s.x * 1.03, 0.1, s.z * 1.03, roofColor, 0.8, 0);
		trim.position.y = s.y * 0.8;
		g.add(trim);

		return g;
	}
	function createSchool(s) {
		const g = new THREE.Group();
		const main = boxMesh(s.x, s.y, s.z * 0.6, 0xcfc09a, 0.85, 0);
		main.position.set(0, s.y / 2, -s.z * 0.2);
		g.add(main);
		const wing = boxMesh(
			s.x * 0.4,
			s.y * 0.7,
			s.z * 0.4,
			0xcfc09a,
			0.85,
			0
		);
		wing.position.set(0, (s.y * 0.7) / 2, s.z * 0.3);
		g.add(wing);
		return g;
	}

	/* ---- BUILDING KHUSUS / INTERAKTIF ---- */
	function createCityHall(s) {
		const g = new THREE.Group();

		// Platform tangga lebar
		const platform = boxMesh(
			s.x * 1.25,
			s.y * 0.04,
			s.z * 1.25,
			0xcfd3d8,
			0.9,
			0
		);
		platform.position.y = (s.y * 0.04) / 2;
		g.add(platform);

		// Badan utama
		const mainBase = boxMesh(s.x, s.y * 0.55, s.z, 0xd8dde3, 0.5, 0.1);
		mainBase.position.y = s.y * 0.04 + (s.y * 0.55) / 2;
		g.add(mainBase);

		// Atap datar dengan cornice
		const cornice = boxMesh(
			s.x * 1.08,
			s.y * 0.06,
			s.z * 1.08,
			0xc3cad3,
			0.4,
			0.15,
			false
		);
		cornice.position.y = s.y * 0.04 + s.y * 0.55 + s.y * 0.03;
		g.add(cornice);

		// Pilar depan (6 pilar, lebih ramping)
		const pillarH = s.y * 0.5;
		const pillarPositions = [
			-s.x * 0.35,
			-s.x * 0.2,
			-s.x * 0.05,
			s.x * 0.05,
			s.x * 0.2,
			s.x * 0.35
		];
		pillarPositions.forEach(px => {
			const pillar = cylinderMesh(
				0.35,
				0.35,
				pillarH,
				8,
				0xe8ecf0,
				0.4,
				0,
				false
			);
			pillar.position.set(px, s.y * 0.04 + pillarH / 2, s.z / 2 - 0.6);
			g.add(pillar);
		});

		// Entablature (balok horizontal di atas pilar)
		const entab = boxMesh(
			s.x * 0.9,
			s.y * 0.05,
			s.z * 0.25,
			0xc3cad3,
			0.4,
			0.15,
			false
		);
		entab.position.set(
			0,
			s.y * 0.04 + s.y * 0.5 + s.y * 0.025,
			s.z / 2 - 0.35
		);
		g.add(entab);

		// Menara tengah (lebih pendek dari sebelumnya)
		const towerH = s.y * 0.25; // sebelumnya 0.35, sekarang 0.25
		const tower = boxMesh(
			s.x * 0.3,
			towerH,
			s.z * 0.3,
			0xc3cad3,
			0.4,
			0.15
		);
		tower.position.y = s.y * 0.04 + s.y * 0.55 + s.y * 0.06 + towerH / 2;
		g.add(tower);

		// Atap menara
		const roof = coneMesh(s.x * 0.22, s.y * 0.12, 6, 0x8a5a3c, 0.7, 0);
		roof.position.y =
			s.y * 0.04 + s.y * 0.55 + s.y * 0.06 + towerH + (s.y * 0.12) / 2;
		g.add(roof);

		// Tiang bendera + bendera
		const pole = cylinderMesh(
			0.05,
			0.05,
			s.y * 0.16,
			5,
			0x333333,
			0.5,
			0.3,
			false
		);
		pole.position.y =
			s.y * 0.04 +
			s.y * 0.55 +
			s.y * 0.06 +
			towerH +
			s.y * 0.12 +
			(s.y * 0.16) / 2;
		g.add(pole);

		const flag = boxMesh(
			s.x * 0.08,
			s.y * 0.03,
			0.02,
			0xd23c3c,
			0.8,
			0,
			false
		);
		flag.position.set(
			s.x * 0.04,
			s.y * 0.04 +
				s.y * 0.55 +
				s.y * 0.06 +
				towerH +
				s.y * 0.12 +
				s.y * 0.14,
			0
		);
		g.add(flag);

		// Papan nama "BALAI KOTA IPS"
		const signBase = boxMesh(s.x * 0.55, 0.5, 0.1, 0xffffff, 0.5, 0, false);
		signBase.position.set(0, s.y * 0.36, s.z / 2 + 0.12);
		g.add(signBase);

		const signText = boxMesh(
			s.x * 0.45,
			0.18,
			0.05,
			0x3c6bd2,
			0.5,
			0,
			false
		);
		signText.position.set(0, s.y * 0.36, s.z / 2 + 0.16);
		g.add(signText);

		// Dua jendela samping untuk detail
		[-s.x * 0.45, s.x * 0.45].forEach(wx => {
			const windowMesh = boxMesh(
				s.x * 0.12,
				0.8,
				0.08,
				0x8fc4e8,
				0.2,
				0.4,
				false
			);
			windowMesh.position.set(wx, s.y * 0.28, s.z / 2 + 0.05);
			g.add(windowMesh);
		});

		return g;
	}

	function createMuseum(s) {
		const g = new THREE.Group();

		// Tangga lebar (2 tingkat)
		const step1 = boxMesh(
			s.x * 1.25,
			s.y * 0.05,
			s.z * 1.2,
			0xc7c2b4,
			0.9,
			0,
			false
		);
		step1.position.y = (s.y * 0.05) / 2;
		g.add(step1);

		const step2 = boxMesh(
			s.x * 1.1,
			s.y * 0.05,
			s.z * 1.05,
			0xd2cdbe,
			0.9,
			0,
			false
		);
		step2.position.y = s.y * 0.05 + (s.y * 0.05) / 2;
		g.add(step2);

		// Badan utama
		const base = boxMesh(s.x, s.y * 0.55, s.z, 0xe3ddca, 0.7, 0);
		base.position.y = s.y * 0.1 + (s.y * 0.55) / 2;
		g.add(base);

		// Pilar depan (4 pilar besar)
		const pillarH = s.y * 0.5;
		[-s.x * 0.3, -s.x * 0.1, s.x * 0.1, s.x * 0.3].forEach(px => {
			const pillar = cylinderMesh(
				0.35,
				0.35,
				pillarH,
				8,
				0xf1ede0,
				0.4,
				0,
				false
			);
			pillar.position.set(px, s.y * 0.1 + pillarH / 2, s.z / 2 - 0.5);
			g.add(pillar);
		});

		// Pediment segitiga (dengan hiasan)
		const pediment = new THREE.Mesh(
			new THREE.ConeGeometry(s.x * 0.6, s.y * 0.2, 4),
			new THREE.MeshStandardMaterial({ color: 0xcbb98a, roughness: 0.8 })
		);
		pediment.rotation.y = Math.PI / 4;
		pediment.scale.set(1, 1, 0.55);
		pediment.position.set(0, s.y * 0.1 + s.y * 0.55 + (s.y * 0.2) / 2, 0);
		pediment.castShadow = true;
		g.add(pediment);

		// Signboard "MUSEUM IPS" di atas pediment
		const signBoard = boxMesh(s.x * 0.5, 0.4, 0.1, 0xffffff, 0.5, 0, false);
		signBoard.position.set(
			0,
			s.y * 0.1 + s.y * 0.55 + s.y * 0.2 + 0.1,
			s.z / 2 - 0.1
		);
		g.add(signBoard);

		const signText = boxMesh(
			s.x * 0.4,
			0.15,
			0.06,
			0x8a5a3c,
			0.5,
			0,
			false
		);
		signText.position.set(
			0,
			s.y * 0.1 + s.y * 0.55 + s.y * 0.2 + 0.1,
			s.z / 2 - 0.12
		);
		g.add(signText);

		// Dua jendela display besar di samping pintu
		[-s.x * 0.4, s.x * 0.4].forEach(wx => {
			const win = boxMesh(
				s.x * 0.18,
				s.y * 0.25,
				0.08,
				0x8fc4e8,
				0.2,
				0.4,
				false
			);
			win.position.set(wx, s.y * 0.25, s.z / 2 + 0.05);
			g.add(win);
		});

		// Ornamen garis horizontal (cornice)
		const cornice = boxMesh(
			s.x * 1.05,
			s.y * 0.05,
			s.z * 1.05,
			0xd2cdbe,
			0.6,
			0,
			false
		);
		cornice.position.y = s.y * 0.1 + s.y * 0.55 + s.y * 0.025;
		g.add(cornice);

		return g;
	}

	function createMathSchool(s) {
		const g = new THREE.Group();
		const body = boxMesh(s.x, s.y * 0.75, s.z, 0xd8c9a3, 0.85, 0);
		body.position.y = (s.y * 0.75) / 2;
		g.add(body);
		const roof = boxMesh(
			s.x * 1.03,
			s.y * 0.12,
			s.z * 1.03,
			0x8a5a3c,
			0.9,
			0
		);
		roof.position.y = s.y * 0.75 + (s.y * 0.12) / 2;
		g.add(roof);
		const sign = boxMesh(s.x * 0.5, s.y * 0.1, 0.15, 0xffffff, 0.5, 0);
		sign.position.set(0, s.y * 0.4, s.z / 2 + 0.1);
		g.add(sign);
		const plusColor = 0x3c6bd2;
		const barH = boxMesh(s.x * 0.16, 0.14, 0.1, plusColor, 0.5, 0);
		barH.position.set(0, s.y * 0.58, s.z / 2 + 0.08);
		g.add(barH);
		const barV = boxMesh(0.14, s.y * 0.16, 0.1, plusColor, 0.5, 0);
		barV.position.set(0, s.y * 0.58, s.z / 2 + 0.08);
		g.add(barV);
		// Baris jendela tambahan
		const winWidth = s.x * 0.1;
		const winHeight = 0.6;
		for (let i = -2; i <= 2; i++) {
			const win = boxMesh(winWidth, winHeight, 0.1, 0x8fc4e8, 0.2, 0.4);
			win.position.set(i * s.x * 0.2, s.y * 0.3, s.z / 2 + 0.05);
			g.add(win);
		}
		return g;
	}

	function createLab(s) {
		const g = new THREE.Group();
		const main = boxMesh(s.x, s.y * 0.8, s.z, 0xaeb8c2, 0.3, 0.4);
		main.position.y = (s.y * 0.8) / 2;
		g.add(main);
		const glass = boxMesh(s.x * 0.7, s.y * 0.5, 0.1, 0x8fc4e8, 0.1, 0.6);
		glass.position.set(0, s.y * 0.4, s.z / 2 + 0.06);
		g.add(glass);
		const tank = cylinderMesh(0.6, 0.6, s.y * 0.3, 8, 0xd8dde3, 0.4, 0.3);
		tank.position.set(s.x * 0.25, s.y * 0.8 + (s.y * 0.3) / 2, 0);
		g.add(tank);
		const pipe = cylinderMesh(
			0.12,
			0.12,
			s.y * 0.35,
			6,
			0x6b7280,
			0.5,
			0.3
		);
		pipe.position.set(
			-s.x * 0.25,
			s.y * 0.8 + (s.y * 0.35) / 2,
			-s.z * 0.2
		);
		g.add(pipe);
		// Rooftop AC unit
		const acUnit = boxMesh(0.8, 0.6, 0.8, 0x888888, 0.5, 0.3);
		acUnit.position.set(s.x * 0.2, s.y * 0.8 + 0.3, 0);
		g.add(acUnit);
		return g;
	}

	function createInfTower(s) {
		const g = new THREE.Group();
		const body = boxMesh(s.x, s.y * 0.9, s.z, 0x5a6b8a, 0.25, 0.5);
		body.position.y = (s.y * 0.9) / 2;
		g.add(body);
		for (let i = 1; i <= 3; i++) {
			const band = boxMesh(
				s.x * 1.02,
				0.25,
				s.z * 1.02,
				0x8fc4e8,
				0.15,
				0.5
			);
			band.position.y = ((s.y * 0.9) / 4) * i;
			g.add(band);
		}
		const antenna = cylinderMesh(
			0.06,
			0.06,
			s.y * 0.15,
			5,
			0x222222,
			0.5,
			0.3
		);
		antenna.position.y = s.y * 0.9 + (s.y * 0.15) / 2;
		g.add(antenna);
		const beacon = new THREE.Mesh(
			new THREE.SphereGeometry(0.15, 6, 6),
			new THREE.MeshStandardMaterial({ color: 0xd23c3c, roughness: 0.5 })
		);
		beacon.position.y = s.y * 0.9 + s.y * 0.15;
		g.add(beacon);
		return g;
	}

	function createBar(s) {
		const g = new THREE.Group();
		const body = boxMesh(s.x, s.y * 0.7, s.z, 0x6b4a3a, 0.85, 0);
		body.position.y = (s.y * 0.7) / 2;
		g.add(body);
		const awning = boxMesh(
			s.x * 1.1,
			s.y * 0.08,
			s.z * 1.2,
			0x8a2c2c,
			0.9,
			0
		);
		awning.position.y = s.y * 0.7 + 0.05;
		g.add(awning);
		const poleH = s.y * 0.3;
		const poleL = cylinderMesh(0.05, 0.05, poleH, 5, 0x333333, 0.6, 0.2);
		poleL.position.set(-s.x * 0.3, s.y * 0.7 + poleH / 2, s.z / 2 + 0.3);
		g.add(poleL);
		const poleR = poleL.clone();
		poleR.position.x = s.x * 0.3;
		g.add(poleR);
		const sign = boxMesh(s.x * 0.7, s.y * 0.12, 0.1, 0xd8a03c, 0.5, 0);
		sign.position.set(0, s.y * 0.7 + poleH * 0.85, s.z / 2 + 0.3);
		g.add(sign);
		const barrel = cylinderMesh(
			0.35,
			0.35,
			s.y * 0.25,
			8,
			0x7a4a2b,
			0.8,
			0
		);
		barrel.position.set(s.x / 2 + 0.4, (s.y * 0.25) / 2, s.z / 2 - 0.3);
		g.add(barrel);
		return g;
	}

	function createPinkHouse(s) {
		const g = new THREE.Group();
		const body = boxMesh(s.x, s.y * 0.65, s.z, 0xf2a6c6, 0.8, 0);
		body.position.y = (s.y * 0.65) / 2;
		g.add(body);
		const roofLen = Math.sqrt((s.z / 2) ** 2 + (s.y * 0.35) ** 2);
		const roofAngle = Math.atan2(s.y * 0.35, s.z / 2);
		const roofL = boxMesh(s.x * 1.05, 0.1, roofLen, 0xd8618f, 0.7, 0);
		roofL.position.set(0, s.y * 0.65 + (s.y * 0.35) / 2, s.z / 4);
		roofL.rotation.x = roofAngle;
		g.add(roofL);
		const roofR = boxMesh(s.x * 1.05, 0.1, roofLen, 0xd8618f, 0.7, 0);
		roofR.position.set(0, s.y * 0.65 + (s.y * 0.35) / 2, -s.z / 4);
		roofR.rotation.x = -roofAngle;
		g.add(roofR);
		const door = boxMesh(s.x * 0.18, s.y * 0.3, 0.1, 0xffffff, 0.6, 0);
		door.position.set(0, (s.y * 0.3) / 2, s.z / 2 + 0.05);
		g.add(door);
		[-1, 1].forEach(side => {
			const win = boxMesh(
				s.x * 0.16,
				s.y * 0.16,
				0.08,
				0xffffff,
				0.4,
				0.1
			);
			win.position.set(side * s.x * 0.28, s.y * 0.42, s.z / 2 + 0.05);
			g.add(win);
		});
		const chimney = boxMesh(0.35, s.y * 0.25, 0.35, 0xffffff, 0.8, 0);
		chimney.position.set(s.x * 0.3, s.y * 0.65 + s.y * 0.15, 0);
		g.add(chimney);
		return g;
	}

	function createHouseSmall(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "house-small";

		const bodyColor = pickFromArray(BUILDING_COLORS.residential.body, id);
		const roofColor = pickFromArray(BUILDING_COLORS.residential.roof, id);
		const windowColor = pickFromArray(
			BUILDING_COLORS.residential.window,
			id
		);

		// Body
		const body = boxMesh(s.x, s.y * 0.7, s.z, bodyColor, 0.9, 0);
		body.position.y = (s.y * 0.7) / 2;
		g.add(body);

		// Atap pitched
		const roofLen = Math.sqrt((s.z / 2) ** 2 + (s.y * 0.25) ** 2);
		const roofAngle = Math.atan2(s.y * 0.25, s.z / 2);
		const roofThick = 0.12;

		const roofL = boxMesh(
			s.x * 1.05,
			roofThick,
			roofLen,
			roofColor,
			0.9,
			0
		);
		roofL.position.set(0, s.y * 0.7 + (s.y * 0.25) / 2, s.z / 4);
		roofL.rotation.x = roofAngle;
		g.add(roofL);

		const roofR = boxMesh(
			s.x * 1.05,
			roofThick,
			roofLen,
			roofColor,
			0.9,
			0
		);
		roofR.position.set(0, s.y * 0.7 + (s.y * 0.25) / 2, -s.z / 4);
		roofR.rotation.x = -roofAngle;
		g.add(roofR);

		// Windows (2 di depan)
		const winSize = s.x * 0.15;
		[-1, 1].forEach(side => {
			const win = boxMesh(winSize, winSize, 0.08, windowColor, 0.3, 0.2);
			win.position.set(side * s.x * 0.28, s.y * 0.4, s.z / 2 + 0.05);
			g.add(win);
		});

		// Chimney kecil
		const chimney = boxMesh(0.3, s.y * 0.2, 0.3, roofColor, 0.85, 0);
		chimney.position.set(s.x * 0.3, s.y * 0.7 + s.y * 0.1, 0);
		g.add(chimney);

		return g;
	}

	function createApartment(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "apartment";

		const bodyColor = pickFromArray(BUILDING_COLORS.apartment.body, id);
		const bandColor = pickFromArray(BUILDING_COLORS.apartment.band, id);
		const windowColor = pickFromArray(BUILDING_COLORS.apartment.window, id);
		const roofColor = pickFromArray(BUILDING_COLORS.apartment.roof, id);

		// Body
		const body = boxMesh(s.x, s.y, s.z, bodyColor, 0.8, 0.05);
		body.position.y = s.y / 2;
		g.add(body);

		// Floor bands
		const floors = Math.max(2, Math.floor(s.y / 4));
		const bandHeight = 0.25;
		for (let i = 1; i <= floors; i++) {
			const y = (s.y / (floors + 1)) * i;
			const band = boxMesh(
				s.x * 1.02,
				bandHeight,
				s.z * 1.02,
				bandColor,
				0.7,
				0.1
			);
			band.position.y = y;
			g.add(band);
		}

		// Window strips on front & back
		const winWidth = s.x * 0.6;
		const winDepth = 0.15;
		for (let i = 0; i < floors; i++) {
			const wy = (s.y / (floors + 1)) * (i + 0.5);
			const winFront = boxMesh(
				winWidth,
				0.8,
				winDepth,
				windowColor,
				0.3,
				0.4
			);
			winFront.position.set(0, wy, s.z / 2 + 0.08);
			g.add(winFront);
			const winBack = boxMesh(
				winWidth,
				0.8,
				winDepth,
				windowColor,
				0.3,
				0.4
			);
			winBack.position.set(0, wy, -s.z / 2 - 0.08);
			g.add(winBack);
		}

		// Balkon kecil (dua sisi)
		const balconyDepth = 0.5;
		const balconyWidth = s.x * 0.4;
		const balconyY = s.y * 0.65;
		const balcony = boxMesh(
			balconyWidth,
			0.15,
			balconyDepth,
			bandColor,
			0.6,
			0.2
		);
		balcony.position.set(0, balconyY, s.z / 2 + 0.3);
		g.add(balcony);
		const balcony2 = boxMesh(
			balconyWidth,
			0.15,
			balconyDepth,
			bandColor,
			0.6,
			0.2
		);
		balcony2.position.set(0, balconyY, -s.z / 2 - 0.3);
		g.add(balcony2);

		// Rooftop unit
		const roofUnit = boxMesh(
			s.x * 0.3,
			0.7,
			s.z * 0.3,
			roofColor,
			0.6,
			0.2
		);
		roofUnit.position.y = s.y + 0.35;
		g.add(roofUnit);

		return g;
	}

	function createKiosk(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "kiosk";

		const bodyColor = pickFromArray(BUILDING_COLORS.kiosk.body, id);
		const roofColor = pickFromArray(BUILDING_COLORS.kiosk.roof, id);
		const signColor = BUILDING_COLORS.kiosk.sign[0];

		// Body
		const body = boxMesh(s.x, s.y * 0.6, s.z, bodyColor, 0.7, 0.05);
		body.position.y = (s.y * 0.6) / 2;
		g.add(body);

		// Atap datar melebar
		const roof = boxMesh(s.x * 1.2, 0.15, s.z * 1.2, roofColor, 0.8, 0.1);
		roof.position.y = s.y * 0.6 + 0.075;
		g.add(roof);

		// Signboard
		const sign = boxMesh(s.x * 0.7, 0.3, 0.1, signColor, 0.5, 0);
		sign.position.set(0, s.y * 0.6 + 0.15, s.z / 2 + 0.15);
		g.add(sign);

		// Display window (kaca)
		const glass = boxMesh(s.x * 0.8, s.y * 0.3, 0.08, 0x8fc4e8, 0.1, 0.6);
		glass.position.set(0, s.y * 0.3, s.z / 2 + 0.04);
		g.add(glass);

		return g;
	}

	function createMinimarket(s, cfg) {
		const g = new THREE.Group();
		const id = cfg ? cfg.id : "minimarket";

		const bodyColor = pickFromArray(BUILDING_COLORS.minimarket.body, id);
		const accentColor = pickFromArray(
			BUILDING_COLORS.minimarket.accent,
			id
		);
		const signColor = BUILDING_COLORS.minimarket.sign[0];
		const glassColor = BUILDING_COLORS.minimarket.glass[0];

		// Body
		const body = boxMesh(s.x, s.y, s.z, bodyColor, 0.85, 0.05);
		body.position.y = s.y / 2;
		g.add(body);

		// Front glass (bagian depan)
		const glass = boxMesh(s.x * 0.8, s.y * 0.6, 0.1, glassColor, 0.1, 0.6);
		glass.position.set(0, s.y * 0.5, s.z / 2 + 0.05);
		g.add(glass);

		// Signboard di atas
		const sign = boxMesh(s.x * 0.7, 0.5, 0.15, signColor, 0.5, 0);
		sign.position.set(0, s.y - 0.4, s.z / 2 + 0.1);
		g.add(sign);

		// Aksen garis (trim) pada signboard
		const trim = boxMesh(s.x * 0.75, 0.08, 0.2, accentColor, 0.5, 0);
		trim.position.set(0, s.y - 0.65, s.z / 2 + 0.1);
		g.add(trim);

		// Awning kecil
		const awning = boxMesh(s.x * 0.9, 0.1, 0.4, accentColor, 0.8, 0);
		awning.position.set(0, s.y - 0.2, s.z / 2 + 0.25);
		g.add(awning);

		return g;
	}
	function createPoliceStation(s) {
		const g = new THREE.Group();

		// Pondasi
		const base = boxMesh(s.x * 1.1, 0.3, s.z * 1.1, 0xcccccc, 0.6, 0.1);
		base.position.y = 0.15;
		g.add(base);

		// Badan utama
		const body = boxMesh(s.x, s.y * 0.7, s.z, 0xe8e8e8, 0.5, 0.05);
		body.position.y = 0.3 + (s.y * 0.7) / 2;
		g.add(body);

		// Atap
		const roof = boxMesh(
			s.x * 1.15,
			0.4,
			s.z * 1.15,
			0x333333,
			0.4,
			0.2,
			false
		);
		roof.position.y = 0.3 + s.y * 0.7 + 0.2;
		g.add(roof);

		// Lampu rotasi (merah)
		const lampBase = cylinderMesh(
			0.2,
			0.2,
			0.1,
			8,
			0x111111,
			0.5,
			0.3,
			false
		);
		lampBase.position.y = 0.3 + s.y * 0.7 + 0.4 + 0.05;
		g.add(lampBase);

		const lampColor = new THREE.MeshStandardMaterial({
			color: 0xff0000,
			emissive: 0xff0000,
			emissiveIntensity: 1.0
		});
		const lamp = new THREE.Mesh(
			new THREE.SphereGeometry(0.15, 6, 6),
			lampColor
		);
		lamp.position.y = 0.3 + s.y * 0.7 + 0.4 + 0.1;
		g.add(lamp);

		// Pintu utama (lebih besar)
		const door = boxMesh(s.x * 0.3, 2.0, 0.1, 0x3a3a3a, 0.6, 0.2, false);
		door.position.set(0, 0.3 + 1.0, s.z / 2 + 0.05);
		g.add(door);

		// Jendela samping
		const winGeo = new THREE.BoxGeometry(1.2, 0.8, 0.05);
		const winMat = new THREE.MeshStandardMaterial({
			color: 0x8fc4e8,
			roughness: 0.2,
			metalness: 0.5
		});
		for (let side of [-1, 1]) {
			const win = new THREE.Mesh(winGeo, winMat);
			win.position.set(
				side * s.x * 0.35,
				0.3 + s.y * 0.55,
				s.z / 2 + 0.05
			);
			g.add(win);
		}

		// Papan "POLICE" di bagian depan
		const sign = boxMesh(s.x * 0.8, 0.8, 0.08, 0xffffff, 0.5, 0, false);
		sign.position.set(0, 0.3 + s.y * 0.7 - 0.5, s.z / 2 + 0.08);
		g.add(sign);

		// ===== TULISAN 3D "POLICE" DI ATAS ATAP =====
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 128;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#000000";
		ctx.font = "bold 72px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("POLICE", canvas.width / 2, canvas.height / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.LinearFilter;
		const textMat = new THREE.MeshStandardMaterial({
			map: texture,
			roughness: 0.4,
			metalness: 0.1
		});

		// Papan vertikal di atas atap (depan & belakang)
		for (let side of [1, -1]) {
			const signBoard = new THREE.Mesh(
				new THREE.BoxGeometry(s.x * 0.9, 0.1, s.x * 0.25),
				textMat
			);
			signBoard.position.set(0, roof.position.y + 0.3, side * 0.05);
			signBoard.rotation.y = side === 1 ? 0 : Math.PI;
			signBoard.castShadow = true;
			g.add(signBoard);
		}

		return g;
	}

	const BUILDING_FACTORY = {
		landmark: createLandmark,
		tower: createTower,
		office: createOffice,
		shop: createShop,
		residential: createResidential,
		school: createSchool,
		"city-hall": createCityHall,
		museum: createMuseum,
		"math-school": createMathSchool,
		lab: createLab,
		"inf-tower": createInfTower,
		bar: createBar,
		"pink-house": createPinkHouse,
		"house-small": createHouseSmall,
		apartment: createApartment,
		kiosk: createKiosk,
		minimarket: createMinimarket,
		police: createPoliceStation // << tambahkan ini
	};

	function buildBuildings(CFG) {
		(CFG.buildings || []).forEach(b => {
			const factory = BUILDING_FACTORY[b.type];
			if (!factory) return;
			const mesh = factory(b.size, b);
			mesh.name = b.id;
			const groundY = getTerrainHeight(b.position.x, b.position.z);
			mesh.position.set(b.position.x, groundY, b.position.z);
			mesh.rotation.set(0, b.rotation ?? 0, 0);
			cityGroups.Buildings.add(mesh);

			// Khusus rumah perumahan: arahkan ke jalan terdekat & tambahkan trotoar
			if (["residential", "house-small", "pink-house"].includes(b.type)) {
				const dir = getNearestRoadDirection(b.position.x, b.position.z);
				const angle = Math.atan2(dir.x, dir.z);
				mesh.rotation.y = angle;
				addResidentialLot(b, dir);
			}

			if (b.interactive) {
				buildingRegistry.set(b.id, { mesh, config: b });
			}
		});
	}

	/* ---------------- AIR MANCUR CITY CENTER ---------------- */
	function buildCityCenterFountain() {
		const pos = { x: 15, z: 20 };
		const groundY = getTerrainHeight(pos.x, pos.z);
		const group = new THREE.Group();

		// Kolam dasar
		const basin = cylinderMesh(2.2, 2.2, 0.4, 12, 0xc0c0c0, 0.6, 0.1);
		basin.position.set(pos.x, groundY + 0.2, pos.z);
		group.add(basin);

		// Air (surface)
		const water = cylinderMesh(1.8, 1.8, 0.2, 12, 0x1e5a80, 0.1, 0.1);
		water.position.set(pos.x, groundY + 0.4, pos.z);
		group.add(water);

		// Pilar tengah
		const pillar = cylinderMesh(0.4, 0.4, 1.5, 8, 0xe8ecf0, 0.4, 0.1);
		pillar.position.set(pos.x, groundY + 0.4 + 0.75, pos.z);
		group.add(pillar);

		// Mangkuk atas
		const upper = cylinderMesh(1.2, 0.8, 0.4, 8, 0xe8ecf0, 0.4, 0.1);
		upper.position.set(pos.x, groundY + 0.4 + 1.5 + 0.2, pos.z);
		group.add(upper);

		cityGroups.Environment.add(group);
	}
	/* ---------------- RESIDENTIAL LOT (halaman & trotoar rumah) ---------------- */
	function addResidentialLot(b, dir) {
		const groundY = getTerrainHeight(b.position.x, b.position.z);
		const size = b.size;

		// Halaman rumput di depan rumah
		const lawnGeo = new THREE.PlaneGeometry(size.x + 2, 4);
		lawnGeo.rotateX(-Math.PI / 2);
		const lawnMat = new THREE.MeshStandardMaterial({
			color: 0x4a7a4a,
			roughness: 1
		});
		const lawn = new THREE.Mesh(lawnGeo, lawnMat);
		const frontDist = size.z / 2 + 2;
		lawn.position.set(
			b.position.x + dir.x * frontDist,
			groundY + 0.01,
			b.position.z + dir.z * frontDist
		);
		lawn.receiveShadow = true;
		lawn.name = `Lawn_${b.id}`;
		cityGroups.Ground.add(lawn);

		// Jalan setapak dari pintu ke halaman
		const walkGeo = new THREE.PlaneGeometry(1.5, 3);
		walkGeo.rotateX(-Math.PI / 2);
		const walkMat = new THREE.MeshStandardMaterial({
			color: 0xb0a090,
			roughness: 0.8
		});
		const walk = new THREE.Mesh(walkGeo, walkMat);
		const walkDist = size.z / 2 + 1.5;
		walk.position.set(
			b.position.x + dir.x * walkDist,
			groundY + 0.02,
			b.position.z + dir.z * walkDist
		);
		walk.receiveShadow = true;
		walk.name = `Walkway_${b.id}`;
		cityGroups.Ground.add(walk);
	}

	/* ---- FONDASI UNTUK NAVBAR/CAMERA FOCUS (fase berikutnya) ---- */
	function getBuildingWorldCenter(id) {
		const entry = buildingRegistry.get(id);
		if (!entry) return null;
		const { mesh, config } = entry;
		return new THREE.Vector3(
			mesh.position.x,
			mesh.position.y + (config.size.y || 0) / 2,
			mesh.position.z
		);
	}
	function getInteractiveBuildings() {
		return Array.from(buildingRegistry.values()).map(e => e.config);
	}

	function focusBuilding(id) {
		if (!buildingRegistry.has(id)) {
			console.warn("[CityWorld] Building not found:", id);
			return;
		}

		const entry = buildingRegistry.get(id);
		if (!entry.config.interactive) {
			console.warn("[CityWorld] Building is not interactive:", id);
			return;
		}

		const center = getBuildingWorldCenter(id);
		if (!center) return;

		const size = entry.config.size;
		const maxDim = Math.max(size.x, size.z);
		const distance = Math.max(10, maxDim * 1.8);
		const height = Math.max(size.y * 0.9, 6);

		// Sudut awal: datang dari arah kanan-depan (45°)
		const angle = Math.PI / 4;

		const targetLookAt = center.clone();
		const targetPosition = new THREE.Vector3(
			center.x + Math.sin(angle) * distance,
			center.y + height,
			center.z + Math.cos(angle) * distance
		);

		const startPosition = cityCamera.position.clone();
		const startLookAt = getCurrentLookAtTarget(80);

		cameraFocusState = {
			active: true,
			buildingId: id,
			phase: "transition",
			startPosition,
			targetPosition,
			startLookAt,
			targetLookAt,
			elapsed: 0,
			duration: 2.0,
			orbitAngle: angle,
			orbitRadius: distance,
			orbitHeight: height,
			orbitSpeed: 0.08
		};
	}

	function isPointInRoadExclusion(x, z) {
		const cfg = window.CITY_CONFIG || {};
		const roadCfg = cfg.road || {};
		const width = roadCfg.width ?? 8;
		const sidewalk = roadCfg.sidewalkWidth ?? 1.6;
		const safety = roadCfg.safetyMargin ?? 0.5;
		const extraBuffer = 0.5;

		const exclusionHalfWidth = width / 2 + sidewalk + safety + extraBuffer;

		for (let i = 0; i < roadLines.length; i++) {
			const r = roadLines[i];

			if (r.axis === "x") {
				const minX = Math.min(r.a.x, r.b.x);
				const maxX = Math.max(r.a.x, r.b.x);
				if (
					x >= minX &&
					x <= maxX &&
					Math.abs(z - r.at) <= exclusionHalfWidth
				) {
					return true;
				}
			} else if (r.axis === "z") {
				const minZ = Math.min(r.a.z, r.b.z);
				const maxZ = Math.max(r.a.z, r.b.z);
				if (
					z >= minZ &&
					z <= maxZ &&
					Math.abs(x - r.at) <= exclusionHalfWidth
				) {
					return true;
				}
			}
		}

		return false;
	}

	/* ---------------- VEGETASI (existing park) ---------------- */
	function buildVegetation(CFG) {
		const v = CFG.vegetation || {};
		const rng = makePRNG(v.seed ?? 1);
		const count = v.treeCount ?? 90;
		const area = v.area || { minX: -190, maxX: 190, minZ: 56, maxZ: 190 };
		const corridorX = v.roadCorridorExcludeX ?? 7;

		const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
		const trunkMat = new THREE.MeshStandardMaterial({
			color: 0x5b4636,
			roughness: 1
		});
		const leafGeo = new THREE.ConeGeometry(1.4, 3.2, 7);
		const leafMat = new THREE.MeshStandardMaterial({
			color: 0x3d6b3f,
			roughness: 1
		});

		const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
		const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
		trunkMesh.castShadow = true;
		trunkMesh.receiveShadow = true;
		leafMesh.castShadow = true;
		leafMesh.receiveShadow = true;

		const dummy = new THREE.Object3D();
		let placed = 0,
			attempts = 0;

		while (placed < count && attempts < count * 8) {
			attempts++;
			const x = THREE.MathUtils.lerp(area.minX, area.maxX, rng());
			const z = THREE.MathUtils.lerp(area.minZ, area.maxZ, rng());
			if (Math.abs(x) < corridorX) continue;
			if (isPointInRoadExclusion(x, z)) continue;

			const y = getTerrainHeight(x, z);
			const scale = 0.7 + rng() * 0.8;

			dummy.position.set(x, y + 1.1 * scale, z);
			dummy.scale.set(scale, scale, scale);
			dummy.rotation.set(0, rng() * Math.PI * 2, 0);
			dummy.updateMatrix();
			trunkMesh.setMatrixAt(placed, dummy.matrix);

			dummy.position.set(x, y + 2.6 * scale, z);
			dummy.updateMatrix();
			leafMesh.setMatrixAt(placed, dummy.matrix);
			placed++;
		}

		trunkMesh.count = placed;
		leafMesh.count = placed;
		trunkMesh.instanceMatrix.needsUpdate = true;
		leafMesh.instanceMatrix.needsUpdate = true;
		cityGroups.Nature.add(trunkMesh);
		cityGroups.Nature.add(leafMesh);
	}

	/* ---------------- STREET FURNITURE (bangku, pot bunga, halte) ---------------- */
	function buildStreetFurniture(CFG) {
		const group = new THREE.Group();
		group.name = "StreetFurniture";
		cityGroups.Environment.add(group);

		// Material bersama
		const metalMat = getSharedMaterial(0x888888, 0.6, 0.4);
		const woodMat = getSharedMaterial(0x8b5a2b, 0.8, 0);
		const glassMat = getSharedMaterial(0x8fc4e8, 0.2, 0.4);
		const plantMat = getSharedMaterial(0x4a8a4a, 0.8, 0);
		const potMat = getSharedMaterial(0xaa8866, 0.7, 0.1);

		// Bangku
		function createBench(x, z, rotY = 0) {
			const bench = new THREE.Group();
			const seat = boxMesh(
				1.6,
				0.1,
				0.5,
				woodMat.color.getHex(),
				0.8,
				0,
				false
			);
			seat.position.y = 0.45;
			bench.add(seat);
			const back = boxMesh(
				1.6,
				0.5,
				0.1,
				woodMat.color.getHex(),
				0.8,
				0,
				false
			);
			back.position.set(0, 0.7, -0.2);
			back.rotation.x = -0.2;
			bench.add(back);
			const legGeo = new THREE.BoxGeometry(0.1, 0.45, 0.1);
			for (let lx of [-0.7, 0.7]) {
				for (let lz of [-0.2, 0.2]) {
					const leg = new THREE.Mesh(legGeo, metalMat);
					leg.position.set(lx, 0.225, lz);
					bench.add(leg);
				}
			}
			bench.position.set(x, getTerrainHeight(x, z) + 0.01, z);
			bench.rotation.y = rotY;
			return bench;
		}

		// Pot bunga
		function createFlowerPot(x, z) {
			const pot = new THREE.Group();
			const potBase = cylinderMesh(
				0.3,
				0.25,
				0.4,
				8,
				potMat.color.getHex(),
				0.7,
				0,
				false
			);
			potBase.position.y = 0.2;
			pot.add(potBase);
			const plant = coneMesh(
				0.25,
				0.6,
				6,
				plantMat.color.getHex(),
				0.8,
				0,
				false
			);
			plant.position.y = 0.4 + 0.3;
			pot.add(plant);
			pot.position.set(x, getTerrainHeight(x, z) + 0.01, z);
			return pot;
		}

		// Halte bus
		function createBusStop(x, z, rotY = 0) {
			const stop = new THREE.Group();
			const poleGeo = new THREE.BoxGeometry(0.1, 2.5, 0.1);
			for (let side of [-0.5, 0.5]) {
				const pole = new THREE.Mesh(poleGeo, metalMat);
				pole.position.set(side, 1.25, 0);
				stop.add(pole);
			}
			const roof = boxMesh(1.4, 0.1, 0.8, 0xcccccc, 0.5, 0.2, false);
			roof.position.y = 2.5;
			stop.add(roof);
			const glass = boxMesh(1.0, 1.2, 0.05, 0x8fc4e8, 0.1, 0.6, false);
			glass.position.set(0, 1.2, -0.4);
			stop.add(glass);
			const sign = boxMesh(0.3, 0.2, 0.05, 0xffd700, 0.5, 0, false);
			sign.position.set(0, 2.7, 0.2);
			stop.add(sign);
			stop.position.set(x, getTerrainHeight(x, z) + 0.01, z);
			stop.rotation.y = rotY;
			return stop;
		}

		// ===== PENEMPATAN =====
		// Dekat air mancur (15,20)
		group.add(createBench(16.5, 22, Math.PI / 2));
		group.add(createBench(13.5, 22, Math.PI / 2));
		group.add(createFlowerPot(14, 20));
		group.add(createFlowerPot(16, 20));

		// Dekat Balai Kota
		group.add(createFlowerPot(13, 32));
		group.add(createFlowerPot(17, 32));

		// Sepanjang jalan h-upper (z=50) sisi kiri/kanan
		group.add(createBench(20, 48, 0));
		group.add(createBench(25, 48, 0));
		group.add(createFlowerPot(22, 49));
		group.add(createFlowerPot(27, 49));

		// Sepanjang jalan h-mid (z=10) sisi kiri/kanan
		group.add(createBench(20, 8, 0));
		group.add(createBench(25, 8, 0));
		group.add(createFlowerPot(22, 7));
		group.add(createFlowerPot(27, 7));

		// Halte bus di beberapa titik
		group.add(createBusStop(-20, 45, 0));
		group.add(createBusStop(20, 45, 0));
		group.add(createBusStop(-20, 5, 0));
		group.add(createBusStop(20, 5, 0));
	}
	/* ---------------- MOBIL STATIS (parkir polisi) ---------------- */
	function buildStaticCars(CFG) {
		const group = new THREE.Group();
		group.name = "StaticCars";
		cityGroups.Vehicles.add(group);

		// Buat 2 mobil polisi sederhana
		for (let i = 0; i < 2; i++) {
			const car = buildSimpleCar(0xffffff); // putih
			car.position.set(
				-22 + i * 4, // posisi x berjarak
				0.05,
				53
			);
			car.rotation.y = 0; // menghadap selatan
			car.castShadow = true;
			car.receiveShadow = true;
			group.add(car);
		}
	}

	/* ==================== HUTAN BARU (selatan kota) ==================== */
	function buildForest(CFG) {
		const f = CFG.forest || {};
		const rng = makePRNG(f.seed ?? 1);
		const count = f.count ?? 350;
		const area = f.area || { minX: -180, maxX: 180, minZ: -170, maxZ: -70 };
		const densityNear = f.densityNear ?? 0.15;
		const densityFar = f.densityFar ?? 0.85;
		const scaleMin = f.treeScaleMin ?? 0.8;
		const scaleMax = f.treeScaleMax ?? 1.8;

		const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
		const trunkMat = new THREE.MeshStandardMaterial({
			color: 0x5b4636,
			roughness: 1
		});
		const leafGeo = new THREE.ConeGeometry(1.4, 3.2, 7);
		const leafMat = new THREE.MeshStandardMaterial({
			color: 0x3d6b3f,
			roughness: 1
		});

		const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
		const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);
		trunkMesh.castShadow = true;
		trunkMesh.receiveShadow = true;
		leafMesh.castShadow = true;
		leafMesh.receiveShadow = true;

		const dummy = new THREE.Object3D();
		let placed = 0,
			attempts = 0;

		while (placed < count && attempts < count * 10) {
			attempts++;
			const x = THREE.MathUtils.lerp(area.minX, area.maxX, rng());
			const z = THREE.MathUtils.lerp(area.minZ, area.maxZ, rng());

			// Semakin jauh dari kota (z mengecil) semakin rapat
			const t = (z - area.minZ) / (area.maxZ - area.minZ);
			const density = THREE.MathUtils.lerp(densityNear, densityFar, t);
			if (rng() > density) continue;

			if (isPointInRoadExclusion(x, z)) continue;

			const y = getTerrainHeight(x, z);
			const scale = THREE.MathUtils.lerp(scaleMin, scaleMax, rng());

			dummy.position.set(x, y + 1.1 * scale, z);
			dummy.scale.set(scale, scale, scale);
			dummy.rotation.set(0, rng() * Math.PI * 2, 0);
			dummy.updateMatrix();
			trunkMesh.setMatrixAt(placed, dummy.matrix);

			dummy.position.set(x, y + 2.6 * scale, z);
			dummy.updateMatrix();
			leafMesh.setMatrixAt(placed, dummy.matrix);
			placed++;
		}

		trunkMesh.count = placed;
		leafMesh.count = placed;
		trunkMesh.instanceMatrix.needsUpdate = true;
		leafMesh.instanceMatrix.needsUpdate = true;
		cityGroups.Nature.add(trunkMesh);
		cityGroups.Nature.add(leafMesh);
	}

	/* ==================== PEGUNUNGAN BARU (horizon selatan) ==================== */
	function buildMountains(CFG) {
		const m = CFG.mountains || {};
		const rng = makePRNG(m.seed ?? 1);
		const count = m.count ?? 7;
		const minX = m.minX ?? -180,
			maxX = m.maxX ?? 180;
		const minZ = m.minZ ?? -210,
			maxZ = m.maxZ ?? -170;
		const heightMin = m.heightMin ?? 40,
			heightMax = m.heightMax ?? 80;
		const radiusMin = m.radiusMin ?? 25,
			radiusMax = m.radiusMax ?? 45;
		const baseColor = new THREE.Color(m.color ?? 0x8a9aad);
		const variation = m.colorVariation ?? 0.1;

		const radialSegments = 16; // lebih banyak segmen
		const heightSegments = 8; // ada lapisan vertikal

		for (let i = 0; i < count; i++) {
			const x = THREE.MathUtils.lerp(minX, maxX, rng());
			const z = THREE.MathUtils.lerp(minZ, maxZ, rng());
			const height = THREE.MathUtils.lerp(heightMin, heightMax, rng());
			const radius = THREE.MathUtils.lerp(radiusMin, radiusMax, rng());

			// Gunakan CylinderGeometry dengan ujung atas kecil (mendekati kerucut)
			const geo = new THREE.CylinderGeometry(
				0.1, // radius atas kecil
				radius, // radius bawah besar
				height,
				radialSegments,
				heightSegments
			);

			// Displace vertex secara acak untuk membuat bentuk gunung tidak simetris
			const pos = geo.attributes.position;
			for (let v = 0; v < pos.count; v++) {
				const xv = pos.getX(v);
				const yv = pos.getY(v);
				const zv = pos.getZ(v);

				const angle = Math.atan2(zv, xv);
				const radialDist = Math.sqrt(xv * xv + zv * zv);

				// Faktor ketinggian: bagian bawah lebih kasar, bagian atas lebih halus
				const heightFactor = yv / height + 0.5;
				const noise = (rng() - 0.5) * radius * 0.35 * heightFactor;
				const newRadial = radialDist + noise;

				const newX = Math.cos(angle) * newRadial;
				const newZ = Math.sin(angle) * newRadial;

				pos.setX(v, newX);
				pos.setZ(v, newZ);
			}

			geo.computeVertexNormals();

			// Warna sedikit bervariasi
			const color = baseColor.clone();
			color.offsetHSL(0, 0, (rng() - 0.5) * variation * 2);
			const material = new THREE.MeshStandardMaterial({
				color,
				roughness: 1,
				metalness: 0,
				flatShading: true // membuat sisi terlihat lebih tegas
			});

			const mesh = new THREE.Mesh(geo, material);

			mesh.position.set(x, height / 2, z);
			mesh.rotation.y = rng() * Math.PI * 2;
			mesh.scale.x = 0.8 + rng() * 0.4; // variasi lebar
			mesh.scale.z = 0.8 + rng() * 0.4;

			mesh.castShadow = false;
			mesh.receiveShadow = false;

			cityGroups.Environment.add(mesh);
		}
	}
	/* ---------------- AWAN DI SEKITAR GUNUNG ---------------- */
	function buildMountainClouds(CFG) {
		const group = new THREE.Group();
		group.name = "MountainClouds";
		cityGroups.Environment.add(group);

		// Buat beberapa sprite awan tipis di sekitar area gunung
		const cloudTex = makeSoftCloudTexture(); // pastikan fungsi ini sudah ada
		const cloudMaterial = new THREE.SpriteMaterial({
			map: cloudTex,
			color: 0xffffff,
			transparent: true,
			opacity: 0.35,
			depthWrite: false
		});

		const positions = [
			{ x: -100, y: 55, z: -190 },
			{ x: -60, y: 70, z: -195 },
			{ x: 0, y: 65, z: -200 },
			{ x: 60, y: 80, z: -190 },
			{ x: 100, y: 60, z: -195 },
			{ x: -120, y: 75, z: -185 },
			{ x: 120, y: 72, z: -185 },
			{ x: -30, y: 85, z: -205 },
			{ x: 30, y: 90, z: -210 },
			{ x: 80, y: 65, z: -200 },
			{ x: -80, y: 68, z: -200 },
			{ x: 0, y: 75, z: -180 }
		];

		positions.forEach(pos => {
			const sprite = new THREE.Sprite(cloudMaterial.clone());
			sprite.position.set(pos.x, pos.y, pos.z);
			const scale = 25 + Math.random() * 35;
			sprite.scale.set(scale, scale * 0.5, 1);
			sprite.frustumCulled = false;
			group.add(sprite);
		});
	}

	/* ---------------- KENDARAAN ---------------- */
	function buildSimpleCar(color) {
		const g = new THREE.Group();
		const body = boxMesh(0.9, 0.6, 1.8, color, 0.5, 0.3);
		body.position.y = 0.5;
		g.add(body);
		const cabin = boxMesh(0.8, 0.4, 0.9, 0x1c1f24, 0.4, 0);
		cabin.position.set(0, 0.9, -0.1);
		g.add(cabin);
		const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 10);
		const wheelMat = new THREE.MeshStandardMaterial({
			color: 0x111111,
			roughness: 0.9
		});
		[
			[0.45, 0.25, 0.6],
			[0.45, 0.25, -0.6],
			[-0.45, 0.25, 0.6],
			[-0.45, 0.25, -0.6]
		].forEach(([x, y, z]) => {
			const wheel = new THREE.Mesh(wheelGeo, wheelMat);
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set(x, y, z);
			wheel.castShadow = true;
			g.add(wheel);
		});
		return g;
	}

	function buildVehicles(CFG) {
		const v = CFG.vehicles || {};
		const rng = makePRNG(v.seed ?? 2);
		const count = v.count ?? 9;
		const colors = v.colors || [0xd23c3c, 0x3c6bd2];
		const baseSpeed = v.speed ?? 4;

		if (!roadGraph || roadGraph.edges.length === 0) return;

		for (let i = 0; i < count; i++) {
			const edgeIndex =
				Math.floor(rng() * roadGraph.edges.length) %
				roadGraph.edges.length;
			const edge = roadGraph.edges[edgeIndex];
			if (!edge || edge.length <= 0) continue;

			const color =
				colors[Math.floor(rng() * colors.length) % colors.length];
			const car = buildSimpleCar(color);
			cityGroups.Vehicles.add(car);

			const goForward = rng() < 0.5;
			const speed = Math.max(1.5, baseSpeed + (rng() * 2 - 1));
			const turnSeed = ((v.seed ?? 2) * 2654435761 + i * 104729) >>> 0;

			const vehicle = {
				mesh: car,
				edge,
				fromKey: goForward ? edge.nodeAKey : edge.nodeBKey,
				toKey: goForward ? edge.nodeBKey : edge.nodeAKey,
				t: rng(),
				speed,
				turnRng: makePRNG(turnSeed)
			};
			vehicles.push(vehicle);
			placeVehicleOnEdge(vehicle);
		}
	}

	function placeVehicleOnEdge(v) {
		if (!v.edge || v.edge.length <= 0) return;
		const fromNode = roadGraph.nodes.get(v.fromKey);
		const toNode = roadGraph.nodes.get(v.toKey);
		if (!fromNode || !toNode) return;

		const fromV = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
		const toV = new THREE.Vector3(toNode.x, toNode.y, toNode.z);
		const pos = new THREE.Vector3().lerpVectors(fromV, toV, v.t);
		const forward = new THREE.Vector3().subVectors(toV, fromV).normalize();

		const perp = new THREE.Vector3(-forward.z, 0, forward.x);
		pos.addScaledVector(perp, laneOffsetDist);

		v.mesh.position.set(pos.x, pos.y + 0.05, pos.z);
		v.mesh.rotation.x = 0;
		v.mesh.rotation.z = 0;
		v.mesh.rotation.y = Math.atan2(forward.x, forward.z);
	}

	function advanceVehicleToNextEdge(v) {
		const node = roadGraph.nodes.get(v.toKey);
		if (!node || node.edges.length === 0) return;

		const currentEdgeIdx = roadGraph.edges.indexOf(v.edge);
		const options = node.edges.filter(idx => idx !== currentEdgeIdx);
		const candidates = options.length > 0 ? options : node.edges;

		const pick =
			candidates[
				Math.floor(v.turnRng() * candidates.length) % candidates.length
			];
		const nextEdge = roadGraph.edges[pick];
		const fromKey = v.toKey;
		const toKey =
			nextEdge.nodeAKey === fromKey
				? nextEdge.nodeBKey
				: nextEdge.nodeAKey;

		v.edge = nextEdge;
		v.fromKey = fromKey;
		v.toKey = toKey;
	}

	function updateVehicles(dt) {
		if (!roadGraph) return;
		vehicles.forEach(v => {
			if (!v.edge || v.edge.length <= 0) return;

			let distanceLeft = v.speed * dt;
			let guard = 0;
			while (distanceLeft > 0 && guard < 8) {
				guard++;
				const remainingOnEdge = (1 - v.t) * v.edge.length;
				if (distanceLeft < remainingOnEdge) {
					v.t += distanceLeft / v.edge.length;
					distanceLeft = 0;
				} else {
					distanceLeft -= remainingOnEdge;
					advanceVehicleToNextEdge(v);
					v.t = 0;
				}
			}

			placeVehicleOnEdge(v);
		});
	}
	/* ---------------- ATMOSFER ---------------- */
	function makeSoftCloudTexture() {
		const c = document.createElement("canvas");
		c.width = c.height = 128;
		const ctx = c.getContext("2d");
		const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
		grad.addColorStop(0, "rgba(255,255,255,0.95)");
		grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
		grad.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, 128, 128);
		return new THREE.CanvasTexture(c);
	}
	function buildAtmosphere() {
		const cloudTex = makeSoftCloudTexture();
		const rng = makePRNG(9);
		for (let i = 0; i < 16; i++) {
			const material = new THREE.SpriteMaterial({
				map: cloudTex,
				color: 0xffffff,
				transparent: true,
				opacity: 0.55,
				depthWrite: false
			});
			const sprite = new THREE.Sprite(material);
			const angle = rng() * Math.PI * 2;
			const dist = 170 + rng() * 140;
			sprite.position.set(
				Math.cos(angle) * dist,
				70 + rng() * 35,
				Math.sin(angle) * dist
			);
			const s = 30 + rng() * 35;
			sprite.scale.set(s, s * 0.5, 1);
			cityGroups.Environment.add(sprite);
		}
	}
	/* ---------------- BALON UDARA & BURUNG ---------------- */
	function buildSkyBalloons(CFG) {
		const group = new THREE.Group();
		group.name = "SkyBalloons";
		cityGroups.Environment.add(group);

		const colors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff9a76];
		const positions = [
			{ x: 5, y: 20, z: -15 },
			{ x: -8, y: 24, z: -22 },
			{ x: 12, y: 22, z: -28 },
			{ x: -14, y: 19, z: -12 },
			{ x: 0, y: 26, z: -35 }
		];

		function createBalloonEnvelope(colorHex) {
			const points = [];
			const h = 4.5;
			const segments = 12;
			for (let i = 0; i <= segments; i++) {
				const t = i / segments;
				const y = t * h;
				let r;
				if (t < 0.2) {
					// bagian bawah menyempit
					r = 0.2 + (t / 0.2) * 1.8;
				} else if (t < 0.8) {
					// bagian tengah lebar
					r = 2.5 - ((t - 0.2) / 0.6) * 0.2;
				} else {
					// bagian atas membulat
					const u = (t - 0.8) / 0.2;
					r = 2.3 - u * 2.0;
				}
				points.push(new THREE.Vector2(r, y));
			}

			const geo = new THREE.LatheGeometry(points, 16);
			const mat = new THREE.MeshStandardMaterial({
				color: colorHex,
				roughness: 0.5,
				metalness: 0.05
			});
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.y = 0;
			mesh.castShadow = true;
			mesh.receiveShadow = false;
			return mesh;
		}

		positions.forEach((pos, i) => {
			const balloon = new THREE.Group();

			// Envelope (balon)
			const envelope = createBalloonEnvelope(colors[i % colors.length]);
			envelope.position.y = 2.0; // naikkan agar berada di atas keranjang
			envelope.scale.set(1, 1, 1);
			envelope.frustumCulled = false;
			balloon.add(envelope);

			// Tali-tali
			const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.8, 4);
			const ropeMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a });
			for (let j = 0; j < 4; j++) {
				const rope = new THREE.Mesh(ropeGeo, ropeMat);
				rope.position.set(
					j < 2 ? -0.4 : 0.4,
					1.4,
					j % 2 === 0 ? -0.4 : 0.4
				);
				rope.rotation.z = j % 2 === 0 ? 0.05 : -0.05;
				rope.frustumCulled = false;
				balloon.add(rope);
			}

			// Keranjang
			const basketGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.9, 8);
			const basketMat = new THREE.MeshStandardMaterial({
				color: 0x8b5a2b,
				roughness: 0.8
			});
			const basket = new THREE.Mesh(basketGeo, basketMat);
			basket.position.y = 0.45;
			basket.castShadow = true;
			basket.receiveShadow = true;
			basket.frustumCulled = false;
			balloon.add(basket);

			// Tambahan sabuk keranjang
			const bandGeo = new THREE.TorusGeometry(0.6, 0.06, 4, 8);
			const bandMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
			const band = new THREE.Mesh(bandGeo, bandMat);
			band.rotation.x = Math.PI / 2;
			band.position.y = 0.45;
			band.frustumCulled = false;
			balloon.add(band);

			balloon.position.set(pos.x, pos.y, pos.z);
			balloon.rotation.y = Math.random() * Math.PI * 2;
			balloon.frustumCulled = false;

			group.add(balloon);
			skyBalloons.push({
				mesh: balloon,
				baseX: pos.x,
				baseZ: pos.z,
				baseY: pos.y,
				phase: Math.random() * Math.PI * 2,
				orbitRadius: 2 + Math.random() * 2,
				orbitAngle: Math.random() * Math.PI * 2,
				rotSpeed: (Math.random() - 0.5) * 0.01
			});
		});
	}

	function buildSkyBirds(CFG) {
		const group = new THREE.Group();
		group.name = "SkyBirds";
		cityGroups.Environment.add(group);

		const birdGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
		const birdMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

		const positions = [
			{ x: 0, y: 18, z: -5 },
			{ x: 10, y: 20, z: -15 },
			{ x: -10, y: 22, z: -25 },
			{ x: 5, y: 25, z: -30 },
			{ x: -5, y: 20, z: -40 },
			{ x: 15, y: 23, z: -20 },
			{ x: -15, y: 19, z: -10 },
			{ x: 0, y: 26, z: -35 }
		];

		positions.forEach((pos, i) => {
			const bird = new THREE.Mesh(birdGeo, birdMat);
			bird.rotation.x = Math.PI / 2; // horizontal
			bird.position.set(pos.x, pos.y, pos.z);
			bird.frustumCulled = false;
			group.add(bird);

			skyBirds.push({
				mesh: bird,
				speed: 2 + Math.random() * 2,
				direction: new THREE.Vector3(
					Math.random() - 0.5,
					0,
					Math.random() - 0.5
				).normalize(),
				turnTimer: 0,
				turnInterval: 4 + Math.random() * 8,
				minX: -25,
				maxX: 25,
				minZ: -45,
				maxZ: -5
			});
		});
	}

	function updateSkyObjects(dt) {
		// Update balon udara
		skyBalloons.forEach(b => {
			b.phase += dt * 0.3;
			b.orbitAngle += dt * 0.1;
			b.mesh.position.y = b.baseY + Math.sin(b.phase) * 2;
			b.mesh.position.x =
				b.baseX + Math.cos(b.orbitAngle) * b.orbitRadius;
			b.mesh.position.z =
				b.baseZ + Math.sin(b.orbitAngle) * b.orbitRadius;
			b.mesh.rotation.y += b.rotSpeed;
		});

		// Update burung
		skyBirds.forEach(b => {
			b.turnTimer += dt;
			if (b.turnTimer > b.turnInterval) {
				b.turnTimer = 0;
				b.direction
					.set(Math.random() - 0.5, 0, Math.random() - 0.5)
					.normalize();
			}

			b.mesh.position.addScaledVector(b.direction, b.speed * dt);

			// Wrap-around di area pandang
			if (b.mesh.position.x > b.maxX) {
				b.mesh.position.x = b.minX;
			}
			if (b.mesh.position.x < b.minX) {
				b.mesh.position.x = b.maxX;
			}
			if (b.mesh.position.z > b.maxZ) {
				b.mesh.position.z = b.minZ;
			}
			if (b.mesh.position.z < b.minZ) {
				b.mesh.position.z = b.maxZ;
			}

			b.mesh.rotation.y = Math.atan2(b.direction.x, b.direction.z);
		});
	}

	/* ---------------- VALIDASI LAYOUT ---------------- */
	function validateLayout(CFG) {
		const r = CFG.road || {};
		const half =
			(r.width ?? 8) / 2 +
			(r.sidewalkWidth ?? 1.6) +
			(r.safetyMargin ?? 0.5);
		const buildings = CFG.buildings || [];

		buildings.forEach(b => {
			const bx0 = b.position.x - b.size.x / 2,
				bx1 = b.position.x + b.size.x / 2;
			const bz0 = b.position.z - b.size.z / 2,
				bz1 = b.position.z + b.size.z / 2;

			roadLines.forEach(road => {
				const isVertical = Math.abs(road.a.x - road.b.x) < 0.001;
				if (isVertical) {
					const rx = road.a.x;
					const rz0 = Math.min(road.a.z, road.b.z),
						rz1 = Math.max(road.a.z, road.b.z);
					const overlapX = bx0 < rx + half && bx1 > rx - half;
					const overlapZ = bz1 > rz0 && bz0 < rz1;
					if (overlapX && overlapZ)
						console.warn(
							'[CityLayout] Building "' +
								b.id +
								'" overlap dengan road "' +
								road.id +
								'"'
						);
				} else {
					const rz = road.a.z;
					const rx0 = Math.min(road.a.x, road.b.x),
						rx1 = Math.max(road.a.x, road.b.x);
					const overlapZ = bz0 < rz + half && bz1 > rz - half;
					const overlapX = bx1 > rx0 && bx0 < rx1;
					if (overlapX && overlapZ)
						console.warn(
							'[CityLayout] Building "' +
								b.id +
								'" overlap dengan road "' +
								road.id +
								'"'
						);
				}
			});
		});

		for (let i = 0; i < buildings.length; i++) {
			for (let j = i + 1; j < buildings.length; j++) {
				const b1 = buildings[i],
					b2 = buildings[j];
				const b1x0 = b1.position.x - b1.size.x / 2,
					b1x1 = b1.position.x + b1.size.x / 2;
				const b1z0 = b1.position.z - b1.size.z / 2,
					b1z1 = b1.position.z + b1.size.z / 2;
				const b2x0 = b2.position.x - b2.size.x / 2,
					b2x1 = b2.position.x + b2.size.x / 2;
				const b2z0 = b2.position.z - b2.size.z / 2,
					b2z1 = b2.position.z + b2.size.z / 2;
				if (b1x0 < b2x1 && b1x1 > b2x0 && b1z0 < b2z1 && b1z1 > b2z0) {
					console.warn(
						'[CityLayout] Building "' +
							b1.id +
							'" overlap dengan building "' +
							b2.id +
							'"'
					);
				}
			}
		}

		for (let i = 0; i < roadLines.length; i++) {
			for (let j = i + 1; j < roadLines.length; j++) {
				const r1 = roadLines[i],
					r2 = roadLines[j];
				if (r1.axis !== r2.axis || r1.at !== r2.at) continue;
				const r1min = Math.min(
					r1.axis === "x" ? r1.a.x : r1.a.z,
					r1.axis === "x" ? r1.b.x : r1.b.z
				);
				const r1max = Math.max(
					r1.axis === "x" ? r1.a.x : r1.a.z,
					r1.axis === "x" ? r1.b.x : r1.b.z
				);
				const r2min = Math.min(
					r2.axis === "x" ? r2.a.x : r2.a.z,
					r2.axis === "x" ? r2.b.x : r2.b.z
				);
				const r2max = Math.max(
					r2.axis === "x" ? r2.a.x : r2.a.z,
					r2.axis === "x" ? r2.b.x : r2.b.z
				);
				if (r1min < r2max && r2min < r1max) {
					console.warn(
						'[CityLayout] Road "' +
							r1.id +
							'" overlap dengan road "' +
							r2.id +
							'"'
					);
				}
			}
		}
	}

	/* ---------------- KAMERA ---------------- */
	function startCameraIntro(CFG) {
		const path = (CFG.camera || {}).introPath;
		introState =
			path && path.length >= 2
				? { path, index: 0, elapsed: 0, done: false }
				: null;
		idleTime = 0;
	}
	function updateCameraIntro(dt) {
		if (!introState || introState.done) {
			updateCameraIdle(dt);
			return;
		}
		const { path } = introState;
		const from = path[introState.index];
		const to = path[introState.index + 1];
		introState.elapsed += dt;
		const duration = to.duration ?? 3;
		let t = Math.min(introState.elapsed / duration, 1);
		t = t * t * (3 - 2 * t);
		const pos = new THREE.Vector3().lerpVectors(
			new THREE.Vector3(from.pos.x, from.pos.y, from.pos.z),
			new THREE.Vector3(to.pos.x, to.pos.y, to.pos.z),
			t
		);
		const look = new THREE.Vector3().lerpVectors(
			new THREE.Vector3(from.lookAt.x, from.lookAt.y, from.lookAt.z),
			new THREE.Vector3(to.lookAt.x, to.lookAt.y, to.lookAt.z),
			t
		);
		cityCamera.position.copy(pos);
		cityCamera.lookAt(look);
		if (t >= 1) {
			introState.elapsed = 0;
			introState.index++;
			if (introState.index >= path.length - 1) {
				introState.done = true;

				// Panggil callback jika ada (untuk menyembunyikan overlay)
				if (typeof onCameraIntroDoneCallback === "function") {
					onCameraIntroDoneCallback();
					onCameraIntroDoneCallback = null; // reset
				}
			}
		}
	}
	function updateCameraIdle(dt) {
		idleTime += dt;
		const camCfg = (window.CITY_CONFIG && window.CITY_CONFIG.camera) || {};
		const base = camCfg.idleLookAt || { x: 0, y: 6, z: -10 };
		const swayX = Math.sin(idleTime * 0.05) * 6;
		cityCamera.lookAt(base.x + swayX, base.y, base.z);
	}

	function getCurrentLookAtTarget(distance = 100) {
		const dir = new THREE.Vector3();
		cityCamera.getWorldDirection(dir);
		return cityCamera.position.clone().add(dir.multiplyScalar(distance));
	}
	function updateCameraFocus(dt) {
		if (!cameraFocusState) return;

		const state = cameraFocusState;

		if (state.phase === "transition") {
			state.elapsed += dt;
			const t = Math.min(state.elapsed / state.duration, 1);
			const eased = t * t * (3 - 2 * t);

			const pos = new THREE.Vector3().lerpVectors(
				state.startPosition,
				state.targetPosition,
				eased
			);
			const look = new THREE.Vector3().lerpVectors(
				state.startLookAt,
				state.targetLookAt,
				eased
			);

			cityCamera.position.copy(pos);
			cityCamera.lookAt(look);

			if (t >= 1) {
				state.phase = "orbit";
				state.orbitAngle = Math.atan2(
					state.targetPosition.x - state.targetLookAt.x,
					state.targetPosition.z - state.targetLookAt.z
				);
			}
		} else if (state.phase === "orbit") {
			state.orbitAngle += dt * state.orbitSpeed;

			const target = state.targetLookAt;
			const radius = state.orbitRadius;
			const height = state.orbitHeight;

			const x = target.x + Math.sin(state.orbitAngle) * radius;
			const z = target.z + Math.cos(state.orbitAngle) * radius;
			const y = target.y + height;

			cityCamera.position.set(x, y, z);
			cityCamera.lookAt(target);
		}
	}

	/* ---------------- RESIZE / UPDATE / LOOP ---------------- */
	function resizeCity() {
		if (!cityRenderer || !cityCamera) return;
		const el = containerEl || canvasEl.parentElement;
		const w = (el && el.clientWidth) || window.innerWidth;
		const h = (el && el.clientHeight) || window.innerHeight;
		cityCamera.aspect = w / h;
		cityCamera.updateProjectionMatrix();
		cityRenderer.setSize(w, h, false);
	}
	function updateCity(deltaTime) {
		if (cameraFocusState) {
			updateCameraFocus(deltaTime);
		} else {
			updateCameraIntro(deltaTime);
		}
		updateVehicles(deltaTime);
		updateSkyObjects(deltaTime); // << tambahkan ini
	}
	function exitCameraFocus() {
		cameraFocusState = null;
	}

	function isCameraFocusActive() {
		return !!cameraFocusState;
	}
	function animateCity() {
		if (!clock || !cityRenderer || !cityScene || !cityCamera) {
			// Jika belum siap, jangan render. Coba lagi setelah beberapa saat (tidak perlu).
			return;
		}
		rafId = requestAnimationFrame(animateCity);
		const deltaTime = clock.getDelta();
		updateCity(deltaTime);
		cityRenderer.render(cityScene, cityCamera);
	}

	return {
		initCity,
		destroyCity,
		resizeCity,
		updateCity,
		getBuildingWorldCenter,
		getInteractiveBuildings,
		focusBuilding,
		exitCameraFocus,
		isCameraFocusActive,
		setCameraIntroDoneCallback: function (cb) {
			onCameraIntroDoneCallback = cb;
		}
	};
})();
