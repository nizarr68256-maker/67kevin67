/* ============================================================
   SLIDE 6 — GOTONG ROYONG DI ERA DIGITAL
   Refined stage navigation with popup support
   + digital collaboration flow (additive, does not touch
     stage-node logic, NEXT/BACK, or popup logic)
   ============================================================ */
(function () {
	"use strict";

	var slide = document.getElementById("slide6");
	if (!slide) return;

	var stageNodes = slide.querySelectorAll(".stage-node");
	var stageTexts = slide.querySelectorAll(".slide6-text");
	var stageVisuals = slide.querySelectorAll("[data-stage-visual]");
	var stagePopups = slide.querySelectorAll("[data-stage-popup]");
	var stageFlows = slide.querySelectorAll("[data-stage-flow]");

	var currentStage = 1;

	function setStage(stage) {
		if (stage < 1 || stage > 4) return;
		currentStage = stage;

		// Update nodes
		stageNodes.forEach(function (node) {
			var nodeStage = Number(node.getAttribute("data-stage"));
			node.classList.toggle("is-active", nodeStage === currentStage);
		});

		// Update description
		stageTexts.forEach(function (text) {
			var textStage = Number(text.getAttribute("data-stage-text"));
			text.classList.toggle("is-active", textStage === currentStage);
		});

		// Update visual elements (smartphone, network, etc.)
		stageVisuals.forEach(function (visual) {
			var visualStage = Number(visual.getAttribute("data-stage-visual"));
			visual.classList.toggle("is-visible", visualStage <= currentStage);
		});

		// Update popups (specific to each stage)
		stagePopups.forEach(function (popup) {
			var popupStage = Number(popup.getAttribute("data-stage-popup"));
			popup.classList.toggle("is-visible", popupStage === currentStage);
		});

		// Update digital collaboration flow (specific to each stage)
		stageFlows.forEach(function (flow) {
			var flowStage = Number(flow.getAttribute("data-stage-flow"));
			flow.classList.toggle("is-active", flowStage === currentStage);
		});
	}

	stageNodes.forEach(function (node) {
		node.addEventListener("click", function () {
			var stage = Number(node.getAttribute("data-stage"));
			setStage(stage);
		});

		node.addEventListener(
			"touchstart",
			function () {
				var stage = Number(node.getAttribute("data-stage"));
				setStage(stage);
			},
			{ passive: true }
		);
	});

	// Init
	setStage(1);
})();
