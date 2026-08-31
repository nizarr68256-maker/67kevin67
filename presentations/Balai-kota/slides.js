/* ============================================================
   SLIDES NAVIGATION SYSTEM
   + STATE PERSISTENCE & REFRESH BUTTON
   ============================================================ */
(function () {
	"use strict";

	var STORAGE_KEY = "presentation_state_v1";

	var slides = Array.prototype.slice.call(
		document.querySelectorAll(".slide")
	);
	var slideNav = document.getElementById("slideNav");
	var nextBtn = document.getElementById("nextBtn");
	var backBtn = document.getElementById("backBtn");
	var refreshBtn = document.getElementById("refreshBtn");

	var slide8Panned = false;

	// ---------------------------------------------------------
	// Inisialisasi navigasi
	// ---------------------------------------------------------
	if (slideNav && slides.length > 0) {
		slides.forEach(function (_, index) {
			var dot = document.createElement("button");
			dot.className = "slide-nav__dot";
			dot.setAttribute("data-slide-index", index);
			dot.setAttribute("aria-label", "Ke slide " + (index + 1));
			dot.addEventListener("click", function () {
				goToSlide(index);
			});
			slideNav.appendChild(dot);
		});
	}

	// ---------------------------------------------------------
	// State helpers
	// ---------------------------------------------------------
	function saveState(index, panned) {
		var state = { slideIndex: index, slide8Panned: !!panned };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

	function loadState() {
		try {
			var raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			var state = JSON.parse(raw);
			if (typeof state.slideIndex !== "number") return null;
			return state;
		} catch (e) {
			return null;
		}
	}

	// ---------------------------------------------------------
	// Navigasi
	// ---------------------------------------------------------
	function goToSlide(index) {
		if (index < 0 || index >= slides.length) return;

		slides.forEach(function (slide, i) {
			slide.classList.toggle("is-active", i === index);
		});

		updateSlideNav(index);
		updateButtons(index);

		saveState(index, slide8Panned);
	}

	function updateSlideNav(activeIndex) {
		if (!slideNav) return;
		var navDots = Array.prototype.slice.call(
			slideNav.querySelectorAll(".slide-nav__dot")
		);
		navDots.forEach(function (dot, i) {
			dot.classList.toggle("is-active", i === activeIndex);
		});
	}

	function updateButtons(activeIndex) {
		if (nextBtn) {
			var isLast = activeIndex >= slides.length - 1;
			var isSlide8 = activeIndex === slides.length - 1;
			if (isLast && !isSlide8) {
				nextBtn.disabled = true;
			} else {
				nextBtn.disabled = false;
			}
		}
		if (backBtn) {
			backBtn.disabled = activeIndex <= 0;
		}
	}

	// ---------------------------------------------------------
	// Event tombol NEXT/BACK
	// ---------------------------------------------------------
	if (nextBtn) {
		nextBtn.addEventListener("click", function () {
			var currentActive = slides.findIndex(function (slide) {
				return slide.classList.contains("is-active");
			});
			if (currentActive < slides.length - 1) {
				goToSlide(currentActive + 1);
			}
		});
	}

	if (backBtn) {
		backBtn.addEventListener("click", function () {
			var currentActive = slides.findIndex(function (slide) {
				return slide.classList.contains("is-active");
			});
			if (currentActive > 0) {
				goToSlide(currentActive - 1);
			}
		});
	}

	// ---------------------------------------------------------
	// Tombol Refresh
	// ---------------------------------------------------------
	if (refreshBtn) {
		refreshBtn.addEventListener("click", function () {
			location.reload();
		});
	}

	// ---------------------------------------------------------
	// Mendengarkan event pan dari slide8.js
	// ---------------------------------------------------------
	window.addEventListener("slide8Panned", function () {
		slide8Panned = true;
		var idx = slides.findIndex(function (s) {
			return s.id === "slide8";
		});
		if (idx !== -1) {
			saveState(idx, true);
		}
	});

	// ---------------------------------------------------------
	// Restore state setelah load
	// ---------------------------------------------------------
	function restoreState() {
		var state = loadState();
		if (!state) return;

		var targetIndex = state.slideIndex;
		if (targetIndex < 0 || targetIndex >= slides.length) return;

		if (state.slideIndex === slides.length - 1 && state.slide8Panned) {
			var slide8 = document.getElementById("slide8");
			if (slide8) {
				slide8.classList.add("restore-panned");
			}
			slide8Panned = true;
		}

		goToSlide(targetIndex);
	}

	// ---------------------------------------------------------
	// Inisialisasi
	// ---------------------------------------------------------
	var initialActive = slides.findIndex(function (s) {
		return s.classList.contains("is-active");
	});
	if (initialActive === -1) initialActive = 0;

	if (loadState()) {
		restoreState();
	} else {
		saveState(initialActive, false);
		goToSlide(initialActive);
	}

	// Expose goToSlide (untuk slide7)
	window.__goToSlide = goToSlide;
})();
