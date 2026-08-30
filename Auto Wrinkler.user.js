// ==UserScript==
// @name        Auto Wrinkler
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     1.0.0
//
// @match       https://orteil.dashnet.org/cookieclicker/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Wrinkler.user.js
// @description Automatically manages wrinklers in Cookie Clicker
// ==/UserScript==
let autoWrinkler = {
	wrinklers: [],
	thresholdPercent: 0.5,
	updatePercent: 2.0,
	popWait: 20
};
function popWrinkler(id) {
	Game.wrinklers[id].hp = 0;

	autoWrinkler.wrinklers[id] = {
		threshold: 0,
		updateAt: 0,
		exists: false
	};

	setTimeout(() => {
		const wrinkler = Game.SpawnWrinkler();

		if (wrinkler) {
			autoWrinkler.wrinklers[wrinkler.id] = {
				threshold: (Game.cookies * autoWrinkler.thresholdPercent),
				updateAt: (Game.cookies * autoWrinkler.updatePercent),
				exists: true
			};
		} else {
			console.warn("Wrinkler couldn't be spawned");
		}
	}, autoWrinkler.popWait);
}
function checkWrinklers() {
	let bestId = -1;
	let bestSucked = 0;

	for (let i = 0; i < autoWrinkler.wrinklers.length; i++) {
		if (!autoWrinkler.wrinklers[i].exists) {
			continue;
		}

		if (Game.cookies <= autoWrinkler.wrinklers[i].threshold) {
			if (Game.wrinklers[i].sucked > bestSucked) {
				bestId = i;
				bestSucked = Game.wrinklers[i].sucked;
			}
		} else if (Game.cookies >= autoWrinkler.wrinklers[i].updateAt) {
			autoWrinkler.wrinklers[i].threshold = (Game.cookies * autoWrinkler.thresholdPercent);
			autoWrinkler.wrinklers[i].updateAt = (Game.cookies * autoWrinkler.updatePercent);
		}
	}

	if (bestId !== -1) {
		popWrinkler(bestId);
	}
}
function startWrinklers() {
	for (let i = 0; i < Game.wrinklers.length; i++) {
		if (Game.wrinklers[i].phase !== 0) {
			autoWrinkler.wrinklers.push({
				threshold: (Game.cookies * autoWrinkler.thresholdPercent),
				updateAt: (Game.cookies * autoWrinkler.updatePercent),
				exists: true
			});
		} else {
			autoWrinkler.wrinklers.push({
				threshold: 0,
				updateAt: 0,
				exists: false
			});
		}
	}

	while (true) {
		const wrinkler = Game.SpawnWrinkler();

		if (!wrinkler) {
			break;
		}

		autoWrinkler.wrinklers[wrinkler.id] = {
			threshold: (Game.cookies * autoWrinkler.thresholdPercent),
			updateAt: (Game.cookies * autoWrinkler.updatePercent),
			exists: true
		}
	}

	setInterval(checkWrinklers, 1000);
}
function waitForGame() {
	if (typeof Game !== "undefined" &&
		typeof Game.CollectWrinklers === "function" &&
		Array.isArray(Game.wrinklers)) {

		startWrinklers();
	} else {
		setTimeout(waitForGame, 100);
	}
}

waitForGame();