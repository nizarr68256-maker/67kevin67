(function () {
    "use strict";

    var slide = document.getElementById("slide8");
    if (!slide) return;

    var viewport = document.getElementById("slide8Viewport");
    var pointsContainer = document.getElementById("slide8Points");
    var nextBtn = document.getElementById("nextBtn");

    var pointsData = [
        { number: "01", text: "Terbuka terhadap perkembangan zaman." },
        { number: "02", text: "Mempelajari teknologi dan ilmu pengetahuan." },
        { number: "03", text: "Berpikir kritis terhadap perubahan." },
        { number: "04", text: "Memilih tradisi yang memiliki nilai positif untuk dipertahankan." },
        { number: "05", text: "Melestarikan budaya dengan cara-cara yang kreatif dan modern." }
    ];

    // Bangun elemen poin
    pointsData.forEach(function (point) {
        var div = document.createElement("div");
        div.className = "slide8-point";
        div.innerHTML =
            '<span class="slide8-point__number">' + point.number + '</span>' +
            '<span class="slide8-point__text">' + point.text + '</span>';
        pointsContainer.appendChild(div);
    });

    var pointEls = Array.prototype.slice.call(
        pointsContainer.querySelectorAll(".slide8-point")
    );

    var isRunning = false;      // sequence poin sedang berjalan
    var isPanning = false;      // pan sedang berlangsung
    var isPanned = false;       // pan sudah selesai
    var timers = [];

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
    }

    function showPoint(index) {
        if (index >= pointEls.length) {
            // Semua poin sudah tampil
            isRunning = false;
            document.body.classList.remove("slide8-lock");
            return;
        }

        var current = pointEls[index];
        current.classList.add("is-visible");

        // Tampilkan poin berikutnya setelah 600ms
        var nextTimer = setTimeout(function () {
            showPoint(index + 1);
        }, 600);
        timers.push(nextTimer);
    }

    function startSequence() {
        if (isRunning) return;
        isRunning = true;
        clearTimers();
        document.body.classList.add("slide8-lock");

        // Reset poin
        pointEls.forEach(function (el) {
            el.classList.remove("is-visible");
        });

        // Reset pan state (jika slide diaktifkan ulang)
        if (isPanned) {
            isPanned = false;
            viewport.classList.remove("is-panned");
        }

        // Mulai poin setelah jeda 1 detik (headline sudah dianimasikan via CSS)
        var startTimer = setTimeout(function () {
            showPoint(0);
        }, 1000);
        timers.push(startTimer);
    }

    function stopSequence() {
        clearTimers();
        isRunning = false;
        document.body.classList.remove("slide8-lock");
        // Jangan reset pan di sini, karena saat slide tidak aktif pan tidak digunakan
    }

    function startPan() {
        if (isPanning || isPanned) return;
        isPanning = true;
        document.body.classList.add("slide8-lock"); // kunci input selama pan

        // Terapkan class untuk memicu transisi CSS
        viewport.classList.add("is-panned");

        // Setelah durasi transisi selesai (1.4s), tandai selesai
        var panEndTimer = setTimeout(function () {
            isPanning = false;
            isPanned = true;
            document.body.classList.remove("slide8-lock"); // input bisa dibuka lagi (tidak ada aksi lebih lanjut)
            // Nonaktifkan nextBtn agar tidak ada aksi lebih lanjut (opsional)
            if (nextBtn) nextBtn.disabled = true;
        }, 1400); // sesuai durasi CSS

        timers.push(panEndTimer);
    }

    // Deteksi tombol NEXT saat slide 8 aktif
    function onNextClick(e) {
        if (!slide.classList.contains("is-active")) return;

        if (!isPanned && !isPanning) {
            // Jika belum pan, cegah slides.js dan lakukan pan
            e.stopImmediatePropagation();
            e.preventDefault();
            startPan();
        } else if (isPanning) {
            // Selama pan, blokir semua klik
            e.stopImmediatePropagation();
            e.preventDefault();
        } else {
            // Setelah pan selesai, blokir juga (tidak ada slide berikutnya)
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    // Pasang listener di nextBtn (akan dipanggil setelah listener slides.js karena di-load belakangan)
    if (nextBtn) {
        nextBtn.addEventListener("click", onNextClick);
    }

    // Deteksi aktivasi slide
    var wasActive = slide.classList.contains("is-active");
    function handleActivation(isActiveNow) {
        if (isActiveNow) {
            startSequence();
        } else {
            stopSequence();
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

    // Jika slide sudah aktif saat load
    if (wasActive) {
        handleActivation(true);
    }
})();