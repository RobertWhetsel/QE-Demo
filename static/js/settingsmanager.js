// settingsManager.js

/**
 * Initialize the settings manager when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
});

/**
* Load settings from localStorage and apply them
* If no settings are found, use default values
*/
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};

  // Set form values based on stored settings or defaults
  document.getElementById('dateFormat').value = settings.dateFormat || 'mdy';
  document.getElementById('timeFormat').value = settings.timeFormat || '24h';
  document.getElementById('timeOverlayToggle').checked = settings.timeOverlay || false;
  document.getElementById('modeToggle').value = settings.mode || 'day';
  document.getElementById('fontChoice').value = settings.font || 'Arial';

  // Apply the loaded settings
  applySettings(settings);
}

/**
* Set up event listeners for the settings form buttons
*/
function setupEventListeners() {
  document.getElementById('saveButton').addEventListener('click', saveSettings);
  document.getElementById('backButton').addEventListener('click', goBack);
  document.getElementById('cancelButton').addEventListener('click', cancel);
}

/**
* Save the current settings to localStorage and apply them
*/
function saveSettings() {
  const settings = {
      dateFormat: document.getElementById('dateFormat').value,
      timeFormat: document.getElementById('timeFormat').value,
      timeOverlay: document.getElementById('timeOverlayToggle').checked,
      mode: document.getElementById('modeToggle').value,
      font: document.getElementById('fontChoice').value
  };

  localStorage.setItem('settings', JSON.stringify(settings));
  applySettings(settings);
  alert('Settings saved successfully!');
}

/**
* Apply the given settings to the page
* @param {Object} settings - The settings object to apply
*/
function applySettings(settings) {
  document.body.style.fontFamily = settings.font;
  document.body.classList.toggle('night-mode', settings.mode === 'night');
  updateTimeOverlay(settings.timeOverlay, settings.timeFormat);
}

/**
* Update the time overlay based on settings
* @param {boolean} show - Whether to show or hide the overlay
* @param {string} format - The time format to use (12h or 24h)
*/
function updateTimeOverlay(show, format) {
  let overlay = document.getElementById('timeOverlay');
  if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'timeOverlay';
      document.body.appendChild(overlay);
      makeOverlayDraggable();
  }

  if (show) {
      overlay.style.display = 'block';
      updateTime();
      setInterval(updateTime, 1000);
  } else {
      overlay.style.display = 'none';
  }

  /**
   * Update the time displayed in the overlay
   */
  function updateTime() {
      const now = new Date();
      let timeString;
      if (format === '24h') {
          timeString = now.toLocaleTimeString('en-US', { hour12: false });
      } else {
          timeString = now.toLocaleTimeString('en-US', { hour12: true });
      }
      overlay.textContent = timeString;
  }
}

/**
* Navigate back to the previous page
*/
function goBack() {
  window.history.back();
}

/**
* Cancel changes and reload the original settings
*/
function cancel() {
  loadSettings();
}

/**
* Make the time overlay draggable
*/
function makeOverlayDraggable() {
  const overlay = document.getElementById('timeOverlay');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  overlay.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  /**
   * Start dragging the overlay
   * @param {MouseEvent} e - The mousedown event
   */
  function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === overlay) {
          isDragging = true;
      }
  }

  /**
   * Drag the overlay
   * @param {MouseEvent} e - The mousemove event
   */
  function drag(e) {
      if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;

          xOffset = currentX;
          yOffset = currentY;

          setTranslate(currentX, currentY, overlay);
      }
  }

  /**
   * End dragging the overlay
   */
  function dragEnd() {
      initialX = currentX;
      initialY = currentY;

      isDragging = false;
  }

  /**
   * Set the position of the overlay
   * @param {number} xPos - The x-coordinate
   * @param {number} yPos - The y-coordinate
   * @param {HTMLElement} el - The element to move
   */
  function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }
}
