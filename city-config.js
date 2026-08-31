/* ==========================================================
   CITY — CONFIGURATION (grid-based, fully deterministic)
   ========================================================== */

window.CITY_CONFIG = {
	terrain: {
		size: 420,
		segments: 90,
		elevationScale: 0.6,
		noiseScale: 0.015,
		flattenCenter: { x: 0, z: 25 },
		flattenRadius: 110,
		baseColor: 0x4d6e4f, // tetap hijau untuk area di luar kota
		urbanColor: 0x555555, // warna abu-abu untuk area kota (flatten)
		colorVariation: 0.12
	},

	environment: {
		skyColor: 0x8fc4e8,
		fogColor: 0x8fc4e8,
		fogNear: 140,
		fogFar: 420,
		skyHemiColor: 0xbfe0ff,
		groundHemiColor: 0x5c7e58,
		hemiIntensity: 0.9,
		ambientColor: 0xffffff,
		ambientIntensity: 0.45,
		sunColor: 0xfff3da,
		sunIntensity: 1.6,
		sunPosition: { x: -60, y: 120, z: 60 }
	},

	camera: {
		fov: 50,
		near: 0.5,
		far: 800,
		startPosition: { x: 0, y: 70, z: 170 },
		lookAt: { x: 0, y: 0, z: 0 },
		idleLookAt: { x: 0, y: 6, z: -10 },
		introPath: [
			{ pos: { x: 0, y: 70, z: 170 }, lookAt: { x: 0, y: 0, z: 30 } },
			{
				pos: { x: 24, y: 40, z: 100 },
				lookAt: { x: 0, y: 6, z: 30 },
				duration: 3.2
			},
			{
				pos: { x: -18, y: 24, z: 60 },
				lookAt: { x: 10, y: 6, z: 0 },
				duration: 3.6
			},
			{
				pos: { x: 0, y: 16, z: 40 },
				lookAt: { x: 0, y: 6, z: -10 },
				duration: 3.0
			}
		]
	},

	road: {
		width: 8,
		sidewalkWidth: 1.6,
		color: 0x24262b,
		sidewalkColor: 0xa8adb4,
		markingColor: 0xf2f2f2,
		safetyMargin: 0.5,
		laneOffset: 1.4
	},

	// Grid jalan tetap — 3 kolom, 3 baris, plus akses utara
	roads: [
		// ===== VERTICAL ROADS =====
		{ id: "v-west", axis: "z", at: -70, from: 90, to: -70 },
		{ id: "v-midwest", axis: "z", at: -35, from: 90, to: -70 },
		{ id: "v-center", axis: "z", at: 0, from: 90, to: -70 },
		{ id: "v-mideast", axis: "z", at: 35, from: 90, to: -70 },
		{ id: "v-east", axis: "z", at: 70, from: 90, to: -70 },

		// ===== HORIZONTAL ROADS =====
		{ id: "h-north", axis: "x", at: 90, from: -70, to: 70 },
		{ id: "h-upper", axis: "x", at: 50, from: -70, to: 70 },
		{ id: "h-mid", axis: "x", at: 10, from: -70, to: 70 },
		{ id: "h-lower", axis: "x", at: -30, from: -70, to: 70 },
		{ id: "h-south", axis: "x", at: -70, from: -70, to: 70 }
	],
	// Block hanya untuk tint tanah, mengikuti sel grid.
	blocks: {
		education: {
			center: { x: -52.5, z: 30 },
			size: { x: 35, z: 40 },
			tint: 0x4a5a6a // abu‑abu medium
		},
		"city-center": {
			center: { x: 0, z: 30 },
			size: { x: 70, z: 40 },
			tint: 0x3f3f3f // abu‑abu sedikit lebih gelap
		},
		commercial: {
			center: { x: 52.5, z: 30 },
			size: { x: 35, z: 40 },
			tint: 0x6a4a3a // cokelat muda
		},
		residential: {
			center: { x: 0, z: -10 },
			size: { x: 140, z: 40 }, // sebelumnya 175, sekarang pas 4 kolom
			tint: 0x5a4a3a // cokelat hangat
		},
		park: {
			center: { x: 0, z: 70 }, // sebelumnya z=95, sekarang di antara jalan 50 dan 90
			size: { x: 140, z: 40 }, // sebelumnya 175x90, sekarang pas 4 kolom
			tint: 0x2f5a2f // hijau taman lebih gelap
		},
		"suburban-west": {
			center: { x: -52.5, z: -50 },
			size: { x: 35, z: 40 },
			tint: 0x5a4a3a // coklat hangat
		},
		"suburban-east": {
			center: { x: 52.5, z: -50 },
			size: { x: 35, z: 40 },
			tint: 0x5a4a3a
		},
		recreation: {
			center: { x: 0, z: -50 },
			size: { x: 70, z: 40 },
			tint: 0x3f5a3f // hijau sedang
		},
		"north-west-residential": {
			center: { x: -52.5, z: 70 },
			size: { x: 35, z: 40 },
			tint: 0x5a4a3a // coklat hangat
		},
		"north-east-residential": {
			center: { x: 52.5, z: 70 },
			size: { x: 35, z: 40 },
			tint: 0x5a4a3a
		}
	},

	surfaces: [
		{
			id: "edu-courtyard-spine",
			kind: "pavement",
			center: { x: -52.5, z: 29.75 },
			size: { x: 20, z: 2 },
			color: 0xc9c4b8,
			rotation: 0
		},

		{
			id: "edu-plaza-inf",
			kind: "pavement",
			center: { x: -58.45, z: 31.875 },
			size: { x: 10.9, z: 2.25 },
			color: 0xd9d1c1,
			rotation: 0
		},

		{
			id: "edu-alley-south",
			kind: "pavement",
			center: { x: -52.25, z: 23.375 },
			size: { x: 1.5, z: 10.75 },
			color: 0xd9d1c1,
			rotation: 0
		},

		{
			id: "edu-alley-north",
			kind: "pavement",
			center: { x: -53.5, z: 35.875 },
			size: { x: 1.0, z: 10.25 },
			color: 0xd9d1c1,
			rotation: 0
		},
		{
			id: "recreation-park",
			kind: "grass",
			center: { x: 0, z: -50 },
			size: { x: 60, z: 30 },
			color: 0x5a8a5a, // hijau rumput
			rotation: 0
		},
		{
			id: "recreation-lake",
			kind: "water",
			shape: "circle",
			radius: 12,
			center: { x: 0, z: -50 },
			color: 0x1e5a80,
			rotation: 0
		},
		// ===== POCKET PARKS =====
		{
			id: "pocket-park-city",
			kind: "pocket-park",
			center: { x: 0, z: 45 },
			size: { x: 10, z: 6 },
			color: 0x6a9a6a, // hijau segar
			rotation: 0
		},
		{
			id: "pocket-park-commercial",
			kind: "pocket-park",
			center: { x: 52.5, z: 45 },
			size: { x: 8, z: 8 },
			color: 0x6a9a6a,
			rotation: 0
		},
		{
			id: "pocket-park-education",
			kind: "pocket-park",
			center: { x: -52.5, z: 43 },
			size: { x: 10, z: 6 },
			color: 0x6a9a6a,
			rotation: 0
		},
		{
			id: "pocket-park-residential",
			kind: "pocket-park",
			center: { x: 0, z: -5 },
			size: { x: 10, z: 10 },
			color: 0x6a9a6a,
			rotation: 0
		},
		{
			id: "small-lake",
			kind: "water",
			shape: "circle", // <-- bentuk lingkaran
			radius: 8, // <-- radius 8, tidak melewati jalan
			center: { x: 15, z: 65 }, // <-- pindah ke sisi kanan taman
			color: 0x1e5a80,
			rotation: 0
		},
		{
			id: "police-parking",
			kind: "asphalt",
			center: { x: -20, z: 60 }, // <-- tepat di depan kantor polisi
			size: { x: 18, z: 6 },
			color: 0x333333,
			rotation: 0
		}
	],

	buildings: [
		// ---- CITY CENTER ----
		{
			id: "city-hall",
			type: "city-hall",
			position: { x: 15, z: 30 },
			size: { x: 10, y: 28, z: 10 },
			rotation: 0,
			interactive: true,
			info: {
				category: "IPS",
				headline: "Balai Kota IPS",
				description: "Susilo",
				thumbnail: "presentations/Balai-kota/assets/thumbnail.jpg"
			}
		},
		{
			id: "tower-01",
			type: "tower",
			position: { x: -25, z: 40 },
			size: { x: 8, y: 30, z: 8 },
			rotation: 0
		},
		{
			id: "tower-02",
			type: "tower",
			position: { x: -12, z: 30 },
			size: { x: 7, y: 24, z: 7 },
			rotation: 0
		},
		{
			id: "office-01",
			type: "office",
			position: { x: -25, z: 20 },
			size: { x: 7, y: 16, z: 7 },
			rotation: 0
		},
		{
			id: "office-02",
			type: "office",
			position: { x: -12, z: 20 },
			size: { x: 6, y: 10, z: 6 },
			rotation: 0
		},
		{
			id: "office-03",
			type: "office",
			position: { x: 25, z: 22 },
			size: { x: 8, y: 16, z: 8 },
			rotation: 0
		},
		{
			id: "tower-03",
			type: "tower",
			position: { x: 25, z: 40 },
			size: { x: 7, y: 24, z: 7 },
			rotation: 0
		},
		{
			id: "office-04",
			type: "office",
			position: { x: 12, z: 20 },
			size: { x: 6, y: 12, z: 6 },
			rotation: 0
		},
		{
			id: "tower-04",
			type: "tower",
			position: { x: 24, z: 30 },
			size: { x: 6, y: 22, z: 6 },
			rotation: 0
		},
		{
			id: "tower-05",
			type: "tower",
			position: { x: 10, z: 40 },
			size: { x: 6, y: 18, z: 6 },
			rotation: 0
		},

		// ---- EDUCATION ----
		{
			id: "school",
			type: "math-school",
			position: { x: -58, z: 23 },
			size: { x: 10, y: 9, z: 11 },
			rotation: 0,
			interactive: true,
			info: {
				category: "MTK",
				headline: "Sekolah Matematika",
				description: "",
				thumbnail: ""
			}
		},

		{
			id: "lab-ipa",
			type: "lab",
			position: { x: -47, z: 23 },
			size: { x: 9, y: 11, z: 10 },
			rotation: 0,
			interactive: true,
			info: {
				category: "IPA",
				headline: "Laboratorium IPA",
				description: "",
				thumbnail: ""
			}
		},

		{
			id: "inf-tower",
			type: "inf-tower",
			position: { x: -58, z: 37 },
			size: { x: 8, y: 24, z: 8 },
			rotation: 0,
			interactive: true,
			info: {
				category: "INF",
				headline: "Gedung INF",
				description: "",
				thumbnail: ""
			}
		},

		{
			id: "museum-ips",
			type: "museum",
			position: { x: -47.5, z: 37 },
			size: { x: 11, y: 10, z: 12 },
			rotation: 0,
			interactive: true,
			info: {
				category: "IPS",
				headline: "Museum IPS",
				description: "",
				thumbnail: ""
			}
		},
		// ---- COMMERCIAL ----
		{
			id: "shop-01",
			type: "shop",
			position: { x: 45, z: 40 },
			size: { x: 6, y: 8, z: 6 },
			rotation: 0
		},
		{
			id: "bar",
			type: "bar",
			position: { x: 45, z: 30 },
			size: { x: 7, y: 8, z: 7 },
			rotation: 0,
			interactive: true,
			info: {
				category: "Umum",
				headline: "Bar",
				description: "template dengan desain biliard😹",
				thumbnail: "presentations/bar/assets/photos/thumbnail.jpg"
			}
		},
		{
			id: "shop-02",
			type: "shop",
			position: { x: 60, z: 40 },
			size: { x: 6, y: 9, z: 6 },
			rotation: 0
		},
		{
			id: "shop-03",
			type: "shop",
			position: { x: 45, z: 20 },
			size: { x: 6, y: 7, z: 6 },
			rotation: 0
		},
		{
			id: "shop-04",
			type: "shop",
			position: { x: 52.5, z: 30 },
			size: { x: 6, y: 8, z: 6 },
			rotation: 0
		},
		{
			id: "shop-05",
			type: "shop",
			position: { x: 60, z: 30 },
			size: { x: 6, y: 8, z: 6 },
			rotation: 0
		},
		{
			id: "com-office",
			type: "office",
			position: { x: 58, z: 20 },
			size: { x: 7, y: 18, z: 7 },
			rotation: 0
		},

		// ---- RESIDENTIAL ----
		{
			id: "house-a1",
			type: "residential",
			position: { x: -52.5, z: -20 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "pink-house",
			type: "pink-house",
			position: { x: -60, z: -20 },
			size: { x: 7, y: 6, z: 7 },
			rotation: 0,
			interactive: true,
			info: {
				category: "Umum",
				headline: "Rumah Pink",
				description: "",
				thumbnail: ""
			}
		},
		{
			id: "house-a2",
			type: "residential",
			position: { x: -52.5, z: -10 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},
		{
			id: "house-a3",
			type: "residential",
			position: { x: -52.5, z: 0 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "house-b1",
			type: "residential",
			position: { x: -17.5, z: -20 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},
		{
			id: "house-b2",
			type: "residential",
			position: { x: -17.5, z: -10 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "house-b3",
			type: "residential",
			position: { x: -17.5, z: 0 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},
		{
			id: "house-c1",
			type: "residential",
			position: { x: 17.5, z: -20 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "house-c2",
			type: "residential",
			position: { x: 17.5, z: -10 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},
		{
			id: "house-c3",
			type: "residential",
			position: { x: 17.5, z: 0 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "house-d1",
			type: "residential",
			position: { x: 52.5, z: -20 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},
		{
			id: "house-d2",
			type: "residential",
			position: { x: 52.5, z: -10 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "house-d3",
			type: "residential",
			position: { x: 52.5, z: 0 },
			size: { x: 6, y: 6, z: 6 },
			rotation: 0
		},

		// ===== FILLER BUILDINGS (STEP 3) =====
		{
			id: "fill-a1",
			type: "apartment",
			position: { x: -58, z: -55 },
			size: { x: 8, y: 12, z: 8 },
			rotation: 0
		},
		{
			id: "fill-a2",
			type: "house-small",
			position: { x: -46, z: -55 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "fill-a3",
			type: "kiosk",
			position: { x: -52.5, z: -42 },
			size: { x: 4, y: 4, z: 4 },
			rotation: 0
		},
		{
			id: "fill-b1",
			type: "house-small",
			position: { x: -23, z: -55 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "fill-b2",
			type: "minimarket",
			position: { x: -11, z: -55 },
			size: { x: 8, y: 6, z: 8 },
			rotation: 0
		},
		{
			id: "fill-c1",
			type: "apartment",
			position: { x: 12, z: -55 },
			size: { x: 8, y: 12, z: 8 },
			rotation: 0
		},
		{
			id: "fill-c2",
			type: "house-small",
			position: { x: 24, z: -55 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "fill-c3",
			type: "minimarket",
			position: { x: 17.5, z: -42 },
			size: { x: 8, y: 6, z: 8 },
			rotation: 0
		},
		{
			id: "fill-d1",
			type: "house-small",
			position: { x: 47, z: -55 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "fill-d2",
			type: "apartment",
			position: { x: 59, z: -55 },
			size: { x: 8, y: 12, z: 8 },
			rotation: 0
		},
		{
			id: "fill-d3",
			type: "kiosk",
			position: { x: 52.5, z: -42 },
			size: { x: 4, y: 4, z: 4 },
			rotation: 0
		},

		// Filler residential
		{
			id: "fill-res-a",
			type: "house-small",
			position: { x: -45, z: -16 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "fill-res-b",
			type: "apartment",
			position: { x: -24, z: -5 },
			size: { x: 8, y: 12, z: 8 },
			rotation: 0
		},
		{
			id: "fill-res-c",
			type: "apartment",
			position: { x: 24, z: -5 },
			size: { x: 8, y: 12, z: 8 },
			rotation: 0
		},
		{
			id: "fill-res-d",
			type: "house-small",
			position: { x: 45, z: -16 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		// ===== SUBURBAN WEST =====
		{
			id: "sub-w1",
			type: "house-small",
			position: { x: -60, z: -50 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-w2",
			type: "house-small",
			position: { x: -48, z: -50 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-w3",
			type: "house-small",
			position: { x: -60, z: -40 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-w4",
			type: "house-small",
			position: { x: -48, z: -40 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		// ===== SUBURBAN EAST =====
		{
			id: "sub-e1",
			type: "house-small",
			position: { x: 60, z: -50 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-e2",
			type: "house-small",
			position: { x: 48, z: -50 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-e3",
			type: "house-small",
			position: { x: 60, z: -40 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "sub-e4",
			type: "house-small",
			position: { x: 48, z: -40 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		// ===== NORTH SUBURBAN =====
		{
			id: "north-w1",
			type: "house-small",
			position: { x: -60, z: 70 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-w2",
			type: "house-small",
			position: { x: -48, z: 70 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-w3",
			type: "house-small",
			position: { x: -60, z: 80 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-w4",
			type: "house-small",
			position: { x: -48, z: 80 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-e1",
			type: "house-small",
			position: { x: 60, z: 70 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-e2",
			type: "house-small",
			position: { x: 48, z: 70 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-e3",
			type: "house-small",
			position: { x: 60, z: 80 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "north-e4",
			type: "house-small",
			position: { x: 48, z: 80 },
			size: { x: 6, y: 5, z: 6 },
			rotation: 0
		},
		{
			id: "police-station",
			type: "police",
			position: { x: -20, z: 70 }, // <-- posisi lebih ke dalam blok
			size: { x: 14, y: 8, z: 16 }, // <-- jauh lebih besar
			rotation: 0
		}
	],

	vegetation: {
		seed: 20260817,
		treeCount: 90,
		area: { minX: -190, maxX: 190, minZ: 56, maxZ: 190 },
		roadCorridorExcludeX: 7
	},

	mountains: {
		seed: 20260817,
		count: 7,
		minX: -180,
		maxX: 180,
		minZ: -210,
		maxZ: -170,
		heightMin: 80, // sebelumnya 40
		heightMax: 160, // sebelumnya 80
		radiusMin: 50, // sebelumnya 25
		radiusMax: 90, // sebelumnya 45
		color: 0x8a9aad,
		colorVariation: 0.1
	},

	forest: {
		seed: 20260817,
		count: 350,
		area: { minX: -180, maxX: 180, minZ: -170, maxZ: -70 },
		densityNear: 0.15,
		densityFar: 0.85,
		treeScaleMin: 0.8,
		treeScaleMax: 1.8
	},

	vehicles: {
		seed: 20260817,
		count: 14,
		colors: [0xd23c3c, 0x3c6bd2, 0xd2c23c, 0xe6e6e6, 0x2c2c2c, 0x7a4a2b],
		speed: 4
	}
};
