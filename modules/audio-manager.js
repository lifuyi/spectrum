// Audio Management Module
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.eqNodes = null;
    this.sourceNode = null;
    this.mediaElement = null;
    this.mediaStream = null;
    this.gainNode = null;
    this.volume = 1.0;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Create master gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Audio initialization failed. Please check browser compatibility.');
    }
  }

  async loadFile(file) {
    await this.initialize();
    
    if (!this.validateAudioFile(file)) {
      throw new Error('Unsupported audio format. Please use MP3, WAV, OGG, or M4A files.');
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      this.loadFromURL(url)
        .then(() => {
          // Delay URL revocation to prevent blob access errors
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        })
        .catch((error) => {
          URL.revokeObjectURL(url);
          reject(error);
        });
    });
  }

  async loadFromURL(url) {
    await this.initialize();
    
    return new Promise((resolve, reject) => {
      this.cleanup();
      
      this.mediaElement = new Audio();
      this.mediaElement.crossOrigin = 'anonymous';
      this.mediaElement.preload = 'metadata';
      
      this.mediaElement.addEventListener('loadedmetadata', () => {
        try {
          this.sourceNode = this.audioContext.createMediaElementSource(this.mediaElement);
          this.connectAudioNodes();
          resolve();
        } catch (error) {
          reject(new Error('Failed to create audio source: ' + error.message));
        }
      });

      this.mediaElement.addEventListener('error', (e) => {
        const errorMessages = {
          1: 'Audio loading was aborted',
          2: 'Network error occurred while loading audio',
          3: 'Audio decoding failed',
          4: 'Audio format not supported'
        };
        const errorCode = this.mediaElement.error?.code || 0;
        reject(new Error(errorMessages[errorCode] || 'Unknown audio error'));
      });

      this.mediaElement.src = url;
    });
  }

  async loadFromMicrophone() {
    await this.initialize();
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      this.cleanup();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.connectAudioNodes();
    } catch (error) {
      throw new Error('Microphone access denied or not available: ' + error.message);
    }
  }

  connectAudioNodes() {
    if (!this.sourceNode || !this.analyser || !this.gainNode) return;
    
    // Connect: source -> analyser -> gain -> destination
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.gainNode);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
    if (this.mediaElement) {
      this.mediaElement.volume = this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  play() {
    if (this.mediaElement) {
      return this.mediaElement.play();
    }
    return Promise.resolve();
  }

  pause() {
    if (this.mediaElement) {
      this.mediaElement.pause();
    }
  }

  stop() {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }
  }

  isPlaying() {
    return this.mediaElement && !this.mediaElement.paused;
  }

  getCurrentTime() {
    return this.mediaElement ? this.mediaElement.currentTime : 0;
  }

  getDuration() {
    return this.mediaElement ? this.mediaElement.duration : 0;
  }

  setCurrentTime(time) {
    if (this.mediaElement) {
      this.mediaElement.currentTime = time;
    }
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  validateAudioFile(file) {
    const validTypes = [
      'audio/mpeg', 'audio/mp3',
      'audio/wav', 'audio/wave',
      'audio/ogg', 'audio/vorbis',
      'audio/mp4', 'audio/m4a',
      'audio/aac', 'audio/flac'
    ];
    
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const fileName = file.name.toLowerCase();
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => fileName.endsWith(ext));
  }

  cleanup() {
    // Stop any existing audio
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.src = '';
      this.mediaElement = null;
    }

    // Stop microphone stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  destroy() {
    this.cleanup();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.analyser = null;
    this.eqNodes = null;
    this.gainNode = null;
    this.isInitialized = false;
  }
}

// Make AudioManager available globally
window.AudioManager = AudioManager;