// ==UserScript==
// @name        Auto Scroller
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     1.0.1
//
// @match       https://bsky.app/*
// @match       https://itaku.ee/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Auto%20Scroller.user.js
// @description Adds the ability to automatically scroll on certain sites.
// ==/UserScript==
const bsky = new URLPattern({ hostname: 'bsky.app' });
const itaku = new URLPattern({ hostname: 'itaku.ee' });
const bskyStyles = `
#AutoScrollToggle {
	position: fixed;
	top: 5vh;
	right: 5vw;
}`;
const itakuStyles = `
#AutoScrollToggle {
	position: fixed;
	top: 10vh;
	right: 15vw;
}`;

function doScrolling(elm) {
	autoScroller = autoScroller ? clearInterval(autoScroller) : setInterval(() => window.scrollBy(0, 5), 10);

	elm.textContent = "Auto Scroll: " + (elm.textContent.endsWith("Off") ? "On" : "Off");
}

window.addEventListener('keydown', (e) => {
	if (e.key === 's' && e.altKey) {
		doScrolling(scrollToggle);
	}
});

if (bsky.test(window.location)) {
	GM_addStyle(bskyStyles);
} else if (itaku.test(window.location)) {
	GM_addStyle(itakuStyles);
}

let autoScroller = null;
const scrollToggle = GM_addElement(document.body, 'button', {
	id: "AutoScrollToggle",
	textContent: "Auto Scroll: Off"
});
scrollToggle.onclick = () => doScrolling(scrollToggle);