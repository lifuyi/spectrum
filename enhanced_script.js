// Enhanced Winamp Visualizer with Modular Architecture
// Import modules (in a real implementation, these would be ES6 imports)

// Global instances
let audioManager = null;
let playlistManager = null;
let performanceManager = null;
let mobileSupport = null;

// Initialize the enhanced visualizer
async function initializeEnhancedVisualizer() {
  try {
    // Wait for modules to be available
    if (typeof AudioManager === 'undefined' || 
        typeof PlaylistManager === 'undefined' || 
        typeof PerformanceManager === 'undefined' || 
        typeof MobileSupport === 'undefined') {
      console.log('Waiting for modules to load...');
      setTimeout(initializeEnhancedVisualizer, 100);
      return;
    }

    // Initialize core modules
    audioManager = new AudioManager();
    performanceManager = new PerformanceManager();
    mobileSupport = new MobileSupport();
    
    // Initialize playlist manager
    playlistManager = new PlaylistManager(audioManager);
    playlistManager.setPlaylistElement(document.getElementById('playlist'));
    
    // Set up callbacks
    playlistManager.setCallbacks({
      onTrackChange: (track, index) => {
        console.log('Track changed:', track.name);
        updateNowPlaying(track);
      },
      onPlaylistUpdate: (tracks) => {
        console.log('Playlist updated:', tracks.length, 'tracks');
      }
    });
    
    // Set up enhanced controls
    setupEnhancedControls();
    setupKeyboardShortcuts();
    setupPerformanceMonitoring();
    
    // Mobile support
    if (mobileSupport.isMobile) {
      mobileSupport.createVirtualControls();
    }
    
    // Set global references
    window.enhancedVisualizer.audioManager = audioManager;
    window.enhancedVisualizer.playlistManager = playlistManager;
    window.enhancedVisualizer.performanceManager = performanceManager;
    window.enhancedVisualizer.mobileSupport = mobileSupport;
    
    // Also set individual global references for backward compatibility
    window.audioManager = audioManager;
    window.playlistManager = playlistManager;
    window.performanceManager = performanceManager;
    window.mobileSupport = mobileSupport;
    
    console.log('Enhanced visualizer initialized successfully');
    showSuccessMessage('Enhanced visualizer loaded successfully!');
    
  } catch (error) {
    console.error('Failed to initialize enhanced visualizer:', error);
    showErrorMessage('Initialization failed: ' + error.message);
  }
}

// Setup playlist controls
function setupPlaylistControls() {
  // Shuffle button
  const shuffleBtn = document.getElementById('shuffle-btn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      const isShuffled = playlistManager.toggleShuffle();
      shuffleBtn.textContent = isShuffled ? 'Shuffle: ON' : 'Shuffle: OFF';
      shuffleBtn.style.background = isShuffled ? '#2a2a2a' : '#1a1a1a';
    });
  }
  
  // Repeat button
  const repeatBtn = document.getElementById('repeat-btn');
  if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
      const modes = ['none', 'one', 'all'];
      const currentMode = playlistManager.getPlaylistInfo().repeatMode;
      const currentIndex = modes.indexOf(currentMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      
      playlistManager.setRepeatMode(nextMode);
      repeatBtn.textContent = `Repeat: ${nextMode.toUpperCase()}`;
    });
  }
  
  // Clear playlist button
  const clearBtn = document.getElementById('clear-playlist');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear entire playlist?')) {
        playlistManager.clearPlaylist();
        showInfoMessage('Playlist cleared');
      }
    });
  }
  
  // Save playlist button
  const saveBtn = document.getElementById('save-playlist');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = prompt('Enter playlist name:', 'My Playlist');
      if (name) {
        if (playlistManager.savePlaylist(name)) {
          showSuccessMessage(`Playlist "${name}" saved`);
        } else {
          showErrorMessage('Failed to save playlist');
        }
      }
    });
  }
  
  // Load playlist button
  const loadBtn = document.getElementById('load-playlist');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      const name = prompt('Enter playlist name to load:', 'My Playlist');
      if (name) {
        if (playlistManager.loadPlaylist(name)) {
          showSuccessMessage(`Playlist "${name}" loaded`);
        } else {
          showErrorMessage('Failed to load playlist');
        }
      }
    });
  }
}

// Enhanced controls setup
function setupEnhancedControls() {
  // Volume control
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  
  if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      audioManager.setVolume(volume);
      volumeValue.textContent = e.target.value + '%';
    });
  }
  
  // Enhanced file loading with validation
  const fileInput = document.getElementById('file');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          await audioManager.loadFile(file);
          playlistManager.addTrack({
            name: file.name,
            file: file,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          });
          
          // Auto-play first track if playlist was empty
          if (playlistManager.getTracks().length === 1) {
            await playlistManager.playTrack(0);
          }
        } catch (error) {
          showErrorMessage(`Failed to load ${file.name}: ${error.message}`);
        }
      }
    });
  }
  
  // Enhanced URL loading
  const urlBtn = document.getElementById('url');
  if (urlBtn) {
    urlBtn.addEventListener('click', async () => {
      const url = prompt('Enter audio URL:');
      if (url) {
        try {
          await audioManager.loadFromURL(url);
          playlistManager.addTrack({
            name: extractFilenameFromURL(url),
            url: url,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          });
          
          // Auto-play if first track
          if (playlistManager.getTracks().length === 1) {
            await playlistManager.playTrack(0);
          }
        } catch (error) {
          showErrorMessage(`Failed to load URL: ${error.message}`);
        }
      }
    });
  }
  
  // Enhanced microphone support
  const micBtn = document.getElementById('mic');
  if (micBtn) {
    micBtn.addEventListener('click', async () => {
      try {
        await audioManager.loadFromMicrophone();
        showSuccessMessage('Microphone connected successfully');
      } catch (error) {
        showErrorMessage(`Microphone error: ${error.message}`);
      }
    });
  }
  
  // Enhanced playlist controls
  setupPlaylistControls();
  
  // Enhanced play/pause with playlist support
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  
  if (playBtn) {
    playBtn.addEventListener('click', async () => {
      if (playlistManager.getCurrentTrack()) {
        await audioManager.play();
      } else if (playlistManager.getTracks().length > 0) {
        await playlistManager.playTrack(0);
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      audioManager.pause();
    });
  }
  
  // Low power mode toggle
  const lowPowerChk = document.getElementById('low-power');
  if (lowPowerChk) {
    lowPowerChk.addEventListener('change', (e) => {
      if (e.target.checked) {
        performanceManager.enableLowPowerMode();
        document.body.classList.add('low-power-mode');
      } else {
        performanceManager.disableLowPowerMode();
        document.body.classList.remove('low-power-mode');
      }
    });
  }
}

// Enhanced keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (audioManager.isPlaying()) {
          audioManager.pause();
        } else {
          audioManager.play();
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        playlistManager.playPrevious();
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        playlistManager.playNext();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        adjustVolume(0.1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        adjustVolume(-0.1);
        break;
        
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
        
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
        
      case 's':
      case 'S':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          takeScreenshot();
        } else {
          playlistManager.toggleShuffle();
        }
        break;
        
      case 'r':
      case 'R':
        e.preventDefault();
        cycleRepeatMode();
        break;
        
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault();
        const themeIndex = parseInt(e.key) - 1;
        switchToThemeByIndex(themeIndex);
        break;
    }
  });
}

// Performance monitoring
function setupPerformanceMonitoring() {
  const performanceIndicator = document.getElementById('performance-indicator');
  const fpsCounter = document.getElementById('fps-counter');
  const memoryUsage = document.getElementById('memory-usage');
  
  if (performanceIndicator && fpsCounter && memoryUsage) {
    // Show performance indicator in debug mode
    if (localStorage.getItem('debug-mode') === 'true') {
      performanceIndicator.classList.add('show');
    }
    
    // Update performance stats every second
    setInterval(() => {
      const stats = performanceManager.getPerformanceStats();
      fpsCounter.textContent = stats.fps;
      memoryUsage.textContent = Math.round(stats.memoryUsage.used) + 'MB';
      
      // Auto-enable low power mode if performance is poor
      if (stats.fps < 30 && !stats.isLowPowerMode) {
        performanceManager.enableLowPowerMode();
        document.body.classList.add('low-power-mode');
        showWarningMessage('Low power mode enabled due to performance issues');
      }
    }, 1000);
  }
}

// Utility functions
function adjustVolume(delta) {
  const currentVolume = audioManager.getVolume();
  const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
  audioManager.setVolume(newVolume);
  
  // Update UI
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  if (volumeSlider && volumeValue) {
    volumeSlider.value = newVolume * 100;
    volumeValue.textContent = Math.round(newVolume * 100) + '%';
  }
}

function toggleMute() {
  const currentVolume = audioManager.getVolume();
  if (currentVolume > 0) {
    // Store current volume and mute
    localStorage.setItem('pre-mute-volume', currentVolume.toString());
    audioManager.setVolume(0);
  } else {
    // Restore previous volume
    const previousVolume = parseFloat(localStorage.getItem('pre-mute-volume') || '1');
    audioManager.setVolume(previousVolume);
  }
  
  // Update UI
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  if (volumeSlider && volumeValue) {
    volumeSlider.value = audioManager.getVolume() * 100;
    volumeValue.textContent = Math.round(audioManager.getVolume() * 100) + '%';
  }
}

function cycleRepeatMode() {
  const modes = ['none', 'one', 'all'];
  const currentMode = playlistManager.getPlaylistInfo().repeatMode;
  const currentIndex = modes.indexOf(currentMode);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  
  playlistManager.setRepeatMode(nextMode);
  showInfoMessage(`Repeat mode: ${nextMode}`);
}

function switchToThemeByIndex(index) {
  const themeSelect = document.getElementById('theme');
  if (themeSelect && themeSelect.options[index]) {
    themeSelect.selectedIndex = index;
    themeSelect.dispatchEvent(new Event('change'));
  }
}

function extractFilenameFromURL(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'Unknown Track';
  } catch {
    return 'Unknown Track';
  }
}

function updateNowPlaying(track) {
  // Update document title
  document.title = `${track.name} - Winamp Spectrum`;
  
  // Update any now-playing displays
  const nowPlayingElements = document.querySelectorAll('.now-playing');
  nowPlayingElements.forEach(el => {
    el.textContent = `${track.artist} - ${track.name}`;
  });
}

// Message system
function showMessage(message, type = 'info', duration = 3000) {
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : type === 'warning' ? '#ffaa44' : '#4444ff'};
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 300);
  }, duration);
}

function showErrorMessage(message) {
  showMessage(message, 'error', 5000);
}

function showSuccessMessage(message) {
  showMessage(message, 'success', 2000);
}

function showWarningMessage(message) {
  showMessage(message, 'warning', 4000);
}

function showInfoMessage(message) {
  showMessage(message, 'info', 2000);
}

// Enhanced render loop with performance management
function enhancedRender(timestamp) {
  if (!performanceManager.shouldRender(timestamp)) {
    requestAnimationFrame(enhancedRender);
    return;
  }
  
  performanceManager.updateFrameStats(timestamp);
  
  // Get audio data
  const freqData = audioManager.getFrequencyData();
  if (freqData.length > 0) {
    // Process audio data and render visualization
    // This would integrate with the existing visualization code
    renderVisualization(freqData);
  }
  
  // Clean up resources periodically
  if (timestamp % 5000 < 16) { // Every 5 seconds
    performanceManager.processDisposalQueue();
  }
  
  requestAnimationFrame(enhancedRender);
}

// Placeholder for visualization rendering (would integrate with existing code)
function renderVisualization(freqData) {
  // This would call the existing visualization functions
  // with performance optimizations applied
}

// CSS animations for messages
const messageStyles = document.createElement('style');
messageStyles.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(messageStyles);

// Initialize when DOM is ready and modules are loaded
function startInitialization() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedVisualizer);
  } else {
    initializeEnhancedVisualizer();
  }
}

// Start initialization after a short delay to ensure modules are loaded
setTimeout(startInitialization, 50);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (audioManager) audioManager.destroy();
  if (performanceManager) performanceManager.destroy();
  if (mobileSupport) mobileSupport.destroy();
});

// Export for global access (will be set after initialization)
window.enhancedVisualizer = {
  audioManager: null,
  playlistManager: null,
  performanceManager: null,
  mobileSupport: null,
  
  // Helper methods
  addTrack: (track) => window.enhancedVisualizer.playlistManager?.addTrack(track),
  playTrack: (index) => window.enhancedVisualizer.playlistManager?.playTrack(index),
  setVolume: (volume) => window.enhancedVisualizer.audioManager?.setVolume(volume),
  getStats: () => window.enhancedVisualizer.performanceManager?.getPerformanceStats()
};