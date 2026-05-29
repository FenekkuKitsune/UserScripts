// ==UserScript==
// @name        Revert FA Theme Changes
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     3.0.5
//
// @match       https://www.furaffinity.net/view/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Revert%20FA%20Theme%20Changes.js
// @description Reverting and fixing early 2026 theme changes.
// ==/UserScript==
const submissionViewer = new URLPattern({ pathname: '/view/*'});

// Inject CSS
const styles = GM_addStyle(`
/* Revert text-decoration changes to links. */
a:hover {
	text-decoration: none !important;
}`);

if (submissionViewer.test(window.location)) {
	// Get the mini gallery navigation
	const galleryNav = document.querySelector('.minigallery-navigation');

	// Nav buttons, only run if the mini gallery exists
	if (galleryNav) {
		const navButtons = galleryNav.querySelectorAll('a');
		let navNewer;
		let navOlder;

		// Find the 'new' buttons. There's better ways to do this, but eh, who cares.
		for (let i = 0; i < navButtons.length; i++) {
			if (navButtons[i].textContent === 'Older »') {
				navOlder = navButtons[i];
			} else if (navButtons[i].textContent === '« Newer') {
				navNewer = navButtons[i];
			}
		}

		// Hide the new navigation buttons
		galleryNav.style.display = 'none';

		// Grab the submission buttons div
		const buttonNav = document.querySelector('#submission-options');

		// Grab classes from the existing submission buttons, for visual consistency. Convert classlist to string.
		const classes = buttonNav.querySelector('a').classList + '';

		function createNavButton(link, label) {
			const button = GM_addElement(buttonNav, 'a', {
				class: classes,
				href: link.href,
				textContent: label
			});

			if (label === 'Newer') {
				buttonNav.prepend(button);
			}

			return button;
		}

		// Recreate the 'Newer' and 'Older' buttons if they exist.
		if (navNewer) {
			createNavButton(navNewer, 'Newer');
		}

		if (navOlder) {
			createNavButton(navOlder, 'Older');
		}

	}
}