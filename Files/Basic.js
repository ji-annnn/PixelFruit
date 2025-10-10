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
 * 更新图像从缓存
 * @param {Uint8ClampedArray} cachedImageData - 缓存的图像数据
 * @param {number} width - 图像宽度
 * @param {number} height - 图像高度
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {HTMLCanvasElement} canvas - 主画布元素
 * @param {Function} applyAdjustmentsToCachedData - 应用调整到缓存数据的函数
 */
export async function updateImageFromCache(cachedImageData, width, height, ctx, canvas, applyAdjustmentsToCachedData) {
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
        
        // 尝试从Correction.js导入校正模块
        try {
            const { correctionModule } = await import('./Correction.js');
            // 使用校正模块应用透视变换
            correctionModule.applyPerspectiveTransform(imageData, ctx, canvas);
        } catch (importError) {
            // 如果导入失败，回退到原始的透视变换实现
            console.warn('无法导入Correction.js模块，使用回退的透视变换实现:', importError);
            
            // 回退实现：直接绘制图像
            ctx.putImageData(imageData, 0, 0);
        }
    } catch (error) {
        console.error('从缓存更新图像时出错:', error);
    }
}



/**
 * 导出图像为指定格式
 * @param {HTMLCanvasElement} canvas - 要导出的画布元素
 * @param {string} format - 导出格式 ('png' 或 'jpeg')
 * @param {number} quality - 导出质量 (0-1, 仅对jpeg有效)
 * @param {string} filename - 导出的文件名
 * @returns {Promise<void>} 导出完成的Promise
 */
export function exportImage(canvas, format = 'png', quality = 0.9, filename = 'exported-image') {
    return new Promise((resolve, reject) => {
        try {
            // 验证格式
            format = format.toLowerCase();
            if (!['png', 'jpeg', 'jpg'].includes(format)) {
                format = 'png'; // 默认使用png格式
            }
            
            // 验证质量参数
            quality = Math.max(0, Math.min(1, quality));
            
            // 确保文件名没有扩展名
            filename = filename.replace(/\.(png|jpeg|jpg)$/i, '');
            
            // 添加正确的文件扩展名
            const extension = format === 'jpg' ? 'jpeg' : format;
            const fullFilename = `${filename}.${extension}`;
            
            // 转换canvas为数据URL
            const dataURL = canvas.toDataURL(`image/${extension}`, quality);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = fullFilename;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                resolve();
            }, 100);
        } catch (error) {
            console.error('导出图像时出错:', error);
            reject(error);
        }
    });
}