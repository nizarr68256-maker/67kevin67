/* ============================================================
   SLIDE 7 — "JIKA TRADISI DITINGGALKAN"
   Mini-world 3D sinematik dengan Three.js.

   REVISI v11 — FINAL TRANSITION KE SLIDE 8
   - Menghapus final message statis.
   - Mempercepat navigasi otomatis setelah whiteout selesai.
   ============================================================ */
(function () {
	"use strict";

	var slide = document.getElementById("slide7");
	if (!slide) return;
	if (typeof THREE === "undefined") {
		console.warn(
			"[slide7] THREE.js belum dimuat — cek tag <script> di index.html"
		);
		return;
	}

	// ---------------------------------------------------------
	// DOM refs
	// ---------------------------------------------------------
	var canvasWrap = document.getElementById("s7CanvasWrap");
	var panelEl = document.getElementById("s7Panel");
	var panelEyebrow = document.getElementById("s7PanelEyebrow");
	var panelTitle = document.getElementById("s7PanelTitle");
	var panelText = document.getElementById("s7PanelText");
	var minimap = document.getElementById("s7Minimap");
	var resetBtn = document.getElementById("s7ResetBtn");
	var whiteoutEl = document.getElementById("s7Whiteout");
	var finalEl = document.getElementById("s7Final");

	var nodeButtons = {};
	Array.prototype.slice
		.call(minimap.querySelectorAll(".s7-node[data-building]"))
		.forEach(function (btn) {
			nodeButtons[btn.getAttribute("data-building")] = btn;
		});

	// ---------------------------------------------------------
	// Content
	// ---------------------------------------------------------
	var ORDER = ["identitas", "sejarah", "nilai-sosial", "kearifan-lokal"];
	var CONTENT = {
		identitas: {
			eyebrow: "Identitas",
			title: "Hilangnya Identitas",
			text: "Hilangnya ciri khas masyarakat dan karakter yang membedakannya dari masyarakat lain."
		},
		sejarah: {
			eyebrow: "Sejarah",
			title: "Minim pengetahuan sejarah",
			text: "Generasi muda semakin jauh dari akar budaya dan cerita yang membentuk perjalanan masyarakat."
		},
		"nilai-sosial": {
			eyebrow: "Nilai Sosial",
			title: "Berkurangnya Nilai Sosial",
			text: "Semangat kebersamaan, gotong royong, musyawarah, dan kepedulian terhadap sesama perlahan dapat melemah."
		},
		"kearifan-lokal": {
			eyebrow: "Kearifan Lokal",
			title: "Tradisi Kearifan Lokal dapat Punah",
			text: "Pengetahuan dan cara hidup yang diwariskan antargenerasi dapat ikut terlupakan."
		}
	};

	// ---------------------------------------------------------
	// Three.js state (created once)
	// ---------------------------------------------------------
	var initialized = false;
	var renderer, scene, camera;
	var rafId = null;
	var running = false;
	var clock = new THREE.Clock();

	var buildings = {};
	var riverCurve = null;
	var riverWaterMaterial = null; // ← tambahkan
	var riverWaterTexture = null; // ← tambahkan

	var camTween = null;
	var camLookCurrent = new THREE.Vector3(0, 2, 2);

	var OVERVIEW_POS = new THREE.Vector3(0, 40, 34);
	var OVERVIEW_LOOK = new THREE.Vector3(0, 2, 2);

	var phase = "idle";
	var activeBuilding = null;
	var deadCount = 0;
	var timers = [];
	var finalTriggered = false;

	var BURN_DURATION = 3.2;
	var CHARRED_COLOR = new THREE.Color(0x241f1a);

	var FINAL_GLOW_DURATION = 6.2;
	var finalGlow = null;

	// ============================================================
	// CACHE & INSTANCING HELPERS (OPTIMASI TAHAP 1)
	// ============================================================
	var GEOMETRY_CACHE = {};
	var MATERIAL_CACHE = {};

	function getGeometry(type, params) {
		var key = type + ":" + JSON.stringify(params);
		if (!GEOMETRY_CACHE[key]) {
			switch (type) {
				case "cylinder":
					GEOMETRY_CACHE[key] = new THREE.CylinderGeometry(
						params[0],
						params[1],
						params[2],
						params[3],
						params[4],
						params[5]
					);
					break;
				case "sphere":
					GEOMETRY_CACHE[key] = new THREE.SphereGeometry(
						params[0],
						params[1],
						params[2]
					);
					break;
				case "box":
					GEOMETRY_CACHE[key] = new THREE.BoxGeometry(
						params[0],
						params[1],
						params[2]
					);
					break;
				case "cone":
					GEOMETRY_CACHE[key] = new THREE.ConeGeometry(
						params[0],
						params[1],
						params[2]
					);
					break;
				case "dodecahedron":
					GEOMETRY_CACHE[key] = new THREE.DodecahedronGeometry(
						params[0],
						params[1]
					);
					break;
				default:
					console.warn("[slide7] Unknown geometry type:", type);
					return null;
			}
		}
		return GEOMETRY_CACHE[key];
	}

	function getMaterial(type, params) {
		var key = type + ":" + JSON.stringify(params);
		if (!MATERIAL_CACHE[key]) {
			if (type === "standard") {
				MATERIAL_CACHE[key] = new THREE.MeshStandardMaterial(params);
			} else if (type === "basic") {
				MATERIAL_CACHE[key] = new THREE.MeshBasicMaterial(params);
			} else {
				console.warn("[slide7] Unknown material type:", type);
				return null;
			}
		}
		return MATERIAL_CACHE[key];
	}

	function createInstancedMesh(geometry, material, transforms) {
		var count = transforms.length;
		var mesh = new THREE.InstancedMesh(geometry, material, count);
		var matrix = new THREE.Matrix4();
		var pos = new THREE.Vector3();
		var quat = new THREE.Quaternion();
		var scl = new THREE.Vector3();

		transforms.forEach(function (t, i) {
			pos.copy(t.position);
			scl.copy(t.scale || new THREE.Vector3(1, 1, 1));
			quat.setFromEuler(t.rotation || new THREE.Euler(0, 0, 0));
			matrix.compose(pos, quat, scl);
			mesh.setMatrixAt(i, matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
		return mesh;
	}

	// ---------------------------------------------------------
	// Building layout
	// ---------------------------------------------------------
	var LAYOUT = [
		{
			id: "tradisi",
			pos: [0, 0, -15],
			tradisi: true,
			w: 6.2,
			h: 5.5,
			roofColor: 0xd9a34e,
			wallColor: 0xf2e4c0
		},
		{
			id: "identitas",
			pos: [-11, 0, 1],
			w: 4,
			h: 3.4,
			roofColor: 0xc26b45,
			wallColor: 0xe3cfa0
		},
		{
			id: "sejarah",
			pos: [0, 0, 3],
			w: 4.6,
			h: 4,
			roofColor: 0x7e93ac,
			wallColor: 0xede6d2,
			museum: true
		},
		{
			id: "nilai-sosial",
			pos: [11, 0, 1],
			w: 4.2,
			h: 3.2,
			roofColor: 0x6fa35c,
			wallColor: 0xeae0be,
			open: true
		},
		{
			id: "kearifan-lokal",
			pos: [0, 0, 16],
			w: 3.6,
			h: 2.8,
			roofColor: 0x8c6a3e,
			wallColor: 0xc9a768,
			saung: true
		}
	];

	function initThree() {
		if (initialized) return;
		initialized = true;

		var w = canvasWrap.clientWidth || window.innerWidth;
		var h = canvasWrap.clientHeight || window.innerHeight;

		renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: false,
			powerPreference: "high-performance"
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
		renderer.setSize(w, h);

		var SKY_COLOR = 0xaed8f5;
		var GROUND_COLOR = 0x6f8f55;
		var ROAD_COLOR = 0xc7c0ac;

		renderer.setClearColor(SKY_COLOR, 1);
		if (renderer.outputColorSpace !== undefined)
			renderer.outputColorSpace = THREE.SRGBColorSpace;
		canvasWrap.appendChild(renderer.domElement);

		scene = new THREE.Scene();
		scene.background = new THREE.Color(SKY_COLOR);
		scene.fog = new THREE.FogExp2(SKY_COLOR, 0.0035);

		camera = new THREE.PerspectiveCamera(38, w / h, 0.5, 200);
		camera.position.copy(OVERVIEW_POS);
		camera.lookAt(OVERVIEW_LOOK);

		var hemi = new THREE.HemisphereLight(0xdcefff, 0x8a7d5a, 0.6);
		scene.add(hemi);
		var sun = new THREE.DirectionalLight(0xfff1d0, 0.9);
		sun.position.set(-16, 24, 12);
		scene.add(sun);
		var fill = new THREE.DirectionalLight(0xcfe6ff, 0.24);
		fill.position.set(18, 10, -14);
		scene.add(fill);

		// Ground
		var groundGeo = new THREE.CircleGeometry(46, 48);
		var grassTex = buildGrassTexture(GROUND_COLOR);
		grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
		grassTex.repeat.set(14, 14);
		var groundMat = new THREE.MeshStandardMaterial({
			map: grassTex,
			roughness: 0.95,
			metalness: 0
		});
		var ground = new THREE.Mesh(groundGeo, groundMat);
		ground.rotation.x = -Math.PI / 2;
		scene.add(ground);

		// Path rings
		for (var r = 6; r < 22; r += 6) {
			var ringGeo = new THREE.RingGeometry(r - 0.06, r, 64);
			var ringMat = new THREE.MeshBasicMaterial({
				color: ROAD_COLOR,
				transparent: true,
				opacity: 0.5,
				side: THREE.DoubleSide
			});
			var ring = new THREE.Mesh(ringGeo, ringMat);
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = 0.012;
			scene.add(ring);
		}
		// Jalan setapak (material bersama)
		var pathMaterial = new THREE.MeshStandardMaterial({
			color: 0xc7b393,
			roughness: 0.95,
			metalness: 0
		});

		// Jalur utama: Tradisi -> Sejarah
		var path1 = createPath(
			[
				new THREE.Vector3(0, 0.02, -15),
				new THREE.Vector3(-1.5, 0.02, -9),
				new THREE.Vector3(1.2, 0.02, -3),
				new THREE.Vector3(0, 0.02, 3)
			],
			0.8,
			pathMaterial
		);
		scene.add(path1);

		// Cabang kiri: Sejarah -> Identitas
		var path2 = createPath(
			[
				new THREE.Vector3(0, 0.02, 3),
				new THREE.Vector3(-4, 0.02, 4),
				new THREE.Vector3(-8, 0.02, 2.5),
				new THREE.Vector3(-11, 0.02, 1)
			],
			0.7,
			pathMaterial
		);
		scene.add(path2);

		// Cabang kanan: Sejarah -> Nilai Sosial
		var path3 = createPath(
			[
				new THREE.Vector3(0, 0.02, 3),
				new THREE.Vector3(4, 0.02, 4),
				new THREE.Vector3(8, 0.02, 2.5),
				new THREE.Vector3(11, 0.02, 1)
			],
			0.7,
			pathMaterial
		);
		scene.add(path3);

		// Jalur depan: Sejarah -> Kearifan Lokal
		var path4 = createPath(
			[
				new THREE.Vector3(0, 0.02, 3),
				new THREE.Vector3(0.5, 0.02, 8),
				new THREE.Vector3(-0.5, 0.02, 12),
				new THREE.Vector3(0, 0.02, 16)
			],
			0.8,
			pathMaterial
		);
		scene.add(path4);

		// Vegetation (trees)
		var greenMat = new THREE.MeshStandardMaterial({
			color: 0x6f9a55,
			roughness: 1
		});
		var trunkMat = new THREE.MeshStandardMaterial({
			color: 0x5b4530,
			roughness: 1
		});
		[
			[-17, -6],
			[17, -6],
			[-6, 22],
			[6, 22],
			[-20, 10],
			[20, 10]
		].forEach(function (p) {
			var trunk = new THREE.Mesh(
				new THREE.CylinderGeometry(0.1, 0.13, 1.1, 6),
				trunkMat
			);
			trunk.position.set(p[0], 0.55, p[1]);
			var leaves = new THREE.Mesh(
				new THREE.SphereGeometry(0.7, 8, 8),
				greenMat
			);
			leaves.position.set(p[0], 1.35, p[1]);
			scene.add(trunk);
			scene.add(leaves);
		});

		// ============================================================
		// STEP 2B — VEGETASI DASAR (POHON, SEMAK, TANAMAN PENDEK)
		// ============================================================
		function addVegetation() {
			// --- Pohon Low-Poly ---
			var trunkGeometry = getGeometry("cylinder", [
				0.15,
				0.2,
				1.5,
				6,
				1,
				false
			]);
			var trunkMaterial = getMaterial("standard", {
				color: 0x6b4a2e,
				roughness: 0.9
			});
			var canopyGeometry = getGeometry("cone", [1.1, 2.2, 6]);
			var canopyMaterial = getMaterial("standard", {
				color: 0x5b8c4a,
				roughness: 0.8
			});

			// Data pohon: x, z, skala, rotasiY
			var treeData = [
				{ x: -5, z: -12, scale: 0.9, rot: 0.2 },
				{ x: 5, z: -12, scale: 1.0, rot: 0.5 },
				{ x: -14, z: -2, scale: 1.1, rot: 1.0 },
				{ x: 14, z: -2, scale: 0.85, rot: 0.8 },
				{ x: -8, z: 7, scale: 1.0, rot: 0.4 },
				{ x: 8, z: 7, scale: 0.95, rot: 0.7 },
				{ x: -3, z: 20, scale: 1.15, rot: 0.1 },
				{ x: 3, z: 20, scale: 0.9, rot: 0.6 }
			];

			var trunkTransforms = [];
			var canopyTransforms = [];
			var trunkHeight = 1.5;
			var canopyHeight = 2.2;

			treeData.forEach(function (tree) {
				var trunkPos = new THREE.Vector3(
					tree.x,
					trunkHeight / 2,
					tree.z
				);
				var trunkScale = new THREE.Vector3(1, 1, 1);
				var trunkRot = new THREE.Euler(0, tree.rot, 0);
				trunkTransforms.push({
					position: trunkPos,
					scale: trunkScale,
					rotation: trunkRot
				});

				var canopyPos = new THREE.Vector3(
					tree.x,
					trunkHeight + canopyHeight / 2,
					tree.z
				);
				var canopyScale = new THREE.Vector3(
					tree.scale,
					tree.scale,
					tree.scale
				);
				var canopyRot = new THREE.Euler(0, tree.rot + 0.2, 0);
				canopyTransforms.push({
					position: canopyPos,
					scale: canopyScale,
					rotation: canopyRot
				});
			});

			var trunkInstanced = createInstancedMesh(
				trunkGeometry,
				trunkMaterial,
				trunkTransforms
			);
			var canopyInstanced = createInstancedMesh(
				canopyGeometry,
				canopyMaterial,
				canopyTransforms
			);
			scene.add(trunkInstanced);
			scene.add(canopyInstanced);

			// --- Semak ---
			var bushGeometry = getGeometry("sphere", [0.4, 6, 4]);
			var bushMaterial = getMaterial("standard", {
				color: 0x4f7a3d,
				roughness: 0.9
			});

			var bushData = [
				{ x: -2, z: -13, scale: 0.8 },
				{ x: 2, z: -13, scale: 1.0 },
				{ x: -2.5, z: 5, scale: 0.9 },
				{ x: 2.5, z: 5, scale: 1.1 },
				{ x: -12, z: 3, scale: 0.85 },
				{ x: -10, z: -1, scale: 1.0 },
				{ x: 12, z: 3, scale: 0.95 },
				{ x: 10, z: -1, scale: 0.8 },
				{ x: -2, z: 14, scale: 1.0 },
				{ x: 2, z: 14, scale: 0.9 },
				{ x: -1, z: -8, scale: 0.75 },
				{ x: 1, z: -8, scale: 0.85 }
			];

			var bushTransforms = bushData.map(function (bush) {
				var pos = new THREE.Vector3(bush.x, 0.15, bush.z);
				var scl = new THREE.Vector3(bush.scale, bush.scale, bush.scale);
				var rot = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
				return { position: pos, scale: scl, rotation: rot };
			});

			var bushInstanced = createInstancedMesh(
				bushGeometry,
				bushMaterial,
				bushTransforms
			);
			scene.add(bushInstanced);

			// --- Tanaman Pendek ---
			var plantGeometry = getGeometry("cone", [0.12, 0.5, 5]);
			var plantMaterial = getMaterial("standard", {
				color: 0x7cb84b,
				roughness: 0.85
			});

			var plantData = [
				{ x: -3, z: -10 },
				{ x: 3, z: -10 },
				{ x: -6, z: -7 },
				{ x: 6, z: -7 },
				{ x: -4, z: 0 },
				{ x: 4, z: 0 },
				{ x: -7, z: 5 },
				{ x: 7, z: 5 },
				{ x: -5, z: 12 },
				{ x: 5, z: 12 },
				{ x: -2, z: 15 },
				{ x: 2, z: 15 },
				{ x: -1, z: 2 },
				{ x: 1, z: 2 }
			];

			var plantTransforms = plantData.map(function (plant) {
				var pos = new THREE.Vector3(plant.x, 0.2, plant.z);
				var scl = new THREE.Vector3(
					0.8 + Math.random() * 0.4,
					0.8 + Math.random() * 0.5,
					0.8 + Math.random() * 0.4
				);
				var rot = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
				return { position: pos, scale: scl, rotation: rot };
			});

			var plantInstanced = createInstancedMesh(
				plantGeometry,
				plantMaterial,
				plantTransforms
			);
			scene.add(plantInstanced);
		}

		// Panggil setelah bangunan dan jalan selesai dibuat
		addVegetation();

		// ============================================================
		// STEP 2C — BATU DEKORATIF (LOW-POLY)
		// ============================================================
		function addRocks() {
			var rockGeometry = getGeometry("dodecahedron", [0.2, 0]);
			var rockMaterial = getMaterial("standard", {
				color: 0x8a7a66,
				roughness: 0.9,
				metalness: 0
			});

			var rockPositions = [
				{ x: -2, z: -14, s: 0.8 },
				{ x: 2, z: -14, s: 1.0 },
				{ x: -1.5, z: -12.5, s: 0.7 },
				{ x: 1.5, z: -12.5, s: 0.9 },
				{ x: -3, z: -10, s: 0.6 },
				{ x: 3, z: -10, s: 0.75 },
				{ x: -2.5, z: -7, s: 0.85 },
				{ x: 2.5, z: -7, s: 0.65 },
				{ x: -3, z: -4, s: 0.9 },
				{ x: 3, z: -4, s: 0.7 },
				{ x: -3.5, z: 3.5, s: 0.7 },
				{ x: 3.5, z: 3.5, s: 0.8 },
				{ x: -2, z: 2, s: 0.6 },
				{ x: 2, z: 2, s: 0.9 },
				{ x: -4.5, z: 4, s: 0.5 },
				{ x: 4.5, z: 4, s: 0.7 },
				{ x: -6, z: 3, s: 0.8 },
				{ x: -8, z: 2.8, s: 0.7 },
				{ x: -9.5, z: 2, s: 0.6 },
				{ x: -10.5, z: 1.2, s: 0.9 },
				{ x: 6, z: 3, s: 0.7 },
				{ x: 8, z: 2.8, s: 0.65 },
				{ x: 9.5, z: 2, s: 0.8 },
				{ x: 10.5, z: 1.2, s: 0.7 },
				{ x: -2, z: 15, s: 0.6 },
				{ x: 2, z: 15, s: 0.7 },
				{ x: -1.2, z: 14, s: 0.9 },
				{ x: 1.2, z: 14, s: 0.8 },
				{ x: -3.5, z: 17, s: 0.7 },
				{ x: 3.5, z: 17, s: 0.6 },
				{ x: -1.5, z: 10, s: 0.5 },
				{ x: 1.5, z: 10, s: 0.7 },
				{ x: -2, z: 12, s: 0.8 },
				{ x: 2, z: 12, s: 0.6 }
			];

			var transforms = rockPositions.map(function (rock) {
				var pos = new THREE.Vector3(rock.x, 0.1, rock.z);
				var scl = new THREE.Vector3(
					rock.s,
					rock.s * 0.75 + 0.1,
					rock.s
				);
				var rot = new THREE.Euler(
					Math.random() * 0.5,
					Math.random() * Math.PI * 2,
					Math.random() * 0.5
				);
				return { position: pos, scale: scl, rotation: rot };
			});

			var rockInstanced = createInstancedMesh(
				rockGeometry,
				rockMaterial,
				transforms
			);
			scene.add(rockInstanced);
		}

		addRocks();

		// ============================================================
		// SUNGAI ALAMI (ADD-ON) — ditambahkan tanpa mengubah objek existing
		// ============================================================
		function addRiver() {
			// Titik kontrol organik — berkelok, tidak simetris, banyak belokan halus
			const riverPoints = [
				new THREE.Vector3(-25, 0, -20),
				new THREE.Vector3(-20, 0, -25),
				new THREE.Vector3(-12, 0, -22),
				new THREE.Vector3(-5, 0, -27),
				new THREE.Vector3(5, 0, -25),
				new THREE.Vector3(15, 0, -22),
				new THREE.Vector3(25, 0, -18),
				new THREE.Vector3(28, 0, -10),
				new THREE.Vector3(24, 0, 0),
				new THREE.Vector3(28, 0, 10),
				new THREE.Vector3(22, 0, 18),
				new THREE.Vector3(12, 0, 22),
				new THREE.Vector3(2, 0, 25),
				new THREE.Vector3(-8, 0, 23),
				new THREE.Vector3(-18, 0, 22),
				new THREE.Vector3(-26, 0, 15),
				new THREE.Vector3(-28, 0, 5),
				new THREE.Vector3(-26, 0, -5),
				new THREE.Vector3(-27, 0, -13),
				new THREE.Vector3(-22, 0, -18)
			];

			const curve = new THREE.CatmullRomCurve3(riverPoints);
			riverCurve = curve; // ← tambahkan ini
			const divisions = 200; // cukup halus, tetap ringan
			const sampled = curve.getPoints(divisions);

			// Variasi lebar sungai (tidak konstan)
			const halfWidths = [];
			for (let i = 0; i <= divisions; i++) {
				const t = i / divisions;
				const w =
					2.5 +
					Math.sin(t * Math.PI * 4) * 0.8 +
					Math.cos(t * Math.PI * 7) * 0.6;
				halfWidths.push(Math.abs(w));
			}

			// Bangun geometri strip
			const vertices = [];
			const normals = [];
			const uvs = [];
			const indices = [];
			const up = new THREE.Vector3(0, 1, 0);

			for (let i = 0; i <= divisions; i++) {
				const pos = sampled[i];
				const tangent = curve.getTangent(i / divisions).normalize();
				const right = new THREE.Vector3()
					.crossVectors(tangent, up)
					.normalize();
				const hw = halfWidths[i];

				const left = pos.clone().add(right.clone().multiplyScalar(-hw));
				const rightPos = pos
					.clone()
					.add(right.clone().multiplyScalar(hw));

				vertices.push(left.x, 0.04, left.z);
				vertices.push(rightPos.x, 0.04, rightPos.z);
				normals.push(0, 1, 0, 0, 1, 0);
				uvs.push(0, i / divisions, 1, i / divisions);
			}

			for (let i = 0; i < divisions; i++) {
				const a = i * 2;
				const b = i * 2 + 1;
				const c = (i + 1) * 2;
				const d = (i + 1) * 2 + 1;
				indices.push(a, b, c, b, d, c);
			}

			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(vertices, 3)
			);
			geometry.setAttribute(
				"normal",
				new THREE.Float32BufferAttribute(normals, 3)
			);
			geometry.setAttribute(
				"uv",
				new THREE.Float32BufferAttribute(uvs, 2)
			);
			geometry.setIndex(indices);

			if (!riverWaterTexture) {
				riverWaterTexture = createWaterTexture();
			}
			const material = new THREE.MeshStandardMaterial({
				map: riverWaterTexture,
				color: 0xffffff,
				roughness: 0.3,
				metalness: 0.05,
				transparent: true,
				opacity: 0.9,
				side: THREE.DoubleSide
			});
			riverWaterMaterial = material; // simpan untuk animasi

			const river = new THREE.Mesh(geometry, material);
			river.renderOrder = 1; // hindari z-fighting dengan tanah
			scene.add(river);

			// Batu-batu kecil di tepian (gunakan InstancedMesh untuk efisiensi)
			const rockGeo = new THREE.DodecahedronGeometry(0.15, 0);
			const rockMat = new THREE.MeshStandardMaterial({
				color: 0x8a7a66,
				roughness: 0.9
			});

			const rockTransforms = [];
			const rockCount = 40;
			for (let i = 0; i < rockCount; i++) {
				const t = Math.random();
				const pos = curve.getPoint(t);
				const tangent = curve.getTangent(t).normalize();
				const right = new THREE.Vector3()
					.crossVectors(tangent, up)
					.normalize();
				const hw = halfWidths[Math.floor(t * divisions)];
				const side = Math.random() > 0.5 ? 1 : -1;
				const offset = (hw + 0.2 + Math.random() * 0.5) * side;
				const rockPos = pos
					.clone()
					.add(right.clone().multiplyScalar(offset));
				rockPos.y = 0.05 + Math.random() * 0.1;

				rockTransforms.push({
					position: rockPos,
					scale: new THREE.Vector3(
						0.5 + Math.random() * 0.5,
						0.3 + Math.random() * 0.3,
						0.5 + Math.random() * 0.5
					),
					rotation: new THREE.Euler(
						Math.random() * 0.5,
						Math.random() * Math.PI * 2,
						Math.random() * 0.5
					)
				});
			}

			const rockInstanced = createInstancedMesh(
				rockGeo,
				rockMat,
				rockTransforms
			);
			scene.add(rockInstanced);
		}

		// ============================================================
		// VEGETASI TEPIAN SUNGAI (ADD-ON) — mengisi area kosong sekitar sungai
		// Menggunakan InstancedMesh agar sangat ringan
		// ============================================================
		function addRiversideVegetation() {
			if (!riverCurve) return;

			const up = new THREE.Vector3(0, 1, 0);
			const tangent = new THREE.Vector3();
			const right = new THREE.Vector3();

			// --- Semak di tepian ---
			const bushGeo = new THREE.SphereGeometry(0.35, 6, 5);
			const bushMat = new THREE.MeshStandardMaterial({
				color: 0x5b8247,
				roughness: 1
			});
			const bushTransforms = [];
			const bushCount = 120;
			for (let i = 0; i < bushCount; i++) {
				const t = Math.random();
				const pos = riverCurve.getPoint(t);
				tangent.copy(riverCurve.getTangent(t)).normalize();
				right.crossVectors(tangent, up).normalize();
				const side = Math.random() > 0.5 ? 1 : -1;
				const dist = 2.2 + Math.random() * 3.0; // 2.2–5.2 unit dari tengah sungai
				const offset = right.clone().multiplyScalar(side * dist);
				const bushPos = pos.clone().add(offset);
				bushPos.y = 0.08 + Math.random() * 0.1;
				const scale = 0.6 + Math.random() * 0.8;
				bushTransforms.push({
					position: bushPos,
					scale: new THREE.Vector3(scale, scale * 0.75, scale),
					rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
				});
			}
			const bushInstanced = createInstancedMesh(
				bushGeo,
				bushMat,
				bushTransforms
			);
			scene.add(bushInstanced);

			// --- Rumput kecil di tepian ---
			const grassGeo = new THREE.ConeGeometry(0.1, 0.3, 5);
			const grassMat = new THREE.MeshStandardMaterial({
				color: 0x6f9a55,
				roughness: 1
			});
			const grassTransforms = [];
			const grassCount = 180;
			for (let i = 0; i < grassCount; i++) {
				const t = Math.random();
				const pos = riverCurve.getPoint(t);
				tangent.copy(riverCurve.getTangent(t)).normalize();
				right.crossVectors(tangent, up).normalize();
				const side = Math.random() > 0.5 ? 1 : -1;
				const dist = 1.5 + Math.random() * 2.5; // lebih dekat ke air
				const offset = right.clone().multiplyScalar(side * dist);
				const grassPos = pos.clone().add(offset);
				grassPos.y = 0.05 + Math.random() * 0.08;
				const scale = 0.6 + Math.random() * 0.7;
				grassTransforms.push({
					position: grassPos,
					scale: new THREE.Vector3(scale, scale * 1.2, scale),
					rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
				});
			}
			const grassInstanced = createInstancedMesh(
				grassGeo,
				grassMat,
				grassTransforms
			);
			scene.add(grassInstanced);
		}
		// ============================================================
		// DEKORASI STATIS TAMBAHAN (ADD-ON) — pasir, perahu, jembatan
		// Murni dekoratif, dibuat sekali, tidak perlu direset.
		// ============================================================
		function addDecorations() {
			if (!riverCurve) return; // aman jika sungai belum ada

			var up = new THREE.Vector3(0, 1, 0);

			// Replikasi rumus lebar sungai dari addRiver() agar sinkron
			function riverHalfWidthAt(t) {
				var w =
					2.5 +
					Math.sin(t * Math.PI * 4) * 0.8 +
					Math.cos(t * Math.PI * 7) * 0.6;
				return Math.abs(w);
			}

			// --------------------------------------------------------
			// 1) PASIR DI TEPI SUNGAI (dua strip, kiri & kanan)
			// --------------------------------------------------------
			function buildSandStrip(sideSign) {
				var divisions = 120;
				var sandWidth = 2.5 + Math.random() * 0.8; // 2.5 – 3.3 satuan, lebih lebar

				var vertices = [];
				var normals = [];
				var uvs = [];
				var indices = [];

				var tangent = new THREE.Vector3();
				var right = new THREE.Vector3();

				for (var i = 0; i <= divisions; i++) {
					var t = i / divisions;
					var pos = riverCurve.getPoint(t);
					tangent.copy(riverCurve.getTangent(t)).normalize();
					right.crossVectors(tangent, up).normalize();

					var hw = riverHalfWidthAt(t);
					var innerDist = hw + 0.05; // sedikit di luar tepi air
					var outerDist = hw + sandWidth;

					var inner = pos
						.clone()
						.add(
							right.clone().multiplyScalar(sideSign * innerDist)
						);
					var outer = pos
						.clone()
						.add(
							right.clone().multiplyScalar(sideSign * outerDist)
						);

					// Naikkan y ke 0.12 agar tidak z-fighting dan terlihat jelas
					vertices.push(inner.x, 0.12, inner.z);
					vertices.push(outer.x, 0.12, outer.z);
					normals.push(0, 1, 0, 0, 1, 0);
					uvs.push(0, t, 1, t);
				}

				for (var i = 0; i < divisions; i++) {
					var a = i * 2;
					var b = i * 2 + 1;
					var c = (i + 1) * 2;
					var d = (i + 1) * 2 + 1;
					indices.push(a, b, c, b, d, c);
				}

				var geometry = new THREE.BufferGeometry();
				geometry.setAttribute(
					"position",
					new THREE.Float32BufferAttribute(vertices, 3)
				);
				geometry.setAttribute(
					"normal",
					new THREE.Float32BufferAttribute(normals, 3)
				);
				geometry.setAttribute(
					"uv",
					new THREE.Float32BufferAttribute(uvs, 2)
				);
				geometry.setIndex(indices);

				var sandMat = getMaterial("standard", {
					color: 0xd2b48c,
					roughness: 0.9,
					metalness: 0
				});

				var mesh = new THREE.Mesh(geometry, sandMat);
				mesh.renderOrder = 0;
				scene.add(mesh);
			}

			buildSandStrip(1); // sisi kanan sungai
			buildSandStrip(-1); // sisi kiri sungai

			// --------------------------------------------------------
			// 2) PERAHU KAYU DI SUNGAI (3–5 buah)
			// --------------------------------------------------------
			var hullGeo = getGeometry("box", [1.8, 0.35, 0.7]); // lebih besar
			var hullMat = getMaterial("standard", {
				color: 0x8b5a2b,
				roughness: 0.8
			});
			var seatGeo = getGeometry("cylinder", [
				0.05,
				0.05,
				0.5,
				6,
				1,
				false
			]); // lebih besar
			var seatMat = getMaterial("standard", {
				color: 0xa0522d,
				roughness: 0.8
			});
			var tipGeo = getGeometry("box", [0.25, 0.2, 0.25]); // ujung lancip lebih besar

			var boatCount = 3 + Math.floor(Math.random() * 3); // 3–5
			var usedT = [];

			for (var bIdx = 0; bIdx < boatCount; bIdx++) {
				var t;
				var attempts = 0;
				do {
					t = 0.08 + Math.random() * 0.84;
					var posTest = riverCurve.getPoint(t);
					var distToCenter = Math.sqrt(
						posTest.x * posTest.x + posTest.z * posTest.z
					);
					// Hindari jembatan (t≈0.5), perahu lain, dan area dekat pusat (bangunan)
					var tooClose = Math.abs(t - 0.5) < 0.08;
					var nearOther = usedT.some(function (ut) {
						return Math.abs(ut - t) < 0.08;
					});
					var nearCenter = distToCenter < 12; // minimal 12 unit dari pusat
					attempts++;
				} while (
					(tooClose || nearOther || nearCenter) &&
					attempts < 30
				);
				usedT.push(t);

				var pos = riverCurve.getPoint(t);
				var tangent = riverCurve.getTangent(t).normalize();
				var angle = Math.atan2(tangent.x, tangent.z);

				var boatGroup = new THREE.Group();
				boatGroup.position.set(pos.x, 0.2, pos.z); // lebih tinggi di atas air
				boatGroup.rotation.y = angle + (Math.random() - 0.5) * 0.3;

				// Lambung utama
				var hull = new THREE.Mesh(hullGeo, hullMat);
				hull.scale.set(
					0.9 + Math.random() * 0.3,
					1,
					0.9 + Math.random() * 0.3
				);
				boatGroup.add(hull);

				// Ujung lancip depan & belakang
				var tipFront = new THREE.Mesh(tipGeo, hullMat);
				tipFront.position.set(0, 0, 0.4);
				tipFront.rotation.y = Math.PI / 4;
				boatGroup.add(tipFront);
				var tipBack = new THREE.Mesh(tipGeo, hullMat);
				tipBack.position.set(0, 0, -0.4);
				tipBack.rotation.y = Math.PI / 4;
				boatGroup.add(tipBack);

				// Tempat duduk/dayung sederhana
				var seat = new THREE.Mesh(seatGeo, seatMat);
				seat.rotation.z = Math.PI / 2;
				seat.position.set(0, 0.15, 0);
				boatGroup.add(seat);

				scene.add(boatGroup);
			}

			// --------------------------------------------------------
			// 3) JEMBATAN KAYU MELINTASI SUNGAI (t ≈ 0.5)
			// --------------------------------------------------------
			var bridgeT = 0.5;
			var bridgePos = riverCurve.getPoint(bridgeT);
			var bridgeTangent = riverCurve.getTangent(bridgeT).normalize();
			var bridgeRight = new THREE.Vector3()
				.crossVectors(bridgeTangent, up)
				.normalize();
			var bridgeHalfWidth = riverHalfWidthAt(bridgeT);
			var bridgeLength = (bridgeHalfWidth * 2 + 1.2) * 1.8; // 1.8x lebih panjang
			var bridgeY = 1.2; // dinaikkan agar terlihat jelas

			var bridgeAngle = Math.atan2(bridgeRight.x, bridgeRight.z);

			var bridgeGroup = new THREE.Group();
			bridgeGroup.position.set(bridgePos.x, 0, bridgePos.z);
			bridgeGroup.rotation.y = bridgeAngle;
			scene.add(bridgeGroup);

			var deckMat = getMaterial("standard", {
				color: 0x6b4a2e,
				roughness: 0.85
			});
			var postMat = getMaterial("standard", {
				color: 0x5a3e2a,
				roughness: 0.85
			});

			// Lantai jembatan
			var deckGeo = getGeometry("box", [1.2, 0.1, bridgeLength]);
			var deck = new THREE.Mesh(deckGeo, deckMat);
			deck.position.set(0, bridgeY, 0);
			bridgeGroup.add(deck);

			// Pagar jembatan (dua sisi, sederhana)
			var railGeo = getGeometry("box", [0.08, 0.4, bridgeLength]);
			[-0.55, 0.55].forEach(function (x) {
				var rail = new THREE.Mesh(railGeo, postMat);
				rail.position.set(x, bridgeY + 0.25, 0);
				bridgeGroup.add(rail);
			});

			// Tiang penyangga di kedua ujung + tengah (menopang dari dasar sungai)
			var postGeo = getGeometry("cylinder", [
				0.1,
				0.12,
				bridgeY + 0.3,
				6,
				1,
				false
			]);
			var postPositions = [
				-bridgeLength / 2 + 0.2,
				0,
				bridgeLength / 2 - 0.2
			];
			postPositions.forEach(function (z) {
				[-0.45, 0.45].forEach(function (x) {
					var post = new THREE.Mesh(postGeo, postMat);
					post.position.set(x, (bridgeY + 0.3) / 2, z);
					bridgeGroup.add(post);
				});
			});
		}

		// ============================================================
		// GUNDUKAN TANAH & GUNUNG LATAR (ADD-ON)
		// Mengisi ruang kosong dan memberi kedalaman lanskap
		// ============================================================
		// ============================================================
		// GUNDUKAN BATU (ADD-ON)
		// Mengisi ruang kosong dengan formasi batu alami
		// ============================================================
		function addHillsAndMountains() {
			// ---------- GUNDUKAN BATU ----------
			const hillGeo = new THREE.DodecahedronGeometry(1, 0);
			const hillMat = new THREE.MeshStandardMaterial({
				color: 0x8a7a66, // abu-abu kecoklatan seperti batu
				roughness: 0.95
			});

			const hillTransforms = [
				{ pos: [14, 0, 10], s: [2.5, 0.8, 2.2] },
				{ pos: [-16, 0, 8], s: [3.0, 0.9, 2.6] },
				{ pos: [5, 0, -18], s: [2.2, 0.7, 2.0] },
				{ pos: [-8, 0, -20], s: [2.8, 0.9, 2.4] },
				{ pos: [22, 0, -10], s: [2.0, 0.6, 1.8] },
				{ pos: [-24, 0, -5], s: [2.4, 0.7, 2.1] }
			];

			const hillTransformsVec = hillTransforms.map(h => ({
				position: new THREE.Vector3(
					h.pos[0],
					h.pos[1] + h.s[1] * 0.5,
					h.pos[2]
				),
				scale: new THREE.Vector3(h.s[0], h.s[1], h.s[2]),
				rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
			}));

			const hillInstanced = createInstancedMesh(
				hillGeo,
				hillMat,
				hillTransformsVec
			);
			scene.add(hillInstanced);
		}

		// ============================================================
		// PAPAN IKLAN DENGAN TIANG PENYANGGA (ADD-ON)
		// Menambahkan billboard dekoratif + dua tiang penyangga
		// ============================================================
		function addBillboard() {
			const textureLoader = new THREE.TextureLoader();
			// Ganti 'assets/billboard.jpg' dengan path gambar Anda
			const billboardTexture = textureLoader.load("assets/iklan.jpg");

			// Grup untuk seluruh struktur billboard
			const billboardGroup = new THREE.Group();

			// --- Tiang penyangga (dua tiang vertikal) ---
			const poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8);
			const poleMat = new THREE.MeshStandardMaterial({
				color: 0x555555,
				roughness: 0.7,
				metalness: 0.3
			});

			const leftPole = new THREE.Mesh(poleGeo, poleMat);
			leftPole.position.set(-1.8, 1.6, 0); // kiri
			billboardGroup.add(leftPole);

			const rightPole = new THREE.Mesh(poleGeo, poleMat);
			rightPole.position.set(1.8, 1.6, 0); // kanan
			billboardGroup.add(rightPole);

			// --- Papan iklan (plane) ---
			const boardGeo = new THREE.PlaneGeometry(5, 2.8);
			const boardMat = new THREE.MeshStandardMaterial({
				map: billboardTexture,
				roughness: 0.6,
				metalness: 0.2,
				side: THREE.DoubleSide
			});

			const board = new THREE.Mesh(boardGeo, boardMat);
			board.position.set(0, 3.2, 0); // di atas tiang
			billboardGroup.add(board);

			// --- Penempatan & orientasi ---
			// Posisi baru: sisi kanan-depan, dekat area kosong antara sungai dan tepi pandangan
			billboardGroup.position.set(-8, 0, -8);
			// Sudut rotasi disesuaikan agar papan menghadap kamera overview (0,40,34)
			billboardGroup.rotation.y = 0.3;

			scene.add(billboardGroup);
		}

		// ============================================================
		// STEP 2D — PAGAR DAN LAMPU TRADISIONAL
		// ============================================================
		function addFencesAndLamps() {
			var bambooMaterial = getMaterial("standard", {
				color: 0x8a9a5b,
				roughness: 0.85
			});
			var bambooPostGeo = getGeometry("cylinder", [
				0.04,
				0.05,
				0.7,
				5,
				1,
				false
			]);
			var bambooRailGeo = getGeometry("box", [1.6, 0.06, 0.06]);

			var woodFenceMaterial = getMaterial("standard", {
				color: 0x7a4f2e,
				roughness: 0.8
			});
			var woodPostGeo = getGeometry("cylinder", [
				0.05,
				0.06,
				0.65,
				5,
				1,
				false
			]);
			var woodRailGeo = getGeometry("box", [1.4, 0.07, 0.07]);

			// Pagar bambu di Kearifan Lokal
			var bambooPostTransforms = [];
			var bambooRailTransforms = [];
			bambooPostTransforms.push(
				{
					position: new THREE.Vector3(-1.5, 0.35, 13.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-0.1, 0.35, 13.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			bambooRailTransforms.push(
				{
					position: new THREE.Vector3(-0.8, 0.45, 13.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-0.8, 0.25, 13.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			bambooPostTransforms.push(
				{
					position: new THREE.Vector3(1.2, 0.35, 14.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(2.6, 0.35, 14.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			bambooRailTransforms.push(
				{
					position: new THREE.Vector3(1.9, 0.45, 14.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(1.9, 0.25, 14.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);

			if (bambooPostTransforms.length > 0) {
				scene.add(
					createInstancedMesh(
						bambooPostGeo,
						bambooMaterial,
						bambooPostTransforms
					)
				);
				scene.add(
					createInstancedMesh(
						bambooRailGeo,
						bambooMaterial,
						bambooRailTransforms
					)
				);
			}

			// Pagar kayu di Identitas
			var woodPostTransforms = [];
			var woodRailTransforms = [];
			woodPostTransforms.push(
				{
					position: new THREE.Vector3(-12.5, 0.325, 0.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-12.5, 0.325, 2.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			woodRailTransforms.push(
				{
					position: new THREE.Vector3(-12.5, 0.4, 1.25),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, Math.PI / 2, 0)
				},
				{
					position: new THREE.Vector3(-12.5, 0.2, 1.25),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, Math.PI / 2, 0)
				}
			);
			woodPostTransforms.push(
				{
					position: new THREE.Vector3(-9.0, 0.325, 0.5),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-9.0, 0.325, 2.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			woodRailTransforms.push(
				{
					position: new THREE.Vector3(-9.0, 0.4, 1.25),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, Math.PI / 2, 0)
				},
				{
					position: new THREE.Vector3(-9.0, 0.2, 1.25),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, Math.PI / 2, 0)
				}
			);

			woodPostTransforms.push(
				{
					position: new THREE.Vector3(-3.0, 0.325, 5.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-1.5, 0.325, 5.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			woodRailTransforms.push(
				{
					position: new THREE.Vector3(-2.25, 0.4, 5.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(-2.25, 0.2, 5.0),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);

			if (woodPostTransforms.length > 0) {
				scene.add(
					createInstancedMesh(
						woodPostGeo,
						woodFenceMaterial,
						woodPostTransforms
					)
				);
				scene.add(
					createInstancedMesh(
						woodRailGeo,
						woodFenceMaterial,
						woodRailTransforms
					)
				);
			}

			// Lampu tradisional
			var lampPostGeo = getGeometry("cylinder", [
				0.06,
				0.08,
				1.2,
				5,
				1,
				false
			]);
			var lampPostMaterial = getMaterial("standard", {
				color: 0x5a3e2a,
				roughness: 0.8
			});
			var lanternGeo = getGeometry("box", [0.3, 0.4, 0.3]);
			var lanternMaterial = getMaterial("standard", {
				color: 0xffcc66,
				emissive: 0x442200,
				emissiveIntensity: 0.6,
				roughness: 0.4
			});

			var lampPostTransforms = [];
			var lanternTransforms = [];

			lampPostTransforms.push(
				{
					position: new THREE.Vector3(-1.8, 0.6, -14.2),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(1.8, 0.6, -14.2),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);
			lanternTransforms.push(
				{
					position: new THREE.Vector3(-1.8, 1.25, -14.2),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				},
				{
					position: new THREE.Vector3(1.8, 1.25, -14.2),
					scale: new THREE.Vector3(1, 1, 1),
					rotation: new THREE.Euler(0, 0, 0)
				}
			);

			lampPostTransforms.push({
				position: new THREE.Vector3(-8.5, 0.6, 2.8),
				scale: new THREE.Vector3(1, 1, 1),
				rotation: new THREE.Euler(0, 0, 0)
			});
			lanternTransforms.push({
				position: new THREE.Vector3(-8.5, 1.25, 2.8),
				scale: new THREE.Vector3(1, 1, 1),
				rotation: new THREE.Euler(0, 0, 0)
			});

			lampPostTransforms.push({
				position: new THREE.Vector3(8.5, 0.6, 2.8),
				scale: new THREE.Vector3(1, 1, 1),
				rotation: new THREE.Euler(0, 0, 0)
			});
			lanternTransforms.push({
				position: new THREE.Vector3(8.5, 1.25, 2.8),
				scale: new THREE.Vector3(1, 1, 1),
				rotation: new THREE.Euler(0, 0, 0)
			});

			if (lampPostTransforms.length > 0) {
				scene.add(
					createInstancedMesh(
						lampPostGeo,
						lampPostMaterial,
						lampPostTransforms
					)
				);
				scene.add(
					createInstancedMesh(
						lanternGeo,
						lanternMaterial,
						lanternTransforms
					)
				);
			}
		}

		addFencesAndLamps();
		addRiver();
		addRiversideVegetation();
		addDecorations(); // ← dekorasi baru: pasir, perahu, jembatan
		addHillsAndMountains();

		addBillboard();

		// Clouds
		var cloudTex = cloudTexture();
		var cloudMat = new THREE.SpriteMaterial({
			map: cloudTex,
			transparent: true,
			opacity: 0.5,
			depthWrite: false
		});
		[
			[-24, 20, -30, 9],
			[10, 24, -34, 11],
			[26, 18, -18, 7],
			[-8, 22, -40, 8]
		].forEach(function (c) {
			var cloud = new THREE.Sprite(cloudMat.clone());
			cloud.position.set(c[0], c[1], c[2]);
			cloud.scale.set(c[3], c[3] * 0.5, 1);
			scene.add(cloud);
		});

		// Particles
		var particleCount = 70;
		var particleGeo = new THREE.BufferGeometry();
		var positions = new Float32Array(particleCount * 3);
		for (var i = 0; i < particleCount; i++) {
			positions[i * 3] = (Math.random() - 0.5) * 44;
			positions[i * 3 + 1] = Math.random() * 8 + 0.5;
			positions[i * 3 + 2] = (Math.random() - 0.5) * 44;
		}
		particleGeo.setAttribute(
			"position",
			new THREE.BufferAttribute(positions, 3)
		);
		var particleMat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.05,
			transparent: true,
			opacity: 0.16,
			sizeAttenuation: true
		});
		var particles = new THREE.Points(particleGeo, particleMat);
		scene.add(particles);
		var particleBasePositions = positions.slice();

		LAYOUT.forEach(function (def) {
			buildings[def.id] = buildBuilding(def);
		});

		scene.userData.particles = particles;
		scene.userData.particleBase = particleBasePositions;

		window.addEventListener("resize", onResize);
	}

	// ---------------------------------------------------------
	// Textures
	// ---------------------------------------------------------
	function buildGrassTexture(baseHex) {
		var c = document.createElement("canvas");
		c.width = c.height = 256;
		var ctx = c.getContext("2d");
		var base = "#" + baseHex.toString(16).padStart(6, "0");
		ctx.fillStyle = base;
		ctx.fillRect(0, 0, 256, 256);
		ctx.globalAlpha = 0.12;
		for (var i = 0; i < 800; i++) {
			var r = 0x6f + Math.floor(Math.random() * 40 - 20);
			var g = 0x8f + Math.floor(Math.random() * 40 - 20);
			var b = 0x55 + Math.floor(Math.random() * 40 - 20);
			r = Math.max(0, Math.min(255, r));
			g = Math.max(0, Math.min(255, g));
			b = Math.max(0, Math.min(255, b));
			ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
			ctx.fillRect(
				Math.random() * 256,
				Math.random() * 256,
				2 + Math.random() * 2,
				2 + Math.random() * 2
			);
		}
		ctx.globalAlpha = 0.04;
		for (var j = 0; j < 400; j++) {
			ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
			ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
		}
		ctx.globalAlpha = 1;
		var tex = new THREE.CanvasTexture(c);
		tex.anisotropy = 4;
		return tex;
	}

	function fireTexture() {
		var size = 128;
		var c = document.createElement("canvas");
		c.width = c.height = size;
		var ctx = c.getContext("2d");
		var cx = size * 0.5;
		var cy = size * 0.62;

		ctx.globalCompositeOperation = "lighter";

		// Lapisan luar — merah-oranye, lebih pekat & lebih luas
		var gOuter = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.58);
		gOuter.addColorStop(0, "rgba(255,140,40,0.75)");
		gOuter.addColorStop(0.55, "rgba(255,80,20,0.55)");
		gOuter.addColorStop(1, "rgba(255,40,10,0)");
		ctx.fillStyle = gOuter;
		ctx.fillRect(0, 0, size, size);

		// Lapisan tengah — oranye pekat, meruncing ke atas
		var gMid = ctx.createRadialGradient(
			cx,
			cy * 0.85,
			0,
			cx,
			cy * 0.85,
			size * 0.4
		);
		gMid.addColorStop(0, "rgba(255,195,70,0.95)");
		gMid.addColorStop(0.55, "rgba(255,130,30,0.75)");
		gMid.addColorStop(1, "rgba(255,90,20,0)");
		ctx.fillStyle = gMid;
		ctx.fillRect(0, 0, size, size);

		// Inti putih-kuning terang & besar
		var gCore = ctx.createRadialGradient(
			cx,
			cy * 0.7,
			0,
			cx,
			cy * 0.7,
			size * 0.24
		);
		gCore.addColorStop(0, "rgba(255,255,235,1)");
		gCore.addColorStop(0.5, "rgba(255,230,150,0.9)");
		gCore.addColorStop(1, "rgba(255,180,80,0)");
		ctx.fillStyle = gCore;
		ctx.fillRect(0, 0, size, size);

		// Lidah api — noise agar siluet tidak bulat sempurna, lebih banyak & lebih besar
		for (var i = 0; i < 14; i++) {
			var ang = Math.random() * Math.PI * 2;
			var dist = size * 0.14 + Math.random() * size * 0.3;
			var lx = cx + Math.cos(ang) * dist * 0.65;
			var ly = cy * 0.82 + Math.sin(ang) * dist * 0.42 - dist * 0.28;
			var r = size * 0.06 + Math.random() * size * 0.1;
			var alpha = 0.16 + Math.random() * 0.24;
			var gLick = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
			gLick.addColorStop(0, "rgba(255,200,110," + alpha + ")");
			gLick.addColorStop(1, "rgba(255,110,40,0)");
			ctx.fillStyle = gLick;
			ctx.fillRect(0, 0, size, size);
		}

		ctx.globalCompositeOperation = "source-over";
		return new THREE.CanvasTexture(c);
	}
	var FIRE_TEX = null;
	function smokeTexture() {
		var size = 128;
		var c = document.createElement("canvas");
		c.width = c.height = size;
		var ctx = c.getContext("2d");
		var cx = size * 0.5,
			cy = size * 0.5;

		ctx.globalCompositeOperation = "lighter";

		var g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
		g1.addColorStop(0, "rgba(140,138,132,0.45)");
		g1.addColorStop(0.5, "rgba(100,98,92,0.28)");
		g1.addColorStop(1, "rgba(80,78,74,0)");
		ctx.fillStyle = g1;
		ctx.fillRect(0, 0, size, size);

		var g2 = ctx.createRadialGradient(
			cx * 0.9,
			cy * 0.85,
			0,
			cx * 0.9,
			cy * 0.85,
			size * 0.32
		);
		g2.addColorStop(0, "rgba(160,158,150,0.35)");
		g2.addColorStop(1, "rgba(120,118,112,0)");
		ctx.fillStyle = g2;
		ctx.fillRect(0, 0, size, size);

		ctx.globalCompositeOperation = "source-over";
		return new THREE.CanvasTexture(c);
	}
	var SMOKE_TEX = null;
	var EMBER_MATERIAL = null;
	function getEmberMaterial() {
		if (!EMBER_MATERIAL) {
			EMBER_MATERIAL = new THREE.PointsMaterial({
				color: 0xffb347,
				size: 0.08,
				transparent: true,
				opacity: 0.9,
				sizeAttenuation: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			});
		}
		return EMBER_MATERIAL;
	}

	// ============================================================
	// TEXTURE AIR SUNGAI (PROCEDURAL) — untuk material sungai
	// Menghasilkan pola riak lembut dengan variasi warna natural
	// ============================================================
	function createWaterTexture() {
		const size = 512;
		const c = document.createElement("canvas");
		c.width = c.height = size;
		const ctx = c.getContext("2d");

		// Warna dasar air (biru kehijauan alami)
		ctx.fillStyle = "#4a7a8c";
		ctx.fillRect(0, 0, size, size);

		// Tambahkan riak gelombang lembut
		for (let i = 0; i < 40; i++) {
			const x = Math.random() * size;
			const y = Math.random() * size;
			const radius = 30 + Math.random() * 120;
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
			gradient.addColorStop(0, "rgba(255,255,255,0.06)");
			gradient.addColorStop(0.5, "rgba(255,255,255,0.02)");
			gradient.addColorStop(1, "rgba(0,0,0,0.05)");
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fill();
		}

		// Tambahkan garis-garis halus menyerupai aliran
		ctx.strokeStyle = "rgba(255,255,255,0.04)";
		ctx.lineWidth = 1;
		for (let i = 0; i < 60; i++) {
			ctx.beginPath();
			const startX = Math.random() * size;
			const startY = Math.random() * size;
			const length = 50 + Math.random() * 150;
			const angle = Math.random() * Math.PI * 2;
			const endX = startX + Math.cos(angle) * length;
			const endY = startY + Math.sin(angle) * length;
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();
		}

		const tex = new THREE.CanvasTexture(c);
		tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set(4, 4);
		tex.anisotropy = 4;
		return tex;
	}

	function glowTexture() {
		var c = document.createElement("canvas");
		c.width = c.height = 128;
		var ctx = c.getContext("2d");
		var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
		g.addColorStop(0, "rgba(255,250,235,1)");
		g.addColorStop(0.35, "rgba(255,241,208,0.85)");
		g.addColorStop(0.7, "rgba(255,222,150,0.35)");
		g.addColorStop(1, "rgba(255,210,120,0)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 128, 128);
		return new THREE.CanvasTexture(c);
	}

	function beamTexture() {
		var c = document.createElement("canvas");
		c.width = 64;
		c.height = 128;
		var ctx = c.getContext("2d");
		var g = ctx.createLinearGradient(0, 0, 0, 128);
		g.addColorStop(0, "rgba(255,242,205,0.95)");
		g.addColorStop(0.35, "rgba(255,225,160,0.55)");
		g.addColorStop(0.7, "rgba(255,200,120,0.2)");
		g.addColorStop(1, "rgba(255,180,100,0)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 64, 128);
		return new THREE.CanvasTexture(c);
	}
	var BEAM_TEX = null;

	function cloudTexture() {
		var c = document.createElement("canvas");
		c.width = c.height = 128;
		var ctx = c.getContext("2d");
		function blob(x, y, r) {
			var g = ctx.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, "rgba(255,255,255,0.9)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}
		blob(50, 70, 34);
		blob(78, 60, 30);
		blob(96, 74, 24);
		blob(30, 78, 26);
		return new THREE.CanvasTexture(c);
	}

	// ---------------------------------------------------------
	// Jalan setapak (STEP 2A)
	// ---------------------------------------------------------
	function createPath(points, width, material) {
		var curve = new THREE.CatmullRomCurve3(points);
		var divisions = 50;
		var sampled = curve.getPoints(divisions);

		var vertices = [];
		var normals = [];
		var uvs = [];
		var indices = [];

		var up = new THREE.Vector3(0, 1, 0);
		var tangent = new THREE.Vector3();
		var right = new THREE.Vector3();

		for (var i = 0; i <= divisions; i++) {
			var t = i / divisions;
			var pos = sampled[i];
			tangent.copy(curve.getTangent(t)).normalize();
			right.crossVectors(tangent, up).normalize();

			var halfWidth = width / 2;
			var left = pos
				.clone()
				.add(right.clone().multiplyScalar(-halfWidth));
			var rightPos = pos
				.clone()
				.add(right.clone().multiplyScalar(halfWidth));

			vertices.push(left.x, left.y, left.z);
			vertices.push(rightPos.x, rightPos.y, rightPos.z);

			normals.push(0, 1, 0, 0, 1, 0);
			uvs.push(0, t, 1, t);
		}

		for (var i = 0; i < divisions; i++) {
			var a = i * 2;
			var b = i * 2 + 1;
			var c = (i + 1) * 2;
			var d = (i + 1) * 2 + 1;

			indices.push(a, b, c);
			indices.push(b, d, c);
		}

		var geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(vertices, 3)
		);
		geometry.setAttribute(
			"normal",
			new THREE.Float32BufferAttribute(normals, 3)
		);
		geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);

		var mesh = new THREE.Mesh(geometry, material);
		mesh.position.y = 0.02;
		mesh.receiveShadow = false;
		mesh.castShadow = false;
		return mesh;
	}

	// ============================================================
	// BUILD BUILDING
	// ============================================================
	function buildBuilding(def) {
		var group = new THREE.Group();
		group.position.set(def.pos[0], 0, def.pos[2]);
		scene.add(group);

		var wallMat = new THREE.MeshStandardMaterial({
			color: def.wallColor,
			roughness: 0.85,
			metalness: 0.05
		});
		var roofMat = new THREE.MeshStandardMaterial({
			color: def.roofColor,
			roughness: 0.7,
			metalness: 0.05
		});
		var glowMat = new THREE.MeshStandardMaterial({
			color: 0xffdca0,
			emissive: 0xffb347,
			emissiveIntensity: def.tradisi ? 0.9 : 0.5,
			roughness: 0.5,
			metalness: 0
		});

		var doorPos = new THREE.Vector3();

		if (def.tradisi) {
			// ========== BANGUNAN TRADISI (tidak diubah) ==========
			var foundationGeo = new THREE.BoxGeometry(
				def.w * 0.9,
				0.3,
				def.w * 0.75
			);
			var foundationMat = new THREE.MeshStandardMaterial({
				color: 0x8b7d6b,
				roughness: 0.9
			});
			var foundation = new THREE.Mesh(foundationGeo, foundationMat);
			foundation.position.y = 0.15;
			group.add(foundation);

			var wallPanelMat = new THREE.MeshStandardMaterial({
				color: 0xc49a6c,
				roughness: 0.8
			});
			var wallPanelGeo = new THREE.BoxGeometry(
				def.w * 0.7,
				def.h * 0.5,
				def.w * 0.05
			);
			var wallPanel = new THREE.Mesh(wallPanelGeo, wallPanelMat);
			wallPanel.position.set(0, 0.3 + def.h * 0.25, def.w * 0.2);
			group.add(wallPanel);

			var sidePanelGeo = new THREE.BoxGeometry(
				def.w * 0.05,
				def.h * 0.5,
				def.w * 0.6
			);
			var sidePanelLeft = new THREE.Mesh(sidePanelGeo, wallPanelMat);
			sidePanelLeft.position.set(-def.w * 0.35, 0.3 + def.h * 0.25, 0);
			group.add(sidePanelLeft);
			var sidePanelRight = new THREE.Mesh(sidePanelGeo, wallPanelMat);
			sidePanelRight.position.set(def.w * 0.35, 0.3 + def.h * 0.25, 0);
			group.add(sidePanelRight);

			var pillarMat = new THREE.MeshStandardMaterial({
				color: 0x8b5a2b,
				roughness: 0.7
			});
			var pillarPositions = [
				[-def.w * 0.4, 0, -def.w * 0.25],
				[def.w * 0.4, 0, -def.w * 0.25],
				[-def.w * 0.4, 0, def.w * 0.25],
				[def.w * 0.4, 0, def.w * 0.25],
				[-def.w * 0.15, 0, def.w * 0.35],
				[def.w * 0.15, 0, def.w * 0.35]
			];
			pillarPositions.forEach(function (pos) {
				var basePillar = new THREE.Mesh(
					new THREE.CylinderGeometry(0.18, 0.22, def.h * 0.4, 8),
					pillarMat
				);
				basePillar.position.set(pos[0], 0.3 + def.h * 0.2, pos[2]);
				group.add(basePillar);
				var topPillar = new THREE.Mesh(
					new THREE.CylinderGeometry(0.14, 0.18, def.h * 0.3, 8),
					pillarMat
				);
				topPillar.position.set(pos[0], 0.3 + def.h * 0.55, pos[2]);
				group.add(topPillar);
				var trimRing = new THREE.Mesh(
					new THREE.TorusGeometry(0.16, 0.03, 8, 12),
					pillarMat
				);
				trimRing.rotation.x = Math.PI / 2;
				trimRing.position.set(pos[0], 0.3 + def.h * 0.4, pos[2]);
				group.add(trimRing);
			});

			var terraceGeo = new THREE.BoxGeometry(
				def.w * 0.6,
				0.1,
				def.w * 0.4
			);
			var terraceMat = new THREE.MeshStandardMaterial({
				color: 0xb08d57,
				roughness: 0.9
			});
			var terrace = new THREE.Mesh(terraceGeo, terraceMat);
			terrace.position.set(0, 0.1, def.w * 0.45);
			group.add(terrace);

			var terracePillarGeo = new THREE.CylinderGeometry(
				0.08,
				0.1,
				def.h * 0.35,
				6
			);
			[-def.w * 0.2, def.w * 0.2].forEach(function (x) {
				var tp = new THREE.Mesh(terracePillarGeo, pillarMat);
				tp.position.set(x, 0.1 + def.h * 0.175, def.w * 0.55);
				group.add(tp);
			});

			var roofMatDark = new THREE.MeshStandardMaterial({
				color: 0xa0522d,
				roughness: 0.7
			});
			var roofLower = new THREE.Mesh(
				new THREE.ConeGeometry(def.w * 1.1, def.h * 0.45, 4),
				roofMatDark
			);
			roofLower.rotation.y = Math.PI / 4;
			roofLower.position.y = 0.3 + def.h * 0.75;
			group.add(roofLower);
			var roofUpper = new THREE.Mesh(
				new THREE.ConeGeometry(def.w * 0.75, def.h * 0.5, 4),
				roofMat
			);
			roofUpper.rotation.y = Math.PI / 4;
			roofUpper.position.y = 0.3 + def.h * 0.75 + def.h * 0.45;
			group.add(roofUpper);
			var roofFinial = new THREE.Mesh(
				new THREE.SphereGeometry(0.12, 8, 8),
				roofMatDark
			);
			roofFinial.position.y =
				0.3 + def.h * 0.75 + def.h * 0.45 + def.h * 0.25;
			group.add(roofFinial);

			var overhangGeo = new THREE.BoxGeometry(def.w * 1.2, 0.1, 0.2);
			var overhangMat = new THREE.MeshStandardMaterial({
				color: 0x8b5a2b,
				roughness: 0.7
			});
			var overhangFront = new THREE.Mesh(overhangGeo, overhangMat);
			overhangFront.position.set(
				0,
				0.3 + def.h * 0.75 - 0.05,
				def.w * 0.5
			);
			group.add(overhangFront);

			var doorFrameMat = new THREE.MeshStandardMaterial({
				color: 0x6b3e1b,
				roughness: 0.6
			});
			var frameThick = 0.08;
			var doorWidth = def.w * 0.3;
			var doorHeight = def.h * 0.4;
			var doorY = 0.3;
			var frameLeft = new THREE.Mesh(
				new THREE.BoxGeometry(frameThick, doorHeight, frameThick),
				doorFrameMat
			);
			frameLeft.position.set(
				-doorWidth / 2 - frameThick / 2,
				doorY + doorHeight / 2,
				def.w * 0.35
			);
			group.add(frameLeft);
			var frameRight = new THREE.Mesh(
				new THREE.BoxGeometry(frameThick, doorHeight, frameThick),
				doorFrameMat
			);
			frameRight.position.set(
				doorWidth / 2 + frameThick / 2,
				doorY + doorHeight / 2,
				def.w * 0.35
			);
			group.add(frameRight);
			var frameTop = new THREE.Mesh(
				new THREE.BoxGeometry(
					doorWidth + frameThick * 2,
					frameThick,
					frameThick
				),
				doorFrameMat
			);
			frameTop.position.set(
				0,
				doorY + doorHeight + frameThick / 2,
				def.w * 0.35
			);
			group.add(frameTop);
			var doorLeafMat = new THREE.MeshStandardMaterial({
				color: 0xa96f3f,
				roughness: 0.7
			});
			var doorLeaf = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth, doorHeight - 0.05, 0.05),
				doorLeafMat
			);
			doorLeaf.position.set(
				0,
				doorY + (doorHeight - 0.05) / 2,
				def.w * 0.35
			);
			group.add(doorLeaf);

			doorPos.set(0, doorY + doorHeight / 2, def.w * 0.35 + 0.2);

			var doorGlowGeo = new THREE.PlaneGeometry(
				doorWidth * 0.8,
				doorHeight * 0.8
			);
			var doorGlowMesh = new THREE.Mesh(doorGlowGeo, glowMat);
			doorGlowMesh.position.copy(doorPos);
			doorGlowMesh.position.z -= 0.1;
			group.add(doorGlowMesh);

			var windowMat = new THREE.MeshStandardMaterial({
				color: 0x87ceeb,
				roughness: 0.1,
				metalness: 0.3
			});
			var windowFrameMat = new THREE.MeshStandardMaterial({
				color: 0x6b3e1b,
				roughness: 0.6
			});
			var windowWidth = def.w * 0.18;
			var windowHeight = def.h * 0.2;
			[-def.w * 0.28, def.w * 0.28].forEach(function (x) {
				var wf = new THREE.Mesh(
					new THREE.BoxGeometry(windowWidth, windowHeight, 0.06),
					windowFrameMat
				);
				wf.position.set(x, doorY + doorHeight - 0.05, def.w * 0.2);
				group.add(wf);
				var wg = new THREE.Mesh(
					new THREE.BoxGeometry(
						windowWidth - 0.03,
						windowHeight - 0.03,
						0.02
					),
					windowMat
				);
				wg.position.set(
					x,
					doorY + doorHeight - 0.05,
					def.w * 0.2 + 0.02
				);
				group.add(wg);
			});

			var trimHorGeo = new THREE.BoxGeometry(def.w * 0.6, 0.06, 0.04);
			var trimHor = new THREE.Mesh(trimHorGeo, doorFrameMat);
			trimHor.position.set(0, 0.3 + def.h * 0.65, def.w * 0.2);
			group.add(trimHor);
		} else if (def.museum) {
			// ========== BANGUNAN SEJARAH (MUSEUM) — REDESIGN v9 ==========
			var stoneMat = new THREE.MeshStandardMaterial({
				color: 0xdcd0b4,
				roughness: 0.82
			});
			var trimMat = new THREE.MeshStandardMaterial({
				color: 0xc9bb95,
				roughness: 0.78
			});
			var darkWoodMat = new THREE.MeshStandardMaterial({
				color: 0x4a3524,
				roughness: 0.65
			});
			var museumWindowMat = new THREE.MeshStandardMaterial({
				color: 0x8fa8b5,
				roughness: 0.15,
				metalness: 0.25
			});
			var plazaMat = new THREE.MeshStandardMaterial({
				color: 0xcfc3a8,
				roughness: 0.95
			});

			var wingWidth = def.w * 0.62;
			var centerWidth = def.w * 0.62;
			var depth = def.w * 0.62;
			var baseHeight = 0.28;
			var wingHeight = def.h * 0.4;
			var centerHeight = def.h * 0.56;
			var entranceProtrude = 0.35;

			var frontZ = depth / 2;
			var entranceFront = frontZ + entranceProtrude;

			var plinth = new THREE.Mesh(
				new THREE.BoxGeometry(
					(wingWidth * 2 + centerWidth) * 1.03,
					baseHeight,
					depth * 1.03
				),
				stoneMat
			);
			plinth.position.y = baseHeight / 2;
			group.add(plinth);

			var plazaDepth = depth * 0.9;
			var plaza = new THREE.Mesh(
				new THREE.BoxGeometry(
					(wingWidth * 2 + centerWidth) * 1.15,
					0.05,
					plazaDepth
				),
				plazaMat
			);
			plaza.position.set(0, 0.025, entranceFront + plazaDepth / 2);
			group.add(plaza);

			var stairWidth = centerWidth * 0.75;
			var stairStepDepth = 0.28;
			var stairStepHeight = baseHeight / 4;
			for (var st = 0; st < 4; st++) {
				var stepMesh = new THREE.Mesh(
					new THREE.BoxGeometry(
						stairWidth - st * 0.1,
						stairStepHeight,
						stairStepDepth
					),
					stoneMat
				);
				stepMesh.position.set(
					0,
					stairStepHeight * (st + 0.5),
					entranceFront +
						stairStepDepth / 2 +
						(3 - st) * stairStepDepth
				);
				group.add(stepMesh);
			}

			[-1, 1].forEach(function (side) {
				var wingX = side * (centerWidth / 2 + wingWidth / 2);
				var wing = new THREE.Mesh(
					new THREE.BoxGeometry(wingWidth, wingHeight, depth),
					wallMat
				);
				wing.position.set(wingX, baseHeight + wingHeight / 2, 0);
				group.add(wing);

				var wingCornice = new THREE.Mesh(
					new THREE.BoxGeometry(wingWidth * 1.06, 0.1, depth * 1.06),
					roofMat
				);
				wingCornice.position.set(
					wingX,
					baseHeight + wingHeight + 0.05,
					0
				);
				group.add(wingCornice);

				var winW = wingWidth * 0.22;
				var winH = wingHeight * 0.6;
				var winY = baseHeight + wingHeight * 0.52;
				[-wingWidth * 0.22, wingWidth * 0.22].forEach(function (wx) {
					var wf = new THREE.Mesh(
						new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.08),
						trimMat
					);
					wf.position.set(wingX + wx, winY, frontZ - 0.02);
					group.add(wf);
					var wg = new THREE.Mesh(
						new THREE.BoxGeometry(winW, winH, 0.03),
						museumWindowMat
					);
					wg.position.set(wingX + wx, winY, frontZ);
					group.add(wg);
				});
			});

			var centerBlock = new THREE.Mesh(
				new THREE.BoxGeometry(
					centerWidth,
					centerHeight,
					depth + entranceProtrude
				),
				wallMat
			);
			centerBlock.position.set(
				0,
				baseHeight + centerHeight / 2,
				entranceProtrude / 2
			);
			group.add(centerBlock);

			var centerRoof = new THREE.Mesh(
				new THREE.BoxGeometry(
					centerWidth * 1.05,
					0.1,
					(depth + entranceProtrude) * 1.03
				),
				roofMat
			);
			centerRoof.position.set(
				0,
				baseHeight + centerHeight + 0.05,
				entranceProtrude / 2
			);
			group.add(centerRoof);

			var doorWidth = centerWidth * 0.32;
			var doorHeight = centerHeight * 0.55;
			var doorY = baseHeight;

			var doorFrame = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth + 0.24, doorHeight + 0.2, 0.14),
				stoneMat
			);
			doorFrame.position.set(
				0,
				doorY + (doorHeight + 0.2) / 2,
				entranceFront - 0.06
			);
			group.add(doorFrame);

			var doorLeaf = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth, doorHeight, 0.06),
				darkWoodMat
			);
			doorLeaf.position.set(
				0,
				doorY + doorHeight / 2,
				entranceFront + 0.02
			);
			group.add(doorLeaf);

			var doorGlass = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth * 0.7, doorHeight * 0.18, 0.04),
				museumWindowMat
			);
			doorGlass.position.set(
				0,
				doorY + doorHeight + 0.12,
				entranceFront - 0.04
			);
			group.add(doorGlass);

			doorPos.set(0, doorY + doorHeight / 2, entranceFront - 0.25);

			var doorGlowMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(doorWidth * 0.6, doorHeight * 0.6),
				glowMat
			);
			doorGlowMesh.position.set(
				0,
				doorY + doorHeight / 2,
				entranceFront - 0.09
			);
			doorGlowMesh.rotation.y = 0;
			group.add(doorGlowMesh);

			var colHeight = centerHeight * 0.72;
			[-1, 1].forEach(function (side) {
				var colX = side * (doorWidth / 2 + 0.32);
				var colBase = new THREE.Mesh(
					new THREE.CylinderGeometry(0.16, 0.19, 0.14, 10),
					trimMat
				);
				colBase.position.set(colX, doorY + 0.07, entranceFront - 0.12);
				group.add(colBase);
				var colShaft = new THREE.Mesh(
					new THREE.CylinderGeometry(0.1, 0.12, colHeight, 10),
					stoneMat
				);
				colShaft.position.set(
					colX,
					doorY + 0.14 + colHeight / 2,
					entranceFront - 0.12
				);
				group.add(colShaft);
				var colCap = new THREE.Mesh(
					new THREE.CylinderGeometry(0.15, 0.1, 0.12, 10),
					trimMat
				);
				colCap.position.set(
					colX,
					doorY + 0.14 + colHeight + 0.06,
					entranceFront - 0.12
				);
				group.add(colCap);
			});

			var pedimentWidth = centerWidth * 0.7;
			var pedimentHeight = 0.4;
			var pediment = new THREE.Mesh(
				new THREE.ConeGeometry(pedimentWidth / 2, pedimentHeight, 4),
				roofMat
			);
			pediment.rotation.y = Math.PI / 4;
			pediment.position.set(
				0,
				baseHeight + centerHeight + pedimentHeight / 2,
				entranceFront + 0.1
			);
			group.add(pediment);

			var plaque = new THREE.Mesh(
				new THREE.BoxGeometry(0.36, 0.22, 0.05),
				darkWoodMat
			);
			plaque.position.set(
				0,
				doorY + doorHeight + 0.3,
				entranceFront - 0.05
			);
			group.add(plaque);

			[-1, 1].forEach(function (side) {
				var artX = side * (centerWidth / 2 + 0.5);
				var pedestal = new THREE.Mesh(
					new THREE.CylinderGeometry(0.14, 0.17, 0.32, 8),
					stoneMat
				);
				pedestal.position.set(artX, 0.05 + 0.16, frontZ + 0.5);
				group.add(pedestal);
				var artifact = new THREE.Mesh(
					new THREE.SphereGeometry(0.13, 8, 8),
					trimMat
				);
				artifact.position.set(artX, 0.05 + 0.32 + 0.13, frontZ + 0.5);
				group.add(artifact);
			});
		} else if (def.id === "identitas") {
			// ========== BANGUNAN IDENTITAS (RUMAH TRADISIONAL) ==========
			var woodMat = new THREE.MeshStandardMaterial({
				color: 0x9c6b42,
				roughness: 0.85
			});
			var darkWoodMat = new THREE.MeshStandardMaterial({
				color: 0x5a3e2a,
				roughness: 0.75
			});
			var trimMat = new THREE.MeshStandardMaterial({
				color: 0xc9a87c,
				roughness: 0.8
			});
			var windowFrameMat = new THREE.MeshStandardMaterial({
				color: 0x5a3e2a,
				roughness: 0.7
			});
			var windowGlassMat = new THREE.MeshStandardMaterial({
				color: 0x9fb8c8,
				roughness: 0.1,
				metalness: 0.3
			});
			var roofTrimMat = new THREE.MeshStandardMaterial({
				color: 0x7a5c42,
				roughness: 0.8
			});

			var houseWidth = def.w * 0.9;
			var houseDepth = def.w * 0.7;
			var wallHeight = def.h * 0.5;
			var baseHeight = 0.2;
			var roofHeight = def.h * 0.55;
			var porchDepth = def.w * 0.3;

			var foundation = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth, baseHeight, houseDepth),
				trimMat
			);
			foundation.position.y = baseHeight / 2;
			group.add(foundation);

			var mainWall = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth, wallHeight, houseDepth),
				wallMat
			);
			mainWall.position.set(0, baseHeight + wallHeight / 2, 0);
			group.add(mainWall);

			var roof = new THREE.Mesh(
				new THREE.ConeGeometry(houseWidth * 0.85, roofHeight, 4),
				roofMat
			);
			roof.rotation.y = Math.PI / 4;
			roof.position.y = baseHeight + wallHeight + roofHeight / 2;
			group.add(roof);

			var overhangGeo = new THREE.BoxGeometry(
				houseWidth * 1.1,
				0.1,
				0.15
			);
			var overhang = new THREE.Mesh(overhangGeo, roofTrimMat);
			overhang.position.set(
				0,
				baseHeight + wallHeight - 0.05,
				houseDepth / 2
			);
			group.add(overhang);

			var porchFloor = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth * 0.7, 0.08, porchDepth),
				woodMat
			);
			porchFloor.position.set(
				0,
				baseHeight,
				houseDepth / 2 + porchDepth / 2
			);
			group.add(porchFloor);

			var porchRoof = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth * 0.8, 0.08, porchDepth * 0.9),
				roofMat
			);
			porchRoof.position.set(
				0,
				baseHeight + wallHeight * 0.75,
				houseDepth / 2 + porchDepth / 2
			);
			group.add(porchRoof);

			var porchPillarGeo = new THREE.CylinderGeometry(
				0.08,
				0.1,
				wallHeight * 0.75,
				6
			);
			var porchPillarMat = new THREE.MeshStandardMaterial({
				color: 0x8b5a2b,
				roughness: 0.8
			});
			[-houseWidth * 0.25, houseWidth * 0.25].forEach(function (x) {
				var pillar = new THREE.Mesh(porchPillarGeo, porchPillarMat);
				pillar.position.set(
					x,
					baseHeight + wallHeight * 0.375,
					houseDepth / 2 + porchDepth * 0.8
				);
				group.add(pillar);
			});

			var doorFrameMat = new THREE.MeshStandardMaterial({
				color: 0x5a3e2a,
				roughness: 0.7
			});
			var doorWidth = def.w * 0.28;
			var doorHeight = wallHeight * 0.75;
			var doorY = baseHeight;

			var frameLeft = new THREE.Mesh(
				new THREE.BoxGeometry(0.08, doorHeight, 0.08),
				doorFrameMat
			);
			frameLeft.position.set(
				-doorWidth / 2 - 0.04,
				doorY + doorHeight / 2,
				houseDepth / 2 + 0.02
			);
			group.add(frameLeft);
			var frameRight = new THREE.Mesh(
				new THREE.BoxGeometry(0.08, doorHeight, 0.08),
				doorFrameMat
			);
			frameRight.position.set(
				doorWidth / 2 + 0.04,
				doorY + doorHeight / 2,
				houseDepth / 2 + 0.02
			);
			group.add(frameRight);
			var frameTop = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth + 0.16, 0.08, 0.08),
				doorFrameMat
			);
			frameTop.position.set(
				0,
				doorY + doorHeight + 0.04,
				houseDepth / 2 + 0.02
			);
			group.add(frameTop);

			var doorLeaf = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth, doorHeight - 0.04, 0.05),
				darkWoodMat
			);
			doorLeaf.position.set(
				0,
				doorY + (doorHeight - 0.04) / 2,
				houseDepth / 2 + 0.02
			);
			group.add(doorLeaf);

			doorPos.set(0, doorY + doorHeight / 2, houseDepth / 2 + 0.2);

			var doorGlowGeo = new THREE.PlaneGeometry(
				doorWidth * 0.7,
				doorHeight * 0.7
			);
			var doorGlowMesh = new THREE.Mesh(doorGlowGeo, glowMat);
			doorGlowMesh.position.set(
				0,
				doorY + doorHeight / 2,
				houseDepth / 2 + 0.1
			);
			doorGlowMesh.rotation.y = Math.PI / 2;
			group.add(doorGlowMesh);

			var winW = def.w * 0.18;
			var winH = wallHeight * 0.45;
			var winY = baseHeight + wallHeight * 0.55;
			var winZ = houseDepth / 2;
			[-houseWidth * 0.32, houseWidth * 0.32].forEach(function (x) {
				var wf = new THREE.Mesh(
					new THREE.BoxGeometry(winW + 0.06, winH + 0.06, 0.08),
					windowFrameMat
				);
				wf.position.set(x, winY, winZ - 0.02);
				group.add(wf);
				var wg = new THREE.Mesh(
					new THREE.BoxGeometry(winW, winH, 0.03),
					windowGlassMat
				);
				wg.position.set(x, winY, winZ);
				group.add(wg);
				var wt = new THREE.Mesh(
					new THREE.BoxGeometry(winW + 0.1, 0.04, 0.08),
					trimMat
				);
				wt.position.set(x, winY - winH / 2 - 0.02, winZ);
				group.add(wt);
			});

			var topBeam = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth * 0.95, 0.08, 0.04),
				roofTrimMat
			);
			topBeam.position.set(
				0,
				baseHeight + wallHeight - 0.04,
				houseDepth / 2
			);
			group.add(topBeam);

			var carvingGeo = new THREE.BoxGeometry(0.22, 0.3, 0.04);
			var carvingMat = new THREE.MeshStandardMaterial({
				color: 0xb08d57,
				roughness: 0.7
			});
			[-doorWidth / 2 - 0.3, doorWidth / 2 + 0.3].forEach(function (x) {
				var carving = new THREE.Mesh(carvingGeo, carvingMat);
				carving.position.set(
					x,
					doorY + doorHeight * 0.6,
					houseDepth / 2 + 0.04
				);
				group.add(carving);
			});

			var fenceMat = new THREE.MeshStandardMaterial({
				color: 0x9c6b42,
				roughness: 0.8
			});
			var fencePostGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6);
			var fenceRailGeo = new THREE.BoxGeometry(
				houseWidth * 1.2,
				0.06,
				0.06
			);
			[-houseWidth * 0.6, houseWidth * 0.6].forEach(function (x) {
				var post = new THREE.Mesh(fencePostGeo, fenceMat);
				post.position.set(x, 0.25, houseDepth / 2 + porchDepth + 0.3);
				group.add(post);
			});
			var rail = new THREE.Mesh(fenceRailGeo, fenceMat);
			rail.position.set(0, 0.25, houseDepth / 2 + porchDepth + 0.3);
			group.add(rail);

			var potGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8);
			var potMat = new THREE.MeshStandardMaterial({
				color: 0x6b4e3a,
				roughness: 0.85
			});
			var leafGeo = new THREE.SphereGeometry(0.15, 8, 8);
			var leafMat = new THREE.MeshStandardMaterial({
				color: 0x6f9a55,
				roughness: 1
			});
			[-doorWidth / 2 - 0.4, doorWidth / 2 + 0.4].forEach(function (x) {
				var pot = new THREE.Mesh(potGeo, potMat);
				pot.position.set(x, 0.1, houseDepth / 2 + porchDepth + 0.15);
				group.add(pot);
				var leaves = new THREE.Mesh(leafGeo, leafMat);
				leaves.position.set(
					x,
					0.25,
					houseDepth / 2 + porchDepth + 0.15
				);
				group.add(leaves);
			});
		} else if (def.id === "nilai-sosial") {
			// ========== BANGUNAN NILAI SOSIAL (BALAI PERTEMUAN) ==========
			var woodMat = new THREE.MeshStandardMaterial({
				color: 0xa67b4e,
				roughness: 0.8
			});
			var darkWoodMat = new THREE.MeshStandardMaterial({
				color: 0x5a3e2a,
				roughness: 0.7
			});
			var trimMat = new THREE.MeshStandardMaterial({
				color: 0xb89564,
				roughness: 0.75
			});
			var stoneMat = new THREE.MeshStandardMaterial({
				color: 0x9e8b70,
				roughness: 0.9
			});
			var roofTrimMat = new THREE.MeshStandardMaterial({
				color: 0x6b4e3a,
				roughness: 0.8
			});

			def.roofColor = 0xa0522d;
			roofMat.color.set(def.roofColor);
			roofMat.roughness = 0.85;

			var hallWidth = def.w * 1.2;
			var hallDepth = def.w * 0.8;
			var wallHeight = def.h * 0.45;
			var baseHeight = 0.25;
			var roofHeight = def.h * 0.55;
			var porchDepth = hallDepth * 0.3;
			var totalDepth = hallDepth + porchDepth;

			var platform = new THREE.Mesh(
				new THREE.BoxGeometry(hallWidth, baseHeight, totalDepth),
				woodMat
			);
			platform.position.y = baseHeight / 2;
			group.add(platform);

			var backWall = new THREE.Mesh(
				new THREE.BoxGeometry(hallWidth, wallHeight, 0.15),
				wallMat
			);
			backWall.position.set(
				0,
				baseHeight + wallHeight / 2,
				-hallDepth / 2
			);
			group.add(backWall);

			var sideWallHeight = wallHeight * 0.6;
			var sideWallGeo = new THREE.BoxGeometry(
				0.12,
				sideWallHeight,
				hallDepth * 0.7
			);
			[-hallWidth / 2 + 0.06, hallWidth / 2 - 0.06].forEach(function (x) {
				var sideWall = new THREE.Mesh(sideWallGeo, wallMat);
				sideWall.position.set(
					x,
					baseHeight + sideWallHeight / 2,
					-hallDepth * 0.15
				);
				group.add(sideWall);
			});

			var roof = new THREE.Mesh(
				new THREE.ConeGeometry(hallWidth * 0.9, roofHeight, 4),
				roofMat
			);
			roof.rotation.y = Math.PI / 4;
			roof.position.y = baseHeight + wallHeight + roofHeight / 2;
			group.add(roof);

			var overhang = new THREE.Mesh(
				new THREE.BoxGeometry(hallWidth * 1.05, 0.12, 0.2),
				roofTrimMat
			);
			overhang.position.set(
				0,
				baseHeight + wallHeight - 0.06,
				hallDepth / 2 + 0.15
			);
			group.add(overhang);

			var pillarMat = new THREE.MeshStandardMaterial({
				color: 0x8b5a2b,
				roughness: 0.8
			});
			var pillarPositions = [
				[-hallWidth / 2 + 0.2, hallDepth / 2 + 0.1],
				[hallWidth / 2 - 0.2, hallDepth / 2 + 0.1],
				[-hallWidth / 6, hallDepth / 2 + 0.1],
				[hallWidth / 6, hallDepth / 2 + 0.1],
				[-hallWidth / 2 + 0.2, -hallDepth / 2 + 0.1],
				[hallWidth / 2 - 0.2, -hallDepth / 2 + 0.1]
			];
			pillarPositions.forEach(function (pos) {
				var pillar = new THREE.Mesh(
					new THREE.CylinderGeometry(0.1, 0.13, wallHeight + 0.2, 8),
					pillarMat
				);
				pillar.position.set(
					pos[0],
					baseHeight + wallHeight / 2,
					pos[1]
				);
				group.add(pillar);
			});

			var stairWidth = hallWidth * 0.5;
			var stairDepth = 0.3;
			var stairHeight = baseHeight / 3;
			for (var s = 0; s < 3; s++) {
				var step = new THREE.Mesh(
					new THREE.BoxGeometry(stairWidth, stairHeight, stairDepth),
					stoneMat
				);
				step.position.set(
					0,
					stairHeight * (s + 0.5),
					totalDepth / 2 + stairDepth / 2 + s * stairDepth
				);
				group.add(step);
			}

			var benchMat = new THREE.MeshStandardMaterial({
				color: 0x9c6b42,
				roughness: 0.8
			});
			var benchSeatGeo = new THREE.BoxGeometry(0.6, 0.08, 0.2);
			var benchLegGeo = new THREE.BoxGeometry(0.06, 0.3, 0.06);
			[-hallWidth / 2 + 0.4, hallWidth / 2 - 0.4].forEach(function (x) {
				var seat = new THREE.Mesh(benchSeatGeo, benchMat);
				seat.position.set(x, baseHeight + 0.4, hallDepth / 2 - 0.5);
				group.add(seat);
				[-0.2, 0.2].forEach(function (z) {
					var leg = new THREE.Mesh(benchLegGeo, benchMat);
					leg.position.set(
						x,
						baseHeight + 0.15,
						hallDepth / 2 - 0.5 + z
					);
					group.add(leg);
				});
			});

			var tableTop = new THREE.Mesh(
				new THREE.BoxGeometry(0.8, 0.08, 0.4),
				benchMat
			);
			tableTop.position.set(0, baseHeight + 0.45, 0);
			group.add(tableTop);
			var tableLegGeo = new THREE.BoxGeometry(0.06, 0.45, 0.06);
			[
				[-0.3, -0.15],
				[0.3, -0.15],
				[-0.3, 0.15],
				[0.3, 0.15]
			].forEach(function (pos) {
				var leg = new THREE.Mesh(tableLegGeo, benchMat);
				leg.position.set(pos[0], baseHeight + 0.225, pos[1]);
				group.add(leg);
			});

			var lampMat = new THREE.MeshStandardMaterial({
				color: 0xe8b35a,
				emissive: 0x442200,
				emissiveIntensity: 0.3
			});
			var lampShade = new THREE.Mesh(
				new THREE.CylinderGeometry(0.1, 0.14, 0.2, 8),
				lampMat
			);
			lampShade.position.set(0, baseHeight + wallHeight - 0.2, 0);
			group.add(lampShade);
			var ropeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
			var ropeMat = new THREE.MeshStandardMaterial({ color: 0x5a3e2a });
			var rope = new THREE.Mesh(ropeGeo, ropeMat);
			rope.position.set(0, baseHeight + wallHeight + 0.05, 0);
			group.add(rope);

			var potGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.25, 8);
			var potMat = new THREE.MeshStandardMaterial({
				color: 0x6b4e3a,
				roughness: 0.85
			});
			var leafGeo = new THREE.SphereGeometry(0.18, 8, 8);
			var leafMat = new THREE.MeshStandardMaterial({
				color: 0x6f9a55,
				roughness: 1
			});
			[-stairWidth / 2 - 0.3, stairWidth / 2 + 0.3].forEach(function (x) {
				var pot = new THREE.Mesh(potGeo, potMat);
				pot.position.set(x, 0.125, totalDepth / 2 + 0.6);
				group.add(pot);
				var leaves = new THREE.Mesh(leafGeo, leafMat);
				leaves.position.set(x, 0.3, totalDepth / 2 + 0.6);
				group.add(leaves);
			});

			var pathGeo = new THREE.BoxGeometry(stairWidth * 0.8, 0.02, 0.4);
			var pathMat = new THREE.MeshStandardMaterial({
				color: 0x9e8b70,
				roughness: 0.95
			});
			var path = new THREE.Mesh(pathGeo, pathMat);
			path.position.set(0, 0.01, totalDepth / 2 + stairDepth * 3 + 0.3);
			group.add(path);

			var bushGeo = new THREE.SphereGeometry(0.2, 8, 8);
			var bushMat = new THREE.MeshStandardMaterial({
				color: 0x5f8a4a,
				roughness: 1
			});
			var bushPositions = [
				[-hallWidth / 2 - 0.3, 0.15, -hallDepth / 2 + 0.2],
				[-hallWidth / 2 - 0.3, 0.15, 0],
				[hallWidth / 2 + 0.3, 0.15, -hallDepth / 2 + 0.2],
				[hallWidth / 2 + 0.3, 0.15, 0],
				[-hallWidth / 2 - 0.2, 0.12, hallDepth / 2 - 0.2],
				[hallWidth / 2 + 0.2, 0.12, hallDepth / 2 - 0.2]
			];
			bushPositions.forEach(function (pos) {
				var bush = new THREE.Mesh(bushGeo, bushMat);
				bush.position.set(pos[0], pos[1], pos[2]);
				bush.scale.set(1, 0.8, 1);
				group.add(bush);
			});

			var rockGeo = new THREE.DodecahedronGeometry(0.1, 0);
			var rockMat = new THREE.MeshStandardMaterial({
				color: 0x8a7a66,
				roughness: 0.9
			});
			for (var i = 0; i < 8; i++) {
				var rock = new THREE.Mesh(rockGeo, rockMat);
				var angle = (i / 8) * Math.PI * 2;
				var rx = Math.cos(angle) * (hallWidth / 2 + 0.8);
				var rz = Math.sin(angle) * (hallDepth / 2 + 0.8);
				rock.position.set(rx, 0.05, rz);
				rock.scale.set(
					0.8 + Math.random() * 0.4,
					0.5 + Math.random() * 0.3,
					0.8 + Math.random() * 0.4
				);
				group.add(rock);
			}

			var lampPostMat = new THREE.MeshStandardMaterial({
				color: 0x5a3e2a,
				roughness: 0.8
			});
			var lampPostGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6);
			var lampHeadGeo = new THREE.SphereGeometry(0.06, 8, 8);
			var lampHeadMat = new THREE.MeshStandardMaterial({
				color: 0xe8b35a,
				emissive: 0x442200,
				emissiveIntensity: 0.2
			});
			var lampPositions = [
				[-stairWidth / 2 - 0.5, totalDepth / 2 + stairDepth * 3 + 0.8],
				[stairWidth / 2 + 0.5, totalDepth / 2 + stairDepth * 3 + 0.8]
			];
			lampPositions.forEach(function (pos) {
				var post = new THREE.Mesh(lampPostGeo, lampPostMat);
				post.position.set(pos[0], 0.25, pos[1]);
				group.add(post);
				var lampHead = new THREE.Mesh(lampHeadGeo, lampHeadMat);
				lampHead.position.set(pos[0], 0.55, pos[1]);
				group.add(lampHead);
			});

			doorPos.set(0, baseHeight + wallHeight * 0.6, totalDepth / 2 + 0.2);

			var doorGlowGeo = new THREE.PlaneGeometry(0.1, 0.1);
			var doorGlowMesh = new THREE.Mesh(doorGlowGeo, glowMat);
			doorGlowMesh.position.set(
				0,
				baseHeight + wallHeight * 0.5,
				totalDepth / 2
			);
			doorGlowMesh.rotation.y = Math.PI / 2;
			group.add(doorGlowMesh);
		} else if (def.id === "kearifan-lokal") {
			// ============================================================
			// KEARIFAN LOKAL — MINIATURE RURAL ENVIRONMENT
			// ============================================================
			var woodMat = new THREE.MeshStandardMaterial({
				color: 0x8a5f3c,
				roughness: 0.85
			});
			var darkWoodMat = new THREE.MeshStandardMaterial({
				color: 0x4a3221,
				roughness: 0.78
			});
			var beamMat = new THREE.MeshStandardMaterial({
				color: 0x6b4a2e,
				roughness: 0.82
			});
			var stoneMat = new THREE.MeshStandardMaterial({
				color: 0x9b8a72,
				roughness: 0.92
			});
			var soilMat = new THREE.MeshStandardMaterial({
				color: 0x5a4a3a,
				roughness: 0.96
			});
			var mudMat = new THREE.MeshStandardMaterial({
				color: 0x6b5a48,
				roughness: 0.95
			});
			var waterMat = new THREE.MeshStandardMaterial({
				color: 0x5f8f8a,
				roughness: 0.15,
				metalness: 0.05,
				transparent: true,
				opacity: 0.88
			});
			var leafMat = new THREE.MeshStandardMaterial({
				color: 0x6f9a55,
				roughness: 1
			});
			var darkLeafMat = new THREE.MeshStandardMaterial({
				color: 0x5b8247,
				roughness: 1
			});
			var paddyMat = new THREE.MeshStandardMaterial({
				color: 0x86b84f,
				roughness: 0.8
			});
			var youngPaddyMat = new THREE.MeshStandardMaterial({
				color: 0xa4c96b,
				roughness: 0.8
			});
			var bambooMat = new THREE.MeshStandardMaterial({
				color: 0x8a9a5b,
				roughness: 0.85
			});
			var dryLeafMat = new THREE.MeshStandardMaterial({
				color: 0xc2a05c,
				roughness: 0.9
			});
			var roofTrimMat = new THREE.MeshStandardMaterial({
				color: 0x5e4330,
				roughness: 0.82
			});

			def.roofColor = 0xa0522d;
			roofMat.color.set(def.roofColor);
			roofMat.roughness = 0.85;

			var houseWidth = def.w * 1.05;
			var houseDepth = def.w * 0.72;
			var wallHeight = def.h * 0.48;
			var baseHeight = 0.42;
			var roofHeight = def.h * 0.62;
			var porchDepth = houseDepth * 0.32;
			var totalDepth = houseDepth + porchDepth;

			var houseOffsetX = -1.0;
			var houseOffsetZ = -0.6;

			var houseGroup = new THREE.Group();
			houseGroup.position.set(houseOffsetX, 0, houseOffsetZ);
			group.add(houseGroup);

			var housePlatform = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth + 1.2, 0.16, totalDepth + 1.6),
				mudMat
			);
			housePlatform.position.set(0, -0.04, porchDepth * 0.1);
			houseGroup.add(housePlatform);

			var foundationStoneGeo = new THREE.CylinderGeometry(
				0.2,
				0.22,
				0.35,
				7
			);
			var foundationStoneMat = new THREE.MeshStandardMaterial({
				color: 0x8d7c66,
				roughness: 0.9
			});

			var pillarPositions = [
				[-houseWidth / 2 + 0.2, -houseDepth / 2 + 0.2],
				[houseWidth / 2 - 0.2, -houseDepth / 2 + 0.2],
				[-houseWidth / 2 + 0.2, houseDepth / 2 - 0.2],
				[houseWidth / 2 - 0.2, houseDepth / 2 - 0.2],
				[-houseWidth / 2 + 0.2, houseDepth / 2 + porchDepth - 0.25],
				[houseWidth / 2 - 0.2, houseDepth / 2 + porchDepth - 0.25]
			];

			var pillarHeight = baseHeight + wallHeight - 0.1;
			var pillarMat = new THREE.MeshStandardMaterial({
				color: 0x7a4f2e,
				roughness: 0.82
			});

			pillarPositions.forEach(function (pos) {
				var stone = new THREE.Mesh(
					foundationStoneGeo,
					foundationStoneMat
				);
				stone.position.set(pos[0], 0.18, pos[1]);
				houseGroup.add(stone);

				var pillar = new THREE.Mesh(
					new THREE.CylinderGeometry(0.09, 0.11, pillarHeight, 8),
					pillarMat
				);
				pillar.position.set(pos[0], 0.35 + pillarHeight / 2, pos[1]);
				houseGroup.add(pillar);
			});

			var beamThick = 0.1;
			var beamFront = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth + 0.16, beamThick, beamThick),
				beamMat
			);
			beamFront.position.set(
				0,
				0.35 + pillarHeight + beamThick / 2,
				houseDepth / 2 + porchDepth - 0.25
			);
			houseGroup.add(beamFront);

			var beamBack = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth + 0.16, beamThick, beamThick),
				beamMat
			);
			beamBack.position.set(
				0,
				0.35 + pillarHeight + beamThick / 2,
				-houseDepth / 2 + 0.2
			);
			houseGroup.add(beamBack);

			var beamSideGeo = new THREE.BoxGeometry(
				beamThick,
				beamThick,
				houseDepth + porchDepth - 0.25
			);
			[-houseWidth / 2 + 0.2, houseWidth / 2 - 0.2].forEach(function (x) {
				var beamSide = new THREE.Mesh(beamSideGeo, beamMat);
				beamSide.position.set(
					x,
					0.35 + pillarHeight + beamThick / 2,
					0
				);
				houseGroup.add(beamSide);
			});

			var floorGeo = new THREE.BoxGeometry(
				houseWidth + 0.1,
				0.08,
				totalDepth
			);
			var floorMat = new THREE.MeshStandardMaterial({
				color: 0x9c6f48,
				roughness: 0.85
			});
			var floor = new THREE.Mesh(floorGeo, floorMat);
			floor.position.set(0, baseHeight, 0);
			houseGroup.add(floor);

			var backWall = new THREE.Mesh(
				new THREE.BoxGeometry(houseWidth, wallHeight, 0.1),
				wallMat
			);
			backWall.position.set(
				0,
				baseHeight + wallHeight / 2,
				-houseDepth / 2 + 0.05
			);
			houseGroup.add(backWall);

			var sideWallGeo = new THREE.BoxGeometry(
				0.1,
				wallHeight,
				houseDepth
			);
			[-houseWidth / 2 + 0.05, houseWidth / 2 - 0.05].forEach(
				function (x) {
					var sideWall = new THREE.Mesh(sideWallGeo, wallMat);
					sideWall.position.set(x, baseHeight + wallHeight / 2, 0);
					houseGroup.add(sideWall);
				}
			);

			var frontWallGeo = new THREE.BoxGeometry(
				houseWidth,
				wallHeight,
				0.1
			);
			var frontWall = new THREE.Mesh(frontWallGeo, wallMat);
			frontWall.position.set(
				0,
				baseHeight + wallHeight / 2,
				houseDepth / 2 - 0.05
			);
			houseGroup.add(frontWall);

			var doorFrameMat = new THREE.MeshStandardMaterial({
				color: 0x4a3221,
				roughness: 0.72
			});
			var doorWidth = houseWidth * 0.26;
			var doorHeight = wallHeight * 0.78;
			var doorY = baseHeight;
			var doorZ = houseDepth / 2 + 0.06;

			var frameThick = 0.06;
			var frameLeft = new THREE.Mesh(
				new THREE.BoxGeometry(frameThick, doorHeight, frameThick),
				doorFrameMat
			);
			frameLeft.position.set(
				-doorWidth / 2 - frameThick / 2,
				doorY + doorHeight / 2,
				doorZ
			);
			houseGroup.add(frameLeft);
			var frameRight = new THREE.Mesh(
				new THREE.BoxGeometry(frameThick, doorHeight, frameThick),
				doorFrameMat
			);
			frameRight.position.set(
				doorWidth / 2 + frameThick / 2,
				doorY + doorHeight / 2,
				doorZ
			);
			houseGroup.add(frameRight);
			var frameTop = new THREE.Mesh(
				new THREE.BoxGeometry(
					doorWidth + frameThick * 2,
					frameThick,
					frameThick
				),
				doorFrameMat
			);
			frameTop.position.set(
				0,
				doorY + doorHeight + frameThick / 2,
				doorZ
			);
			houseGroup.add(frameTop);

			var doorLeaf = new THREE.Mesh(
				new THREE.BoxGeometry(doorWidth, doorHeight - 0.04, 0.05),
				darkWoodMat
			);
			doorLeaf.position.set(0, doorY + (doorHeight - 0.04) / 2, doorZ);
			houseGroup.add(doorLeaf);

			doorPos.set(
				houseOffsetX,
				doorY + doorHeight / 2,
				houseOffsetZ + doorZ + 0.3
			);

			var doorGlowGeo = new THREE.PlaneGeometry(
				doorWidth * 0.72,
				doorHeight * 0.72
			);
			var doorGlowMesh = new THREE.Mesh(doorGlowGeo, glowMat);
			doorGlowMesh.position.set(
				houseOffsetX,
				doorY + doorHeight / 2,
				houseOffsetZ + doorZ + 0.08
			);
			doorGlowMesh.rotation.y = Math.PI / 2;
			houseGroup.add(doorGlowMesh);

			var windowFrameMat = new THREE.MeshStandardMaterial({
				color: 0x4a3221,
				roughness: 0.75
			});
			var windowGlassMat = new THREE.MeshStandardMaterial({
				color: 0x9fb8c8,
				roughness: 0.15,
				metalness: 0.2
			});
			var winW = houseWidth * 0.2;
			var winH = wallHeight * 0.5;
			var winY = baseHeight + wallHeight * 0.56;
			var winZ = houseDepth / 2 + 0.06;

			[-houseWidth * 0.3, houseWidth * 0.3].forEach(function (x) {
				var wf = new THREE.Mesh(
					new THREE.BoxGeometry(winW + 0.06, winH + 0.06, 0.06),
					windowFrameMat
				);
				wf.position.set(x, winY, winZ);
				houseGroup.add(wf);
				var wg = new THREE.Mesh(
					new THREE.BoxGeometry(winW, winH, 0.03),
					windowGlassMat
				);
				wg.position.set(x, winY, winZ + 0.02);
				houseGroup.add(wg);
				var barH = new THREE.Mesh(
					new THREE.BoxGeometry(0.02, winH - 0.04, 0.04),
					windowFrameMat
				);
				barH.position.set(x, winY, winZ + 0.03);
				houseGroup.add(barH);
				var barV = new THREE.Mesh(
					new THREE.BoxGeometry(winW - 0.04, 0.02, 0.04),
					windowFrameMat
				);
				barV.position.set(x, winY, winZ + 0.03);
				houseGroup.add(barV);
			});

			var terraceFloor = new THREE.Mesh(
				new THREE.BoxGeometry(
					houseWidth * 0.85,
					0.06,
					porchDepth * 0.9
				),
				woodMat
			);
			terraceFloor.position.set(
				0,
				baseHeight,
				houseDepth / 2 + porchDepth * 0.45
			);
			houseGroup.add(terraceFloor);

			var railMat = new THREE.MeshStandardMaterial({
				color: 0x7a4f2e,
				roughness: 0.8
			});
			var railHeight = 0.25;
			var railTopGeo = new THREE.BoxGeometry(
				houseWidth * 0.8,
				0.04,
				0.04
			);
			var railTop = new THREE.Mesh(railTopGeo, railMat);
			railTop.position.set(
				0,
				baseHeight + railHeight,
				houseDepth / 2 + porchDepth * 0.85
			);
			houseGroup.add(railTop);

			[
				-houseWidth * 0.35,
				-houseWidth * 0.15,
				houseWidth * 0.15,
				houseWidth * 0.35
			].forEach(function (x) {
				var railPost = new THREE.Mesh(
					new THREE.CylinderGeometry(0.03, 0.035, railHeight, 6),
					railMat
				);
				railPost.position.set(
					x,
					baseHeight + railHeight / 2,
					houseDepth / 2 + porchDepth * 0.85
				);
				houseGroup.add(railPost);
			});

			var stairWidthTop = doorWidth * 1.2;
			var stairWidthBottom = doorWidth * 1.8;
			var stairDepth = 0.32;
			var stairCount = 3;
			var stairTotalDepth = stairDepth * stairCount;

			for (var s = 0; s < stairCount; s++) {
				var t = (s + 1) / stairCount;
				var stepWidth =
					stairWidthTop + (stairWidthBottom - stairWidthTop) * t;
				var stepHeight = baseHeight / stairCount;

				var step = new THREE.Mesh(
					new THREE.BoxGeometry(stepWidth, stepHeight, stairDepth),
					woodMat
				);
				var stepZ =
					houseDepth / 2 + porchDepth * 0.7 + stairDepth * (s + 0.5);
				var stepY = (s + 0.5) * stepHeight;
				step.position.set(0, stepY, stepZ);
				houseGroup.add(step);
			}

			var roofMain = new THREE.Mesh(
				new THREE.ConeGeometry(houseWidth * 0.95, roofHeight, 4),
				roofMat
			);
			roofMain.rotation.y = Math.PI / 4;
			roofMain.position.y = baseHeight + wallHeight + roofHeight / 2;
			houseGroup.add(roofMain);

			var overhangGeo = new THREE.BoxGeometry(
				houseWidth * 1.12,
				0.09,
				0.16
			);
			var overhangFront = new THREE.Mesh(overhangGeo, roofTrimMat);
			overhangFront.position.set(
				0,
				baseHeight + wallHeight - 0.04,
				houseDepth / 2 + porchDepth * 0.6
			);
			houseGroup.add(overhangFront);

			var overhangBack = new THREE.Mesh(overhangGeo, roofTrimMat);
			overhangBack.position.set(
				0,
				baseHeight + wallHeight - 0.04,
				-houseDepth / 2 - 0.1
			);
			houseGroup.add(overhangBack);

			var overhangSideGeo = new THREE.BoxGeometry(
				0.16,
				0.09,
				houseDepth + porchDepth * 0.6
			);
			[-houseWidth / 2, houseWidth / 2].forEach(function (x) {
				var overhangSide = new THREE.Mesh(overhangSideGeo, roofTrimMat);
				overhangSide.position.set(x, baseHeight + wallHeight - 0.04, 0);
				houseGroup.add(overhangSide);
			});

			// ============================================================
			// SAWAH — DENGAN INSTANCING UNTUK PADI
			// ============================================================
			var sawahGroup = new THREE.Group();
			sawahGroup.position.set(houseOffsetX - 2.2, 0, houseOffsetZ - 1.1);
			group.add(sawahGroup);

			var paddyFields = [
				{ x: 0, z: 0, w: 1.6, d: 2.0 },
				{ x: 1.5, z: 0.2, w: 1.4, d: 1.8 },
				{ x: 2.9, z: 0.5, w: 1.3, d: 1.5 },
				{ x: -1.3, z: 1.5, w: 1.3, d: 1.4 },
				{ x: 1.2, z: 1.9, w: 1.5, d: 1.6 },
				{ x: -0.2, z: 2.7, w: 1.8, d: 1.7 }
			];

			var ridgeMat = new THREE.MeshStandardMaterial({
				color: 0x6f5a42,
				roughness: 0.92
			});

			var paddyTransformsMat = [];
			var paddyTransformsYoung = [];

			paddyFields.forEach(function (field, fi) {
				var fieldGroup = new THREE.Group();
				fieldGroup.position.set(field.x, 0, field.z);
				sawahGroup.add(fieldGroup);

				var water = new THREE.Mesh(
					new THREE.BoxGeometry(field.w, 0.04, field.d),
					waterMat
				);
				water.position.y = 0.04;
				fieldGroup.add(water);

				var mud = new THREE.Mesh(
					new THREE.BoxGeometry(field.w, 0.03, field.d),
					mudMat
				);
				mud.position.y = 0.015;
				fieldGroup.add(mud);

				var ridgeThick = 0.12;
				var ridgeFront = new THREE.Mesh(
					new THREE.BoxGeometry(
						field.w + ridgeThick,
						0.12,
						ridgeThick
					),
					ridgeMat
				);
				ridgeFront.position.set(0, 0.06, field.d / 2 + ridgeThick / 2);
				fieldGroup.add(ridgeFront);
				var ridgeBack = new THREE.Mesh(
					new THREE.BoxGeometry(
						field.w + ridgeThick,
						0.12,
						ridgeThick
					),
					ridgeMat
				);
				ridgeBack.position.set(0, 0.06, -field.d / 2 - ridgeThick / 2);
				fieldGroup.add(ridgeBack);
				var ridgeLeft = new THREE.Mesh(
					new THREE.BoxGeometry(ridgeThick, 0.12, field.d),
					ridgeMat
				);
				ridgeLeft.position.set(-field.w / 2 - ridgeThick / 2, 0.06, 0);
				fieldGroup.add(ridgeLeft);
				var ridgeRight = new THREE.Mesh(
					new THREE.BoxGeometry(ridgeThick, 0.12, field.d),
					ridgeMat
				);
				ridgeRight.position.set(field.w / 2 + ridgeThick / 2, 0.06, 0);
				fieldGroup.add(ridgeRight);

				var rows = Math.max(3, Math.floor(field.d / 0.5));
				var cols = Math.max(3, Math.floor(field.w / 0.45));
				for (var r = 0; r < rows; r++) {
					for (var c = 0; c < cols; c++) {
						var px = (c / (cols - 1) - 0.5) * (field.w - 0.3);
						var pz = (r / (rows - 1) - 0.5) * (field.d - 0.3);
						px += (Math.random() - 0.5) * 0.08;
						pz += (Math.random() - 0.5) * 0.08;

						var paddyHeight = 0.22 + Math.random() * 0.12;
						var paddyTransform = {
							position: new THREE.Vector3(
								px,
								0.05 + paddyHeight / 2,
								pz
							),
							scale: new THREE.Vector3(1, paddyHeight, 1)
						};
						if (fi % 2 === 0) {
							paddyTransformsMat.push(paddyTransform);
						} else {
							paddyTransformsYoung.push(paddyTransform);
						}
					}
				}
			});

			var paddyGeometry = getGeometry("cylinder", [
				0.015,
				0.025,
				1,
				5,
				1,
				false
			]);
			var paddyMatInstance = getMaterial("standard", {
				color: 0x86b84f,
				roughness: 0.8
			});
			var youngPaddyMatInstance = getMaterial("standard", {
				color: 0xa4c96b,
				roughness: 0.8
			});

			if (paddyTransformsMat.length > 0) {
				var paddyInstanced = createInstancedMesh(
					paddyGeometry,
					paddyMatInstance,
					paddyTransformsMat
				);
				sawahGroup.add(paddyInstanced);
			}
			if (paddyTransformsYoung.length > 0) {
				var youngPaddyInstanced = createInstancedMesh(
					paddyGeometry,
					youngPaddyMatInstance,
					paddyTransformsYoung
				);
				sawahGroup.add(youngPaddyInstanced);
			}

			// ============================================================
			// KEBUN — DENGAN INSTANCING UNTUK TANAMAN
			// ============================================================
			var gardenGroup = new THREE.Group();
			gardenGroup.position.set(houseOffsetX + 2.4, 0, houseOffsetZ + 0.9);
			group.add(gardenGroup);

			var bedGroup = new THREE.Group();
			bedGroup.position.set(0, 0, 0);
			gardenGroup.add(bedGroup);

			var bedGeo = new THREE.BoxGeometry(1.3, 0.12, 1.0);
			var bed = new THREE.Mesh(bedGeo, soilMat);
			bed.position.y = 0.06;
			bedGroup.add(bed);

			var plantTransforms0 = [];
			var plantTransforms1 = [];
			var plantTransforms2 = [];

			var rows = 4;
			var cols = 5;
			for (var r = 0; r < rows; r++) {
				for (var c = 0; c < cols; c++) {
					var gx = (c / (cols - 1) - 0.5) * 1.1;
					var gz = (r / (rows - 1) - 0.5) * 0.8;
					var plantType = (r + c) % 3;
					if (plantType === 0) {
						plantTransforms0.push({
							position: new THREE.Vector3(gx, 0.18, gz),
							scale: new THREE.Vector3(0.8, 0.7, 0.8)
						});
					} else if (plantType === 1) {
						plantTransforms1.push({
							position: new THREE.Vector3(gx, 0.18, gz),
							scale: new THREE.Vector3(1, 1, 1)
						});
					} else {
						plantTransforms2.push({
							position: new THREE.Vector3(gx, 0.18, gz),
							scale: new THREE.Vector3(1, 1, 1)
						});
					}
				}
			}

			var plantGeom0 = getGeometry("sphere", [0.07, 6, 6]);
			var plantMat0 = getMaterial("standard", {
				color: 0x6f9a55,
				roughness: 1
			});
			if (plantTransforms0.length > 0) {
				bedGroup.add(
					createInstancedMesh(plantGeom0, plantMat0, plantTransforms0)
				);
			}
			var plantGeom1 = getGeometry("cylinder", [
				0.02,
				0.03,
				0.18,
				5,
				1,
				false
			]);
			var plantMat1 = getMaterial("standard", {
				color: 0x5b8247,
				roughness: 1
			});
			if (plantTransforms1.length > 0) {
				bedGroup.add(
					createInstancedMesh(plantGeom1, plantMat1, plantTransforms1)
				);
			}
			var plantGeom2 = getGeometry("cone", [0.06, 0.14, 5]);
			var plantMat2 = getMaterial("standard", {
				color: 0x86b84f,
				roughness: 0.8
			});
			if (plantTransforms2.length > 0) {
				bedGroup.add(
					createInstancedMesh(plantGeom2, plantMat2, plantTransforms2)
				);
			}

			var fenceBambooTransforms = [];
			var fencePositions = [
				[-0.9, -0.7],
				[0.9, -0.7],
				[0.9, 0.7],
				[-0.9, 0.7]
			];
			fencePositions.forEach(function (fp) {
				fenceBambooTransforms.push({
					position: new THREE.Vector3(fp[0], 0.15, fp[1]),
					scale: new THREE.Vector3(1, 1, 1)
				});
			});
			var fenceBambooGeometry = getGeometry("cylinder", [
				0.02,
				0.025,
				0.3,
				5,
				1,
				false
			]);
			var fenceBambooMaterial = getMaterial("standard", {
				color: 0x8a9a5b,
				roughness: 0.85
			});
			bedGroup.add(
				createInstancedMesh(
					fenceBambooGeometry,
					fenceBambooMaterial,
					fenceBambooTransforms
				)
			);

			var fenceRailGeo = new THREE.BoxGeometry(1.7, 0.03, 0.03);
			var rail1 = new THREE.Mesh(fenceRailGeo, fenceBambooMaterial);
			rail1.position.set(0, 0.12, -0.7);
			bedGroup.add(rail1);
			var rail2 = new THREE.Mesh(fenceRailGeo, fenceBambooMaterial);
			rail2.position.set(0, 0.12, 0.7);
			bedGroup.add(rail2);
			var fenceRailSideGeo = new THREE.BoxGeometry(0.03, 0.03, 1.4);
			var rail3 = new THREE.Mesh(fenceRailSideGeo, fenceBambooMaterial);
			rail3.position.set(-0.9, 0.12, 0);
			bedGroup.add(rail3);
			var rail4 = new THREE.Mesh(fenceRailSideGeo, fenceBambooMaterial);
			rail4.position.set(0.9, 0.12, 0);
			bedGroup.add(rail4);

			// ============================================================
			// LUMBUNG / GUDANG KECIL
			// ============================================================
			var shedGroup = new THREE.Group();
			shedGroup.position.set(houseOffsetX + 2.6, 0, houseOffsetZ - 0.8);
			group.add(shedGroup);

			var shedBaseHeight = 0.35;
			var shedPlatform = new THREE.Mesh(
				new THREE.BoxGeometry(0.9, shedBaseHeight, 0.7),
				woodMat
			);
			shedPlatform.position.y = shedBaseHeight / 2;
			shedGroup.add(shedPlatform);

			[-0.35, 0.35].forEach(function (x) {
				[-0.25, 0.25].forEach(function (z) {
					var post = new THREE.Mesh(
						new THREE.CylinderGeometry(
							0.05,
							0.06,
							shedBaseHeight,
							6
						),
						darkWoodMat
					);
					post.position.set(x, shedBaseHeight / 2, z);
					shedGroup.add(post);
				});
			});

			var shedWallMat = new THREE.MeshStandardMaterial({
				color: 0x9c6f48,
				roughness: 0.85
			});
			var shedWall = new THREE.Mesh(
				new THREE.BoxGeometry(0.85, 0.5, 0.65),
				shedWallMat
			);
			shedWall.position.set(0, shedBaseHeight + 0.25, 0);
			shedGroup.add(shedWall);

			var shedRoof = new THREE.Mesh(
				new THREE.ConeGeometry(0.7, 0.45, 4),
				roofMat
			);
			shedRoof.rotation.y = Math.PI / 4;
			shedRoof.position.set(0, shedBaseHeight + 0.5 + 0.22, 0);
			shedGroup.add(shedRoof);

			var shedDoor = new THREE.Mesh(
				new THREE.BoxGeometry(0.25, 0.3, 0.04),
				darkWoodMat
			);
			shedDoor.position.set(0, shedBaseHeight + 0.15, 0.33);
			shedGroup.add(shedDoor);

			var sackMat = new THREE.MeshStandardMaterial({
				color: 0xc2a05c,
				roughness: 0.9
			});
			var sack1 = new THREE.Mesh(
				new THREE.SphereGeometry(0.14, 6, 6),
				sackMat
			);
			sack1.position.set(0.25, 0.1, 0.45);
			sack1.scale.set(0.8, 0.6, 0.8);
			shedGroup.add(sack1);
			var sack2 = new THREE.Mesh(
				new THREE.SphereGeometry(0.12, 6, 6),
				sackMat
			);
			sack2.position.set(-0.2, 0.09, 0.5);
			sack2.scale.set(0.8, 0.6, 0.8);
			shedGroup.add(sack2);

			// ============================================================
			// JALAN SETAPAK ORGANIK
			// ============================================================
			var pathGroup = new THREE.Group();
			pathGroup.position.set(0, 0, 0);
			group.add(pathGroup);

			var pathStoneGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.03, 6);
			var pathStoneMat = new THREE.MeshStandardMaterial({
				color: 0x9e8b70,
				roughness: 0.95
			});

			var pathPoints = [
				[
					houseOffsetX,
					houseOffsetZ + totalDepth / 2 + stairTotalDepth + 0.3
				],
				[
					houseOffsetX + 0.25,
					houseOffsetZ + totalDepth / 2 + stairTotalDepth + 0.8
				],
				[
					houseOffsetX + 0.55,
					houseOffsetZ + totalDepth / 2 + stairTotalDepth + 1.25
				],
				[
					houseOffsetX + 0.95,
					houseOffsetZ + totalDepth / 2 + stairTotalDepth + 1.6
				],
				[
					houseOffsetX + 1.45,
					houseOffsetZ + totalDepth / 2 + stairTotalDepth + 1.85
				]
			];

			pathPoints.forEach(function (pt, idx) {
				var stone = new THREE.Mesh(pathStoneGeo, pathStoneMat);
				stone.position.set(pt[0], 0.02, pt[1]);
				stone.rotation.x = Math.PI / 2;
				stone.scale.set(1 + (idx % 2) * 0.3, 1, 0.8 + (idx % 3) * 0.15);
				pathGroup.add(stone);
			});

			var pathToShed = [
				[houseOffsetX + 1.8, houseOffsetZ + totalDepth / 2 + 2.0],
				[houseOffsetX + 2.2, houseOffsetZ + totalDepth / 2 + 1.6],
				[houseOffsetX + 2.5, houseOffsetZ + totalDepth / 2 + 1.2],
				[houseOffsetX + 2.65, houseOffsetZ + totalDepth / 2 + 0.7]
			];
			pathToShed.forEach(function (pt, idx) {
				var stone = new THREE.Mesh(pathStoneGeo, pathStoneMat);
				stone.position.set(pt[0], 0.02, pt[1]);
				stone.rotation.x = Math.PI / 2;
				stone.scale.set(1, 1, 0.9);
				pathGroup.add(stone);
			});

			// ============================================================
			// VEGETASI PENDUKUNG — DENGAN INSTANCING
			// ============================================================
			var vegGroup = new THREE.Group();
			group.add(vegGroup);

			var bushTransforms = [];
			var bushPositions = [
				[houseOffsetX - 1.5, 0.1, houseOffsetZ - 0.8],
				[houseOffsetX - 1.8, 0.1, houseOffsetZ + 0.3],
				[houseOffsetX + 1.7, 0.1, houseOffsetZ - 1.0],
				[houseOffsetX + 1.2, 0.1, houseOffsetZ + 1.4]
			];
			bushPositions.forEach(function (bp) {
				bushTransforms.push({
					position: new THREE.Vector3(bp[0], bp[1], bp[2]),
					scale: new THREE.Vector3(1, 0.7, 1)
				});
			});
			var bushGeometry = getGeometry("sphere", [0.2, 8, 8]);
			var bushMaterial = getMaterial("standard", {
				color: 0x5f8a4a,
				roughness: 1
			});
			vegGroup.add(
				createInstancedMesh(bushGeometry, bushMaterial, bushTransforms)
			);

			var treePositions = [
				[houseOffsetX - 3.0, houseOffsetZ - 1.5],
				[houseOffsetX + 3.0, houseOffsetZ - 1.6]
			];
			treePositions.forEach(function (tp) {
				var trunk = new THREE.Mesh(
					new THREE.CylinderGeometry(0.05, 0.08, 0.9, 6),
					new THREE.MeshStandardMaterial({
						color: 0x5b4530,
						roughness: 1
					})
				);
				trunk.position.set(tp[0], 0.45, tp[1]);
				vegGroup.add(trunk);
				var leaves = new THREE.Mesh(
					new THREE.SphereGeometry(0.35, 8, 8),
					leafMat
				);
				leaves.position.set(tp[0], 0.95, tp[1]);
				vegGroup.add(leaves);
			});

			var grassTransforms = [];
			for (var i = 0; i < 20; i++) {
				var gx = (Math.random() - 0.5) * 4.5;
				var gz = (Math.random() - 0.5) * 4.5;
				if (Math.abs(gx) > 2.5 && Math.abs(gz) > 2.5) continue;
				grassTransforms.push({
					position: new THREE.Vector3(
						houseOffsetX + gx,
						0.05,
						houseOffsetZ + gz
					),
					scale: new THREE.Vector3(1, 1, 1)
				});
			}
			var grassGeometry = getGeometry("cone", [0.03, 0.1, 4]);
			var grassMaterial = getMaterial("standard", {
				color: 0x6f9a55,
				roughness: 1
			});
			vegGroup.add(
				createInstancedMesh(
					grassGeometry,
					grassMaterial,
					grassTransforms
				)
			);
		} else {
			// ========== BANGUNAN LAIN (fallback) ==========
			var base = new THREE.Mesh(
				new THREE.BoxGeometry(def.w, def.h * 0.62, def.w * 0.82),
				wallMat
			);
			base.position.y = (def.h * 0.62) / 2;
			group.add(base);

			var roofH = def.h * 0.5;
			var roof = new THREE.Mesh(
				new THREE.ConeGeometry(def.w * 0.78, roofH, 4),
				roofMat
			);
			roof.rotation.y = Math.PI / 4;
			roof.position.y = base.position.y + (def.h * 0.62) / 2 + roofH / 2;
			group.add(roof);

			doorPos.set(0, def.h * 0.18, def.w * 0.42);
			var doorGlow = new THREE.Mesh(
				new THREE.PlaneGeometry(def.w * 0.28, def.h * 0.28),
				glowMat
			);
			doorGlow.position.copy(doorPos);
			group.add(doorGlow);

			var pillarCount = 0;
			for (var i = 0; i < pillarCount; i++) {
				var side = i % 2 === 0 ? -1 : 1;
				var idx = Math.floor(i / 2);
				var pillar = new THREE.Mesh(
					new THREE.CylinderGeometry(0.16, 0.16, def.h * 0.62, 10),
					wallMat
				);
				pillar.position.set(
					side * (def.w * 0.46),
					(def.h * 0.62) / 2,
					def.w * 0.4 - idx * (def.w * 0.4)
				);
				group.add(pillar);
			}

			if (def.open) {
				var canopy = new THREE.Mesh(
					new THREE.CylinderGeometry(
						def.w * 0.55,
						def.w * 0.6,
						0.12,
						4
					),
					roofMat
				);
				canopy.rotation.y = Math.PI / 4;
				canopy.position.set(0, def.h * 0.62 + 0.4, def.w * 0.9);
				group.add(canopy);
			}

			if (def.saung) {
				[
					[-2.4, 0, -1.4],
					[2.6, 0, -1.8]
				].forEach(function (p) {
					var trunk = new THREE.Mesh(
						new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6),
						new THREE.MeshStandardMaterial({ color: 0x5b4530 })
					);
					trunk.position.set(p[0], 0.45, p[2]);
					var leaves = new THREE.Mesh(
						new THREE.SphereGeometry(0.55, 8, 8),
						new THREE.MeshStandardMaterial({
							color: 0x6fa062,
							roughness: 1
						})
					);
					leaves.position.set(p[0], 1.05, p[2]);
					group.add(trunk);
					group.add(leaves);
				});
			}
		}

		var light = new THREE.PointLight(
			0xffb347,
			def.tradisi ? 0.9 : 0.45,
			def.w * 5,
			2
		);
		light.position.set(0, def.h * 0.4, 0);
		group.add(light);

		var connLine = null;
		if (!def.tradisi) {
			var lineMat = new THREE.LineBasicMaterial({
				color: 0xf5c542,
				transparent: true,
				opacity: 0.4
			});
			var lineGeo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(
					LAYOUT[0].pos[0] - def.pos[0],
					0.15,
					LAYOUT[0].pos[2] - def.pos[2]
				),
				new THREE.Vector3(0, 0.15, 0)
			]);
			connLine = new THREE.Line(lineGeo, lineMat);
			group.add(connLine);
		}

		return {
			id: def.id,
			def: def,
			group: group,
			wallMat: wallMat,
			roofMat: roofMat,
			glowMat: glowMat,
			glowBaseIntensity: def.tradisi ? 0.9 : 0.5,
			light: light,
			lightBaseIntensity: light.intensity,
			connLine: connLine,
			fireGroup: null,
			smokeGroup: null,
			doorPos: doorPos,
			origWallColor: new THREE.Color(def.wallColor),
			origRoofColor: new THREE.Color(def.roofColor),
			burn: null,
			state: "alive"
		};
	}

	// ---------------------------------------------------------
	// Resize
	// ---------------------------------------------------------
	function onResize() {
		if (!initialized) return;
		var w = canvasWrap.clientWidth || window.innerWidth;
		var h = canvasWrap.clientHeight || window.innerHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	// ---------------------------------------------------------
	// Easing helpers
	// ---------------------------------------------------------
	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}
	function easeInCubic(t) {
		return t * t * t;
	}
	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}
	function clamp01(v) {
		return Math.max(0, Math.min(1, v));
	}
	function envelope(t, riseStart, riseEnd, fallStart, fallEnd) {
		if (t <= riseStart) return 0;
		if (t < riseEnd)
			return smoothstep((t - riseStart) / (riseEnd - riseStart));
		if (t <= fallStart) return 1;
		if (t < fallEnd)
			return 1 - smoothstep((t - fallStart) / (fallEnd - fallStart));
		return 0;
	}
	function smoothstep(x) {
		x = clamp01(x);
		return x * x * (3 - 2 * x);
	}

	// ---------------------------------------------------------
	// Camera tween
	// ---------------------------------------------------------
	function moveCameraTo(toPos, toLook, duration, onDone) {
		camTween = {
			fromPos: camera.position.clone(),
			toPos: toPos.clone(),
			fromLook: camLookCurrent.clone(),
			toLook: toLook.clone(),
			t0: clock.elapsedTime,
			dur: duration / 1000,
			onDone: onDone || null
		};
	}

	function updateCameraTween() {
		if (!camTween) return;
		var t = (clock.elapsedTime - camTween.t0) / camTween.dur;
		if (t >= 1) t = 1;
		var e = easeInOutCubic(t);
		camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
		camLookCurrent.lerpVectors(camTween.fromLook, camTween.toLook, e);
		camera.lookAt(camLookCurrent);
		if (t >= 1) {
			var cb = camTween.onDone;
			camTween = null;
			if (cb) cb();
		}
	}

	function focusPositionFor(def) {
		var dirX = def.pos[0] === 0 ? 0.4 : def.pos[0] > 0 ? 0.55 : -0.55;
		return {
			pos: new THREE.Vector3(def.pos[0] + dirX * 6, 5.5, def.pos[2] + 9),
			look: new THREE.Vector3(def.pos[0], def.h * 0.4, def.pos[2])
		};
	}

	// ---------------------------------------------------------
	// Panel positioning
	// ---------------------------------------------------------
	var panelAnchorId = null;
	function updatePanelPosition() {
		if (!panelAnchorId || !buildings[panelAnchorId]) return;
		var b = buildings[panelAnchorId];
		var worldPos = new THREE.Vector3(
			b.def.pos[0],
			b.def.h * 0.6,
			b.def.pos[2]
		);
		var v = worldPos.clone().project(camera);
		var w = canvasWrap.clientWidth,
			h = canvasWrap.clientHeight;
		var x = (v.x * 0.5 + 0.5) * w;
		var y = (-v.y * 0.5 + 0.5) * h;
		var px = Math.min(Math.max(x + 26, 12), w - 300);
		var py = Math.min(Math.max(y - 90, 12), h - 220);
		panelEl.style.left = px + "px";
		panelEl.style.top = py + "px";
	}

	// ---------------------------------------------------------
	// UI helpers
	// ---------------------------------------------------------
	function setNodeActive(id) {
		Object.keys(nodeButtons).forEach(function (key) {
			nodeButtons[key].classList.toggle("is-active", key === id);
		});
	}
	function setNodeLost(id) {
		if (nodeButtons[id]) {
			nodeButtons[id].classList.remove("is-active");
			nodeButtons[id].classList.add("is-lost");
			nodeButtons[id].disabled = true;
		}
	}
	function showPanel(id) {
		var c = CONTENT[id];
		panelEyebrow.textContent = "Slide 7";
		panelTitle.textContent = c.title;
		panelText.textContent = c.text;
		panelAnchorId = id;
		panelEl.classList.remove("is-leaving");
		void panelEl.offsetWidth;
		panelEl.classList.add("is-visible");
	}
	function hidePanel() {
		panelEl.classList.add("is-leaving");
		timers.push(
			setTimeout(function () {
				panelEl.classList.remove("is-visible", "is-leaving");
				panelAnchorId = null;
			}, 450)
		);
	}

	function clearTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}

	// ---------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------
	function selectBuilding(id) {
		if (
			phase === "traveling" ||
			phase === "releasing" ||
			phase === "finalizing" ||
			phase === "done"
		)
			return;
		var b = buildings[id];
		if (!b || b.state !== "alive") return;

		if (activeBuilding === id) {
			releaseBuilding(id, null);
			return;
		}

		var current = activeBuilding ? buildings[activeBuilding] : null;
		if (current && current.state === "alive") {
			releaseBuilding(activeBuilding, id);
		} else {
			focusBuilding(id);
		}
	}

	function focusBuilding(id) {
		var b = buildings[id];
		if (!b || b.state !== "alive") return;

		phase = "traveling";
		slide.classList.add("is-focused");
		activeBuilding = id;
		setNodeActive(id);

		var f = focusPositionFor(b.def);
		moveCameraTo(f.pos, f.look, 1500, function () {
			phase = "focused";
			showPanel(id);
		});
	}

	function returnToOverview(onDone) {
		if (panelAnchorId) {
			panelEl.classList.remove("is-visible");
			panelEl.classList.add("is-leaving");
			panelAnchorId = null;
		}
		moveCameraTo(OVERVIEW_POS, OVERVIEW_LOOK, 1600, function () {
			slide.classList.remove("is-focused");
			if (onDone) onDone();
		});
	}

	// ---------------------------------------------------------
	// Burn sequence
	// ---------------------------------------------------------
	function releaseBuilding(id, nextId) {
		var b = buildings[id];
		if (!b || b.state !== "alive") return;

		phase = "releasing";
		b.state = "burning";
		b.burn = { start: clock.elapsedTime, duration: BURN_DURATION };
		spawnFire(b);
		spawnSmoke(b);
		spawnEmbers(b);
		hidePanel();
		setNodeActive(null);
		activeBuilding = null;

		timers.push(
			setTimeout(
				function () {
					b.state = "dead";
					finishBurnVisuals(b);
					setNodeLost(id);
					deadCount++;

					if (deadCount >= ORDER.length) {
						phase = "traveling";
						returnToOverview(function () {
							phase = "overview";
							startFinalSequence();
						});
						return;
					}

					if (nextId) {
						focusBuilding(nextId);
					} else {
						phase = "overview";
					}
				},
				BURN_DURATION * 1000 + 200
			)
		);
	}

	function spawnFire(b) {
		if (!FIRE_TEX) FIRE_TEX = fireTexture();
		var group = new THREE.Group();
		group.renderOrder = 2; // di atas asap agar tidak tertutup
		var count = 24 + Math.floor(Math.random() * 6); // 24–29

		// Warna: inti putih-kuning -> tepi oranye-merah
		var CORE_COLOR = 0xfff2c0;
		var MID_COLOR = 0xff9a3d;
		var EDGE_COLOR = 0xff5522;

		for (var i = 0; i < count; i++) {
			// Kategori: 0 = api utama besar, 1 = sedang, 2 = lidah kecil
			var roll = Math.random();
			var category = roll < 0.35 ? 0 : roll < 0.7 ? 1 : 2;

			var color =
				category === 0
					? CORE_COLOR
					: category === 1
						? MID_COLOR
						: EDGE_COLOR;
			var baseOpacity =
				category === 0 ? 0.95 : category === 1 ? 0.85 : 0.7;

			var mat = new THREE.SpriteMaterial({
				map: FIRE_TEX,
				color: color,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			});
			var s = new THREE.Sprite(mat);
			s.renderOrder = 2;

			// Ukuran jauh lebih besar dari sebelumnya (0.7–1.3 -> 2.5–4.5+)
			s.userData.baseScale =
				category === 0
					? 3.4 + Math.random() * 1.4 // 3.4–4.8 (api utama)
					: category === 1
						? 2.5 + Math.random() * 1.2 // 2.5–3.7 (sedang)
						: 1.4 + Math.random() * 1.1; // 1.4–2.5 (lidah kecil)

			s.userData.baseOpacity = baseOpacity;
			s.userData.category = category;
			s.userData.phase = Math.random() * Math.PI * 2;
			s.userData.speed = 3 + Math.random() * 4.5; // flicker lebih cepat
			s.userData.riseDelay = Math.random() * 0.35;
			s.userData.rotSpeed = (Math.random() - 0.5) * 1.8;
			s.userData.baseRot = Math.random() * Math.PI * 2;
			s.material.rotation = s.userData.baseRot;

			// Sebaran posisi: dinding, sudut, dan atap — bukan cuma dasar
			var spreadX = (Math.random() - 0.5) * b.def.w * 1.1;
			var spreadZ = (Math.random() - 0.5) * b.def.w * 0.7;
			// sebagian sprite ditempatkan lebih tinggi (area atap)
			var isRoofFlame = Math.random() < 0.35;
			var baseY = isRoofFlame
				? b.def.h * (0.55 + Math.random() * 0.35)
				: 0.15 + Math.random() * 0.35;

			s.userData.offsetX = spreadX;
			s.userData.offsetZ = spreadZ;
			s.userData.baseY = baseY;
			s.userData.riseAmount = isRoofFlame
				? 0.4
				: 0.9 + Math.random() * 0.6;

			s.position.set(spreadX, baseY, spreadZ);
			s.scale.set(0.01, 0.01, 1);
			group.add(s);
		}
		b.group.add(group);
		b.fireGroup = group;
		b.light.color.set(0xff7a33);
	}

	function spawnSmoke(b) {
		if (!SMOKE_TEX) SMOKE_TEX = smokeTexture();
		var group = new THREE.Group();
		group.renderOrder = 1;
		var count = 5 + Math.floor(Math.random() * 3); // 5–7
		for (var i = 0; i < count; i++) {
			var mat = new THREE.SpriteMaterial({
				map: SMOKE_TEX,
				color: 0x9a958c,
				transparent: true,
				opacity: 0,
				depthWrite: false
			});
			var s = new THREE.Sprite(mat);
			s.userData.baseY = b.def.h * 0.5 + i * 0.35;
			s.userData.baseX = (Math.random() - 0.5) * b.def.w * 0.3;
			s.userData.baseZ = (Math.random() - 0.5) * b.def.w * 0.2;
			s.userData.riseSpeed = 0.45 + Math.random() * 0.35;
			s.userData.startDelay = 0.2 + i * 0.13;
			s.userData.baseScale = 1.6 + i * 0.55;
			s.userData.swaySpeedX = 0.4 + Math.random() * 0.5;
			s.userData.swaySpeedZ = 0.3 + Math.random() * 0.4;
			s.userData.swayAmpX = 0.6 + Math.random() * 0.8;
			s.userData.swayAmpZ = 0.4 + Math.random() * 0.6;
			s.userData.phase = Math.random() * Math.PI * 2;
			s.position.set(
				s.userData.baseX,
				s.userData.baseY,
				s.userData.baseZ
			);
			s.scale.set(0.01, 0.01, 1);
			group.add(s);
		}
		b.group.add(group);
		b.smokeGroup = group;
	}
	function spawnEmbers(b) {
		var count = 30 + Math.floor(Math.random() * 16); // 30–45
		var positions = new Float32Array(count * 3);
		var seeds = [];
		for (var i = 0; i < count; i++) {
			var ox = (Math.random() - 0.5) * b.def.w * 0.7;
			var oz = (Math.random() - 0.5) * b.def.w * 0.5;
			var oy = 0.1 + Math.random() * 0.3;
			positions[i * 3] = ox;
			positions[i * 3 + 1] = oy;
			positions[i * 3 + 2] = oz;
			seeds.push({
				baseX: ox,
				baseZ: oz,
				baseY: oy,
				speed: 0.4 + Math.random() * 0.6,
				phase: Math.random() * Math.PI * 2,
				maxHeight: b.def.h * (0.9 + Math.random() * 0.8),
				delay: Math.random() * 0.5
			});
		}
		var geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		var mat = getEmberMaterial().clone(); // clone agar opacity per-bangunan independen
		var points = new THREE.Points(geo, mat);
		points.userData.seeds = seeds;
		b.group.add(points);
		b.emberPoints = points;
	}

	function updateBurnVisuals(b) {
		if (!b.burn) return;
		var t = clamp01((clock.elapsedTime - b.burn.start) / b.burn.duration);
		var time = clock.elapsedTime;

		var fireEnv = envelope(t, 0, 0.1, 0.72, 1.0);
		if (b.fireGroup) {
			b.fireGroup.children.forEach(function (s) {
				var localT = clamp01(t - s.userData.riseDelay * 0.3);
				var localEnv = envelope(localT, 0, 0.14, 0.74, 1.0);

				// Flicker lebih hidup: noise cepat + amplitudo besar
				var flick =
					0.7 +
					Math.sin(time * s.userData.speed + s.userData.phase) * 0.3 +
					Math.random() * 0.3;
				flick = Math.max(0.35, flick);

				var scale =
					s.userData.baseScale *
					localEnv *
					flick *
					(0.65 + fireEnv * 0.55);

				// Elongasi vertikal agar terlihat menjilat ke atas
				s.scale.set(scale, scale * 1.5, 1);

				// Naik perlahan seiring waktu (lidah api menjilat ke atas)
				var rise =
					localT * s.userData.riseAmount +
					Math.sin(time * 1.6 + s.userData.phase) * 0.05;
				s.position.y = s.userData.baseY + rise;
				s.position.x =
					s.userData.offsetX +
					Math.sin(time * 1.1 + s.userData.phase) * 0.06;
				s.position.z =
					s.userData.offsetZ +
					Math.cos(time * 1.3 + s.userData.phase) * 0.06;

				s.material.opacity =
					s.userData.baseOpacity * localEnv * (0.85 + flick * 0.15);
				s.material.rotation =
					s.userData.baseRot + time * s.userData.rotSpeed;
			});
		}

		var smokeEnv = envelope(t, 0.3, 0.55, 0.85, 1.0);
		if (b.smokeGroup) {
			b.smokeGroup.children.forEach(function (s) {
				var localT = clamp01(t - s.userData.startDelay);
				var localEnv = envelope(localT, 0, 0.3, 0.8, 1.0);
				var rise = localT * s.userData.riseSpeed * 3;
				s.position.y = s.userData.baseY + rise;
				var swayX =
					Math.sin(time * s.userData.swaySpeedX + s.userData.phase) *
					s.userData.swayAmpX;
				var swayZ =
					Math.cos(
						time * s.userData.swaySpeedZ + s.userData.phase * 1.3
					) * s.userData.swayAmpZ;
				s.position.x = s.userData.baseX + swayX * localT;
				s.position.z = s.userData.baseZ + swayZ * localT;
				var scale = s.userData.baseScale * (0.4 + localT * 1.1);
				s.scale.set(scale, scale, 1);
				s.material.opacity = 0.5 * localEnv * (1 - localT * 0.4);
			});
		}

		// Update embers
		if (b.emberPoints) {
			var pos = b.emberPoints.geometry.attributes.position.array;
			var seeds = b.emberPoints.userData.seeds;
			var emberEnv = envelope(t, 0.05, 0.2, 0.75, 1.0);
			for (var i = 0; i < seeds.length; i++) {
				var seed = seeds[i];
				var localT = clamp01(t - seed.delay * 0.2);
				var height = Math.min(
					localT * seed.speed * b.def.h * 1.3,
					seed.maxHeight
				);
				pos[i * 3] =
					seed.baseX + Math.sin(time * 1.5 + seed.phase) * 0.15;
				pos[i * 3 + 1] = seed.baseY + height;
				pos[i * 3 + 2] =
					seed.baseZ + Math.cos(time * 1.2 + seed.phase) * 0.15;
			}
			b.emberPoints.geometry.attributes.position.needsUpdate = true;
			var flicker = 0.5 + Math.random() * 0.5; // kerdip acak
			b.emberPoints.material.opacity = emberEnv * flicker;
		}

		// Flicker cahaya dramatis (noise cepat + acak, tidak pernah negatif)
		var noise =
			Math.sin(time * 20 + b.def.pos[0]) * 0.5 + Math.random() * 0.5;
		noise = Math.max(0, noise);
		var flickerIntensity =
			fireEnv * (b.def.tradisi ? 0 : 2.1) * (0.6 + noise * 0.6);
		b.light.userData.target = Math.max(0, flickerIntensity);

		// Charring bertahap dengan noise halus per-bangunan
		if (b.charNoiseSeed === undefined)
			b.charNoiseSeed = Math.random() * 1000;
		var charK = smoothstep((t - 0.32) / 0.55);
		var charNoise = 0.85 + Math.sin(b.charNoiseSeed + t * 6) * 0.15;
		var charKFinal = clamp01(charK * charNoise);
		b.wallMat.color.copy(b.origWallColor).lerp(CHARRED_COLOR, charKFinal);
		b.roofMat.color.copy(b.origRoofColor).lerp(CHARRED_COLOR, charKFinal);
		b.glowMat.emissiveIntensity = b.glowBaseIntensity * (1 - charKFinal);

		if (b.connLine) {
			b.connLine.userData.target = 0.4 * (1 - charKFinal);
		}
	}

	function finishBurnVisuals(b) {
		if (b.fireGroup) {
			b.group.remove(b.fireGroup);
			b.fireGroup.children.forEach(function (s) {
				s.material.dispose();
			});
			b.fireGroup = null;
		}
		if (b.smokeGroup) {
			b.group.remove(b.smokeGroup);
			b.smokeGroup.children.forEach(function (s) {
				s.material.dispose();
			});
			b.smokeGroup = null;
		}
		if (b.emberPoints) {
			b.group.remove(b.emberPoints);
			b.emberPoints.geometry.dispose();
			b.emberPoints.material.dispose();
			b.emberPoints = null;
		}
		b.wallMat.color.copy(CHARRED_COLOR);
		b.roofMat.color.copy(CHARRED_COLOR);
		b.glowMat.emissiveIntensity = 0;
		b.light.userData.target = 0;
		if (b.connLine) b.connLine.userData.target = 0;
		b.burn = null;
		b.charNoiseSeed = undefined;
	}

	// ---------------------------------------------------------
	// FINAL SEQUENCE (dimodifikasi untuk transisi ke Slide 8)
	// ---------------------------------------------------------
	function ensureFinalGlow() {
		if (finalGlow) return finalGlow;

		var trad = buildings["tradisi"];
		var glowGroup = new THREE.Group();
		trad.group.add(glowGroup);

		if (!BEAM_TEX) BEAM_TEX = beamTexture();
		var beamMat = new THREE.MeshBasicMaterial({
			map: BEAM_TEX,
			color: 0xffe8b0,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide
		});
		var beamGeo = new THREE.CylinderGeometry(0.25, 4.5, 25, 20, 1, true);
		var beam = new THREE.Mesh(beamGeo, beamMat);
		beam.position.copy(trad.doorPos);
		beam.rotation.x = Math.PI / 2;
		glowGroup.add(beam);

		var sprites = [];
		var spriteCount = 7;
		for (var i = 0; i < spriteCount; i++) {
			var tex = glowTexture();
			var mat = new THREE.SpriteMaterial({
				map: tex,
				color: 0xfff1d0,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			});
			var sprite = new THREE.Sprite(mat);
			sprite.position.copy(trad.doorPos);
			sprite.scale.set(0.1, 0.1, 1);
			sprite.userData.distFactor = i / (spriteCount - 1);
			sprite.userData.index = i;
			glowGroup.add(sprite);
			sprites.push(sprite);
		}

		var mainTex = glowTexture();
		var mainMat = new THREE.SpriteMaterial({
			map: mainTex,
			color: 0xfff8e8,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});
		var mainGlow = new THREE.Sprite(mainMat);
		mainGlow.position.copy(trad.doorPos);
		mainGlow.scale.set(0.1, 0.1, 1);
		glowGroup.add(mainGlow);

		finalGlow = {
			group: glowGroup,
			beam: beam,
			beamMat: beamMat,
			beamGeo: beamGeo,
			sprites: sprites,
			mainGlow: mainGlow,
			mainGlowMat: mainMat,
			start: null
		};

		return finalGlow;
	}

	function startFinalSequence() {
		if (phase === "finalizing" || phase === "done") return;
		phase = "finalizing";
		document.body.classList.add("slide7-lock"); // kunci input

		var glow = ensureFinalGlow();
		glow.start = clock.elapsedTime;

		// Reset glow seperti sebelumnya
		glow.beamMat.opacity = 0;
		glow.beam.scale.set(1, 1, 1);
		glow.sprites.forEach(function (s) {
			s.material.opacity = 0;
			s.scale.set(0.1, 0.1, 1);
		});
		glow.mainGlowMat.opacity = 0;
		glow.mainGlow.scale.set(0.1, 0.1, 1);

		// Intensifkan cahaya tradisi sesaat
		timers.push(
			setTimeout(function () {
				var trad = buildings["tradisi"];
				trad.light.userData.target = 4.5;
				trad.glowMat.emissiveIntensity = 1.8;
				Object.keys(buildings).forEach(function (key) {
					var b = buildings[key];
					if (b.connLine) b.connLine.userData.target = 0.55;
				});
			}, 800)
		);

		// Mulai whiteout
		timers.push(
			setTimeout(function () {
				slide.classList.add("is-whiteout");
			}, 3800)
		);

		// Setelah whiteout selesai (t=6.6 detik), jalankan reflection sequence
		var reflectionStart = 6600; // 3.8 + 2.8 detik (durasi whiteout dari CSS)
		var reflection1Text =
			"Jika masyarakat menganggap tradisi sebagai sesuatu yang kuno dan harus ditinggalkan, maka dapat terjadi seperti contoh tadi";
		var reflection2Text =
			"Akibatnya, masyarakat mungkin maju dalam teknologi, tetapi kehilangan sebagian dari jati dirinya.";

		// Buat elemen reflection 1
		var refl1 = document.createElement("div");
		refl1.className = "s7-reflection";
		refl1.innerHTML =
			'<span class="s7-reflection__text">' + reflection1Text + "</span>";
		slide.appendChild(refl1);

		// Buat elemen reflection 2 (tersembunyi dulu)
		var refl2 = document.createElement("div");
		refl2.className = "s7-reflection";
		refl2.innerHTML =
			'<span class="s7-reflection__text">' + reflection2Text + "</span>";
		slide.appendChild(refl2);

		// Jadwalkan reflection 1
		timers.push(
			setTimeout(function () {
				refl1.classList.add("is-visible");
			}, reflectionStart)
		);

		// Fade-out reflection 1 lalu tampilkan reflection 2
		var fadeOut1 = reflectionStart + 700 + 3200; // fade-in 700ms, tahan 3.2 detik
		timers.push(
			setTimeout(function () {
				refl1.classList.remove("is-visible");
				refl1.classList.add("is-hidden");
			}, fadeOut1)
		);

		var showRefl2 = fadeOut1 + 700; // setelah fade-out selesai
		timers.push(
			setTimeout(function () {
				refl2.classList.add("is-visible");
			}, showRefl2)
		);

		var fadeOut2 = showRefl2 + 700 + 3200;
		timers.push(
			setTimeout(function () {
				refl2.classList.remove("is-visible");
				refl2.classList.add("is-hidden");
			}, fadeOut2)
		);

		// Setelah reflection 2 selesai, pindah ke slide berikutnya
		var goNext = fadeOut2 + 700; // setelah fade-out selesai
		timers.push(
			setTimeout(function () {
				phase = "done";
				document.body.classList.remove("slide7-lock");
				// Hapus elemen reflection agar tidak mengganggu reset
				if (refl1.parentNode) refl1.parentNode.removeChild(refl1);
				if (refl2.parentNode) refl2.parentNode.removeChild(refl2);

				if (!finalTriggered) {
					finalTriggered = true;
					if (typeof window.__goToSlide === "function") {
						var idx = getCurrentSlideIndex();
						if (idx !== -1) window.__goToSlide(idx + 1);
					}
				}
			}, goNext)
		);
	}

	function updateFinalGlow() {
		if (!finalGlow || finalGlow.start === null) return;
		var t = clamp01(
			(clock.elapsedTime - finalGlow.start) / FINAL_GLOW_DURATION
		);

		var trad = buildings["tradisi"];

		var doorLocal = trad.doorPos.clone();
		var camLocal = trad.group.worldToLocal(camera.position.clone());

		var dirToCam = new THREE.Vector3().subVectors(camLocal, doorLocal);
		var distToCam = dirToCam.length();
		dirToCam.normalize();

		var dirToDoor = new THREE.Vector3()
			.subVectors(doorLocal, camLocal)
			.normalize();

		finalGlow.beam.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			dirToDoor
		);
		finalGlow.beam.position
			.copy(doorLocal)
			.add(dirToCam.clone().multiplyScalar(12.5));

		var beamEnv = envelope(t, 0.03, 0.18, 0.55, 0.82);
		finalGlow.beamMat.opacity = beamEnv * 0.75;

		var beamScale = 1 + t * 2.5;
		finalGlow.beam.scale.set(beamScale, 1, beamScale);

		for (var i = 0; i < finalGlow.sprites.length; i++) {
			var sprite = finalGlow.sprites[i];
			var df = sprite.userData.distFactor;

			var spriteDist = df * distToCam * 0.88;
			var spritePos = new THREE.Vector3()
				.copy(doorLocal)
				.add(dirToCam.clone().multiplyScalar(spriteDist));
			sprite.position.copy(spritePos);

			var fadeStart = 0.05 + df * 0.4;
			var fadeEnd = fadeStart + 0.25;
			var localEnv = envelope(t, fadeStart, fadeEnd, 0.7, 0.95);

			var baseScale = 2.5 + df * 28;
			var expandFactor = 1 + t * 5;
			var scale = localEnv * baseScale * expandFactor;
			sprite.scale.set(scale, scale, 1);
			sprite.material.opacity = localEnv * 0.85;
		}

		var mainEnv = envelope(t, 0.2, 0.55, 0.78, 1.0);
		var mainScale = 8 + mainEnv * 70;
		finalGlow.mainGlow.scale.set(mainScale, mainScale, 1);
		finalGlow.mainGlowMat.opacity = mainEnv * 0.9;

		var mainDist = distToCam * 0.65;
		var mainPos = new THREE.Vector3()
			.copy(doorLocal)
			.add(dirToCam.clone().multiplyScalar(mainDist));
		finalGlow.mainGlow.position.copy(mainPos);

		var tradiLight = trad.light;
		tradiLight.userData.target = 1.5 + mainEnv * 4.0;
	}

	function getCurrentSlideIndex() {
		var all = Array.prototype.slice.call(
			document.querySelectorAll(".slide")
		);
		return all.indexOf(slide);
	}

	// ---------------------------------------------------------
	// Reset
	// ---------------------------------------------------------
	function resetState() {
		clearTimers();
		phase = "overview";
		activeBuilding = null;
		deadCount = 0;
		finalTriggered = false;
		panelAnchorId = null;
		camTween = null;

		slide.classList.remove("is-focused", "is-whiteout", "is-final-active");
		panelEl.classList.remove("is-visible", "is-leaving");

		Object.keys(nodeButtons).forEach(function (key) {
			var btn = nodeButtons[key];
			btn.disabled = false;
			btn.classList.remove("is-active", "is-lost");
		});

		if (!initialized) return;

		camera.position.copy(OVERVIEW_POS);
		camLookCurrent.copy(OVERVIEW_LOOK);
		camera.lookAt(OVERVIEW_LOOK);

		if (finalGlow) {
			finalGlow.start = null;
			finalGlow.beamMat.opacity = 0;
			finalGlow.beam.scale.set(1, 1, 1);
			finalGlow.sprites.forEach(function (s) {
				s.material.opacity = 0;
				s.scale.set(0.1, 0.1, 1);
			});
			finalGlow.mainGlowMat.opacity = 0;
			finalGlow.mainGlow.scale.set(0.1, 0.1, 1);
		}

		Object.keys(buildings).forEach(function (key) {
			var b = buildings[key];
			b.state = "alive";
			b.burn = null;
			b.wallMat.color.copy(b.origWallColor);
			b.roofMat.color.copy(b.origRoofColor);
			b.glowMat.emissiveIntensity = b.glowBaseIntensity;
			b.light.intensity = b.lightBaseIntensity;
			b.light.userData.target = b.lightBaseIntensity;
			b.light.color.set(0xffb347);
			if (b.connLine) {
				b.connLine.material.opacity = 0.4;
				b.connLine.userData.target = 0.4;
			}
			if (b.fireGroup) {
				b.group.remove(b.fireGroup);
				b.fireGroup.children.forEach(function (s) {
					s.material.dispose();
				});
				b.fireGroup = null;
			}
			if (b.smokeGroup) {
				b.group.remove(b.smokeGroup);
				b.smokeGroup.children.forEach(function (s) {
					s.material.dispose();
				});
				b.smokeGroup = null;
			}
			if (b.emberPoints) {
				b.group.remove(b.emberPoints);
				b.emberPoints.geometry.dispose();
				b.emberPoints.material.dispose();
				b.emberPoints = null;
			}
		});
	}

	// ---------------------------------------------------------
	// Main animate loop
	// ---------------------------------------------------------
	function animate() {
		if (!running) return;
		rafId = requestAnimationFrame(animate);
		clock.getDelta();

		updateCameraTween();

		Object.keys(buildings).forEach(function (key) {
			var b = buildings[key];
			if (b.state === "burning") updateBurnVisuals(b);

			var target = b.light.userData.target;
			if (typeof target === "number") {
				b.light.intensity += (target - b.light.intensity) * 0.08;
			}
			if (b.connLine) {
				var ctarget = b.connLine.userData.target;
				if (typeof ctarget === "number") {
					b.connLine.material.opacity +=
						(ctarget - b.connLine.material.opacity) * 0.06;
				}
			}
		});

		if (phase === "finalizing") updateFinalGlow();

		if (panelAnchorId) updatePanelPosition();

		var particles = scene.userData.particles;
		if (particles) {
			var pos = particles.geometry.attributes.position.array;
			var base = scene.userData.particleBase;
			var t = clock.elapsedTime;
			for (var i = 0; i < pos.length; i += 3) {
				pos[i + 1] = base[i + 1] + Math.sin(t * 0.3 + i) * 0.4;
			}
			particles.geometry.attributes.position.needsUpdate = true;
		}
		// Animasi aliran air sungai (sangat halus)
		if (riverWaterTexture && riverWaterMaterial) {
			riverWaterTexture.offset.x += 0.0004;
			riverWaterTexture.offset.y += 0.0002;
		}

		renderer.render(scene, camera);
	}

	function startLoop() {
		if (running) return;
		running = true;
		clock.start();
		animate();
	}
	function stopLoop() {
		running = false;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = null;
	}

	// ---------------------------------------------------------
	// Event wiring
	// ---------------------------------------------------------
	ORDER.forEach(function (id) {
		var btn = nodeButtons[id];
		if (!btn) return;
		btn.addEventListener("click", function () {
			selectBuilding(id);
		});
	});

	resetBtn.addEventListener("click", function () {
		resetState();
	});

	// ---------------------------------------------------------
	// Slide activation lifecycle
	// ---------------------------------------------------------
	var wasActive = slide.classList.contains("is-active");
	function handleActivation(isActiveNow) {
		if (isActiveNow) {
			initThree();
			onResize();
			resetState();
			startLoop();
		} else {
			stopLoop();
			clearTimers();
		}
	}

	var observer = new MutationObserver(function () {
		var isActiveNow = slide.classList.contains("is-active");
		if (isActiveNow !== wasActive) {
			wasActive = isActiveNow;
			handleActivation(isActiveNow);
		}
	});
	observer.observe(slide, { attributes: true, attributeFilter: ["class"] });

	if (wasActive) {
		handleActivation(true);
	}
})();
