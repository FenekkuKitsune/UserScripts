// ==UserScript==
// @name        Auto Wrinkle
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     0.0.7
//
// @match       https://orteil.dashnet.org/cookieclicker/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Wrinkle.user.js
// @description Automatically manages wrinklers in Cookie Clicker
// ==/UserScript==
let AutoWrinkle = {
	Amt: 10,
	Max: 0
};
function FillWrinklers() {
	for (let i = 0; i < AutoWrinkle.Amt; i++) {
		Game.SpawnWrinkler();
	}
}
function CheckWrinklers() {
	let max = AutoWrinkle.Max;

	// Find highest amt currently stored
	for (let i = 0; i < AutoWrinkle.Amt; i++) {
		const thisWrinkler = Game.wrinklers[i];

		if (thisWrinkler.sucked > max) {
			max = thisWrinkler.sucked;
		}
	}

	// If the maximum increased, store it and wait for another check before deciding that we're full
	if (max > AutoWrinkle.Max) {
		AutoWrinkle.Max = max;

		return;
	}

	// Check whether every wrinkler has reached the maximum.
	for (let i = 0; i < AutoWrinkle.Amt; i++) {
		if (Game.wrinklers[i].sucked < AutoWrinkle.Max) {
			return;
		}
	}

	// Every wrinkler has reached the maximum
	Game.CollectWrinklers();
	setTimeout(FillWrinklers, 250);
}

const WrinkleCheck = setInterval(CheckWrinklers, 1000)