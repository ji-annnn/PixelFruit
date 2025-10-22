/**
 * 图表管理模块
 * 负责直方图等图表功能的显示和管理
 */

import { drawEmptyHistogram, optimizedUpdateHistogram, createDebouncedHistogramUpdate } from './HistogramManager.js';

/**
 * 图表管理器类
 */
export class ChartManager {
    constructor() {
        this.histogramCanvas = null;
        this.histogramCtx = null;
        this.currentMode = 'luminance';
        this.updateHistogramDebounced = null;
        this.isInitialized = false;
    }

    /**
     * 初始化图表管理器
     * @param {HTMLCanvasElement} histogramCanvas - 直方图画布元素
     * @param {HTMLCanvasElement} mainCanvas - 主画布元素
     * @param {CanvasRenderingContext2D} mainCtx - 主画布上下文
     */
    init(histogramCanvas, mainCanvas, mainCtx) {
        this.histogramCanvas = histogramCanvas;
        this.histogramCtx = histogramCanvas.getContext('2d');
        this.mainCanvas = mainCanvas;
        this.mainCtx = mainCtx;
        
        // 调整画布尺寸
        this.resizeHistogramCanvas();
        
        // 创建防抖更新函数
        this.updateHistogramDebounced = createDebouncedHistogramUpdate(
            () => this.updateHistogram(), 
            100
        );
        
        // 初始化模式切换按钮
        this.initModeButtons();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resizeHistogramCanvas());
        
        // 初始绘制空直方图
        this.drawEmptyHistogram();
        
        this.isInitialized = true;
    }

    /**
     * 调整直方图画布尺寸
     */
    resizeHistogramCanvas() {
        if (!this.histogramCanvas || !this.histogramCanvas.parentElement) return;
        
        const parentWidth = this.histogramCanvas.parentElement.clientWidth;
        this.histogramCanvas.width = parentWidth - 20; // 考虑内边距
        this.histogramCanvas.height = 150;
    }

    /**
     * 初始化模式切换按钮
     */
    initModeButtons() {
        const buttons = document.querySelectorAll('.histogram-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有按钮的active类
                document.querySelectorAll('.histogram-btn').forEach(b => b.classList.remove('active'));
                // 为当前按钮添加active类
                btn.classList.add('active');
                // 更新当前模式
                this.currentMode = btn.dataset.mode;
                // 重新绘制直方图
                this.updateHistogram();
            });
        });
    }

    /**
     * 更新直方图
     */
    updateHistogram() {
        if (!this.isInitialized) return;
        
        try {
            if (!this.mainCanvas || this.mainCanvas.width === 0 || this.mainCanvas.height === 0) {
                this.drawEmptyHistogram();
                return;
            }
            
            // 直接从当前Canvas获取图像数据（包含所有修改，包括颜色替换）
            const currentImageData = this.mainCtx.getImageData(0, 0, this.mainCanvas.width, this.mainCanvas.height);
            
            // 使用优化的直方图更新函数
            optimizedUpdateHistogram(currentImageData, this.histogramCtx, this.histogramCanvas, this.currentMode);
        } catch (error) {
            console.error('更新直方图时出错:', error);
            this.drawEmptyHistogram();
        }
    }

    /**
     * 绘制空直方图
     */
    drawEmptyHistogram() {
        if (!this.isInitialized) return;
        drawEmptyHistogram(this.histogramCtx, this.histogramCanvas);
    }

    /**
     * 获取当前模式
     * @returns {string} 当前直方图模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 设置当前模式
     * @param {string} mode - 模式名称
     */
    setCurrentMode(mode) {
        this.currentMode = mode;
        // 更新按钮状态
        document.querySelectorAll('.histogram-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    /**
     * 为滑块添加直方图更新监听器
     * @param {NodeList|Array} sliders - 滑块元素列表
     */
    addSliderListeners(sliders) {
        sliders.forEach(slider => {
            slider.addEventListener('input', this.updateHistogramDebounced);
        });
    }

    /**
     * 为导出按钮添加直方图更新监听器
     * @param {NodeList|Array} exportButtons - 导出按钮列表
     */
    addExportButtonListeners(exportButtons) {
        exportButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTimeout(() => this.updateHistogram(), 50); // 稍微延迟，确保图像已经更新
            });
        });
    }

    /**
     * 强制更新直方图（不使用防抖）
     */
    forceUpdateHistogram() {
        this.updateHistogram();
    }

    /**
     * 销毁图表管理器
     */
    destroy() {
        if (this.updateHistogramDebounced) {
            // 清理防抖函数
            this.updateHistogramDebounced = null;
        }
        
        // 移除事件监听器
        window.removeEventListener('resize', () => this.resizeHistogramCanvas());
        
        this.isInitialized = false;
    }
}

/**
 * 创建图表管理器实例
 * @param {HTMLCanvasElement} histogramCanvas - 直方图画布元素
 * @param {HTMLCanvasElement} mainCanvas - 主画布元素
 * @param {CanvasRenderingContext2D} mainCtx - 主画布上下文
 * @returns {ChartManager} 图表管理器实例
 */
export function createChartManager(histogramCanvas, mainCanvas, mainCtx) {
    return new ChartManager();
}

/**
 * 初始化图表模块
 * @param {HTMLCanvasElement} histogramCanvas - 直方图画布元素
 * @param {HTMLCanvasElement} mainCanvas - 主画布元素
 * @param {CanvasRenderingContext2D} mainCtx - 主画布上下文
 * @param {Object} options - 配置选项
 * @returns {ChartManager} 图表管理器实例
 */
export function initChartModule(histogramCanvas, mainCanvas, mainCtx, options = {}) {
    const chartManager = createChartManager(histogramCanvas, mainCanvas, mainCtx);
    
    // 初始化图表管理器
    chartManager.init(histogramCanvas, mainCanvas, mainCtx);
    
    // 为滑块添加监听器
    if (options.sliders) {
        chartManager.addSliderListeners(options.sliders);
    }
    
    // 为导出按钮添加监听器
    if (options.exportButtons) {
        chartManager.addExportButtonListeners(options.exportButtons);
    }
    
    // 暴露全局方法
    window.updateHistogram = () => chartManager.forceUpdateHistogram();
    
    return chartManager;
}

/**
 * 创建直方图配置
 * @param {Object} config - 配置对象
 * @returns {Object} 直方图配置
 */
export function createHistogramConfig(config = {}) {
    return {
        width: config.width || 300,
        height: config.height || 150,
        backgroundColor: config.backgroundColor || '#f8f9fa',
        gridColor: config.gridColor || '#e9ecef',
        lineColor: config.lineColor || '#007bff',
        textColor: config.textColor || '#6c757d',
        showGrid: config.showGrid !== false,
        showLabels: config.showLabels !== false,
        ...config
    };
}

/**
 * 直方图工具函数
 */
export const HistogramUtils = {
    /**
     * 计算图像直方图数据
     * @param {ImageData} imageData - 图像数据
     * @param {string} mode - 模式 ('luminance' 或 'rgb')
     * @returns {Object} 直方图数据
     */
    calculateHistogram(imageData, mode = 'luminance') {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        if (mode === 'luminance') {
            // 计算亮度直方图
            const histogram = new Array(256).fill(0);
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // 使用标准亮度公式
                const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                histogram[luminance]++;
            }
            
            return { luminance: histogram };
        } else if (mode === 'rgb') {
            // 计算RGB直方图
            const rHistogram = new Array(256).fill(0);
            const gHistogram = new Array(256).fill(0);
            const bHistogram = new Array(256).fill(0);
            
            for (let i = 0; i < data.length; i += 4) {
                rHistogram[data[i]]++;
                gHistogram[data[i + 1]]++;
                bHistogram[data[i + 2]]++;
            }
            
            return { r: rHistogram, g: gHistogram, b: bHistogram };
        }
        
        return null;
    },

    /**
     * 获取直方图统计信息
     * @param {Array} histogram - 直方图数据
     * @returns {Object} 统计信息
     */
    getHistogramStats(histogram) {
        const total = histogram.reduce((sum, count) => sum + count, 0);
        if (total === 0) return null;
        
        let maxCount = 0;
        let maxValue = 0;
        let minValue = 255;
        let sum = 0;
        let weightedSum = 0;
        
        for (let i = 0; i < histogram.length; i++) {
            const count = histogram[i];
            if (count > 0) {
                maxCount = Math.max(maxCount, count);
                maxValue = Math.max(maxValue, i);
                minValue = Math.min(minValue, i);
                sum += count;
                weightedSum += i * count;
            }
        }
        
        return {
            total,
            maxCount,
            maxValue,
            minValue,
            average: weightedSum / total,
            dynamicRange: maxValue - minValue
        };
    }
};
