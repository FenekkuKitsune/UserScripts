// ==UserScript==
// @name        Revert FA Theme Changes
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     3.0.2
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
	const galleryNav = document.getElementsByClassName('minigallery-navigation')[0];

	// Nav buttons, only run if the mini gallery exists
	if (galleryNav) {
		const navButtons = galleryNav.getElementsByTagName('a');
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
		const buttonNav = document.getElementById('submission-options');

		// Grab classes from the existing submission buttons, for visual consistency. Convert classlist to string.
		const classes = buttonNav.getElementsByTagName('a')[0].classList + '';

		// Recreate the 'Newer' button if it exists
		if (navNewer) {
			const buttonNewer = GM_addElement('a', {
				class: classes,
				href: navNewer.href,
				textContent: 'Newer'
			})
			buttonNav.prepend(buttonNewer);
		}

		// Recreate the 'Older' button if it exists
		if (navOlder) {
			const buttonOlder = GM_addElement(buttonNav, 'a', {
				class: classes,
				href: navOlder.href,
				textContent: 'Older'
			})
		}
	}
}