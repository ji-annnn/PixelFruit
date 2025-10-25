/**
 * 滤镜管理模块
 * 负责滤镜预设的管理、应用和保存功能
 */

// 默认滤镜预设
const defaultFilterPresets = {
    '万能公式': {
        bright: 1.1,
        exp_shift: 0.2,
        user_sat: 130,
        highlights: -10,
        shadows: 5,
        green_tint: 5,
        blue_tint: 5
    },    
    '富士色彩': {
        bright: 1.05,
        exp_shift: 0.0,
        user_sat: 125,
        highlights: -10,
        shadows: 5,
        contrast: 15,
        blue_tint: 10,
        red_tint: -5
    },
    '复古钟楼': {
        bright: 1.08,
        exp_shift: 0.1,
        user_sat: 115,
        highlights: -15,
        shadows: 10,
        contrast: 12,
        blue_tint: 8,
        green_tint: 3,
        red_tint: -2
    },
    '复古胶片': {
        bright: 0.9,
        exp_shift: 0.0,
        user_sat: 110,
        highlights: -5,
        shadows: 10,
        red_tint: 5,
        green_tint: -3,
        blue_tint: -10
    },
    '黑白模式': {
        bright: 1.0,
        exp_shift: 0.0,
        user_sat: 0,
        contrast: 15
    },
    '球场电影感': {
        bright: 0.95,       // 略压整体亮度，保留高光层次
        exp_shift: -0.2,    // 轻微欠曝，营造电影感
        user_sat: 85,       // 适度去饱和
        contrast: 18,       // 增强对比
        highlights: -12,    // 压高光，避免天空过曝
        shadows: 6,         // 提升阴影细节
        whites: 95,         // 白场略降，避免刺眼
        blue_tint: 10,      // 阴影偏蓝
        green_tint: 5,      // 略加绿形成青色调
        red_tint: -6        // 抑制红，突出青
    },
    '人像': {
        bright: 1.15,       // 提亮整体，让人物更明亮
        exp_shift: 0.3,     // 增加曝光，突出面部
        user_sat: 120,      // 适度增加饱和度，让肤色更自然
        contrast: 8,        // 轻微增强对比度
        highlights: -8,     // 压高光，避免过曝
        shadows: 12,        // 提亮阴影，减少面部阴影
        whites: 105,        // 白场略提，增加通透感
        red_tint: -3,       // 减少红色，去黄调
        green_tint: 2,      // 轻微增加绿色
        blue_tint: 8,       // 增加蓝色，让肤色更白皙
        sharpness: 15,      // 轻微锐化，增强细节
        fbdd_noiserd: 20,   // 适度降噪，柔化皮肤
        faceBrightening: 40, // 面部美白
        faceSmoothness: 70  // 过渡平滑
    }
};

/**
 * 滤镜管理器类
 */
export class FilterManager {
    constructor() {
        this.filterPresets = { ...defaultFilterPresets };
        this.currentPreset = 'none';
    }

    /**
     * 初始化滤镜选择器
     * @param {HTMLSelectElement} filterSelect - 滤镜选择器元素
     */
    initFilterSelector(filterSelect) {
        // 清空现有选项（保留默认的"无滤镜"选项）
        while (filterSelect.options.length > 1) {
            filterSelect.remove(1);
        }
        
        // 添加滤镜预设选项
        for (const presetName in this.filterPresets) {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            filterSelect.appendChild(option);
        }
    }

    /**
     * 应用滤镜预设
     * @param {string} presetName - 预设名称
     * @param {Object} settings - 设置对象
     * @param {Object} elements - UI元素对象
     * @param {Function} resetFunction - 重置函数
     * @param {Function} updateFunction - 更新函数
     */
    applyFilterPreset(presetName, settings, elements, resetFunction, updateFunction) {
        if (presetName === 'none') {
            // 无滤镜：重置所有参数到默认值
            resetFunction();
            // 更新白平衡系数
            if (updateFunction) {
                updateFunction(settings);
            }
            // 触发图像更新
            if (updateFunction) {
                updateFunction();
            }
            this.currentPreset = presetName;
            return;
        }
        
        if (!this.filterPresets[presetName]) {
            return;
        }
        
        const preset = this.filterPresets[presetName];
        
        // 第一步：完全重置所有参数到默认值
        resetFunction();
        
        // 第二步：应用预设滤镜的所有参数
        for (const key in preset) {
            switch (key) {
                case 'bright':
                    elements.brightnessSlider.value = preset[key];
                    elements.brightnessValue.textContent = preset[key].toFixed(1);
                    settings[key] = preset[key];
                    break;
                case 'exp_shift':
                    elements.exposureSlider.value = preset[key];
                    elements.exposureValue.textContent = preset[key].toFixed(1);
                    settings[key] = preset[key];
                    break;
                case 'user_sat':
                    elements.saturationSlider.value = preset[key];
                    elements.saturationValue.textContent = preset[key];
                    settings[key] = preset[key];
                    break;
                case 'contrast':
                    elements.contrastSlider.value = preset[key];
                    elements.contrastValue.textContent = preset[key];
                    settings.contrast = preset[key];
                    break;
                case 'highlights':
                    elements.highlightsSlider.value = preset[key];
                    elements.highlightsValue.textContent = preset[key];
                    settings[key] = preset[key];
                    break;
                case 'shadows':
                    elements.shadowsSlider.value = preset[key];
                    elements.shadowsValue.textContent = preset[key];
                    settings[key] = preset[key];
                    break;
                case 'red_tint':
                    elements.redTintSlider.value = preset[key];
                    elements.redTintValue.textContent = preset[key];
                    settings.redTint = preset[key];
                    break;
                case 'green_tint':
                    elements.greenTintSlider.value = preset[key];
                    elements.greenTintValue.textContent = preset[key];
                    settings.greenTint = preset[key];
                    break;
                case 'blue_tint':
                    elements.blueTintSlider.value = preset[key];
                    elements.blueTintValue.textContent = preset[key];
                    settings.blueTint = preset[key];
                    break;
                case 'whites':
                    elements.whitesSlider.value = preset[key];
                    elements.whitesValue.textContent = preset[key];
                    settings.whites = preset[key];
                    break;
                case 'sharpness':
                    elements.sharpnessSlider.value = preset[key];
                    elements.sharpnessValue.textContent = preset[key];
                    settings.sharpness = preset[key];
                    break;
                case 'fbdd_noiserd':
                    elements.noiseReductionSlider.value = preset[key];
                    elements.noiseReductionValue.textContent = preset[key];
                    settings.fbdd_noiserd = preset[key];
                    break;
                case 'faceBrightening':
                    elements.faceBrighteningSlider.value = preset[key];
                    elements.faceBrighteningValue.textContent = preset[key];
                    settings.faceBrightening = preset[key];
                    break;
                case 'faceSmoothness':
                    elements.faceSmoothnessSlider.value = preset[key];
                    elements.faceSmoothnessValue.textContent = preset[key];
                    settings.faceSmoothness = preset[key];
                    break;
            }
        }
        
        // 第三步：更新白平衡系数
        if (updateFunction) {
            updateFunction(settings);
        }
        
        // 第四步：触发图像更新和直方图更新
        if (updateFunction) {
            updateFunction();
        }
        
        this.currentPreset = presetName;
    }

    /**
     * 保存当前配置为新的滤镜预设
     * @param {Object} elements - UI元素对象
     * @param {Object} settings - 当前设置
     * @param {HTMLSelectElement} filterSelect - 滤镜选择器
     */
    saveCurrentConfigAsPreset(elements, settings, filterSelect) {
        const presetName = prompt('请输入滤镜名称:', '新滤镜' + (Object.keys(this.filterPresets).length + 1));
        
        if (!presetName || presetName.trim() === '') {
            alert('滤镜名称不能为空！');
            return;
        }
        
        // 获取当前所有设置
        const currentConfig = {
            bright: parseFloat(elements.brightnessSlider.value),
            exp_shift: parseFloat(elements.exposureSlider.value),
            user_sat: parseInt(elements.saturationSlider.value),
            contrast: parseInt(elements.contrastSlider.value),
            highlights: parseInt(elements.highlightsSlider.value),
            shadows: parseInt(elements.shadowsSlider.value),
            red_tint: parseInt(elements.redTintSlider.value),
            green_tint: parseInt(elements.greenTintSlider.value),
            blue_tint: parseInt(elements.blueTintSlider.value),
            whites: parseInt(elements.whitesSlider.value),
            sharpness: parseInt(elements.sharpnessSlider.value),
            fbdd_noiserd: parseInt(elements.noiseReductionSlider.value),
            faceBrightening: parseInt(elements.faceBrighteningSlider.value),
            faceSmoothness: parseInt(elements.faceSmoothnessSlider.value)
        };
        
        // 保存预设
        this.filterPresets[presetName] = currentConfig;
        
        // 更新选择器
        this.initFilterSelector(filterSelect);
        
        // 选择新保存的预设
        filterSelect.value = presetName;
        
        alert('滤镜预设 "' + presetName + '" 已保存！');
    }

    /**
     * 获取所有滤镜预设
     * @returns {Object} 滤镜预设对象
     */
    getFilterPresets() {
        return this.filterPresets;
    }

    /**
     * 添加新的滤镜预设
     * @param {string} name - 预设名称
     * @param {Object} config - 预设配置
     */
    addFilterPreset(name, config) {
        this.filterPresets[name] = config;
    }

    /**
     * 删除滤镜预设
     * @param {string} name - 预设名称
     */
    removeFilterPreset(name) {
        if (this.filterPresets[name] && name !== 'none') {
            delete this.filterPresets[name];
        }
    }

    /**
     * 获取当前预设名称
     * @returns {string} 当前预设名称
     */
    getCurrentPreset() {
        return this.currentPreset;
    }

    /**
     * 设置当前预设
     * @param {string} presetName - 预设名称
     */
    setCurrentPreset(presetName) {
        this.currentPreset = presetName;
    }
}

/**
 * 创建滤镜管理器实例
 * @returns {FilterManager} 滤镜管理器实例
 */
export function createFilterManager() {
    return new FilterManager();
}

/**
 * 初始化滤镜功能
 * @param {Object} elements - UI元素对象
 * @param {Object} settings - 设置对象
 * @param {Function} resetFunction - 重置函数
 * @param {Function} updateFunction - 更新函数
 * @param {Function} updateWhiteBalanceFunction - 白平衡更新函数
 * @returns {FilterManager} 滤镜管理器实例
 */
export function initFilterModule(elements, settings, resetFunction, updateFunction, updateWhiteBalanceFunction) {
    const filterManager = createFilterManager();
    
    // 初始化滤镜选择器
    filterManager.initFilterSelector(elements.filterSelect);
    
    // 为滤镜选择器添加事件监听器
    elements.filterSelect.addEventListener('change', (e) => {
        filterManager.applyFilterPreset(
            e.target.value, 
            settings, 
            elements, 
            resetFunction, 
            () => {
                updateWhiteBalanceFunction(settings);
                updateFunction();
            }
        );
    });
    
    // 为保存滤镜按钮添加事件监听器
    elements.saveFilterButton.addEventListener('click', () => {
        filterManager.saveCurrentConfigAsPreset(elements, settings, elements.filterSelect);
    });
    
    // 当图像加载后启用保存滤镜按钮
    elements.rawFileInput.addEventListener('change', () => {
        elements.saveFilterButton.disabled = false;
    });
    
    // 当重置设置时，重置滤镜选择器
    elements.resetButton.addEventListener('click', () => {
        elements.filterSelect.value = 'none';
        filterManager.setCurrentPreset('none');
    });
    
    return filterManager;
}
