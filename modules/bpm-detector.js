// BPM Detection Module
class BPMDetector {
  constructor() {
    this.sampleRate = 44100;
    this.bufferSize = 4096;
    this.bpmHistory = [];
    this.peakHistory = [];
    this.lastPeakTime = 0;
    this.currentBPM = 0;
    this.confidence = 0;
    this.isAnalyzing = false;
    
    // BPM detection parameters
    this.minBPM = 60;
    this.maxBPM = 200;
    this.peakThreshold = 0.3;
    this.historyLength = 20;
    this.smoothingFactor = 0.8;
    
    // Energy analysis
    this.energyHistory = new Array(43).fill(0); // ~1 second at 43Hz update rate
    this.energyVariance = 0;
    
    this.callbacks = {
      onBPMDetected: null,
      onBeatDetected: null
    };
  }

  setCallbacks(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  startAnalysis() {
    this.isAnalyzing = true;
    this.bpmHistory = [];
    this.peakHistory = [];
    this.energyHistory.fill(0);
  }

  stopAnalysis() {
    this.isAnalyzing = false;
  }

  // Main BPM detection function
  detectBPM(frequencyData, timeData) {
    if (!this.isAnalyzing) return this.currentBPM;
    
    // Debug: log that we're analyzing
    console.log('BPM detectBPM called, analyzing:', this.isAnalyzing);

    const now = performance.now();
    
    // Calculate energy in different frequency bands
    const energy = this.calculateEnergy(frequencyData);
    const lowEnergy = this.calculateBandEnergy(frequencyData, 0, 10); // Bass
    const midEnergy = this.calculateBandEnergy(frequencyData, 10, 100); // Mid
    const highEnergy = this.calculateBandEnergy(frequencyData, 100, 255); // High
    
    // Update energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }
    
    // Calculate energy variance for beat detection
    this.updateEnergyVariance();
    
    // Detect peaks (potential beats)
    const isPeak = this.detectPeak(energy, lowEnergy);
    
    if (isPeak) {
      const timeSinceLastPeak = now - this.lastPeakTime;
      
      if (timeSinceLastPeak > 200 && timeSinceLastPeak < 2000) { // 30-300 BPM range
        const instantBPM = 60000 / timeSinceLastPeak;
        
        if (instantBPM >= this.minBPM && instantBPM <= this.maxBPM) {
          this.peakHistory.push({
            time: now,
            bpm: instantBPM,
            energy: energy
          });
          
          // Keep only recent peaks
          this.peakHistory = this.peakHistory.filter(peak => 
            now - peak.time < 10000 // Last 10 seconds
          );
          
          // Calculate BPM from peak history
          this.calculateBPMFromPeaks();
          
          // Trigger beat callback
          if (this.callbacks.onBeatDetected) {
            this.callbacks.onBeatDetected({
              bpm: this.currentBPM,
              confidence: this.confidence,
              energy: energy,
              timestamp: now
            });
          }
        }
      }
      
      this.lastPeakTime = now;
    }
    
    return this.currentBPM;
  }

  calculateEnergy(frequencyData) {
    let energy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      energy += frequencyData[i] * frequencyData[i];
    }
    return Math.sqrt(energy / frequencyData.length) / 255;
  }

  calculateBandEnergy(frequencyData, startBin, endBin) {
    let energy = 0;
    const start = Math.max(0, startBin);
    const end = Math.min(frequencyData.length, endBin);
    
    for (let i = start; i < end; i++) {
      energy += frequencyData[i] * frequencyData[i];
    }
    
    return Math.sqrt(energy / (end - start)) / 255;
  }

  updateEnergyVariance() {
    if (this.energyHistory.length < 10) return;
    
    const mean = this.energyHistory.reduce((sum, val) => sum + val, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.energyHistory.length;
    
    this.energyVariance = Math.sqrt(variance);
  }

  detectPeak(currentEnergy, lowEnergy) {
    if (this.energyHistory.length < 10) return false;
    
    // Local energy average
    const recentEnergy = this.energyHistory.slice(-5);
    const localAverage = recentEnergy.reduce((sum, val) => sum + val, 0) / recentEnergy.length;
    
    // Peak detection criteria
    const energyThreshold = localAverage * (1 + this.peakThreshold);
    const varianceThreshold = this.energyVariance * 1.5;
    
    // Strong emphasis on bass frequencies for beat detection
    const bassWeight = lowEnergy * 2;
    const weightedEnergy = currentEnergy + bassWeight;
    
    return weightedEnergy > energyThreshold && this.energyVariance > 0.01;
  }

  calculateBPMFromPeaks() {
    if (this.peakHistory.length < 4) return;
    
    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < this.peakHistory.length; i++) {
      const interval = this.peakHistory[i].time - this.peakHistory[i-1].time;
      if (interval > 200 && interval < 2000) { // Valid BPM range
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 3) return;
    
    // Find the most common interval (mode)
    const bpmCounts = {};
    intervals.forEach(interval => {
      const bpm = Math.round(60000 / interval);
      bpmCounts[bpm] = (bpmCounts[bpm] || 0) + 1;
    });
    
    // Find BPM with highest count
    let maxCount = 0;
    let detectedBPM = this.currentBPM;
    
    Object.entries(bpmCounts).forEach(([bpm, count]) => {
      if (count > maxCount) {
        maxCount = count;
        detectedBPM = parseInt(bpm);
      }
    });
    
    // Calculate confidence based on consistency
    this.confidence = Math.min(1, maxCount / Math.max(intervals.length, 1));
    
    // Smooth BPM changes
    if (this.currentBPM === 0) {
      this.currentBPM = detectedBPM;
    } else {
      this.currentBPM = Math.round(
        this.currentBPM * this.smoothingFactor + 
        detectedBPM * (1 - this.smoothingFactor)
      );
    }
    
    // Add to BPM history for stability
    this.bpmHistory.push(this.currentBPM);
    if (this.bpmHistory.length > this.historyLength) {
      this.bpmHistory.shift();
    }
    
    // Trigger BPM callback
    if (this.callbacks.onBPMDetected) {
      this.callbacks.onBPMDetected({
        bpm: this.currentBPM,
        confidence: this.confidence,
        history: [...this.bpmHistory]
      });
    }
  }

  // Advanced BPM detection using autocorrelation
  detectBPMAutocorrelation(audioBuffer) {
    const sampleRate = this.sampleRate;
    const minPeriod = Math.floor(sampleRate * 60 / this.maxBPM);
    const maxPeriod = Math.floor(sampleRate * 60 / this.minBPM);
    
    let bestCorrelation = 0;
    let bestPeriod = 0;
    
    // Calculate autocorrelation for different periods
    for (let period = minPeriod; period <= maxPeriod; period += 10) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < audioBuffer.length - period; i++) {
        correlation += audioBuffer[i] * audioBuffer[i + period];
        count++;
      }
      
      correlation /= count;
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    if (bestPeriod > 0) {
      const bpm = Math.round(sampleRate * 60 / bestPeriod);
      return {
        bpm: bpm,
        confidence: bestCorrelation,
        method: 'autocorrelation'
      };
    }
    
    return null;
  }

  // Get current BPM info
  getBPMInfo() {
    return {
      bpm: this.currentBPM,
      confidence: this.confidence,
      isAnalyzing: this.isAnalyzing,
      history: [...this.bpmHistory],
      energyVariance: this.energyVariance
    };
  }

  // Reset detection
  reset() {
    this.currentBPM = 0;
    this.confidence = 0;
    this.bpmHistory = [];
    this.peakHistory = [];
    this.energyHistory.fill(0);
    this.lastPeakTime = 0;
  }

  // Set BPM manually (for testing or manual override)
  setBPM(bpm) {
    if (bpm >= this.minBPM && bpm <= this.maxBPM) {
      this.currentBPM = bpm;
      this.confidence = 1.0;
    }
  }

  // Get tempo description
  getTempoDescription(bpm = this.currentBPM) {
    if (bpm < 60) return 'Very Slow';
    if (bpm < 80) return 'Slow';
    if (bpm < 100) return 'Moderate';
    if (bpm < 120) return 'Medium';
    if (bpm < 140) return 'Fast';
    if (bpm < 160) return 'Very Fast';
    return 'Extremely Fast';
  }
}

// Make BPMDetector available globally
window.BPMDetector = BPMDetector;