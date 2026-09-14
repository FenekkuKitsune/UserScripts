// ==UserScript==
// @name        IB Quick Fave
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @version     1.0.0
//
// @match       https://inkbunny.net/submissionsviewall.php*
// @match       https://inkbunny.net/gallery/*
// @grant       GM_addStyle
// @grant       GM_addElement
//
// @author      FenekkuKitsune
// @updateURL   https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/IB%20Quick%20Fave.user.js
// @description Adding convenient quick actions to Inkbunny
// ==/UserScript==
const inkbunnyStyles = `
.widget_thumbnailLargeFromSubmission_thumb {
	position: relative;
}

.star-menu {
	position: absolute;
	right: 0;
	bottom: 0;
	display: none;
	width: 28px;
	height: 16px;
	background-color: #333;
	z-index: 1;
}
.star-menu > img {
	display: block;
	margin: auto;
}
.star-menu > a {
	position: absolute;
	top: 0;
	left: 0;
	display: block;
	width: 100%;
	height: 100%;
}

.star-menu-open {
	display: block;
}`;

GM_addStyle(inkbunnyStyles);

/**
 * Favourite/unfavourite the specified submission by ID.
 * 
 * @param {number} submissionId - Submission ID
 * @param {number} stars - 0-3, 0 to unfave, 1-3 the amount of stars to set.
 */
function setStars(submissionId, stars) {
	const token = document.querySelector('#general-global_token')?.value;

	if (!token) {
		throw new Error('Could not find token.');
	}

	if (stars < 0 || stars > 3 || !Number.isInteger(stars)) {
		throw new Error(`Invalid star rating: ${stars}`);
	}

	return fetch('https://inkbunny.net/submissionfav_process.php', {
		method: 'POST',
		credentials: 'include',
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
		},
		body: new URLSearchParams({
			token,
			stars: stars ? String(stars) : '',
			add: stars ? 'true' : '',
			remove: stars ? '' : 'true',
			submission_id: String(submissionId)
		})
	}).then(response => {
		if (!response.ok) {
			throw new Error(`Inkbunny returned HTTP ${response.status}.`);
		}

		return response;
	});
}

const stars = {
	'on': [
		'https://au.ib.metapix.net/images82/icons/favorite/star.png',
		'https://au.ib.metapix.net/images82/icons/favorite/2star.png',
		'https://au.ib.metapix.net/images82/icons/favorite/3star.png'
	],
	'off': [
		'https://au.ib.metapix.net/images82/icons/favorite/star_30pc_trans.png',
		'https://au.ib.metapix.net/images82/icons/favorite/2star_30pc_trans.png',
		'https://au.ib.metapix.net/images82/icons/favorite/3star_30pc_trans.png'
	]
} 

// Grab all the submissions on the page
const submissions = document.querySelectorAll('.widget_thumbnailLargeFromSubmission_thumb');
const submissionElms = [];

for (let i = 0; i < submissions.length; i++) {
	// For each submission, add a stars menu
	const elms = {
		id: submissions[i].querySelector('a').href.replace('https://inkbunny.net/s/', '')
	}

	// Stars menu
	elms.menuOneDiv = GM_addElement(submissions[i], 'div', {
		class: 'star-menu',
		style: 'bottom: 0px'
	});
	elms.menuOneImg = GM_addElement(elms.menuOneDiv, 'img', {
		src: stars.off[0]
	});
	elms.menuOneButton = GM_addElement(elms.menuOneDiv, 'a', {});
	elms.menuTwoDiv = GM_addElement(submissions[i], 'div', {
		class: 'star-menu',
		style: 'bottom: 16px'
	});
	elms.menuTwoImg = GM_addElement(elms.menuTwoDiv, 'img', {
		src: stars.off[1]
	});
	elms.menuTwoButton = GM_addElement(elms.menuTwoDiv, 'a', {});
	elms.menuThreeDiv = GM_addElement(submissions[i], 'div', {
		class: 'star-menu',
		style: 'bottom: 32px'
	});
	elms.menuThreeImg = GM_addElement(elms.menuThreeDiv, 'img', {
		src: stars.off[2]
	});
	elms.menuThreeButton = GM_addElement(elms.menuThreeDiv, 'a', {});

	// Check what stars are lit or not

	// Reveal and hide the menu as the mouse is hovered over it
	submissions[i].addEventListener('mouseover', (e) => {
		elms.menuOneDiv.classList.add('star-menu-open');
		elms.menuTwoDiv.classList.add('star-menu-open');
		elms.menuThreeDiv.classList.add('star-menu-open');
	});
	submissions[i].addEventListener('mouseleave', (e) => {
		elms.menuOneDiv.classList.remove('star-menu-open');
		elms.menuTwoDiv.classList.remove('star-menu-open');
		elms.menuThreeDiv.classList.remove('star-menu-open');
	});

	// Set the stars of the parent submission based on which star is clicked
	elms.menuOneButton.addEventListener('click', (e) => {
		setStars(elms.id, 1).then(() => {
			elms.menuOneImg.src = stars.on[0]
			elms.menuTwoImg.src = stars.off[1]
			elms.menuThreeImg.src = stars.off[2]
		}).catch((err) => {
			console.error(err);
		});
	});
	elms.menuTwoButton.addEventListener('click', (e) => {
		setStars(elms.id, 2).then(() => {
			elms.menuOneImg.src = stars.off[0]
			elms.menuOneImg.src = stars.on[1]
			elms.menuThreeImg.src = stars.off[2]
		}).catch((err) => {
			console.error(err);
		});
	});
	elms.menuThreeButton.addEventListener('click', (e) => {
		setStars(elms.id, 3).then(() => {
			elms.menuOneImg.src = stars.off[0]
			elms.menuTwoImg.src = stars.off[1]
			elms.menuOneImg.src = stars.on[2]
		}).catch((err) => {
			console.error(err);
		});
	});

	submissionElms.push(elms);
}