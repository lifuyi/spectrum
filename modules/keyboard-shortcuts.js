// Enhanced Keyboard Shortcuts Module
class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
    this.modifierKeys = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false
    };
    
    this.init();
  }

  init() {
    this.setupDefaultShortcuts();
    this.bindEvents();
  }

  setupDefaultShortcuts() {
    // Playback controls
    this.addShortcut('Space', 'Toggle Play/Pause', () => {
      const playBtn = document.getElementById('play');
      const pauseBtn = document.getElementById('pause');
      if (playBtn && !playBtn.disabled) {
        playBtn.click();
      } else if (pauseBtn && !pauseBtn.disabled) {
        pauseBtn.click();
      }
    });

    this.addShortcut('ArrowLeft', 'Previous Track', () => {
      if (window.playlistManager) {
        window.playlistManager.playPrevious();
      }
    });

    this.addShortcut('ArrowRight', 'Next Track', () => {
      if (window.playlistManager) {
        window.playlistManager.playNext();
      }
    });

    this.addShortcut('ArrowUp', 'Volume Up', () => {
      this.adjustVolume(0.1);
    });

    this.addShortcut('ArrowDown', 'Volume Down', () => {
      this.adjustVolume(-0.1);
    });

    // Visualization controls
    this.addShortcut('v', 'Cycle Visualization Style', () => {
      this.cycleSelect('style');
    });

    this.addShortcut('t', 'Cycle Theme', () => {
      this.cycleSelect('theme');
    });

    this.addShortcut('b', 'Toggle Bar Style', () => {
      this.cycleSelect('bar-style');
    });

    // Effects toggles
    this.addShortcut('e', 'Toggle Effects', () => {
      this.toggleCheckbox('effects');
    });

    this.addShortcut('g', 'Toggle Grid', () => {
      this.toggleCheckbox('grid');
    });

    this.addShortcut('p', 'Toggle Peaks', () => {
      this.toggleCheckbox('peaks');
    });

    this.addShortcut('s', 'Toggle Shake Mode', () => {
      this.toggleCheckbox('shake');
    });

    this.addShortcut('z', 'Toggle Beat Zoom', () => {
      this.toggleCheckbox('zoom');
    });

    // Fullscreen and screenshot
    this.addShortcut('f', 'Toggle Fullscreen', () => {
      document.getElementById('fullscreen')?.click();
    });

    this.addShortcut('ctrl+s', 'Take Screenshot', (e) => {
      e.preventDefault();
      document.getElementById('screenshot')?.click();
    });

    // 3D mode controls
    this.addShortcut('3', 'Switch to 3D Mode', () => {
      const styleSelect = document.getElementById('style');
      if (styleSelect) {
        const option3D = Array.from(styleSelect.options).find(opt => opt.value.startsWith('3d-'));
        if (option3D) {
          styleSelect.value = option3D.value;
          styleSelect.dispatchEvent(new Event('change'));
        }
      }
    });

    this.addShortcut('2', 'Switch to 2D Mode', () => {
      const styleSelect = document.getElementById('style');
      if (styleSelect) {
        const option2D = Array.from(styleSelect.options).find(opt => !opt.value.startsWith('3d-'));
        if (option2D) {
          styleSelect.value = option2D.value;
          styleSelect.dispatchEvent(new Event('change'));
        }
      }
    });

    // Camera controls for 3D mode
    this.addShortcut('c', 'Toggle 3D Camera Dance', () => {
      this.toggleCheckbox('camera-movement');
    });

    // Particle effects
    this.addShortcut('shift+p', 'Toggle Particle Burst', () => {
      this.toggleCheckbox('particles-effect');
    });

    this.addShortcut('shift+t', 'Toggle Particle Trails', () => {
      this.toggleCheckbox('particle-trails');
    });

    this.addShortcut('shift+f', 'Toggle Fireworks', () => {
      this.toggleCheckbox('fireworks');
    });

    // EQ controls
    this.addShortcut('ctrl+r', 'Reset EQ', (e) => {
      e.preventDefault();
      document.getElementById('reset-eq')?.click();
    });

    this.addShortcut('ctrl+e', 'Toggle EQ', (e) => {
      e.preventDefault();
      this.toggleCheckbox('eq-enable');
    });

    // File operations
    this.addShortcut('ctrl+o', 'Open File', (e) => {
      e.preventDefault();
      document.getElementById('file')?.click();
    });

    this.addShortcut('ctrl+u', 'Load URL', (e) => {
      e.preventDefault();
      document.getElementById('url')?.click();
    });

    this.addShortcut('m', 'Toggle Microphone', () => {
      document.getElementById('mic')?.click();
    });

    // Low power mode
    this.addShortcut('l', 'Toggle Low Power Mode', () => {
      this.toggleCheckbox('low-power');
    });

    // Help
    this.addShortcut('h', 'Show Help', () => {
      this.showHelp();
    });

    this.addShortcut('?', 'Show Help', () => {
      this.showHelp();
    });

    // Number keys for quick theme selection
    for (let i = 1; i <= 9; i++) {
      this.addShortcut(i.toString(), `Select Theme ${i}`, () => {
        this.selectThemeByIndex(i - 1);
      });
    }
  }

  addShortcut(key, description, callback) {
    const normalizedKey = this.normalizeKey(key);
    this.shortcuts.set(normalizedKey, {
      key: normalizedKey,
      description,
      callback
    });
  }

  removeShortcut(key) {
    const normalizedKey = this.normalizeKey(key);
    this.shortcuts.delete(normalizedKey);
  }

  normalizeKey(key) {
    // Handle modifier combinations
    const parts = key.toLowerCase().split('+');
    const modifiers = [];
    let mainKey = '';

    parts.forEach(part => {
      if (['ctrl', 'shift', 'alt', 'meta'].includes(part)) {
        modifiers.push(part);
      } else {
        mainKey = part;
      }
    });

    return modifiers.sort().concat(mainKey).join('+');
  }

  bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;
      
      // Don't trigger shortcuts when typing in inputs
      if (this.isTypingInInput(e.target)) return;
      
      this.updateModifierKeys(e);
      const key = this.getKeyFromEvent(e);
      const shortcut = this.shortcuts.get(key);
      
      if (shortcut) {
        try {
          shortcut.callback(e);
        } catch (error) {
          console.error('Error executing shortcut:', error);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this.updateModifierKeys(e);
    });

    // Prevent default behavior for some keys
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Space' && !this.isTypingInInput(e.target)) {
        e.preventDefault();
      }
    });
  }

  updateModifierKeys(e) {
    this.modifierKeys.ctrl = e.ctrlKey;
    this.modifierKeys.shift = e.shiftKey;
    this.modifierKeys.alt = e.altKey;
    this.modifierKeys.meta = e.metaKey;
  }

  getKeyFromEvent(e) {
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.shiftKey) modifiers.push('shift');
    if (e.altKey) modifiers.push('alt');
    if (e.metaKey) modifiers.push('meta');

    let key = e.key.toLowerCase();
    
    // Handle special keys
    const specialKeys = {
      ' ': 'space',
      'arrowup': 'arrowup',
      'arrowdown': 'arrowdown',
      'arrowleft': 'arrowleft',
      'arrowright': 'arrowright'
    };
    
    if (specialKeys[key]) {
      key = specialKeys[key];
    }

    return modifiers.sort().concat(key).join('+');
  }

  isTypingInInput(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase()) ||
           element.contentEditable === 'true';
  }

  // Helper methods for common actions
  adjustVolume(delta) {
    if (window.audioManager) {
      const currentVolume = window.audioManager.getVolume();
      const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
      window.audioManager.setVolume(newVolume);
      this.showVolumeIndicator(newVolume);
    }
  }

  showVolumeIndicator(volume) {
    // Create temporary volume indicator
    let indicator = document.getElementById('volume-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'volume-indicator';
      indicator.className = 'volume-indicator';
      document.body.appendChild(indicator);
    }

    indicator.textContent = `Volume: ${Math.round(volume * 100)}%`;
    indicator.style.display = 'block';

    clearTimeout(indicator.hideTimeout);
    indicator.hideTimeout = setTimeout(() => {
      indicator.style.display = 'none';
    }, 1500);
  }

  cycleSelect(selectId) {
    const select = document.getElementById(selectId);
    if (select) {
      const currentIndex = select.selectedIndex;
      const nextIndex = (currentIndex + 1) % select.options.length;
      select.selectedIndex = nextIndex;
      select.dispatchEvent(new Event('change'));
      
      this.showSelectionIndicator(select.options[nextIndex].textContent);
    }
  }

  toggleCheckbox(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
      
      const label = checkbox.closest('label')?.textContent || checkboxId;
      this.showToggleIndicator(label, checkbox.checked);
    }
  }

  showSelectionIndicator(text) {
    this.showIndicator(`Selected: ${text}`);
  }

  showToggleIndicator(label, enabled) {
    this.showIndicator(`${label}: ${enabled ? 'ON' : 'OFF'}`);
  }

  showIndicator(text) {
    let indicator = document.getElementById('shortcut-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'shortcut-indicator';
      indicator.className = 'shortcut-indicator';
      document.body.appendChild(indicator);
    }

    indicator.textContent = text;
    indicator.style.display = 'block';

    clearTimeout(indicator.hideTimeout);
    indicator.hideTimeout = setTimeout(() => {
      indicator.style.display = 'none';
    }, 2000);
  }

  selectThemeByIndex(index) {
    const themeSelect = document.getElementById('theme');
    if (themeSelect && themeSelect.options[index]) {
      themeSelect.selectedIndex = index;
      themeSelect.dispatchEvent(new Event('change'));
      this.showSelectionIndicator(themeSelect.options[index].textContent);
    }
  }

  showHelp() {
    const helpModal = this.createHelpModal();
    document.body.appendChild(helpModal);
  }

  createHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.innerHTML = `
      <div class="help-modal-content">
        <div class="help-modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="help-close-btn">&times;</button>
        </div>
        <div class="help-modal-body">
          ${this.generateHelpContent()}
        </div>
      </div>
    `;

    // Close button functionality
    modal.querySelector('.help-close-btn').addEventListener('click', () => {
      modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    return modal;
  }

  generateHelpContent() {
    const categories = {
      'Playback': [
        'Space - Toggle Play/Pause',
        '← → - Previous/Next Track',
        '↑ ↓ - Volume Up/Down',
        'M - Toggle Microphone'
      ],
      'Visualization': [
        'V - Cycle Visualization Style',
        'T - Cycle Theme',
        'B - Toggle Bar Style',
        '2 - Switch to 2D Mode',
        '3 - Switch to 3D Mode',
        '1-9 - Quick Theme Selection'
      ],
      'Effects': [
        'E - Toggle Effects',
        'G - Toggle Grid',
        'P - Toggle Peaks',
        'S - Toggle Shake Mode',
        'Z - Toggle Beat Zoom',
        'C - Toggle 3D Camera Dance',
        'L - Toggle Low Power Mode'
      ],
      'Particles': [
        'Shift+P - Toggle Particle Burst',
        'Shift+T - Toggle Particle Trails',
        'Shift+F - Toggle Fireworks'
      ],
      'File Operations': [
        'Ctrl+O - Open File',
        'Ctrl+U - Load URL',
        'Ctrl+S - Take Screenshot',
        'F - Toggle Fullscreen'
      ],
      'Audio': [
        'Ctrl+E - Toggle EQ',
        'Ctrl+R - Reset EQ'
      ],
      'Help': [
        'H or ? - Show This Help'
      ]
    };

    let html = '';
    Object.entries(categories).forEach(([category, shortcuts]) => {
      html += `<div class="help-category">
        <h3>${category}</h3>
        <ul>
          ${shortcuts.map(shortcut => `<li>${shortcut}</li>`).join('')}
        </ul>
      </div>`;
    });

    return html;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }

  destroy() {
    this.shortcuts.clear();
    
    // Remove indicators
    document.getElementById('volume-indicator')?.remove();
    document.getElementById('shortcut-indicator')?.remove();
    document.querySelector('.help-modal')?.remove();
  }
}

export default KeyboardShortcuts;