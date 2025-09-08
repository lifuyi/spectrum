// Advanced Spectrum Analyzer Module
class SpectrumAnalyzer {
  constructor() {
    this.analyser = null;
    this.audioContext = null;
    this.bufferLength = 0;
    this.frequencyData = null;
    this.timeData = null;
    
    // Analysis parameters
    this.sampleRate = 44100;
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.8;
    
    // Frequency analysis
    this.frequencyBands = [];
    this.peakFrequencies = [];
    this.harmonics = [];
    this.spectralCentroid = 0;
    this.spectralRolloff = 0;
    this.spectralFlux = 0;
    this.zeroCrossingRate = 0;
    
    // Peak detection
    this.peakThreshold = 0.7;
    this.peakHistory = [];
    this.dominantFrequency = 0;
    
    // Spectral features
    this.mfcc = []; // Mel-frequency cepstral coefficients
    this.spectralContrast = 0;
    this.spectralBandwidth = 0;
    this.spectralFlatness = 0;
    
    // Real-time analysis
    this.isAnalyzing = false;
    this.analysisInterval = null;
    this.updateRate = 60; // Hz
    
    this.callbacks = {
      onSpectrumUpdate: null,
      onPeakDetected: null,
      onFeatureUpdate: null
    };
    
    this.initializeFrequencyBands();
  }

  setCallbacks(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  setAnalyser(analyser, audioContext) {
    this.analyser = analyser;
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
    this.bufferLength = analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(this.bufferLength);
    this.timeData = new Uint8Array(this.bufferLength);
  }

  initializeFrequencyBands() {
    // Define frequency bands for analysis
    this.frequencyBands = [
      { name: 'Sub Bass', min: 20, max: 60, energy: 0, peak: 0 },
      { name: 'Bass', min: 60, max: 250, energy: 0, peak: 0 },
      { name: 'Low Midrange', min: 250, max: 500, energy: 0, peak: 0 },
      { name: 'Midrange', min: 500, max: 2000, energy: 0, peak: 0 },
      { name: 'Upper Midrange', min: 2000, max: 4000, energy: 0, peak: 0 },
      { name: 'Presence', min: 4000, max: 6000, energy: 0, peak: 0 },
      { name: 'Brilliance', min: 6000, max: 20000, energy: 0, peak: 0 }
    ];
  }

  startAnalysis() {
    if (this.isAnalyzing || !this.analyser) return;
    
    this.isAnalyzing = true;
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, 1000 / this.updateRate);
  }

  stopAnalysis() {
    this.isAnalyzing = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  performAnalysis() {
    if (!this.analyser || !this.frequencyData) return;

    // Get current audio data
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeData);

    // Perform various analyses
    this.analyzeFrequencyBands();
    this.detectPeaks();
    this.calculateSpectralFeatures();
    this.findHarmonics();
    
    // Trigger callbacks
    if (this.callbacks.onSpectrumUpdate) {
      this.callbacks.onSpectrumUpdate(this.getAnalysisResults());
    }
  }

  analyzeFrequencyBands() {
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / this.bufferLength;

    this.frequencyBands.forEach(band => {
      const startBin = Math.floor(band.min / binWidth);
      const endBin = Math.floor(band.max / binWidth);
      
      let energy = 0;
      let peak = 0;
      let peakFreq = 0;

      for (let i = startBin; i <= endBin && i < this.bufferLength; i++) {
        const magnitude = this.frequencyData[i] / 255;
        energy += magnitude * magnitude;
        
        if (magnitude > peak) {
          peak = magnitude;
          peakFreq = i * binWidth;
        }
      }

      band.energy = Math.sqrt(energy / (endBin - startBin + 1));
      band.peak = peak;
      band.peakFrequency = peakFreq;
    });
  }

  detectPeaks() {
    const peaks = [];
    const threshold = this.peakThreshold * 255;

    // Find local maxima
    for (let i = 1; i < this.bufferLength - 1; i++) {
      const current = this.frequencyData[i];
      const prev = this.frequencyData[i - 1];
      const next = this.frequencyData[i + 1];

      if (current > prev && current > next && current > threshold) {
        const frequency = (i * this.sampleRate) / (2 * this.bufferLength);
        peaks.push({
          frequency: frequency,
          magnitude: current / 255,
          bin: i
        });
      }
    }

    // Sort by magnitude and keep top peaks
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    this.peakFrequencies = peaks.slice(0, 10);

    // Update dominant frequency
    if (peaks.length > 0) {
      this.dominantFrequency = peaks[0].frequency;
    }

    // Store peak history for trend analysis
    this.peakHistory.push({
      timestamp: performance.now(),
      peaks: [...peaks]
    });

    // Keep only recent history
    const maxHistoryTime = 5000; // 5 seconds
    const now = performance.now();
    this.peakHistory = this.peakHistory.filter(
      entry => now - entry.timestamp < maxHistoryTime
    );

    // Trigger peak detection callback
    if (this.callbacks.onPeakDetected && peaks.length > 0) {
      this.callbacks.onPeakDetected({
        peaks: peaks,
        dominant: this.dominantFrequency,
        timestamp: now
      });
    }
  }

  calculateSpectralFeatures() {
    // Spectral Centroid (brightness)
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      const frequency = (i * this.sampleRate) / (2 * this.bufferLength);
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    this.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Spectral Rolloff (90% of energy)
    let energySum = 0;
    let totalEnergy = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      totalEnergy += magnitude * magnitude;
    }

    const rolloffThreshold = totalEnergy * 0.9;
    energySum = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      energySum += magnitude * magnitude;
      
      if (energySum >= rolloffThreshold) {
        this.spectralRolloff = (i * this.sampleRate) / (2 * this.bufferLength);
        break;
      }
    }

    // Spectral Bandwidth
    let bandwidthSum = 0;
    magnitudeSum = 0;

    for (let i = 0; i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      const frequency = (i * this.sampleRate) / (2 * this.bufferLength);
      const deviation = frequency - this.spectralCentroid;
      
      bandwidthSum += deviation * deviation * magnitude;
      magnitudeSum += magnitude;
    }

    this.spectralBandwidth = magnitudeSum > 0 ? 
      Math.sqrt(bandwidthSum / magnitudeSum) : 0;

    // Spectral Flatness (measure of noise vs. tonal content)
    let geometricMean = 1;
    let arithmeticMean = 0;
    let validBins = 0;

    for (let i = 1; i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      if (magnitude > 0) {
        geometricMean *= Math.pow(magnitude, 1 / this.bufferLength);
        arithmeticMean += magnitude;
        validBins++;
      }
    }

    arithmeticMean /= validBins;
    this.spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Zero Crossing Rate (from time domain data)
    let crossings = 0;
    for (let i = 1; i < this.timeData.length; i++) {
      const current = (this.timeData[i] - 128) / 128;
      const previous = (this.timeData[i - 1] - 128) / 128;
      
      if ((current >= 0) !== (previous >= 0)) {
        crossings++;
      }
    }

    this.zeroCrossingRate = crossings / this.timeData.length;

    // Trigger feature update callback
    if (this.callbacks.onFeatureUpdate) {
      this.callbacks.onFeatureUpdate(this.getSpectralFeatures());
    }
  }

  findHarmonics() {
    if (this.peakFrequencies.length === 0) return;

    const fundamental = this.peakFrequencies[0];
    const harmonics = [];

    // Look for harmonic relationships
    for (let i = 1; i < this.peakFrequencies.length; i++) {
      const peak = this.peakFrequencies[i];
      const ratio = peak.frequency / fundamental.frequency;
      
      // Check if it's close to a harmonic ratio (2, 3, 4, 5, etc.)
      const nearestHarmonic = Math.round(ratio);
      const tolerance = 0.1;
      
      if (Math.abs(ratio - nearestHarmonic) < tolerance && nearestHarmonic > 1) {
        harmonics.push({
          harmonic: nearestHarmonic,
          frequency: peak.frequency,
          magnitude: peak.magnitude,
          fundamental: fundamental.frequency
        });
      }
    }

    this.harmonics = harmonics;
  }

  // Get frequency bin for a given frequency
  getFrequencyBin(frequency) {
    const nyquist = this.sampleRate / 2;
    return Math.round((frequency / nyquist) * this.bufferLength);
  }

  // Get frequency for a given bin
  getBinFrequency(bin) {
    const nyquist = this.sampleRate / 2;
    return (bin / this.bufferLength) * nyquist;
  }

  // Get magnitude at specific frequency
  getMagnitudeAtFrequency(frequency) {
    const bin = this.getFrequencyBin(frequency);
    return bin < this.bufferLength ? this.frequencyData[bin] / 255 : 0;
  }

  // Analyze specific frequency range
  analyzeFrequencyRange(minFreq, maxFreq) {
    const startBin = this.getFrequencyBin(minFreq);
    const endBin = this.getFrequencyBin(maxFreq);
    
    let energy = 0;
    let peak = 0;
    let peakFreq = 0;
    let average = 0;

    for (let i = startBin; i <= endBin && i < this.bufferLength; i++) {
      const magnitude = this.frequencyData[i] / 255;
      energy += magnitude * magnitude;
      average += magnitude;
      
      if (magnitude > peak) {
        peak = magnitude;
        peakFreq = this.getBinFrequency(i);
      }
    }

    const binCount = endBin - startBin + 1;
    return {
      energy: Math.sqrt(energy / binCount),
      peak: peak,
      peakFrequency: peakFreq,
      average: average / binCount,
      range: { min: minFreq, max: maxFreq }
    };
  }

  // Get comprehensive analysis results
  getAnalysisResults() {
    return {
      frequencyBands: [...this.frequencyBands],
      peaks: [...this.peakFrequencies],
      harmonics: [...this.harmonics],
      dominantFrequency: this.dominantFrequency,
      spectralFeatures: this.getSpectralFeatures(),
      timestamp: performance.now()
    };
  }

  getSpectralFeatures() {
    return {
      spectralCentroid: this.spectralCentroid,
      spectralRolloff: this.spectralRolloff,
      spectralBandwidth: this.spectralBandwidth,
      spectralFlatness: this.spectralFlatness,
      zeroCrossingRate: this.zeroCrossingRate
    };
  }

  // Get musical note from frequency
  getMusicalNote(frequency) {
    const A4 = 440;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const semitones = Math.round(12 * Math.log2(frequency / A4));
    const octave = Math.floor((semitones + 9) / 12) + 4;
    const noteIndex = ((semitones % 12) + 12) % 12;
    
    return {
      note: noteNames[noteIndex],
      octave: octave,
      frequency: frequency,
      cents: Math.round((12 * Math.log2(frequency / A4) - semitones) * 100)
    };
  }

  // Audio quality assessment
  assessAudioQuality() {
    const features = this.getSpectralFeatures();
    const bands = this.frequencyBands;
    
    // Calculate quality metrics
    const dynamicRange = this.calculateDynamicRange();
    const frequencyBalance = this.calculateFrequencyBalance();
    const clarity = 1 - features.spectralFlatness; // Higher flatness = less clarity
    const brightness = features.spectralCentroid / 10000; // Normalized brightness
    
    return {
      dynamicRange: Math.min(1, dynamicRange / 60), // Normalize to 60dB max
      frequencyBalance: frequencyBalance,
      clarity: Math.min(1, clarity),
      brightness: Math.min(1, brightness),
      overall: (dynamicRange/60 + frequencyBalance + clarity + brightness) / 4
    };
  }

  calculateDynamicRange() {
    if (this.peakHistory.length < 2) return 0;
    
    let maxPeak = 0;
    let minPeak = 1;
    
    this.peakHistory.forEach(entry => {
      entry.peaks.forEach(peak => {
        maxPeak = Math.max(maxPeak, peak.magnitude);
        minPeak = Math.min(minPeak, peak.magnitude);
      });
    });
    
    return maxPeak > 0 ? 20 * Math.log10(maxPeak / Math.max(minPeak, 0.001)) : 0;
  }

  calculateFrequencyBalance() {
    const bassEnergy = this.frequencyBands.slice(0, 2).reduce((sum, band) => sum + band.energy, 0);
    const midEnergy = this.frequencyBands.slice(2, 5).reduce((sum, band) => sum + band.energy, 0);
    const trebleEnergy = this.frequencyBands.slice(5).reduce((sum, band) => sum + band.energy, 0);
    
    const totalEnergy = bassEnergy + midEnergy + trebleEnergy;
    if (totalEnergy === 0) return 0;
    
    // Ideal balance is roughly 1:1:1
    const bassRatio = bassEnergy / totalEnergy;
    const midRatio = midEnergy / totalEnergy;
    const trebleRatio = trebleEnergy / totalEnergy;
    
    const ideal = 1/3;
    const deviation = Math.abs(bassRatio - ideal) + Math.abs(midRatio - ideal) + Math.abs(trebleRatio - ideal);
    
    return Math.max(0, 1 - deviation);
  }

  // Reset analysis
  reset() {
    this.peakFrequencies = [];
    this.harmonics = [];
    this.peakHistory = [];
    this.dominantFrequency = 0;
    this.spectralCentroid = 0;
    this.spectralRolloff = 0;
    this.spectralBandwidth = 0;
    this.spectralFlatness = 0;
    this.zeroCrossingRate = 0;
    
    this.frequencyBands.forEach(band => {
      band.energy = 0;
      band.peak = 0;
      band.peakFrequency = 0;
    });
  }
}

// Make SpectrumAnalyzer available globally
window.SpectrumAnalyzer = SpectrumAnalyzer;