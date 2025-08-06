export type ToolMode = "draw" | "erase" | "select";
export type ShapeType = "rect" | "circle" | "line";

export type Shape = {
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    selected?: boolean;
};

export type DrawAPI = {
    undo: () => void;
    redo: () => void;
    exportToImage: () => void;
    clear: () => void;
    getShapes: () => Shape[];
    loadShapes: (shapes: Shape[]) => void;
    getScale: () => number;
};

export function draw(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    tool: ToolMode,
    shapeType: ShapeType,
    currentColor: string
): DrawAPI {
    ctx.lineWidth = 2;

    let shapes: Shape[] = [];
    const undoStack: Shape[][] = [];
    let redoStack: Shape[][] = [];

    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    let selectedShape: Shape | null = null;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Zoom & pan
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    function clearCanvas() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Fill background black
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawShape(shape: Shape, overrideColor?: string) {
        ctx.strokeStyle = overrideColor ?? shape.color;
        ctx.fillStyle = overrideColor ?? shape.color;

        const { x, y, width, height } = shape;
        switch (shape.type) {
            case "rect":
                ctx.strokeRect(x, y, width, height);
                break;
            case "circle": {
                const radius = Math.sqrt(width * width + height * height);
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            }
            case "line": {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + width, y + height);
                ctx.stroke();
                break;
            }
        }
    }

    function drawAll(preview?: Shape) {
        clearCanvas();

        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        shapes.forEach((shape) => {
            drawShape(shape, shape.selected ? "white" : undefined);
            if (shape.selected) {
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = "white";
                ctx.strokeRect(shape.x - 4, shape.y - 4, shape.width + 8, shape.height + 8);
                ctx.setLineDash([]);
            }
        });

        if (preview && tool === "draw" && !isDragging) {
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "lightblue";
            drawShape(preview);
            ctx.setLineDash([]);
        }
    }

    function pushUndo() {
        undoStack.push(shapes.map((s) => ({ ...s })));
        if (undoStack.length > 50) undoStack.shift();
        redoStack = [];
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(shapes.map((s) => ({ ...s })));
        shapes = undoStack.pop()!;
        selectedShape = null;
        drawAll();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(shapes.map((s) => ({ ...s })));
        shapes = redoStack.pop()!;
        selectedShape = null;
        drawAll();
    }

    function getShapeAt(x: number, y: number): Shape | null {
        for (let i = shapes.length - 1; i >= 0; i--) {
            const s = shapes[i];
            if (
                x >= s.x &&
                x <= s.x + s.width &&
                y >= s.y &&
                y <= s.y + s.height
            ) {
                return s;
            }
        }
        return null;
    }

    // Mouse event handlers

    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        if (e.button === 1) {
            // Middle mouse button - start pan
            isPanning = true;
            panStartX = e.clientX;
            panStartY = e.clientY;
            return;
        }

        if (tool === "erase") {
            pushUndo();
            shapes = shapes.filter((s) => {
                if (
                    mouseX >= s.x &&
                    mouseX <= s.x + s.width &&
                    mouseY >= s.y &&
                    mouseY <= s.y + s.height
                ) {
                    return false;
                }
                return true;
            });
            drawAll();
            return;
        }

        if (tool === "draw") {
            pushUndo();
            isDrawing = true;
            startX = mouseX;
            startY = mouseY;
            selectedShape = null;
            shapes.forEach((s) => (s.selected = false));
            drawAll();
            return;
        }

        if (tool === "select") {
            const s = getShapeAt(mouseX, mouseY);
            if (s) {
                selectedShape = s;
                isDragging = true;
                dragOffsetX = mouseX - s.x;
                dragOffsetY = mouseY - s.y;
                shapes.forEach((sh) => (sh.selected = sh === s));
                drawAll();
            } else {
                selectedShape = null;
                shapes.forEach((sh) => (sh.selected = false));
                drawAll();
            }
        }
    };

    canvas.onmouseup = (e) => {
        if (e.button === 1) {
            // End pan
            isPanning = false;
            return;
        }

        if (tool === "draw" && isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - offsetX) / scale;
            const mouseY = (e.clientY - rect.top - offsetY) / scale;

            isDrawing = false;
            const newShape: Shape = {
                type: shapeType,
                x: startX,
                y: startY,
                width: mouseX - startX,
                height: mouseY - startY,
                color: currentColor,
            };
            shapes.push(newShape);
            drawAll();
        }
        if (tool === "select" && isDragging) {
            isDragging = false;
            pushUndo();
        }
    };

    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        if (isPanning) {
            offsetX += e.clientX - panStartX;
            offsetY += e.clientY - panStartY;
            panStartX = e.clientX;
            panStartY = e.clientY;
            drawAll();
            return;
        }

        if (tool === "draw" && isDrawing) {
            const previewShape: Shape = {
                type: shapeType,
                x: startX,
                y: startY,
                width: mouseX - startX,
                height: mouseY - startY,
                color: currentColor,
            };
            drawAll(previewShape);
            return;
        }

        if (tool === "select" && isDragging && selectedShape) {
            selectedShape.x = mouseX - dragOffsetX;
            selectedShape.y = mouseY - dragOffsetY;
            drawAll();
            return;
        }
    };

    canvas.onwheel = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        scale *= delta;

        // Adjust offset to zoom towards mouse pointer
        offsetX -= (mouseX * delta - mouseX) * scale;
        offsetY -= (mouseY * delta - mouseY) * scale;

        drawAll();
    };

    // Export PNG function
    function exportToImage() {
        const imageCanvas = document.createElement("canvas");
        imageCanvas.width = canvas.width;
        imageCanvas.height = canvas.height;
        const imageCtx = imageCanvas.getContext("2d")!;
        // Black background
        imageCtx.fillStyle = "black";
        imageCtx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
        // Draw shapes ignoring zoom/pan (show full image)
        shapes.forEach((shape) => {
            imageCtx.strokeStyle = shape.color;
            imageCtx.lineWidth = 2;
            switch (shape.type) {
                case "rect":
                    imageCtx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                    break;
                case "circle": {
                    const radius = Math.sqrt(shape.width * shape.width + shape.height * shape.height);
                    imageCtx.beginPath();
                    imageCtx.arc(shape.x, shape.y, radius, 0, 2 * Math.PI);
                    imageCtx.stroke();
                    break;
                }
                case "line":
                    imageCtx.beginPath();
                    imageCtx.moveTo(shape.x, shape.y);
                    imageCtx.lineTo(shape.x + shape.width, shape.y + shape.height);
                    imageCtx.stroke();
                    break;
            }
        });

        const dataUrl = imageCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "canvas.png";
        a.click();
    }

    function clear() {
        pushUndo();
        shapes = [];
        selectedShape = null;
        drawAll();
    }

    function getShapes() {
        return shapes;
    }

    function loadShapes(newShapes: Shape[]) {
        pushUndo();
        shapes = newShapes;
        selectedShape = null;
        drawAll();
    }

    drawAll();

    return {
        undo,
        redo,
        exportToImage,
        clear,
        getShapes,
        loadShapes,
        getScale: () => scale,
    };
}
