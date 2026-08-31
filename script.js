document.addEventListener("DOMContentLoaded", () => {
	/* ==========================================================
	   GENERATE STARFIELD
	   ========================================================== */
	const starfield = document.getElementById("starfield");
	const STAR_COUNT = 160;
	const fragment = document.createDocumentFragment();

	for (let i = 0; i < STAR_COUNT; i++) {
		const star = document.createElement("span");
		star.className = "star";

		const size = (Math.random() * 1.6 + 0.6).toFixed(2);
		const top = (Math.random() * 100).toFixed(2);
		const left = (Math.random() * 100).toFixed(2);
		const baseOpacity = (Math.random() * 0.6 + 0.25).toFixed(2);
		const duration = (Math.random() * 5 + 3).toFixed(2);
		const delay = (Math.random() * 6).toFixed(2);

		star.style.width = `${size}px`;
		star.style.height = `${size}px`;
		star.style.top = `${top}%`;
		star.style.left = `${left}%`;
		star.style.setProperty("--base-opacity", baseOpacity);
		star.style.animationDuration = `${duration}s`;
		star.style.animationDelay = `${delay}s`;

		fragment.appendChild(star);
	}

	starfield.appendChild(fragment);

	/* ==========================================================
	   TOMBOL PLAY
	   ========================================================== */
	const playButton = document.getElementById("playButton");
	let transitionStarted = false;

	playButton.addEventListener("click", () => {
		if (transitionStarted) return;
		transitionStarted = true;
		startEarthToCityTransition();
	});

	/* ==========================================================
	   SIDE GRADIENT STATE
	   ========================================================== */
	let sideGradientVisible = false;

	/* ==========================================================
	   EARTH → CITY — CINEMATIC TRANSITION
	   ========================================================== */
	function startEarthToCityTransition() {
		const app = document.querySelector(".app");
		const earthStage = document.getElementById("earthStage");
		const cityStage = document.getElementById("cityStage");
		const cityCanvas = document.getElementById("cityCanvas");
		const flash = document.getElementById("transitionFlash");

		if (!app || !earthStage || !cityStage || !cityCanvas || !flash) {
			console.warn("Transition: elemen yang dibutuhkan tidak ditemukan.");
			return;
		}

		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;

		const GLOW_RAMP_START = 1400;
		const GLOW_RAMP_DURATION = 1000;
		const CLOUD_DIVE_START = 1850;
		const CLOUD_DIVE_DURATION = 850;
		const FLASH_IN_START = 1900;
		const CITY_INIT_START = 2350;
		// FLASH_OUT_START dihapus — sekarang flash dihilangkan setelah city siap/gagal

		app.classList.add("is-launching");
		earthStage.classList.add("is-launching");
		earthStage.style.transform = "scale(7)";
		earthStage.style.filter = "brightness(1.35) blur(1.5px)";

		if (!reduceMotion && window.__earthTransition) {
			setTimeout(
				() => window.__earthTransition.rampGlow(GLOW_RAMP_DURATION),
				GLOW_RAMP_START
			);
			setTimeout(
				() =>
					window.__earthTransition.diveThroughClouds(
						CLOUD_DIVE_DURATION
					),
				CLOUD_DIVE_START
			);
		}

		setTimeout(() => {
			flash.classList.add("is-active");
		}, FLASH_IN_START);

		setTimeout(() => {
			// Hentikan Earth loop
			if (typeof window.__stopEarthRendering === "function") {
				window.__stopEarthRendering();
			}

			const maxWait = 3000;
			const startWait = performance.now();

			function tryInitCity() {
				if (
					window.CityWorld &&
					typeof window.CityWorld.initCity === "function"
				) {
					let initSuccess = false;

					try {
						// initCity sekarang mengembalikan boolean
						initSuccess = window.CityWorld.initCity(cityCanvas, cityStage);
					} catch (e) {
						console.error("[Transition] Exception saat initCity:", e);
						initSuccess = false;
					}

					if (initSuccess) {
						console.log("[Transition] City berhasil diinisialisasi.");

						// Set callback untuk side gradient
						if (
							typeof window.CityWorld.setCameraIntroDoneCallback === "function"
						) {
							window.CityWorld.setCameraIntroDoneCallback(showSideGradient);
						}

						// Inisialisasi CityUI (hamburger)
						if (window.CityUI && typeof window.CityUI.init === "function") {
							try {
								const uiInitSuccess = window.CityUI.init({
									onSelect: function (building) {
										console.log("[CityUI] selected:", building.id);
									}
								});

								if (!uiInitSuccess) {
									console.warn(
										"[Transition] CityUI.init gagal, hamburger mungkin tidak muncul."
									);
								}
							} catch (uiError) {
								console.error("[Transition] CityUI.init error:", uiError);
							}
						}

						// Tampilkan city stage
						cityStage.classList.add("is-visible");
						showCityIntroOverlay();

						// Hapus flash putih — city sudah siap
						flash.classList.remove("is-active");

						// Lepaskan renderer Earth setelah transisi aman
						if (typeof window.__disposeEarthRenderer === "function") {
							setTimeout(() => {
								window.__disposeEarthRenderer();
							}, 100);
						}
					} else {
						// City gagal → jangan stuck di layar putih
						console.error("[Transition] CityWorld.initCity gagal.");
						flash.classList.remove("is-active");
					}
				} else if (performance.now() - startWait < maxWait) {
					// Coba lagi setiap 100ms
					setTimeout(tryInitCity, 100);
				} else {
					console.error(
						"[Transition] window.CityWorld tidak tersedia setelah menunggu 3 detik."
					);
					flash.classList.remove("is-active");
				}
			}

			tryInitCity();
		}, CITY_INIT_START);
	}

	/* ==========================================================
	   CITY INTRO OVERLAY (gradient atas-bawah + teks MODERNISASI)
	   ========================================================== */
	function showCityIntroOverlay() {
		let overlay = document.getElementById("cityIntroOverlay");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "cityIntroOverlay";
			overlay.className = "city-intro-overlay";
			overlay.innerHTML = `
				<div class="city-intro-overlay__text">
					<span class="city-intro-overlay__label">MODERNISASI</span>
				</div>
			`;
			document.body.appendChild(overlay);
		}

		overlay.classList.remove("is-hidden");
		overlay.classList.add("is-visible");

		setTimeout(() => {
			overlay.classList.remove("is-visible");
			overlay.classList.add("is-hidden");
			setTimeout(() => overlay.remove(), 1500);
		}, 5000);
	}

	/* ==========================================================
	   SIDE GRADIENT (kanan) — muncul setelah kamera intro selesai
	   ========================================================== */
	function createSideGradient() {
		let el = document.getElementById("citySideGradient");
		if (el) return el;

		el = document.createElement("div");
		el.id = "citySideGradient";
		el.className = "city-side-gradient";

		el.innerHTML = `
			<div class="city-side-gradient__content">
				<h2 class="city-side-gradient__headline city-side-gradient__headline--blue">miskonsepsi</h2>
				<h2 class="city-side-gradient__headline city-side-gradient__headline--yellow">modern adalah meninggalkan tradisi</h2>
				<p class="city-side-gradient__subtitle">Anggota</p>
				<ul class="city-side-gradient__list">
					<li class="city-side-gradient__list-item">1. Sea ega adi pratama (01)</li>
					<li class="city-side-gradient__list-item">2. Bagas dwi Kurniawan (06)</li>
					<li class="city-side-gradient__list-item">3. Elvira Fitri Khumaira (10)</li>
					<li class="city-side-gradient__list-item">4. Juike putri Sari (15)</li>
					<li class="city-side-gradient__list-item">5. M. Tsaqif Annizar (24)</li>
					<li class="city-side-gradient__list-item">6. Nur Johan Fannani (28)</li>
					<li class="city-side-gradient__list-item">7. Siti Aneyra Azzahirra Putri (31)</li>
					<li class="city-side-gradient__list-item">8. Wilda Safirah Haqiqi (34)</li>
				</ul>
			</div>
		`;

		document.body.appendChild(el);
		return el;
	}

	function showSideGradient() {
		if (sideGradientVisible) return;
		const el = createSideGradient();
		el.classList.remove("is-hidden");
		void el.offsetWidth; // trigger reflow
		el.classList.add("is-visible");
		sideGradientVisible = true;
	}

	function hideSideGradient() {
		if (!sideGradientVisible) return;
		const el = document.getElementById("citySideGradient");
		if (!el) return;
		el.classList.remove("is-visible");
		el.classList.add("is-hidden");
		sideGradientVisible = false;
		setTimeout(() => {
			if (el.parentNode) el.parentNode.removeChild(el);
		}, 800);
	}

	// Expose ke global agar bisa dipanggil dari city-ui.js
	window.hideSideGradient = hideSideGradient;

	/* ==========================================================
	   BUMI 3D PHOTOREALISTIC
	   ========================================================== */
	initEarth();

	function initEarth() {
		const stage = document.getElementById("earthStage");
		const canvas = document.getElementById("earthCanvas");

		if (!stage || !canvas || typeof THREE === "undefined") {
			console.warn(
				"Earth: Three.js tidak tersedia, render Bumi dilewati."
			);
			return;
		}

		let renderer;
		try {
			renderer = new THREE.WebGLRenderer({
				canvas,
				alpha: true,
				antialias: true
			});
		} catch (err) {
			console.warn("Earth: WebGL tidak didukung di browser ini.", err);
			return;
		}

		// 🧹 Fungsi untuk melepas renderer Earth (dipanggil setelah city siap)
		window.__disposeEarthRenderer = function () {
			try {
				renderer.dispose();
				console.log("Earth renderer disposed.");
			} catch (e) {
				console.warn("Gagal dispose Earth renderer:", e);
			}
		};

		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(0, 0, 2.7);

		const sunLight = new THREE.DirectionalLight(0xffffff, 3.1);
		sunLight.position.set(-2.4, 1.1, 3.2);
		scene.add(sunLight);

		const fillLight = new THREE.AmbientLight(0x2c3a55, 0.42);
		scene.add(fillLight);

		const earthGroup = new THREE.Group();
		earthGroup.rotation.z = (23.4 * Math.PI) / 180;
		scene.add(earthGroup);

		const RADIUS = 1;
		const textureLoader = new THREE.TextureLoader();
		textureLoader.crossOrigin = "anonymous";

		const TEX_BASE =
			"https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/";

		let loadedCount = 0;
		const TOTAL_TEX = 3;
		function textureReady() {
			loadedCount += 1;
			if (loadedCount >= TOTAL_TEX) {
				stage.classList.add("is-ready");
			}
		}
		setTimeout(() => stage.classList.add("is-ready"), 2500);

		const dayMap = textureLoader.load(
			TEX_BASE + "earth_atmos_2048.jpg",
			textureReady,
			undefined,
			textureReady
		);
		const specularMap = textureLoader.load(
			TEX_BASE + "earth_specular_2048.jpg",
			textureReady,
			undefined,
			textureReady
		);
		const cloudsMap = textureLoader.load(
			TEX_BASE + "earth_clouds_1024.png",
			textureReady,
			undefined,
			textureReady
		);

		const earthMaterial = new THREE.MeshPhongMaterial({
			map: dayMap,
			specularMap: specularMap,
			specular: new THREE.Color(0x2a3040),
			shininess: 9
		});
		const earthMesh = new THREE.Mesh(
			new THREE.SphereGeometry(RADIUS, 96, 96),
			earthMaterial
		);
		earthGroup.add(earthMesh);

		const cloudMaterial = new THREE.MeshPhongMaterial({
			map: cloudsMap,
			transparent: true,
			opacity: 0.55,
			depthWrite: false
		});
		const cloudMesh = new THREE.Mesh(
			new THREE.SphereGeometry(RADIUS * 1.008, 96, 96),
			cloudMaterial
		);
		earthGroup.add(cloudMesh);

		const atmosphereMaterial = new THREE.ShaderMaterial({
			vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize( normalMatrix * normal );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
			fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.6);
          rim = clamp(rim, 0.0, 1.0);
          vec3 glowColor = vec3(0.35, 0.62, 1.0);
          gl_FragColor = vec4(glowColor * rim, rim * 0.85);
        }
      `,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide,
			transparent: true,
			depthWrite: false
		});
		atmosphereMaterial.uniforms = { uGlow: { value: 1.0 } };
		atmosphereMaterial.fragmentShader = `
      uniform float uGlow;
      varying vec3 vNormal;
      void main() {
        float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.6);
        rim = clamp(rim, 0.0, 1.0) * uGlow;
        vec3 glowColor = vec3(0.35, 0.62, 1.0);
        gl_FragColor = vec4(glowColor * rim, rim * 0.85);
      }
    `;
		atmosphereMaterial.needsUpdate = true;

		const atmosphereMesh = new THREE.Mesh(
			new THREE.SphereGeometry(RADIUS * 1.16, 96, 96),
			atmosphereMaterial
		);
		scene.add(atmosphereMesh);

		function makeCloudSpriteTexture() {
			const c = document.createElement("canvas");
			c.width = c.height = 128;
			const ctx = c.getContext("2d");
			const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
			grad.addColorStop(0, "rgba(255,255,255,0.9)");
			grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
			grad.addColorStop(1, "rgba(255,255,255,0)");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, 128, 128);
			return new THREE.CanvasTexture(c);
		}

		const cloudSpriteTex = makeCloudSpriteTexture();
		const cloudWispGroup = new THREE.Group();
		const cloudWisps = [];
		const CLOUD_WISP_COUNT = 14;

		for (let i = 0; i < CLOUD_WISP_COUNT; i++) {
			const mat = new THREE.SpriteMaterial({
				map: cloudSpriteTex,
				color: 0xeaf4ff,
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending
			});
			const sprite = new THREE.Sprite(mat);

			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(Math.random() * 2 - 1);
			const r = RADIUS * (1.02 + Math.random() * 0.06);
			sprite.position.set(
				r * Math.sin(phi) * Math.cos(theta),
				r * Math.sin(phi) * Math.sin(theta),
				r * Math.cos(phi)
			);

			const scale = RADIUS * (0.3 + Math.random() * 0.5);
			sprite.scale.set(scale, scale, 1);
			sprite.userData.baseScale = scale;
			sprite.userData.baseZ = sprite.position.z;
			sprite.userData.diveSpeed = 0.6 + Math.random() * 0.9;

			cloudWispGroup.add(sprite);
			cloudWisps.push(sprite);
		}
		scene.add(cloudWispGroup);

		function rampGlow(duration) {
			const start = performance.now();
			const from = atmosphereMaterial.uniforms.uGlow.value;
			const peak = 1.8;
			function step(now) {
				const t = Math.min((now - start) / duration, 1);
				const value =
					t < 0.4
						? from + (peak - from) * (t / 0.4)
						: peak - (peak - 0.9) * ((t - 0.4) / 0.6);
				atmosphereMaterial.uniforms.uGlow.value = value;
				if (t < 1) requestAnimationFrame(step);
			}
			requestAnimationFrame(step);
		}

		function diveThroughClouds(duration) {
			const start = performance.now();
			function step(now) {
				const t = Math.min((now - start) / duration, 1);
				const ease = t * t * (3 - 2 * t);

				cloudWisps.forEach(sprite => {
					const localT = Math.min(
						ease * sprite.userData.diveSpeed,
						1
					);
					const growth = 1 + localT * 5.5;
					sprite.scale.set(
						sprite.userData.baseScale * growth,
						sprite.userData.baseScale * growth,
						1
					);
					sprite.position.z = sprite.userData.baseZ + localT * 2.4;
					sprite.material.opacity =
						Math.sin(Math.min(localT, 1) * Math.PI) * 0.85;
				});

				if (t < 1) requestAnimationFrame(step);
			}
			requestAnimationFrame(step);
		}

		window.__earthTransition = { rampGlow, diveThroughClouds };

		/* ---------- Resize ---------- */
		function resize() {
			const w = stage.clientWidth || 1;
			const h = stage.clientHeight || 1;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
		resize();
		window.addEventListener("resize", resize);

		/* ---------- Rotasi ---------- */
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		const EARTH_SPIN = reduceMotion ? 0 : 0.00085;
		const CLOUD_SPIN = reduceMotion ? 0 : 0.00125;

		let earthStopped = false;
		let earthAnimationId = null;

		function animate() {
			if (earthStopped) return;
			earthAnimationId = requestAnimationFrame(animate);
			earthMesh.rotation.y += EARTH_SPIN;
			cloudMesh.rotation.y += CLOUD_SPIN;
			renderer.render(scene, camera);
		}
		animate();

		window.__stopEarthRendering = function () {
			earthStopped = true;
			if (earthAnimationId) {
				cancelAnimationFrame(earthAnimationId);
				earthAnimationId = null;
			}
		};
	}
});

// ===== AUDIO BACKGROUND =====
(function() {
  let bgAudio = null;
  let audioStarted = false;

  function initAudio() {
    if (!bgAudio) {
      bgAudio = new Audio('audio/background.mp3'); // sesuaikan path file audio
      bgAudio.loop = true;
      bgAudio.volume = 0.5; // atur volume sesuai kebutuhan
    }
  }

  function startBackgroundAudio() {
    initAudio();
    if (!audioStarted && bgAudio) {
      bgAudio.play().catch(err => {
        console.warn('Audio tidak dapat diputar:', err);
      });
      audioStarted = true;
    }
  }

  const playButton = document.getElementById('playButton');
  if (playButton) {
    playButton.addEventListener('click', startBackgroundAudio);
  }
})();