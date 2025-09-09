// Enhanced Winamp Visualizer with Modular Architecture
// Import modules (in a real implementation, these would be ES6 imports)

// Global instances
let audioManager = null;
let playlistManager = null;
let performanceManager = null;
let mobileSupport = null;
let musicTheoryAnalyzer = null;
let bpmDetector = null;

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
    
    // Initialize music theory and BPM detection modules
    if (typeof MusicTheoryAnalyzer !== 'undefined') {
      musicTheoryAnalyzer = new MusicTheoryAnalyzer();
      setupMusicTheoryCallbacks();
      
    }
    
    if (typeof BPMDetector !== 'undefined') {
      bpmDetector = new BPMDetector();
      setupBPMCallbacks();
    }
    
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
    window.enhancedVisualizer.musicTheoryAnalyzer = musicTheoryAnalyzer;
    window.enhancedVisualizer.bpmDetector = bpmDetector;
    
    // Also set individual global references for backward compatibility
    window.audioManager = audioManager;
    window.playlistManager = playlistManager;
    window.performanceManager = performanceManager;
    window.mobileSupport = mobileSupport;
    window.musicTheoryAnalyzer = musicTheoryAnalyzer;
    window.bpmDetector = bpmDetector;
    
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
      // Stop current playback before loading new files
      if (audioManager.isPlaying()) {
        audioManager.stop();
      }
      
      for (const file of files) {
        try {
          playlistManager.addTrack({
            name: file.name,
            file: file,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          });
        } catch (error) {
          showErrorMessage(`Failed to add ${file.name}: ${error.message}`);
        }
      }
      
      // Auto-play the last added track
      if (files.length > 0) {
        const trackIndex = playlistManager.getTracks().length - 1;
        await playlistManager.playTrack(trackIndex);
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
          // Stop current playback before loading new URL
          if (audioManager.isPlaying()) {
            audioManager.stop();
          }
          
          playlistManager.addTrack({
            name: extractFilenameFromURL(url),
            url: url,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          });
          
          // Auto-play the new track
          const trackIndex = playlistManager.getTracks().length - 1;
          await playlistManager.playTrack(trackIndex);
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
  
  // Music theory toggle
  setTimeout(() => {
    const musicTheoryToggle = document.getElementById('music-theory-toggle');
    const musicTheoryPanel = document.getElementById('music-theory-panel');
    if (musicTheoryToggle && musicTheoryPanel) {
      // Set initial state based on checkbox
      musicTheoryPanel.style.display = musicTheoryToggle.checked ? 'block' : 'none';
      
      musicTheoryToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          musicTheoryPanel.style.display = 'block';
          if (musicTheoryAnalyzer) {
            musicTheoryAnalyzer.startAnalysis();
          }
        } else {
          musicTheoryPanel.style.display = 'none';
          if (musicTheoryAnalyzer) {
            musicTheoryAnalyzer.stopAnalysis();
          }
        }
      });
    }
  }, 100);
  
  // BPM toggle
  setTimeout(() => {
    const bpmToggle = document.getElementById('bpm-toggle');
    const bpmPanel = document.getElementById('bpm-panel');
    if (bpmToggle && bpmPanel) {
      // Set initial state based on checkbox
      bpmPanel.style.display = bpmToggle.checked ? 'block' : 'none';
      
      bpmToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          bpmPanel.style.display = 'block';
          if (bpmDetector) {
            console.log('Starting BPM analysis...');
            bpmDetector.startAnalysis();
          }
        } else {
          bpmPanel.style.display = 'none';
          if (bpmDetector) {
            console.log('Stopping BPM analysis...');
            bpmDetector.stopAnalysis();
          }
        }
      });
      
      // Auto-start BPM analysis if checkbox is already checked
      if (bpmToggle.checked && bpmDetector) {
        console.log('Auto-starting BPM analysis (checkbox was checked)...');
        bpmDetector.startAnalysis();
      }
    }
  }, 100);
  
  // Spectrum toggle
  setTimeout(() => {
    const spectrumToggle = document.getElementById('spectrum-toggle');
    const spectrumPanel = document.getElementById('spectrum-panel');
    if (spectrumToggle && spectrumPanel) {
      // Set initial state based on checkbox
      spectrumPanel.style.display = spectrumToggle.checked ? 'block' : 'none';
      
      spectrumToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          spectrumPanel.style.display = 'block';
        } else {
          spectrumPanel.style.display = 'none';
        }
      });
    }
  }, 100);
  
  // Set up confidence threshold sliders
  setTimeout(() => {
    const keyConfidenceSlider = document.getElementById('key-confidence-threshold');
    const chordConfidenceSlider = document.getElementById('chord-confidence-threshold');
    const keyConfidenceValue = document.getElementById('key-confidence-value');
    const chordConfidenceValue = document.getElementById('chord-confidence-value');
    
    if (keyConfidenceSlider && keyConfidenceValue) {
      keyConfidenceSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (musicTheoryAnalyzer) {
          musicTheoryAnalyzer.keyConfidenceThreshold = value;
        }
        keyConfidenceValue.textContent = Math.round(value * 100) + '%';
      });
    }
    
    if (chordConfidenceSlider && chordConfidenceValue) {
      // Set initial value to match the analyzer's default
      if (musicTheoryAnalyzer) {
        chordConfidenceSlider.value = musicTheoryAnalyzer.chordConfidenceThreshold;
        chordConfidenceValue.textContent = Math.round(musicTheoryAnalyzer.chordConfidenceThreshold * 100) + '%';
      }
      
      chordConfidenceSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (musicTheoryAnalyzer) {
          musicTheoryAnalyzer.chordConfidenceThreshold = value;
        }
        chordConfidenceValue.textContent = Math.round(value * 100) + '%';
      });
    }
    
    // Set up BPM sensitivity slider
    const bpmSensitivitySlider = document.getElementById('bpm-sensitivity');
    const bpmSensitivityValue = document.getElementById('bpm-sensitivity-value');
    if (bpmSensitivitySlider && bpmDetector) {
      bpmSensitivitySlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        bpmDetector.peakThreshold = value;
        if (bpmSensitivityValue) {
          bpmSensitivityValue.textContent = Math.round(value * 100) + '%';
        }
      });
    }
  }, 100);
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

// Perform music theory and BPM analysis
function analyzeAudioFeatures(freqData) {
  if (freqData.length === 0) return;
  
  // Get time domain data for music theory analysis
  const timeData = new Uint8Array(freqData.length);
  // In a real implementation, we would get this from the analyzer node
  // For now, we'll create a simple sine wave for testing
  for (let i = 0; i < timeData.length; i++) {
    timeData[i] = 128 + Math.sin(i * 0.1) * 127;
  }
  
  // Analyze music theory if enabled
  if (musicTheoryAnalyzer && musicTheoryAnalyzer.isAnalyzing) {
    musicTheoryAnalyzer.analyzeMusic(freqData, timeData);
  }
  
  // Detect BPM if enabled
  if (bpmDetector && bpmDetector.isAnalyzing) {
    bpmDetector.detectBPM(freqData, timeData);
  }
}

// Placeholder for visualization rendering (would integrate with existing code)
function renderVisualization(freqData) {
  // This would call the existing visualization functions
  // with performance optimizations applied
  
  // Perform music theory and BPM analysis
  analyzeAudioFeatures(freqData);
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

// Setup music theory callbacks
function setupMusicTheoryCallbacks() {
  if (!musicTheoryAnalyzer) return;
  
  musicTheoryAnalyzer.setCallbacks({
    onKeyDetected: function(key) {
      const keyElement = document.getElementById('current-key');
      const confidenceElement = document.getElementById('key-confidence');
      const signatureElement = document.getElementById('key-signature');
      
      if (keyElement) {
        keyElement.textContent = key.note + ' ' + key.mode;
        keyElement.className = 'key-display ' + key.mode;
      }
      
      if (confidenceElement) {
        confidenceElement.textContent = Math.round(key.confidence * 100) + '%';
      }
      
      if (signatureElement && musicTheoryAnalyzer) {
        // Update key signature
        const keySignature = musicTheoryAnalyzer.getKeySignature();
        let signatureText = key.note + ' ' + key.mode;
        if (keySignature.sharps > 0) {
          signatureText += ' (' + keySignature.sharps + '♯)';
        } else if (keySignature.flats > 0) {
          signatureText += ' (' + keySignature.flats + '♭)';
        }
        signatureElement.textContent = signatureText;
      }
    },
    
    onChordDetected: function(chord) {
      const chordElement = document.getElementById('current-chord');
      const romanElement = document.getElementById('roman-numeral');
      const confidenceElement = document.getElementById('chord-confidence');
      
      if (chordElement && musicTheoryAnalyzer) {
        const chordText = chord.root + musicTheoryAnalyzer.getChordSymbol(chord.quality);
        chordElement.textContent = chordText;
        chordElement.className = 'chord-display ' + chord.quality;
      }
      
      if (romanElement) {
        romanElement.textContent = chord.roman;
        romanElement.className = 'roman-numeral ' + chord.quality;
      }
      
      if (confidenceElement) {
        const confidenceText = Math.round(chord.confidence * 100) + '%';
        confidenceElement.textContent = confidenceText;
      }
    },
    
    onProgressionUpdate: function(progression) {
      const progressionContainer = document.getElementById('chord-progression');
      if (!progressionContainer) return;
      
      progressionContainer.innerHTML = '';
      
      progression.forEach(function(chord) {
        const chordElement = document.createElement('div');
        chordElement.className = 'chord-item';
        chordElement.innerHTML = `
          <div class="chord-roman">${chord.roman}</div>
          <div class="chord-name">${chord.chord}</div>
          <div class="chord-confidence">${Math.round(chord.confidence * 100)}%</div>
        `;
        progressionContainer.appendChild(chordElement);
      });
    }
  });
}

// Setup BPM callbacks
function setupBPMCallbacks() {
  if (!bpmDetector) return;
  
  bpmDetector.setCallbacks({
    onBPMDetected: function(data) {
      console.log('BPM detected:', data.bpm, 'confidence:', data.confidence);
      const bpmDisplay = document.getElementById('bpm-display');
      const confidenceDisplay = document.getElementById('bpm-confidence');
      const tempoDescription = document.getElementById('tempo-description');
      
      if (bpmDisplay) {
        bpmDisplay.textContent = data.bpm || '--';
      }
      
      if (confidenceDisplay) {
        const confidence = data.confidence || 0;
        confidenceDisplay.textContent = Math.round(confidence * 100) + '%';
      }
      
      if (tempoDescription && bpmDetector) {
        const tempo = bpmDetector.getTempoDescription(data.bpm);
        tempoDescription.textContent = tempo;
      }
    },
    
    onBeatDetected: function(data) {
      // Visual feedback for beat detection
      const bpmPanel = document.getElementById('bpm-panel');
      if (bpmPanel) {
        bpmPanel.classList.add('beat-highlight');
        setTimeout(() => {
          bpmPanel.classList.remove('beat-highlight');
        }, 100);
      }
    }
  });
}

// Export for global access (will be set after initialization)
window.enhancedVisualizer = {
  audioManager: null,
  playlistManager: null,
  performanceManager: null,
  mobileSupport: null,
  musicTheoryAnalyzer: null,
  bpmDetector: null,
  
  // Helper methods
  addTrack: (track) => window.enhancedVisualizer.playlistManager?.addTrack(track),
  playTrack: (index) => window.enhancedVisualizer.playlistManager?.playTrack(index),
  setVolume: (volume) => window.enhancedVisualizer.audioManager?.setVolume(volume),
  getStats: () => window.enhancedVisualizer.performanceManager?.getPerformanceStats()
};