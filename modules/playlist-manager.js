// Enhanced Playlist Management Module
class PlaylistManager {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.tracks = [];
    this.currentIndex = -1;
    this.isShuffled = false;
    this.isRepeating = false; // 'none', 'one', 'all'
    this.shuffleOrder = [];
    this.playlistElement = null;
    this.callbacks = {
      onTrackChange: null,
      onPlaylistUpdate: null
    };
  }

  setPlaylistElement(element) {
    this.playlistElement = element;
  }

  setCallbacks(callbacks) {
    Object.assign(this.callbacks, callbacks);
  }

  addTrack(track) {
    const trackData = {
      id: Date.now() + Math.random(),
      name: track.name || track.url || 'Unknown Track',
      url: track.url || null,
      file: track.file || null,
      duration: 0,
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      addedAt: new Date()
    };

    this.tracks.push(trackData);
    this.updateShuffleOrder();
    this.renderPlaylist();
    
    if (this.callbacks.onPlaylistUpdate) {
      this.callbacks.onPlaylistUpdate(this.tracks);
    }

    return trackData.id;
  }

  removeTrack(trackId) {
    const index = this.tracks.findIndex(track => track.id === trackId);
    if (index === -1) return false;

    this.tracks.splice(index, 1);
    
    // Adjust current index if necessary
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      this.currentIndex = -1;
    }

    this.updateShuffleOrder();
    this.renderPlaylist();
    
    if (this.callbacks.onPlaylistUpdate) {
      this.callbacks.onPlaylistUpdate(this.tracks);
    }

    return true;
  }

  clearPlaylist() {
    this.tracks = [];
    this.currentIndex = -1;
    this.shuffleOrder = [];
    this.renderPlaylist();
    
    if (this.callbacks.onPlaylistUpdate) {
      this.callbacks.onPlaylistUpdate(this.tracks);
    }
  }

  async playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return false;

    const track = this.tracks[index];
    this.currentIndex = index;

    try {
      if (track.file) {
        await this.audioManager.loadFile(track.file);
      } else if (track.url) {
        await this.audioManager.loadFromURL(track.url);
      } else {
        throw new Error('No valid audio source');
      }

      await this.audioManager.play();
      this.renderPlaylist();
      
      if (this.callbacks.onTrackChange) {
        this.callbacks.onTrackChange(track, index);
      }

      return true;
    } catch (error) {
      console.error('Failed to play track:', error);
      this.showTrackError(index, error.message);
      return false;
    }
  }

  async playNext() {
    const nextIndex = this.getNextTrackIndex();
    if (nextIndex !== -1) {
      return await this.playTrack(nextIndex);
    }
    return false;
  }

  async playPrevious() {
    const prevIndex = this.getPreviousTrackIndex();
    if (prevIndex !== -1) {
      return await this.playTrack(prevIndex);
    }
    return false;
  }

  getNextTrackIndex() {
    if (this.tracks.length === 0) return -1;

    if (this.isRepeating === 'one') {
      return this.currentIndex;
    }

    let nextIndex;
    if (this.isShuffled) {
      const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentIndex);
      nextIndex = this.shuffleOrder[(currentShuffleIndex + 1) % this.shuffleOrder.length];
    } else {
      nextIndex = (this.currentIndex + 1) % this.tracks.length;
    }

    if (nextIndex === 0 && this.isRepeating !== 'all') {
      return -1; // End of playlist
    }

    return nextIndex;
  }

  getPreviousTrackIndex() {
    if (this.tracks.length === 0) return -1;

    if (this.isRepeating === 'one') {
      return this.currentIndex;
    }

    let prevIndex;
    if (this.isShuffled) {
      const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentIndex);
      prevIndex = this.shuffleOrder[(currentShuffleIndex - 1 + this.shuffleOrder.length) % this.shuffleOrder.length];
    } else {
      prevIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    }

    return prevIndex;
  }

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.updateShuffleOrder();
    return this.isShuffled;
  }

  setRepeatMode(mode) {
    const validModes = ['none', 'one', 'all'];
    if (validModes.includes(mode)) {
      this.isRepeating = mode;
    }
    return this.isRepeating;
  }

  updateShuffleOrder() {
    this.shuffleOrder = [...Array(this.tracks.length).keys()];
    if (this.isShuffled) {
      // Fisher-Yates shuffle
      for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
      }
    }
  }

  renderPlaylist() {
    if (!this.playlistElement) return;

    this.playlistElement.innerHTML = '';

    if (this.tracks.length === 0) {
      this.playlistElement.innerHTML = '<div class="playlist-empty">No tracks in playlist<br><small>Drag & drop audio files here or use the Load Audio button</small></div>';
      return;
    }

    this.tracks.forEach((track, index) => {
      const trackElement = document.createElement('div');
      trackElement.className = `playlist-item ${index === this.currentIndex ? 'active' : ''}`;
      trackElement.dataset.index = index;
      trackElement.draggable = true;

      const duration = this.formatDuration(track.duration || 0);
      const trackNumber = (index + 1).toString().padStart(2, '0');

      trackElement.innerHTML = `
        <div class="track-number">${trackNumber}</div>
        <div class="track-info">
          <div class="track-name" title="${this.escapeHtml(track.name)}">${this.escapeHtml(track.name)}</div>
          <div class="track-details" title="${this.escapeHtml(track.artist)} - ${this.escapeHtml(track.album)}">${this.escapeHtml(track.artist)} - ${this.escapeHtml(track.album)}</div>
        </div>
        <div class="track-duration">${duration}</div>
        <div class="track-controls">
          <button class="track-play-btn" title="Play">▶</button>
          <button class="track-remove-btn" title="Remove">×</button>
        </div>
      `;

      // Add event listeners
      trackElement.querySelector('.track-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.playTrack(index);
      });

      trackElement.querySelector('.track-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTrack(track.id);
      });

      trackElement.addEventListener('dblclick', () => {
        this.playTrack(index);
      });

      // Drag and drop for reordering
      trackElement.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', index);
        trackElement.classList.add('dragging');
      });

      trackElement.addEventListener('dragend', () => {
        trackElement.classList.remove('dragging');
      });

      trackElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        trackElement.classList.add('drag-over');
      });

      trackElement.addEventListener('dragleave', () => {
        trackElement.classList.remove('drag-over');
      });

      trackElement.addEventListener('drop', (e) => {
        e.preventDefault();
        trackElement.classList.remove('drag-over');
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (draggedIndex !== index) {
          this.moveTrack(draggedIndex, index);
        }
      });

      this.playlistElement.appendChild(trackElement);
    });

    this.updatePlaylistInfo();
  }

  showTrackError(index, message) {
    const trackElements = this.playlistElement.querySelectorAll('.playlist-item');
    if (trackElements[index]) {
      trackElements[index].classList.add('error');
      trackElements[index].title = `Error: ${message}`;
      setTimeout(() => {
        trackElements[index].classList.remove('error');
        trackElements[index].title = '';
      }, 3000);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getCurrentTrack() {
    return this.currentIndex >= 0 ? this.tracks[this.currentIndex] : null;
  }

  getTracks() {
    return [...this.tracks];
  }

  getPlaylistInfo() {
    return {
      totalTracks: this.tracks.length,
      currentIndex: this.currentIndex,
      isShuffled: this.isShuffled,
      repeatMode: this.isRepeating,
      currentTrack: this.getCurrentTrack(),
      totalDuration: this.getTotalDuration()
    };
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getTotalDuration() {
    return this.tracks.reduce((total, track) => total + (track.duration || 0), 0);
  }

  updatePlaylistInfo() {
    const countElement = document.getElementById('playlist-count');
    const durationElement = document.getElementById('playlist-duration');
    
    if (countElement) {
      countElement.textContent = `${this.tracks.length} track${this.tracks.length !== 1 ? 's' : ''}`;
    }
    
    if (durationElement) {
      const totalDuration = this.getTotalDuration();
      const hours = Math.floor(totalDuration / 3600);
      const mins = Math.floor((totalDuration % 3600) / 60);
      const secs = Math.floor(totalDuration % 60);
      
      if (hours > 0) {
        durationElement.textContent = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        durationElement.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }
  }

  moveTrack(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
        fromIndex >= this.tracks.length || toIndex >= this.tracks.length) {
      return false;
    }

    const track = this.tracks.splice(fromIndex, 1)[0];
    this.tracks.splice(toIndex, 0, track);

    // Update current index if necessary
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }

    this.updateShuffleOrder();
    this.renderPlaylist();
    
    if (this.callbacks.onPlaylistUpdate) {
      this.callbacks.onPlaylistUpdate(this.tracks);
    }

    return true;
  }

  searchTracks(query) {
    if (!query || query.trim() === '') {
      this.renderPlaylist();
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filteredTracks = this.tracks.filter((track, index) => {
      return track.name.toLowerCase().includes(searchTerm) ||
             track.artist.toLowerCase().includes(searchTerm) ||
             track.album.toLowerCase().includes(searchTerm);
    });

    this.renderFilteredPlaylist(filteredTracks);
  }

  renderFilteredPlaylist(filteredTracks) {
    if (!this.playlistElement) return;

    this.playlistElement.innerHTML = '';

    if (filteredTracks.length === 0) {
      this.playlistElement.innerHTML = '<div class="playlist-empty">No tracks match your search</div>';
      return;
    }

    filteredTracks.forEach((track) => {
      const originalIndex = this.tracks.indexOf(track);
      const trackElement = document.createElement('div');
      trackElement.className = `playlist-item ${originalIndex === this.currentIndex ? 'active' : ''}`;
      trackElement.dataset.index = originalIndex;

      const duration = this.formatDuration(track.duration || 0);
      const trackNumber = (originalIndex + 1).toString().padStart(2, '0');

      trackElement.innerHTML = `
        <div class="track-number">${trackNumber}</div>
        <div class="track-info">
          <div class="track-name" title="${this.escapeHtml(track.name)}">${this.escapeHtml(track.name)}</div>
          <div class="track-details" title="${this.escapeHtml(track.artist)} - ${this.escapeHtml(track.album)}">${this.escapeHtml(track.artist)} - ${this.escapeHtml(track.album)}</div>
        </div>
        <div class="track-duration">${duration}</div>
        <div class="track-controls">
          <button class="track-play-btn" title="Play">▶</button>
          <button class="track-remove-btn" title="Remove">×</button>
        </div>
      `;

      // Add event listeners
      trackElement.querySelector('.track-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.playTrack(originalIndex);
      });

      trackElement.querySelector('.track-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTrack(track.id);
      });

      trackElement.addEventListener('dblclick', () => {
        this.playTrack(originalIndex);
      });

      this.playlistElement.appendChild(trackElement);
    });
  }

  // Save/Load playlist to/from localStorage
  savePlaylist(name = 'default') {
    const playlistData = {
      name,
      tracks: this.tracks.map(track => ({
        ...track,
        file: null // Don't save file objects
      })),
      settings: {
        isShuffled: this.isShuffled,
        repeatMode: this.isRepeating
      },
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(`playlist_${name}`, JSON.stringify(playlistData));
      return true;
    } catch (error) {
      console.error('Failed to save playlist:', error);
      return false;
    }
  }

  loadPlaylist(name = 'default') {
    try {
      const saved = localStorage.getItem(`playlist_${name}`);
      if (!saved) return false;

      const playlistData = JSON.parse(saved);
      this.tracks = playlistData.tracks || [];
      this.isShuffled = playlistData.settings?.isShuffled || false;
      this.isRepeating = playlistData.settings?.repeatMode || 'none';
      this.currentIndex = -1;

      this.updateShuffleOrder();
      this.renderPlaylist();

      if (this.callbacks.onPlaylistUpdate) {
        this.callbacks.onPlaylistUpdate(this.tracks);
      }

      return true;
    } catch (error) {
      console.error('Failed to load playlist:', error);
      return false;
    }
  }
}

// Make PlaylistManager available globally
window.PlaylistManager = PlaylistManager;