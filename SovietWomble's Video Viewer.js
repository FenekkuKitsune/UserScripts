// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     3.2.1
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

.v-finished {
	color: green
}`;

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

function addGlobalListeners(onMessage) {
	window.addEventListener('keydown', handleKey);
	window.addEventListener('message', onMessage);
}

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
	function processVideoListItems(root = document) {
		const list = root.querySelectorAll('.v-list-item');
		for (let i = 0; i < list.length; i++) {
			const item = list[i];
			const vidText = item.querySelector('.v-list-item__title');
			const href = item.href && item.href.match(/\d+/);

			if (item.classList.contains('v-checked') || !vidText || !href) {
				continue;
			}

			item.classList.add('v-checked');

			const vidID = href[0];

			const span = GM_addElement('span', { textContent: vidText.textContent });
			vidText.textContent = '';
			vidText.appendChild(span);

			if (videos[vidID]) {
				if (videos[vidID].done) {
					span.classList.add('v-finished');
					item.querySelector('.v-list-item__icon').textContent = '✓';
				} else if (videos[vidID].progress > 0) {
					span.style.background = 'linear-gradient(to right, green 0%, green ' + (videos[vidID].progress / videos[vidID].max) * 100 + '%, grey 0%, grey 100%)';
					span.style.color = 'transparent';
					span.style.backgroundClip = 'text';
				}
			}
		}
	}

	const styles = GM_addStyle(sovietsStyles);
	const elLoadTimeout = 250;

	let videos = JSON.parse(localStorage.getItem('videoProgress'));
	if (videos == null) {
		videos = {};
	}

	if (sovietsVideos.test(window.location)) {
		function updateSeekTime(frame, time) {
			frame.setAttribute('src', frame.getAttribute('src') + '&t=' + time);
		}

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

		function createDoneButtons(addTo) {
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
				trackProgress = false;

				const vidID = window.location.pathname.match(/\d+/)[0];
				videos[vidID].done = true;
				localStorage.setItem('videoProgress', JSON.stringify(videos));

				this.style.backgroundColor = 'green';
				buttonUnwatched.style.backgroundColor = '';
			}

			buttonUnwatched.onclick = function() {
				trackProgress = false;

				const vidID = window.location.pathname.match(/\d+/)[0];
				videos[vidID].done = false;
				videos[vidID].progress = 0;
				localStorage.setItem('videoProgress', JSON.stringify(videos));

				const vidFrame = document.querySelector('iframe');
				vidFrame.setAttribute('src', vidFrame.getAttribute('src').split('&t=')[0]);

				trackProgress = true;

				this.style.backgroundColor = 'green';
				buttonWatched.style.backgroundColor = '';
			}
		}

		// Get video details
		let vidID = window.location.pathname.match(/\d+/)[0];
		let vidTitle = document.querySelector('h2').textContent + ' - ' + document.querySelector('h3').textContent;
		// Get the iframe that the video runs in.
		let vidFrame = document.querySelector('iframe');
		// Get the video navigation buttons
		let navButtons = document.querySelector('.layout');
		// Recall video progress, if any
		ensureVideoRecord(vidID, vidTitle);
		let trackProgress = true;
		if (videos[vidID].done === true) {
			trackProgress = false;
		}

		addGlobalListeners((e) => {
			if (e.origin === 'https://iframe.mediadelivery.net' && e.data?.prog && trackProgress) {
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
				trackProgress = true;

				setTimeout(() => {
					// Update video details
					vidID = window.location.pathname.match(/\d+/)[0];
					vidTitle = document.querySelector('h2').textContent + ' - ' + document.querySelector('h3').textContent;

					ensureVideoRecord(vidID, vidTitle);

					vidFrame = document.querySelector('iframe');

					if (videos[vidID].progress > 0) {
						updateSeekTime(vidFrame, videos[vidID].progress);
					}

					navButtons = document.querySelector('.layout');

					createDoneButtons(navButtons);
					processVideoListItems(document.querySelector('.v-list'));
				}, elLoadTimeout);
			}
		});

		// Update the page after the DOM fully loads.
		setTimeout(() => {
			if (videos[vidID].progress > 0) {
				updateSeekTime(vidFrame, videos[vidID].progress);
			}

			createDoneButtons(navButtons);
			processVideoListItems(document.querySelector('.v-list'));
		}, elLoadTimeout);
	} else {
		function observeVideoListUpdates() {
			processVideoListItems();

			const root = document.querySelector('.v-expansion-panels') || document.body;

			const listObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					mutation.addedNodes.forEach((node) => {
						if (!(node instanceof Element)) {
							return;
						}

						if (
							node.matches('.v-expansion-panel, .v-expansion-panel-content') ||
							node.querySelector('.v-expansion-panel, .v-expansion-panel-content')
						) {
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