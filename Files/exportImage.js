/**
 * 图像导出模块
 * 处理PNG和JPEG格式的图像导出功能
 */

/**
 * 导出图像为指定格式
 * @param {HTMLCanvasElement} canvas - 要导出的画布元素
 * @param {string} format - 导出格式 ('png' 或 'jpeg')
 * @param {number} quality - 图像质量 (0-1，仅对JPEG有效)
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {Promise<void>}
 */
export function exportImage(canvas, format = 'png', quality = 0.9, filename = 'exported-image') {
    return new Promise((resolve, reject) => {
        try {
            // 验证输入参数
            if (!canvas || !canvas.getContext) {
                reject(new Error('无效的画布元素'));
                return;
            }

            if (!['png', 'jpeg', 'jpg'].includes(format.toLowerCase())) {
                reject(new Error('不支持的导出格式'));
                return;
            }

            // 确保质量参数在有效范围内
            quality = Math.max(0, Math.min(1, quality));

            // 生成完整的文件名
            const fileExtension = format.toLowerCase() === 'png' ? 'png' : 'jpg';
            const fullFilename = `${filename}.${fileExtension}`;

            // 创建下载链接
            const link = document.createElement('a');
            link.download = fullFilename;

            // 根据格式设置MIME类型和质量
            let mimeType;
            let exportOptions = {};

            if (format.toLowerCase() === 'png') {
                mimeType = 'image/png';
                // PNG格式不支持质量参数
                link.href = canvas.toDataURL(mimeType);
            } else {
                mimeType = 'image/jpeg';
                exportOptions = { quality: quality };
                link.href = canvas.toDataURL(mimeType, quality);
            }

            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`图像已导出: ${fullFilename}`);
            resolve();
        } catch (error) {
            console.error('导出图像时出错:', error);
            reject(error);
        }
    });
}

/**
 * 导出高质量PNG图像
 * @param {HTMLCanvasElement} canvas - 要导出的画布元素
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {Promise<void>}
 */
export function exportPNG(canvas, filename = 'exported-image') {
    return exportImage(canvas, 'png', 1.0, filename);
}

/**
 * 导出JPEG图像
 * @param {HTMLCanvasElement} canvas - 要导出的画布元素
 * @param {number} quality - 图像质量 (0-1)
 * @param {string} filename - 文件名（不含扩展名）
 * @returns {Promise<void>}
 */
export function exportJPEG(canvas, quality = 0.9, filename = 'exported-image') {
    return exportImage(canvas, 'jpeg', quality, filename);
}

/**
 * 批量导出多种格式
 * @param {HTMLCanvasElement} canvas - 要导出的画布元素
 * @param {string} filename - 文件名（不含扩展名）
 * @param {Object} options - 导出选项
 * @param {number} options.jpegQuality - JPEG质量 (0-1)
 * @param {boolean} options.exportPNG - 是否导出PNG
 * @param {boolean} options.exportJPEG - 是否导出JPEG
 * @returns {Promise<void>}
 */
export async function exportMultipleFormats(canvas, filename = 'exported-image', options = {}) {
    const {
        jpegQuality = 0.9,
        exportPNG = true,
        exportJPEG = true
    } = options;

    const promises = [];

    if (exportPNG) {
        promises.push(exportPNG(canvas, filename));
    }

    if (exportJPEG) {
        promises.push(exportJPEG(canvas, jpegQuality, filename));
    }

    try {
        await Promise.all(promises);
        console.log('批量导出完成');
    } catch (error) {
        console.error('批量导出失败:', error);
        throw error;
    }
}

/**
 * 获取画布的数据URL
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {string} format - 格式 ('png' 或 'jpeg')
 * @param {number} quality - 质量 (0-1)
 * @returns {string} 数据URL
 */
export function getCanvasDataURL(canvas, format = 'png', quality = 0.9) {
    if (!canvas || !canvas.getContext) {
        throw new Error('无效的画布元素');
    }

    const mimeType = format.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
    
    if (format.toLowerCase() === 'png') {
        return canvas.toDataURL(mimeType);
    } else {
        return canvas.toDataURL(mimeType, quality);
    }
}

/**
 * 验证导出参数
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {string} format - 导出格式
 * @param {number} quality - 质量参数
 * @returns {Object} 验证结果
 */
export function validateExportParams(canvas, format, quality) {
    const errors = [];

    if (!canvas || !canvas.getContext) {
        errors.push('无效的画布元素');
    }

    if (!['png', 'jpeg', 'jpg'].includes(format.toLowerCase())) {
        errors.push('不支持的导出格式');
    }

    if (typeof quality !== 'number' || quality < 0 || quality > 1) {
        errors.push('质量参数必须在0-1之间');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}
