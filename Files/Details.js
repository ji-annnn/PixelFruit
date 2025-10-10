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
    
    // 对每个像素应用非锐化蒙版（跳过边缘像素）
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
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