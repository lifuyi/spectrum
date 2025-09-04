# Winamp-Style Spectrum Visualizer Manual

## Getting Started

1. Open `enhanced_winamp_visualizer.html` in a modern web browser
2. Load audio using one of these methods:
   - **Load Audio**: Select a local audio file from your device
   - **Load URL**: Enter a direct URL to an audio file or stream
   - **Use Mic**: Visualize audio from your microphone

## Visualization Controls

### Style Selection
- Use the **Style** dropdown to switch between visualization modes
- 2D modes include Bars, Mountain, Spikes, Circles, Waveform, Radial, Circular Waveform, Particles, and Spectrogram
- 3D modes include Bars, Sphere, Tunnel, Waves, Cube Matrix, Spiral, Galaxy, and DNA Helix

### Bar Style Selection
- When **2D Bars** style is selected, a **Bar Style** dropdown appears
- Choose between:
  - **LED Style**: Classic segmented bar visualization
  - **Linear Gradient**: Smooth gradient bars with fading effect
  - **Plain Linear Gradient**: Solid gradient bars without transparency

### Theme Selection
- Use the **Theme** dropdown to change the color scheme
- Available themes include Classic, Neon Glow, Ocean Depths, Fire Storm, and more
- Create custom themes using the **Create Theme** button

## Effect Toggles

Toggle various visual effects on/off:
- **Grid**: Show/hide background grid
- **Bars**: Show/hide bar visualization
- **Peaks**: Show/hide peak indicators
- **Shake Mode**: Enable screen shaking on beats
- **Beat Flash**: Enable screen flashing on beats
- **Beat Zoom**: Enable screen zooming on beats
- **Particle Burst**: Enable particle effects on beats
- **Particle Trails**: Enable rising particle trails
- **Particle Fountain**: Enable fountain particle effect
- **Fireworks**: Enable fireworks explosion effects
- **3D Camera Dance**: Enable dynamic camera movement in 3D modes
- **Low Power Mode**: Reduce resource usage for better performance

## Audio Controls

- **Play**: Start audio playback
- **Pause**: Pause audio playback
- **Equalizer**: Adjust 20-band frequency levels
- **Reset EQ**: Reset all equalizer bands to 0dB

## Playlist Management

- When loading audio files or URLs, they are automatically added to the playlist
- Click on any track in the playlist to switch between songs
- Use the **Arrow Left/Right** keyboard shortcuts to navigate between tracks
- The active track is highlighted in the playlist

## Customization Options

### Peak Hold Time
- Adjust how long peak indicators stay visible
- Range: 0.0s to 15.0s
- Set to "Hold" to keep peaks indefinitely

### Beat Sensitivity
- Adjust sensitivity for beat detection
- Lower values (0.8) detect more beats
- Higher values (1.2) detect only stronger beats

### Camera Pattern (3D Modes)
- Select camera movement pattern in 3D modes:
  - Random
  - Orbital
  - Spiral
  - Figure 8
  - Pendulum

## Additional Features

### Screenshot
- Click the **Screenshot** button to save the current visualization as a PNG image
- Works for both 2D and 3D visualizations

### Fullscreen Mode
- Click the **Fullscreen** button to toggle fullscreen mode
- Press 'F' key to toggle fullscreen mode

## Theme Creator

1. Click **Create Theme** to open the theme creator
2. Customize colors:
   - Primary Color: Main UI elements
   - Background: Main background color
   - Border: Border colors
   - UI Background: Control panel backgrounds
   - Visualization Colors: Low, Mid, and High frequency colors
3. Apply effects:
   - Glow Effect: Add glow to visualizations
   - Blur Effect: Add subtle blur
   - Neon Effect: Add neon glow
4. Preview your theme in real-time
5. Save, Export, or Import themes

## Keyboard Shortcuts

- **Space**: Play/Pause (when audio is loaded)
- **Arrow Left**: Previous track in playlist
- **Arrow Right**: Next track in playlist
- **F**: Toggle fullscreen mode

## Troubleshooting

### Audio Issues
- Ensure your browser supports the audio format
- Check browser console for CORS errors with URL streams
- Verify microphone permissions for mic input

### Performance Issues
- Disable particle effects for better performance
- Switch to simpler visualization modes
- Enable Low Power Mode to reduce resource usage
- Reduce browser zoom level

### Visualization Not Appearing
- Check that "Bars" toggle is enabled for bar visualizations
- Ensure audio is playing
- Verify browser compatibility (requires modern browser with Web Audio API)

## Browser Compatibility

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

Note: Some features may not work in older browsers or browsers with strict security settings.