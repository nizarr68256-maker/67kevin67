/* ============================================================
   SLIDE 4 — NILAI TRADISI
   Entrance & hover sepenuhnya ditangani CSS (dipicu class
   "is-active" yang sudah dikelola slides.js). Script ini hanya
   menambahkan feedback sentuh yang lebih andal di touchscreen,
   karena :hover tidak selalu terpicu di layar sentuh.
   ============================================================ */
(function () {
    "use strict";

    var slide = document.getElementById("slide4");
    if (!slide) return;

    var pillars = slide.querySelectorAll(".pillar");

    pillars.forEach(function (pillar) {
        // Touch feedback
        pillar.addEventListener(
            "touchstart",
            function () {
                pillar.classList.add("is-touched");
            },
            { passive: true }
        );

        pillar.addEventListener(
            "touchend",
            function () {
                window.setTimeout(function () {
                    pillar.classList.remove("is-touched");
                }, 220);
            },
            { passive: true }
        );

        // Mouse feedback untuk desktop / hybrid
        pillar.addEventListener("mouseenter", function () {
            pillar.classList.add("is-touched");
        });
        pillar.addEventListener("mouseleave", function () {
            pillar.classList.remove("is-touched");
        });
    });
})();