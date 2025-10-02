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
 * 实现降噪函数
 * @param {Uint8ClampedArray} data - RGBA图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {number} strength - 降噪强度
 */
export function applyNoiseReduction(data, width, height, strength) {
    if (strength <= 0) return;
    
    // 创建临时数组以存储处理前的像素值
    const tempData = new Uint8ClampedArray(data);
    
    // 高斯模糊用于降噪
    // 使用简单的3x3均值滤波器作为基础降噪算法
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
            
            // 应用降噪强度，保留部分原始图像细节
            const currentR = tempData[idx];
            const currentG = tempData[idx + 1];
            const currentB = tempData[idx + 2];
            
            const reductionFactor = strength / 100;
            
            // 加权平均：降噪后的像素值 = 原始值*(1-降噪强度) + 平均值*降噪强度
            data[idx] = Math.min(255, Math.max(0, currentR * (1 - reductionFactor) + avgR * reductionFactor));
            data[idx + 1] = Math.min(255, Math.max(0, currentG * (1 - reductionFactor) + avgG * reductionFactor));
            data[idx + 2] = Math.min(255, Math.max(0, currentB * (1 - reductionFactor) + avgB * reductionFactor));
        }
    }
}