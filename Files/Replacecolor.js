/**
 * 颜色替换功能模块
 * 基于1.html中的颜色处理逻辑实现
 */

// 颜色替换历史记录
let colorReplaceHistory = [];
let currentEditingIndex = -1;

/**
 * 初始化颜色替换功能
 * @param {Object} elements - DOM元素对象
 * @param {Object} canvas - Canvas相关对象
 * @param {Function} updateImageCallback - 图像更新回调函数
 */
export function initColorReplace(elements, canvas, updateImageCallback) {
    const {
        colorRangeStart,
        colorRangeEnd,
        colorSlider1,
        colorSlider2,
        colorGradientTrack,
        colorRangeContainer,
        mixColorInput,
        mixRatio,
        mixRatioValue,
        previewColorReplace,
        applyColorReplace,
        undoColorReplace,
        colorReplaceResult,
        replacedPixelsCount,
        colorReplaceTableBody
    } = elements;

    const { ctx, canvas: imageCanvas } = canvas;

    // 初始化渐变轨道
    updateGradientTrack();

    // 颜色范围选择器事件监听
    [colorRangeStart, colorRangeEnd].forEach(el => {
        el.addEventListener('input', () => {
            updateGradientTrack();
        });
    });

    // 滑块事件监听
    [colorSlider1, colorSlider2].forEach(el => {
        el.addEventListener('input', () => {
            enforceSliderOrder();
        });
    });

    // 混合比例滑块事件监听
    mixRatio.addEventListener('input', (e) => {
        mixRatioValue.textContent = e.target.value + '%';
    });

    // 渐变轨道点击事件
    colorRangeContainer.addEventListener('click', (e) => {
        const rect = colorRangeContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left - 12) / (rect.width - 24)));
        // 可以根据需要在这里添加点击处理逻辑
    });

    // 按钮事件监听
    previewColorReplace.addEventListener('click', () => {
        previewColorReplaceEffect();
    });

    applyColorReplace.addEventListener('click', () => {
        applyColorReplaceEffect();
    });

    undoColorReplace.addEventListener('click', () => {
        undoLastColorReplace();
    });

    /**
     * 更新渐变轨道
     */
    function updateGradientTrack() {
        colorGradientTrack.style.background = `linear-gradient(to right, ${colorRangeStart.value}, ${colorRangeEnd.value})`;
    }

    /**
     * 强制滑块顺序
     */
    function enforceSliderOrder() {
        if (+colorSlider1.value > +colorSlider2.value) {
            [colorSlider1.value, colorSlider2.value] = [colorSlider2.value, colorSlider1.value];
        }
    }


    /**
     * 预览颜色替换效果
     */
    function previewColorReplaceEffect() {
        if (!imageCanvas || !ctx) {
            alert('请先上传图片！');
            return;
        }

        const startColor = colorRangeStart.value;
        const endColor = colorRangeEnd.value;
        const mixColor = mixColorInput.value;
        const mixRatioValue = parseInt(mixRatio.value) / 100;

        // 找到颜色范围内的像素
        const colorsInRange = findColorsInRange(startColor, endColor);
        
        if (colorsInRange.length === 0) {
            alert('在图片中未找到指定颜色范围内的颜色！');
            return;
        }

        // 创建预览效果（临时修改canvas）
        const originalImageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const previewImageData = new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
        );

        // 应用颜色替换预览
        const replacedPixels = applyColorReplaceToImageData(previewImageData, colorsInRange, mixColor, mixRatioValue);
        
        // 显示预览
        ctx.putImageData(previewImageData, 0, 0);
        
        // 显示结果信息
        showReplaceResult(replacedPixels);
        
        // 3秒后恢复原图
        setTimeout(() => {
            ctx.putImageData(originalImageData, 0, 0);
        }, 3000);
    }

    /**
     * 应用颜色替换效果
     */
    function applyColorReplaceEffect() {
        if (!imageCanvas || !ctx) {
            alert('请先上传图片！');
            return;
        }

        const startColor = colorRangeStart.value;
        const endColor = colorRangeEnd.value;
        const mixColor = mixColorInput.value;
        const mixRatioValue = parseInt(mixRatio.value) / 100;

        // 找到颜色范围内的像素
        const colorsInRange = findColorsInRange(startColor, endColor);
        
        if (colorsInRange.length === 0) {
            alert('在图片中未找到指定颜色范围内的颜色！');
            return;
        }

        // 获取当前图像数据
        const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        
        // 记录原始数据用于撤销
        const originalImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        // 应用颜色替换
        const replacedPixels = applyColorReplaceToImageData(imageData, colorsInRange, mixColor, mixRatioValue);
        
        // 更新canvas
        ctx.putImageData(imageData, 0, 0);
        
        // 保存到历史记录
        const changeRecord = {
            id: Date.now(),
            startColor,
            endColor,
            mixColor,
            mixRatio: mixRatio.value + '%',
            replacedPixels,
            originalImageData,
            colorsInRange: colorsInRange.map(color => ({
                hex: color.hex,
                positions: color.positions.length
            }))
        };

        if (currentEditingIndex >= 0) {
            // 编辑模式：更新现有记录
            colorReplaceHistory[currentEditingIndex] = changeRecord;
            updateHistoryTableRow(currentEditingIndex, changeRecord);
            currentEditingIndex = -1;
        } else {
            // 添加新记录
            colorReplaceHistory.push(changeRecord);
            addHistoryTableRow(changeRecord);
        }

        // 显示结果
        showReplaceResult(replacedPixels);
        
        // 触发图像更新回调
        if (updateImageCallback) {
            updateImageCallback();
        }
    }

    /**
     * 撤销最后一次颜色替换
     */
    function undoLastColorReplace() {
        if (colorReplaceHistory.length === 0) {
            alert('没有可撤销的操作！');
            return;
        }

        const lastChange = colorReplaceHistory[colorReplaceHistory.length - 1];
        
        // 恢复原始图像
        ctx.putImageData(lastChange.originalImageData, 0, 0);
        
        // 从历史记录中移除
        colorReplaceHistory.pop();
        
        // 更新历史表格
        updateHistoryTable();
        
        // 显示撤销成功信息
        showReplaceResult(0, '已撤销最后一次颜色替换');
        
        // 触发图像更新回调
        if (updateImageCallback) {
            updateImageCallback();
        }
    }

    /**
     * 显示替换结果
     */
    function showReplaceResult(count, message = null) {
        if (message) {
            colorReplaceResult.innerHTML = message;
        } else {
            replacedPixelsCount.textContent = count;
            colorReplaceResult.innerHTML = `<span id="replacedPixelsCount">${count}</span> 个像素已替换`;
        }
        
        colorReplaceResult.style.display = 'block';
        
        // 3秒后隐藏
        setTimeout(() => {
            colorReplaceResult.style.display = 'none';
        }, 3000);
    }

    /**
     * 添加历史表格行
     */
    function addHistoryTableRow(changeRecord) {
        const row = document.createElement('tr');
        row.setAttribute('data-change-id', changeRecord.id);
        row.innerHTML = createHistoryTableRowHTML(changeRecord, colorReplaceHistory.length - 1);
        colorReplaceTableBody.appendChild(row);
    }

    /**
     * 更新历史表格行
     */
    function updateHistoryTableRow(index, changeRecord) {
        const row = colorReplaceTableBody.children[index];
        if (row) {
            row.setAttribute('data-change-id', changeRecord.id);
            row.innerHTML = createHistoryTableRowHTML(changeRecord, index);
        }
    }

    /**
     * 创建历史表格行HTML
     */
    function createHistoryTableRowHTML(changeRecord, index) {
        return `
            <td>
                <div class="color-cell">
                    <div class="color-swatch" style="background-color: ${changeRecord.startColor}"></div>
                    <span>${changeRecord.startColor.toUpperCase()}</span>
                </div>
            </td>
            <td>
                <div class="color-cell">
                    <div class="color-swatch" style="background-color: ${changeRecord.endColor}"></div>
                    <span>${changeRecord.endColor.toUpperCase()}</span>
                </div>
            </td>
            <td>
                <div class="color-cell">
                    <div class="color-swatch" style="background-color: ${changeRecord.mixColor}"></div>
                    <span>${changeRecord.mixColor.toUpperCase()}</span>
                </div>
            </td>
            <td>${changeRecord.mixRatio}</td>
            <td>${changeRecord.replacedPixels}</td>
            <td>
                <div class="history-actions">
                    <button class="history-btn edit" onclick="editColorReplace(${index})">编辑</button>
                    <button class="history-btn delete" onclick="deleteColorReplace(${index})">删除</button>
                </div>
            </td>
        `;
    }

    /**
     * 更新历史表格
     */
    function updateHistoryTable() {
        colorReplaceTableBody.innerHTML = '';
        colorReplaceHistory.forEach((record, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-change-id', record.id);
            row.innerHTML = createHistoryTableRowHTML(record, index);
            colorReplaceTableBody.appendChild(row);
        });
    }

    // 暴露全局函数供HTML调用
    window.editColorReplace = function(index) {
        const record = colorReplaceHistory[index];
        if (record) {
            // 设置控件值
            colorRangeStart.value = record.startColor;
            colorRangeEnd.value = record.endColor;
            mixColorInput.value = record.mixColor;
            mixRatio.value = parseInt(record.mixRatio);
            mixRatioValue.textContent = record.mixRatio;
            
            // 更新渐变
            updateGradientTrack();
            
            // 设置编辑状态
            currentEditingIndex = index;
            applyColorReplace.textContent = '更新替换';
        }
    };

    window.deleteColorReplace = function(index) {
        if (confirm('确定要删除这个颜色替换记录吗？')) {
            const record = colorReplaceHistory[index];
            
            // 恢复原始图像
            ctx.putImageData(record.originalImageData, 0, 0);
            
            // 从历史记录中移除
            colorReplaceHistory.splice(index, 1);
            
            // 更新表格
            updateHistoryTable();
            
            // 触发图像更新回调
            if (updateImageCallback) {
                updateImageCallback();
            }
        }
    };
}

/**
 * 在图像中找到指定颜色范围内的所有颜色
 * @param {string} startColor - 起始颜色（十六进制）
 * @param {string} endColor - 结束颜色（十六进制）
 * @returns {Array} 颜色信息数组
 */
function findColorsInRange(startColor, endColor) {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const colorsInRange = [];
    const colorMap = new Map();
    
    const startRgb = hexToRgb(startColor);
    const endRgb = hexToRgb(endColor);
    
    // 遍历所有像素
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a > 0) { // 只处理非透明像素
            const pixelRgb = { r, g, b };
            const pixelHex = rgbToHex(r, g, b);
            
            // 检查是否在颜色范围内
            if (isColorInRange(pixelRgb, startRgb, endRgb)) {
                if (!colorMap.has(pixelHex)) {
                    colorMap.set(pixelHex, {
                        hex: pixelHex,
                        rgb: pixelRgb,
                        positions: []
                    });
                }
                
                // 记录像素位置
                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);
                colorMap.get(pixelHex).positions.push({ x, y, index: i });
            }
        }
    }
    
    // 转换为数组
    colorMap.forEach(color => {
        colorsInRange.push(color);
    });
    
    return colorsInRange;
}

/**
 * 检查颜色是否在指定范围内
 * @param {Object} pixelRgb - 像素RGB值
 * @param {Object} startRgb - 起始RGB值
 * @param {Object} endRgb - 结束RGB值
 * @returns {boolean} 是否在范围内
 */
function isColorInRange(pixelRgb, startRgb, endRgb) {
    // 计算颜色在RGB空间中的位置
    const startToEnd = {
        r: endRgb.r - startRgb.r,
        g: endRgb.g - startRgb.g,
        b: endRgb.b - startRgb.b
    };
    
    const pixelToStart = {
        r: pixelRgb.r - startRgb.r,
        g: pixelRgb.g - startRgb.g,
        b: pixelRgb.b - startRgb.b
    };
    
    // 计算点积来判断是否在范围内
    const dotProduct = pixelToStart.r * startToEnd.r + pixelToStart.g * startToEnd.g + pixelToStart.b * startToEnd.b;
    const startToEndLengthSquared = startToEnd.r * startToEnd.r + startToEnd.g * startToEnd.g + startToEnd.b * startToEnd.b;
    
    if (startToEndLengthSquared === 0) {
        // 如果起始和结束颜色相同，直接比较
        return pixelRgb.r === startRgb.r && pixelRgb.g === startRgb.g && pixelRgb.b === startRgb.b;
    }
    
    // 计算投影比例
    const projectionRatio = dotProduct / startToEndLengthSquared;
    
    // 检查是否在0到1之间（在起始和结束之间）
    if (projectionRatio >= 0 && projectionRatio <= 1) {
        // 计算到直线的距离
        const projectedPoint = {
            r: startRgb.r + projectionRatio * startToEnd.r,
            g: startRgb.g + projectionRatio * startToEnd.g,
            b: startRgb.b + projectionRatio * startToEnd.b
        };
        
        const distance = Math.sqrt(
            Math.pow(pixelRgb.r - projectedPoint.r, 2) +
            Math.pow(pixelRgb.g - projectedPoint.g, 2) +
            Math.pow(pixelRgb.b - projectedPoint.b, 2)
        );
        
        // 设置容差范围
        const tolerance = 30;
        return distance <= tolerance;
    }
    
    return false;
}

/**
 * 应用颜色替换到图像数据
 * @param {ImageData} imageData - 图像数据
 * @param {Array} colorsInRange - 范围内的颜色
 * @param {string} mixColor - 混合颜色
 * @param {number} mixRatio - 混合比例
 * @returns {number} 替换的像素数量
 */
function applyColorReplaceToImageData(imageData, colorsInRange, mixColor, mixRatio) {
    const data = imageData.data;
    const mixRgb = hexToRgb(mixColor);
    let replacedPixels = 0;
    
    colorsInRange.forEach(color => {
        const mixedRgb = mixColors(color.rgb, mixRgb, mixRatio);
        
        color.positions.forEach(position => {
            const index = position.index;
            
            // 更新像素颜色
            data[index] = mixedRgb.r;     // Red
            data[index + 1] = mixedRgb.g; // Green
            data[index + 2] = mixedRgb.b; // Blue
            // Alpha保持不变
            
            replacedPixels++;
        });
    });
    
    return replacedPixels;
}

/**
 * 混合两个颜色
 * @param {Object} color1 - 第一个颜色RGB
 * @param {Object} color2 - 第二个颜色RGB
 * @param {number} ratio - 混合比例 (0-1)
 * @returns {Object} 混合后的RGB颜色
 */
function mixColors(color1, color2, ratio = 0.5) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
    
    return { r, g, b };
}

/**
 * 获取渐变颜色
 * @param {string} color1 - 起始颜色（十六进制）
 * @param {string} color2 - 结束颜色（十六进制）
 * @param {number} position - 位置 (0-1)
 * @returns {string} 渐变颜色（十六进制）
 */
function getGradientColor(color1, color2, position) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * position);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * position);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * position);
    return rgbToHex(r, g, b);
}

/**
 * 十六进制颜色转RGB
 * @param {string} hex - 十六进制颜色
 * @returns {Object} RGB颜色对象
 */
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * RGB颜色转十六进制
 * @param {number} r - 红色值
 * @param {number} g - 绿色值
 * @param {number} b - 蓝色值
 * @returns {string} 十六进制颜色
 */
function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

/**
 * 获取颜色替换历史记录
 * @returns {Array} 历史记录数组
 */
export function getColorReplaceHistory() {
    return colorReplaceHistory;
}

/**
 * 清空颜色替换历史记录
 */
export function clearColorReplaceHistory() {
    colorReplaceHistory = [];
    currentEditingIndex = -1;
}
