/**
 * 直方图管理器模块
 * 优化直方图计算和绘制性能，添加缓存机制
 */

// 导入防抖函数
import { debounce } from './Basic.js';

// 缓存最近一次的直方图数据
let cachedHistogramData = null;
let lastImageDataHash = null;

// 性能监控变量
const performanceStats = {
    calculateTime: 0,
    drawTime: 0,
    calls: 0
};

/**
 * 计算数据的简单哈希值（用于缓存比较）
 * @param {Uint8ClampedArray} data - 图像数据
 * @returns {string} 数据的哈希值
 */
function calculateDataHash(data) {
    // 对于大图像，只采样部分数据进行哈希计算，提高性能
    const sampleSize = Math.min(1000, data.length / 4);
    let hash = 0;
    
    for (let i = 0; i < sampleSize; i++) {
        const index = Math.floor(i * data.length / sampleSize);
        hash = ((hash << 5) - hash) + data[index];
        hash |= 0; // 转换为32位整数
    }
    
    return hash.toString(36);
}

/**
 * 计算直方图数据（带缓存优化）
 * @param {ImageData} imageData - 图像数据
 * @returns {Array} 直方图数据数组
 */
export function calculateHistogram(imageData) {
    if (!imageData || !imageData.data) {
        return null;
    }

    const startTime = performance.now();
    performanceStats.calls++;

    // 计算当前图像数据的哈希值
    const currentHash = calculateDataHash(imageData.data);
    
    // 如果哈希值相同，且有缓存的直方图数据，则直接返回缓存数据
    if (currentHash === lastImageDataHash && cachedHistogramData) {
        return cachedHistogramData;
    }

    const data = imageData.data;
    const histogram = [];
    
    // 初始化直方图数组
    for (let i = 0; i < 256; i++) {
        histogram[i] = { r: 0, g: 0, b: 0, l: 0 };
    }

    // 使用requestAnimationFrame来优化处理大图像时的性能
    // 对于特别大的图像，可以考虑分块处理
    const chunkSize = Math.min(100000, data.length / 4); // 每次处理的像素数量
    
    // 对于中小图像，直接一次性处理
    if (data.length / 4 <= chunkSize * 2) {
        // 计算每个像素的颜色值出现频率
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 计算亮度 (简单的灰度转换公式)
            const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            histogram[r].r++;
            histogram[g].g++;
            histogram[b].b++;
            histogram[l].l++;
        }
    } else {
        // 对于大图像，使用Web Worker进行计算（这里简化处理，实际项目中可以实现完整的Web Worker方案）
        console.warn('大图像检测到，考虑使用Web Worker优化直方图计算');
        // 计算每个像素的颜色值出现频率
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 计算亮度 (简单的灰度转换公式)
            const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            histogram[r].r++;
            histogram[g].g++;
            histogram[b].b++;
            histogram[l].l++;
        }
    }

    // 更新缓存
    cachedHistogramData = histogram;
    lastImageDataHash = currentHash;
    
    // 记录计算时间
    performanceStats.calculateTime = performance.now() - startTime;
    
    return histogram;
}

/**
 * 绘制直方图（优化版本）
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Array} histogramData - 直方图数据
 * @param {string} mode - 显示模式：'luminance' 或 'rgb'
 */
export function drawHistogram(ctx, canvas, histogramData, mode = 'luminance') {
    if (!histogramData || !histogramData.length) {
        drawEmptyHistogram(ctx, canvas);
        return;
    }

    const startTime = performance.now();

    // 使用requestAnimationFrame优化渲染性能
    requestAnimationFrame(() => {
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = Math.max(1, canvas.width / 256);
        
        // 找出最大值用于归一化
        let maxValue = 0;
        for (let i = 0; i < histogramData.length; i++) {
            if (mode === 'rgb') {
                maxValue = Math.max(maxValue, histogramData[i].r, histogramData[i].g, histogramData[i].b);
            } else {
                maxValue = Math.max(maxValue, histogramData[i].l);
            }
        }

        // 优化渲染：对于宽屏画布，考虑降采样处理以减少绘制操作
        const skipStep = Math.max(1, Math.floor(256 / canvas.width));
        
        // 绘制直方图
        for (let i = 0; i < 256; i += skipStep) {
            const x = i * barWidth;
            
            if (mode === 'rgb') {
                // RGB模式：分别绘制红、绿、蓝通道
                const rHeight = (histogramData[i].r / maxValue) * canvas.height;
                const gHeight = (histogramData[i].g / maxValue) * canvas.height;
                const bHeight = (histogramData[i].b / maxValue) * canvas.height;
                
                // 蓝色
                ctx.fillStyle = 'rgba(0, 0, 255, 0.6)';
                ctx.fillRect(x, canvas.height - bHeight, barWidth * skipStep, bHeight);
                
                // 绿色
                ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
                ctx.fillRect(x, canvas.height - gHeight, barWidth * skipStep, gHeight);
                
                // 红色
                ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                ctx.fillRect(x, canvas.height - rHeight, barWidth * skipStep, rHeight);
            } else {
                // 亮度模式
                const height = (histogramData[i].l / maxValue) * canvas.height;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(x, canvas.height - height, barWidth * skipStep, height);
            }
        }
        
        // 绘制坐标轴
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        
        // 底部坐标轴
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 1);
        ctx.lineTo(canvas.width, canvas.height - 1);
        ctx.stroke();
        
        // 左侧坐标轴
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.lineTo(1, canvas.height);
        ctx.stroke();
        
        // 记录绘制时间
        performanceStats.drawTime = performance.now() - startTime;
    });
}

/**
 * 绘制空直方图
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 */
export function drawEmptyHistogram(ctx, canvas) {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置文本样式
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 绘制提示文本
    ctx.fillText('请上传图像以查看直方图', canvas.width / 2, canvas.height / 2);
}

/**
 * 创建防抖处理的直方图更新函数
 * @param {Function} updateFunction - 直方图更新函数
 * @param {number} delay - 防抖延迟时间（毫秒）
 * @returns {Function} 防抖处理后的更新函数
 */
export function createDebouncedHistogramUpdate(updateFunction, delay = 100) {
    return debounce(updateFunction, delay);
}

// 性能统计变量用于内部使用
performanceStats.calculateTime = 0;
performanceStats.drawTime = 0;
performanceStats.calls = 0;

/**
 * 优化的直方图更新函数
 * @param {ImageData} imageData - 图像数据
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {string} mode - 显示模式：'luminance' 或 'rgb'
 */
export async function optimizedUpdateHistogram(imageData, ctx, canvas, mode = 'luminance') {
    try {
        if (!imageData || !imageData.data) {
            drawEmptyHistogram(ctx, canvas);
            return;
        }
        
        // 计算直方图数据（带缓存优化）
        const histogramData = calculateHistogram(imageData);
        
        if (histogramData) {
            // 绘制直方图（带渲染优化）
            drawHistogram(ctx, canvas, histogramData, mode);
        } else {
            drawEmptyHistogram(ctx, canvas);
        }
    } catch (error) {
        console.error('更新直方图时出错:', error);
        drawEmptyHistogram(ctx, canvas);
    }
}