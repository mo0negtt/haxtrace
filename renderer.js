export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Background image properties
        this.bgImage = null;
        this.bgOpacity = 0.5;
        this.bgScale = 1.0; // New property for background image scaling

        this.ARC_CURVE_THRESHOLD = 0.1; // Treat curves below this absolute value as straight lines
    }

    screenToWorld(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        return {
            x: (canvasX - this.canvas.width / 2 - this.panX) / this.zoom,
            y: (canvasY - this.canvas.height / 2 - this.panY) / this.zoom
        };
    }

    worldToScreen(x, y) {
        return {
            x: x * this.zoom + this.canvas.width / 2 + this.panX,
            y: y * this.zoom + this.canvas.height / 2 + this.panY
        };
    }

    startPan(x, y) {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    updatePan(x, y) {
        if (this.isDragging) {
            const deltaX = x - this.lastMouseX;
            const deltaY = y - this.lastMouseY;
            this.panX += deltaX;
            this.panY += deltaY;
            this.lastMouseX = x;
            this.lastMouseY = y;
        }
    }

    endPan() {
        this.isDragging = false;
    }

    handleZoom(deltaY) {
        const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= zoomFactor;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));
    }

    zoomIn() {
        this.zoom *= 1.2;
        this.zoom = Math.min(5, this.zoom);
    }

    zoomOut() {
        this.zoom /= 1.2;
        this.zoom = Math.max(0.1, this.zoom);
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    loadBackgroundImage(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.bgImage = new Image();
                this.bgImage.onload = () => {
                    this.render();
                };
                this.bgImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    updateBgOpacity(opacity) {
        this.bgOpacity = opacity;
        this.render();
    }

    updateBgScale(scale) {
        this.bgScale = Math.max(0.1, Math.min(5, scale)); // Clamp scale between 0.1 and 5
        this.render();
    }

    resetBgScale() {
        this.bgScale = 1.0;
        this.render();
    }

    render(mapData) {
        if (!mapData) return;
        
        const data = mapData.getData();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background color
        this.ctx.fillStyle = '#' + data.bg.color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background image if loaded
        if (this.bgImage) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bgOpacity;
            // The image scale now depends on both its own independent scale and the canvas zoom
            const displayWidth = this.bgImage.width * this.bgScale * this.zoom;
            const displayHeight = this.bgImage.height * this.bgScale * this.zoom;

            // Image is centered based on canvas center + current pan, no independent bgX/bgY
            const x = this.canvas.width / 2 + this.panX;
            const y = this.canvas.height / 2 + this.panY;
            
            this.ctx.drawImage(this.bgImage, x - displayWidth / 2, y - displayHeight / 2, 
                         displayWidth, displayHeight);
            this.ctx.restore();
        }
        
        // Draw map bounds
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        const bounds = {
            left: this.worldToScreen(-data.width / 2, -data.height / 2),
            right: this.worldToScreen(data.width / 2, data.height / 2)
        };
        this.ctx.strokeRect(bounds.left.x, bounds.left.y, 
                      bounds.right.x - bounds.left.x, bounds.right.y - bounds.left.y);
        this.ctx.setLineDash([]);
        
        // Draw segments
        data.segments.forEach((segment, index) => {
            const v0 = data.vertexes[segment.v0];
            const v1 = data.vertexes[segment.v1];
            
            if (v0 && v1) {
                // Get screen coordinates for drawing setup
                const start_screen = this.worldToScreen(v0.x, v0.y);
                const end_screen = this.worldToScreen(v1.x, v1.y);
                
                this.ctx.strokeStyle = segment.color ? '#' + segment.color : '#000000';
                this.ctx.lineWidth = 2;

                if (this.tools && this.tools.selectedSegments.includes(index)) {
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeStyle = '#FFD700'; // Gold for selected
                }
                
                const curveValue = segment.curve || 0;
                const v0_world = { x: v0.x, y: v0.y };
                const v1_world = { x: v1.x, y: v1.y };

                const dx_world = v1_world.x - v0_world.x;
                const dy_world = v1_world.y - v0_world.y;
                const dist_v0v1_world = Math.sqrt(dx_world * dx_world + dy_world * dy_world);

                // Check if segment is essentially a straight line
                if (Math.abs(curveValue) < this.ARC_CURVE_THRESHOLD || dist_v0v1_world < 0.001) {
                    // Draw straight line
                    this.ctx.beginPath();
                    this.ctx.moveTo(start_screen.x, start_screen.y);
                    this.ctx.lineTo(end_screen.x, end_screen.y);
                    this.ctx.stroke();
                } else {
                    // Draw circular arc
                    const curve_rad = curveValue * Math.PI / 180;
                    
                    // Radius of the circle containing the arc. Must be positive.
                    const radius_world = Math.abs(dist_v0v1_world / (2 * Math.sin(curve_rad / 2)));

                    // Distance from the midpoint of the chord (v0v1) to the center of the circle
                    // Note: h_dist_mid_to_center can be negative for major arcs (curve > 180 degrees)
                    const h_dist_mid_to_center = radius_world * Math.cos(curve_rad / 2);

                    // Midpoint of the chord in world coordinates
                    const midX_world = (v0_world.x + v1_world.x) / 2;
                    const midY_world = (v0_world.y + v1_world.y) / 2;

                    // Angle of the chord vector (v0 to v1)
                    const seg_angle = Math.atan2(dy_world, dx_world);

                    // Angle of the perpendicular vector from midpoint to circle center
                    // For curveValue > 0 (Haxball's CCW arc), center is "above" or Y-negative relative to chord for horizontal line.
                    // This means the perp direction is CW from segment vector, so `seg_angle - Math.PI / 2`.
                    // For curveValue < 0 (Haxball's CW arc), center is "below" or Y-positive.
                    // This means the perp direction is CCW from segment vector, so `seg_angle + Math.PI / 2`.
                    const angle_offset_to_center = seg_angle + (curveValue > 0 ? -Math.PI / 2 : Math.PI / 2);
                    
                    // Center of the circle in world coordinates
                    const center_x_world = midX_world + h_dist_mid_to_center * Math.cos(angle_offset_to_center);
                    const center_y_world = midY_world + h_dist_mid_to_center * Math.sin(angle_offset_to_center);

                    // Convert center and vertex points to screen coordinates
                    const center_screen = this.worldToScreen(center_x_world, center_y_world);
                    
                    // Calculate start and end angles for the arc based on screen coordinates relative to center
                    const start_angle_rad = Math.atan2(start_screen.y - center_screen.y, start_screen.x - center_screen.x);
                    const end_angle_rad = Math.atan2(end_screen.y - center_screen.y, end_screen.x - center_screen.x);
                    
                    // Canvas arc 'anticlockwise' parameter: true for CCW, false for CW.
                    // Haxball's curve > 0 means the arc path is visually "counter-clockwise" (e.g., (0,0) to (100,0) curve=180 is above).
                    // This matches canvas anticlockwise=true for arc between start and end angles.
                    const anticlockwise = curveValue > 0;

                    this.ctx.beginPath();
                    this.ctx.arc(center_screen.x, center_screen.y, radius_world * this.zoom, start_angle_rad, end_angle_rad, anticlockwise);
                    this.ctx.stroke();
                }
            }
        });
        
        // Draw vertices
        data.vertexes.forEach((vertex, index) => {
            const pos = this.worldToScreen(vertex.x, vertex.y);
            
            // Check if vertex is selected (need to get selected vertices from tools)
            this.ctx.fillStyle = '#0066cc';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw vertex index
            this.ctx.fillStyle = '#000';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(index.toString(), pos.x + 8, pos.y - 8);
        });
        
        // Draw center lines
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2 + this.panX, 0);
        this.ctx.lineTo(this.canvas.width / 2 + this.panX, this.canvas.height);
        this.ctx.moveTo(0, this.canvas.height / 2 + this.panY);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2 + this.panY);
        this.ctx.stroke();
    }

    setTools(tools) {
        this.tools = tools;
    }
}