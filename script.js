(() => {
  // DOM
  const canvas = document.getElementById('viz');
  const ctx = canvas.getContext('2d');
  const threeContainer = document.getElementById('three-container');
  const backTo2DBtn = document.getElementById('back-to-2d');
  const fileInput = document.getElementById('file');
  const urlBtn = document.getElementById('url');
  const micBtn = document.getElementById('mic');
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const playlistEl = document.getElementById('playlist');
  const styleSel = document.getElementById('style');
  const themeSel = document.getElementById('theme');
  const effectsChk = document.getElementById('effects');
  const gridChk = document.getElementById('grid');
  const barsChk = document.getElementById('bars');
  const peaksChk = document.getElementById('peaks');
  const barStyleSel = document.getElementById('bar-style');
  const barStyleContainer = document.getElementById('bar-style-container');
  const shakeChk = document.getElementById('shake');
  const flashChk = document.getElementById('flash');
  const zoomChk = document.getElementById('zoom');
  const particlesEffectChk = document.getElementById('particles-effect');
  const particleTrailsChk = document.getElementById('particle-trails');
  const particleFountainChk = document.getElementById('particle-fountain');
  const cameraMovementChk = document.getElementById('camera-movement');
  const cameraPatternSel = document.getElementById('camera-pattern');
  const createThemeBtn = document.getElementById('create-theme');
  const resetEqBtn = document.getElementById('reset-eq');
  const peakSecondsEl = document.getElementById('peak-seconds');
  const peakSecondsValEl = document.getElementById('peak-seconds-val');
  const beatSensitivityEl = document.getElementById('beat-sensitivity');
  const beatSensitivityValEl = document.getElementById('beat-sensitivity-val');

  // Audio
  let audioContext = null;
  let analyser = null;
  let eqNodes = null;
  let sourceNode = null;
  let mediaElement = null;
  let mediaStream = null;
  const playlist = [];
  let currentTrackIndex = -1;

  // 3D Variables
  let scene = null;
  let camera = null;
  let renderer = null;
  let threeMeshes = [];
  let animationId = 0;
  let is3DMode = false;

  // Beat Detection
  let beatDetection = {
    history: new Array(10).fill(0),
    threshold: 1.2,
    minInterval: 200,
    lastBeat: 0,
    enabled: true,
    intensityHistory: new Array(5).fill(0)
  };

  // Config (Winamp-ish)
  const NUM_BANDS = 20;
  const SPIKE_BANDS = 64;
  const MIN_FREQ = 60;
  const MAX_FREQ = 16000;
  const FFT_SIZE = 2048;
  const SMOOTHING = 0.8;
  let EQ_BANDS = [
    { label: '30',    freq: 30,    type: 'lowshelf', gain: 0 },
    { label: '60',    freq: 60,    type: 'peaking',  gain: 0 },
    { label: '100',   freq: 100,   type: 'peaking',  gain: 0 },
    { label: '120',   freq: 120,   type: 'peaking',  gain: 0 },
    { label: '170',   freq: 170,   type: 'peaking',  gain: 0 },
    { label: '250',   freq: 250,   type: 'peaking',  gain: 0 },
    { label: '310',   freq: 310,   type: 'peaking',  gain: 0 },
    { label: '400',   freq: 400,   type: 'peaking',  gain: 0 },
    { label: '600',   freq: 600,   type: 'peaking',  gain: 0 },
    { label: '800',   freq: 800,   type: 'peaking',  gain: 0 },
    { label: '1k',    freq: 1000,  type: 'peaking',  gain: 0 },
    { label: '1.5k',  freq: 1500,  type: 'peaking',  gain: 0 },
    { label: '2k',    freq: 2000,  type: 'peaking',  gain: 0 },
    { label: '3k',    freq: 3000,  type: 'peaking',  gain: 0 },
    { label: '4k',    freq: 4000,  type: 'peaking',  gain: 0 },
    { label: '6k',    freq: 6000,  type: 'peaking',  gain: 0 },
    { label: '8k',    freq: 8000,  type: 'peaking',  gain: 0 },
    { label: '10k',   freq: 10000, type: 'peaking',  gain: 0 },
    { label: '12k',   freq: 12000, type: 'peaking',  gain: 0 },
  ];

  // Visual config
  const BAR_GAP = 2;
  const SEGMENT_HEIGHT = 3;
  let PEAK_DECAY_PER_FRAME = 0.002;
  const BAR_DECAY_PER_FRAME = 0.03;
  const PEAK_CAP_HEIGHT = 2;
  const GRID_COLOR = '#1a1a1a';
  const BG_COLOR = '#000';

  // State
  let freqData = null;
  let bandRanges = null;
  let spikeRanges = null;
  let peaks = new Float32Array(NUM_BANDS);
  let barLevels = new Float32Array(NUM_BANDS);
  let vizStyle = 'bars';
  let currentTheme = 'classic';
  let barStyle = 'led'; // 'led' or 'gradient'
  
  // Particle system
  let particleContainer = null;
  let particles = [];
  let trailParticles = [];
  let fountainParticles = [];
  
  // 2D visualization state
  let waveformHistory = [];
  let particleSystem2D = [];
  
  // Camera movement system
  let cameraAnimation = {
    enabled: false,
    basePosition: { x: 0, y: 0, z: 5 },
    targetPosition: { x: 0, y: 0, z: 5 },
    time: 0,
    beatInfluence: 0,
    pattern: 'random',
    patternTime: 0,
    orbitAngle: 0,
    spiralProgress: 0
  };
  
  // Custom themes storage
  let customThemes = {};

  // EQ DOM
  const eqEnableEl = document.getElementById('eq-enable');
  const eqSlidersEl = document.getElementById('eq-sliders');

  // Beat Detection System
  function detectBeat(levels) {
    if (!beatDetection.enabled) return { detected: false, intensity: 0 };
    
    // Calculate current energy (sum of all frequency levels)
    const currentEnergy = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    
    // Add to history
    beatDetection.history.push(currentEnergy);
    if (beatDetection.history.length > 10) {
      beatDetection.history.shift();
    }
    
    // Calculate average energy from history
    const averageEnergy = beatDetection.history.reduce((sum, energy) => sum + energy, 0) / beatDetection.history.length;
    
    // Check if current energy exceeds threshold and minimum time has passed
    const now = Date.now();
    const timeSinceLastBeat = now - beatDetection.lastBeat;
    
    // Use configurable threshold
    const threshold = beatSensitivityEl ? parseFloat(beatSensitivityEl.value) : beatDetection.threshold;
    
    if (currentEnergy > averageEnergy * threshold && 
        timeSinceLastBeat > beatDetection.minInterval) {
      beatDetection.lastBeat = now;
      
      // Calculate beat intensity (how much stronger than average)
      const intensity = Math.min(2, (currentEnergy / averageEnergy) - 1);
      
      // Track intensity history for shake effects
      beatDetection.intensityHistory.push(intensity);
      if (beatDetection.intensityHistory.length > 5) {
        beatDetection.intensityHistory.shift();
      }
      
      return { detected: true, intensity: intensity };
    }
    
    return { detected: false, intensity: 0 };
  }

  // Beat Glow and All Effects
  function triggerBeatEffects(intensity = 0.5) {
    const targetElement = is3DMode ? threeContainer : canvas;
    const isIntense = intensity > 1.0;
    
    // Glow effects
    if (!is3DMode) {
      canvas.classList.add('beat-glow');
      setTimeout(() => canvas.classList.remove('beat-glow'), 150);
    } else {
      // 3D container glow
      threeContainer.classList.add('beat-glow');
      setTimeout(() => threeContainer.classList.remove('beat-glow'), 150);
      
      // 3D mesh glow effects
      threeMeshes.forEach(mesh => {
        if (mesh.material) {
          const originalEmissive = mesh.material.emissive?.getHex() || 0x000000;
          mesh.material.emissive?.setHex(0x444444);
          setTimeout(() => {
            if (mesh.material && mesh.material.emissive) {
              mesh.material.emissive.setHex(originalEmissive);
            }
          }, 100);
        }
      });
    }
    
    // Shake effects (if enabled)
    if (shakeChk && shakeChk.checked) {
      targetElement.classList.remove('beat-shake', 'beat-shake-intense');
      const shakeClass = isIntense ? 'beat-shake-intense' : 'beat-shake';
      const duration = isIntense ? 300 : 200;
      
      targetElement.classList.add(shakeClass);
      setTimeout(() => {
        targetElement.classList.remove(shakeClass);
      }, duration);
    }
    
    // Flash effects (if enabled)
    if (flashChk && flashChk.checked) {
      targetElement.classList.remove('beat-flash');
      targetElement.classList.add('beat-flash');
      setTimeout(() => {
        targetElement.classList.remove('beat-flash');
      }, 150);
    }
    
    // Zoom effects (if enabled)
    if (zoomChk && zoomChk.checked) {
      targetElement.classList.remove('beat-zoom', 'beat-zoom-intense');
      const zoomClass = isIntense ? 'beat-zoom-intense' : 'beat-zoom';
      const duration = isIntense ? 250 : 200;
      
      targetElement.classList.add(zoomClass);
      setTimeout(() => {
        targetElement.classList.remove(zoomClass);
      }, duration);
    }
    
    // Particle burst effects (if enabled)
    if (particlesEffectChk && particlesEffectChk.checked) {
      createParticleBurst(intensity);
    }
    
    // Particle trail effects (if enabled)
    if (particleTrailsChk && particleTrailsChk.checked) {
      createParticleTrails(intensity);
    }
    
    // Particle fountain effects (if enabled)
    if (particleFountainChk && particleFountainChk.checked) {
      createParticleFountain(intensity);
    }
    
    // Camera movement effects (if enabled and in 3D mode)
    if (cameraMovementChk && cameraMovementChk.checked && is3DMode) {
      triggerCameraMovement(intensity);
    }
  }
  
  // Particle burst system
  function createParticleBurst(intensity = 0.5) {
    if (!particleContainer) {
      particleContainer = document.createElement('div');
      particleContainer.className = 'particle-container';
      const targetElement = is3DMode ? threeContainer : canvas.parentElement;
      targetElement.style.position = 'relative';
      targetElement.appendChild(particleContainer);
    }
    
    const particleCount = Math.floor(8 + intensity * 12);
    const centerX = particleContainer.offsetWidth / 2;
    const centerY = particleContainer.offsetHeight / 2;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random direction and distance
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const distance = 50 + Math.random() * 100 * intensity;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      
      // Set CSS custom properties for animation
      particle.style.setProperty('--dx', dx + 'px');
      particle.style.setProperty('--dy', dy + 'px');
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      particle.style.color = getColorForLevel(Math.random());
      
      particleContainer.appendChild(particle);
      
      // Trigger animation
      particle.classList.add('particle-burst');
      
      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, 800);
    }
  }
  
  // Particle trail system
  function createParticleTrails(intensity = 0.5) {
    if (!particleContainer) {
      particleContainer = document.createElement('div');
      particleContainer.className = 'particle-container';
      const targetElement = is3DMode ? threeContainer : canvas.parentElement;
      targetElement.style.position = 'relative';
      targetElement.appendChild(particleContainer);
    }
    
    const trailCount = Math.floor(3 + intensity * 5);
    
    for (let i = 0; i < trailCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random starting position along bottom
      const startX = Math.random() * particleContainer.offsetWidth;
      particle.style.left = startX + 'px';
      particle.style.top = particleContainer.offsetHeight + 'px';
      particle.style.color = getColorForLevel(Math.random());
      particle.style.width = (2 + intensity * 4) + 'px';
      particle.style.height = (2 + intensity * 4) + 'px';
      
      particleContainer.appendChild(particle);
      
      // Trigger trail animation
      particle.classList.add('particle-trail');
      
      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, 2000);
    }
  }
  
  // Particle fountain system
  function createParticleFountain(intensity = 0.5) {
    if (!particleContainer) {
      particleContainer = document.createElement('div');
      particleContainer.className = 'particle-container';
      const targetElement = is3DMode ? threeContainer : canvas.parentElement;
      targetElement.style.position = 'relative';
      targetElement.appendChild(particleContainer);
    }
    
    const fountainCount = Math.floor(5 + intensity * 8);
    const centerX = particleContainer.offsetWidth / 2;
    const centerY = particleContainer.offsetHeight;
    
    for (let i = 0; i < fountainCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Fountain arc trajectory
      const angle = (Math.PI / 6) + (Math.random() - 0.5) * (Math.PI / 3); // 30-150 degrees
      const velocity = 80 + Math.random() * 60 * intensity;
      const fx = Math.cos(angle) * velocity * (Math.random() > 0.5 ? 1 : -1);
      const fy = -Math.sin(angle) * velocity;
      
      // Set CSS custom properties for animation
      particle.style.setProperty('--fx', fx + 'px');
      particle.style.setProperty('--fy', fy + 'px');
      particle.style.left = centerX + 'px';
      particle.style.top = centerY + 'px';
      particle.style.color = getColorForLevel(Math.random());
      particle.style.width = (3 + intensity * 3) + 'px';
      particle.style.height = (3 + intensity * 3) + 'px';
      
      particleContainer.appendChild(particle);
      
      // Trigger fountain animation
      particle.classList.add('particle-fountain');
      
      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentElement) {
          particle.parentElement.removeChild(particle);
        }
      }, 1500);
    }
  }
  
  // Camera movement system
  function triggerCameraMovement(intensity = 0.5) {
    if (!camera || !is3DMode) return;
    
    cameraAnimation.beatInfluence = intensity;
    cameraAnimation.time = Date.now();
    cameraAnimation.pattern = cameraPatternSel ? cameraPatternSel.value : 'random';
    
    // Calculate new target position based on pattern and intensity
    const moveRange = 2 + intensity * 3;
    
    switch (cameraAnimation.pattern) {
      case 'random':
        cameraAnimation.targetPosition = {
          x: (Math.random() - 0.5) * moveRange,
          y: (Math.random() - 0.5) * moveRange * 0.5,
          z: 5 + (Math.random() - 0.5) * moveRange * 0.3
        };
        break;
        
      case 'orbital':
        cameraAnimation.orbitAngle += intensity * 0.5;
        const orbitRadius = 3 + intensity * 2;
        cameraAnimation.targetPosition = {
          x: Math.cos(cameraAnimation.orbitAngle) * orbitRadius,
          y: Math.sin(cameraAnimation.orbitAngle * 0.5) * 2,
          z: Math.sin(cameraAnimation.orbitAngle) * orbitRadius + 5
        };
        break;
        
      case 'spiral':
        cameraAnimation.spiralProgress += intensity * 0.3;
        const spiralRadius = 2 + Math.sin(cameraAnimation.spiralProgress) * 3;
        cameraAnimation.targetPosition = {
          x: Math.cos(cameraAnimation.spiralProgress * 2) * spiralRadius,
          y: cameraAnimation.spiralProgress * 0.5,
          z: Math.sin(cameraAnimation.spiralProgress * 2) * spiralRadius + 5
        };
        break;
        
      case 'figure8':
        const figure8Time = Date.now() * 0.001 + intensity;
        cameraAnimation.targetPosition = {
          x: Math.sin(figure8Time) * (3 + intensity),
          y: Math.sin(figure8Time * 2) * (2 + intensity * 0.5),
          z: 5 + Math.cos(figure8Time * 0.5) * intensity
        };
        break;
        
      case 'pendulum':
        const pendulumTime = Date.now() * 0.002 + intensity;
        cameraAnimation.targetPosition = {
          x: Math.sin(pendulumTime) * (4 + intensity * 2),
          y: Math.cos(pendulumTime * 0.7) * (1 + intensity),
          z: 5 + Math.sin(pendulumTime * 0.3) * intensity
        };
        break;
    }
  }
  
  function updateCameraMovement() {
    if (!camera || !is3DMode || !cameraMovementChk.checked) return;
    
    const now = Date.now();
    const timeSinceLastBeat = now - cameraAnimation.time;
    
    // Smooth interpolation back to base position
    const returnSpeed = 0.02;
    const beatDecay = Math.max(0, 1 - timeSinceLastBeat / 1000); // Decay over 1 second
    
    // Current target with beat influence
    const currentTarget = {
      x: cameraAnimation.targetPosition.x * beatDecay,
      y: cameraAnimation.targetPosition.y * beatDecay,
      z: cameraAnimation.basePosition.z + (cameraAnimation.targetPosition.z - cameraAnimation.basePosition.z) * beatDecay
    };
    
    // Smooth camera movement
    camera.position.x += (currentTarget.x - camera.position.x) * returnSpeed;
    camera.position.y += (currentTarget.y - camera.position.y) * returnSpeed;
    camera.position.z += (currentTarget.z - camera.position.z) * returnSpeed;
    
    // Add subtle continuous movement
    const continuousTime = now * 0.001;
    camera.position.x += Math.sin(continuousTime * 0.5) * 0.1;
    camera.position.y += Math.cos(continuousTime * 0.3) * 0.05;
    
    // Look at center with slight offset
    const lookAtOffset = {
      x: Math.sin(continuousTime * 0.2) * 0.5,
      y: Math.cos(continuousTime * 0.15) * 0.3,
      z: 0
    };
    
    camera.lookAt(lookAtOffset.x, lookAtOffset.y, lookAtOffset.z);
  }
  
  // Legacy function for compatibility
  function triggerBeatGlow() {
    triggerBeatEffects(0.5);
  }

  // Demo beat simulation (every 500ms when no audio)
  let demoBeatInterval = null;
  function startDemoBeats() {
    if (demoBeatInterval) clearInterval(demoBeatInterval);
    demoBeatInterval = setInterval(() => {
      if (!analyser || !freqData || freqData.every(val => val === 0)) {
        triggerBeatGlow();
      }
    }, 500);
  }

  function stopDemoBeats() {
    if (demoBeatInterval) {
      clearInterval(demoBeatInterval);
      demoBeatInterval = null;
    }
  }

  // 3D Scene Setup
  function init3D() {
    if (scene) return;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    const container = threeContainer;
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    renderer.setClearColor(0x000000, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    camera.position.z = 5;
    
    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height);
      }
    });
    resizeObserver.observe(container);
  }

  // 3D Visualizations
  function create3DBars(levels) {
    // Clear previous meshes
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const barWidth = 0.15;
    const spacing = 0.2;
    const startX = -(levels.length * spacing) / 2;
    
    levels.forEach((level, i) => {
      const height = Math.max(0.1, level * 5);
      const geometry = new THREE.BoxGeometry(barWidth, height, barWidth);
      const color = new THREE.Color(getColorForLevel(level));
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(startX + i * spacing, height / 2 - 2.5, 0);
      
      scene.add(mesh);
      threeMeshes.push(mesh);
    });
  }

  function create3DSphere(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const radius = 2;
    const segments = levels.length;
    
    levels.forEach((level, i) => {
      const angle = (i / levels.length) * Math.PI * 2;
      const sphereRadius = 0.05 + level * 0.3;
      const distance = radius + level * 2;
      
      const geometry = new THREE.SphereGeometry(sphereRadius, 8, 8);
      const color = new THREE.Color(getColorForLevel(level));
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(angle) * distance,
        (level - 0.5) * 3,
        Math.sin(angle) * distance
      );
      
      scene.add(mesh);
      threeMeshes.push(mesh);
    });
  }

  function create3DTunnel(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const rings = 20;
    const segments = 16;
    
    for (let ring = 0; ring < rings; ring++) {
      const z = ring * -0.5;
      const levelIndex = Math.floor((ring / rings) * levels.length);
      const level = levels[levelIndex] || 0;
      
      for (let seg = 0; seg < segments; seg++) {
        const angle = (seg / segments) * Math.PI * 2;
        const radius = 2 + level * 2;
        
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const color = new THREE.Color(getColorForLevel(level));
        const material = new THREE.MeshBasicMaterial({ 
          color: color,
          emissive: new THREE.Color(0x000000)
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          z
        );
        
        scene.add(mesh);
        threeMeshes.push(mesh);
      }
    }
  }

  function create3DWaves(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const width = levels.length;
    const height = 20;
    const geometry = new THREE.PlaneGeometry(6, 4, width - 1, height - 1);
    
    // Create wave displacement based on audio levels
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const levelIndex = Math.floor((x + 3) / 6 * levels.length);
      const level = levels[levelIndex] || 0;
      
      vertices[i + 2] = Math.sin(y * 2 + Date.now() * 0.005) * level * 2;
    }
    geometry.attributes.position.needsUpdate = true;
    
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff88,
      wireframe: true,
      emissive: new THREE.Color(0x000000)
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 4;
    
    scene.add(mesh);
    threeMeshes.push(mesh);
  }

  function create3DCubeMatrix(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const gridSize = Math.ceil(Math.sqrt(levels.length));
    const spacing = 0.3;
    const startX = -(gridSize * spacing) / 2;
    const startZ = -(gridSize * spacing) / 2;
    
    for (let i = 0; i < levels.length; i++) {
      const x = i % gridSize;
      const z = Math.floor(i / gridSize);
      const level = levels[i];
      
      const height = Math.max(0.1, level * 4);
      const geometry = new THREE.BoxGeometry(0.2, height, 0.2);
      const color = new THREE.Color(getColorForLevel(level));
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        startX + x * spacing,
        height / 2 - 2,
        startZ + z * spacing
      );
      
      scene.add(mesh);
      threeMeshes.push(mesh);
    }
  }

  function create3DSpiral(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const spiralHeight = 6;
    const spiralRadius = 2;
    const turns = 3;
    
    levels.forEach((level, i) => {
      const t = i / levels.length;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * spiralHeight;
      const radius = spiralRadius + level * 1.5;
      
      const geometry = new THREE.SphereGeometry(0.05 + level * 0.2, 8, 8);
      const color = new THREE.Color(getColorForLevel(level));
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      
      scene.add(mesh);
      threeMeshes.push(mesh);
    });
    
    // Rotate the spiral
    scene.rotation.y += 0.01;
  }

  function create3DGalaxy(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const arms = 4;
    const armLength = 3;
    
    levels.forEach((level, i) => {
      const armIndex = i % arms;
      const positionInArm = Math.floor(i / arms) / Math.floor(levels.length / arms);
      
      const baseAngle = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = baseAngle + positionInArm * Math.PI * 2;
      const radius = positionInArm * armLength;
      
      // Add some randomness for galaxy effect
      const randomOffset = (Math.random() - 0.5) * 0.5;
      const actualRadius = radius + randomOffset;
      
      const geometry = new THREE.SphereGeometry(0.03 + level * 0.15, 6, 6);
      const color = new THREE.Color(getColorForLevel(level));
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Math.cos(spiralAngle) * actualRadius,
        (Math.random() - 0.5) * level * 2,
        Math.sin(spiralAngle) * actualRadius
      );
      
      scene.add(mesh);
      threeMeshes.push(mesh);
    });
    
    // Rotate the galaxy
    scene.rotation.y += 0.005;
  }

  function create3DDNAHelix(levels) {
    threeMeshes.forEach(mesh => scene.remove(mesh));
    threeMeshes = [];
    
    const helixHeight = 8;
    const helixRadius = 1.5;
    const turns = 2;
    
    levels.forEach((level, i) => {
      const t = i / levels.length;
      const angle1 = t * Math.PI * 2 * turns;
      const angle2 = angle1 + Math.PI; // Opposite side
      const y = (t - 0.5) * helixHeight;
      
      // First helix strand
      const geometry1 = new THREE.SphereGeometry(0.08 + level * 0.1, 8, 8);
      const color1 = new THREE.Color(getColorForLevel(level));
      const material1 = new THREE.MeshBasicMaterial({ 
        color: color1,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh1 = new THREE.Mesh(geometry1, material1);
      mesh1.position.set(
        Math.cos(angle1) * helixRadius,
        y,
        Math.sin(angle1) * helixRadius
      );
      
      // Second helix strand
      const geometry2 = new THREE.SphereGeometry(0.08 + level * 0.1, 8, 8);
      const color2 = new THREE.Color(getColorForLevel(1 - level)); // Complementary
      const material2 = new THREE.MeshBasicMaterial({ 
        color: color2,
        emissive: new THREE.Color(0x000000)
      });
      
      const mesh2 = new THREE.Mesh(geometry2, material2);
      mesh2.position.set(
        Math.cos(angle2) * helixRadius,
        y,
        Math.sin(angle2) * helixRadius
      );
      
      // Connection between strands (base pairs)
      if (i % 3 === 0) {
        const connectionGeometry = new THREE.CylinderGeometry(0.02, 0.02, helixRadius * 2, 8);
        const connectionMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x666666,
          emissive: new THREE.Color(0x000000)
        });
        
        const connection = new THREE.Mesh(connectionGeometry, connectionMaterial);
        connection.position.set(0, y, 0);
        connection.rotation.z = angle1;
        
        scene.add(connection);
        threeMeshes.push(connection);
      }
      
      scene.add(mesh1);
      scene.add(mesh2);
      threeMeshes.push(mesh1);
      threeMeshes.push(mesh2);
    });
    
    // Rotate the DNA helix
    scene.rotation.y += 0.008;
  }

  // Update 3D visualization based on current style
  function update3DVisualization(levels) {
    if (!scene || !is3DMode) return;
    
    switch (vizStyle) {
      case '3d-bars':
        create3DBars(levels);
        break;
      case '3d-sphere':
        create3DSphere(levels);
        break;
      case '3d-tunnel':
        create3DTunnel(levels);
        // Auto-rotate tunnel
        if (threeMeshes.length > 0) {
          scene.rotation.z += 0.01;
        }
        break;
      case '3d-waves':
        create3DWaves(levels);
        break;
      case '3d-cube':
        create3DCubeMatrix(levels);
        break;
      case '3d-spiral':
        create3DSpiral(levels);
        break;
      case '3d-galaxy':
        create3DGalaxy(levels);
        break;
      case '3d-dna':
        create3DDNAHelix(levels);
        break;
    }
    
    renderer.render(scene, camera);
  }

  // Mode switching functions
  function switchTo3D() {
    is3DMode = true;
    canvas.style.display = 'none';
    threeContainer.style.display = 'block';
    backTo2DBtn.classList.add('show');
    
    init3D();
    stopDemoBeats();
    startDemoBeats(); // Restart for 3D mode
  }

  function switchTo2D() {
    is3DMode = false;
    canvas.style.display = 'block';
    threeContainer.style.display = 'none';
    backTo2DBtn.classList.remove('show');
    
    // Clean up 3D resources
    if (scene) {
      threeMeshes.forEach(mesh => scene.remove(mesh));
      threeMeshes = [];
    }
    
    stopDemoBeats();
    startDemoBeats(); // Restart for 2D mode
    ensureCanvasHiDPI();
  }

  function ensureCanvasHiDPI() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function getBandLabels(bandCount) {
    const labels = [];
    for (let i = 0; i < bandCount; i++) {
        const t = (i + 0.5) / bandCount;
        let f = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, t);
        if (f < 1000) {
            labels.push(String(Math.round(f)));
        } else {
            labels.push((f / 1000).toFixed(1).replace('.0', '') + 'k');
        }
    }
    return labels;
  }

  // Theme-based color system
  const themes = {
    classic: {
      name: 'Classic Winamp',
      canvasClass: '',
      bgColor: '#000',
      uiColors: {
        primary: '#9eea6a',
        background: '#0a0a0a',
        border: '#111'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.7) {
          const k = t / 0.7;
          const r = Math.round(lerp(0, 255, k));
          return `rgb(${r},255,0)`;
        } else {
          const k = (t - 0.7) / 0.3;
          const g = Math.round(lerp(255, 0, k));
          return `rgb(255,${g},0)`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const redTop = Math.max(1, Math.round(maxSegments * (2 / 16)));
        const yellowNext = Math.max(1, Math.round(maxSegments * (3 / 16)));
        const redStart = maxSegments - redTop;
        const yellowStart = Math.max(0, redStart - yellowNext);
        if (segmentIndex >= redStart) return '#ff0000';
        if (segmentIndex >= yellowStart) return '#ffff00';
        return '#00ff00';
      }
    },
    neon: {
      name: 'Neon Glow',
      canvasClass: 'neon-glow',
      bgColor: '#0a0a0a',
      uiColors: {
        primary: '#00ffff',
        background: '#1a0a1a',
        border: '#ff00ff'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.5) {
          const k = t / 0.5;
          const r = Math.round(lerp(255, 0, k));
          const b = Math.round(lerp(0, 255, k));
          return `rgb(${r},0,${b})`;
        } else {
          const k = (t - 0.5) / 0.5;
          const g = Math.round(lerp(0, 255, k));
          const b = Math.round(lerp(255, 0, k));
          return `rgb(0,${g},${b})`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.33) return '#ff00ff';
        if (t < 0.66) return '#00ffff';
        return '#ffff00';
      }
    },
    ocean: {
      name: 'Ocean Depths',
      canvasClass: 'ocean-glow',
      bgColor: '#001122',
      uiColors: {
        primary: '#40c0ff',
        background: '#0a1a2a',
        border: '#0080ff'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.5) {
          const k = t / 0.5;
          const g = Math.round(lerp(0, 100, k));
          const b = Math.round(lerp(100, 255, k));
          return `rgb(0,${g},${b})`;
        } else {
          const k = (t - 0.5) / 0.5;
          const r = Math.round(lerp(0, 100, k));
          const g = Math.round(lerp(100, 255, k));
          const b = Math.round(lerp(255, 200, k));
          return `rgb(${r},${g},${b})`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.3) return '#004080';
        if (t < 0.6) return '#0080ff';
        if (t < 0.8) return '#40c0ff';
        return '#80ffff';
      }
    },
    fire: {
      name: 'Fire Storm',
      canvasClass: 'fire-glow',
      bgColor: '#220000',
      uiColors: {
        primary: '#ff8000',
        background: '#2a0a0a',
        border: '#ff4000'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.33) {
          const k = t / 0.33;
          const r = Math.round(lerp(80, 255, k));
          const g = Math.round(lerp(0, 50, k));
          return `rgb(${r},${g},0)`;
        } else if (t < 0.66) {
          const k = (t - 0.33) / 0.33;
          const g = Math.round(lerp(50, 200, k));
          return `rgb(255,${g},0)`;
        } else {
          const k = (t - 0.66) / 0.34;
          const g = Math.round(lerp(200, 255, k));
          const b = Math.round(lerp(0, 100, k));
          return `rgb(255,${g},${b})`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.25) return '#800000';
        if (t < 0.5) return '#ff4000';
        if (t < 0.75) return '#ff8000';
        return '#ffff00';
      }
    },
    matrix: {
      name: 'Matrix Code',
      canvasClass: 'matrix-glow',
      bgColor: '#001100',
      uiColors: {
        primary: '#00ff00',
        background: '#0a1a0a',
        border: '#008800'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        const g = Math.round(lerp(50, 255, t));
        return `rgb(0,${g},0)`;
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.3) return '#003300';
        if (t < 0.6) return '#006600';
        if (t < 0.8) return '#00cc00';
        return '#00ff00';
      }
    },
    synthwave: {
      name: 'Synthwave',
      canvasClass: 'neon-glow',
      bgColor: '#1a0a2a',
      uiColors: {
        primary: '#ff0080',
        background: '#2a0a3a',
        border: '#8000ff'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.4) {
          const k = t / 0.4;
          const r = Math.round(lerp(128, 255, k));
          const b = Math.round(lerp(255, 128, k));
          return `rgb(${r},0,${b})`;
        } else if (t < 0.7) {
          const k = (t - 0.4) / 0.3;
          const r = Math.round(lerp(255, 255, k));
          const g = Math.round(lerp(0, 128, k));
          const b = Math.round(lerp(128, 255, k));
          return `rgb(${r},${g},${b})`;
        } else {
          const k = (t - 0.7) / 0.3;
          const g = Math.round(lerp(128, 255, k));
          return `rgb(255,${g},255)`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.25) return '#8000ff';
        if (t < 0.5) return '#ff0080';
        if (t < 0.75) return '#ff8040';
        return '#ffff80';
      }
    },
    aurora: {
      name: 'Aurora',
      canvasClass: 'glow-effect',
      bgColor: '#0a0a1a',
      uiColors: {
        primary: '#80ff80',
        background: '#1a1a2a',
        border: '#4080ff'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        const phase = t * Math.PI * 2;
        const r = Math.round(128 + 127 * Math.sin(phase));
        const g = Math.round(128 + 127 * Math.sin(phase + Math.PI * 2/3));
        const b = Math.round(128 + 127 * Math.sin(phase + Math.PI * 4/3));
        return `rgb(${r},${g},${b})`;
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        const phase = t * Math.PI * 2;
        const r = Math.round(128 + 127 * Math.sin(phase));
        const g = Math.round(128 + 127 * Math.sin(phase + Math.PI * 2/3));
        const b = Math.round(128 + 127 * Math.sin(phase + Math.PI * 4/3));
        return `rgb(${r},${g},${b})`;
      }
    },
    plasma: {
      name: 'Plasma',
      canvasClass: 'blur-effect',
      bgColor: '#2a1a2a',
      uiColors: {
        primary: '#ff80ff',
        background: '#3a2a3a',
        border: '#ff40ff'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        const r = Math.round(128 + 127 * Math.sin(t * Math.PI * 3));
        const g = Math.round(128 + 127 * Math.sin(t * Math.PI * 5 + Math.PI/2));
        const b = Math.round(128 + 127 * Math.sin(t * Math.PI * 7 + Math.PI));
        return `rgb(${r},${g},${b})`;
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        const r = Math.round(128 + 127 * Math.sin(t * Math.PI * 3));
        const g = Math.round(128 + 127 * Math.sin(t * Math.PI * 5 + Math.PI/2));
        const b = Math.round(128 + 127 * Math.sin(t * Math.PI * 7 + Math.PI));
        return `rgb(${r},${g},${b})`;
      }
    },
    rainbow: {
      name: 'Rainbow',
      canvasClass: 'glow-effect',
      bgColor: '#1a1a1a',
      uiColors: {
        primary: '#ff8080',
        background: '#2a2a2a',
        border: '#808080'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        const hue = t * 360;
        const sat = 100;
        const light = 50 + t * 30;
        return `hsl(${hue}, ${sat}%, ${light}%)`;
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const hue = (segmentIndex / maxSegments) * 360;
        return `hsl(${hue}, 100%, 60%)`;
      }
    },
    midnight: {
      name: 'Midnight',
      canvasClass: '',
      bgColor: '#000011',
      uiColors: {
        primary: '#6080ff',
        background: '#0a0a1a',
        border: '#2a2a4a'
      },
      colorForLevel: (t) => {
        t = Math.min(1, Math.max(0, t));
        if (t < 0.5) {
          const k = t / 0.5;
          const b = Math.round(lerp(64, 128, k));
          return `rgb(0,0,${b})`;
        } else {
          const k = (t - 0.5) / 0.5;
          const r = Math.round(lerp(0, 128, k));
          const g = Math.round(lerp(0, 64, k));
          const b = Math.round(lerp(128, 255, k));
          return `rgb(${r},${g},${b})`;
        }
      },
      ledColorForSegment: (segmentIndex, maxSegments) => {
        const t = segmentIndex / maxSegments;
        if (t < 0.3) return '#000040';
        if (t < 0.6) return '#000080';
        if (t < 0.8) return '#4040ff';
        return '#8080ff';
      }
    }
  };

  function getColorForLevel(t) {
    return themes[currentTheme].colorForLevel(t);
  }

  function getLEDColorForSegment(segmentIndex, maxSegments) {
    return themes[currentTheme].ledColorForSegment(segmentIndex, maxSegments);
  }

  function applyThemePreset(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    
    // Apply canvas effects
    canvas.className = '';
    threeContainer.className = '';
    if (effectsChk.checked && theme.canvasClass) {
      canvas.classList.add(theme.canvasClass);
      threeContainer.classList.add(theme.canvasClass);
    }
    
    // Apply background patterns
    const bgPattern = document.getElementById('bg-pattern');
    if (bgPattern) {
      bgPattern.className = 'bg-pattern';
      if (effectsChk.checked && themeName !== 'classic') {
        bgPattern.classList.add(themeName);
      }
    }
    
    // Apply background colors
    document.body.style.background = theme.bgColor;
    canvas.style.background = theme.bgColor;
    if (renderer) {
      renderer.setClearColor(new THREE.Color(theme.bgColor), 1);
    }
    
    // Apply UI colors
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.uiColors.primary);
    root.style.setProperty('--theme-background', theme.uiColors.background);
    root.style.setProperty('--theme-border', theme.uiColors.border);
    
    // Update header and UI elements
    const header = document.querySelector('header');
    const eq = document.querySelector('.eq');
    const playlist = document.querySelector('.playlist');
    const footer = document.querySelector('footer');
    
    if (header) {
      header.style.background = theme.uiColors.background;
      header.style.borderBottomColor = theme.uiColors.border;
    }
    
    if (eq) {
      eq.style.background = theme.uiColors.background;
      eq.style.borderBottomColor = theme.uiColors.border;
    }
    
    if (playlist) {
      playlist.style.background = theme.uiColors.background;
      playlist.style.borderBottomColor = theme.uiColors.border;
    }
    
    if (footer) {
      footer.style.background = theme.uiColors.background;
      footer.style.borderTopColor = theme.uiColors.border;
      footer.style.color = theme.uiColors.primary;
    }
    
    // Update title color
    const title = document.querySelector('header h1');
    if (title) {
      title.style.color = theme.uiColors.primary;
    }
    
    // Update canvas border
    canvas.style.borderColor = theme.uiColors.border;
    threeContainer.style.borderColor = theme.uiColors.border;
    
    // Update button styles
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      btn.style.borderColor = theme.uiColors.border;
      btn.style.background = theme.uiColors.background;
      btn.style.color = theme.uiColors.primary;
    });
    
    // Update EQ slider colors
    const eqSliders = document.querySelectorAll('.eq input[type="range"]');
    eqSliders.forEach(slider => {
      slider.style.accentColor = theme.uiColors.primary;
    });
  }

  function buildBandRanges(sampleRate, bandCount) {
    const binCount = analyser.frequencyBinCount;
    const nyquist = sampleRate / 2;
    const toBin = (freq) => Math.floor(freq / nyquist * binCount);
    const edges = [];
    for (let i = 0; i <= bandCount; i++) {
      const t = i / bandCount;
      const f = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, t);
      edges.push(Math.max(0, Math.min(binCount - 1, toBin(f))));
    }
    const ranges = [];
    for (let i = 0; i < bandCount; i++) {
      let start = edges[i];
      let end = Math.max(start + 1, edges[i + 1]);
      ranges.push({ startBin: start, endBin: end });
    }
    return ranges;
  }

  function averageBandMagnitude(range) {
    const { startBin, endBin } = range;
    let sum = 0;
    let count = 0;
    for (let i = startBin; i < endBin; i++) {
      sum += freqData[i];
      count++;
    }
    if (count === 0) return 0;
    const linear = (sum / count) / 255;
    const curved = Math.pow(linear, 0.75);
    return Math.min(1, Math.max(0, curved));
  }

  function drawGrid(bandCount) {
    if (!gridChk.checked) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const labelHeight = (vizStyle === 'bars') ? 15 : 0;
    const drawHeight = h - labelHeight;
    ctx.save();
    const minor = '#222';
    const major = '#3a3a3a';
    const maxSegments = Math.floor(drawHeight / SEGMENT_HEIGHT);
    for (let s = 1; s <= maxSegments; s++) {
      const y = drawHeight - s * SEGMENT_HEIGHT;
      ctx.strokeStyle = (s % 5 === 0) ? major : minor;
      ctx.lineWidth = (s % 5 === 0) ? 1.25 : 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    if (vizStyle === 'bars') {
      const totalGap = (bandCount + 1) * BAR_GAP;
      const barWidth = Math.floor((w - totalGap) / bandCount);
      let x = BAR_GAP;
      for (let i = 0; i < bandCount; i++) {
        ctx.strokeStyle = i % 5 === 0 ? major : minor;
        ctx.lineWidth = i % 5 === 0 ? 1.25 : 1;
        ctx.beginPath();
        ctx.moveTo(x - 0.5, 0);
        ctx.lineTo(x - 0.5, drawHeight);
        ctx.stroke();
        x += barWidth + BAR_GAP;
      }
    }
    ctx.restore();
  }

  function ensurePeaksSize(n) {
    if (peaks.length !== n) {
      peaks = new Float32Array(n);
    }
  }

  function drawSpectrum(levels) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    drawGrid(levels.length);

    const drawBars = (yBase) => {
      const count = levels.length;
      const labelHeight = 15;
      const drawHeight = h - labelHeight;
      const totalGap = (count + 1) * BAR_GAP;
      const barWidth = Math.floor((w - totalGap) / count);
      const maxSegments = Math.floor(drawHeight / SEGMENT_HEIGHT);
      let x = BAR_GAP;
      const labels = getBandLabels(count);

      for (let i = 0; i < count; i++) {
        const inst = levels[i];
        const disp = vizStyle === 'bars' ? (barLevels[i] || 0) : inst;
        const segments = Math.max(0, Math.min(maxSegments, Math.round(disp * maxSegments)));

        if (barsChk.checked && barWidth > 0) {
          if (barStyle === 'led') {
            // LED style - draw individual segments
            for (let s = 0; s < segments; s++) {
              ctx.fillStyle = getLEDColorForSegment(s, maxSegments);
              const segY = yBase + drawHeight - (s + 1) * SEGMENT_HEIGHT;
              ctx.fillRect(x, segY + 1, barWidth, SEGMENT_HEIGHT - 1);
            }
          } else if (barStyle === 'gradient') {
            // Linear gradient style - draw a single gradient bar
            const barHeight = (segments * SEGMENT_HEIGHT);
            if (barHeight > 0) {
              const barY = yBase + drawHeight - barHeight;
              
              // Create gradient
              const gradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
              const color = getColorForLevel(disp);
              gradient.addColorStop(0, color);
              gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.3)'));
              
              ctx.fillStyle = gradient;
              ctx.fillRect(x, barY, barWidth, barHeight);
              
              // Add a subtle border
              ctx.strokeStyle = color;
              ctx.lineWidth = 1;
              ctx.strokeRect(x, barY, barWidth, barHeight);
            }
          }
        }

        if (peaksChk.checked) {
          if (inst >= peaks[i]) peaks[i] = inst;
          else if (PEAK_DECAY_PER_FRAME > 0) peaks[i] = Math.max(0, peaks[i] - PEAK_DECAY_PER_FRAME);
          // If PEAK_DECAY_PER_FRAME is 0, peaks hold forever

          const peakSeg = Math.max(0, Math.min(maxSegments - 1, Math.round(peaks[i] * maxSegments)));
          const peakY = yBase + drawHeight - (peakSeg + 1) * SEGMENT_HEIGHT;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakY, barWidth, PEAK_CAP_HEIGHT);
        }

        ctx.fillStyle = '#aaa';
        ctx.font = '10px ui-sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barWidth / 2, h - 5);

        x += barWidth + BAR_GAP;
      }
    };

    const drawSpikes = (yBase) => {
      const count = levels.length;
      const step = w / count;
      const maxPixels = h;
      ctx.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        const level = Math.max(0, Math.min(1, levels[i]));
        const pix = Math.round(level * maxPixels);
        const x = Math.round(i * step + step / 2);
        const topY = yBase + h - pix;
        const bottomY = yBase + h;
        ctx.strokeStyle = getColorForLevel(level);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, bottomY);
        ctx.lineTo(x + 0.5, topY);
        ctx.stroke();

        if (peaksChk.checked) {
          if (level >= peaks[i]) peaks[i] = level; 
          else if (PEAK_DECAY_PER_FRAME > 0) peaks[i] = Math.max(0, peaks[i] - PEAK_DECAY_PER_FRAME);
          // If PEAK_DECAY_PER_FRAME is 0, peaks hold forever
          const peakPix = Math.round(peaks[i] * maxPixels);
          const peakY = yBase + h - peakPix;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakY - 1, 2, 2);
        }
      }
    };

    ensurePeaksSize(levels.length);

    if (vizStyle === 'bars') {
      drawBars(0);
    } else if (vizStyle === 'spikes') {
      drawSpikes(0);
    } else if (vizStyle === 'circles') {
      drawCircles(levels);
    } else if (vizStyle === 'waveform') {
      drawWaveform(levels);
    } else if (vizStyle === 'radial') {
      drawRadial(levels);
    } else if (vizStyle === 'particles') {
      drawParticles(levels);
    }
  }

  // New 2D Visualization Functions
  function drawCircles(levels) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 3;
    
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    
    drawGrid(levels.length);
    
    levels.forEach((level, i) => {
      const angle = (i / levels.length) * Math.PI * 2;
      const radius = 20 + level * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = 5 + level * 15;
      
      ctx.fillStyle = getColorForLevel(level);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect
      if (effectsChk.checked) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = getColorForLevel(level);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  function drawWaveform(levels) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    
    // Add to history
    waveformHistory.push([...levels]);
    if (waveformHistory.length > 100) {
      waveformHistory.shift();
    }
    
    // Draw waveform trails
    waveformHistory.forEach((historicLevels, historyIndex) => {
      const alpha = (historyIndex + 1) / waveformHistory.length;
      const step = w / historicLevels.length;
      
      ctx.strokeStyle = getColorForLevel(0.5) + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      historicLevels.forEach((level, i) => {
        const x = i * step;
        const y = h / 2 + (level - 0.5) * h * 0.8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      
      ctx.stroke();
    });
    
    // Draw current waveform
    const step = w / levels.length;
    ctx.strokeStyle = getColorForLevel(0.8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    levels.forEach((level, i) => {
      const x = i * step;
      const y = h / 2 + (level - 0.5) * h * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
  }

  function drawRadial(levels) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) / 2 - 20;
    
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    
    drawGrid(levels.length);
    
    // Draw concentric circles
    for (let ring = 0; ring < 5; ring++) {
      const radius = (ring + 1) * (maxRadius / 5);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw radial bars
    levels.forEach((level, i) => {
      const angle = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
      const innerRadius = 30;
      const outerRadius = innerRadius + level * (maxRadius - innerRadius);
      
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * outerRadius;
      const y2 = centerY + Math.sin(angle) * outerRadius;
      
      ctx.strokeStyle = getColorForLevel(level);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Add glow effect
      if (effectsChk.checked && level > 0.1) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = getColorForLevel(level);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });
  }

  function drawParticles(levels) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);
    
    // Update particle system
    levels.forEach((level, i) => {
      if (!particleSystem2D[i]) {
        particleSystem2D[i] = [];
      }
      
      // Add new particles based on level
      if (level > 0.1 && Math.random() < level) {
        const particle = {
          x: (i / levels.length) * w,
          y: h,
          vx: (Math.random() - 0.5) * 4,
          vy: -level * 8 - 2,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.02,
          size: 2 + level * 6,
          color: getColorForLevel(level)
        };
        particleSystem2D[i].push(particle);
      }
      
      // Update and draw particles
      particleSystem2D[i] = particleSystem2D[i].filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // gravity
        particle.life -= particle.decay;
        
        if (particle.life > 0 && particle.y < h + 50) {
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });
    });
    
    ctx.globalAlpha = 1.0;
  }

  function render() {
    if (!analyser) return;
    analyser.getByteFrequencyData(freqData);

    let levels;
    if (vizStyle === 'bars' || vizStyle === 'circles' || vizStyle === 'radial' || vizStyle.startsWith('3d-')) {
      levels = new Float32Array(bandRanges.length);
      for (let i = 0; i < bandRanges.length; i++) levels[i] = averageBandMagnitude(bandRanges[i]);
      if (barLevels.length !== levels.length) barLevels = new Float32Array(levels.length);
      for (let i = 0; i < levels.length; i++) {
        const decayed = Math.max(0, barLevels[i] - BAR_DECAY_PER_FRAME);
        barLevels[i] = Math.max(levels[i], decayed);
      }
    } else {
      levels = new Float32Array(spikeRanges.length);
      for (let i = 0; i < spikeRanges.length; i++) levels[i] = averageBandMagnitude(spikeRanges[i]);
    }

    // Beat detection and effects
    const beatResult = detectBeat(levels);
    if (beatResult.detected) {
      triggerBeatEffects(beatResult.intensity);
    }

    if (is3DMode) {
      update3DVisualization(levels);
      updateCameraMovement(); // Update camera movement for 3D mode
    } else {
      drawSpectrum(levels);
    }
    
    animationId = requestAnimationFrame(render);
  }

  function stopRendering() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = 0;
    }
  }

  function resetPeaks() {
    peaks.fill(0);
  }

  function resetBarLevels() {
    barLevels.fill(0);
  }

  function isRendering() {
    return animationId !== 0;
  }

  function immediateRedraw() {
    ensureCanvasHiDPI();
    if (vizStyle === 'bars') {
      drawSpectrum(new Float32Array(NUM_BANDS));
    } else if (!vizStyle.startsWith('3d-')) {
      drawSpectrum(new Float32Array(SPIKE_BANDS));
    }
  }

  async function setupContextIfNeeded() {
    if (audioContext) return audioContext;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    bandRanges = buildBandRanges(audioContext.sampleRate, NUM_BANDS);
    spikeRanges = buildBandRanges(audioContext.sampleRate, SPIKE_BANDS);
    ensureEQNodes();
    renderEQSliders();
    refreshEQEnable();
    return audioContext;
  }

  function connectSource(node) {
    try { sourceNode && sourceNode.disconnect(); } catch {}
    sourceNode = node;
    ensureEQNodes();
    sourceNode.connect(eqNodes.input);
    eqNodes.output.connect(analyser);
    try { eqNodes.output.connect(audioContext.destination); } catch {}
  }

  async function useFile(file) {
    await setupContextIfNeeded();
    stopRendering();
    resetPeaks();

    if (mediaElement) {
      mediaElement.pause();
      URL.revokeObjectURL(mediaElement.src);
    }
    mediaElement = new Audio();
    const objectUrl = URL.createObjectURL(file);
    mediaElement.src = objectUrl;
    mediaElement.crossOrigin = 'anonymous';
    mediaElement.loop = true;

    const trackNode = audioContext.createMediaElementSource(mediaElement);
    connectSource(trackNode);

    playBtn.disabled = false;
    pauseBtn.disabled = false;
    await mediaElement.play().catch(() => {});
    addToPlaylist({ title: file.name, url: objectUrl, isBlob: true });
    render();
  }

  async function useUrl(url) {
    await setupContextIfNeeded();
    stopRendering();
    resetPeaks();

    if (mediaElement) {
      mediaElement.pause();
      try { URL.revokeObjectURL(mediaElement.src); } catch {}
    }
    mediaElement = new Audio();
    mediaElement.src = url;
    mediaElement.crossOrigin = 'anonymous';
    mediaElement.loop = true;

    const trackNode = audioContext.createMediaElementSource(mediaElement);
    connectSource(trackNode);

    playBtn.disabled = false;
    pauseBtn.disabled = false;
    await mediaElement.play().catch(() => {});
    addToPlaylist({ title: url, url });
    render();
  }

  async function useMic() {
    await setupContextIfNeeded();
    stopRendering();
    resetPeaks();

    if (mediaElement) {
      mediaElement.pause();
      mediaElement = null;
    }
    if (mediaStream) {
      try { mediaStream.getTracks().forEach(t => t.stop()); } catch {}
      mediaStream = null;
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const micSource = audioContext.createMediaStreamSource(mediaStream);
    connectSource(micSource);

    playBtn.disabled = true;
    pauseBtn.disabled = true;
    render();
  }

  // Event Handlers
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) useFile(file);
  });

  micBtn.addEventListener('click', () => {
    useMic().catch(console.error);
  });

  urlBtn.addEventListener('click', async () => {
    const url = prompt('Enter an audio URL (https://...)');
    if (!url) return;
    try {
      await useUrl(url);
    } catch (e) {
      alert('Failed to load URL. Make sure it allows CORS and points to an audio stream/file.');
      console.error(e);
    }
  });

  // Back to 2D button
  backTo2DBtn.addEventListener('click', () => {
    styleSel.value = 'bars';
    vizStyle = 'bars';
    switchTo2D();
    handleToggleRedraw();
  });

  function addToPlaylist(item) {
    const exist = playlist.findIndex((p) => p.url === item.url);
    if (exist !== -1) {
      currentTrackIndex = exist;
      highlightActiveTrack();
      return;
    }
    playlist.push(item);
    currentTrackIndex = playlist.length - 1;
    renderPlaylist();
  }

  function renderPlaylist() {
    playlistEl.innerHTML = '';
    playlist.forEach((t, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'track' + (idx === currentTrackIndex ? ' active' : '');
      chip.textContent = t.title.length > 48 ? t.title.slice(0, 45) + '…' : t.title;
      chip.title = t.title;
      chip.addEventListener('click', async () => {
        await playFromPlaylist(idx);
      });
      playlistEl.appendChild(chip);
    });
  }

  function highlightActiveTrack() {
    const chips = playlistEl.querySelectorAll('.track');
    chips.forEach((c, i) => c.classList.toggle('active', i === currentTrackIndex));
  }

  async function playFromPlaylist(idx) {
    const item = playlist[idx];
    if (!item) return;
    currentTrackIndex = idx;
    await useUrl(item.url);
    highlightActiveTrack();
  }

  playBtn.addEventListener('click', () => {
    if (!mediaElement) return;
    mediaElement.play();
  });

  pauseBtn.addEventListener('click', () => {
    if (!mediaElement) return;
    mediaElement.pause();
  });

  function handleToggleRedraw() {
    if (!isRendering()) {
      immediateRedraw();
    }
  }

  gridChk.addEventListener('change', handleToggleRedraw);
  barsChk.addEventListener('change', handleToggleRedraw);
  peaksChk.addEventListener('change', () => {
    resetPeaks();
    handleToggleRedraw();
  });
  
  shakeChk.addEventListener('change', () => {
    // Clear any existing shake effects when toggling
    canvas.classList.remove('beat-shake', 'beat-shake-intense');
    threeContainer.classList.remove('beat-shake', 'beat-shake-intense');
  });
  
  // Event listeners for new beat-reactive effects
  flashChk.addEventListener('change', () => {
    canvas.classList.remove('beat-flash');
    threeContainer.classList.remove('beat-flash');
  });
  
  zoomChk.addEventListener('change', () => {
    canvas.classList.remove('beat-zoom', 'beat-zoom-intense');
    threeContainer.classList.remove('beat-zoom', 'beat-zoom-intense');
  });
  
  particlesEffectChk.addEventListener('change', () => {
    // Clean up particle container when disabled
    if (!particlesEffectChk.checked && particleContainer) {
      particleContainer.innerHTML = '';
    }
  });
  
  // Event listeners for new particle effects
  particleTrailsChk.addEventListener('change', () => {
    if (!particleTrailsChk.checked && particleContainer) {
      // Clean up trail particles
      const trails = particleContainer.querySelectorAll('.particle-trail');
      trails.forEach(trail => trail.remove());
    }
  });
  
  particleFountainChk.addEventListener('change', () => {
    if (!particleFountainChk.checked && particleContainer) {
      // Clean up fountain particles
      const fountains = particleContainer.querySelectorAll('.particle-fountain');
      fountains.forEach(fountain => fountain.remove());
    }
  });
  
  cameraMovementChk.addEventListener('change', () => {
    if (!cameraMovementChk.checked && camera) {
      // Reset camera to default position
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);
      cameraAnimation.time = 0;
    }
  });
  
  cameraPatternSel.addEventListener('change', () => {
    // Reset camera animation state when pattern changes
    cameraAnimation.orbitAngle = 0;
    cameraAnimation.spiralProgress = 0;
    cameraAnimation.patternTime = 0;
  });

  function updatePeakDecayFromSeconds() {
    const seconds = parseFloat(peakSecondsEl.value);
    if (seconds === -1) {
      peakSecondsValEl.textContent = 'Hold';
      PEAK_DECAY_PER_FRAME = 0; // No decay - peaks hold forever
    } else {
      peakSecondsValEl.textContent = `${seconds.toFixed(1)}s`;
      const fps = 60;
      PEAK_DECAY_PER_FRAME = 1 / Math.max(1, seconds * fps);
    }
  }
  peakSecondsEl.addEventListener('input', updatePeakDecayFromSeconds);
  
  function updateBeatSensitivity() {
    const sensitivity = parseFloat(beatSensitivityEl.value);
    beatSensitivityValEl.textContent = sensitivity.toFixed(1);
    beatDetection.threshold = sensitivity;
  }
  beatSensitivityEl.addEventListener('input', updateBeatSensitivity);

  // Custom Theme Creation System
  function openThemeCreator() {
    const modal = document.getElementById('theme-modal');
    modal.style.display = 'block';
    
    // Reset form to defaults
    document.getElementById('theme-name').value = '';
    document.getElementById('primary-color').value = '#9eea6a';
    document.getElementById('bg-color').value = '#000000';
    document.getElementById('border-color').value = '#111111';
    document.getElementById('ui-bg-color').value = '#0a0a0a';
    document.getElementById('low-freq-color').value = '#00ff00';
    document.getElementById('mid-freq-color').value = '#ffff00';
    document.getElementById('high-freq-color').value = '#ff0000';
    document.getElementById('glow-effect').checked = false;
    document.getElementById('blur-effect').checked = false;
    document.getElementById('neon-effect').checked = false;
    
    updateThemePreview();
  }
  
  function closeThemeCreator() {
    const modal = document.getElementById('theme-modal');
    modal.style.display = 'none';
  }
  
  function updateThemePreview() {
    const lowColor = document.getElementById('low-freq-color').value;
    const midColor = document.getElementById('mid-freq-color').value;
    const highColor = document.getElementById('high-freq-color').value;
    const bgColor = document.getElementById('bg-color').value;
    
    const previewBox = document.getElementById('theme-preview-box');
    const bars = previewBox.querySelectorAll('.preview-bar');
    
    previewBox.style.background = bgColor;
    bars[0].style.background = lowColor;
    bars[1].style.background = midColor;
    bars[2].style.background = highColor;
    
    // Apply effects to preview
    let effects = '';
    if (document.getElementById('glow-effect').checked) {
      effects += 'drop-shadow(0 0 10px currentColor) ';
    }
    if (document.getElementById('blur-effect').checked) {
      effects += 'blur(0.5px) ';
    }
    if (document.getElementById('neon-effect').checked) {
      effects += 'drop-shadow(0 0 15px #00ffff) ';
    }
    
    bars.forEach(bar => {
      bar.style.filter = effects;
    });
  }
  
  function saveCustomTheme() {
    const themeName = document.getElementById('theme-name').value.trim();
    
    if (!themeName) {
      alert('Please enter a theme name');
      return;
    }
    
    if (themes[themeName] || customThemes[themeName]) {
      if (!confirm('A theme with this name already exists. Overwrite?')) {
        return;
      }
    }
    
    // Create custom theme object
    const customTheme = {
      name: themeName,
      canvasClass: '',
      bgColor: document.getElementById('bg-color').value,
      uiColors: {
        primary: document.getElementById('primary-color').value,
        background: document.getElementById('ui-bg-color').value,
        border: document.getElementById('border-color').value
      },
      colorForLevel: createCustomColorFunction(),
      ledColorForSegment: createCustomLEDFunction()
    };
    
    // Add effects
    const effects = [];
    if (document.getElementById('glow-effect').checked) effects.push('glow-effect');
    if (document.getElementById('blur-effect').checked) effects.push('blur-effect');
    if (document.getElementById('neon-effect').checked) effects.push('neon-glow');
    
    customTheme.canvasClass = effects.join(' ');
    
    // Save to custom themes and add to dropdown
    customThemes[themeName] = customTheme;
    themes[themeName] = customTheme;
    
    // Add to theme selector
    const themeSelect = document.getElementById('theme');
    let option = themeSelect.querySelector(`option[value="${themeName}"]`);
    if (!option) {
      option = document.createElement('option');
      option.value = themeName;
      themeSelect.appendChild(option);
    }
    option.textContent = themeName;
    
    // Apply the new theme
    themeSelect.value = themeName;
    currentTheme = themeName;
    applyThemePreset(currentTheme);
    
    // Save to localStorage
    localStorage.setItem('customThemes', JSON.stringify(customThemes));
    
    closeThemeCreator();
    alert('Theme saved successfully!');
  }
  
  function createCustomColorFunction() {
    const lowColor = document.getElementById('low-freq-color').value;
    const midColor = document.getElementById('mid-freq-color').value;
    const highColor = document.getElementById('high-freq-color').value;
    
    return function(t) {
      t = Math.min(1, Math.max(0, t));
      if (t < 0.5) {
        return interpolateColor(lowColor, midColor, t * 2);
      } else {
        return interpolateColor(midColor, highColor, (t - 0.5) * 2);
      }
    };
  }
  
  function createCustomLEDFunction() {
    const lowColor = document.getElementById('low-freq-color').value;
    const midColor = document.getElementById('mid-freq-color').value;
    const highColor = document.getElementById('high-freq-color').value;
    
    return function(segmentIndex, maxSegments) {
      const t = segmentIndex / maxSegments;
      if (t < 0.33) return lowColor;
      if (t < 0.66) return midColor;
      return highColor;
    };
  }
  
  function interpolateColor(color1, color2, factor) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `rgb(${r},${g},${b})`;
  }
  
  function loadCustomThemes() {
    try {
      const saved = localStorage.getItem('customThemes');
      if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(customThemes, loaded);
        Object.assign(themes, loaded);
        
        // Add to theme selector
        const themeSelect = document.getElementById('theme');
        Object.keys(loaded).forEach(themeName => {
          let option = themeSelect.querySelector(`option[value="${themeName}"]`);
          if (!option) {
            option = document.createElement('option');
            option.value = themeName;
            option.textContent = themeName;
            themeSelect.appendChild(option);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load custom themes:', e);
    }
  }
  
  // Theme export and import functions
  function exportTheme() {
    const themeName = document.getElementById('theme-name').value.trim() || 'CustomTheme';
    
    const themeData = {
      name: themeName,
      version: '1.0',
      created: new Date().toISOString(),
      bgColor: document.getElementById('bg-color').value,
      uiColors: {
        primary: document.getElementById('primary-color').value,
        background: document.getElementById('ui-bg-color').value,
        border: document.getElementById('border-color').value
      },
      visualizationColors: {
        low: document.getElementById('low-freq-color').value,
        mid: document.getElementById('mid-freq-color').value,
        high: document.getElementById('high-freq-color').value
      },
      effects: {
        glow: document.getElementById('glow-effect').checked,
        blur: document.getElementById('blur-effect').checked,
        neon: document.getElementById('neon-effect').checked
      }
    };
    
    // Create and download JSON file
    const dataStr = JSON.stringify(themeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${themeName.replace(/[^a-z0-9]/gi, '_')}_theme.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    alert('Theme exported successfully!');
  }
  
  function importTheme() {
    const fileInput = document.getElementById('theme-file-input');
    fileInput.click();
  }
  
  function handleThemeImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const themeData = JSON.parse(e.target.result);
        
        // Validate theme data
        if (!themeData.name || !themeData.uiColors || !themeData.visualizationColors) {
          throw new Error('Invalid theme file format');
        }
        
        // Populate the form with imported data
        document.getElementById('theme-name').value = themeData.name;
        document.getElementById('bg-color').value = themeData.bgColor || '#000000';
        document.getElementById('primary-color').value = themeData.uiColors.primary || '#9eea6a';
        document.getElementById('ui-bg-color').value = themeData.uiColors.background || '#0a0a0a';
        document.getElementById('border-color').value = themeData.uiColors.border || '#111111';
        document.getElementById('low-freq-color').value = themeData.visualizationColors.low || '#00ff00';
        document.getElementById('mid-freq-color').value = themeData.visualizationColors.mid || '#ffff00';
        document.getElementById('high-freq-color').value = themeData.visualizationColors.high || '#ff0000';
        
        if (themeData.effects) {
          document.getElementById('glow-effect').checked = themeData.effects.glow || false;
          document.getElementById('blur-effect').checked = themeData.effects.blur || false;
          document.getElementById('neon-effect').checked = themeData.effects.neon || false;
        }
        
        updateThemePreview();
        alert('Theme imported successfully!');
        
      } catch (error) {
        alert('Error importing theme: ' + error.message);
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }

  // Theme creator event listeners
  createThemeBtn.addEventListener('click', openThemeCreator);
  
  document.getElementById('close-theme-modal').addEventListener('click', closeThemeCreator);
  document.getElementById('cancel-theme').addEventListener('click', closeThemeCreator);
  document.getElementById('save-theme').addEventListener('click', saveCustomTheme);
  document.getElementById('export-theme').addEventListener('click', exportTheme);
  document.getElementById('import-theme').addEventListener('click', importTheme);
  document.getElementById('theme-file-input').addEventListener('change', handleThemeImport);
  
  // Update preview when colors change
  ['primary-color', 'bg-color', 'border-color', 'ui-bg-color', 
   'low-freq-color', 'mid-freq-color', 'high-freq-color',
   'glow-effect', 'blur-effect', 'neon-effect'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', updateThemePreview);
      element.addEventListener('input', updateThemePreview);
    }
  });
  
  // Close modal when clicking outside
  document.getElementById('theme-modal').addEventListener('click', (e) => {
    if (e.target.id === 'theme-modal') {
      closeThemeCreator();
    }
  });

  resetEqBtn.addEventListener('click', () => {
    EQ_BANDS = EQ_BANDS.map((b) => ({ ...b, gain: 0 }));
    EQ_BANDS.forEach((_, i) => {
      const el = document.getElementById(`eq-slider-${i}`);
      const val = document.getElementById(`eq-val-${i}`);
      if (el) el.value = '0';
      if (val) val.textContent = '+0 dB';
    });
    if (audioContext) {
      ensureEQNodes();
      EQ_BANDS.forEach((b, i) => { eqNodes.bands[i].gain.value = b.gain; });
    }
  });

  styleSel.addEventListener('change', () => {
    const newStyle = styleSel.value;
    vizStyle = newStyle;
    
    // Switch between 2D and 3D modes
    if (newStyle.startsWith('3d-')) {
      switchTo3D();
    } else {
      switchTo2D();
    }
    
    // Show/hide bar style container based on selected style
    if (barStyleContainer) {
      barStyleContainer.style.display = vizStyle === 'bars' ? 'inline-flex' : 'none';
    }
    
    barsChk.disabled = vizStyle !== 'bars';
    resetPeaks();
    resetBarLevels();
    handleToggleRedraw();
  });

  themeSel.addEventListener('change', () => {
    currentTheme = themeSel.value;
    applyThemePreset(currentTheme);
    handleToggleRedraw();
  });

  barStyleSel.addEventListener('change', () => {
    barStyle = barStyleSel.value;
    handleToggleRedraw();
  });

  effectsChk.addEventListener('change', () => {
    applyThemePreset(currentTheme);
    handleToggleRedraw();
  });

  window.addEventListener('resize', () => {
    ensureCanvasHiDPI();
    if (renderer) {
      const rect = threeContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height);
      }
    }
  });

  // ======= Equalizer =======
  function ensureEQNodes() {
    if (eqNodes) return eqNodes;
    const input = audioContext.createGain();
    const bands = [];
    let node = input;
    EQ_BANDS.forEach((b, i) => {
      const f = audioContext.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.freq;
      if (f.type === 'peaking') f.Q.value = 0.9;
      f.gain.value = b.gain || 0;
      node.connect(f);
      node = f;
      bands.push(f);
    });
    const preamp = audioContext.createGain();
    preamp.gain.value = 1;
    node.connect(preamp);
    eqNodes = { input, bands, preamp, output: preamp };
    return eqNodes;
  }

  function renderEQSliders() {
    eqSlidersEl.innerHTML = '';
    EQ_BANDS.forEach((b, i) => {
      const band = document.createElement('div');
      band.className = 'band';
      const label = document.createElement('div');
      label.className = 'hz';
      label.textContent = b.label;
      const gainVal = document.createElement('div');
      gainVal.className = 'gain-label';
      gainVal.id = `eq-val-${i}`;
      gainVal.textContent = `+0 dB`;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'v';
      slider.min = -12; slider.max = 12; slider.step = 0.5;
      slider.value = '0';
      slider.id = `eq-slider-${i}`;
      slider.setAttribute('aria-label', `${b.freq} Hz gain`);
      band.appendChild(gainVal);
      band.appendChild(slider);
      band.appendChild(label);
      eqSlidersEl.appendChild(band);

      slider.addEventListener('input', () => {
        const db = parseFloat(slider.value);
        gainVal.textContent = `${db >= 0 ? '+' : ''}${db} dB`;
        EQ_BANDS[i].gain = db;
        if (!audioContext) return;
        ensureEQNodes();
        eqNodes.bands[i].gain.value = db;
      });
    });
  }

  function refreshEQEnable() {
    if (!audioContext || !eqNodes) return;
    const on = eqEnableEl.checked;
    EQ_BANDS.forEach((b, i) => {
      eqNodes.bands[i].gain.value = on ? b.gain : 0;
    });
    eqNodes.preamp.gain.value = 1;
  }

  renderEQSliders();
  eqEnableEl.addEventListener('change', refreshEQEnable);

  // Initialization
  ensureCanvasHiDPI();
  barsChk.disabled = vizStyle !== 'bars';
  // Initialize bar style container display
  if (barStyleContainer) {
    barStyleContainer.style.display = vizStyle === 'bars' ? 'inline-flex' : 'none';
  }
  resetBarLevels();
  drawSpectrum(new Float32Array(NUM_BANDS));
  updatePeakDecayFromSeconds();
  updateBeatSensitivity();
  loadCustomThemes(); // Load saved custom themes
  applyThemePreset(currentTheme);
  
  // Start demo beats
  startDemoBeats();
  

})();