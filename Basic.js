/**
 * PixelFruit 基础功能模块
 * 提供图像处理的基础工具函数
 */

/**
 * 防抖函数 - 延迟执行函数调用，避免频繁触发
 * @param {Function} func - 需要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 读取文件为 ArrayBuffer
 * @param {File} file - 要读取的文件
 * @returns {Promise<ArrayBuffer>} 文件的ArrayBuffer表示
 */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 应用透视和旋转变换
 * @param {ImageData} imageData - 要处理的图像数据
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 主画布元素
 * @param {number} verticalTilt - 垂直倾斜度
 * @param {number} horizontalTilt - 水平倾斜度
 * @param {number} rotation - 旋转角度（度）
 * @param {number} scale - 缩放比例（百分比转换为小数）
 */
export function applyPerspectiveTransform(imageData, ctx, canvas, verticalTilt, horizontalTilt, rotation, scale) {
    // 获取图像尺寸
    const width = imageData.width;
    const height = imageData.height;
    
    // 如果没有变换需要应用，直接绘制到画布
    if (verticalTilt === 0 && horizontalTilt === 0 && rotation === 0 && scale === 1) {
        // 直接绘制而不创建临时canvas，提高性能
        ctx.putImageData(imageData, 0, 0);
        return;
    }
    
    // 只有在需要变换时才创建临时canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 绘制图像数据到临时canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // 缓存canvas中心坐标
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 保存当前状态
    ctx.save();
    
    // 移动到画布中心
    ctx.translate(centerX, centerY);
    
    // 应用旋转（如果有）
    if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // 应用缩放（如果有）
    if (scale !== 1) {
        ctx.scale(scale, scale);
    }
    
    // 应用透视变换（如果有）
    if (verticalTilt !== 0 || horizontalTilt !== 0) {
        // 使用正确的6参数2D变换矩阵格式
        ctx.transform(1, verticalTilt/5000, horizontalTilt/5000, 1, 0, 0);
    }
    
    // 绘制图像（从中心偏移回原点）
    ctx.drawImage(tempCanvas, -width / 2, -height / 2);
    
    // 恢复状态
    ctx.restore();
}

/**
 * 更新图像从缓存
 * @param {Uint8ClampedArray} cachedImageData - 缓存的图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 主画布元素
 * @param {Function} applyAdjustmentsToCachedData - 应用调整到缓存数据的函数
 */
export function updateImageFromCache(cachedImageData, width, height, ctx, canvas, applyAdjustmentsToCachedData) {
    if (!cachedImageData || !cachedImageData.data) {
        console.error('没有可用的缓存图像数据');
        return;
    }
    
    try {
        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;
        
        // 创建临时数组进行处理，避免直接修改缓存数据
        const tempData = new Uint8ClampedArray(cachedImageData.data.length);
        tempData.set(cachedImageData.data);
        
        // 应用调整到缓存数据
        applyAdjustmentsToCachedData(tempData, width, height);
        
        // 创建ImageData对象
        const imageData = new ImageData(tempData, width, height);
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 应用透视变换
        const verticalTiltSlider = document.getElementById('vertical-tilt');
        const horizontalTiltSlider = document.getElementById('horizontal-tilt');
        const rotateSlider = document.getElementById('rotate');
        const scaleSlider = document.getElementById('scale');
        
        const verticalTilt = verticalTiltSlider ? parseFloat(verticalTiltSlider.value) : 0;
        const horizontalTilt = horizontalTiltSlider ? parseFloat(horizontalTiltSlider.value) : 0;
        const rotation = rotateSlider ? parseInt(rotateSlider.value) : 0;
        const scale = scaleSlider ? parseInt(scaleSlider.value) / 100 : 1;
        
        applyPerspectiveTransform(imageData, ctx, canvas, verticalTilt, horizontalTilt, rotation, scale);
    } catch (error) {
        console.error('从缓存更新图像时出错:', error);
    }
}

/**
 * 初始化曲线编辑器
 * @param {HTMLElement} curveEditor - 曲线编辑器容器元素
 */
export function initCurveEditor(curveEditor) {
    const rect = curveEditor.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // 创建临时canvas用于绘制曲线
    const curveCanvas = document.createElement('canvas');
    curveCanvas.width = width;
    curveCanvas.height = height;
    curveCanvas.style.position = 'absolute';
    curveCanvas.style.top = '0';
    curveCanvas.style.left = '0';
    curveEditor.appendChild(curveCanvas);
    
    const curveCtx = curveCanvas.getContext('2d');
    
    // 绘制网格和对角线
    function drawCurve() {
        // 清空画布
        curveCtx.clearRect(0, 0, width, height);
        
        // 移除网格绘制代码
        
        // 绘制对角线（默认曲线）
        const rootStyle = getComputedStyle(document.documentElement);
        curveCtx.strokeStyle = rootStyle.getPropertyValue('--primary-color');
        curveCtx.lineWidth = 2;
        curveCtx.beginPath();
        curveCtx.moveTo(0, height);
        curveCtx.lineTo(width, 0);
        curveCtx.stroke();
    }
    
    // 初始化绘制
    drawCurve();
}