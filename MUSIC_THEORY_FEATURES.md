# Music Theory Features

## Key Detection
The music theory analyzer uses the Krumhansl-Schmuckler key-finding algorithm to detect the musical key of the audio. This algorithm compares the chroma vector (pitch class profile) of the audio with predefined key profiles for all 24 major and minor keys.

### How It Works
1. Audio frequency data is converted to a 12-element chroma vector representing the energy in each pitch class (C, C#, D, etc.)
2. The chroma vector is compared with key profiles using correlation
3. The key with the highest correlation is selected as the detected key
4. A confidence score is calculated based on the correlation strength

### Features
- Detection of all 24 major and minor keys
- Confidence scoring with adjustable threshold
- Key signature information (number of sharps/flats)
- Real-time updates during playback

## Chord Detection
The chord detection system analyzes the chroma vector to identify the current chord being played.

### How It Works
1. Chroma vector is compared against chord templates for all 12 root positions
2. Various chord qualities are tested (major, minor, 7th, etc.)
3. The best matching chord is selected with a confidence score
4. Roman numeral analysis is performed based on the detected key

### Supported Chord Types
- Triads: Major, Minor, Diminished, Augmented
- Seventh Chords: Major 7th, Minor 7th, Dominant 7th, Diminished 7th, Half-diminished 7th
- Extended Chords: Major 9th, Minor 9th
- Suspended Chords: Sus2, Sus4

### Features
- Real-time chord detection
- Confidence scoring with adjustable threshold
- Roman numeral analysis
- Chord symbol display (C, Cm, C7, etc.)

## Chord Progression Tracking
The system tracks chord changes over time to display the recent chord progression.

### Features
- History of recent chords with timestamps
- Automatic cleanup of old chord history (30-second window)
- Progression display with Roman numerals
- Confidence indicators for each chord

## Key Signature Information
Detailed information about the key signature is provided, including:
- Number of sharps or flats
- Specific accidentals in the key signature
- Relative major/minor relationships

## Confidence Thresholds
Both key and chord detection have adjustable confidence thresholds to filter out uncertain detections:
- Key confidence threshold (default: 60%)
- Chord confidence threshold (default: 50%)

## Technical Implementation
The music theory analyzer is implemented as a standalone JavaScript class that can be integrated with any audio analysis system. It uses:
- Chroma analysis for pitch class profiling
- Correlation-based matching for key and chord detection
- Statistical methods for confidence scoring
- Music theory rules for Roman numeral analysis