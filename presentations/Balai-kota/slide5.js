/* ============================================================
   SLIDE 5 — TEKNOLOGI & BUDAYA
   Stage adalah state INTERNAL Slide 5 (bukan slide baru).
   File ini TIDAK mengubah logic Next/Back global maupun
   navigasi antar-slide (#slideNav, backBtn, nextBtn).

   Tidak ada perubahan logic pada file ini — markup baru
   (deskripsi terpisah di .slide5-description-center, network
   stream) tetap memakai selector [data-stage-text] dan
   [data-stage-visual] yang sama, jadi script lama tetap valid.
   ============================================================ */
(function () {
    "use strict";

    var slide = document.getElementById("slide5");
    if (!slide) return;

    var stageNodes = Array.prototype.slice.call(slide.querySelectorAll(".stage-node"));
    var stageTexts = Array.prototype.slice.call(slide.querySelectorAll(".slide5-text"));
    // Elemen progresif: HP, Network, Globe — masing-masing punya data-stage-visual
    // yang menandai stage minimum di mana elemen tsb mulai tampil dan TETAP
    // tampil di stage-stage berikutnya (foto & elemen sebelumnya tidak pernah hilang).
    var stageVisuals = Array.prototype.slice.call(slide.querySelectorAll("[data-stage-visual]"));

    var currentStage = 1;
    var MIN_STAGE = 1;
    var MAX_STAGE = 4;

    function setStage(stage) {
        stage = Number(stage);
        if (!stage || stage < MIN_STAGE || stage > MAX_STAGE) return;
        currentStage = stage;

        // Update node navigator aktif
        stageNodes.forEach(function (node) {
            var nodeStage = Number(node.getAttribute("data-stage"));
            var isActive = nodeStage === currentStage;
            node.classList.toggle("is-active", isActive);
            node.setAttribute("aria-current", isActive ? "true" : "false");
        });

        // Update deskripsi (center-bottom, satu yang aktif pada satu waktu)
        stageTexts.forEach(function (text) {
            var textStage = Number(text.getAttribute("data-stage-text"));
            text.classList.toggle("is-active", textStage === currentStage);
        });

        // Update visibilitas HP / popup / network / globe secara kumulatif & progresif.
        // Foto (anchor) tidak termasuk di sini karena selalu tampil di semua stage.
        stageVisuals.forEach(function (visual) {
            var visualStage = Number(visual.getAttribute("data-stage-visual"));
            visual.classList.toggle("is-visible", currentStage >= visualStage);
        });
    }

    function bindStageNode(node) {
        var activate = function (evt) {
            if (evt) evt.preventDefault();
            var stage = node.getAttribute("data-stage");
            setStage(stage);
        };
        node.addEventListener("click", activate);
        node.addEventListener("touchstart", activate, { passive: false });
    }

    stageNodes.forEach(bindStageNode);

    // Reset ke Stage 1 setiap kali Slide 5 kembali menjadi slide aktif,
    // supaya urutan cerita (Budaya -> Konten -> Sosial -> Dunia) konsisten
    // setiap presentasi dimulai ulang pada slide ini.
    var slideObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.attributeName === "class") {
                var justBecameActive =
                    slide.classList.contains("is-active") &&
                    !m.oldValue.split(" ").includes("is-active");
                if (justBecameActive) {
                    setStage(1);
                }
            }
        });
    });
    slideObserver.observe(slide, { attributes: true, attributeOldValue: true });

    // Inisialisasi stage 1
    setStage(1);
})();
