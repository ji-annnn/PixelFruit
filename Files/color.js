// 颜色调整模块

// 颜色调整相关的DOM元素引用（在外部初始化）
export let colorElements = {
    useAutoWbCheckbox: null,
    useCameraWbCheckbox: null,
    brightnessSlider: null,
    brightnessValue: null,
    exposureSlider: null,
    exposureValue: null,
    saturationSlider: null,
    saturationValue: null,
    contrastSlider: null,
    contrastValue: null,
    redTintSlider: null,
    greenTintSlider: null,
    blueTintSlider: null,
    highlightsSlider: null,
    shadowsSlider: null,
    whitesSlider: null
};

// 初始化颜色调整模块
export function initColorModule(elements) {
    // 获取DOM元素
    colorElements.useAutoWbCheckbox = elements.useAutoWbCheckbox || document.getElementById('use-auto-wb');
    colorElements.useCameraWbCheckbox = elements.useCameraWbCheckbox || document.getElementById('use-camera-wb');
    colorElements.brightnessSlider = elements.brightnessSlider || document.getElementById('brightness');
    colorElements.brightnessValue = elements.brightnessValue || document.getElementById('brightness-value');
    colorElements.exposureSlider = elements.exposureSlider || document.getElementById('exposure');
    colorElements.exposureValue = elements.exposureValue || document.getElementById('exposure-value');
    colorElements.saturationSlider = elements.saturationSlider || document.getElementById('saturation');
    colorElements.saturationValue = elements.saturationValue || document.getElementById('saturation-value');
    colorElements.contrastSlider = elements.contrastSlider || document.getElementById('contrast');
    colorElements.contrastValue = elements.contrastValue || document.getElementById('contrast-value');
    colorElements.redTintSlider = elements.redTintSlider || document.getElementById('red-tint');
    colorElements.greenTintSlider = elements.greenTintSlider || document.getElementById('green-tint');
    colorElements.blueTintSlider = elements.blueTintSlider || document.getElementById('blue-tint');
    colorElements.redTintValue = elements.redTintValue || document.getElementById('red-tint-value');
    colorElements.greenTintValue = elements.greenTintValue || document.getElementById('green-tint-value');
    colorElements.blueTintValue = elements.blueTintValue || document.getElementById('blue-tint-value');
    colorElements.highlightsSlider = elements.highlightsSlider || document.getElementById('highlights');
    colorElements.shadowsSlider = elements.shadowsSlider || document.getElementById('shadows');
    colorElements.whitesSlider = elements.whitesSlider || document.getElementById('whites');
}

// 应用颜色调整到缓存数据
export function applyColorAdjustments(data, width, height, settings) {
    // 获取当前设置
    const brightness = settings.bright || 1.0;
    const contrast = parseInt(colorElements.contrastSlider.value);
    const saturation = parseInt(colorElements.saturationSlider.value);
    const exposure = settings.exp_shift || 0.0;
    const shadows = settings.shadows !== undefined ? settings.shadows : parseInt(colorElements.shadowsSlider.value);
    
    // 安全获取温度和色调滑块
    const tempSlider = document.getElementById('temperature') || document.getElementById('tempSlider');
    const tintSlider = document.getElementById('tint') || document.getElementById('tintSlider');
    const temperature = tempSlider ? parseInt(tempSlider.value) : 0;
    const tint = tintSlider ? parseInt(tintSlider.value) : 0;
    
    // 检查并应用用户自定义的白平衡系数（红、绿、蓝色调调整）
    const useUserMul = settings.user_mul && settings.user_mul.length === 4;
    
    // 预先计算所有不变的因子，避免在循环内重复计算
    const contrastFactor = contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;
    const exposureFactor = exposure !== 0 ? Math.pow(2, exposure) : 1;
    const saturationFactor = saturation !== 100 ? saturation / 100 : 1;
    
    // 获取高光值并检查是否需要应用高光调整
    const highlights = settings.highlights !== undefined ? settings.highlights : parseInt(colorElements.highlightsSlider.value);
    // 获取白色值并检查是否需要应用白色调整
    const whites = settings.whites !== undefined ? settings.whites : parseInt(colorElements.whitesSlider.value);
    
    // 标记是否需要进行某种调整，避免不必要的计算
    const needBrightness = brightness !== 1.0;
    const needContrast = contrast !== 0;
    const needSaturation = saturation !== 100;
    const needTemperature = temperature !== 0;
    const needTint = tint !== 0;
    const needExposure = exposure !== 0;
    const needShadows = shadows !== 0;
    const needHighlights = highlights !== 0;
    const needWhites = whites !== 100; // 白色滑块默认值为100
    
    // 提前检查是否有任何调整需要应用，如果没有则直接返回
    if (!needBrightness && !needContrast && !needSaturation && 
        !needTemperature && !needTint && !needExposure && !useUserMul && !needShadows && !needHighlights && !needWhites) {
        return;
    }
    
    // 使用局部变量缓存常用值，提高访问速度
    const min = Math.min;
    const max = Math.max;
    const dataLength = data.length;
    
    // 应用调整
    for (let i = 0; i < dataLength; i += 4) {
        // 提取RGB值
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
          
        // 应用用户自定义的白平衡系数
        if (useUserMul) {
            r = min(255, max(0, r * settings.user_mul[0]));
            g = min(255, max(0, g * settings.user_mul[1]));
            b = min(255, max(0, b * settings.user_mul[2]));
        }
          
        // 应用亮度调整
        if (needBrightness) {
            r = min(255, max(0, r * brightness));
            g = min(255, max(0, g * brightness));
            b = min(255, max(0, b * brightness));
        }
          
        // 应用对比度
        if (needContrast) {
            r = min(255, max(0, contrastFactor * (r - 128) + 128));
            g = min(255, max(0, contrastFactor * (g - 128) + 128));
            b = min(255, max(0, contrastFactor * (b - 128) + 128));
        }
          
        // 应用饱和度
        if (needSaturation) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = min(255, max(0, gray + saturationFactor * (r - gray)));
            g = min(255, max(0, gray + saturationFactor * (g - gray)));
            b = min(255, max(0, gray + saturationFactor * (b - gray)));
        }
          
        // 应用色温
        if (needTemperature) {
            // 优化的色温调整算法
            if (temperature > 0) {
                r += temperature;
                b -= temperature >> 1; // 使用位移运算代替除法
            } else {
                b -= temperature;
                r += temperature >> 1;
            }
            r = min(255, max(0, r));
            b = min(255, max(0, b));
        }
          
        // 应用色调
        if (needTint) {
            // 优化的色调调整算法
            if (tint > 0) {
                g += tint;
                r -= tint >> 1;
            } else {
                r -= tint;
                g += tint >> 1;
            }
            r = min(255, max(0, r));
            g = min(255, max(0, g));
        }
          
        // 应用曝光补偿
        if (needExposure) {
            r = min(255, max(0, r * exposureFactor));
            g = min(255, max(0, g * exposureFactor));
            b = min(255, max(0, b * exposureFactor));
        }
          
        // 应用阴影调整
        if (needShadows) {
            // 阴影调整算法 - 只影响暗部区域
            const shadowThreshold = 64; // 阴影阈值
            const shadowAdjustment = shadows / 100; // 将阴影值转换为调整系数
            
            // 只对低于阈值的像素应用调整
            if (r < shadowThreshold) {
                r = min(shadowThreshold, max(0, r + (shadowThreshold - r) * shadowAdjustment));
            }
            if (g < shadowThreshold) {
                g = min(shadowThreshold, max(0, g + (shadowThreshold - g) * shadowAdjustment));
            }
            if (b < shadowThreshold) {
                b = min(shadowThreshold, max(0, b + (shadowThreshold - b) * shadowAdjustment));
            }
        }
        
        // 应用高光调整
        if (needHighlights) {
            // 高光调整算法 - 只影响亮部区域
            const highlightThreshold = 192; // 高光阈值
            const highlightAdjustment = highlights / 100; // 将高光值转换为调整系数
            
            // 只对高于阈值的像素应用调整
            if (r > highlightThreshold) {
                r = max(highlightThreshold, min(255, r + (r - highlightThreshold) * highlightAdjustment));
            }
            if (g > highlightThreshold) {
                g = max(highlightThreshold, min(255, g + (g - highlightThreshold) * highlightAdjustment));
            }
            if (b > highlightThreshold) {
                b = max(highlightThreshold, min(255, b + (b - highlightThreshold) * highlightAdjustment));
            }
        }
        
        // 应用白色调整
        if (needWhites) {
            // 白色调整算法 - 只影响最亮的部分
            const whiteThreshold = 220; // 白色阈值（比高光阈值更高）
            const whiteAdjustment = whites / 100; // 将白色值转换为调整系数
            
            // 只对高于阈值的像素应用调整
            if (r > whiteThreshold || g > whiteThreshold || b > whiteThreshold) {
                // 计算亮度
                const brightness = (r + g + b) / 3;
                
                // 仅对接近白色的像素进行调整
                if (brightness > whiteThreshold) {
                    // 调整系数：当值大于100时增加亮度，小于100时降低亮度
                    const adjustFactor = whiteAdjustment;
                    
                    // 对RGB通道分别应用调整，保持色彩平衡
                    r = min(255, r * adjustFactor);
                    g = min(255, g * adjustFactor);
                    b = min(255, b * adjustFactor);
                }
            }
        }
          
        // 写回数据
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // 保持alpha不变
    }
}

// 更新白平衡系数
export function updateWhiteBalanceCoefficients(settings) {
    const redTint = parseInt(colorElements.redTintSlider.value);
    const greenTint = parseInt(colorElements.greenTintSlider.value);
    const blueTint = parseInt(colorElements.blueTintSlider.value);
    
    // 基础值为1.0，调整范围为±100%
    const redMultiplier = 1.0 + (redTint / 100);
    const greenMultiplier = 1.0 + (greenTint / 100);
    const blueMultiplier = 1.0 + (blueTint / 100);
    
    // user_mul 是一个4元素数组，通常用于[R, G, B, G]的调整
    settings.user_mul = [redMultiplier, greenMultiplier, blueMultiplier, greenMultiplier];
}

// 应用对比度调整
export function applyContrast(rgbaData, contrast) {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    
    for (let i = 0; i < rgbaData.length; i += 4) {
        rgbaData[i] = Math.min(255, Math.max(0, factor * (rgbaData[i] - 128) + 128));
        rgbaData[i + 1] = Math.min(255, Math.max(0, factor * (rgbaData[i + 1] - 128) + 128));
        rgbaData[i + 2] = Math.min(255, Math.max(0, factor * (rgbaData[i + 2] - 128) + 128));
    }
}

// 注册颜色调整事件监听器
export function registerColorEventListeners(settings, debouncedImageUpdate, debouncedColorUpdate) {
    // 监听控件变化
    colorElements.useAutoWbCheckbox.addEventListener('change', (e) => {
        settings.use_auto_wb = e.target.checked ? 1 : 0;
        if (e.target.checked) {
            colorElements.useCameraWbCheckbox.checked = false;
            settings.use_camera_wb = 0;
        }
    });
    
    colorElements.useCameraWbCheckbox.addEventListener('change', (e) => {
        settings.use_camera_wb = e.target.checked ? 1 : 0;
        if (e.target.checked) {
            colorElements.useAutoWbCheckbox.checked = false;
            settings.use_auto_wb = 0;
        }
    });
    
    colorElements.brightnessSlider.addEventListener('input', (e) => {
        settings.bright = parseFloat(e.target.value);
        colorElements.brightnessValue.textContent = settings.bright.toFixed(1);
        // 使用防抖处理的图像更新
        debouncedImageUpdate();
    });
    
    colorElements.exposureSlider.addEventListener('input', (e) => {
        settings.exp_shift = parseFloat(e.target.value);
        colorElements.exposureValue.textContent = settings.exp_shift.toFixed(1);
        // 使用防抖处理的图像更新
        debouncedImageUpdate();
    });
    
    colorElements.saturationSlider.addEventListener('input', (e) => {
        settings.user_sat = parseInt(e.target.value);
        colorElements.saturationValue.textContent = settings.user_sat;
        // 使用防抖处理的图像更新
        debouncedImageUpdate();
    });
    
    colorElements.contrastSlider.addEventListener('input', (e) => {
        colorElements.contrastValue.textContent = e.target.value;
        // 使用防抖处理的图像更新
        debouncedImageUpdate();
    });
    
    // 为阴影滑块添加事件监听器
    colorElements.shadowsSlider.addEventListener('input', function() {
        settings.shadows = parseInt(this.value);
        debouncedImageUpdate();
    });
    
    // 为高光滑块添加事件监听器
    colorElements.highlightsSlider.addEventListener('input', function() {
        settings.highlights = parseInt(this.value);
        debouncedImageUpdate();
    });
    
    // 为白色滑块添加事件监听器
    colorElements.whitesSlider.addEventListener('input', function() {
        settings.whites = parseInt(this.value);
        debouncedImageUpdate();
    });
    
    // 颜色滑块事件监听 - 修复为立即更新值显示并触发图像更新
    colorElements.redTintSlider.addEventListener('input', (e) => {
        colorElements.redTintValue.textContent = e.target.value;
        debouncedColorUpdate();
    });
    colorElements.greenTintSlider.addEventListener('input', (e) => {
        colorElements.greenTintValue.textContent = e.target.value;
        debouncedColorUpdate();
    });
    colorElements.blueTintSlider.addEventListener('input', (e) => {
        colorElements.blueTintValue.textContent = e.target.value;
        debouncedColorUpdate();
    });
}