/**
 * PixelFruit 图像校正模块
 * 提供图像的垂直倾斜、水平倾斜、旋转和缩放功能
 */

/**
 * 校正模块主类
 */
class CorrectionModule {
    constructor() {
        // 存储滑块元素引用
        this.verticalTiltSlider = null;
        this.horizontalTiltSlider = null;
        this.rotateSlider = null;
        this.scaleSlider = null;
        
        // 存储更新函数引用
        this.updateFunction = null;
    }

    /**
     * 初始化校正模块
     * @param {Function} updateFunction - 图像更新函数
     * @returns {Object} 包含当前校正参数的对象
     */
    init(updateFunction) {
        // 获取DOM元素
        this.verticalTiltSlider = document.getElementById('vertical-tilt');
        this.horizontalTiltSlider = document.getElementById('horizontal-tilt');
        this.rotateSlider = document.getElementById('rotate');
        this.scaleSlider = document.getElementById('scale');
        
        // 保存更新函数
        this.updateFunction = updateFunction;
        
        // 添加事件监听器
        this._addEventListeners();
        
        // 返回当前校正参数
        return this.getCurrentValues();
    }

    /**
     * 添加事件监听器
     * @private
     */
    _addEventListeners() {
        if (this.verticalTiltSlider) {
            this.verticalTiltSlider.addEventListener('input', () => {
                this._onValueChanged();
            });
        }

        if (this.horizontalTiltSlider) {
            this.horizontalTiltSlider.addEventListener('input', () => {
                this._onValueChanged();
            });
        }

        if (this.rotateSlider) {
            this.rotateSlider.addEventListener('input', () => {
                this._onValueChanged();
            });
        }

        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', () => {
                this._onValueChanged();
            });
        }
    }

    /**
     * 当值变化时触发更新
     * @private
     */
    _onValueChanged() {
        if (this.updateFunction) {
            this.updateFunction();
        }
    }

    /**
     * 获取当前校正参数
     * @returns {Object} 校正参数对象
     */
    getCurrentValues() {
        return {
            verticalTilt: this.verticalTiltSlider ? parseFloat(this.verticalTiltSlider.value) : 0,
            horizontalTilt: this.horizontalTiltSlider ? parseFloat(this.horizontalTiltSlider.value) : 0,
            rotation: this.rotateSlider ? parseInt(this.rotateSlider.value) : 0,
            scale: this.scaleSlider ? parseInt(this.scaleSlider.value) / 100 : 1
        };
    }

    /**
     * 重置所有校正参数
     */
    reset() {
        if (this.verticalTiltSlider) {
            this.verticalTiltSlider.value = 0;
        }
        if (this.horizontalTiltSlider) {
            this.horizontalTiltSlider.value = 0;
        }
        if (this.rotateSlider) {
            this.rotateSlider.value = 0;
        }
        if (this.scaleSlider) {
            this.scaleSlider.value = 100;
        }
        
        // 触发更新
        this._onValueChanged();
    }

    /**
     * 应用透视变换
     * @param {ImageData} imageData - 要处理的图像数据
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     * @param {HTMLCanvasElement} canvas - 主画布元素
     */
    applyPerspectiveTransform(imageData, ctx, canvas) {
        const params = this.getCurrentValues();
        
        // 获取图像尺寸
        const width = imageData.width;
        const height = imageData.height;
        
        // 如果没有变换需要应用，直接绘制到画布
        if (params.verticalTilt === 0 && params.horizontalTilt === 0 && params.rotation === 0 && params.scale === 1) {
            // 直接绘制而不创建临时canvas，提高性能
            ctx.putImageData(imageData, 0, 0);
            return;
        }
        
        // 只有在需要变换时才创建临时canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 绘制图像数据到临时canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // 缓存canvas中心坐标
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // 保存当前状态
        ctx.save();
        
        // 移动到画布中心
        ctx.translate(centerX, centerY);
        
        // 应用旋转（如果有）
        if (params.rotation !== 0) {
            ctx.rotate((params.rotation * Math.PI) / 180);
        }
        
        // 应用缩放（如果有）
        if (params.scale !== 1) {
            ctx.scale(params.scale, params.scale);
        }
        
        // 应用透视变换（如果有）
        if (params.verticalTilt !== 0 || params.horizontalTilt !== 0) {
            // 使用正确的6参数2D变换矩阵格式
            ctx.transform(1, params.verticalTilt/5000, params.horizontalTilt/5000, 1, 0, 0);
        }
        
        // 绘制图像（从中心偏移回原点）
        ctx.drawImage(tempCanvas, -width / 2, -height / 2);
        
        // 恢复状态
        ctx.restore();
    }

    /**
     * 设置校正参数
     * @param {Object} params - 校正参数
     */
    setValues(params) {
        if (params.verticalTilt !== undefined && this.verticalTiltSlider) {
            this.verticalTiltSlider.value = params.verticalTilt;
        }
        if (params.horizontalTilt !== undefined && this.horizontalTiltSlider) {
            this.horizontalTiltSlider.value = params.horizontalTilt;
        }
        if (params.rotation !== undefined && this.rotateSlider) {
            this.rotateSlider.value = params.rotation;
        }
        if (params.scale !== undefined && this.scaleSlider) {
            // 注意：scale参数在UI上是百分比，所以需要乘以100
            this.scaleSlider.value = params.scale * 100;
        }
        
        // 触发更新
        this._onValueChanged();
    }
}

// 创建单例实例
const correctionModule = new CorrectionModule();

// 导出公共API
export { correctionModule };

export default correctionModule;