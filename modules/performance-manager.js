// Performance and Memory Management Module
class PerformanceManager {
  constructor() {
    this.frameRate = 60;
    this.targetFrameTime = 1000 / this.frameRate;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.memoryUsage = { used: 0, total: 0 };
    this.isLowPowerMode = false;
    this.renderQueue = [];
    this.disposalQueue = [];
    
    // Performance monitoring
    this.performanceObserver = null;
    this.setupPerformanceMonitoring();
  }

  setupPerformanceMonitoring() {
    // Monitor memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        this.memoryUsage = {
          used: performance.memory.usedJSHeapSize / 1048576, // MB
          total: performance.memory.totalJSHeapSize / 1048576 // MB
        };
      }, 5000);
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn(`Long task detected: ${entry.duration}ms`);
              // Only adjust performance if we're not already in low power mode
              if (!this.isLowPowerMode) {
                this.adjustPerformance();
              }
            }
          });
        });
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('Performance Observer not supported');
      }
    }
  }

  shouldRender(timestamp) {
    if (this.isLowPowerMode) {
      // Reduce frame rate in low power mode
      const lowPowerFrameTime = 1000 / 30; // 30 FPS
      return timestamp - this.lastFrameTime >= lowPowerFrameTime;
    }
    
    return timestamp - this.lastFrameTime >= this.targetFrameTime;
  }

  updateFrameStats(timestamp) {
    if (this.lastFrameTime > 0) {
      const frameTime = timestamp - this.lastFrameTime;
      const fps = 1000 / frameTime;
      
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      // Auto-adjust performance if FPS drops
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      if (avgFps < 30 && !this.isLowPowerMode) {
        this.enableLowPowerMode();
      }
    }
    
    this.lastFrameTime = timestamp;
    this.frameCount++;
  }

  enableLowPowerMode() {
    this.isLowPowerMode = true;
    this.frameRate = 30;
    this.targetFrameTime = 1000 / this.frameRate;
    console.log('Low power mode enabled due to performance issues');
  }

  disableLowPowerMode() {
    this.isLowPowerMode = false;
    this.frameRate = 60;
    this.targetFrameTime = 1000 / this.frameRate;
  }

  adjustPerformance() {
    if (!this.isLowPowerMode) {
      this.enableLowPowerMode();
    }
  }

  // 3D Resource Management
  dispose3DResources(meshes, scene) {
    meshes.forEach(mesh => {
      if (scene) scene.remove(mesh);
      
      // Dispose geometry
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      
      // Dispose materials
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => this.disposeMaterial(material));
        } else {
          this.disposeMaterial(mesh.material);
        }
      }
      
      // Clear references
      mesh.geometry = null;
      mesh.material = null;
    });
    
    return [];
  }

  disposeMaterial(material) {
    if (!material) return;
    
    // Dispose textures
    Object.keys(material).forEach(key => {
      const value = material[key];
      if (value && typeof value.dispose === 'function') {
        value.dispose();
      }
    });
    
    // Dispose material
    if (typeof material.dispose === 'function') {
      material.dispose();
    }
  }

  // Particle System Optimization
  optimizeParticleSystem(particles, maxParticles = 1000) {
    if (particles.length > maxParticles) {
      // Remove oldest particles
      const toRemove = particles.length - maxParticles;
      for (let i = 0; i < toRemove; i++) {
        const particle = particles.shift();
        if (particle && particle.element && particle.element.parentNode) {
          particle.element.parentNode.removeChild(particle.element);
        }
      }
    }
    
    // Clean up dead particles
    return particles.filter(particle => {
      if (particle.life <= 0 || !particle.element) {
        if (particle.element && particle.element.parentNode) {
          particle.element.parentNode.removeChild(particle.element);
        }
        return false;
      }
      return true;
    });
  }

  // Canvas Optimization
  optimizeCanvas(canvas, ctx) {
    // Use appropriate canvas size for device pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    const rect = canvas.getBoundingClientRect();
    
    const width = rect.width * dpr;
    const height = rect.height * dpr;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
    }
    
    return { width: rect.width, height: rect.height, dpr };
  }

  // Memory cleanup utilities
  scheduleDisposal(resource) {
    this.disposalQueue.push(resource);
  }

  processDisposalQueue() {
    while (this.disposalQueue.length > 0) {
      const resource = this.disposalQueue.shift();
      if (resource && typeof resource.dispose === 'function') {
        try {
          resource.dispose();
        } catch (e) {
          console.warn('Error disposing resource:', e);
        }
      }
    }
  }

  // Audio buffer optimization
  optimizeAudioBuffers(audioData, targetSize = 1024) {
    if (audioData.length <= targetSize) return audioData;
    
    // Downsample audio data for performance
    const step = audioData.length / targetSize;
    const optimized = new Uint8Array(targetSize);
    
    for (let i = 0; i < targetSize; i++) {
      const index = Math.floor(i * step);
      optimized[i] = audioData[index];
    }
    
    return optimized;
  }

  // Get performance stats
  getPerformanceStats() {
    const avgFps = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
      : 0;
    
    return {
      fps: Math.round(avgFps),
      frameCount: this.frameCount,
      isLowPowerMode: this.isLowPowerMode,
      memoryUsage: this.memoryUsage,
      targetFrameRate: this.frameRate
    };
  }

  // Cleanup
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.processDisposalQueue();
    this.fpsHistory = [];
    this.renderQueue = [];
    this.disposalQueue = [];
  }
}

// Make PerformanceManager available globally
window.PerformanceManager = PerformanceManager;