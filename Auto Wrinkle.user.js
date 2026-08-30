// ==UserScript==
// @name        Auto Wrinkle
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     0.1.0
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
	reservePercent: 0.75,
	updatePercent: 2.0
};
function popWrinkler(id) {
	Game.wrinklers[id].hp = 0;

	autoWrinkle.wrinklers[id] = {
		reserve: 0,
		updateAt: 0,
		exists: false
	}

	if (Game.SpawnWrinkler()) {
		for (let i = 0; i < Game.wrinklers.length; i++) {
			if (!autoWrinkle.wrinklers[i].exists && Game.wrinklers[i].phase !== 0) {
				autoWrinkle.wrinklers[i] = {
					reserve: (Game.cookies * autoWrinkle.reservePercent),
					updateAt: (Game.cookies * autoWrinkle.updatePercent),
					exists: true
				};

				break;
			}
		}
	}
}
function checkWrinklers() {
	for (let i = 0; i < autoWrinkle.wrinklers.length; i++) {
		if (!autoWrinkle.wrinklers.exists) {
			continue;
		}

		if (Game.cookies <= autoWrinkle.wrinklers[i].reserve) {
			popWrinkler(i);

			break;
		} else if (Game.cookies >= autoWrinkle.wrinklers[i].updateAt) {
			autoWrinkle.wrinklers[i].reserve = (Game.cookies * autoWrinkle.reservePercent);
			autoWrinkle.wrinklers[i].updateAt = (Game.cookies * autoWrinkle.updatePercent);
		}
	}
}
function startWrinklers() {
	Game.CollectWrinklers();

	for (let i = 0; i < Game.wrinklers.length; i++) {
		autoWrinkle.wrinklers.push({
			reserve: 0,
			updateAt: 0,
			exists: false
		});
	}

	while (Game.SpawnWrinkler()) {
		for (let i = 0; i < Game.wrinklers.length; i++) {
			if (!autoWrinkle.wrinklers[i].exists && Game.wrinklers[i].phase !== 0) {
				autoWrinkle.wrinklers[i] = {
					reserve: (Game.cookies * autoWrinkle.reservePercent),
					updateAt: (Game.cookies * autoWrinkle.updatePercent),
					exists: true
				};

				break;
			}
		}
	}

	const wrinkleCheck = setInterval(checkWrinklers, 1000);
}

startWrinklers();