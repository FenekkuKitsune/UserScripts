// ==UserScript==
// @name        Revert FA Theme Changes
// @namespace   Violentmonkey Scripts
// @icon
// @version     1.0.0
//
// @match       https://www.furaffinity.net/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL	https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Revert%20FA%20Theme%20Changes.js
// @description Reverts FA's theme changes since early 2026
// ==/UserScript==
const viewerRegex = /(\/view\/)[^ ]*/
const submissionRegex = /(\/msg\/submissions\/)[^ ]*/

if (window.location.pathname.match(viewerRegex)) {
	// Get the mini gallery navigation
	let galleryNav = document.getElementsByClassName('minigallery-navigation')[0];

	// Nav buttons, only run if the mini gallery exists
	if (galleryNav) {
		let navButtons = galleryNav.getElementsByTagName('a');
		let navNewer;
		let navOlder;

		// Find the 'new' buttons. There's better ways to do this, but eh, who cares.
		for (var i = 0; i < navButtons.length; i++) {
			if (navButtons[i].textContent === 'Older »') {
				navOlder = navButtons[i];
			} else if (navButtons[i].textContent === '« Newer') {
				navNewer = navButtons[i];
			}
		}

		// Hide the new navigation buttons
		galleryNav.style.display = 'none';

		// Grab the submission buttons div
		let buttonNav = document.getElementById('submission-options');

		// Grab classes from the existing submission buttons, for visual consistency
		let classes = buttonNav.getElementsByTagName('a')[0].classList;

		// Recreate the 'Newer' button if it exists
		if (navNewer) {
			let buttonNewer = document.createElement('a');
			buttonNewer.className = classes;
			buttonNewer.setAttribute('href', navNewer.href);
			buttonNewer.textContent = 'Newer';
			buttonNav.prepend(buttonNewer);
		}

		// Recreate the 'Older' button if it exists
		if (navOlder) {
			let buttonOlder = document.createElement('a');
			buttonOlder.className = classes;
			buttonOlder.setAttribute('href', navOlder.href);
			buttonOlder.textContent = 'Older';
			buttonNav.append(buttonOlder);
		}
	}
}
if (window.location.pathname.match(submissionRegex)) {
	// Get the problematic gallery buttons div
	let messagenav = document.getElementsByClassName('messagecenter-navigation')[0];

	// Remove the problematic inline css from the div
	messagenav.style.lineHeight = '';
}