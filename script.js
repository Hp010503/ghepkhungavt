// Lấy các phần tử HTML cần thiết
const canvas = document.getElementById('avatarCanvas');
const ctx = canvas.getContext('2d');
const imageLoader = document.getElementById('imageLoader');
const downloadButton = document.getElementById('downloadButton');
const zoomSlider = document.getElementById('zoomSlider');

// Kích thước thật của canvas
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

// Thông số của lớp ảnh người dùng (lớp giữa)
const userImageCircle = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: 1795 / 2
};

// Biến lưu trữ ảnh và trạng thái của nó
let userImage = null;
let imageScale = 1;
let imageX = 0;
let imageY = 0;

// Biến cho chức năng kéo thả
let isDragging = false;
let startDragX, startDragY;

// Tải các ảnh mặc định
const backgroundImage = new Image();
backgroundImage.src = 'images/background.jpg';
const frameImage = new Image();
frameImage.src = 'images/frame.png';

// Hàm tiện ích để giới hạn một giá trị trong một khoảng min-max
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

// Hàm chính: Vẽ lại tất cả các lớp lên canvas
const drawCanvas = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (userImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(userImageCircle.x, userImageCircle.y, userImageCircle.radius, 0, Math.PI * 2, true);
        ctx.clip();

        const { scaledWidth, scaledHeight } = getScaledDimensions();
        const drawX = userImageCircle.x - (scaledWidth / 2) + imageX;
        const drawY = userImageCircle.y - (scaledHeight / 2) + imageY;
        
        ctx.drawImage(userImage, drawX, drawY, scaledWidth, scaledHeight);
        ctx.restore();
    }
    
    ctx.drawImage(frameImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const dataURL = canvas.toDataURL('image/png');
    downloadButton.href = dataURL;
};

// Hàm tính toán kích thước ảnh sau khi đã zoom
const getScaledDimensions = () => {
    if (!userImage) return { scaledWidth: 0, scaledHeight: 0 };

    const circleDiameter = userImageCircle.radius * 2;
    const userImageAspectRatio = userImage.width / userImage.height;
    let baseWidth, baseHeight;
    
    if (userImageAspectRatio > 1) {
        baseHeight = circleDiameter;
        baseWidth = baseHeight * userImageAspectRatio;
    } else {
        baseWidth = circleDiameter;
        baseHeight = baseWidth / userImageAspectRatio;
    }

    return {
        scaledWidth: baseWidth * imageScale,
        scaledHeight: baseHeight * imageScale,
    };
};

// Hàm reset trạng thái khi tải ảnh mới
const resetImageState = () => {
    imageScale = 1;
    imageX = 0;
    imageY = 0;
    zoomSlider.value = 1;
};

// --- XỬ LÝ SỰ KIỆN CỦA NGƯỜI DÙNG ---

imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            userImage = new Image();
            userImage.onload = () => {
                resetImageState();
                drawCanvas();
            };
            userImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

zoomSlider.addEventListener('input', (e) => {
    if (!userImage) return;
    imageScale = parseFloat(e.target.value);

    // Sau khi zoom, phải giới hạn lại vị trí hiện tại của ảnh
    // vì khoảng di chuyển cho phép đã thay đổi
    const { scaledWidth, scaledHeight } = getScaledDimensions();
    const maxOffsetX = Math.max(0, (scaledWidth - userImageCircle.radius * 2) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - userImageCircle.radius * 2) / 2);

    imageX = clamp(imageX, -maxOffsetX, maxOffsetX);
    imageY = clamp(imageY, -maxOffsetY, maxOffsetY);

    drawCanvas();
});

canvas.addEventListener('mousedown', (e) => {
    if (!userImage) return;
    isDragging = true;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasClickX = (e.clientX - rect.left) * scaleX;
    const canvasClickY = (e.clientY - rect.top) * scaleY;

    startDragX = canvasClickX - imageX;
    startDragY = canvasClickY - imageY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && userImage) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasMoveX = (e.clientX - rect.left) * scaleX;
        const canvasMoveY = (e.clientY - rect.top) * scaleY;

        let newImageX = canvasMoveX - startDragX;
        let newImageY = canvasMoveY - startDragY;

        // --- LOGIC GIỚI HẠN DI CHUYỂN ---
        // Tính toán khoảng di chuyển tối đa cho phép
        const { scaledWidth, scaledHeight } = getScaledDimensions();
        const maxOffsetX = Math.max(0, (scaledWidth - userImageCircle.radius * 2) / 2);
        const maxOffsetY = Math.max(0, (scaledHeight - userImageCircle.radius * 2) / 2);

        // Giới hạn vị trí mới trong khoảng cho phép
        imageX = clamp(newImageX, -maxOffsetX, maxOffsetX);
        imageY = clamp(newImageY, -maxOffsetY, maxOffsetY);

        drawCanvas();
    }
});

window.addEventListener('mouseup', () => { isDragging = false; });

// Vẽ lần đầu tiên
Promise.all([
    new Promise(resolve => backgroundImage.onload = resolve),
    new Promise(resolve => frameImage.onload = resolve)
]).then(() => {
    drawCanvas();
});