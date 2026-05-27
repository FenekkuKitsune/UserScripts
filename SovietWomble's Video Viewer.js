// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     3.1.1
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
#markDone {
	position: absolute; top: 0.35em; right: 0.5em;
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

function handleKey(e) {
	let hotkeys = {
		rewind: ['ArrowLeft'],
		fastForward: ['ArrowRight'],
		play: ['KeyK', 'Space']
	}
	if (mediaDelivery.test(window.location)) {
		if (hotkeys.rewind.includes(e.code)) {
			vidControl('rewind');
			e.preventDefault();
		}
		if (hotkeys.fastForward.includes(e.code)) {
			vidControl('fast-forward');
			e.preventDefault();
		}
		if (hotkeys.play.includes(e.code)) {
			vidControl('play');
			e.preventDefault();
		}
	}
	if (sovietsCloset.test(window.location)) {
		let vidFrame = document.getElementsByTagName('iframe')[0].contentWindow
		let sendControl = '';

		if (hotkeys.rewind.includes(e.code)) {
			sendControl = 'rewind';
			e.preventDefault();
		}
		if (hotkeys.fastForward.includes(e.code)) {
			sendControl = 'fast-forward';
			e.preventDefault();
		}
		if (hotkeys.play.includes(e.code)) {
			sendControl = 'play';
			e.preventDefault();
		}

		if (sendControl) {
			vidFrame.postMessage({ control: sendControl }, 'https://iframe.mediadelivery.net');
		}
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

	// Listen for keypresses to control the video.
	window.addEventListener('keydown', handleKey);

	window.addEventListener('message', (e) => {
		if (e.origin == 'https://sovietscloset.com') {
			if (e.data.hasOwnProperty('control')) {
				vidControl(e.data.control);
			}
		}
	});
}
if (sovietsCloset.test(window.location)) {
	var styles = GM_addStyle(sovietsStyles);
	var elLoadTimeout = 250;

	var videos = JSON.parse(localStorage.getItem('videoProgress'));
	if (videos == null) {
		videos = {};
	}

	if (sovietsVideos.test(window.location)) {
		function updateSeekTime(frame, time) {
			frame.setAttribute('src', frame.getAttribute('src') + '&t=' + time);
		}

		function createDoneButton(addTo) {
			let button = GM_addElement('button', {
				id: 'markDone',
				class: 'v-btn v-btn--outlined theme--dark v-size--default',
				type: 'button'
			})
			let span = GM_addElement(button, 'span', {
				class: 'v-btn__content',
				textContent: 'Mark Completed'
			})

			addTo.prepend(button);

			button.onclick = function() {
				trackProgress = false;

				setCookie(cookieName, '-1', '-1');

				if (getCookie(cookieName) === '') {
					this.style.backgroundColor = 'green';
				} else {
					this.style.backgroundColor = 'red';
					console.error('Failed to delete cookie ' + cookieName);
				}
			}
		}

		// Get video details
		var vidID = window.location.pathname.match(/\d+/)[0];
		var vidTitle = document.getElementsByTagName('h2')[0].textContent + ' - ' + document.getElementsByTagName('h3')[0].textContent;
		// Get the iframe that the video runs in.
		var vidFrame = document.getElementsByTagName('iframe')[0];
		// Get the video navigation buttons
		var navButtons = document.getElementsByClassName('layout')[0];
		// Recall video progress, if any
		if (!videos[vidID]) {
			videos[vidID] = {
				title: vidTitle,
				progress: 0,
				max: -1,
				done: false
			};
		}
		var trackProgress = true;

		// Listen for keypresses to control the video.
		window.addEventListener('keydown', handleKey);

		// Listen for video progress from iframe
		window.addEventListener('message', (e) => {
			if (e.origin == 'https://iframe.mediadelivery.net') {
				if (e.data.hasOwnProperty('prog') && trackProgress) {
					let vidProgress = Math.floor(e.data.prog);

					if (vidProgress > videos[vidID].progress) {
						videos[vidID].progress = Math.floor(e.data.prog);
						videos[vidID].max = Math.floor(e.data.max);
						localStorage.setItem('videoProgress', JSON.stringify(videos));
					}
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
					vidTitle = document.getElementsByTagName('h2')[0].textContent + ' - ' + document.getElementsByTagName('h3')[0].textContent;

					if (videos[vidID] == null) {
						videos[vidID] = {
							title: vidTitle,
							progress: 0,
							max: -1,
							done: false
						}
					}

					vidFrame = document.getElementsByTagName('iframe')[0];

					if (videos[vidID].progress > 0) {
						updateSeekTime(vidFrame, videos[vidID].progress);
					}

					navButtons = document.getElementsByClassName('layout')[0];

					createDoneButton(navButtons);
				}, elLoadTimeout);
			}
		});

		// Update the page after the DOM fully loads.
		setTimeout(() => {
			if (videos[vidID].progress > 0) {
				updateSeekTime(vidFrame, videos[vidID].progress);
			}

			createDoneButton(navButtons);
		}, elLoadTimeout);
	} else {
		function processVideoListItems(root = document) {
			const list = root.getElementsByClassName('v-list-item');
			for (let i = 0; i < list.length; i++) {
				const item = list[i];
				if (item.classList.contains('v-checked')) {
					continue;
				}

				item.classList.add('v-checked');

				const vidText = item.getElementsByClassName('v-list-item__title')[0];
				if (!vidText) {
					continue;
				}

				const span = GM_addElement('span', { textContent: vidText.textContent });
				vidText.textContent = '';
				vidText.appendChild(span);

				const match = item.href && item.href.match(/\d+/);
				if (!match) {
					continue;
				}
				const vidID = match[0];

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

		function observeVideoListUpdates() {
			processVideoListItems();

			const root = document.querySelector('.v-expansion-panels') || document.body;

			const listObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					mutation.addedNodes.forEach((node) => {
						if (!(node instanceof Element)) {
							return;
						}

						if (node.matches('.v-expansion-panel') || node.matches('.v-expansion-panel-content')) {
							processVideoListItems(node);
						} else if (node.querySelector('.v-expansion-panel')) {
							processVideoListItems(node);
						} else if (node.querySelector('.v-expansion-panel-content')) {
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