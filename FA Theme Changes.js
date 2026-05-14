// ==UserScript==
// @name        FA Theme Changes
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @icon
// @version     1.1.0
//
// @match       https://www.furaffinity.net/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL	https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/FA%20Theme%20Changes.js
// @description Reverting early 2026 theme changes, plus adding my own changes
// ==/UserScript==
const viewerRegex = /(\/view\/)[^ ]*/ // Submission viewer pages
const submissionRegex = /(\/msg\/submissions\/)[^ ]*/ // Submission feed pages

// Inject CSS
var styles = document.createElement('style');
styles.textContent = `/* Revert text-decoration changes to links. */
a:hover {
	text-decoration: none !important;
}`;
document.head.append(styles);

if (window.location.pathname.match(viewerRegex)) {
	// Get the mini gallery navigation
	var galleryNav = document.getElementsByClassName('minigallery-navigation')[0];

	// Nav buttons, only run if the mini gallery exists
	if (galleryNav) {
		var navButtons = galleryNav.getElementsByTagName('a');
		var navNewer;
		var navOlder;

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
		var buttonNav = document.getElementById('submission-options');

		// Grab classes from the existing submission buttons, for visual consistency
		var classes = buttonNav.getElementsByTagName('a')[0].classList;

		// Recreate the 'Newer' button if it exists
		if (navNewer) {
			var buttonNewer = document.createElement('a');
			buttonNewer.className = classes;
			buttonNewer.setAttribute('href', navNewer.href);
			buttonNewer.textContent = 'Newer';
			buttonNav.prepend(buttonNewer);
		}

		// Recreate the 'Older' button if it exists
		if (navOlder) {
			var buttonOlder = document.createElement('a');
			buttonOlder.className = classes;
			buttonOlder.setAttribute('href', navOlder.href);
			buttonOlder.textContent = 'Older';
			buttonNav.append(buttonOlder);
		}
	}

	// Username container
	var username = document.getElementsByClassName('c-usernameBlockSimple')[0].parentElement;

	// Move the username container to be on the same line as the post date/time
	var postTime = document.getElementsByClassName('popup_date')[0];
	postTime.parentElement.append(username);
}
if (window.location.pathname.match(submissionRegex)) {
	// Get the problematic gallery buttons div
	var messagenav = document.getElementsByClassName('messagecenter-navigation')[0];

	// Remove the problematic inline css from the div
	messagenav.style.lineHeight = '';
}
