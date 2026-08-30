// ==UserScript==
// @name        Auto Wrinkle
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     0.1.4
//
// @match       https://orteil.dashnet.org/cookieclicker/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Wrinkle.user.js
// @description Automatically manages wrinklers in Cookie Clicker
// ==/UserScript==
let autoWrinkle = {
	wrinklers: [],
	thresholdPercent: 0.5,
	updatePercent: 2.0,
	popWait: 20
};
function popWrinkler(id) {
	Game.wrinklers[id].hp = 0;

	autoWrinkle.wrinklers[id] = {
		threshold: 0,
		updateAt: 0,
		exists: false
	}
	
	setTimeout(() => {
		if (Game.SpawnWrinkler()) {
			for (let i = 0; i < Game.wrinklers.length; i++) {
				if (!autoWrinkle.wrinklers[i].exists && Game.wrinklers[i].phase !== 0) {
					autoWrinkle.wrinklers[i] = {
						threshold: (Game.cookies * autoWrinkle.thresholdPercent),
						updateAt: (Game.cookies * autoWrinkle.updatePercent),
						exists: true
					};

					break;
				}
			}
		}
	}, autoWrinkle.popWait)
}
function checkWrinklers() {
	for (let i = 0; i < autoWrinkle.wrinklers.length; i++) {
		if (!autoWrinkle.wrinklers[i].exists) {
			continue;
		}

		if (Game.cookies <= autoWrinkle.wrinklers[i].threshold) {
			popWrinkler(i);

			break;
		} else if (Game.cookies >= autoWrinkle.wrinklers[i].updateAt) {
			autoWrinkle.wrinklers[i].threshold = (Game.cookies * autoWrinkle.thresholdPercent);
			autoWrinkle.wrinklers[i].updateAt = (Game.cookies * autoWrinkle.updatePercent);
		}
	}
}
function startWrinklers() {
	Game.CollectWrinklers();

	for (let i = 0; i < Game.wrinklers.length; i++) {
		autoWrinkle.wrinklers.push({
			threshold: 0,
			updateAt: 0,
			exists: false
		});
	}

	setTimeout(() => {
		while (Game.SpawnWrinkler()) {
			for (let i = 0; i < Game.wrinklers.length; i++) {
				if (!autoWrinkle.wrinklers[i].exists && Game.wrinklers[i].phase !== 0) {
					autoWrinkle.wrinklers[i] = {
						threshold: (Game.cookies * autoWrinkle.thresholdPercent),
						updateAt: (Game.cookies * autoWrinkle.updatePercent),
						exists: true
					};

					break;
				}
			}
		}

		const wrinkleCheck = setInterval(checkWrinklers, 1000);
	}, autoWrinkle.popWait);
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