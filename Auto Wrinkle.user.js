// ==UserScript==
// @name        Auto Wrinkle
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     0.0.5
//
// @match       https://orteil.dashnet.org/cookieclicker/*
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Wrinkle.user.js
// @description Automatically manages wrinklers in Cookie Clicker
// ==/UserScript==
let AutoWrinkle = {
	Amt: 10,
	Full: 0,
	Max: 0
};
function PopWrinklers() {
	for (let i=0; i<AutoWrinkle.Amt; i++) {
		Game.PopRandomWrinkler();
	}
}
function FillWrinklers() {
	for (let i=0; i<AutoWrinkle.Amt; i++) {
		Game.SpawnWrinkler();
	}
}
function CheckWrinklers() {
	for (let i=0; i<AutoWrinkle.Amt; i++) {
		const thisWrinkler = Game.wrinklers[i]
		if (thisWrinkler.sucked > AutoWrinkle.Max && i > 0) {
			AutoWrinkle.Max = thisWrinkler.sucked;

			continue;
		} else if (thisWrinkler.sucked < AutoWrinkle.Max) {
			continue;
		} else if (AutoWrinkle.Full < AutoWrinkle.Amt) {
			AutoWrinkle.Full++;

			continue;
		} else {
			PopWrinklers();

			AutoWrinkle.Full = 0;

			NewWrinklers = setTimeout(FillWrinklers, 250);
		}
	}
}

const WrinkleCheck = setInterval(CheckWrinklers, 1000)