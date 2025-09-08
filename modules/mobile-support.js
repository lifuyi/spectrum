// Mobile and Touch Support Module
class MobileSupport {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isTouch = 'ontouchstart' in window;
    this.orientation = this.getOrientation();
    this.touchHandlers = new Map();
    this.gestureState = {
      isGesturing: false,
      startDistance: 0,
      startAngle: 0,
      lastScale: 1,
      lastRotation: 0
    };
    
    this.init();
  }

  detectMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }

  getOrientation() {
    if (screen.orientation) {
      return screen.orientation.angle;
    }
    return window.orientation || 0;
  }

  init() {
    if (this.isMobile) {
      this.setupMobileOptimizations();
      this.setupTouchControls();
      this.setupOrientationHandling();
    }
  }

  setupMobileOptimizations() {
    // Prevent zoom on double tap
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Prevent pull-to-refresh
    document.body.style.overscrollBehavior = 'none';
    
    // Add mobile-specific CSS class
    document.body.classList.add('mobile-device');
    
    // Optimize for mobile performance
    if (this.isMobile) {
      document.body.classList.add('low-power-mode');
    }
  }

  setupTouchControls() {
    // Touch controls for visualization
    this.addTouchHandler('canvas', {
      onTouchStart: this.handleVisualizationTouchStart.bind(this),
      onTouchMove: this.handleVisualizationTouchMove.bind(this),
      onTouchEnd: this.handleVisualizationTouchEnd.bind(this)
    });

    // Touch controls for 3D container
    this.addTouchHandler('three-container', {
      onTouchStart: this.handle3DTouchStart.bind(this),
      onTouchMove: this.handle3DTouchMove.bind(this),
      onTouchEnd: this.handle3DTouchEnd.bind(this)
    });
  }

  addTouchHandler(elementId, handlers) {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.touchHandlers.set(elementId, handlers);

    element.addEventListener('touchstart', (e) => {
      if (handlers.onTouchStart) {
        handlers.onTouchStart(e);
      }
    }, { passive: false });

    element.addEventListener('touchmove', (e) => {
      if (handlers.onTouchMove) {
        handlers.onTouchMove(e);
      }
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
      if (handlers.onTouchEnd) {
        handlers.onTouchEnd(e);
      }
    }, { passive: false });
  }

  handleVisualizationTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - trigger beat effect
      const touch = e.touches[0];
      const rect = e.target.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Trigger particle burst at touch location
      this.triggerTouchEffect(x, y, e.target);
    } else if (e.touches.length === 2) {
      // Multi-touch gesture start
      this.gestureState.isGesturing = true;
      this.gestureState.startDistance = this.getTouchDistance(e.touches);
      this.gestureState.startAngle = this.getTouchAngle(e.touches);
    }
  }

  handleVisualizationTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 2 && this.gestureState.isGesturing) {
      const currentDistance = this.getTouchDistance(e.touches);
      const currentAngle = this.getTouchAngle(e.touches);
      
      const scale = currentDistance / this.gestureState.startDistance;
      const rotation = currentAngle - this.gestureState.startAngle;
      
      // Apply zoom/rotation effects
      this.applyGestureEffects(scale, rotation);
    }
  }

  handleVisualizationTouchEnd(e) {
    e.preventDefault();
    this.gestureState.isGesturing = false;
  }

  handle3DTouchStart(e) {
    e.preventDefault();
    // 3D-specific touch handling
  }

  handle3DTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - rotate camera
      const touch = e.touches[0];
      const deltaX = touch.clientX - (this.lastTouchX || touch.clientX);
      const deltaY = touch.clientY - (this.lastTouchY || touch.clientY);
      
      // Emit camera rotation event
      this.emit3DCameraRotation(deltaX, deltaY);
      
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    }
  }

  handle3DTouchEnd(e) {
    e.preventDefault();
    this.lastTouchX = null;
    this.lastTouchY = null;
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchAngle(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx);
  }

  triggerTouchEffect(x, y, target) {
    // Create touch ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    target.parentElement.appendChild(ripple);
    
    setTimeout(() => {
      if (ripple.parentElement) {
        ripple.parentElement.removeChild(ripple);
      }
    }, 600);
    
    // Trigger beat effect
    if (window.visualizer && window.visualizer.triggerBeatEffects) {
      window.visualizer.triggerBeatEffects(0.8);
    }
  }

  applyGestureEffects(scale, rotation) {
    // Apply visual effects based on gestures
    const target = document.getElementById('viz') || document.getElementById('three-container');
    if (target) {
      const currentTransform = target.style.transform || '';
      const scaleValue = Math.max(0.5, Math.min(2, scale));
      const rotationValue = rotation * (180 / Math.PI);
      
      target.style.transform = `${currentTransform} scale(${scaleValue}) rotate(${rotationValue}deg)`;
      
      // Reset after gesture
      setTimeout(() => {
        target.style.transform = currentTransform;
      }, 100);
    }
  }

  emit3DCameraRotation(deltaX, deltaY) {
    // Emit custom event for 3D camera rotation
    const event = new CustomEvent('3d-camera-rotate', {
      detail: { deltaX, deltaY }
    });
    document.dispatchEvent(event);
  }

  setupOrientationHandling() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.orientation = this.getOrientation();
        this.handleOrientationChange();
      }, 100);
    });

    // Handle device motion for additional effects
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (e) => {
        this.handleDeviceMotion(e);
      });
    }
  }

  handleOrientationChange() {
    // Trigger canvas resize
    const canvas = document.getElementById('viz');
    if (canvas && window.visualizer) {
      setTimeout(() => {
        window.visualizer.resizeCanvas();
      }, 200);
    }
    
    // Adjust UI for orientation
    document.body.classList.toggle('landscape', Math.abs(this.orientation) === 90);
  }

  handleDeviceMotion(event) {
    if (!this.isMobile) return;
    
    const acceleration = event.accelerationIncludingGravity;
    if (acceleration) {
      const intensity = Math.sqrt(
        acceleration.x * acceleration.x +
        acceleration.y * acceleration.y +
        acceleration.z * acceleration.z
      ) / 10;
      
      // Trigger shake effects if motion is strong enough
      if (intensity > 1.5 && window.visualizer) {
        window.visualizer.triggerBeatEffects(Math.min(intensity / 3, 1));
      }
    }
  }

  // Virtual controls for mobile
  createVirtualControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'mobile-controls';
    controlsContainer.innerHTML = `
      <div class="mobile-control-row">
        <button class="mobile-btn" data-action="play-pause">⏯️</button>
        <button class="mobile-btn" data-action="previous">⏮️</button>
        <button class="mobile-btn" data-action="next">⏭️</button>
      </div>
      <div class="mobile-control-row">
        <button class="mobile-btn" data-action="volume-down">🔉</button>
        <input type="range" class="mobile-volume" min="0" max="100" value="100">
        <button class="mobile-btn" data-action="volume-up">🔊</button>
      </div>
      <div class="mobile-control-row">
        <button class="mobile-btn" data-action="effects">✨</button>
        <button class="mobile-btn" data-action="theme">🎨</button>
        <button class="mobile-btn" data-action="fullscreen">⛶</button>
      </div>
    `;
    
    // Add event listeners
    controlsContainer.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleVirtualControlAction(action);
      }
    });
    
    document.body.appendChild(controlsContainer);
    return controlsContainer;
  }

  handleVirtualControlAction(action) {
    const events = {
      'play-pause': () => document.getElementById('play')?.click() || document.getElementById('pause')?.click(),
      'previous': () => this.emitKeyEvent('ArrowLeft'),
      'next': () => this.emitKeyEvent('ArrowRight'),
      'volume-down': () => this.adjustVolume(-0.1),
      'volume-up': () => this.adjustVolume(0.1),
      'effects': () => document.getElementById('effects')?.click(),
      'theme': () => this.cycleTheme(),
      'fullscreen': () => document.getElementById('fullscreen')?.click()
    };
    
    if (events[action]) {
      events[action]();
    }
  }

  emitKeyEvent(key) {
    const event = new KeyboardEvent('keydown', { key });
    document.dispatchEvent(event);
  }

  adjustVolume(delta) {
    if (window.audioManager) {
      const currentVolume = window.audioManager.getVolume();
      const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
      window.audioManager.setVolume(newVolume);
      
      // Update mobile volume slider
      const volumeSlider = document.querySelector('.mobile-volume');
      if (volumeSlider) {
        volumeSlider.value = newVolume * 100;
      }
    }
  }

  cycleTheme() {
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
      const currentIndex = themeSelect.selectedIndex;
      const nextIndex = (currentIndex + 1) % themeSelect.options.length;
      themeSelect.selectedIndex = nextIndex;
      themeSelect.dispatchEvent(new Event('change'));
    }
  }

  // Haptic feedback (if supported)
  vibrate(pattern = [100]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  destroy() {
    this.touchHandlers.clear();
    
    // Remove mobile controls
    const mobileControls = document.querySelector('.mobile-controls');
    if (mobileControls) {
      mobileControls.remove();
    }
  }
}

// Make MobileSupport available globally
window.MobileSupport = MobileSupport;