# Enhanced Winamp Visualizer - Advanced Features Documentation

## Music Theory Analysis

### Key Detection Algorithm
The music theory analyzer uses the Krumhansl-Schmuckler key-finding algorithm, which compares the chroma vector (pitch class profile) of the audio to predefined key profiles for all 24 major and minor keys. The key with the highest correlation is selected as the most likely key.

### Chord Detection
Chord detection is performed by comparing the chroma vector to templates representing different chord qualities (major, minor, diminished, etc.). The system identifies the root note and chord quality with the highest match score.

### Roman Numeral Analysis
The detected chords are analyzed in the context of the current key to provide Roman numeral notation, which is a standard way to represent harmonic relationships in music theory.

### Chord Progression Tracking
The system maintains a history of detected chords and displays them as a progression, allowing users to see the harmonic structure of the music over time.

## BPM Detection

### Beat Detection
The BPM detector uses energy-based beat detection, analyzing the audio signal for sudden increases in energy that correspond to musical beats. It places special emphasis on bass frequencies, which typically contain the strongest rhythmic information.

### BPM Calculation
BPM is calculated by measuring the time intervals between detected beats and finding the most consistent tempo. The system uses smoothing algorithms to provide stable BPM readings even when individual beat detections vary.

### Confidence Measurement
The confidence value indicates how consistent the beat detections are. Higher confidence values indicate more reliable BPM readings.

## Spectrum Analysis

### Frequency Band Analysis
The spectrum analyzer divides the audio signal into different frequency bands (bass, mid, treble) and provides detailed analysis of each band's characteristics.

### Dominant Frequency Detection
The system identifies the frequency with the highest energy and maps it to the closest musical note, providing a direct connection between the audio analysis and musical theory.

### Peak Detection
Frequency peaks are identified and tracked over time, providing insight into the spectral content of the audio.

## Crossfade Control

### Smooth Transitions
The crossfade system provides smooth transitions between tracks using various curve algorithms:
- Linear: Constant fade rate
- Exponential: Faster fade at the beginning
- Logarithmic: Slower fade at the beginning
- Smooth: Gradual acceleration and deceleration

### Visual Feedback
The crossfade progress is displayed visually, allowing users to see the transition in real-time.

## Technical Implementation Details

### Modular Architecture
The enhanced visualizer uses a modular architecture where each feature is implemented as a separate module:
- MusicTheoryAnalyzer: Handles key and chord detection
- BPMDetector: Manages beat detection and BPM calculation
- SpectrumAnalyzer: Provides detailed frequency analysis
- CrossfadeManager: Controls track transitions
- AudioManager: Manages audio playback
- PlaylistManager: Handles playlist functionality
- PerformanceManager: Optimizes performance
- MobileSupport: Provides mobile device support

### Real-time Processing
All analysis is performed in real-time using the Web Audio API, with careful attention to performance optimization to ensure smooth visualization even with multiple analysis modules running simultaneously.

### Responsive Design
The user interface is designed to work on various screen sizes, with panels that stack vertically on smaller screens for better mobile experience.