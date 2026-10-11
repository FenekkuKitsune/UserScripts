// ==UserScript==
// @name        Revert FA Theme Changes
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     4.0.0
//
// @match       https://www.furaffinity.net/view/*
// @match       https://www.furaffinity.net/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/Revert%20FA%20Theme%20Changes.user.js
// @description Reverting and fixing early 2026 theme changes.
// ==/UserScript==
const submissionViewer = new URLPattern({ pathname: '/view/*' });

// Submission viewer styles
const subViewerStyles = `
/* Revert text-decoration changes to links. */
a:hover {
	text-decoration: none !important;
}`;

if (submissionViewer.test(window.location)) {
	// Add styles to the submission viewer page
	GM_addStyle(subViewerStyles);

	// Get the mini gallery navigation
	const galleryNav = document.querySelector('.minigallery-navigation');

	// Nav buttons, only run if the mini gallery exists
	if (galleryNav) {
		const navButtons = galleryNav.querySelectorAll('a');

		// Find the 'new' buttons.
		let navNewer;
		let navOlder;
		if (navButtons.length > 1) {
			navNewer = navButtons[0];
			navOlder = navButtons[navButtons.length - 1];
		} else if (navButtons[0].textContent.includes("Newer")) {
			navNewer = navButtons[0];
		} else {
			navOlder = navButtons[0];
		}

		// Hide the new navigation buttons
		galleryNav.style.display = 'none';

		// Grab the submission buttons div
		const buttonNav = document.querySelector('#submission-options');

		// Grab classes from the existing submission buttons, for visual consistency. Convert classlist to string.
		const classes = buttonNav.querySelector('a').classList + '';

		/**
		 * Creates a replacement navigation button using the existing submission-button styles.
		 *
		 * @param {HTMLAnchorElement} link - The original navigation link to copy the href from.
		 * @param {'Newer' | 'Older'} label - The label to display on the generated button.
		 * @returns {HTMLAnchorElement} The newly created navigation button.
		 */
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

async function readAllAnnouncements() {
	// Grab the announcement request key
	try {
		const response = await fetch('/announcements/', {
			credentials: 'include'
		});

		if (!response.ok) {
			console.error('Could not fetch announcements page');
		} else {
			const HTML = new DOMParser().parseFromString(
				await response.text(),
				'text/html'
			);

			const key = HTML.querySelector('#c-AnnouncementControls input[name=key]')?.value

			if (key) {
				const response = fetch('/announcements/', {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({
						key: key,
						mark_all_read: '1'
					})
				});

				if (!response.ok) {
					console.error('Could not mark announcements as read');
				}
			} else {
				console.error('Could not fetch announcements key')
			}
		}
	} catch (err) {
		console.error('Error marking announcements as read:', err);
	}
}

// If there's a current news banner
if (document.querySelector('.news-block')?.children.length > 0) {
	// Grab the dismiss button
	const dismissButton = document.querySelector('#c-newsBlockDismiss');

	if (dismissButton) {
		dismissButton.addEventListener('click', readAllAnnouncements);
	} else {
		console.error('Cannot add event listener to null object; dismissButton');
	}
}