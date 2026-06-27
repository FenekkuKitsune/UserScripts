// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     6.0.2
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
#watchProgressButtons {
	position: absolute;
	top: 0.35em;
	right: 0.35em;
}

#watchProgressButtons > button {
	margin-left: 0.35em;
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
 * @param {number} [timeout=10000] - How long to wait for the element.
 * @returns {Promise<HTMLElement>} A promise that resolves with the found element.
 */
function waitForElm(selector, timeout = 10000) {
	return new Promise((resolve, reject) => {
		// Immediately check if the element exists, and resolve if it does.
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		// Reject if the element doesn't appear in X time.
		const timeoutElm = setTimeout(() => {
			elmObserver.disconnect();
			reject(new Error(`Element ${selector} not found within ${timeout}ms`));
		}, timeout);

		// Otherwise, create an observer to wait for the element to exist.
		const elmObserver = new MutationObserver(mutations => {
			if (document.querySelector(selector)) {
				clearTimeout(timeoutElm);
				elmObserver.disconnect()
				resolve(document.querySelector(selector));
			}
		});

		// Start the observer, watching all children and subtrees.
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
	const sendInterval = 1500; // Throttle interval, only send messages every this milliseconds
	let lastSend = Date.now(); // The last time a message was sent.
	const channel = new BroadcastChannel('play-check'); // Broadcast channel
	const broadcastUID = crypto.randomUUID(); // UID for this tab to prevent responding to self.
	let checkRequestID = null; // The ID of the broadcast waiting for a response.

	/**
	 * Helper function to check if the video is currently unpaused.
	 * 
	 * @param {HTMLElement} elm - The video element
	 * @returns {Boolean} Whether or not the video is playing. Returns false if the video object is not found.
	 */
	function isPlaying(elm) {
		const video = elm;
		return video && !video.paused;
	}

	/**
	 * Helper function to post the message to the parent window.
	 * 
	 * @param {HTMLElement} elm - The video element
	 * @private
	 */
	function sendProgress(elm) {
		window.parent.postMessage(
			{
				prog: elm.currentTime,
				max: elm.duration
			},
			'https://sovietscloset.com'
		);
	}

	// Wait for the video to load
	waitForElm('video').then((elm) => {
		// Track the video for progress updates
		elm.addEventListener('timeupdate', () => {
			const now = Date.now();

			if (now - lastSend >= sendInterval) {
				sendProgress(elm);

				lastSend = now;
			}
		});

		// Also track for when the video is paused
		elm.addEventListener('pause', () => { sendProgress(elm) });

		// Broadcast listener
		channel.onmessage = (e) => {
			const { type, requestID, senderID } = e.data;

			// Tab receives a "Check" request from another tab.
			if (type === 'CHECK_PLAYING' && senderID !== broadcastUID) {
				if (isPlaying(elm)) {
					// If our video is playing, block the other tab from playing
					channel.postMessage({
						type: 'IS_PLAYING',
						requestID: requestID,
						senderID: broadcastUID
					});
				}
			}

			// Tab receives a "Block" signal
			if (type === 'IS_PLAYING' && requestID === checkRequestID) {
				elm.removeAttribute('autoplay')
				elm.pause();

				checkRequestID = null;
			}
		}

		// Broadcast play check
		if (elm.hasAttribute('autoplay')) {
			const requestID = crypto.randomUUID();
			checkRequestID = requestID;

			// Response is handled in the above broadcast listener
			// Code does nothing if a response isn't received.
			channel.postMessage({
				type: 'CHECK_PLAYING',
				requestID: requestID,
				senderID: broadcastUID
			});
		}
	});

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
					let progressPercent = (videos[vidID].progress / videos[vidID].max) * 100
					span.style.backgroundImage = `linear-gradient(to right, green 0%, green ${progressPercent}%, grey ${progressPercent}%, grey 100%)`;
					span.classList.add('v-progress');
				}
			}
		}
	}
	
	/**
	 * Updates the seek time of the video frame.
	 * 
	 * @param {HTMLIFrameElement} frame - The video frame to update.
	 * @param {boolean} autoplay - Whether or not Autoplay is enabled.
	 * @param {number} time - The new seek time.
	 */
	function updateSeekTime(frame, autoplay, time) {
		// Get frame src attribute
		const src = frame.getAttribute('src');

		// Remove the src arguments
		const srcWithoutArgs = src.split('?')[0];

		// Add our own arguments to the src.
		const srcWithArgs = srcWithoutArgs + `?autoplay=${autoplay}&t=${time}`;

		// Replace the src on the frame
		frame.setAttribute('src', srcWithArgs);
	}

	/**
	 * Ensures a video record exists in the videos object and if not, creates one.
	 * 
	 * @param {string} vidID - The video ID found in the URL pathname.
	 * @param {string} vidTitle - The video title, derived from the page's h2 and h3 elements.
	 */
	function ensureVideoRecord(vidID, vidTitle) {
		videos[vidID] ??= {
			title: vidTitle,
			progress: 0,
			max: -1,
			done: false
		}
	}

	/**
	 * Creates "Mark Watched" and "Mark Unwatched" buttons.
	 * 
	 * @param {HTMLElement} addTo - The element to which the buttons will be added.
	 */
	function updateVideoDOM() {
		// Button styles, copied from existing buttons on the page for visual consistency.
		const buttonClasses = 'v-btn v-btn--outlined theme--dark v-size--default';

		// Buttons div
		const buttonContainer = GM_addElement(document.querySelector('.v-main__wrap'), 'div', {
			id: 'watchProgressButtons'
		});

		// Autoplay
		const buttonAutoplay = GM_addElement(buttonContainer, 'button', {
			id: 'toggleAutoplay',
			class: buttonClasses,
			type: 'button'
		})
		const spanAutoplay = GM_addElement(buttonAutoplay, 'span', {
			class: 'v-btn__content',
			textContent: `Autoplay: ${autoplayState ? 'On' : 'Off'}`
		});

		// Unwatched
		const buttonUnwatched = GM_addElement(buttonContainer, 'button', {
			id: 'markUnwatched',
			class: buttonClasses,
			type: 'button'
		});
		const spanUnwatched = GM_addElement(buttonUnwatched, 'span', {
			class: 'v-btn__content',
			textContent: 'Mark Unwatched'
		});

		// Watched
		const buttonWatched = GM_addElement(buttonContainer, 'button', {
			id: 'markWatched',
			class: buttonClasses,
			type: 'button'
		});
		const spanWatched = GM_addElement(buttonWatched, 'span', {
			class: 'v-btn__content',
			textContent: 'Mark Watched'
		});

		buttonAutoplay.onclick = function() {
			autoplayState = !autoplayState;

			localStorage.setItem('autoplay', autoplayState);

			this.querySelector('span').textContent = `Autoplay: ${autoplayState ? 'On' : 'Off'}`;
		}

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

	/**
	 * Updates the video list items as they appear with their relevant video progress values.
	 */
	function observeVideoListUpdates() {
		// Initially process any video list items that are already in the DOM.
		processVideoListItems();

		// Root node to observe for changes, which will be either the expansion panel if it exists, or the body if it doesn't.
		const root = document.querySelector('.v-expansion-panels') || document.body;

		observeVideoList = new MutationObserver((mutations) => {
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

		observeVideoList.observe(root, {
			childList: true,
			subtree: true
		});
	}

	// Add custom styles to the DOM.
	const styles = GM_addStyle(sovietsStyles);
	// Set a timeout for loading elements, as certain elements load at a delay.
	const elLoadTimeout = 250;
	// Observer and timer constants
	let observeVideoList = null;

	// Load video progress from localStorage, or initialize it if it doesn't exist.
	let videos = JSON.parse(localStorage.getItem('videoProgress'));
	videos ??= {};
	let autoplayState = localStorage.getItem('autoplay');
	autoplayState = autoplayState === null ? true : autoplayState === 'true';

	if (sovietsVideos.test(window.location)) {
		// Get video details
		let vidID = window.location.pathname.match(/\d+/)[0];
		let vidTitle = `${document.querySelector('h2').textContent} - ${document.querySelector('h3').textContent}`;
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

		setTimeout(() => {
			// Update the seek time of the video if it has progress.
			if (videos[vidID].progress > 0) {
				updateSeekTime(vidFrame, autoplayState, videos[vidID].progress);
			}

			// Create the watched/unwatched buttons and apply progress styles to the video list.
			updateVideoDOM();
			processVideoListItems(document.querySelector('.v-list'));
		}, elLoadTimeout);
	} else if (sovietsCloset.test(window.location)) {
		setTimeout(() => {
			observeVideoListUpdates();
		}, elLoadTimeout);
	}

	// Update variables and elements as the webpage is navigated.
	window.navigation.addEventListener('navigate', (e) => {
		if (e.destination.url.startsWith('https://sovietscloset.com/video/')) {
			if (observeVideoList) {
				observeVideoList.disconnect();
			}

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

			setTimeout(() => {
				// Update video details
				vidID = window.location.pathname.match(/\d+/)[0];
				vidTitle = `${document.querySelector('h2').textContent} - ${document.querySelector('h3').textContent}`;

				// Ensure a record exists for the new video in the videos object.
				ensureVideoRecord(vidID, vidTitle);

				// Update the video frame variable to the new video's iframe.
				vidFrame = document.querySelector('iframe');

				// Update the seek time of the new video if it has progress, so that navigation between videos retains progress.
				if (videos[vidID].progress > 0) {
					updateSeekTime(vidFrame, autoplayState, videos[vidID].progress);
				}

				// Create new watched/unwatched buttons for the new video
				// As well as update the video list.

				updateVideoDOM();
				processVideoListItems(document.querySelector('.v-list'));
			}, elLoadTimeout);
		} else if (e.destination.url.startsWith('https://sovietscloset.com/')) {
			observeVideoListUpdates();
		}
	});
}