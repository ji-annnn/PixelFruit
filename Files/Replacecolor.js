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
        targetColorStart,
        targetColorEnd,
        targetColorGradientTrack,
        targetColorRangeContainer,
        mixRatio,
        mixRatioValue,
        colorTolerance,
        colorToleranceValue,
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
    updateTargetGradientTrack();

    // 颜色范围选择器事件监听
    [colorRangeStart, colorRangeEnd].forEach(el => {
        el.addEventListener('input', () => {
            updateGradientTrack();
        });
    });

    // 目标颜色范围选择器事件监听
    [targetColorStart, targetColorEnd].forEach(el => {
        el.addEventListener('input', () => {
            updateTargetGradientTrack();
        });
    });

    // 滑块事件监听 - 优化双滑块交互
    [colorSlider1, colorSlider2].forEach((el, index) => {
        // 添加鼠标事件来改善交互
        el.addEventListener('mousedown', (e) => {
            // 将当前滑块置于最前
            el.style.zIndex = '10';
            const otherSlider = index === 0 ? colorSlider2 : colorSlider1;
            otherSlider.style.zIndex = '5';
        });
        
        el.addEventListener('mouseup', () => {
            // 恢复默认层级
            el.style.zIndex = index === 0 ? '2' : '3';
        });
        
        el.addEventListener('input', () => {
            enforceSliderOrder();
            updateGradientTrack(); // 更新渐变显示
        });
        
        // 添加触摸事件支持（移动设备）
        el.addEventListener('touchstart', (e) => {
            el.style.zIndex = '10';
            const otherSlider = index === 0 ? colorSlider2 : colorSlider1;
            otherSlider.style.zIndex = '5';
        });
        
        el.addEventListener('touchend', () => {
            el.style.zIndex = index === 0 ? '2' : '3';
        });
    });

    // 混合比例滑块事件监听
    mixRatio.addEventListener('input', (e) => {
        mixRatioValue.textContent = e.target.value + '%';
    });

    // 颜色容差滑块事件监听
    colorTolerance.addEventListener('input', (e) => {
        colorToleranceValue.textContent = e.target.value;
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
     * 更新目标渐变轨道
     */
    function updateTargetGradientTrack() {
        targetColorGradientTrack.style.background = `linear-gradient(to right, ${targetColorStart.value}, ${targetColorEnd.value})`;
    }

    /**
     * 强制滑块顺序 - 优化版
     */
    function enforceSliderOrder() {
        const val1 = +colorSlider1.value;
        const val2 = +colorSlider2.value;
        
        // 如果滑块1的值大于滑块2，交换它们
        if (val1 > val2) {
            colorSlider1.value = val2;
            colorSlider2.value = val1;
            
            // 添加视觉反馈
            colorSlider1.style.transform = 'scale(1.05)';
            colorSlider2.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                colorSlider1.style.transform = 'scale(1)';
                colorSlider2.style.transform = 'scale(1)';
            }, 200);
        }
        
        // 确保滑块值在有效范围内
        colorSlider1.value = Math.max(0, Math.min(100, colorSlider1.value));
        colorSlider2.value = Math.max(0, Math.min(100, colorSlider2.value));
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
        const targetStartColor = targetColorStart.value;
        const targetEndColor = targetColorEnd.value;
        const mixRatioValue = parseInt(mixRatio.value) / 100;
        const tolerance = parseInt(colorTolerance.value);

        // 找到颜色范围内的像素
        const colorsInRange = findColorsInRange(startColor, endColor, tolerance);
        
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
        const replacedPixels = applyColorReplaceToImageData(previewImageData, colorsInRange, startColor, endColor, targetStartColor, targetEndColor, mixRatioValue);
        
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
        console.log('开始应用颜色替换...');
        
        if (!imageCanvas || !ctx) {
            alert('请先上传图片！');
            return;
        }

        const startColor = colorRangeStart.value;
        const endColor = colorRangeEnd.value;
        const targetStartColor = targetColorStart.value;
        const targetEndColor = targetColorEnd.value;
        const mixRatioValue = parseInt(mixRatio.value) / 100;
        const tolerance = parseInt(colorTolerance.value);

        console.log('颜色设置:', {
            startColor,
            endColor,
            targetStartColor,
            targetEndColor,
            mixRatioValue,
            tolerance
        });

        // 找到颜色范围内的像素
        const colorsInRange = findColorsInRange(startColor, endColor, tolerance);
        console.log('找到的颜色数量:', colorsInRange.length);
        
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
        const replacedPixels = applyColorReplaceToImageData(imageData, colorsInRange, startColor, endColor, targetStartColor, targetEndColor, mixRatioValue);
        console.log('替换的像素数量:', replacedPixels);
        
        // 更新canvas
        ctx.putImageData(imageData, 0, 0);
        console.log('Canvas已更新');
        
        // 保存颜色替换后的基准数据，用于后续基本设置调整
        if (window.saveColorReplaceBaseData) {
            window.saveColorReplaceBaseData(imageData);
        }
        
        // 保存到历史记录
        const changeRecord = {
            id: Date.now(),
            startColor,
            endColor,
            targetStartColor,
            targetEndColor,
            mixRatio: mixRatio.value + '%',
            tolerance: tolerance,
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
        
        // 更新UI组件（直方图、图像详情等）
        updateUIComponents();
        
        console.log('颜色替换完成，已更新UI组件');
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
        
        // 清除颜色替换基准数据
        if (window.clearColorReplaceBaseData) {
            window.clearColorReplaceBaseData();
        }
        
        // 从历史记录中移除
        colorReplaceHistory.pop();
        
        // 更新历史表格
        updateHistoryTable();
        
        // 显示撤销成功信息
        showReplaceResult(0, '已撤销最后一次颜色替换');
        
        // 更新UI组件（直方图、图像详情等）
        updateUIComponents();
        
        console.log('颜色替换撤销完成，已更新UI组件');
    }

    /**
     * 更新UI组件（直方图、图像详情等）
     */
    function updateUIComponents() {
        // 更新直方图
        if (window.updateHistogram) {
            window.updateHistogram();
        }
        
        // 更新图像详情
        if (window.refreshImageDetails) {
            window.refreshImageDetails();
        }
        
        // 清除颜色缓存，因为图像已经改变
        clearColorCache();
        
        // 清除主程序的图像处理缓存，确保细节处理从当前Canvas状态开始
        if (window.clearImageProcessingCache) {
            window.clearImageProcessingCache();
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
                    <div class="color-swatch" style="background-color: ${changeRecord.targetStartColor}"></div>
                    <span>${changeRecord.targetStartColor.toUpperCase()}</span>
                </div>
            </td>
            <td>
                <div class="color-cell">
                    <div class="color-swatch" style="background-color: ${changeRecord.targetEndColor}"></div>
                    <span>${changeRecord.targetEndColor.toUpperCase()}</span>
                </div>
            </td>
            <td>${changeRecord.mixRatio}</td>
            <td>${changeRecord.tolerance || 60}</td>
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
    window.getColorReplaceHistory = getColorReplaceHistory;
    
    window.editColorReplace = function(index) {
        const record = colorReplaceHistory[index];
        if (record) {
            // 设置控件值
            colorRangeStart.value = record.startColor;
            colorRangeEnd.value = record.endColor;
            targetColorStart.value = record.targetStartColor;
            targetColorEnd.value = record.targetEndColor;
            mixRatio.value = parseInt(record.mixRatio);
            mixRatioValue.textContent = record.mixRatio;
            
            // 设置容差值（如果历史记录中有的话）
            if (record.tolerance !== undefined) {
                colorTolerance.value = record.tolerance;
                colorToleranceValue.textContent = record.tolerance;
            }
            
            // 更新渐变
            updateGradientTrack();
            updateTargetGradientTrack();
            
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
            
            // 清除颜色替换基准数据
            if (window.clearColorReplaceBaseData) {
                window.clearColorReplaceBaseData();
            }
            
            // 从历史记录中移除
            colorReplaceHistory.splice(index, 1);
            
            // 更新表格
            updateHistoryTable();
            
            // 更新UI组件（直方图、图像详情等）
            updateUIComponents();
            
            console.log('颜色替换删除完成，已更新UI组件');
        }
    };
}

// 颜色缓存，避免重复计算
const colorCache = new Map();

/**
 * 在图像中找到指定颜色范围内的所有颜色
 * @param {string} startColor - 起始颜色（十六进制）
 * @param {string} endColor - 结束颜色（十六进制）
 * @param {number} tolerance - 颜色容差（可选，默认60）
 * @returns {Array} 颜色信息数组
 */
function findColorsInRange(startColor, endColor, tolerance = 60) {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    
    // 创建缓存键（包含容差值）
    const cacheKey = `${startColor}-${endColor}-${tolerance}-${canvas.width}-${canvas.height}`;
    
    // 检查缓存
    if (colorCache.has(cacheKey)) {
        return colorCache.get(cacheKey);
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const colorsInRange = [];
    const colorMap = new Map();
    
    const startRgb = hexToRgb(startColor);
    const endRgb = hexToRgb(endColor);
    
    // 预计算一些值以提高性能
    const startToEnd = {
        r: endRgb.r - startRgb.r,
        g: endRgb.g - startRgb.g,
        b: endRgb.b - startRgb.b
    };
    const startToEndLengthSquared = startToEnd.r * startToEnd.r + startToEnd.g * startToEnd.g + startToEnd.b * startToEnd.b;
    const isSameColor = startToEndLengthSquared === 0;
    
    // 批量处理像素，减少函数调用
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a > 0) { // 只处理非透明像素
            const pixelRgb = { r, g, b };
            const pixelHex = rgbToHex(r, g, b);
            
            // 检查是否在颜色范围内
            if (isColorInRangeOptimized(pixelRgb, startRgb, endRgb, startToEnd, startToEndLengthSquared, isSameColor, tolerance)) {
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
    
    // 缓存结果
    colorCache.set(cacheKey, colorsInRange);
    
    return colorsInRange;
}

/**
 * 优化版颜色范围检查函数
 * @param {Object} pixelRgb - 像素RGB值
 * @param {Object} startRgb - 起始RGB值
 * @param {Object} endRgb - 结束RGB值
 * @param {Object} startToEnd - 预计算的向量
 * @param {number} startToEndLengthSquared - 预计算的向量长度平方
 * @param {boolean} isSameColor - 是否为相同颜色
 * @param {number} tolerance - 颜色容差
 * @returns {boolean} 是否在范围内
 */
function isColorInRangeOptimized(pixelRgb, startRgb, endRgb, startToEnd, startToEndLengthSquared, isSameColor, tolerance = 60) {
    if (isSameColor) {
        // 如果起始和结束颜色相同，使用欧几里得距离比较
        const distance = Math.sqrt(
            Math.pow(pixelRgb.r - startRgb.r, 2) +
            Math.pow(pixelRgb.g - startRgb.g, 2) +
            Math.pow(pixelRgb.b - startRgb.b, 2)
        );
        return distance <= tolerance; // 使用自定义容差
    }
    
    const pixelToStart = {
        r: pixelRgb.r - startRgb.r,
        g: pixelRgb.g - startRgb.g,
        b: pixelRgb.b - startRgb.b
    };
    
    // 计算点积
    const dotProduct = pixelToStart.r * startToEnd.r + pixelToStart.g * startToEnd.g + pixelToStart.b * startToEnd.b;
    
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
        
        // 动态容差：根据颜色范围的长度调整容差，但以用户设置的容差为基准
        const rangeLength = Math.sqrt(startToEndLengthSquared);
        const dynamicTolerance = Math.max(tolerance * 0.5, Math.min(tolerance * 1.5, rangeLength * 0.2));
        
        return distance <= dynamicTolerance;
    }
    
    return false;
}

/**
 * 检查颜色是否在指定范围内
 * @param {Object} pixelRgb - 像素RGB值
 * @param {Object} startRgb - 起始RGB值
 * @param {Object} endRgb - 结束RGB值
 * @param {number} tolerance - 颜色容差（可选，默认60）
 * @returns {boolean} 是否在范围内
 */
function isColorInRange(pixelRgb, startRgb, endRgb, tolerance = 60) {
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
        // 如果起始和结束颜色相同，使用欧几里得距离比较
        const distance = Math.sqrt(
            Math.pow(pixelRgb.r - startRgb.r, 2) +
            Math.pow(pixelRgb.g - startRgb.g, 2) +
            Math.pow(pixelRgb.b - startRgb.b, 2)
        );
        return distance <= tolerance; // 使用自定义容差
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
        
        // 动态容差：根据颜色范围的长度调整容差，但以用户设置的容差为基准
        const rangeLength = Math.sqrt(startToEndLengthSquared);
        const dynamicTolerance = Math.max(tolerance * 0.5, Math.min(tolerance * 1.5, rangeLength * 0.2));
        
        return distance <= dynamicTolerance;
    }
    
    return false;
}

/**
 * 应用颜色替换到图像数据
 * @param {ImageData} imageData - 图像数据
 * @param {Array} colorsInRange - 范围内的颜色
 * @param {string} startColor - 起始颜色
 * @param {string} endColor - 结束颜色
 * @param {string} targetStartColor - 目标起始颜色
 * @param {string} targetEndColor - 目标结束颜色
 * @param {number} mixRatio - 混合比例
 * @returns {number} 替换的像素数量
 */
function applyColorReplaceToImageData(imageData, colorsInRange, startColor, endColor, targetStartColor, targetEndColor, mixRatio) {
    console.log('开始处理颜色替换...', {
        colorsInRange: colorsInRange.length,
        startColor,
        endColor,
        targetStartColor,
        targetEndColor,
        mixRatio
    });
    
    const data = imageData.data;
    const startRgb = hexToRgb(startColor);
    const endRgb = hexToRgb(endColor);
    const targetStartRgb = hexToRgb(targetStartColor);
    const targetEndRgb = hexToRgb(targetEndColor);
    let replacedPixels = 0;
    
    colorsInRange.forEach((color, index) => {
        // 计算当前颜色在原始颜色范围中的位置比例
        const positionRatio = calculateColorPosition(color.rgb, startRgb, endRgb);
        
        // 根据位置比例计算目标颜色
        const targetRgb = interpolateColor(targetStartRgb, targetEndRgb, positionRatio);
        
        // 应用混合比例
        const finalRgb = mixColors(color.rgb, targetRgb, mixRatio);
        
        if (index < 3) { // 只打印前3个颜色的详细信息
            console.log(`颜色 ${index + 1}:`, {
                original: color.hex,
                positionRatio,
                target: `rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`,
                final: `rgb(${finalRgb.r}, ${finalRgb.g}, ${finalRgb.b})`,
                pixels: color.positions.length
            });
        }
        
        color.positions.forEach(position => {
            const index = position.index;
            
            // 更新像素颜色
            data[index] = finalRgb.r;     // Red
            data[index + 1] = finalRgb.g; // Green
            data[index + 2] = finalRgb.b; // Blue
            // Alpha保持不变
            
            replacedPixels++;
        });
    });
    
    console.log('颜色替换完成，总替换像素数:', replacedPixels);
    return replacedPixels;
}

/**
 * 计算颜色在颜色范围中的位置比例
 * @param {Object} pixelRgb - 像素RGB值
 * @param {Object} startRgb - 起始RGB值
 * @param {Object} endRgb - 结束RGB值
 * @returns {number} 位置比例 (0-1)
 */
function calculateColorPosition(pixelRgb, startRgb, endRgb) {
    // 计算起始到结束的向量
    const startToEnd = {
        r: endRgb.r - startRgb.r,
        g: endRgb.g - startRgb.g,
        b: endRgb.b - startRgb.b
    };
    
    // 计算像素到起始的向量
    const pixelToStart = {
        r: pixelRgb.r - startRgb.r,
        g: pixelRgb.g - startRgb.g,
        b: pixelRgb.b - startRgb.b
    };
    
    // 计算点积和向量长度的平方
    const dotProduct = pixelToStart.r * startToEnd.r + pixelToStart.g * startToEnd.g + pixelToStart.b * startToEnd.b;
    const startToEndLengthSquared = startToEnd.r * startToEnd.r + startToEnd.g * startToEnd.g + startToEnd.b * startToEnd.b;
    
    if (startToEndLengthSquared === 0) {
        return 0; // 如果起始和结束颜色相同
    }
    
    // 计算投影比例
    const projectionRatio = dotProduct / startToEndLengthSquared;
    
    // 限制在0-1范围内
    return Math.max(0, Math.min(1, projectionRatio));
}

/**
 * 在两个颜色之间进行线性插值
 * @param {Object} color1 - 第一个颜色RGB
 * @param {Object} color2 - 第二个颜色RGB
 * @param {number} ratio - 插值比例 (0-1)
 * @returns {Object} 插值后的RGB颜色
 */
function interpolateColor(color1, color2, ratio) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
    
    return { r, g, b };
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

/**
 * 清空颜色缓存
 */
export function clearColorCache() {
    colorCache.clear();
}
