/* =========================================================
   TEMPLATE PRESENTASI INTERAKTIF — BOARD GAME x BILLIARD TABLE
   File: script.js
   Semua bagian yang perlu diedit untuk memakai ulang template ini
   dikumpulkan di dalam blok "KONFIGURASI" di bawah ini.

   Template ini bersifat UNIVERSAL — tidak terikat mata pelajaran
   tertentu. Ganti presentationConfig, slides, dan slidePositions
   sesuai materi presentasi kamu.
   ========================================================= */

/* =========================================================
   KONFIGURASI 1 — IDENTITAS PRESENTASI
   Ditampilkan di panel cover.
   ========================================================= */

const presentationConfig = {
	title: "Judul Presentasi",
	group: "Kelompok 4",
	members: [
		"Nama Anggota 1",
		"Nama Anggota 2",
		"Nama Anggota 3",
		"Nama Anggota 4"
	]
};

/* =========================================================
   KONFIGURASI 2 — POSISI PETAK TUJUAN (MILESTONE)
   Posisi petak (1-39) tempat pion akan berhenti untuk tiap slide.
   Papan memiliki 1 petak START (tidak bernomor) + petak bernomor 1-39.

   ATURAN PENTING: satu perpindahan slide = SATU kali lempar dadu.
   Karena dadu fisik hanya bernilai 1-6, jarak antar posisi
   (termasuk jarak dari START ke posisi pertama) TIDAK BOLEH lebih
   dari 6. Jika ada jarak yang melebihi 6, sistem akan menampilkan
   peringatan di console — perbaiki susunan angka di bawah ini agar
   jaraknya rapi (idealnya 3-6 petak per langkah).
   ========================================================= */

const slidePositions = [4, 8, 12, 16, 20, 24, 28, 32, 36, 39];

/* =========================================================
   KONFIGURASI 3 — ISI SLIDE
   Tipe yang tersedia: "text", "two-column", "comparison",
   "process", "quiz". Semua tipe otomatis memakai gaya visual
   yang sama. "icon" merujuk ke salah satu key pada objek ICONS
   di bawah (lihat daftar key sebelum objek ICONS).
   ========================================================= */

const slides = [
	{
		icon: "info",
		subtitle: "Pengertian",
		title: "Judul Konsep Utama",
		type: "text",
		content:
			"Tuliskan definisi atau penjelasan singkat mengenai topik utama pada bagian ini. Gunakan bahasa yang sederhana agar mudah dipahami audiens.",
		bullets: [
			"Poin penting pertama yang mendukung penjelasan",
			"Poin penting kedua yang memperkuat pemahaman",
			"Poin penting ketiga sebagai pelengkap"
		]
	},
	{
		icon: "compass",
		subtitle: "Konsep Dasar",
		title: "Dua Konsep yang Dibandingkan",
		type: "comparison",
		columns: [
			{
				label: "Konsep A",
				points: [
					"Ciri atau aspek pertama dari konsep A",
					"Ciri atau aspek kedua dari konsep A",
					"Contoh penerapan konsep A"
				]
			},
			{
				label: "Konsep B",
				points: [
					"Ciri atau aspek pertama dari konsep B",
					"Ciri atau aspek kedua dari konsep B",
					"Contoh penerapan konsep B"
				]
			}
		]
	},
	{
		icon: "document",
		subtitle: "Pembahasan",
		title: "Poin-Poin Pembahasan",
		type: "two-column",
		columns: [
			{
				title: "Bagian Pertama",
				text: "Jelaskan aspek pertama dari pembahasan topik ini secara ringkas dan jelas."
			},
			{
				title: "Bagian Kedua",
				text: "Jelaskan aspek kedua yang melengkapi pembahasan topik ini."
			}
		]
	},
	{
		icon: "target",
		subtitle: "Contoh",
		title: "Contoh Penerapan",
		type: "text",
		content:
			"Berikan satu atau dua contoh nyata yang relevan dengan topik ini agar audiens lebih mudah membayangkan penerapannya.",
		bullets: [
			"Contoh pertama beserta penjelasan singkat",
			"Contoh kedua beserta penjelasan singkat"
		]
	},
	{
		icon: "globe",
		subtitle: "Faktor",
		title: "Faktor yang Memengaruhi",
		type: "two-column",
		columns: [
			{
				title: "Faktor Internal",
				text: "Jelaskan faktor-faktor yang berasal dari dalam yang memengaruhi topik ini."
			},
			{
				title: "Faktor Eksternal",
				text: "Jelaskan faktor-faktor dari luar atau lingkungan yang turut memengaruhi topik ini."
			}
		]
	},
	{
		icon: "process",
		subtitle: "Proses",
		title: "Tahapan Utama",
		type: "process",
		steps: ["Tahap Awal", "Tahap Kedua", "Tahap Ketiga", "Tahap Akhir"]
	},
	{
		icon: "coin",
		subtitle: "Data",
		title: "Data & Angka Penting",
		type: "text",
		content:
			"Sisipkan data, statistik, atau angka penting yang relevan dan mendukung topik presentasi ini.",
		bullets: [
			"Contoh data atau angka pertama",
			"Contoh data atau angka kedua",
			"Sumber data (jika diperlukan)"
		]
	},
	{
		icon: "star",
		subtitle: "Fakta Menarik",
		title: "Tahukah Kamu?",
		type: "text",
		content:
			"Tambahkan satu fakta unik atau mengejutkan yang berkaitan dengan topik ini untuk menarik perhatian audiens.",
		bullets: ["Fakta menarik pertama", "Fakta menarik kedua"]
	},
	{
		icon: "question",
		subtitle: "Quiz",
		title: "Uji Pemahaman",
		type: "quiz",
		question: "Manakah pernyataan yang paling tepat menjelaskan topik ini?",
		options: [
			"Pilihan jawaban A",
			"Pilihan jawaban B",
			"Pilihan jawaban C",
			"Pilihan jawaban D"
		],
		correctIndex: 0,
		explanation:
			"Jelaskan secara singkat mengapa jawaban ini benar, sekaligus luruskan kesalahpahaman umum jika ada."
	},
	{
		icon: "flag",
		subtitle: "Kesimpulan",
		title: "Kesimpulan",
		type: "text",
		content:
			"Rangkum poin-poin utama yang telah dibahas sepanjang presentasi ini dalam satu-dua kalimat.",
		bullets: [
			"Ringkasan poin pertama",
			"Ringkasan poin kedua",
			"Pesan penutup untuk audiens"
		]
	}
];

/* =========================================================
   KONFIGURASI 4 — FOTO ALBUM ANGGOTA KELOMPOK
   Tepat 4 foto: foto[0] & foto[1] tampil di sisi KIRI board,
   foto[2] & foto[3] tampil di sisi KANAN board.
   Ganti dengan nama file/path foto asli (taruh file-nya di folder
   yang sama dengan index.html). Jika sebuah foto belum ada / gagal
   dimuat, bingkai akan otomatis menampilkan placeholder — jadi
   template ini tetap aman dijalankan sebelum foto diganti.
   ========================================================= */

const albumPhotos = [
	"assets/photos/foto1.jpg",
	"assets/photos/foto2.jpg",
	"assets/photos/foto3.jpg",
	"assets/photos/foto4.jpg"
];

/* =========================================================
   ICON SET (SVG inline, gaya garis konsisten — bukan emoji)
   Dipakai untuk icon slide (di atas) dan juga di-cycle otomatis
   sebagai ornamen tiap petak papan. Tambah/ubah key di sini bila
   ingin ragam visual lain.
   ========================================================= */

const ICONS = {
	info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor"/><line x1="12" y1="11" x2="12" y2="17" stroke="currentColor"/><circle cx="12" cy="7.4" r="1" fill="currentColor" stroke="none"/></svg>',
	book: '<svg viewBox="0 0 24 24"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5V5.5Z" stroke="currentColor"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5V5.5Z" stroke="currentColor"/></svg>',
	leaf: '<svg viewBox="0 0 24 24"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15Z" stroke="currentColor"/><path d="M5 19c2-4 5-7 9-9" stroke="currentColor"/></svg>',
	process:
		'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.6-5.7" stroke="currentColor"/><path d="M20 12a8 8 0 0 1-13.6 5.7" stroke="currentColor"/><path d="M17.4 6 18 3l3 .9" stroke="currentColor"/><path d="M6.6 18 6 21l-3-.9" stroke="currentColor"/></svg>',
	fact: '<svg viewBox="0 0 24 24"><path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" stroke="currentColor" stroke-linejoin="round"/></svg>',
	question:
		'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor"/><path d="M9.2 9.4a2.8 2.8 0 1 1 4.3 2.4c-.9.6-1.5 1.1-1.5 2.2" stroke="currentColor"/><circle cx="12" cy="17.1" r="1" fill="currentColor" stroke="none"/></svg>',
	flag: '<svg viewBox="0 0 24 24"><path d="M6 3v18" stroke="currentColor"/><path d="M6 4h12l-3 4 3 4H6" stroke="currentColor" stroke-linejoin="round"/></svg>',
	compass:
		'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z" stroke="currentColor" stroke-linejoin="round"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
	card: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor"/><path d="M8 9h3M8 12.5h6" stroke="currentColor"/><circle cx="16.5" cy="15.2" r="1.6" stroke="currentColor"/></svg>',
	coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="currentColor"/><circle cx="12" cy="12" r="5" stroke="currentColor"/><path d="M12 9.3v5.4M10.4 10.3c0-.7.7-1.2 1.6-1.2s1.6.5 1.6 1.1c0 1.6-3.2 1-3.2 2.6 0 .6.7 1.1 1.6 1.1s1.6-.5 1.6-1.2" stroke="currentColor"/></svg>',
	globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor"/><ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor"/><path d="M3.5 9h17M3.5 15h17" stroke="currentColor"/></svg>',
	magnifier:
		'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor"/><path d="M15.3 15.3 20 20" stroke="currentColor"/></svg>',
	bulb: '<svg viewBox="0 0 24 24"><path d="M9 16.5h6M9.5 19h5M12 3a6 6 0 0 1 3.2 11.1c-.6.4-1 1.1-1 1.9v.3H9.8v-.3c0-.8-.4-1.5-1-1.9A6 6 0 0 1 12 3Z" stroke="currentColor" stroke-linejoin="round"/></svg>',
	star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.4 5 5.5.6-4 3.8 1 5.5-4.9-2.7-4.9 2.7 1-5.5-4-3.8 5.5-.6Z" stroke="currentColor" stroke-linejoin="round"/></svg>',
	trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" stroke="currentColor" stroke-linejoin="round"/><path d="M7 5H4.5A2.5 2.5 0 0 0 4 9.9L7 11M17 5h2.5A2.5 2.5 0 0 1 20 9.9L17 11" stroke="currentColor"/><path d="M12 13v3.5M9 20h6M9.5 20c0-1.8.9-2.8 2.5-2.8s2.5 1 2.5 2.8" stroke="currentColor"/></svg>',
	key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4" stroke="currentColor"/><path d="M11.5 12H20M17 12v3M14 12v2.4" stroke="currentColor"/></svg>',
	clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor"/><path d="M12 7v5l3.3 2" stroke="currentColor"/></svg>',
	hexagon:
		'<svg viewBox="0 0 24 24"><path d="M12 3.5 19 8v8l-7 4.5L5 16V8Z" stroke="currentColor" stroke-linejoin="round"/><path d="M12 3.5V12M12 12l7-4M12 12l-7-4M12 12v8.5" stroke="currentColor" opacity="0.55"/></svg>',
	document:
		'<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-linejoin="round"/><path d="M14 3.5V8h4M9 12.5h6M9 15.5h6M9 9.5h2.5" stroke="currentColor"/></svg>',
	target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor"/><circle cx="12" cy="12" r="5" stroke="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
	crystal:
		'<svg viewBox="0 0 24 24"><path d="M8 3.5h8l4 5.5-8 11.5-8-11.5Z" stroke="currentColor" stroke-linejoin="round"/><path d="M8 3.5 12 9l4-5.5M4 9h16M12 9 8.5 20M12 9l3.5 11" stroke="currentColor" opacity="0.55"/></svg>',
	badge: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="6" stroke="currentColor"/><path d="M9 15.3 7.5 21l4.5-2.6L16.5 21 15 15.3" stroke="currentColor" stroke-linejoin="round"/></svg>'
};

// Urutan pool ikon dekoratif (petak selain START/milestone/sudut) —
// key ikon akan di-cycle otomatis dengan sedikit rotasi acak per petak
// agar tiap petak terasa unik meski memakai simbol yang sama.
const DECORATIVE_ICON_KEYS = Object.keys(ICONS);

// Ikon khusus untuk petak sudut papan (k = 10, 20, 30).
const CORNER_ICON_KEYS = ["crystal", "badge", "trophy"];

/* =========================================================
   KONSTANTA INTERNAL
   ========================================================= */

const TOTAL_TILES = 40; // 1 petak START + petak 1..39
const HOP_MS = 260; // durasi animasi 1 langkah pion (samakan dgn transition CSS .pion)
const DICE_ROLL_MS = 850; // durasi animasi dadu berputar
const DICE_REST_TILT = { x: -16, y: 22 }; // sedikit kemiringan estetik saat dadu berhenti

const DICE_FACE_TARGET = {
	1: { x: 0, y: 0 },
	2: { x: 0, y: 90 },
	3: { x: 90, y: 0 },
	4: { x: -90, y: 0 },
	5: { x: 0, y: -90 },
	6: { x: 0, y: 180 }
};

/* =========================================================
   ELEMEN DOM
   ========================================================= */

const cameraRig = document.getElementById("cameraRig");
const tilesLayer = document.getElementById("tilesLayer");
const pion = document.getElementById("pion");
const coverView = document.getElementById("coverView");
const coverTitle = document.getElementById("coverTitle");
const coverGroup = document.getElementById("coverGroup");
const coverMembers = document.getElementById("coverMembers");
const slideView = document.getElementById("slideView");
const slideIcon = document.getElementById("slideIcon");
const slideSubtitle = document.getElementById("slideSubtitle");
const slideTitle = document.getElementById("slideTitle");
const slideTag = document.getElementById("slideTag");
const slideBody = document.getElementById("slideBody");
const finishView = document.getElementById("finishView");
const restartBtn = document.getElementById("restartBtn");
const dice = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");
const progressTrack = document.getElementById("progressTrack");
const muteBtn = document.getElementById("muteBtn");
const statusCurrent = document.getElementById("statusCurrent");
const statusTotal = document.getElementById("statusTotal");
const statusTile = document.getElementById("statusTile");
const decorLeft = document.getElementById("decorLeft");
const decorRight = document.getElementById("decorRight");

/* =========================================================
   STATE
   ========================================================= */

let currentSlideIndex = -1; // -1 = cover / belum mulai
let currentBoardPos = 0; // posisi pion saat ini (0 = START)
let isAnimating = false;
const tilesByIndex = new Array(TOTAL_TILES);
const tilesMeta = new Array(TOTAL_TILES);

/* =========================================================
   UTIL
   ========================================================= */

function wait(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHTML(str) {
	const div = document.createElement("div");
	div.textContent = String(str);
	return div.innerHTML;
}

/* =========================================================
   AUDIO ENGINE — semua efek suara disintesis langsung lewat
   Web Audio API (tidak ada file audio eksternal yang di-load).
   AudioContext baru dibuat saat interaksi ROLL/mute pertama kali,
   karena browser memblokir autoplay sebelum ada gesture pengguna.
   ========================================================= */

let audioCtx = null;
let masterGain = null;
let isMuted = false;
const BASE_VOLUME = 0.35;

function initAudio() {
	if (audioCtx) return;
	const Ctx = window.AudioContext || window.webkitAudioContext;
	if (!Ctx) return; // browser tidak mendukung Web Audio API
	audioCtx = new Ctx();
	masterGain = audioCtx.createGain();
	masterGain.gain.value = isMuted ? 0 : BASE_VOLUME;
	masterGain.connect(audioCtx.destination);
}

function ensureAudio() {
	if (!audioCtx) return false;
	if (audioCtx.state === "suspended") audioCtx.resume();
	return true;
}

function playTone({
	freq = 440,
	freqEnd = null,
	duration = 0.12,
	type = "sine",
	gain = 0.3,
	delay = 0
}) {
	if (!ensureAudio()) return;
	const t0 = audioCtx.currentTime + delay;
	const osc = audioCtx.createOscillator();
	const g = audioCtx.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, t0);
	if (freqEnd)
		osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
	g.gain.setValueAtTime(gain, t0);
	g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
	osc.connect(g);
	g.connect(masterGain);
	osc.start(t0);
	osc.stop(t0 + duration + 0.02);
}

function playNoiseBurst({
	duration = 0.08,
	delay = 0,
	gain = 0.25,
	filterFreq = 1800
}) {
	if (!ensureAudio()) return;
	const t0 = audioCtx.currentTime + delay;
	const size = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
	const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < size; i++) {
		data[i] = (Math.random() * 2 - 1) * (1 - i / size);
	}
	const src = audioCtx.createBufferSource();
	src.buffer = buffer;
	const filter = audioCtx.createBiquadFilter();
	filter.type = "bandpass";
	filter.frequency.value = filterFreq;
	const g = audioCtx.createGain();
	g.gain.setValueAtTime(gain, t0);
	g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
	src.connect(filter);
	filter.connect(g);
	g.connect(masterGain);
	src.start(t0);
}

function sfxClick() {
	playTone({ freq: 1200, duration: 0.045, type: "square", gain: 0.15 });
}
function sfxDiceRoll() {
	for (let i = 0; i < 6; i++) {
		playNoiseBurst({
			duration: 0.06,
			delay: i * 0.09,
			gain: 0.12,
			filterFreq: 2000 + Math.random() * 900
		});
	}
}
function sfxDiceLand() {
	playTone({
		freq: 180,
		freqEnd: 90,
		duration: 0.12,
		type: "triangle",
		gain: 0.28
	});
	playNoiseBurst({ duration: 0.05, gain: 0.14, filterFreq: 900 });
}
function sfxStep() {
	playTone({ freq: 850, duration: 0.045, type: "sine", gain: 0.14 });
}
function sfxChime() {
	playTone({ freq: 880, duration: 0.5, type: "sine", gain: 0.2 });
	playTone({
		freq: 1318.5,
		duration: 0.5,
		type: "sine",
		gain: 0.13,
		delay: 0.05
	});
}
function sfxWhoosh() {
	playNoiseBurst({ duration: 0.28, gain: 0.09, filterFreq: 1200 });
}
function sfxFanfare() {
	[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
		playTone({
			freq: f,
			duration: 0.32,
			type: "triangle",
			gain: 0.2,
			delay: i * 0.11
		});
	});
}

function setMuted(value) {
	isMuted = value;
	if (masterGain) masterGain.gain.value = isMuted ? 0 : BASE_VOLUME;
	muteBtn.classList.toggle("is-muted", isMuted);
	muteBtn.setAttribute(
		"aria-label",
		isMuted ? "Aktifkan suara" : "Matikan suara"
	);
}

muteBtn.addEventListener("click", () => {
	initAudio();
	setMuted(!isMuted);
});

/* =========================================================
   GENERATOR PAPAN — memetakan indeks 0..39 ke grid 11x11
   membentuk jalur mengelilingi tepi papan (seperti board game klasik)
   ========================================================= */

function gridPositionForIndex(k) {
	// Sisi kiri (naik): index 0 (pojok, START) .. 10 (pojok)
	if (k <= 10) return { row: 11 - k, col: 1 };
	// Sisi atas (ke kanan): 10 (pojok) .. 20 (pojok)
	if (k <= 20) return { row: 1, col: 1 + (k - 10) };
	// Sisi kanan (turun): 20 (pojok) .. 30 (pojok)
	if (k <= 30) return { row: 1 + (k - 20), col: 11 };
	// Sisi bawah (ke kiri): 30 (pojok) .. 39, kembali dekat START
	return { row: 11, col: 11 - (k - 30) };
}

function pickDecorativeIcon(k) {
	return DECORATIVE_ICON_KEYS[(k * 7 + 3) % DECORATIVE_ICON_KEYS.length];
}

function buildBoard() {
	for (let k = 0; k < TOTAL_TILES; k++) {
		const { row, col } = gridPositionForIndex(k);
		const tile = document.createElement("div");
		tile.className = "tile";
		tile.style.gridRow = String(row);
		tile.style.gridColumn = String(col);

		const isCorner = k % 10 === 0;
		if (isCorner) tile.classList.add("corner");

		const milestoneIdx = slidePositions.indexOf(k);
		const isMilestone = milestoneIdx !== -1;
		if (isMilestone) {
			tile.classList.add("milestone");
			if (milestoneIdx === slidePositions.length - 1)
				tile.classList.add("finish-tile");
		}

		if (k === 0) {
			tile.classList.add("start");
			const iconWrap = document.createElement("span");
			iconWrap.className = "tile-icon tile-icon-start";
			iconWrap.innerHTML = ICONS.compass;
			tile.appendChild(iconWrap);

			const label = document.createElement("span");
			label.className = "tile-start-label";
			label.textContent = "START";
			tile.appendChild(label);
		} else {
			let iconKey;
			if (isMilestone) {
				iconKey = slides[milestoneIdx].icon;
			} else if (isCorner) {
				iconKey = CORNER_ICON_KEYS[k / 10 - 1] || "crystal";
			} else {
				iconKey = pickDecorativeIcon(k);
			}

			const iconWrap = document.createElement("span");
			iconWrap.className = "tile-icon variant-" + (k % 4);
			const rotateDeg = ((k * 53) % 13) - 6;
			iconWrap.style.transform = `rotate(${rotateDeg}deg)`;
			iconWrap.innerHTML = ICONS[iconKey] || ICONS.info;
			tile.appendChild(iconWrap);

			const num = document.createElement("span");
			num.className = "tile-number";
			num.textContent = String(k);
			tile.appendChild(num);
		}

		tilesLayer.appendChild(tile);
		tilesByIndex[k] = tile;
		tilesMeta[k] = {
			left: ((col - 0.5) / 11) * 100,
			top: ((row - 0.5) / 11) * 100
		};
	}
}

/* =========================================================
   DEKORASI MEJA — FOTO ALBUM & KARTU REMI
   Murni dekoratif (area kosong kiri/kanan board), tidak menyentuh
   sistem board/slide/dadu di atas. Foto dirender dari albumPhotos
   (KONFIGURASI 4). Posisi & kartu diatur lewat DECOR_PHOTO_LAYOUT
   dan DECOR_CARD_LAYOUT di bawah — aman diubah tanpa memengaruhi
   logic presentasi.
   ========================================================= */

// Path SVG sederhana untuk 4 suit kartu remi klasik (bukan emoji).
const CARD_SUIT_PATHS = {
	spade: '<path d="M12 2C9 6 3 10.3 3 14.3A4.4 4.4 0 0 0 12 15.8c.3 0 .6 0 .8-.1C12.3 17.8 11 19.5 8.7 21h6.6c-2.3-1.5-3.6-3.2-4.1-5.3.3.1.5.1.8.1a4.4 4.4 0 0 0 9-1.5C21 10.3 15 6 12 2Z" fill="currentColor"/>',
	club: '<circle cx="12" cy="7.2" r="3.5" fill="currentColor"/><circle cx="8.3" cy="12.4" r="3.5" fill="currentColor"/><circle cx="15.7" cy="12.4" r="3.5" fill="currentColor"/><path d="M12 12.2c1.2 3-.2 5.7-2.4 8.6h4.8c-2.2-2.9-3.6-5.6-2.4-8.6Z" fill="currentColor"/>',
	heart: '<path d="M12 21S3.6 15.7 3.6 9.9C3.6 6.7 6 4.3 8.9 4.3c1.7 0 3.2.9 3.1 2.6-.1-1.7 1.4-2.6 3.1-2.6 2.9 0 5.3 2.4 5.3 5.6C20.4 15.7 12 21 12 21Z" fill="currentColor"/>',
	diamond: '<path d="M12 2 20 12 12 22 4 12Z" fill="currentColor"/>'
};

// Posisi (persen thd kontainer dekorasi) + rotasi tiap foto.
// foto[0..1] -> kiri, foto[2..3] -> kanan (lihat renderTableDecor).
const DECOR_PHOTO_LAYOUT = {
	left: [
		{ top: "9%", left: "20%", rotate: -6 },
		{ top: "46%", left: "3%", rotate: 5 }
	],
	right: [
		{ top: "7%", left: "24%", rotate: 7 },
		{ top: "45%", left: "6%", rotate: -5 }
	]
};

// Komposisi kartu remi: satu tumpukan + satu aksen per sisi (5-8 total).
const DECOR_CARD_LAYOUT = {
	left: [
		{ suit: "spade", top: "68%", left: "42%", rotate: -9 },
		{ suit: "heart", top: "65.5%", left: "47%", rotate: 3 },
		{ suit: "diamond", top: "63%", left: "52%", rotate: -1 },
		{ suit: "club", top: "2%", left: "56%", rotate: 15 }
	],
	right: [
		{ suit: "heart", top: "70%", left: "6%", rotate: 10 },
		{ suit: "club", top: "67%", left: "16%", rotate: -7 },
		{ suit: "diamond", top: "4%", left: "54%", rotate: -13 }
	]
};

function buildPhotoFigure(src, label, pos) {
	const fig = document.createElement("div");
	fig.className = "decor-photo";
	fig.style.top = pos.top;
	fig.style.left = pos.left;
	fig.style.setProperty("--tilt", pos.rotate + "deg");

	const img = document.createElement("img");
	img.alt = "";
	img.loading = "lazy";
	img.addEventListener("error", () => {
		if (!fig.contains(img)) return;
		fig.removeChild(img);
		fig.classList.add("is-fallback");
		const fb = document.createElement("div");
		fb.className = "photo-fallback";
		fb.textContent = label;
		fig.appendChild(fb);
	});
	img.src = src;
	fig.appendChild(img);
	return fig;
}

function buildCardEl(cardCfg) {
	const card = document.createElement("div");
	card.className = "decor-card suit-" + cardCfg.suit;
	card.style.top = cardCfg.top;
	card.style.left = cardCfg.left;
	card.style.setProperty("--tilt", cardCfg.rotate + "deg");
	card.innerHTML =
		'<svg viewBox="0 0 24 24" aria-hidden="true">' +
		(CARD_SUIT_PATHS[cardCfg.suit] || "") +
		"</svg>";
	return card;
}

function renderTableDecor() {
	if (!decorLeft || !decorRight) return;

	const groups = [
		{ host: decorLeft, photoIdx: [0, 1], side: "left" },
		{ host: decorRight, photoIdx: [2, 3], side: "right" }
	];

	groups.forEach(group => {
		DECOR_PHOTO_LAYOUT[group.side].forEach((pos, i) => {
			const idx = group.photoIdx[i];
			const src = albumPhotos[idx];
			if (!src) return;
			group.host.appendChild(
				buildPhotoFigure(src, "Foto " + (idx + 1), pos)
			);
		});

		DECOR_CARD_LAYOUT[group.side].forEach(cardCfg => {
			group.host.appendChild(buildCardEl(cardCfg));
		});
	});
}

/* =========================================================
   PION
   ========================================================= */

function placePionInstant(k) {
	const meta = tilesMeta[k];
	pion.style.left = meta.left + "%";
	pion.style.top = meta.top + "%";
}

async function hopPionTo(k, isLastHop) {
	const meta = tilesMeta[k];
	pion.classList.add("hop");
	pion.style.left = meta.left + "%";
	pion.style.top = meta.top + "%";
	sfxStep();
	await wait(HOP_MS);
	pion.classList.remove("hop");
	if (isLastHop) {
		pion.classList.add("landing");
		await wait(340);
		pion.classList.remove("landing");
	}
}

/* =========================================================
   DADU
   ========================================================= */

// Pola posisi titik/pip untuk tiap mata dadu pada grid 3x3
const PIP_PATTERNS = {
	1: [[2, 2]],
	2: [
		[1, 1],
		[3, 3]
	],
	3: [
		[1, 1],
		[2, 2],
		[3, 3]
	],
	4: [
		[1, 1],
		[1, 3],
		[3, 1],
		[3, 3]
	],
	5: [
		[1, 1],
		[1, 3],
		[2, 2],
		[3, 1],
		[3, 3]
	],
	6: [
		[1, 1],
		[1, 3],
		[2, 1],
		[2, 3],
		[3, 1],
		[3, 3]
	]
};

function buildDicePips() {
	for (let n = 1; n <= 6; n++) {
		const face = dice.querySelector(`.face-${n}`);
		if (!face) continue;
		PIP_PATTERNS[n].forEach(([row, col]) => {
			const pip = document.createElement("span");
			pip.className = "pip";
			pip.style.gridRow = String(row);
			pip.style.gridColumn = String(col);
			face.appendChild(pip);
		});
	}
}

function rollDiceTo(value) {
	return new Promise(resolve => {
		const base = DICE_FACE_TARGET[value];
		const target = {
			x: base.x + DICE_REST_TILT.x,
			y: base.y + DICE_REST_TILT.y
		};
		const spins = 2 + Math.floor(Math.random() * 2);
		const dirX = Math.random() < 0.5 ? 1 : -1;
		const dirY = Math.random() < 0.5 ? 1 : -1;
		const flyX = target.x + 360 * spins * dirX;
		const flyY = target.y + 360 * spins * dirY;

		dice.classList.add("is-rolling");
		dice.style.transition = `transform ${DICE_ROLL_MS}ms cubic-bezier(.22,.61,.22,1)`;
		// paksa reflow supaya transisi berikutnya selalu dianimasikan
		void dice.offsetWidth;
		dice.style.transform = `rotateX(${flyX}deg) rotateY(${flyY}deg)`;

		const onEnd = e => {
			if (e.propertyName !== "transform") return;
			dice.removeEventListener("transitionend", onEnd);
			dice.classList.remove("is-rolling");
			dice.style.transition = "none";
			dice.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg)`;
			void dice.offsetWidth;
			dice.style.transition = "";
			resolve();
		};
		dice.addEventListener("transitionend", onEnd);
	});
}

/* =========================================================
   KAMERA
   ========================================================= */

function triggerCameraRoll() {
	cameraRig.classList.remove("is-shaking");
	void cameraRig.offsetWidth;
	cameraRig.classList.add("is-rolling", "is-shaking");
}

function releaseCameraRoll() {
	cameraRig.classList.remove("is-rolling", "is-shaking");
}

/* =========================================================
   RENDER KONTEN
   ========================================================= */

function renderCover() {
	coverTitle.textContent = presentationConfig.title;
	coverGroup.textContent = presentationConfig.group;
	coverMembers.innerHTML = presentationConfig.members
		.map(m => `<li>${escapeHTML(m)}</li>`)
		.join("");

	finishView.hidden = true;
	slideView.hidden = true;
	coverView.hidden = false;
}

function buildBodyHTML(slide) {
	switch (slide.type) {
		case "two-column":
			return `<div class="content-columns">${slide.columns
				.map(
					c =>
						`<div class="col-block"><h3>${escapeHTML(c.title)}</h3><p>${escapeHTML(c.text)}</p></div>`
				)
				.join("")}</div>`;

		case "comparison":
			return `<div class="content-columns content-comparison">${slide.columns
				.map(
					c =>
						`<div class="col-block"><h3>${escapeHTML(c.label)}</h3><ul>${c.points
							.map(p => `<li>${escapeHTML(p)}</li>`)
							.join("")}</ul></div>`
				)
				.join("")}</div>`;

		case "process":
			return `<div class="content-process">${slide.steps
				.map(
					(s, i) =>
						`<div class="process-step"><span class="step-index">${i + 1}</span><span class="step-label">${escapeHTML(s)}</span></div>`
				)
				.join("")}</div>`;

		case "quiz":
			return `
        <div class="content-quiz">
          <p class="quiz-question">${escapeHTML(slide.question)}</p>
          <ul class="quiz-options">
            ${slide.options
				.map(
					(opt, i) =>
						`<li><button type="button" class="quiz-option" data-index="${i}">${escapeHTML(opt)}</button></li>`
				)
				.join("")}
          </ul>
          <div class="quiz-feedback" id="quizFeedback" hidden></div>
        </div>`;

		case "text":
		default: {
			let html = `<p>${escapeHTML(slide.content || "")}</p>`;
			if (slide.bullets && slide.bullets.length) {
				html += `<ul class="content-bullets">${slide.bullets
					.map(b => `<li>${escapeHTML(b)}</li>`)
					.join("")}</ul>`;
			}
			return html;
		}
	}
}

function bindQuizEvents(slide) {
	const options = slideBody.querySelectorAll(".quiz-option");
	const feedback = slideBody.querySelector("#quizFeedback");
	options.forEach(btn => {
		btn.addEventListener("click", () => {
			if (slideBody.classList.contains("quiz-locked")) return;
			slideBody.classList.add("quiz-locked");
			const chosen = Number(btn.dataset.index);
			options.forEach((o, i) => {
				if (i === slide.correctIndex) o.classList.add("correct");
				else if (i === chosen) o.classList.add("wrong");
			});
			feedback.hidden = false;
			feedback.textContent = slide.explanation || "";
			if (chosen === slide.correctIndex) sfxChime();
		});
	});
}

function renderSlide(index) {
	const slide = slides[index];
	coverView.hidden = true;
	finishView.hidden = true;
	slideView.hidden = false;

	slideIcon.innerHTML = ICONS[slide.icon] || ICONS.info;
	slideSubtitle.textContent = slide.subtitle || "";
	slideTitle.textContent = slide.title || "";
	slideTag.textContent = `Slide ${index + 1} / ${slides.length}`;
	slideBody.className = "slide-body";
	slideBody.innerHTML = buildBodyHTML(slide);

	// Re-trigger animasi fade-in
	slideView.style.animation = "none";
	void slideView.offsetWidth;
	slideView.style.animation = "";
	sfxWhoosh();

	if (slide.type === "quiz") bindQuizEvents(slide);
}

function showFinish() {
	coverView.hidden = true;
	slideView.hidden = true;
	finishView.hidden = false;
	sfxFanfare();
}

function updateProgressDots() {
	progressTrack.innerHTML = "";
	slides.forEach((_, i) => {
		const dot = document.createElement("span");
		dot.className = "progress-dot";
		if (i < currentSlideIndex) dot.classList.add("filled");
		if (i === currentSlideIndex) dot.classList.add("filled", "current");
		progressTrack.appendChild(dot);
	});
}

function updateBoardStatus() {
	const displayIndex = currentSlideIndex < 0 ? 0 : currentSlideIndex + 1;
	statusCurrent.textContent = String(displayIndex).padStart(2, "0");
	statusTotal.textContent = String(slides.length).padStart(2, "0");
	statusTile.textContent = String(currentBoardPos).padStart(2, "0");
}

function setRollBtnEnabled(enabled) {
	rollBtn.disabled = !enabled;
}

/* =========================================================
   ALUR UTAMA — ROLL & NAVIGASI
   ========================================================= */

async function handleRoll() {
	if (isAnimating) return;
	if (currentSlideIndex >= slides.length - 1) return;

	initAudio();
	sfxClick();

	isAnimating = true;
	setRollBtnEnabled(false);
	triggerCameraRoll();

	const nextIndex = currentSlideIndex + 1;
	const targetPos = slidePositions[nextIndex];
	const remaining = targetPos - currentBoardPos;

	if (remaining <= 0) {
		console.warn(
			`[board] slidePositions[${nextIndex}] (${targetPos}) tidak lebih besar dari posisi saat ini (${currentBoardPos}). Periksa urutan slidePositions — posisinya harus selalu naik.`
		);
	} else if (remaining > 6) {
		console.warn(
			`[board] Jarak ke milestone berikutnya adalah ${remaining} petak, melebihi nilai maksimum dadu (6). ` +
				`Sebaiknya sesuaikan "slidePositions" agar jarak antar milestone maksimal 6. ` +
				`Untuk saat ini pion tetap berpindah dalam satu kali lempar dadu (bukan beberapa kali lempar diam-diam).`
		);
	}

	const targetTile = tilesByIndex[targetPos];
	if (targetTile) targetTile.classList.add("is-active-target");

	// SATU kali lempar dadu per perpindahan slide. Nilai dadu dibatasi 1-6
	// (wajah fisik dadu), meskipun jarak sebenarnya (di luar kasus > 6 di atas)
	// sudah dirancang agar selalu pas dengan angka dadu yang tampil.
	const diceValue = Math.max(1, Math.min(6, remaining || 1));
	sfxDiceRoll();
	await rollDiceTo(diceValue);
	sfxDiceLand();

	let runningPos = currentBoardPos;
	const steps = Math.max(remaining, 0);
	for (let s = 0; s < steps; s++) {
		runningPos = (runningPos + 1) % TOTAL_TILES;
		const isLastHop = s === steps - 1;
		await hopPionTo(runningPos, isLastHop);
	}
	if (targetTile) targetTile.classList.remove("is-active-target");
	if (steps > 0) sfxChime();

	releaseCameraRoll();
	currentSlideIndex = nextIndex;
	currentBoardPos = targetPos;
	renderSlide(currentSlideIndex);
	updateProgressDots();
	updateBoardStatus();
	isAnimating = false;

	if (currentSlideIndex < slides.length - 1) {
		setRollBtnEnabled(true);
	} else {
		await wait(600);
		showFinish();
	}
}

async function handleBack() {
	if (isAnimating) return;

	// Jika sedang di layar FINISH, cukup kembali menampilkan slide terakhir
	if (!finishView.hidden) {
		finishView.hidden = true;
		slideView.hidden = false;
		return;
	}

	if (currentSlideIndex < 0) return; // sudah di cover, tidak ada yang bisa dikembalikan

	isAnimating = true;

	const prevIndex = currentSlideIndex - 1;
	const prevPos = prevIndex >= 0 ? slidePositions[prevIndex] : 0;
	let runningPos = currentBoardPos;
	const steps = currentBoardPos - prevPos;

	for (let s = 0; s < steps; s++) {
		runningPos = (runningPos - 1 + TOTAL_TILES) % TOTAL_TILES;
		await hopPionTo(runningPos, s === steps - 1);
	}

	currentBoardPos = prevPos;
	currentSlideIndex = prevIndex;

	if (currentSlideIndex === -1) {
		renderCover();
	} else {
		renderSlide(currentSlideIndex);
	}
	updateProgressDots();
	updateBoardStatus();
	setRollBtnEnabled(true);
	isAnimating = false;
}

function resetAll() {
	if (isAnimating) return;
	currentSlideIndex = -1;
	currentBoardPos = 0;
	placePionInstant(0);
	updateProgressDots();
	updateBoardStatus();
	renderCover();
	setRollBtnEnabled(true);
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

rollBtn.addEventListener("click", handleRoll);
restartBtn.addEventListener("click", resetAll);

rollBtn.addEventListener(
	"touchstart",
	() => rollBtn.classList.add("is-pressed"),
	{ passive: true }
);
rollBtn.addEventListener(
	"touchend",
	() => rollBtn.classList.remove("is-pressed"),
	{ passive: true }
);

document.addEventListener("keydown", e => {
	if (e.code === "Space" || e.code === "Enter") {
		e.preventDefault();
		handleRoll();
	} else if (e.code === "ArrowRight") {
		e.preventDefault();
		handleRoll();
	} else if (e.code === "ArrowLeft") {
		e.preventDefault();
		handleBack();
	}
});

/* =========================================================
   VALIDASI KONFIGURASI (console warning saja, tidak menghentikan)
   ========================================================= */

function validateSlidePositions() {
	if (slidePositions.length !== slides.length) {
		console.warn(
			`[board] Jumlah slidePositions (${slidePositions.length}) tidak sama dengan jumlah slides (${slides.length}).`
		);
	}
	let prev = 0;
	slidePositions.forEach((pos, i) => {
		const dist = pos - prev;
		if (dist > 6) {
			console.warn(
				`[board] Jarak dari petak ${prev} ke slidePositions[${i}] (${pos}) = ${dist}, melebihi 6.`
			);
		}
		if (dist <= 0) {
			console.warn(
				`[board] slidePositions[${i}] (${pos}) tidak naik dari petak sebelumnya (${prev}).`
			);
		}
		prev = pos;
	});
}

/* =========================================================
   INISIALISASI
   ========================================================= */

function init() {
	validateSlidePositions();
	buildBoard();
	buildDicePips();
	renderTableDecor();
	placePionInstant(0);
	document.querySelector(".finish-icon").innerHTML = ICONS.flag;
	renderCover();
	updateProgressDots();
	updateBoardStatus();
}

init();
