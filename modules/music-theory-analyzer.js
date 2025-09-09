// Music Theory Analyzer Module - Key Detection and Chord Analysis
class MusicTheoryAnalyzer {
  constructor() {
    this.sampleRate = 44100;
    this.chromaVector = new Array(12).fill(0); // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
    this.currentKey = { note: 'C', mode: 'major', confidence: 0 };
    this.chordHistory = [];
    this.currentChord = { root: 'C', quality: 'major', roman: 'I', confidence: 0 };
    
    // Analysis parameters
    this.analysisWindowSize = 4096;
    this.hopSize = 2048;
    this.chromaHistory = [];
    this.maxHistoryLength = 50; // ~2 seconds at 44.1kHz
    
    // Note names and frequencies
    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.noteNamesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Initialize key profiles and chord templates after note names are defined
    this.keyProfiles = this.initializeKeyProfiles();
    this.chordTemplates = this.initializeChordTemplates();
    
    // Key detection confidence threshold
    this.keyConfidenceThreshold = 0.6;
    this.chordConfidenceThreshold = 0.08; // Lowered significantly for complex music
    
    // Analysis state
    this.isAnalyzing = false;
    this.lastAnalysisTime = 0;
    this.analysisInterval = 500; // Analyze every 500ms
    
    this.callbacks = {
      onKeyDetected: null,
      onChordDetected: null,
      onProgressionUpdate: null
    };
  }

  setCallbacks(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  // Initialize Krumhansl-Schmuckler key profiles
  initializeKeyProfiles() {
    // Major key profile (Krumhansl & Kessler, 1982)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    
    // Minor key profile (Krumhansl & Kessler, 1982)
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    const profiles = {};
    
    // Generate all major keys
    for (let i = 0; i < 12; i++) {
      const keyName = this.noteNames[i] + '_major';
      profiles[keyName] = this.rotateArray(majorProfile, i);
    }
    
    // Generate all minor keys
    for (let i = 0; i < 12; i++) {
      const keyName = this.noteNames[i] + '_minor';
      profiles[keyName] = this.rotateArray(minorProfile, i);
    }
    
    return profiles;
  }

  // Initialize chord templates
  initializeChordTemplates() {
    const templates = {
      // Triads
      'major': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],      // Root, Major 3rd, Perfect 5th
      'minor': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],      // Root, Minor 3rd, Perfect 5th
      'diminished': [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], // Root, Minor 3rd, Diminished 5th
      'augmented': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],  // Root, Major 3rd, Augmented 5th
      
      // Seventh chords
      'major7': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],     // Major triad + Major 7th
      'minor7': [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],     // Minor triad + Minor 7th
      'dominant7': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],  // Major triad + Minor 7th
      'diminished7': [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], // Diminished triad + Diminished 7th
      'halfdiminished7': [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], // Diminished triad + Minor 7th
      
      // Extended chords
      'major9': [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1],     // Major 7th + 9th
      'minor9': [1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0],     // Minor 7th + 9th
      'sus2': [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],       // Root, 2nd, 5th
      'sus4': [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],       // Root, 4th, 5th
    };
    
    return templates;
  }

  startAnalysis() {
    this.isAnalyzing = true;
    this.chromaHistory = [];
    this.chordHistory = [];
  }

  stopAnalysis() {
    this.isAnalyzing = false;
  }

  // Main analysis function
  analyzeMusic(frequencyData, timeData) {
    if (!this.isAnalyzing) {
      console.log('Music theory analysis not active');
      return;
    }
    
    const now = performance.now();
    if (now - this.lastAnalysisTime < this.analysisInterval) return;
    
    this.lastAnalysisTime = now;
    // console.log('Running music theory analysis...');
    
    // Calculate chroma vector from frequency data
    this.calculateChromaVector(frequencyData);
    
    // Add to history
    this.chromaHistory.push([...this.chromaVector]);
    if (this.chromaHistory.length > this.maxHistoryLength) {
      this.chromaHistory.shift();
    }
    
    // Analyze key if we have enough data
    if (this.chromaHistory.length >= 10) {
      this.detectKey();
    }
    
    // Analyze current chord
    this.detectChord();
    
    return {
      key: this.currentKey,
      chord: this.currentChord,
      chroma: [...this.chromaVector]
    };
  }

  // Calculate chroma vector from frequency data
  calculateChromaVector(frequencyData) {
    this.chromaVector.fill(0);
    
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / frequencyData.length;
    
    // Map frequency bins to chroma classes
    for (let bin = 1; bin < frequencyData.length; bin++) {
      const frequency = bin * binWidth;
      const magnitude = frequencyData[bin] / 255;
      
      if (frequency < 80 || frequency > 5000) continue; // Focus on musical range
      
      // Convert frequency to MIDI note number
      const midiNote = 12 * Math.log2(frequency / 440) + 69;
      const chromaClass = Math.round(midiNote) % 12;
      
      if (chromaClass >= 0 && chromaClass < 12) {
        this.chromaVector[chromaClass] += magnitude * magnitude;
      }
    }
    
    // Normalize chroma vector
    const sum = this.chromaVector.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        this.chromaVector[i] /= sum;
      }
    }
  }

  // Detect musical key using Krumhansl-Schmuckler algorithm
  detectKey() {
    // Average chroma over recent history for stability
    const avgChroma = new Array(12).fill(0);
    const historyLength = Math.min(this.chromaHistory.length, 20);
    
    for (let i = this.chromaHistory.length - historyLength; i < this.chromaHistory.length; i++) {
      for (let j = 0; j < 12; j++) {
        avgChroma[j] += this.chromaHistory[i][j];
      }
    }
    
    for (let i = 0; i < 12; i++) {
      avgChroma[i] /= historyLength;
    }
    
    let bestKey = '';
    let bestCorrelation = -1;
    
    // Test correlation with all key profiles
    Object.keys(this.keyProfiles).forEach(keyName => {
      const correlation = this.calculateCorrelation(avgChroma, this.keyProfiles[keyName]);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestKey = keyName;
      }
    });
    
    // Parse key name
    const [note, mode] = bestKey.split('_');
    const confidence = Math.max(0, Math.min(1, bestCorrelation));
    
    // Update current key if confidence is high enough
    if (confidence > this.keyConfidenceThreshold) {
      const keyChanged = this.currentKey.note !== note || this.currentKey.mode !== mode;
      
      this.currentKey = {
        note: note,
        mode: mode,
        confidence: confidence
      };
      
      if (keyChanged && this.callbacks.onKeyDetected) {
        this.callbacks.onKeyDetected(this.currentKey);
      }
    }
  }

  // Detect current chord
  detectChord() {
    let bestChord = null;
    let bestScore = 0;
    
    // Debug: log chroma vector (commented out)
    // const chromaSum = this.chromaVector.reduce((a, b) => a + b, 0);
    // if (chromaSum > 0.01) { // Only log if there's significant audio
    //   console.log('Chroma vector:', this.chromaVector.map(v => Math.round(v * 100) / 100));
    // }
    
    // Test all possible chord roots and qualities
    for (let root = 0; root < 12; root++) {
      Object.keys(this.chordTemplates).forEach(quality => {
        const template = this.rotateArray(this.chordTemplates[quality], root);
        const score = this.calculateChordScore(this.chromaVector, template);
        
        if (score > bestScore) {
          bestScore = score;
          bestChord = {
            root: this.noteNames[root],
            quality: quality,
            score: score
          };
        }
      });
    }
    
    // Debug: always log the best chord found (commented out)
    // if (bestChord) {
    //   console.log('Best chord found:', bestChord.root, bestChord.quality, 'Score:', bestScore, 'Threshold:', this.chordConfidenceThreshold);
    // }
    
    if (bestChord && bestScore > this.chordConfidenceThreshold) {
      // Calculate Roman numeral
      const romanNumeral = this.calculateRomanNumeral(bestChord.root, bestChord.quality);
      
      const chordChanged = this.currentChord.root !== bestChord.root || 
                          this.currentChord.quality !== bestChord.quality;
      
      this.currentChord = {
        root: bestChord.root,
        quality: bestChord.quality,
        roman: romanNumeral,
        confidence: bestScore
      };
      
      // Debug logging (commented out)
      // console.log('Chord detected:', bestChord.root, bestChord.quality, 'Score:', bestScore, 'Changed:', chordChanged);
      
      // Always call the callback to update UI, even if chord hasn't changed
      if (this.callbacks.onChordDetected) {
        this.callbacks.onChordDetected(this.currentChord);
      }
      
      // Add to chord history
      if (chordChanged) {
        this.chordHistory.push({
          ...this.currentChord,
          timestamp: performance.now()
        });
        
        // Keep only recent chord history
        const maxAge = 30000; // 30 seconds
        const now = performance.now();
        this.chordHistory = this.chordHistory.filter(chord => 
          now - chord.timestamp < maxAge
        );
        
        // Callback already called above
        
        if (this.callbacks.onProgressionUpdate) {
          this.callbacks.onProgressionUpdate(this.getRecentProgression());
        }
      }
    } else {
      // Debug: log why chord wasn't accepted (commented out)
      // if (bestChord) {
      //   console.log('Chord rejected - score too low:', bestScore, 'vs threshold:', this.chordConfidenceThreshold);
      // } else {
      //   console.log('No chord detected');
      // }
    }
  }

  // Calculate Roman numeral for chord in current key
  calculateRomanNumeral(chordRoot, chordQuality) {
    if (!this.currentKey.note) return '?';
    
    const keyRoot = this.noteNames.indexOf(this.currentKey.note);
    const chordRootIndex = this.noteNames.indexOf(chordRoot);
    
    // Calculate scale degree (0-6)
    let scaleDegree = (chordRootIndex - keyRoot + 12) % 12;
    
    // Map chromatic intervals to scale degrees
    const scaleMapping = this.currentKey.mode === 'major' 
      ? [0, -1, 1, -1, 2, 3, -1, 4, -1, 5, -1, 6]  // Major scale
      : [0, -1, 1, 2, -1, 3, -1, 4, 5, -1, 6, -1]; // Natural minor scale
    
    const mappedDegree = scaleMapping[scaleDegree];
    if (mappedDegree === -1) {
      // Chromatic chord, use flat/sharp notation
      return this.getChromaticRomanNumeral(scaleDegree, chordQuality);
    }
    
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    let roman = romanNumerals[mappedDegree];
    
    // Adjust case based on chord quality and key
    if (this.currentKey.mode === 'major') {
      // Major key: I, ii, iii, IV, V, vi, vii°
      const minorChords = [1, 2, 5, 6]; // ii, iii, vi, vii
      if (minorChords.includes(mappedDegree) && chordQuality.includes('major')) {
        // Unexpected major chord
        roman = roman.toLowerCase();
      } else if (!minorChords.includes(mappedDegree) && chordQuality.includes('minor')) {
        // Unexpected minor chord
        roman = roman.toLowerCase();
      } else if (minorChords.includes(mappedDegree)) {
        roman = roman.toLowerCase();
      }
    } else {
      // Minor key: i, ii°, III, iv, v, VI, VII
      const majorChords = [2, 5, 6]; // III, VI, VII
      if (majorChords.includes(mappedDegree) && chordQuality.includes('minor')) {
        roman = roman.toLowerCase();
      } else if (!majorChords.includes(mappedDegree) && chordQuality.includes('major')) {
        roman = roman.toUpperCase();
      } else if (!majorChords.includes(mappedDegree)) {
        roman = roman.toLowerCase();
      }
    }
    
    // Add quality indicators
    if (chordQuality.includes('diminished')) {
      roman += '°';
    } else if (chordQuality.includes('augmented')) {
      roman += '+';
    } else if (chordQuality.includes('7')) {
      roman += '7';
    } else if (chordQuality.includes('9')) {
      roman += '9';
    } else if (chordQuality.includes('sus')) {
      roman += 'sus';
    }
    
    return roman;
  }

  getChromaticRomanNumeral(scaleDegree, chordQuality) {
    // Handle chromatic chords with flat/sharp notation
    const chromaticMap = {
      1: '♭II', 3: '♭III', 6: '♭VI', 8: '♭VI', 10: '♭VII'
    };
    
    return chromaticMap[scaleDegree] || '?';
  }

  // Get recent chord progression
  getRecentProgression(maxChords = 8) {
    return this.chordHistory.slice(-maxChords).map(chord => ({
      roman: chord.roman,
      chord: `${chord.root}${this.getChordSymbol(chord.quality)}`,
      confidence: chord.confidence
    }));
  }

  getChordSymbol(quality) {
    const symbols = {
      'major': '',
      'minor': 'm',
      'diminished': '°',
      'augmented': '+',
      'major7': 'maj7',
      'minor7': 'm7',
      'dominant7': '7',
      'diminished7': '°7',
      'halfdiminished7': 'ø7',
      'major9': 'maj9',
      'minor9': 'm9',
      'sus2': 'sus2',
      'sus4': 'sus4'
    };
    
    return symbols[quality] || '';
  }

  // Utility functions
  rotateArray(arr, steps) {
    const result = [...arr];
    const len = result.length;
    steps = ((steps % len) + len) % len;
    
    return result.slice(steps).concat(result.slice(0, steps));
  }

  calculateCorrelation(vector1, vector2) {
    if (vector1.length !== vector2.length) return 0;
    
    const mean1 = vector1.reduce((a, b) => a + b, 0) / vector1.length;
    const mean2 = vector2.reduce((a, b) => a + b, 0) / vector2.length;
    
    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      const diff1 = vector1[i] - mean1;
      const diff2 = vector2[i] - mean2;
      numerator += diff1 * diff2;
      sum1 += diff1 * diff1;
      sum2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1 * sum2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  calculateChordScore(chroma, template) {
    let score = 0;
    let templateSum = 0;
    
    for (let i = 0; i < 12; i++) {
      if (template[i] > 0) {
        score += chroma[i] * template[i];
        templateSum += template[i];
      }
    }
    
    return templateSum > 0 ? score / templateSum : 0;
  }

  // Get analysis results
  getAnalysisResults() {
    return {
      key: this.currentKey,
      chord: this.currentChord,
      progression: this.getRecentProgression(),
      chroma: [...this.chromaVector],
      isAnalyzing: this.isAnalyzing
    };
  }

  // Reset analysis
  reset() {
    this.chromaVector.fill(0);
    this.chromaHistory = [];
    this.chordHistory = [];
    this.currentKey = { note: 'C', mode: 'major', confidence: 0 };
    this.currentChord = { root: 'C', quality: 'major', roman: 'I', confidence: 0 };
  }

  // Get key signature information
  getKeySignature() {
    if (!this.currentKey.note) return { sharps: 0, flats: 0, accidentals: [] };
    
    const keySignatures = {
      'C_major': { sharps: 0, flats: 0, accidentals: [] },
      'G_major': { sharps: 1, flats: 0, accidentals: ['F#'] },
      'D_major': { sharps: 2, flats: 0, accidentals: ['F#', 'C#'] },
      'A_major': { sharps: 3, flats: 0, accidentals: ['F#', 'C#', 'G#'] },
      'E_major': { sharps: 4, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#'] },
      'B_major': { sharps: 5, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#', 'A#'] },
      'F#_major': { sharps: 6, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'] },
      'F_major': { sharps: 0, flats: 1, accidentals: ['Bb'] },
      'Bb_major': { sharps: 0, flats: 2, accidentals: ['Bb', 'Eb'] },
      'Eb_major': { sharps: 0, flats: 3, accidentals: ['Bb', 'Eb', 'Ab'] },
      'Ab_major': { sharps: 0, flats: 4, accidentals: ['Bb', 'Eb', 'Ab', 'Db'] },
      'Db_major': { sharps: 0, flats: 5, accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
      'Gb_major': { sharps: 0, flats: 6, accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'] },
      // Minor keys (relative to major)
      'A_minor': { sharps: 0, flats: 0, accidentals: [] },
      'E_minor': { sharps: 1, flats: 0, accidentals: ['F#'] },
      'B_minor': { sharps: 2, flats: 0, accidentals: ['F#', 'C#'] },
      'F#_minor': { sharps: 3, flats: 0, accidentals: ['F#', 'C#', 'G#'] },
      'C#_minor': { sharps: 4, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#'] },
      'G#_minor': { sharps: 5, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#', 'A#'] },
      'D#_minor': { sharps: 6, flats: 0, accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'] },
      'D_minor': { sharps: 0, flats: 1, accidentals: ['Bb'] },
      'G_minor': { sharps: 0, flats: 2, accidentals: ['Bb', 'Eb'] },
      'C_minor': { sharps: 0, flats: 3, accidentals: ['Bb', 'Eb', 'Ab'] },
      'F_minor': { sharps: 0, flats: 4, accidentals: ['Bb', 'Eb', 'Ab', 'Db'] },
      'Bb_minor': { sharps: 0, flats: 5, accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
      'Eb_minor': { sharps: 0, flats: 6, accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'] }
    };
    
    const keyString = `${this.currentKey.note}_${this.currentKey.mode}`;
    return keySignatures[keyString] || { sharps: 0, flats: 0, accidentals: [] };
  }
}

// Make MusicTheoryAnalyzer available globally
window.MusicTheoryAnalyzer = MusicTheoryAnalyzer;