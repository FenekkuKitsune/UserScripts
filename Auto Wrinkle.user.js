// ==UserScript==
// @name        Auto Wrinkle
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     0.0.2
//
// @match       https://orteil.dashnet.org/cookieclicker/*
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Wrinkle.user.js
// @description Automatically manages wrinklers in Cookie Clicker
// ==/UserScript==

WrinklerAmt = 10;
function PopWrinklers() {
	for (i=0; i<WrinklerAmt; i++) {
		Game.PopRandomWrinkler();
	}
}
function FillWrinklers() {
	for (i=0; i<WrinklerAmt; i++) {
		Game.SpawnWrinkler();
	}
}
function CheckWrinklers() {
	FullWrinklers = 0;
	FullAmt = 0;
	for (i=0; i<WrinklerAmt; i++) {
		thisWrinkler = Game.wrinklers[i]
		if (thisWrinkler.sucked > FullAmt && i > 0) {
			FullAmt = thisWrinkler.sucked;

			continue;
		} else if (thisWrinkler.sucked < FullAmt) {
			continue;
		} else if (FullWrinklers < WrinklerAmt) {
			FullWrinklers++;

			continue;
		} else {
			PopWrinklers();

			NewWrinklers = setTimeout(FillWrinklers, 250);
		}
	}
}

WrinkleCheck = setInterval(CheckWrinklers, 1000)