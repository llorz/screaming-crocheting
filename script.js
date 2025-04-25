class CrochetPatternTool {
    constructor() {
        this.gridWidth = 64;
        this.gridHeight = 64;
        this.cellSize = 10;
        
        this.palette = ['#FFFFFF', '#fb6f92']; // Default palette (white and black)
        this.activeColorIndex = 1; // Start with black selected
        this.gridData = this.createEmptyGrid();
        this.activeTool = 'brush';
        this.brushSize = 1;
        this.backgroundColor = '#ffffff';
        this.loadedImage = null;
        this.undoStack = [];
        this.redoStack = [];
        this.currentStitch = { x: 0, y: 0 };

        // Audio processing properties
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isListening = false;
        this.screamThreshold = 0.1; // Adjust this value based on testing
        this.lastScreamTime = 0;
        this.screamCooldown = 1000; // 1 second cooldown between screams

        this.stitchFileUrl = 'stitch.txt'; // Path to your stitch file

        // Initialize canvases
        this.canvas = document.getElementById('grid-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.zoomCanvas = document.getElementById('zoom-canvas');
        this.zoomCtx = this.zoomCanvas.getContext('2d');
        this.stitchCanvas = document.getElementById('stitch-canvas');
        this.stitchCtx = this.stitchCanvas.getContext('2d');

        this.stitchCanvas = document.getElementById('stitch-canvas');
        this.stitchCtx = this.stitchCanvas.getContext('2d');
        this.stitchMatrix = null;
        
        this.resizeCanvas();
        this.initEventListeners();
        this.render();
        this.updatePaletteUI();
        this.setupZoomPreview();
        this.updateCurrentStitchDisplay();
        this.loadStitchPattern();
    }
    
    createEmptyGrid() {
        return Array(this.gridHeight).fill().map(() => 
            Array(this.gridWidth).fill(0) // 0 is background
        );
    }
    
    resizeCanvas() {
        // Main canvas
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;
        
        // Zoom canvas (4x zoom)
        this.zoomCanvas.width = this.gridWidth * 4;
        this.zoomCanvas.height = this.gridHeight * 4;
        
        // Stitch canvas (fixed size for pattern display)
        this.stitchCanvas.width = 200;
        this.stitchCanvas.height = 200;
        
        this.render();
        this.updateZoomPreview();
    }
    
    // Add this method to your class
    async loadStitchPattern() {
        try {
            const response = await fetch(this.stitchFileUrl);
            if (!response.ok) throw new Error('Failed to load stitch pattern');
            const content = await response.text();
            this.parseStitchFile(content);
            this.updateStitchVisualization();
        } catch (error) {
            console.error('Error loading stitch pattern:', error);
            // Optional: Display error to user
            document.getElementById('instructions-output').textContent = 
                'Error loading stitch pattern: ' + error.message;
        }
    }
    
    parseStitchFile(text) {
        const lines = text.split('\n');
        this.stitchMatrix = [];
        
        for (const line of lines) {
            if (line.trim() === '') continue;
            const row = line.trim().split(',').map(Number);
            this.stitchMatrix.push(row);
        }
    }

    prevStitch() {
        if (this.currentStitch.x > 0) {
            this.currentStitch.x--;
        } else if (this.currentStitch.y > 0) {
            this.currentStitch.x = this.gridWidth - 1;
            this.currentStitch.y--;
        }
        this.updateCurrentStitchDisplay();
    }
    
    nextStitch() {
        if (this.currentStitch.x < this.gridWidth - 1) {
            this.currentStitch.x++;
        } else if (this.currentStitch.y < this.gridHeight - 1) {
            this.currentStitch.x = 0;
            this.currentStitch.y++;
        }
        this.updateCurrentStitchDisplay();
    }

    getColorWithBoundsCheck(i, j) {
        // Check if coordinates are out of bounds
        if (j < 0 || j >= this.gridHeight || i < 0 || i >= this.gridWidth) {
            return this.backgroundColor;
        }
        
        const colorIndex = this.gridData[j][i];
        return colorIndex === 0 ? this.backgroundColor : this.palette[colorIndex];
    }

    getNeighboringColors(i, j) {
        return {
<<<<<<< HEAD
            prev: this.getColorWithBoundsCheck(i-1, j),
            prev_nextrow: this.getColorWithBoundsCheck(i-1, j+1),
            curr: this.getColorWithBoundsCheck(i, j),
            curr_nextrow: this.getColorWithBoundsCheck(i, j+1),
            next: this.getColorWithBoundsCheck(i+1, j),
            next_nextrow: this.getColorWithBoundsCheck(i+1, j+1)
=======
            topLeft: this.getColorWithBoundsCheck(i-1, j-1),
            top: this.getColorWithBoundsCheck(i, j-1), 
            left: this.getColorWithBoundsCheck(i-1, j),
            center: this.getColorWithBoundsCheck(i, j),
            right: this.getColorWithBoundsCheck(i+1, j),
            bottomLeft: this.getColorWithBoundsCheck(i-1, j+1),
            bottom: this.getColorWithBoundsCheck(i, j+1),
            bottomRight: this.getColorWithBoundsCheck(i+1, j+1)
>>>>>>> a2d257d435f9453d386ce9079714d49c5ac19de5
        };
    }

    updateStitchVisualization() {
        if (!this.stitchMatrix) return;
        
        // Downsample the stitch matrix to match canvas dimensions
        const targetWidth = Math.min(this.stitchCanvas.width, this.stitchMatrix[0].length);
        const targetHeight = Math.min(this.stitchCanvas.height, this.stitchMatrix.length);
        const scaleX = this.stitchMatrix[0].length / targetWidth;
        const scaleY = this.stitchMatrix.length / targetHeight;
        
        const colors = this.getNeighboringColors(this.currentStitch.x, this.currentStitch.y);
        
        // Create off-screen canvas at target size
        const patternCanvas = document.createElement('canvas');
        // Make intermediate canvas larger for smoother downscaling
        patternCanvas.width = targetWidth * 4;
        patternCanvas.height = targetHeight * 4;
        const patternCtx = patternCanvas.getContext('2d');
        patternCtx.imageSmoothingEnabled = true; // Enable antialiasing
        const imageData = patternCtx.createImageData(patternCanvas.width, patternCanvas.height);
        const data = imageData.data;
        
        // Color mapping - modify these as needed
        const colorMap = {
<<<<<<< HEAD
    
            3: colors.next_nextrow,
            2: colors.curr_nextrow,
            6: colors.curr,
            4: colors.prev_nextrow,
            5: colors.prev,
=======
            1: '#000000',
            2: colors.bottom,
            3: colors.bottomRight,
            4: colors.bottomLeft,
            5: colors.left,
            6: colors.center,
>>>>>>> a2d257d435f9453d386ce9079714d49c5ac19de5
            // Default to background color
            1: '#000000'
        };
        
        // Fill image data based on downsampled pattern
        for (let y = 0; y < patternCanvas.height; y++) {
            for (let x = 0; x < patternCanvas.width; x++) {
                // Sample from original matrix using scaled coordinates
                const srcX = Math.floor(x * scaleX / 4);
                const srcY = Math.floor(y * scaleY / 4);
                const patternValue = this.stitchMatrix[srcY][srcX];
                
                const color = colorMap[patternValue] || this.backgroundColor;
                const [r, g, b] = this.hexToRgb(color);
                const idx = (y * patternCanvas.width + x) * 4;
                
                data[idx] = r;     // R
                data[idx + 1] = g; // G
                data[idx + 2] = b; // B
                data[idx + 3] = 255; // Alpha
            }
        }
        
        // Put the image data and scale it down smoothly
        patternCtx.putImageData(imageData, 0, 0);
        
        // Create a second canvas for final smooth downscaling
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        
        // Draw downscaled version with antialiasing
        finalCtx.drawImage(patternCanvas, 0, 0, targetWidth, targetHeight);
        
        // Clear and draw final result
        this.stitchCtx.clearRect(0, 0, this.stitchCanvas.width, this.stitchCanvas.height);
        this.stitchCtx.imageSmoothingEnabled = true;
        this.stitchCtx.imageSmoothingQuality = 'high';
        
        this.stitchCtx.drawImage(
            finalCanvas,
            0, 0, this.stitchCanvas.width, this.stitchCanvas.height
        );
    }

    // updateStitchVisualization() {
    //     if (!this.stitchMatrix || !this.stitchMatrix.length) return;
        
    //     const patternWidth = this.stitchMatrix[0].length;
    //     const patternHeight = this.stitchMatrix.length;
    //     const scale = Math.min(
    //         Math.floor(this.stitchCanvas.width / patternWidth),
    //         Math.floor(this.stitchCanvas.height / patternHeight)
    //     );
        
    //     // Create off-screen canvas for the pattern
    //     const patternCanvas = document.createElement('canvas');
    //     patternCanvas.width = patternWidth;
    //     patternCanvas.height = patternHeight;
    //     const patternCtx = patternCanvas.getContext('2d');
    //     const imageData = patternCtx.createImageData(patternWidth, patternHeight);
    //     const data = imageData.data;
        
    //     // Get current and next colors
    //     const colorIndex = this.gridData[this.currentStitch.y][this.currentStitch.x];
    //     const currentColor = colorIndex === 0 ? this.backgroundColor : this.palette[colorIndex];
        
    //     let nextRowColor = this.backgroundColor;
    //     if (this.currentStitch.y < this.gridHeight - 1 && this.currentStitch.x < this.gridWidth - 1) {
    //         const nextColorIndex = this.gridData[this.currentStitch.y + 1][this.currentStitch.x + 1];
    //         nextRowColor = nextColorIndex === 0 ? this.backgroundColor : this.palette[nextColorIndex];
    //     }
        
    //     // Convert colors to RGB
    //     const currentRGB = this.hexToRgb(currentColor);
    //     const nextRGB = this.hexToRgb(nextRowColor);
    //     const bgRGB = this.hexToRgb('#f0f0f0');
        
    //     // Fill image data based on pattern
    //     for (let y = 0; y < patternHeight; y++) {
    //         for (let x = 0; x < patternWidth; x++) {
    //             const idx = (y * patternWidth + x) * 4;
    //             let r, g, b;
                
    //             switch (this.stitchMatrix[y][x]) {
    //                 case 1: // Current stitch
    //                     [r, g, b] = this.hexToRgb('#000000');
    //                     break;
    //                 case 2: // Next row stitch
    //                     [r, g, b] = this.hexToRgb('#90a955');
    //                     break;
    //                 case 3: // Current color
    //                     [r, g, b] = this.hexToRgb('00b4d8');
    //                     break;
    //                 case 4: // Next row color
    //                     [r, g, b] = this.hexToRgb('#48cae4');
    //                     break;
    //                 case 5: // Next row color
    //                     [r, g, b] = this.hexToRgb('#7209b7');
    //                     break;    
    //                 case 6: // Next row color
    //                     [r, g, b] = this.hexToRgb('#e63946');
    //                     break;    
    //                 default: // Background
    //                     [r, g, b] = bgRGB;
    //             }
                
    //             data[idx] = r;     // R
    //             data[idx + 1] = g; // G
    //             data[idx + 2] = b; // B
    //             data[idx + 3] = 255; // Alpha
    //         }
    //     }
        
    //     // Put the image data to off-screen canvas
    //     patternCtx.putImageData(imageData, 0, 0);
        
    //     // Clear and scale the main stitch canvas
    //     this.stitchCtx.clearRect(0, 0, this.stitchCanvas.width, this.stitchCanvas.height);
    //     this.stitchCtx.imageSmoothingEnabled = false;
    //     this.stitchCtx.drawImage(
    //         patternCanvas,
    //         0, 0, this.stitchCanvas.width, this.stitchCanvas.height
    //     );
        
    //     // Draw grid lines
    //     // this.stitchCtx.strokeStyle = '#ddd';
    //     // this.stitchCtx.lineWidth = 1;
    //     // for (let x = 0; x <= patternWidth; x++) {
    //     //     this.stitchCtx.beginPath();
    //     //     this.stitchCtx.moveTo(x * scale, 0);
    //     //     this.stitchCtx.lineTo(x * scale, patternHeight * scale);
    //     //     this.stitchCtx.stroke();
    //     // }
    //     // for (let y = 0; y <= patternHeight; y++) {
    //     //     this.stitchCtx.beginPath();
    //     //     this.stitchCtx.moveTo(0, y * scale);
    //     //     this.stitchCtx.lineTo(patternWidth * scale, y * scale);
    //     //     this.stitchCtx.stroke();
    //     // }
    // }
    
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse r, g, b values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return [r, g, b];
    }

    renderStitchPattern() {
        console.info('shasile')
    
        if (!this.stitchMatrix || !this.stitchMatrix.length) return;
    
        const cellSize = Math.min(
            this.stitchCanvas.width / this.stitchMatrix[0].length,
            this.stitchCanvas.height / this.stitchMatrix.length
        );
        
        // Find max value for normalization
        const maxVal = 6;
        const minVal = 0;
        
        this.stitchCtx.clearRect(0, 0, this.stitchCanvas.width, this.stitchCanvas.height);
    
        for (let y = 0; y < this.stitchMatrix.length; y++) {
            for (let x = 0; x < this.stitchMatrix[y].length; x++) {
                const value = this.stitchMatrix[y][x];
                const normalized = (value - minVal) / (maxVal - minVal || 1);
                
                // Create heatmap color (blue to red gradient)
                const r = Math.floor(255 * normalized);
                const b = Math.floor(255 * (1 - normalized));
                const color = `rgb(${r}, 50, ${b})`;
                
                this.stitchCtx.fillStyle = color;
                this.stitchCtx.fillRect(
                    x * cellSize,
                    y * cellSize,
                    cellSize,
                    cellSize
                );
    
    
                // Add value text if space permits
                if (cellSize > 15) {
                    this.stitchCtx.fillStyle = normalized > 0.5 ? 'white' : 'black';
                    this.stitchCtx.font = `${Math.min(cellSize/2, 12)}px Arial`;
                    this.stitchCtx.textAlign = 'center';
                    this.stitchCtx.fillText(
                        value,
                        x * cellSize + cellSize/2,
                        y * cellSize + cellSize/2 + cellSize/6
                    );
                }
            }
        }
    }
    
    setupZoomPreview() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseInCanvas(e)) return;
            
            const {x, y} = this.getGridCoordinates(e);
            this.updateZoomPreview(x, y);
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.updateZoomPreview();
        });
    }
    
    updateZoomPreview(x = null, y = null) {
        // Clear zoom canvas
        this.zoomCtx.clearRect(0, 0, this.zoomCanvas.width, this.zoomCanvas.height);
        
        // Draw the entire grid at 4x zoom
        const zoomCellSize = 4;
        
        for (let gy = 0; gy < this.gridHeight; gy++) {
            for (let gx = 0; gx < this.gridWidth; gx++) {
                const colorIndex = this.gridData[gy][gx];
                const color = colorIndex === 0 ? this.backgroundColor : this.palette[colorIndex];
                
                this.zoomCtx.fillStyle = color;
                this.zoomCtx.fillRect(
                    gx * zoomCellSize,
                    gy * zoomCellSize,
                    zoomCellSize,
                    zoomCellSize
                );
                
                // // Draw grid lines
                // this.zoomCtx.strokeStyle = '#ddd';
                // this.zoomCtx.strokeRect(
                //     gx * zoomCellSize,
                //     gy * zoomCellSize,
                //     zoomCellSize,
                //     zoomCellSize
                // );
                
                // Highlight current stitch
                if (gx === this.currentStitch.x && gy === this.currentStitch.y) {
                    this.zoomCtx.strokeStyle = '#fb6f92';
                    this.zoomCtx.lineWidth = 2;
                    this.zoomCtx.strokeRect(
                        gx * zoomCellSize,
                        gy * zoomCellSize,
                        zoomCellSize,
                        zoomCellSize
                    );
                }
            }
        }
    }


    
    initEventListeners() {
        // Save current state before actions that modify the grid
        const saveState = () => {
            this.undoStack.push({
                gridData: JSON.parse(JSON.stringify(this.gridData)),
                palette: [...this.palette],
                backgroundColor: this.backgroundColor
            });
            this.redoStack = []; // Clear redo stack when new action is performed
        };
        
        // Background color
        document.getElementById('apply-bg-color').addEventListener('click', () => {
            saveState();
            this.backgroundColor = document.getElementById('bg-color-picker').value;
            this.render();
            this.updateZoomPreview();
        });
        
        // Palette management
        document.getElementById('add-color').addEventListener('click', () => {
            saveState();
            this.addColorToPalette();
        });
        
        document.getElementById('update-color').addEventListener('click', () => {
            saveState();
            this.updateSelectedColor();
        });
        
        // Tools
        document.getElementById('brush-tool').addEventListener('click', () => {
            this.setActiveTool('brush');
            this.activeColorIndex = Math.max(1, this.activeColorIndex); // Don't use background color
        });
        
        document.getElementById('eraser-tool').addEventListener('click', () => {
            this.setActiveTool('eraser');
            this.activeColorIndex = 0; // Background color
        });
        
        document.getElementById('update-colors').addEventListener('click', async () => {
            if (!this.loadedImage) {
                alert('Please load an image first');
                return;
            }
            const colorCount = parseInt(document.getElementById('color-count').value) || 5;
            await this.extractAndUpdateColors(colorCount);
        });

        // Brush size
        const brushSizeInput = document.getElementById('brush-size');
        brushSizeInput.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brush-size-value').textContent = this.brushSize;
        });
        
        // Grid management
        document.getElementById('resize-grid').addEventListener('click', () => {
            saveState();
            this.resizeGrid();
            if (this.loadedImage) {
                this.processImage(this.loadedImage); // Re-process image with new grid size
            }
        });
        
        document.getElementById('reset-all').addEventListener('click', () => {
            saveState();
            this.resetAll();
        });
        
        // Image upload
        document.getElementById('image-upload').addEventListener('change', (e) => {
            saveState();
            this.handleImageUpload(e);
        });

        // Undo/Redo
        document.getElementById('undo-btn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redo-btn').addEventListener('click', this.redo.bind(this));
        
        document.getElementById('generate-instructions').addEventListener('click', this.updateCurrentStitchDisplay.bind(this));
        document.getElementById('next-stitch').addEventListener('click', this.nextStitch.bind(this));
        document.getElementById('prev-stitch').addEventListener('click', this.prevStitch.bind(this));
        // Canvas interaction
        this.canvas.addEventListener('click', (e) => {
            if (this.isMouseInCanvas(e)) {
                saveState();
                this.handleCanvasClick(e);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1 && this.isMouseInCanvas(e)) { // Left mouse button pressed
                this.handleCanvasClick(e);
            }
        });

        // Add voice activation button
        const voiceActivationBtn = document.createElement('button');
        voiceActivationBtn.id = 'voice-activation-btn';
        voiceActivationBtn.textContent = 'Enable Screaming Activation';
        voiceActivationBtn.addEventListener('click', () => {
            this.initVoiceActivation();
            voiceActivationBtn.textContent = 'Scream to activate!';
            voiceActivationBtn.disabled = true;
        });

        // Add button to the controls
        const controls = document.querySelector('.control-panel');
        if (controls) {
            controls.appendChild(voiceActivationBtn);
        }
    }
    
    isMouseInCanvas(e) {
        const rect = this.canvas.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right &&
               e.clientY >= rect.top && e.clientY <= rect.bottom;
    }
    
    setActiveTool(tool) {
        this.activeTool = tool;
        // Update UI to show active tool
        document.querySelectorAll('.control-group button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${tool}-tool`).classList.add('active');
    }
    
    addColorToPalette() {
        const newColor = document.getElementById('color-picker').value;
        
        if (!this.palette.includes(newColor)) {
            this.palette.push(newColor);
            this.activeColorIndex = this.palette.length - 1;
            this.updatePaletteUI();
            
            // Re-process image with new palette if one is loaded
            if (this.loadedImage) {
                this.processImage(this.loadedImage);
            }
        }
    }
    
    updateSelectedColor() {
        const newColor = document.getElementById('color-picker').value;
        this.palette[this.activeColorIndex] = newColor;
        this.updatePaletteUI();
        
        // Update all cells with this color index
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.gridData[y][x] === this.activeColorIndex) {
                    this.gridData[y][x] = this.activeColorIndex; // Triggers render update
                }
            }
        }
        
        // Re-process image with updated palette if one is loaded
        if (this.loadedImage) {
            this.processImage(this.loadedImage);
        }
        
        this.render();
        this.updateZoomPreview();
    }
    
    updatePaletteUI() {
        const paletteContainer = document.getElementById('palette-colors');
        paletteContainer.innerHTML = '';
        
        this.palette.forEach((color, index) => {
            if (index === 0) return; // Skip background color in palette display
            
            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${index === this.activeColorIndex ? 'active' : ''}`;
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.addEventListener('click', () => {
                this.activeColorIndex = index;
                document.getElementById('color-picker').value = color;
                this.updatePaletteUI();
            });
            paletteContainer.appendChild(swatch);
        });
    }

    async getDominantColors(image, count) {
        // Create temporary canvas
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = Math.min(image.width, 100);
        tempCanvas.height = Math.min(image.height, 100);
        
        // Draw scaled-down version for faster processing
        tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Get pixel data
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const pixels = imageData.data;
        
        // Convert to array of [r,g,b] values
        const pixelArray = [];
        for (let i = 0; i < pixels.length; i += 4) {
            // Skip transparent/very dark pixels
            if (pixels[i+3] > 128 && 
                !(pixels[i] < 10 && pixels[i+1] < 10 && pixels[i+2] < 10)) {
                pixelArray.push([pixels[i], pixels[i+1], pixels[i+2]]);
            }
        }
        
        // Get most distinct colors in RGB space
        const colors = this.getMostDistinctColors(pixelArray, count);
        
        // Convert to hex and return
        return colors.map(color => this.rgbToHex(color[0], color[1], color[2]));
    }
    
    kMeansClustering(points, k, maxIterations = 10) {
        // Initialize centroids randomly
        let centroids = [];
        for (let i = 0; i < k; i++) {
            centroids.push(points[Math.floor(Math.random() * points.length)]);
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Assign each point to nearest centroid
            const clusters = Array(k).fill().map(() => []);
            
            points.forEach(point => {
                let minDist = Infinity;
                let clusterIndex = 0;
                
                centroids.forEach((centroid, i) => {
                    const dist = this.colorDistance(point, centroid);
                    if (dist < minDist) {
                        minDist = dist;
                        clusterIndex = i;
                    }
                });
                
                clusters[clusterIndex].push(point);
            });
            
            // Update centroids
            let changed = false;
            centroids = clusters.map(cluster => {
                if (cluster.length === 0) {
                    return points[Math.floor(Math.random() * points.length)];
                }
                
                const newCentroid = [0, 0, 0];
                cluster.forEach(point => {
                    newCentroid[0] += point[0];
                    newCentroid[1] += point[1];
                    newCentroid[2] += point[2];
                });
                
                newCentroid[0] = Math.round(newCentroid[0] / cluster.length);
                newCentroid[1] = Math.round(newCentroid[1] / cluster.length);
                newCentroid[2] = Math.round(newCentroid[2] / cluster.length);
                
                return newCentroid;
            });
        }
        
        return centroids;
    }
    
    colorDistance(c1, c2) {
        return Math.sqrt(
            Math.pow(c1[0] - c2[0], 2) +
            Math.pow(c1[1] - c2[1], 2) +
            Math.pow(c1[2] - c2[2], 2)
        );
    }
    
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    getGridCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);
        return {x, y};
    }
    
    handleCanvasClick(e) {
        const {x, y} = this.getGridCoordinates(e);
        
        switch(this.activeTool) {
            case 'brush':
            case 'eraser':
                this.paintCells(x, y, this.activeColorIndex);
                break;
            case 'eyedropper':
                this.pickColor(x, y);
                break;
        }
        
        this.render();
        this.updateZoomPreview();
    }
    
    paintCells(x, y, colorIndex) {
        const halfSize = Math.floor(this.brushSize / 2);
        
        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                    this.gridData[ny][nx] = colorIndex;
                }
            }
        }
    }
    
    pickColor(x, y) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            const colorIndex = this.gridData[y][x];
            if (colorIndex >= 0 && colorIndex < this.palette.length) {
                this.activeColorIndex = colorIndex;
                document.getElementById('color-picker').value = this.palette[colorIndex];
                this.updatePaletteUI();
            }
        }
    }

    // Helper to get the most distinct colors
    getMostDistinctColors(points, k) {
        // Start with the color farthest from black (most vibrant)
        let centroids = [points.reduce((max, p) => 
            this.colorDistance([0,0,0], p) > this.colorDistance([0,0,0], max) ? p : max
        )];
        
        // Find remaining colors by maximizing minimum distance to existing centroids
        while (centroids.length < k) {
            let maxMinDist = -1;
            let nextCentroid = null;
            
            // For each point, find its minimum distance to existing centroids
            points.forEach(point => {
                let minDist = Infinity;
                centroids.forEach(centroid => {
                    const dist = this.colorDistance(point, centroid);
                    if (dist < minDist) minDist = dist;
                });
                
                // Track the point with the maximum minimum distance
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    nextCentroid = point;
                }
            });
            
            if (nextCentroid) {
                centroids.push(nextCentroid);
            } else {
                // Fallback if no distinct color found
                centroids.push(points[Math.floor(Math.random() * points.length)]);
            }
        }
        
        return centroids;
    }

    // Improved color distance calculation (perceptual)
    colorDistance(c1, c2) {
        // Convert to Lab color space for better perceptual distance
        const lab1 = this.rgbToLab(c1);
        const lab2 = this.rgbToLab(c2);
        
        // Delta E 2000 formula (simplified)
        return Math.sqrt(
            Math.pow(lab1[0] - lab2[0], 2) +
            Math.pow(lab1[1] - lab2[1], 2) +
            Math.pow(lab1[2] - lab2[2], 2)
        );
    }

    // RGB to Lab color space conversion
    rgbToLab(rgb) {
        let r = rgb[0] / 255;
        let g = rgb[1] / 255;
        let b = rgb[2] / 255;

        // Convert to XYZ
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        r *= 100;
        g *= 100;
        b *= 100;

        const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
        const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

        // Convert to Lab
        let x2 = x / 95.047;
        let y2 = y / 100.0;
        let z2 = z / 108.883;

        x2 = x2 > 0.008856 ? Math.pow(x2, 1/3) : 7.787 * x2 + 16/116;
        y2 = y2 > 0.008856 ? Math.pow(y2, 1/3) : 7.787 * y2 + 16/116;
        z2 = z2 > 0.008856 ? Math.pow(z2, 1/3) : 7.787 * z2 + 16/116;

        return [
            (116 * y2) - 16,
            500 * (x2 - y2),
            200 * (y2 - z2)
        ];
    }

    async extractAndUpdateColors(colorCount) {
        // Get dominant colors
        const dominantColors = await this.getDominantColors(this.loadedImage, colorCount);
        
        // Update palette (keep background white)
        this.palette = ['#FFFFFF', ...dominantColors];
        this.activeColorIndex = 1; // Select first dominant color
        
        // Update UI
        document.getElementById('color-picker').value = this.palette[1];
        this.updatePaletteUI();
        
        // Re-process image with new palette
        this.processImage(this.loadedImage);
        
        // Save state for undo
        this.undoStack.push({
            gridData: JSON.parse(JSON.stringify(this.gridData)),
            palette: [...this.palette],
            backgroundColor: this.backgroundColor
        });
        this.redoStack = [];
    }
    
    
    async handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const colorCount = parseInt(document.getElementById('color-count').value) || 5;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
            this.loadedImage = img;
            await this.extractAndUpdateColors(colorCount);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}
    
    
    processImage(img) {
        // Create temporary canvas to process image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.gridWidth;
        tempCanvas.height = this.gridHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw image to temp canvas (scaled to grid size)
        tempCtx.drawImage(img, 0, 0, this.gridWidth, this.gridHeight);
        
        // Get pixel data and quantize to palette
        const imageData = tempCtx.getImageData(0, 0, this.gridWidth, this.gridHeight);
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const i = (y * this.gridWidth + x) * 4;
                const r = imageData.data[i];
                const g = imageData.data[i+1];
                const b = imageData.data[i+2];
                
                // Find closest color in palette (skip background color at index 0)
                this.gridData[y][x] = this.findClosestColorIndex(r, g, b, 1);
            }
        }
        
        this.render();
        this.updateZoomPreview();
    }
    
    findClosestColorIndex(r, g, b, startIndex = 0) {
        let minDistance = Infinity;
        let bestIndex = startIndex;
        
        for (let i = startIndex; i < this.palette.length; i++) {
            const color = this.palette[i];
            const hex = color.substring(1);
            const cr = parseInt(hex.substring(0, 2), 16);
            const cg = parseInt(hex.substring(2, 4), 16);
            const cb = parseInt(hex.substring(4, 6), 16);
            
            const distance = Math.sqrt(
                Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestIndex = i;
            }
        }
        
        return bestIndex;
    }
    
    render() {
        // Clear canvas with background color
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid cells
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const colorIndex = this.gridData[y][x];
                if (colorIndex > 0 && colorIndex < this.palette.length) { // 0 is background
                    this.ctx.fillStyle = this.palette[colorIndex];
                    this.ctx.fillRect(
                        x * this.cellSize, 
                        y * this.cellSize, 
                        this.cellSize, 
                        this.cellSize
                    );
                }
                
                // Draw grid lines
                this.ctx.strokeStyle = '#ddd';
                this.ctx.strokeRect(
                    x * this.cellSize, 
                    y * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
            }
        }
    }
    
    resizeGrid() {
        const newWidth = parseInt(document.getElementById('grid-width').value);
        const newHeight = parseInt(document.getElementById('grid-height').value);
        
        if (newWidth < 8 || newWidth > 128 || newHeight < 8 || newHeight > 128) {
            alert('Grid size must be between 8 and 128');
            return;
        }
        
        // Create new grid
        const newGrid = Array(newHeight).fill().map(() => Array(newWidth).fill(0));
        
        // Copy existing data
        const copyWidth = Math.min(this.gridWidth, newWidth);
        const copyHeight = Math.min(this.gridHeight, newHeight);
        
        for (let y = 0; y < copyHeight; y++) {
            for (let x = 0; x < copyWidth; x++) {
                newGrid[y][x] = this.gridData[y][x];
            }
        }
        
        this.gridWidth = newWidth;
        this.gridHeight = newHeight;
        this.gridData = newGrid;
        this.resizeCanvas();
    }
    
    resetAll() {
        this.gridData = this.createEmptyGrid();
        this.palette = ['#FFFFFF', '#000000'];
        this.activeColorIndex = 1;
        this.backgroundColor = '#ffffff';
        this.loadedImage = null;
        document.getElementById('bg-color-picker').value = this.backgroundColor;
        document.getElementById('color-picker').value = '#000000';
        this.render();
        this.updatePaletteUI();
        this.updateZoomPreview();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        
        const state = this.undoStack.pop();
        this.redoStack.push({
            gridData: JSON.parse(JSON.stringify(this.gridData)),
            palette: [...this.palette],
            backgroundColor: this.backgroundColor
        });
        
        this.gridData = state.gridData;
        this.palette = state.palette;
        this.backgroundColor = state.backgroundColor;
        
        // Update UI
        document.getElementById('bg-color-picker').value = this.backgroundColor;
        this.render();
        this.updatePaletteUI();
        this.updateZoomPreview();
    }
    
    redo() {
        if (this.redoStack.length === 0) return;
        
        const state = this.redoStack.pop();
        this.undoStack.push({
            gridData: JSON.parse(JSON.stringify(this.gridData)),
            palette: [...this.palette],
            backgroundColor: this.backgroundColor
        });
        
        this.gridData = state.gridData;
        this.palette = state.palette;
        this.backgroundColor = state.backgroundColor;
        
        // Update UI
        document.getElementById('bg-color-picker').value = this.backgroundColor;
        this.render();
        this.updatePaletteUI();
        this.updateZoomPreview();
    }
    
    updateCurrentStitchDisplay() {
        // Update position display
        document.getElementById('current-stitch').textContent = 
            `(${this.currentStitch.x}, ${this.currentStitch.y})`;
        
        // Get current color
        const colorIndex = this.gridData[this.currentStitch.y][this.currentStitch.x];
        const currentColor = colorIndex === 0 ? this.backgroundColor : this.palette[colorIndex];
        document.getElementById('current-color').textContent = currentColor;
        document.getElementById('current-color').style.color = currentColor;
        
        // Get next row color (if exists)
        let nextRowColor = "N/A";
        if (this.currentStitch.y < this.gridHeight - 1 && this.currentStitch.x < this.gridWidth - 1) {
            const nextColorIndex = this.gridData[this.currentStitch.y + 1][this.currentStitch.x + 1];
            nextRowColor = nextColorIndex === 0 ? this.backgroundColor : this.palette[nextColorIndex];
        }
        document.getElementById('next-row-color').textContent = nextRowColor;
        document.getElementById('next-row-color').style.color = nextRowColor;
        
        // Update stitch visualization
        this.updateStitchVisualization();
        
        // Update canvas highlights
        this.render();
        this.updateZoomPreview();
    }
    
    async initVoiceActivation() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            // Start processing audio
            this.isListening = true;
            this.processAudio();
            
            console.log('Voice activation initialized');
        } catch (error) {
            console.error('Error initializing voice activation:', error);
        }
    }

    processAudio() {
        if (!this.isListening) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;
        const normalizedVolume = averageVolume / 255;

        // Check for scream
        if (normalizedVolume > this.screamThreshold) {
            const now = Date.now();
            if (now - this.lastScreamTime > this.screamCooldown) {
                this.lastScreamTime = now;
                this.handleScream();
            }
        }

        // Continue processing
        requestAnimationFrame(() => this.processAudio());
    }

    handleScream() {
        console.log('Scream detected!');
        // Trigger the next button click
        const nextButton = document.getElementById('next-stitch');
        if (nextButton) {
            nextButton.click();
        }
    }
}

// Initialize the tool when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cpt = new CrochetPatternTool();
});