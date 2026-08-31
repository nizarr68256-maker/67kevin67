/* ============================================================
   SLIDE 2 — SPIN WHEEL
   ============================================================ */
(function () {
    "use strict";

    var SEGMENTS = ["Teknologi", "Cara Berpikir", "Ilmu Pengetahuan", "Inovasi"];
    var SPIN_STEP = 90;
    var SPIN_DURATION_MS = 1150; // harus sama dengan --spin-duration di CSS

    var wheelEl = document.getElementById("wheel");
    var spinBtn = document.getElementById("spinBtn");
    if (!wheelEl || !spinBtn) return;

    var panels = Array.prototype.slice.call(document.querySelectorAll("#slide2 .content-panel"));
    var wheelNodes = Array.prototype.slice.call(document.querySelectorAll("#slide2 .wheel-node"));
    var dots = Array.prototype.slice.call(document.querySelectorAll("#slide2 .progress-track .dot"));
    var announce = document.getElementById("activeAnnounce");

    var currentIndex = 0;
    var spinDeg = 0;
    var isAnimating = false;
    var spinFallbackTimer = null;

    function setActiveVisuals(index) {
        panels.forEach(function (panel) {
            var match = Number(panel.getAttribute("data-index")) === index;
            panel.classList.toggle("is-active", match);
        });
        wheelNodes.forEach(function (node) {
            var match = Number(node.getAttribute("data-index")) === index;
            node.classList.toggle("is-active", match);
        });
        dots.forEach(function (dot, i) {
            dot.classList.toggle("is-active", i === index);
        });
        if (announce) {
            announce.textContent = SEGMENTS[index];
        }
    }

    function handleSpinComplete() {
        if (!isAnimating) return;
        if (spinFallbackTimer) {
            clearTimeout(spinFallbackTimer);
            spinFallbackTimer = null;
        }
        var nextIndex = (currentIndex + 1) % SEGMENTS.length;
        currentIndex = nextIndex;
        setActiveVisuals(currentIndex);
        isAnimating = false;
        spinBtn.disabled = false;
    }

    function spinToNext() {
        if (isAnimating) return;
        isAnimating = true;
        spinBtn.disabled = true;
        spinDeg += SPIN_STEP;
        wheelEl.style.setProperty("--spin", spinDeg + "deg");
        spinFallbackTimer = setTimeout(function () {
            handleSpinComplete();
        }, SPIN_DURATION_MS + 200);
    }

    wheelEl.addEventListener("transitionend", function (e) {
        if (e.target === wheelEl && e.propertyName === "transform") {
            handleSpinComplete();
        }
    });

    spinBtn.addEventListener("click", spinToNext);

    // Inisialisasi state awal
    setActiveVisuals(currentIndex);
})();