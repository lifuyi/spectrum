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
    this.peakThreshold = 0.12;
    this.historyLength = 20;
    this.smoothingFactor = 0.8;
    
    // Energy analysis
    this.energyHistory = new Array(43).fill(0);
    this.prevEnergy = 0;
    
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
    this.prevEnergy = 0;
    this.lastPeakTime = 0;
    this.currentBPM = 0;
    this.confidence = 0;
  }

  stopAnalysis() {
    this.isAnalyzing = false;
  }

  detectBPM(frequencyData, timeData) {
    if (!this.isAnalyzing) return this.currentBPM;

    const now = performance.now();
    
    const energy = this.calculateEnergy(frequencyData);
    const lowEnergy = this.calculateBandEnergy(frequencyData, 0, 10);
    
    // Update energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }
    
    // Simple peak detection: current energy must exceed recent average by threshold
    // and be rising compared to previous frame
    const recentEnergy = this.energyHistory.slice(-10);
    const localAverage = recentEnergy.reduce((sum, val) => sum + val, 0) / recentEnergy.length;
    const isRising = energy > this.prevEnergy;
    const isAboveAverage = energy > localAverage * (1 + this.peakThreshold);
    const isPeak = isRising && isAboveAverage && energy > 0.05;
    
    this.prevEnergy = energy;
    
    if (isPeak) {
      const timeSinceLastPeak = now - this.lastPeakTime;
      this.lastPeakTime = now;
      
      // Debounce: ignore peaks too close together
      if (timeSinceLastPeak < 250) return this.currentBPM;
      
      const instantBPM = 60000 / timeSinceLastPeak;
      
      if (instantBPM >= this.minBPM && instantBPM <= this.maxBPM) {
        this.peakHistory.push({
          time: now,
          bpm: instantBPM,
          energy: energy
        });
        
        // Keep only recent peaks (last 15 seconds)
        this.peakHistory = this.peakHistory.filter(peak => 
          now - peak.time < 15000
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

  calculateBPMFromPeaks() {
    if (this.peakHistory.length < 3) return;
    
    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < this.peakHistory.length; i++) {
      const interval = this.peakHistory[i].time - this.peakHistory[i-1].time;
      if (interval > 250 && interval < 2000) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 2) return;
    
    // Group intervals into BPM buckets (within 5 BPM tolerance)
    const bpmBuckets = {};
    intervals.forEach(interval => {
      const bpm = Math.round(60000 / interval);
      let placed = false;
      for (const key in bpmBuckets) {
        if (Math.abs(parseInt(key) - bpm) <= 5) {
          bpmBuckets[key].count++;
          bpmBuckets[key].sum += interval;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bpmBuckets[bpm] = { count: 1, sum: interval };
      }
    });
    
    // Find BPM bucket with highest count
    let maxCount = 0;
    let bestBPM = 0;
    
    for (const bpm in bpmBuckets) {
      if (bpmBuckets[bpm].count > maxCount) {
        maxCount = bpmBuckets[bpm].count;
        bestBPM = parseInt(bpm);
      }
    }
    
    if (bestBPM === 0) return;
    
    // Calculate confidence based on consistency
    this.confidence = Math.min(1, maxCount / Math.max(intervals.length, 1));
    
    // Smooth BPM changes
    if (this.currentBPM === 0) {
      this.currentBPM = bestBPM;
    } else {
      this.currentBPM = Math.round(
        this.currentBPM * this.smoothingFactor + 
        bestBPM * (1 - this.smoothingFactor)
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

  detectBPMAutocorrelation(audioBuffer) {
    const sampleRate = this.sampleRate;
    const minPeriod = Math.floor(sampleRate * 60 / this.maxBPM);
    const maxPeriod = Math.floor(sampleRate * 60 / this.minBPM);
    
    let bestCorrelation = 0;
    let bestPeriod = 0;
    
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
      return Math.round(60 * sampleRate / bestPeriod);
    }
    
    return 0;
  }

  getTempoDescription(bpm) {
    if (bpm === 0) return 'Unknown';
    if (bpm < 80) return 'Largo (Slow)';
    if (bpm < 100) return 'Andante (Walking pace)';
    if (bpm < 120) return 'Moderato (Moderate)';
    if (bpm < 140) return 'Allegro (Fast)';
    if (bpm < 168) return 'Vivace (Very fast)';
    return 'Presto (Very fast)';
  }
}
