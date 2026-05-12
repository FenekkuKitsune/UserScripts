// ==UserScript==
// @name        SovietWomble's Video Viewer
// @namespace   https://github.com/FenekkuKitsune/UserScripts
// @icon
// @version     1.0.0
//
// @match       https://iframe.mediadelivery.net/embed/5105/*
// @match       https://sovietscloset.com/video/*
// @grant       none
//
// @author      FenekkuKitsune
// @updateURL  https://raw.githubusercontent.com/FenekkuKitsune/UserScripts/refs/heads/main/SovietWomble's%20Video%20Viewer.js
// @description Communication script for videos on Soviet's Closet
// ==/UserScript==
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

function secsToTime(seconds) {
  // Calculate hours + remainder.
  let pHours = seconds / 3600;
  let hours = Math.floor(pHours);
  // Calculate minutes + remainder.
  let pMins = (pHours - hours) * 60;
  let mins = Math.floor(pMins);
  // Finally, calculate seconds.
  let pSecs = (pMins - mins) * 60;
  let secs = Math.floor(pSecs);

  // Don't include hours if hours is 0.
  if (hours > 0) {
    hours = hours + ':';
  } else {
    hours = '';
  }

  // Minutes is displayed as MM.
  if (mins < 10 && mins > 0) {
    mins = '0' + mins;
  } else if (mins == 0) {
    mins = '00';
  }

  // Seconds is displayed as SS.
  if (secs < 10 && secs > 0) {
    secs = '0' + secs;
  } else if (secs == 0) {
    secs = '00';
  }

  // Return time as H:MM:SS, with hours only included if applicable.
  return hours + mins + ':' + secs;
}

function timeToSecs(hours, mins, secs) {
  return secs + mins * 60 + hours * 3600;
}

function updateSeekTime(frame, time) {
  frame.setAttribute('src', frame.getAttribute('src') + '&t=' + time);
}

function createDoneButton(addTo) {
  let button = document.createElement('button');
  let span = document.createElement('span');

  // Set element styles to be the same as the existing buttons
  button.id = 'markDone';
  button.classList = 'v-btn v-btn--outlined theme--dark v-size--default';
  span.classList = 'v-btn__content';

  // Set extra details
  button.setAttribute('type', 'button');
  // button.setAttribute('onclick', 'markDone(this)');
  span.textContent = 'Mark Completed';

  button.appendChild(span);
  addTo.prepend(button);

  button.onclick = function() {
    trackProgress = false;

    setCookie(cookieName, '-1', '-1');

    console.log('Cookie "' + cookieName + '" deleted');

    this.style.backgroundColor = 'green';
  }
}

if (window.location.pathname.match(/\/embed\/5105\/[^ ]*/)) {
  waitForElm('input[data-plyr*="seek"').then((elm) => {
    const vidObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'aria-valuenow') {
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
}
if (window.location.pathname.match(/\/video\/[^ ]*/)) {
  // Inject CSS
  let styles = document.createElement('style');
  styles.textContent = '#markDone {\n\tposition: absolute;\n\ttop: 0.35em;\n\tright: 0.5em;\n}\n\n.container {\n\tmax-width: none;\n}\n\n.flex > div:nth-child(2) {\n\tpadding-top: 85vh !important;\n}';
  document.head.appendChild(styles);

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