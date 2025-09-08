// Crossfade Manager Module
class CrossfadeManager {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isActive = false;
    this.duration = 3000; // 3 seconds default
    this.curve = 'linear'; // 'linear', 'exponential', 'logarithmic'
    this.currentFade = null;
    
    // Audio contexts for crossfading
    this.currentTrack = {
      element: null,
      gainNode: null,
      sourceNode: null
    };
    
    this.nextTrack = {
      element: null,
      gainNode: null,
      sourceNode: null
    };
    
    this.callbacks = {
      onFadeStart: null,
      onFadeProgress: null,
      onFadeComplete: null
    };
  }

  setCallbacks(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  setDuration(duration) {
    this.duration = Math.max(500, Math.min(10000, duration)); // 0.5-10 seconds
  }

  setCurve(curve) {
    const validCurves = ['linear', 'exponential', 'logarithmic', 'smooth'];
    if (validCurves.includes(curve)) {
      this.curve = curve;
    }
  }

  // Initialize crossfade between current and next track
  async startCrossfade(nextTrackSource, options = {}) {
    if (this.isActive) {
      this.stopCrossfade();
    }

    const duration = options.duration || this.duration;
    const curve = options.curve || this.curve;
    
    try {
      // Setup next track
      await this.setupNextTrack(nextTrackSource);
      
      if (!this.nextTrack.element) {
        throw new Error('Failed to setup next track');
      }

      // Start crossfade
      this.isActive = true;
      this.currentFade = {
        startTime: performance.now(),
        duration: duration,
        curve: curve
      };

      // Start next track
      this.nextTrack.element.currentTime = 0;
      await this.nextTrack.element.play();

      // Begin fade animation
      this.animateCrossfade();

      if (this.callbacks.onFadeStart) {
        this.callbacks.onFadeStart({
          duration: duration,
          curve: curve
        });
      }

    } catch (error) {
      console.error('Crossfade failed:', error);
      this.cleanup();
      throw error;
    }
  }

  async setupNextTrack(trackSource) {
    if (!this.audioManager.audioContext) {
      await this.audioManager.initialize();
    }

    // Create audio element for next track
    this.nextTrack.element = new Audio();
    this.nextTrack.element.crossOrigin = 'anonymous';
    this.nextTrack.element.preload = 'auto';

    // Setup audio source
    if (trackSource.file) {
      const url = URL.createObjectURL(trackSource.file);
      this.nextTrack.element.src = url;
    } else if (trackSource.url) {
      this.nextTrack.element.src = trackSource.url;
    } else {
      throw new Error('Invalid track source');
    }

    // Wait for track to load
    await new Promise((resolve, reject) => {
      this.nextTrack.element.addEventListener('loadeddata', resolve);
      this.nextTrack.element.addEventListener('error', reject);
    });

    // Create audio nodes
    this.nextTrack.sourceNode = this.audioManager.audioContext.createMediaElementSource(this.nextTrack.element);
    this.nextTrack.gainNode = this.audioManager.audioContext.createGain();

    // Connect audio graph
    this.nextTrack.sourceNode.connect(this.nextTrack.gainNode);
    this.nextTrack.gainNode.connect(this.audioManager.audioContext.destination);

    // Start with zero volume
    this.nextTrack.gainNode.gain.setValueAtTime(0, this.audioManager.audioContext.currentTime);
  }

  animateCrossfade() {
    if (!this.isActive || !this.currentFade) return;

    const now = performance.now();
    const elapsed = now - this.currentFade.startTime;
    const progress = Math.min(1, elapsed / this.currentFade.duration);

    // Calculate fade values based on curve
    const fadeOut = this.calculateFadeValue(1 - progress, this.currentFade.curve);
    const fadeIn = this.calculateFadeValue(progress, this.currentFade.curve);

    // Apply fade to current track (fade out)
    if (this.audioManager.mediaElement) {
      this.audioManager.mediaElement.volume = fadeOut * this.audioManager.getVolume();
    }

    // Apply fade to next track (fade in)
    if (this.nextTrack.gainNode) {
      this.nextTrack.gainNode.gain.setValueAtTime(
        fadeIn * this.audioManager.getVolume(),
        this.audioManager.audioContext.currentTime
      );
    }

    // Progress callback
    if (this.callbacks.onFadeProgress) {
      this.callbacks.onFadeProgress({
        progress: progress,
        fadeOut: fadeOut,
        fadeIn: fadeIn
      });
    }

    // Continue animation or complete
    if (progress < 1) {
      requestAnimationFrame(() => this.animateCrossfade());
    } else {
      this.completeCrossfade();
    }
  }

  calculateFadeValue(progress, curve) {
    switch (curve) {
      case 'exponential':
        return Math.pow(progress, 2);
      
      case 'logarithmic':
        return Math.sqrt(progress);
      
      case 'smooth':
        // Smooth S-curve (ease-in-out)
        return progress * progress * (3 - 2 * progress);
      
      case 'linear':
      default:
        return progress;
    }
  }

  completeCrossfade() {
    // Stop current track
    if (this.audioManager.mediaElement) {
      this.audioManager.mediaElement.pause();
    }

    // Switch to next track
    this.audioManager.mediaElement = this.nextTrack.element;
    this.audioManager.sourceNode = this.nextTrack.sourceNode;

    // Reset volume
    this.audioManager.mediaElement.volume = this.audioManager.getVolume();

    // Cleanup
    this.cleanup();

    if (this.callbacks.onFadeComplete) {
      this.callbacks.onFadeComplete();
    }
  }

  stopCrossfade() {
    if (!this.isActive) return;

    this.isActive = false;
    this.currentFade = null;

    // Stop next track if playing
    if (this.nextTrack.element) {
      this.nextTrack.element.pause();
    }

    // Restore current track volume
    if (this.audioManager.mediaElement) {
      this.audioManager.mediaElement.volume = this.audioManager.getVolume();
    }

    this.cleanup();
  }

  cleanup() {
    this.isActive = false;
    this.currentFade = null;

    // Cleanup next track resources
    if (this.nextTrack.sourceNode) {
      this.nextTrack.sourceNode.disconnect();
      this.nextTrack.sourceNode = null;
    }

    if (this.nextTrack.gainNode) {
      this.nextTrack.gainNode.disconnect();
      this.nextTrack.gainNode = null;
    }

    if (this.nextTrack.element) {
      this.nextTrack.element.src = '';
      this.nextTrack.element = null;
    }
  }

  // Quick fade out current track
  async fadeOut(duration = 1000) {
    if (!this.audioManager.mediaElement) return;

    const startVolume = this.audioManager.getVolume();
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const volume = startVolume * (1 - progress);

        this.audioManager.mediaElement.volume = volume;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.audioManager.mediaElement.pause();
          resolve();
        }
      };

      animate();
    });
  }

  // Quick fade in current track
  async fadeIn(duration = 1000) {
    if (!this.audioManager.mediaElement) return;

    const targetVolume = this.audioManager.getVolume();
    const startTime = performance.now();

    this.audioManager.mediaElement.volume = 0;
    await this.audioManager.play();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const volume = targetVolume * progress;

        this.audioManager.mediaElement.volume = volume;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  // Auto-crossfade when track is near end
  setupAutoCrossfade(nextTrackSource, triggerTime = 10) {
    if (!this.audioManager.mediaElement) return;

    const checkTime = () => {
      const currentTime = this.audioManager.mediaElement.currentTime;
      const duration = this.audioManager.mediaElement.duration;
      const timeLeft = duration - currentTime;

      if (timeLeft <= triggerTime && timeLeft > 0) {
        this.startCrossfade(nextTrackSource);
        return;
      }

      if (!this.audioManager.mediaElement.paused) {
        setTimeout(checkTime, 1000);
      }
    };

    checkTime();
  }

  // Get crossfade status
  getStatus() {
    return {
      isActive: this.isActive,
      duration: this.duration,
      curve: this.curve,
      progress: this.currentFade ? 
        Math.min(1, (performance.now() - this.currentFade.startTime) / this.currentFade.duration) : 0
    };
  }

  // Preset crossfade curves
  static getCurvePresets() {
    return {
      'linear': 'Linear fade',
      'exponential': 'Exponential (slow start)',
      'logarithmic': 'Logarithmic (fast start)', 
      'smooth': 'Smooth S-curve'
    };
  }
}

// Make CrossfadeManager available globally
window.CrossfadeManager = CrossfadeManager;