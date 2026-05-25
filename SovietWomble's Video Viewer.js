// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     2.1.3
//
// @match       https://iframe.mediadelivery.net/embed/5105/*
// @match       https://sovietscloset.com/video/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/SovietWomble's%20Video%20Viewer.js
// @description Communication script for videos on Soviet's Closet
// ==/UserScript==
const mediaDelivery = new URLPattern({ hostname: 'iframe.mediadelivery.net', pathname: '/embed/5105/*' });
const sovietsCloset = new URLPattern({ hostname: 'sovietscloset.com', pathname: '/video/*' });

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

function setCookie(cname, cvalue, exdays) {
	const d = new Date();
	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
	let expires = 'expires=' + d.toUTCString();
	document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
	let name = cname + '=';
	let ca = document.cookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return '';
}

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
		rewind: 'ArrowLeft',
		fastForward: 'ArrowRight',
		play: 'KeyK'
	}
	if (mediaDelivery.test(window.location)) {
		switch (e.code) {
			case hotkeys.rewind:
				vidControl('rewind');
				break;
			case hotkeys.fastForward:
				vidControl('fast-forward');
				break;
			case hotkeys.play:
				vidControl('play');
				break;
		}
	}
	if (sovietsCloset.test(window.location)) {
		let vidFrame = document.getElementsByTagName('iframe')[0].contentWindow
		let sendControl = '';
		switch (e.code) {
			case hotkeys.rewind:
				sendControl = 'rewind';
				break;
			case hotkeys.fastForward:
				sendControl = 'fast-forward';
				break;
			case hotkeys.play:
				sendControl = 'play';
				break;
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
							{ prog: mutation.target.getAttribute('aria-valuenow') },
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
	var styles = GM_addStyle(`
#markDone {
	position: absolute;
	top: 0.35em;
	right: 0.5em;
}

.container {
	max-width: none;
}

.flex > div:nth-child(2) {
	padding-top: 85vh !important;
}`);

	// Get video titles
	var listTitle = document.getElementsByTagName('h2')[0].textContent;
	var videoTitle = document.getElementsByTagName('h3')[0].textContent;
	// Get the iframe that the video runs in.
	var vidFrame = document.getElementsByTagName('iframe')[0];
	var vidLoadTimeout = 250;
	// Get the video navigation buttons
	var navButtons = document.getElementsByClassName('layout')[0];
	// Cookie details
	var cookieName = listTitle + ' / ' + videoTitle;
	var progCookie = Math.floor(getCookie(cookieName));
	var trackProgress = true;

	// Listen for keypresses to control the video.
	window.addEventListener('keydown', handleKey);

	// Listen for video progress from iframe
	window.addEventListener('message', (e) => {
		if (e.origin == 'https://iframe.mediadelivery.net') {
			if (e.data.hasOwnProperty('prog') && trackProgress) {
				let vidProgress = Math.floor(e.data.prog);

				if (vidProgress > progCookie) {
					progCookie = e.data.prog;

					setCookie(cookieName, e.data.prog, '12');
				}
			}
		}
	});

	// Update variables and elements as the webpage is navigated.
	window.navigation.addEventListener('navigate', (e) => {
		if (e.destination.url.startsWith('https://sovietscloset.com/video/')) {
			trackProgress = true;

			setTimeout(() => {
				listTitle = document.getElementsByTagName('h2')[0].textContent;
				videoTitle = document.getElementsByTagName('h3')[0].textContent;

				cookieName = listTitle + ' / ' + videoTitle;

				progCookie = Math.floor(getCookie(cookieName));

				vidFrame = document.getElementsByTagName('iframe')[0];

				if (progCookie > 0) {
					updateSeekTime(vidFrame, progCookie);
				}

				navButtons = document.getElementsByClassName('layout')[0];

				createDoneButton(navButtons);
			}, vidLoadTimeout);
		}
	});

	// Update the page after the DOM fully loads.
	setTimeout(() => {
		if (progCookie > 0) {
			updateSeekTime(vidFrame, progCookie);
		}

		createDoneButton(navButtons);
	}, vidLoadTimeout);
}