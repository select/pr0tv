// ==UserScript==
// @name         pr0-tv
// @namespace    http://github.com/select
// @version      0.7
// @description  Like TV but better
// @author       You
// @match        http*://pr0gramm.com/*
// @grant        none
// ==/UserScript==
(function() {
  'use strict';
  let nextVideoTimout;
  let isRunning = false;

  /**
   * HTML Element
   * prepare HTML Elements
   */
  const overlayEl = document.createElement('div'); // overlay in which we place the videos
  overlayEl.className = 'tv-overlay';
  overlayEl.style.display = 'none';

  const overlayCountDownEl = document.createElement('div');
  overlayCountDownEl.className = 'loading';
  overlayCountDownEl.innerHTML = '... warten';
  overlayEl.appendChild(overlayCountDownEl);

  const controlEl = document.createElement('div');
  controlEl.className = 'tv-control';
  controlEl.innerHTML = '<span class="icon-pr0-tv"></span>';
  controlEl.addEventListener('click', toggle);

  const styleEl = document.createElement('style');
  document.querySelector('head').appendChild(styleEl);

  const bodyEl = document.querySelector('body');
  bodyEl.insertBefore(overlayEl, bodyEl.firstChild);
  bodyEl.insertBefore(controlEl, bodyEl.firstChild);

  // set the CSS for the modal overlay in which we will move each video
  setCSS();
  // set the CSS again if the window resizes (going to fullscree, debugger, ...)
  window.onresize = setCSS;
  // hide the mouse when not moved
  overlayEl.addEventListener('mousemove', hideMouseWhenIdle);

  // FIXME does not work
  // document.querySelector('.stream-next').addEventListener('click', nextOnFinish)

  /**
   * ## Keyboard Shortcuts
   * Bind keyboard shortcuts:
   * - Space: pause video
   * - ESC: exit pr0tv
   * - P: toggle pr0tv on off
   * - right/left: next previous video
   * left does not work good since we might need to skip several items
   * with images before we get to the previous video
   */
  document.addEventListener('keydown', (event) => {
    if (event.keyCode === 32 /*Space*/ ) {
      togglePauseVideo();
      event.preventDefault();
    }
    if (event.keyCode === 27 && isRunning/*Esc*/ ) {
      event.preventDefault();
      event.stopPropagation();
      exit();
    }
    if (event.keyCode === 80 /*P*/ ) {
      toggle();
    }
    if (isRunning && (event.keyCode === 37 /*left*/)) {
      console.log('left key');
      nextOnFinish(true);
    }
    if (isRunning && (event.keyCode === 39 /*right*/)) {
      console.log('right key');
      nextOnFinish();
    }
  }, false);

  // https://stackoverflow.com/a/4483383/1436151
  var mouseTimer = null, cursorVisible = true;
  function disappearCursor() {
    console.log('hide cursor!');
    mouseTimer = null;
    document.body.style.cursor = 'none';
    cursorVisible = false;
  }
  function hideMouseWhenIdle() {
    if (mouseTimer) {
        window.clearTimeout(mouseTimer);
    }
    if (!cursorVisible) {
        document.body.style.cursor = 'default';
        cursorVisible = true;
    }
    mouseTimer = window.setTimeout(disappearCursor, 5000);
  }


  /**
   * ##exit
   * Stop pr0-tv and exit the fullscreen mode, move the video back into its old parent
   */
  function exit() {
    exitFullscreen();
    clearTimeout(nextVideoTimout);
    var itemEl = document.querySelector('.item-container-content');
    const videoEl = document.querySelector('video');
    itemEl.insertBefore(videoEl.parentElement, itemEl.firstChild);
    // videoEl.pause();
    overlayEl.style.display = 'none';
    bodyEl.style.overflowY = '';
    document.body.style.cursor = 'default';
  }

  /**
   * ##toggle
   * Start or stop pr0-tv depending on its previous state
   */
  function toggle() {
    if (!isRunning) {
      // if the stream is not opened one elment, open the first element
      if(document.querySelectorAll('.item-container').length < 1) {
        eventFire(document.querySelector('#stream .silent.thumb'), 'click');
      }
      launchFullscreen(document.documentElement);
      nextOnFinish();
      overlayEl.style.display = '';
      bodyEl.style.overflowY = 'hidden'; // make scrollbar disappear
    } else {
      exit();
    }
    isRunning = !isRunning;
    console.log('Pr0 TV running: ', isRunning);
  }

  /**
   * ##setCSS
   * Calculate values needed for and set the CSS for pr0-tv.
   * The size of the overlay modal has to be calculated.
   */
  function setCSS() {
    const viewportSize = getViewportSize();
    styleEl.innerHTML = `
    .tv-overlay {
      width: ${viewportSize.x}px;
      height: ${viewportSize.y}px;
    }
    .tv-overlay video {
      width: ${viewportSize.x}px;
      height: ${viewportSize.y-3}px; /*so we can still see the progress bar*/
    }
    `;
  }

  /**
   * ##launchFullscreen
   * Code from https://davidwalsh.name/fullscreen
   * @param {HTMLElement} element ??
   */
  function launchFullscreen(element) {
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  /**
   * ##exitFullscreen
   * Code from https://davidwalsh.name/fullscreen
   */
  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }

  /**
   * ##eventFire
   * Fire an event like click
   * Code from http://stackoverflow.com/a/2706236/1436151
   * @param {HTMLElement} el element on which the event should be triggered
   * @param {String} etype event type e.g. 'click'
   */
  function eventFire(el, etype) {
    if (el.fireEvent) {
      el.fireEvent('on' + etype);
    } else {
      const evObj = document.createEvent('Events');
      evObj.initEvent(etype, true, false);
      el.dispatchEvent(evObj);
    }
  }

  /**
   * ##clickNext
   * Trigger a click on the next item in stream button.
   * If there would be an open API we would not need this :P
   * Also start the checks and video ended event listening so we can start
   * the next video immediately.
   */
  function clickNext() {
    if (isRunning) {
      eventFire(document.querySelector('.stream-next'), 'click');
      nextOnFinish();
    }
  }
  function clickPrev() {
    if (isRunning) {
      eventFire(document.querySelector('.stream-prev'), 'click');
      nextOnFinish(true);
    }
  }

  /**
   * ##getViewportSize
   * Get the size of the current visible area.
   * Code from https://stackoverflow.com/a/11744120/1436151
   * @return {Object} viewport dimensions `{x: Number, y: Number}`
   */
  function getViewportSize() {
    var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight || e.clientHeight || g.clientHeight;
    return {x, y};
  }

  /**
   * ##nextOnFinish
   * Scan the page and search for a <video> element, if there is one
   * grab its parent (to inlcude the controls) and move it to the overlay.
   * Listen to the `ended` event and after a short timeout
   * start the next video by clicking the "next" link on the video controls.
   * If the next item is not a video skip by clicking next immediately.
   * @param {Boolean} previous go to previous video
   */
  function nextOnFinish(previous) {
    console.log('nextOnFinish');
    clearTimeout(nextVideoTimout);
    if ((overlayEl.children.length > 1) && isRunning) overlayEl.removeChild(overlayEl.lastChild);
    const videoEl = document.querySelector('video');
    if (videoEl) {
      overlayEl.appendChild(videoEl.parentElement);
      videoEl.removeAttribute('loop');
      videoEl.removeAttribute('style');
      videoEl.parentElement.querySelector('.video-controls').style.width = '';
      videoEl.addEventListener('ended', (event) => {
        nextVideoTimout = setTimeout(clickNext, 1000);
      }, false);
      videoEl.play();
    } else {
      // nextVideoTimout = setTimeout(clickNext, 3000);
      // countDown(3000);
      nextVideoTimout = previous ? setTimeout(clickPrev, 10): setTimeout(clickNext, 10);
    }
  }

  /**
   * ##togglePauseVideo
   * Search for a video element on the page and pause it.
   */
  function togglePauseVideo() {
    const videoEl = document.querySelector('video');
    if(videoEl) {
      if (videoEl.paused) videoEl.play();
      else videoEl.pause();
    }
  }


})();


