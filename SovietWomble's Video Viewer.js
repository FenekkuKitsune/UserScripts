// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     4.0.0
//
// @match       https://iframe.mediadelivery.net/embed/5105/*
// @match       https://sovietscloset.com/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/SovietWomble's%20Video%20Viewer.js
// @description Video progress tracking and hotkeys for SovietWomble's VOD archive.
// ==/UserScript==
const mediaDelivery = new URLPattern({ hostname: 'iframe.mediadelivery.net', pathname: '/embed/5105/*' });
const sovietsCloset = new URLPattern({ hostname: 'sovietscloset.com'});
const sovietsVideos = new URLPattern({ pathname: '/video/*'});
const sovietsStyles = `
#markWatched {
	position: absolute; top: 0.35em; right: 0.5em;
}

#markUnwatched {
	position: absolute; top: 0.35em; right: 12.1em;
}

.container {
	max-width: none;
}

.flex > div:has(iframe) {
	padding-top: 85vh !important;
}

.v-progress {
	color: transparent;
	background-clip: text;
}

.v-finished {
	color: green
}`;

/**
 * Waits for an element to be added to the DOM.
 * 
 * @param {string} selector - The CSS selector of the element to wait for.
 * @returns {Promise<HTMLElement>} A promise that resolves with the found element.
 */
function waitForElm(selector) {
	return new Promise(resolve => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const elmObserver = new MutationObserver(mutations => {
			if (document.querySelector(selector)) {
				elmObserver.disconnect()
				resolve(document.querySelector(selector));
			}
		});

		elmObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	});
}

/**
 * Controls the video player based on the provided control command.
 * 
 * @param {'play' | 'rewind' | 'fast-forward'} control - The control command to execute.
 */
function vidControl(control) {
	switch (control) {
		case 'play':
			document.querySelector('button[data-plyr="play"]').click();
			break;
		case 'rewind':
			document.querySelector('button[data-plyr="rewind"]').click();
			break;
		case 'fast-forward':
			document.querySelector('button[data-plyr="fast-forward"]').click();
			break;
	}
}

/**
 * Adds global event listeners for keyboard and message events.
 * 
 * @param {Function} onMessage - The function to call when a message event is received.
 */
function addGlobalListeners(onMessage) {
	window.addEventListener('keydown', handleKey);
	window.addEventListener('message', onMessage);
}

/**
 * Handles keyboard events for video control.
 * 
 * @param {KeyboardEvent} e - The keyboard event.
 * @returns {void}
 */
function handleKey(e) {
	const hotkeys = {
		'rewind': ['ArrowLeft'],
		'fast-forward': ['ArrowRight'],
		'play': ['KeyK', 'Space']
	};

	let control = null;
	for (const [key, keys] of Object.entries(hotkeys)) {
		if (keys.includes(e.code)) {
			control = key;
			break;
		}
	}

	if (!control) {
		return;
	}

	e.preventDefault();

	if (mediaDelivery.test(window.location)) {
		vidControl(control);
	} else if (sovietsCloset.test(window.location)) {
		document.querySelector('iframe').contentWindow.postMessage({ control }, 'https://iframe.mediadelivery.net');
	}
}

if (mediaDelivery.test(window.location)) {
	// Wait for the seek bar to load, then observe it for changes to the current time.
	waitForElm('input[data-plyr*="seek"').then((elm) => {
		const vidObserver = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === 'attributes') {
					if (mutation.attributeName === 'aria-valuenow') {
						// Communicate the current time to the parent window.
						window.parent.postMessage(
							{
								prog: mutation.target.getAttribute('aria-valuenow'),
								max: mutation.target.getAttribute('aria-valuemax')
							},
							'https://sovietscloset.com'
						);
					}
				}
			});
		});

		vidObserver.observe(elm, {
			attributes: true,
		});
	})

	addGlobalListeners((e) => {
		if (e.origin === 'https://sovietscloset.com' && e.data?.control) {
			vidControl(e.data.control);
		}
	});
}
if (sovietsCloset.test(window.location)) {
	/**
	 * Processes the video list items and updates their display based on watch progress.
	 * 
	 * @param {HTMLElement} root - The root element to search for video items.
	 */
	function processVideoListItems(root = document) {
		// Grab the list of videos
		const list = root.querySelectorAll('.v-list-item');
		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			const vidText = item.querySelector('.v-list-item__title');
			const href = item.href && item.href.match(/\d+/);

			// Skip if the item has already been processed, or if it doesn't have a valid video ID or title element.
			if (item.classList.contains('v-finished') || !vidText || !href) {
				continue;
			}

			const vidID = href[0];

			// Create a span to apply the progress styles to, contained within the existing title div.
			const span = GM_addElement('span', { textContent: vidText.textContent });
			vidText.textContent = '';
			vidText.appendChild(span);

			if (videos[vidID]) {
				if (videos[vidID].done) {
					// If the video was marked as done, apply the 'finished' styles and add a checkmark.
					span.classList.remove('v-progress');
					span.classList.add('v-finished');
					item.querySelector('.v-list-item__icon').textContent = '✓';
				} else if (videos[vidID].progress > 0) {
					// If the video is not marked as done, but has progress, apply a gradient to the text based on watch percentage.
					span.style.backgroundImage = 'linear-gradient(to right, green 0%, green ' + (videos[vidID].progress / videos[vidID].max) * 100 + '%, grey 0%, grey 100%)';
					span.classList.add('v-progress');
				}
			}
		}
	}

	// Add custom styles to the DOM.
	const styles = GM_addStyle(sovietsStyles);
	// Set a timeout for loading elements, as certain elements load at a delay.
	const elLoadTimeout = 250;

	// Load video progress from localStorage, or initialize it if it doesn't exist.
	let videos = JSON.parse(localStorage.getItem('videoProgress'));
	if (videos == null) {
		videos = {};
	}

	if (sovietsVideos.test(window.location)) {
		/**
		 * Updates the seek time of the video frame.
		 * 
		 * @param {HTMLIFrameElement} frame - The video frame to update.
		 * @param {number} time - The new seek time.
		 */
		function updateSeekTime(frame, time) {
			frame.setAttribute('src', frame.getAttribute('src') + '&t=' + time);
		}

		/**
		 * Ensures a video record exists in the videos object and if not, creates one.
		 * 
		 * @param {string} vidID - The video ID found in the URL pathname.
		 * @param {string} vidTitle - The video title, derived from the page's h2 and h3 elements.
		 */
		function ensureVideoRecord(vidID, vidTitle) {
			if (!videos[vidID]) {
				videos[vidID] = {
					title: vidTitle,
					progress: 0,
					max: -1,
					done: false
				};
			}
		}

		/**
		 * Creates "Mark Watched" and "Mark Unwatched" buttons.
		 * 
		 * @param {HTMLElement} addTo - The element to which the buttons will be added.
		 */
		function updateVideoDOM(addTo) {
			// Button styles, copied from existing buttons on the page for visual consistency.
			const buttonClasses = 'v-btn v-btn--outlined theme--dark v-size--default';

			const buttonWatched = GM_addElement('button', {
				id: 'markWatched',
				class: buttonClasses,
				type: 'button'
			});
			const spanWatched = GM_addElement(buttonWatched, 'span', {
				class: 'v-btn__content',
				textContent: 'Mark Watched'
			});

			const buttonUnwatched = GM_addElement('button', {
				id: 'markUnwatched',
				class: buttonClasses,
				type: 'button'
			});
			const spanUnwatched = GM_addElement(buttonUnwatched, 'span', {
				class: 'v-btn__content',
				textContent: 'Mark Unwatched'
			});

			addTo.prepend(buttonWatched);
			addTo.prepend(buttonUnwatched);

			buttonWatched.onclick = function() {
				// Mark the video as done and save it to localStorage.
				const vidID = window.location.pathname.match(/\d+/)[0];
				videos[vidID].done = true;
				localStorage.setItem('videoProgress', JSON.stringify(videos));

				// Apply the 'green' background color to the "Mark Watched" button, and remove it from the "Mark Unwatched" button.
				this.style.backgroundColor = 'green';
				buttonUnwatched.style.backgroundColor = '';
			}

			buttonUnwatched.onclick = function() {
				// Reset the video by removing the seek time parameter from the iframe src.
				const vidFrame = document.querySelector('iframe');
				vidFrame.setAttribute('src', vidFrame.getAttribute('src').split('&t=')[0]);

				// Mark the video as not done with 0 progress, and save it to localStorage.
				const vidID = window.location.pathname.match(/\d+/)[0];
				videos[vidID].done = false;
				videos[vidID].progress = 0;
				localStorage.setItem('videoProgress', JSON.stringify(videos));

				// Apply the 'green' background color to the "Mark Unwatched" button, and remove it from the "Mark Watched" button.
				this.style.backgroundColor = 'green';
				buttonWatched.style.backgroundColor = '';
			}

			// Update the video list when the drawer is opened
			const vListBtn = document.querySelector('.mr-3.mt-3 > button');

			vListBtn.addEventListener('click', () => {
				const vDrawer = document.querySelector('.v-navigation-drawer');

				if (vDrawer.classList.contains('v-navigation-drawer--open')) {
					processVideoListItems(document.querySelector('.v-list'));
				}
			});
		}

		// Get video details
		let vidID = window.location.pathname.match(/\d+/)[0];
		let vidTitle = document.querySelector('h2').textContent + ' - ' + document.querySelector('h3').textContent;
		// Get the iframe that the video runs in.
		let vidFrame = document.querySelector('iframe');
		// Get the video navigation buttons
		let navButtons = document.querySelector('.layout');
		// Ensure a record exists for the video in the videos object.
		ensureVideoRecord(vidID, vidTitle);

		addGlobalListeners((e) => {
			if (e.origin === 'https://iframe.mediadelivery.net' && e.data?.prog) {
				// If we're tracking progress for this video, update the video's progress as it plays.
				const vidProgress = Math.floor(e.data.prog);

				if (vidProgress > videos[vidID].progress) {
					videos[vidID].progress = Math.floor(e.data.prog);
					videos[vidID].max = Math.floor(e.data.max);
					localStorage.setItem('videoProgress', JSON.stringify(videos));
				}
			}
		});

		// Update variables and elements as the webpage is navigated.
		window.navigation.addEventListener('navigate', (e) => {
			if (e.destination.url.startsWith('https://sovietscloset.com/video/')) {
				setTimeout(() => {
					// Update video details
					vidID = window.location.pathname.match(/\d+/)[0];
					vidTitle = document.querySelector('h2').textContent + ' - ' + document.querySelector('h3').textContent;

					// Ensure a record exists for the new video in the videos object.
					ensureVideoRecord(vidID, vidTitle);

					// Update the video frame variable to the new video's iframe.
					vidFrame = document.querySelector('iframe');

					// Update the seek time of the new video if it has progress, so that navigation between videos retains progress.
					if (videos[vidID].progress > 0) {
						updateSeekTime(vidFrame, videos[vidID].progress);
					}

					// Create new watched/unwatched buttons for the new video
					// As well as update the video list.
					navButtons = document.querySelector('.layout');

					updateVideoDOM(navButtons);
					processVideoListItems(document.querySelector('.v-list'));
				}, elLoadTimeout);
			}
		});

		setTimeout(() => {
			// Update the seek time of the video if it has progress.
			if (videos[vidID].progress > 0) {
				updateSeekTime(vidFrame, videos[vidID].progress);
			}

			// Create the watched/unwatched buttons and apply progress styles to the video list.
			updateVideoDOM(navButtons);
			processVideoListItems(document.querySelector('.v-list'));
		}, elLoadTimeout);
	} else {
		/**
		 * Updates the video list items as they appear with their relevant video progress values.
		 */
		function observeVideoListUpdates() {
			// Initially process any video list items that are already in the DOM.
			processVideoListItems();

			// Root node to observe for changes, which will be either the expansion panel if it exists, or the body if it doesn't.
			const root = document.querySelector('.v-expansion-panels') || document.body;

			const listObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					mutation.addedNodes.forEach((node) => {
						if (!(node instanceof Element)) {
							// Skip nodes that aren't elements, as they can't contain video list items.
							return;
						}

						if (
							node.matches('.v-expansion-panel, .v-expansion-panel-content') ||
							node.querySelector('.v-expansion-panel, .v-expansion-panel-content')
						) {
							// Process video list items within the added node if it is valid.
							processVideoListItems(node);
						}
					});
				});
			});

			listObserver.observe(root, {
				childList: true,
				subtree: true
			});
		}

		setTimeout(() => {
			observeVideoListUpdates();
		}, elLoadTimeout);
	}
}