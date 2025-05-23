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
        this.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
        };
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

        this.maxRowIndex = this.gridHeight - 1;
        this.maxColIndex = this.gridWidth - 1;

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
        // Get the wrapper dimensions
        const wrapper = this.canvas.parentElement;
        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;
        
        // Calculate the maximum possible cell size that fits in the wrapper
        const maxCellSize = Math.min(
            Math.floor(wrapperWidth / (this.gridWidth + 1)),
            Math.floor(wrapperHeight / (this.gridHeight + 1))
        );
        
        // Update cell size to fit the wrapper
        this.cellSize = maxCellSize;
        
        // Get device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate canvas dimensions
        const logicalWidth = (this.gridWidth + 1) * this.cellSize;
        const logicalHeight = (this.gridHeight + 1) * this.cellSize;
        
        // Set canvas size in CSS pixels
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;
        
        // Set canvas size in actual pixels
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        
        // Scale the context to account for the device pixel ratio
        this.ctx.scale(dpr, dpr);
        
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
            prev: this.getColorWithBoundsCheck(i-1, j),
            prev_nextrow: this.getColorWithBoundsCheck(i-1, j+1),
            curr: this.getColorWithBoundsCheck(i, j),
            curr_nextrow: this.getColorWithBoundsCheck(i, j+1),
            next: this.getColorWithBoundsCheck(i+1, j),
            next_nextrow: this.getColorWithBoundsCheck(i+1, j+1)
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
            3: colors.next_nextrow,
            2: colors.curr_nextrow,
            6: colors.curr,
            4: colors.prev_nextrow,
            5: colors.prev,

            // Default to background color
            1: '#000000',
            0: '#f0f0f0'
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
    

    updateStitchInputs() {
        document.getElementById('stitch-row').value = this.currentStitch.y;
        document.getElementById('stitch-col').value = this.currentStitch.x;
        document.getElementById('stitch-row').max = this.maxRowIndex;
        document.getElementById('stitch-col').max = this.maxColIndex;
    }
    
    goToStitch() {
        const row = parseInt(document.getElementById('stitch-row').value);
        const col = parseInt(document.getElementById('stitch-col').value);
        
        if (isNaN(row) || isNaN(col)) return;
        
        // Clamp values to grid bounds
        this.currentStitch.y = Math.max(0, Math.min(this.maxRowIndex, row));
        this.currentStitch.x = Math.max(0, Math.min(this.maxColIndex, col));
        
        this.updateStitchInputs();
        this.updateCurrentStitchDisplay();
    }
    
    navigateStitch(direction) {
        switch (direction) {
            case 'up':
                this.currentStitch.y = Math.max(0, this.currentStitch.y - 1);
                break;
            case 'down':
                this.currentStitch.y = Math.min(this.maxRowIndex, this.currentStitch.y + 1);
                break;
            case 'left':
                this.currentStitch.x = Math.max(0, this.currentStitch.x - 1);
                break;
            case 'right':
                this.currentStitch.x = Math.min(this.maxColIndex, this.currentStitch.x + 1);
                break;
        }
        this.updateStitchInputs();
        this.updateCurrentStitchDisplay();
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
        // document.getElementById('next-stitch').addEventListener('click', this.nextStitch.bind(this));
        // document.getElementById('prev-stitch').addEventListener('click', this.prevStitch.bind(this));

        
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('load-project').addEventListener('click', () => this.loadProject());

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


        document.getElementById('go-to-stitch').addEventListener('click', () => this.goToStitch());
        document.getElementById('prev-row').addEventListener('click', () => this.navigateStitch('up'));
        document.getElementById('next-row').addEventListener('click', () => this.navigateStitch('down'));
        document.getElementById('prev-stitch').addEventListener('click', () => this.navigateStitch('left'));
        document.getElementById('next-stitch').addEventListener('click', () => this.navigateStitch('right'));
        
        // Input changes
        // document.getElementById('stitch-row').addEventListener('change', () => this.goToStitch());
        // document.getElementById('stitch-col').addEventListener('change', () => this.goToStitch());
        
        
        // Add voice activation button
        const voiceActivationBtn = document.getElementById('voice-activation-btn');
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

        // Add resize observer for the canvas wrapper
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
        });
        resizeObserver.observe(this.canvas.parentElement);

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return; // Don't handle if typing in input fields
            
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateStitch('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateStitch('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateStitch('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateStitch('right');
                    break;
            }
        });
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
        
        // Avoid duplicates
        if (!this.palette.includes(newColor)) {
            // Add the new color while preserving old indices
            this.palette.push(newColor);
            this.activeColorIndex = this.palette.length - 1; // Select the new color
            
            // Re-render to reflect changes
            this.updatePaletteUI();
            this.render();
            this.updateZoomPreview();
            
            // Debug
            console.log(`Added color ${newColor} at index ${this.activeColorIndex}`);
            console.log("Current palette:", this.palette);
        }
    }
    

    updateSelectedColor() {
        const newColor = document.getElementById('color-picker').value;
        const oldColor = this.palette[this.activeColorIndex]; // Store old color for comparison
        
        // Update the palette
        this.palette[this.activeColorIndex] = newColor;
        
        // Reassign pixels that were using this palette index
        // for (let y = 0; y < this.gridHeight; y++) {
        //     for (let x = 0; x < this.gridWidth; x++) {
        //         if (this.gridData[y][x] === this.activeColorIndex) {
        //             // Keep them assigned to the same index (now with new color)
        //             this.gridData[y][x] = this.activeColorIndex; 
        //         }
        //     }
        // }
        
        this.updatePaletteUI();
        this.render();
        this.updateZoomPreview();
        
        // Debug: Log the color change
        console.log(`Updated palette index ${this.activeColorIndex} from ${oldColor} to ${newColor}`);
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
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) / this.cellSize) - 1;
        const y = Math.floor((e.clientY - rect.top)  / this.cellSize) - 1;
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
    
    nextStitchColorIndex(cur_x, cur_y) {
      if (cur_x < this.gridWidth - 1) {
        return this.gridData[cur_y][cur_x + 1];
      } else if (cur_y < this.gridHeight - 1) {
        return this.gridData[cur_y + 1][0];
      } 
      return this.gridData[0][0];
    }

    render() {
        // Clear canvas with background color
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(this.cellSize, this.cellSize, this.canvas.width, this.canvas.height);
        
        // First pass: Draw all cells
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const colorIndex = this.gridData[y][x];
                if (colorIndex > 0 && colorIndex < this.palette.length) { // 0 is background
                    this.ctx.fillStyle = this.palette[colorIndex];
                    this.ctx.fillRect(
                        (x + 1) * this.cellSize, 
                        (y + 1) * this.cellSize, 
                        this.cellSize, 
                        this.cellSize
                    );
                }
            }
        }

        let num_switches = 0;
        // Second pass: Draw grid lines and highlights
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const colorIndex = this.gridData[y][x];
                const next_color_index = this.nextStitchColorIndex(x, y);
                if (next_color_index != colorIndex) {
                  num_switches++;
                }
                // Draw grid lines
                this.ctx.strokeStyle = next_color_index != colorIndex ? '#afff19' : '#ddd';
                this.ctx.lineWidth = next_color_index != colorIndex ? 2 : 1;
                this.ctx.strokeRect(
                    (x + 1) * this.cellSize, 
                    (y + 1) * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
            }
        }
        document.getElementById('num_switch').textContent = num_switches;

        // Draw coordinates
        this.ctx.fillStyle = '#666';
        this.ctx.font = `${Math.max(8, this.cellSize/2)}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw column numbers
        for (let x = 0; x < this.gridWidth; x++) {
            this.ctx.fillText(
                x.toString(),
                (x + 1) * this.cellSize + this.cellSize/2,
                this.cellSize/2
            );
        }

        // Draw row numbers
        for (let y = 0; y < this.gridHeight; y++) {
            this.ctx.fillText(
                y.toString(),
                this.cellSize/2,
                (y + 1) * this.cellSize + this.cellSize/2
            );
        }

        // Highlight current stitch position
        if (this.currentStitch) {
            this.ctx.strokeStyle = '#fb6f92'; // Pink color for highlight
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                (this.currentStitch.x + 1) * this.cellSize,
                (this.currentStitch.y + 1) * this.cellSize,
                this.cellSize,
                this.cellSize
            );
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
        this.currentStitch = { x: 0, y: 0 };
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
        // document.getElementById('current-stitch').textContent = 
        //     `(${this.currentStitch.x}, ${this.currentStitch.y})`;
        
        // Get current color
        const colorIndex = this.gridData[this.currentStitch.y][this.currentStitch.x];
        const currentColor = colorIndex === 0 ? this.backgroundColor : this.palette[colorIndex];
        document.getElementById('current-color').textContent = currentColor;
        document.getElementById('current-color').style.color = currentColor;
        
        // Get next row color (if exists)
        let nextRowColor = "N/A";
        if (this.currentStitch.y < this.gridHeight - 1 && this.currentStitch.x < this.gridWidth - 1) {
            const nextColorIndex = this.nextStitchColorIndex(this.currentStitch.x, this.currentStitch.y);
            nextRowColor = nextColorIndex === 0 ? this.backgroundColor : this.palette[nextColorIndex];
        }
        document.getElementById('next-row-color').textContent = nextRowColor;
        document.getElementById('next-row-color').style.color = nextRowColor;

        // Check if colors don't match and play warning
        if (nextRowColor !== "N/A" && currentColor !== nextRowColor) {
            const speech = new SpeechSynthesisUtterance("傻 死 啦! 换线!");
            speech.voice = this.voices.find(voice => voice.lang === "zh-CN");

            speech.rate = 1.2; // Slightly faster speech
            speech.pitch = 1; // Slightly higher pitch
            window.speechSynthesis.speak(speech);
        }
        
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

    saveProject() {
        // Create the project data object
        const projectData = {
            version: 1,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            backgroundColor: this.backgroundColor,
            palette: this.palette,
            gridData: this.gridData,
            currentStitch: this.currentStitch
        };
    
        // Create a blob and download it
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `crochet-pattern-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async loadProject() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return resolve(false);
                
                try {
                    const contents = await file.text();
                    const projectData = JSON.parse(contents);
                    
                    // Validate the file
                    if (!projectData.version || !projectData.gridData) {
                        alert('Invalid project file format');
                        return resolve(false);
                    }
                    
                    // Update all properties
                    this.gridWidth = projectData.gridWidth;
                    this.gridHeight = projectData.gridHeight;
                    this.backgroundColor = projectData.backgroundColor;
                    this.palette = projectData.palette || ['#FFFFFF'];
                    this.gridData = projectData.gridData;
                    this.currentStitch = projectData.currentStitch || { i: 0, j: 0 };
                    
                    // Update UI
                    document.getElementById('bg-color-picker').value = this.backgroundColor;
                    this.resizeCanvas();
                    this.updatePaletteUI();
                    this.render();
                    this.updateZoomPreview();
                    this.updateCurrentStitchDisplay();
                    
                    resolve(true);
                } catch (error) {
                    console.error('Error loading project:', error);
                    alert('Error loading project file');
                    resolve(false);
                }
            };
            
            input.click();
        });
    }
    
    
}

// Initialize the tool when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cpt = new CrochetPatternTool();
});