/**
 * MindNexus - Canvas Force & Cluster Network Graph Engine
 */

class BrainGraphEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.nodes = [];
        this.links = [];

        // Camera transform
        this.scale = 1;
        this.targetScale = 1;
        this.panX = 0;
        this.panY = 0;

        // Interaction State
        this.selectedNode = null;
        this.hoveredNode = null;
        this.draggedNode = null;
        this.isDragging = false;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;

        // Correlation draw mode
        this.connectingSourceNode = null;

        // Filtering
        this.activeSourceFilter = 'all';
        this.activeStatusFilter = 'all'; // all | active | expired
        this.searchQuery = '';

        // Callbacks
        this.onNodeSelect = options.onNodeSelect || (() => {});
        this.onNodeHover = options.onNodeHover || (() => {});
        this.onLinkCreate = options.onLinkCreate || (() => {});

        this.initCanvasSize();
        this.attachEventListeners();

        // Animation Loop
        this.animFrameId = null;
        this.startLoop();
    }

    initCanvasSize() {
        const parent = this.canvas.parentElement;
        this.width = parent.clientWidth;
        this.height = parent.clientHeight;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    setData(nodes, links) {
        // Deep copy nodes and assign physics properties
        this.nodes = nodes.map(n => {
            // Determine initial cluster center based on status
            const isExpired = n.status === 'expired';
            const defaultCenterX = isExpired ? this.width * 0.78 : this.width * 0.42;
            const defaultCenterY = isExpired ? this.height * 0.7 : this.height * 0.48;

            return {
                ...n,
                x: n.x || defaultCenterX + (Math.random() - 0.5) * 300,
                y: n.y || defaultCenterY + (Math.random() - 0.5) * 300,
                vx: 0,
                vy: 0,
                radius: isExpired ? 22 : 28,
                pinned: false
            };
        });

        this.links = links.map(l => ({ ...l }));
    }

    // Force simulation step
    updatePhysics() {
        const alpha = 0.05;
        const activeCenterX = this.width * 0.42;
        const activeCenterY = this.height * 0.48;
        const expiredCenterX = this.width * 0.78;
        const expiredCenterY = this.height * 0.7;

        // Repulsion between nodes
        for (let i = 0; i < this.nodes.length; i++) {
            const n1 = this.nodes[i];
            if (!this.isNodeVisible(n1)) continue;

            // Center gravity
            const cx = n1.status === 'expired' ? expiredCenterX : activeCenterX;
            const cy = n1.status === 'expired' ? expiredCenterY : activeCenterY;
            n1.vx += (cx - n1.x) * 0.0008;
            n1.vy += (cy - n1.y) * 0.0008;

            for (let j = i + 1; j < this.nodes.length; j++) {
                const n2 = this.nodes[j];
                if (!this.isNodeVisible(n2)) continue;

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = n1.radius + n2.radius + 35;

                if (dist < minDist) {
                    const force = (minDist - dist) / dist * 0.25;
                    const fx = dx * force;
                    const fy = dy * force;
                    if (!n1.pinned) { n1.vx -= fx; n1.vy -= fy; }
                    if (!n2.pinned) { n2.vx += fx; n2.vy += fy; }
                }
            }
        }

        // Link spring attraction
        this.links.forEach(link => {
            const sourceNode = this.nodes.find(n => n.id === (link.source.id || link.source));
            const targetNode = this.nodes.find(n => n.id === (link.target.id || link.target));

            if (!sourceNode || !targetNode) return;
            if (!this.isNodeVisible(sourceNode) || !this.isNodeVisible(targetNode)) return;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 140;

            const force = (dist - targetDist) * 0.003;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (!sourceNode.pinned) { sourceNode.vx += fx; sourceNode.vy += fy; }
            if (!targetNode.pinned) { targetNode.vx -= fx; targetNode.vy -= fy; }
        });

        // Update positions with damping
        this.nodes.forEach(node => {
            if (node === this.draggedNode) return;

            node.vx *= 0.82;
            node.vy *= 0.82;
            node.x += node.vx;
            node.y += node.vy;
        });

        // Smooth zoom interpolation
        this.scale += (this.targetScale - this.scale) * 0.1;
    }

    isNodeVisible(node) {
        // Source Filter
        if (this.activeSourceFilter !== 'all' && node.source !== this.activeSourceFilter) {
            return false;
        }
        // Status Filter
        if (this.activeStatusFilter !== 'all' && node.status !== this.activeStatusFilter) {
            return false;
        }
        // Search Filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            const matchTitle = node.title.toLowerCase().includes(q);
            const matchContent = node.content.toLowerCase().includes(q);
            const matchTags = node.tags.some(t => t.toLowerCase().includes(q));
            if (!matchTitle && !matchContent && !matchTags) return false;
        }
        return true;
    }

    startLoop() {
        const render = () => {
            this.updatePhysics();
            this.draw();
            this.animFrameId = requestAnimationFrame(render);
        };
        render();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        // Apply Pan & Zoom
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.scale, this.scale);

        // Draw Expired Zone Boundary / Portal Background
        this.drawGraveyardZone();

        // 1. Draw Links
        this.drawLinks();

        // 2. Draw Nodes
        const visibleNodes = this.nodes.filter(n => this.isNodeVisible(n));
        visibleNodes.forEach(node => this.drawNode(node));

        // 3. Draw connecting line draft if in connect mode
        if (this.connectingSourceNode && this.hoveredNode) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.connectingSourceNode.x, this.connectingSourceNode.y);
            this.ctx.lineTo(this.hoveredNode.x, this.hoveredNode.y);
            this.ctx.strokeStyle = '#00F2FE';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([6, 6]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }

    drawGraveyardZone() {
        const expiredCenterX = this.width * 0.78;
        const expiredCenterY = this.height * 0.7;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(expiredCenterX, expiredCenterY, 220, 0, Math.PI * 2);
        
        // Soft vintage / dusty gradient
        const grad = this.ctx.createRadialGradient(expiredCenterX, expiredCenterY, 10, expiredCenterX, expiredCenterY, 220);
        grad.addColorStop(0, 'rgba(224, 169, 109, 0.08)');
        grad.addColorStop(0.7, 'rgba(100, 116, 139, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(224, 169, 109, 0.25)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([8, 8]);
        this.ctx.stroke();

        // Zone Label
        this.ctx.fillStyle = 'rgba(224, 169, 109, 0.5)';
        this.ctx.font = '600 12px "Plus Jakarta Sans"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⏳ SÜRESİ DOLMUŞ / ARŞİV BÖLGESİ', expiredCenterX, expiredCenterY - 200);
        this.ctx.restore();
    }

    drawLinks() {
        this.links.forEach(link => {
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;

            const sourceNode = this.nodes.find(n => n.id === sId);
            const targetNode = this.nodes.find(n => n.id === tId);

            if (!sourceNode || !targetNode) return;
            if (!this.isNodeVisible(sourceNode) || !this.isNodeVisible(targetNode)) return;

            const isHighlighted = (this.selectedNode && (sourceNode.id === this.selectedNode.id || targetNode.id === this.selectedNode.id)) ||
                                  (this.hoveredNode && (sourceNode.id === this.hoveredNode.id || targetNode.id === this.hoveredNode.id));

            const isExpiredLink = sourceNode.status === 'expired' || targetNode.status === 'expired';

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(sourceNode.x, sourceNode.y);
            this.ctx.lineTo(targetNode.x, targetNode.y);

            if (isHighlighted) {
                this.ctx.strokeStyle = '#00F2FE';
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = '#00F2FE';
                this.ctx.shadowBlur = 10;
            } else if (isExpiredLink) {
                this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);
            } else {
                this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
                this.ctx.lineWidth = 1.5;
            }

            this.ctx.stroke();

            // Link Label (relationship name)
            if (link.label && (isHighlighted || this.scale > 0.85)) {
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                this.ctx.fillStyle = isHighlighted ? '#00F2FE' : '#94A3B8';
                this.ctx.font = '500 10px "Plus Jakarta Sans"';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(link.label, midX, midY - 6);
            }

            this.ctx.restore();
        });
    }

    drawNode(node) {
        const isSelected = this.selectedNode && this.selectedNode.id === node.id;
        const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
        const isExpired = node.status === 'expired';

        this.ctx.save();
        this.ctx.translate(node.x, node.y);

        // Glow effect
        if (isSelected || isHovered) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, node.radius + 12, 0, Math.PI * 2);
            this.ctx.fillStyle = isExpired ? 'rgba(224, 169, 109, 0.25)' : 'rgba(0, 242, 254, 0.25)';
            this.ctx.fill();
        }

        // Main Node Circle
        this.ctx.beginPath();
        this.ctx.arc(0, 0, node.radius, 0, Math.PI * 2);

        if (isExpired) {
            this.ctx.fillStyle = '#1A202C';
            this.ctx.strokeStyle = isSelected ? '#e0a96d' : '#64748B';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([4, 4]);
        } else {
            this.ctx.fillStyle = node.color || '#4FACFE';
            this.ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = isSelected ? 3 : 1.5;
        }

        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Source Icon inside circle
        const iconMap = { phone: '📱', instagram: '📸', twitter: '🐦', physical: '📝' };
        const icon = isExpired ? '⌛' : (iconMap[node.source] || '🧠');

        this.ctx.font = `${node.radius * 0.7}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icon, 0, 1);

        // Node Title Text
        this.ctx.font = `${isSelected ? '700' : '600'} 12px "Plus Jakarta Sans"`;
        this.ctx.fillStyle = isExpired ? '#A0AEC0' : '#F0F4F8';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        const maxTitleWidth = 140;
        const truncatedTitle = node.title.length > 22 ? node.title.substring(0, 20) + '...' : node.title;
        this.ctx.fillText(truncatedTitle, 0, node.radius + 8);

        this.ctx.restore();
    }

    // Interaction Events
    attachEventListeners() {
        window.addEventListener('resize', () => this.initCanvasSize());

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // Native Mobile Touch Events
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.handleMouseDown({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.handleMouseMove({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', (e) => {
            this.handleMouseUp(e);
        }, { passive: true });
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Transform mouse coords to graph world coords
        const worldX = (mouseX - this.panX) / this.scale;
        const worldY = (mouseY - this.panY) / this.scale;

        return { x: worldX, y: worldY };
    }

    findNodeAt(x, y) {
        const visibleNodes = this.nodes.filter(n => this.isNodeVisible(n));
        for (let i = visibleNodes.length - 1; i >= 0; i--) {
            const n = visibleNodes[i];
            const dx = x - n.x;
            const dy = y - n.y;
            if (Math.sqrt(dx * dx + dy * dy) <= n.radius + 8) {
                return n;
            }
        }
        return null;
    }

    handleMouseDown(e) {
        const pos = this.getCanvasPos(e);
        const clickedNode = this.findNodeAt(pos.x, pos.y);

        if (this.connectingSourceNode) {
            // In link creation mode
            if (clickedNode && clickedNode.id !== this.connectingSourceNode.id) {
                this.onLinkCreate(this.connectingSourceNode, clickedNode);
            }
            this.connectingSourceNode = null;
            this.canvas.style.cursor = 'grab';
            return;
        }

        if (clickedNode) {
            this.draggedNode = clickedNode;
            this.draggedNode.pinned = true;
            this.selectedNode = clickedNode;
            this.onNodeSelect(clickedNode);
            this.isDragging = true;
        } else {
            this.selectedNode = null;
            this.onNodeSelect(null);
            this.isPanning = true;
            this.panStartX = e.clientX - this.panX;
            this.panStartY = e.clientY - this.panY;
        }
    }

    handleMouseMove(e) {
        const pos = this.getCanvasPos(e);
        const hovered = this.findNodeAt(pos.x, pos.y);

        if (hovered !== this.hoveredNode) {
            this.hoveredNode = hovered;
            this.onNodeHover(hovered);
            this.canvas.style.cursor = hovered ? 'pointer' : (this.isPanning ? 'grabbing' : 'grab');
        }

        if (this.isDragging && this.draggedNode) {
            this.draggedNode.x = pos.x;
            this.draggedNode.y = pos.y;
        } else if (this.isPanning) {
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
        }
    }

    handleMouseUp(e) {
        if (this.draggedNode) {
            this.draggedNode.pinned = false;
            this.draggedNode = null;
        }
        this.isDragging = false;
        this.isPanning = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        const newScale = Math.max(0.3, Math.min(2.5, this.targetScale * zoomFactor));

        // Zoom towards mouse pointer
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.panX = mouseX - (mouseX - this.panX) * (newScale / this.targetScale);
        this.panY = mouseY - (mouseY - this.panY) * (newScale / this.targetScale);
        this.targetScale = newScale;
    }

    zoomIn() {
        this.targetScale = Math.min(2.5, this.targetScale * 1.25);
    }

    zoomOut() {
        this.targetScale = Math.max(0.3, this.targetScale * 0.8);
    }

    fitView() {
        this.targetScale = 1;
        this.panX = 0;
        this.panY = 0;
    }

    focusOnNode(node) {
        if (!node) return;
        this.selectedNode = node;
        this.targetScale = 1.4;
        this.panX = (this.width / 2) - (node.x * this.targetScale);
        this.panY = (this.height / 2) - (node.y * this.targetScale);
    }

    enableConnectMode() {
        if (this.selectedNode) {
            this.connectingSourceNode = this.selectedNode;
            this.canvas.style.cursor = 'crosshair';
        }
    }
}
