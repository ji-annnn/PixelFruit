/**
 * 图像处理细节模块
 * 包含锐化、降噪和纹理处理功能
 */

/**
 * 应用锐化（简化版的非锐化蒙版）
 * @param {Uint8ClampedArray} rgbaData - RGBA图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} sharpness - 锐化强度 (0-100)
 * @param {number} texture - 纹理/清晰度调整 (-50-50)
 */
export function applyUnsharpMask(rgbaData, width, height, sharpness, texture) {
    if (sharpness === 0 && texture === 0) return;
    
    // 创建临时数组以存储处理前的像素值
    const tempData = new Uint8ClampedArray(rgbaData);
    
    const strength = (sharpness + texture) / 100;
    
    // 检查是否正在拖动滑块（优化性能）
    // 使用try-catch以防window.isSliderDragging不存在
    let isDragging = false;
    try {
        if (typeof window.isSliderDragging === 'function') {
            isDragging = window.isSliderDragging();
        }
    } catch (e) {
        console.warn('无法检测滑块拖动状态:', e);
    }
    
    // 优化：拖动时使用步进处理减少计算量
    const step = isDragging ? 2 : 1;
    
    // 对每个像素应用非锐化蒙版（跳过边缘像素）
    for (let y = 1; y < height - 1; y += step) {
        for (let x = 1; x < width - 1; x += step) {
            const idx = (y * width + x) * 4;
            
            // 计算周围像素的平均值
            let avgR = 0, avgG = 0, avgB = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    if (kx === 0 && ky === 0) continue; // 跳过中心像素
                    const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
                    avgR += tempData[neighborIdx];
                    avgG += tempData[neighborIdx + 1];
                    avgB += tempData[neighborIdx + 2];
                }
            }
            avgR /= 8;
            avgG /= 8;
            avgB /= 8;
            
            // 计算锐化值
            const currentR = tempData[idx];
            const currentG = tempData[idx + 1];
            const currentB = tempData[idx + 2];
            
            // 应用锐化
            rgbaData[idx] = Math.min(255, Math.max(0, currentR + (currentR - avgR) * strength));
            rgbaData[idx + 1] = Math.min(255, Math.max(0, currentG + (currentG - avgG) * strength));
            rgbaData[idx + 2] = Math.min(255, Math.max(0, currentB + (currentB - avgB) * strength));
            
            // 如果是步进处理，同时更新相邻像素
            if (step > 1 && y + 1 < height - 1 && x + 1 < width - 1) {
                // 复制计算结果到右侧像素
                rgbaData[(y * width + x + 1) * 4] = rgbaData[idx];
                rgbaData[(y * width + x + 1) * 4 + 1] = rgbaData[idx + 1];
                rgbaData[(y * width + x + 1) * 4 + 2] = rgbaData[idx + 2];
                
                // 复制计算结果到下方像素
                rgbaData[((y + 1) * width + x) * 4] = rgbaData[idx];
                rgbaData[((y + 1) * width + x) * 4 + 1] = rgbaData[idx + 1];
                rgbaData[((y + 1) * width + x) * 4 + 2] = rgbaData[idx + 2];
                
                // 复制计算结果到右下角像素
                rgbaData[((y + 1) * width + x + 1) * 4] = rgbaData[idx];
                rgbaData[((y + 1) * width + x + 1) * 4 + 1] = rgbaData[idx + 1];
                rgbaData[((y + 1) * width + x + 1) * 4 + 2] = rgbaData[idx + 2];
            }
        }
    }
}

/**
 * 实现锐化函数，使用现有的applyUnsharpMask函数
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} sharpness - 锐化强度
 */
export function applySharpness(data, width, height, sharpness) {
    if (sharpness <= 0) return;
    
    // 由于applyUnsharpMask需要两个参数，我们可以将texture设为0，只使用锐化参数
    const texture = 0;
    applyUnsharpMask(data, width, height, sharpness, texture);
}

/**
 * 应用均值滤波降噪算法
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {Uint8ClampedArray} tempData - 临时数组存储处理前的像素值
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 降噪强度
 * @param {number} detailPreservation - 细节保留程度 (0-100)
 */
function applyMeanFilter(data, tempData, width, height, strength, detailPreservation) {
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // 计算周围像素的平均值
            let avgR = 0, avgG = 0, avgB = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
                    avgR += tempData[neighborIdx];
                    avgG += tempData[neighborIdx + 1];
                    avgB += tempData[neighborIdx + 2];
                }
            }
            avgR /= 9;
            avgG /= 9;
            avgB /= 9;
            
            // 应用降噪强度和细节保留
            const currentR = tempData[idx];
            const currentG = tempData[idx + 1];
            const currentB = tempData[idx + 2];
            
            // 计算边缘因子 - 基于当前像素与平均值的差异
            const edgeFactorR = Math.abs(currentR - avgR) / 255;
            const edgeFactorG = Math.abs(currentG - avgG) / 255;
            const edgeFactorB = Math.abs(currentB - avgB) / 255;
            const avgEdgeFactor = (edgeFactorR + edgeFactorG + edgeFactorB) / 3;
            
            // 细节保留系数 - 边缘区域保留更多细节
            const detailFactor = Math.min(1, avgEdgeFactor * (detailPreservation / 50));
            
            // 降噪强度和细节保留的综合因子
            const effectiveStrength = (strength / 100) * (1 - detailFactor);
            
            // 加权平均：降噪后的像素值 = 原始值*(1-降噪强度) + 平均值*降噪强度
            data[idx] = Math.min(255, Math.max(0, currentR * (1 - effectiveStrength) + avgR * effectiveStrength));
            data[idx + 1] = Math.min(255, Math.max(0, currentG * (1 - effectiveStrength) + avgG * effectiveStrength));
            data[idx + 2] = Math.min(255, Math.max(0, currentB * (1 - effectiveStrength) + avgB * effectiveStrength));
        }
    }
}

/**
 * 应用中值滤波降噪算法（对椒盐噪声效果较好）
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {Uint8ClampedArray} tempData - 临时数组存储处理前的像素值
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 降噪强度
 */
function applyMedianFilter(data, tempData, width, height, strength) {
    // 中值滤波的强度影响
    const applyMedian = strength >= 50; // 超过50%强度时应用中值滤波
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // 收集周围像素的颜色值
            const rValues = [];
            const gValues = [];
            const bValues = [];
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
                    rValues.push(tempData[neighborIdx]);
                    gValues.push(tempData[neighborIdx + 1]);
                    bValues.push(tempData[neighborIdx + 2]);
                }
            }
            
            // 排序并获取中值
            rValues.sort((a, b) => a - b);
            gValues.sort((a, b) => a - b);
            bValues.sort((a, b) => a - b);
            
            const medianR = rValues[4]; // 第5个元素是中值
            const medianG = gValues[4];
            const medianB = bValues[4];
            
            const currentR = tempData[idx];
            const currentG = tempData[idx + 1];
            const currentB = tempData[idx + 2];
            
            // 根据强度混合原始值和中值
            const mixFactor = applyMedian ? (strength / 100) : 0.5 * (strength / 100);
            
            data[idx] = Math.min(255, Math.max(0, currentR * (1 - mixFactor) + medianR * mixFactor));
            data[idx + 1] = Math.min(255, Math.max(0, currentG * (1 - mixFactor) + medianG * mixFactor));
            data[idx + 2] = Math.min(255, Math.max(0, currentB * (1 - mixFactor) + medianB * mixFactor));
        }
    }
}

/**
 * 应用高斯滤波降噪算法（更平滑的降噪效果）
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {Uint8ClampedArray} tempData - 临时数组存储处理前的像素值
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 降噪强度
 */
function applyGaussianFilter(data, tempData, width, height, strength) {
    // 简单的5x5高斯核近似（中间权重更高）
    const kernel = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ];
    const kernelSum = 16; // 核的总和，用于归一化
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // 使用高斯核计算加权平均值
            let weightedR = 0, weightedG = 0, weightedB = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
                    const kernelWeight = kernel[ky + 1][kx + 1];
                    
                    weightedR += tempData[neighborIdx] * kernelWeight;
                    weightedG += tempData[neighborIdx + 1] * kernelWeight;
                    weightedB += tempData[neighborIdx + 2] * kernelWeight;
                }
            }
            
            // 归一化
            const gaussianR = weightedR / kernelSum;
            const gaussianG = weightedG / kernelSum;
            const gaussianB = weightedB / kernelSum;
            
            const currentR = tempData[idx];
            const currentG = tempData[idx + 1];
            const currentB = tempData[idx + 2];
            
            // 根据强度混合原始值和高斯滤波值
            const mixFactor = strength / 100;
            
            data[idx] = Math.min(255, Math.max(0, currentR * (1 - mixFactor) + gaussianR * mixFactor));
            data[idx + 1] = Math.min(255, Math.max(0, currentG * (1 - mixFactor) + gaussianG * mixFactor));
            data[idx + 2] = Math.min(255, Math.max(0, currentB * (1 - mixFactor) + gaussianB * mixFactor));
        }
    }
}

/**
 * 增强版降噪功能
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 降噪强度 (0-100)
 * @param {string} type - 降噪类型 ('mean', 'median', 'gaussian')
 * @param {number} detailPreservation - 细节保留程度 (0-100)
 */
export function applyNoiseReduction(data, width, height, strength, type = 'mean', detailPreservation = 50) {
    if (strength <= 0) return;
    
    // 创建临时数组以存储处理前的像素值
    const tempData = new Uint8ClampedArray(data);
    
    // 根据选择的降噪类型应用不同的算法
    switch (type) {
        case 'median':
            applyMedianFilter(data, tempData, width, height, strength);
            break;
        case 'gaussian':
            applyGaussianFilter(data, tempData, width, height, strength);
            break;
        case 'mean':
        default:
            applyMeanFilter(data, tempData, width, height, strength, detailPreservation);
            break;
    }
}

/**
 * 检测像素是否为肤色
 * @param {number} r - 红色通道
 * @param {number} g - 绿色通道
 * @param {number} b - 蓝色通道
 * @returns {number} 返回0-1之间的肤色匹配度
 */
function isSkinColor(r, g, b) {
    // 方法1: RGB范围检测（放宽条件）
    const condition1 = (r > 80 && g > 30 && b > 15) && 
                       (Math.max(r, g, b) - Math.min(r, g, b) > 10) &&
                       (Math.abs(r - g) > 10 && r > g && r > b);
    
    // 方法2: YUV色彩空间检测（放宽条件）
    const y = r * 0.299 + g * 0.587 + b * 0.114;
    const u = r * -0.14713 + g * -0.28886 + b * 0.436;
    const v = r * 0.615 + g * -0.51499 + b * -0.10001;
    
    const condition2 = y > 60 && y < 240 && u > 0 && u < 150 && v > 5 && v < 120;
    
    // 方法3: 肤色的归一化RGB检测（放宽条件）
    const sum = r + g + b;
    if (sum === 0) return 0;
    const nr = r / sum;
    const ng = g / sum;
    const nb = b / sum;
    
    const condition3 = nr > 0.20 && nr < 0.50 && 
                       ng > 0.25 && ng < 0.45 && 
                       nb > 0.20 && nb < 0.45;
    
    // 方法4: 简单的肤色范围检测
    const condition4 = (r > g && g > b) && (r - b > 20) && (r > 100);
    
    // 结合多种检测方法，降低阈值
    let skinScore = 0;
    if (condition1) skinScore += 0.3;
    if (condition2) skinScore += 0.25;
    if (condition3) skinScore += 0.25;
    if (condition4) skinScore += 0.2;
    
    return Math.min(1, skinScore);
}

/**
 * 应用面部美白效果
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 美白强度 (0-100)
 * @param {number} smoothness - 过渡平滑度 (0-100)
 */
export function applyFaceBrightening(data, width, height, strength, smoothness = 50) {
    if (strength <= 0) return;
    
    console.log(`应用面部美白: 强度=${strength}, 平滑度=${smoothness}, 图像尺寸=${width}x${height}`);
    
    // 创建临时数组存储原始数据
    const tempData = new Uint8ClampedArray(data);
    
    // 创建肤色蒙版
    const skinMask = new Float32Array(width * height);
    
    // 第一遍：生成肤色蒙版
    let skinPixelCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = tempData[idx];
            const g = tempData[idx + 1];
            const b = tempData[idx + 2];
            
            const skinScore = isSkinColor(r, g, b);
            skinMask[y * width + x] = skinScore;
            if (skinScore > 0.5) skinPixelCount++;
        }
    }
    
    console.log(`检测到肤色像素: ${skinPixelCount}/${width * height} (${(skinPixelCount / (width * height) * 100).toFixed(1)}%)`);
    
    // 第二遍：对蒙版进行平滑处理
    if (smoothness > 0) {
        const smoothRadius = Math.floor(smoothness / 20); // 平滑半径
        const smoothedMask = new Float32Array(skinMask);
        
        for (let y = smoothRadius; y < height - smoothRadius; y++) {
            for (let x = smoothRadius; x < width - smoothRadius; x++) {
                let sum = 0;
                let count = 0;
                
                for (let ky = -smoothRadius; ky <= smoothRadius; ky++) {
                    for (let kx = -smoothRadius; kx <= smoothRadius; kx++) {
                        const ny = y + ky;
                        const nx = x + kx;
                        sum += skinMask[ny * width + nx];
                        count++;
                    }
                }
                
                smoothedMask[y * width + x] = sum / count;
            }
        }
        
        // 应用平滑后的蒙版
        for (let i = 0; i < skinMask.length; i++) {
            skinMask[i] = smoothedMask[i];
        }
    }
    
    // 第三遍：应用美白效果
    const whiteningFactor = strength / 100;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const maskValue = skinMask[y * width + x];
            
            if (maskValue > 0) {
                const r = tempData[idx];
                const g = tempData[idx + 1];
                const b = tempData[idx + 2];
                
                // 根据蒙版值调整美白强度
                const effectiveStrength = maskValue * whiteningFactor;
                
                // 美白算法：增加亮度，减少饱和度，调整色温
                // 1. 增加整体亮度
                const brightnessBoost = 1 + effectiveStrength * 0.3; // 最大增加30%亮度
                
                // 2. 减少红色分量（减少黄调）
                const redReduction = effectiveStrength * 0.2; // 最大减少20%红色
                
                // 3. 增加蓝色分量（增加冷调）
                const blueBoost = 1 + effectiveStrength * 0.15; // 最大增加15%蓝色
                
                // 4. 减少饱和度（让颜色更接近白色）
                const saturationReduction = effectiveStrength * 0.4; // 最大减少40%饱和度
                
                // 应用美白效果
                let newR = Math.min(255, Math.max(0, r * brightnessBoost * (1 - redReduction)));
                let newG = Math.min(255, Math.max(0, g * brightnessBoost));
                let newB = Math.min(255, Math.max(0, b * brightnessBoost * blueBoost));
                
                // 减少饱和度：向灰度值靠拢
                const gray = (newR + newG + newB) / 3;
                newR = newR * (1 - saturationReduction) + gray * saturationReduction;
                newG = newG * (1 - saturationReduction) + gray * saturationReduction;
                newB = newB * (1 - saturationReduction) + gray * saturationReduction;
                
                // 最终应用
                data[idx] = Math.min(255, Math.max(0, newR));
                data[idx + 1] = Math.min(255, Math.max(0, newG));
                data[idx + 2] = Math.min(255, Math.max(0, newB));
            }
        }
    }
}