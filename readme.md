# RawPixel 修图工具

基于 LibRaw-Wasm 开发的在线 RAW 格式图片处理工具，专注于为摄影爱好者提供便捷的相机原始文件编辑体验。

## 功能特点

- ✅ 原生支持 RAW 格式图片解析与处理
- ✅ 内置 AI 智能参数调整功能，一键优化图片效果
- ✅ 目前已支持索尼相机 RAW 格式文件
- ✅ 纯网页端运行，无需安装任何软件
- ✅ 实时预览修图效果，所见即所得

## 支持设备

当前版本已完成对以下品牌相机的支持：

- 索尼（Sony）系列相机 ARW 格式
- 富士（Fuji）系列相机 RAF 格式
更多相机品牌支持正在开发中，敬请期待！

## 使用方法

1. 访问工具网页
2. 上传你的 RAW 格式图片
3. 选择预设效果或使用 AI 智能调整
4. 微调参数至满意效果
5. 导出处理后的图片

## 开发与二次修改

本项目基于 [LibRaw-Wasm](https://github.com/ybouane/LibRaw-Wasm) 开源项目进行二次开发，欢迎加入开发群共同完善：

- 如果你有想要添加的修图效果，可以在群里提出需求，我们会研究实现方案
- 允许对本网页进行二次魔改和优化
- 欢迎提交 PR 参与项目改进

## 项目结构与文件说明

### 主入口文件
- **index.js** - 应用程序主入口，负责初始化和协调各个模块
- **PixelFruit.html** - 应用的HTML入口文件，包含页面结构
- **css/index.css** - 应用的样式文件，定义UI外观

### 图像处理核心
- **libraw.js/libraw.wasm** - 核心RAW图像处理库，提供RAW格式解析功能
- **libraw_wrapper.cpp** - 用于编译libraw到WebAssembly的C++包装代码
- **worker.js** - 原始Web Worker实现，处理一些计算任务
- **works.js** - 优化后的Web Worker，处理颜色调整、降噪等计算密集型任务

### Files目录模块
- **Basic.js** - 基础工具函数，提供通用功能支持
- **color.js** - 颜色调整模块，包含亮度、对比度、饱和度等调整功能
- **Details.js** - 图像处理细节模块，实现锐化、降噪等高级效果
- **HistogramManager.js** - 直方图管理模块，负责计算和绘制图像直方图
- **ImageProcessor.js** - Web Worker包装器，管理任务队列、缓存和Worker通信
- **PerformanceOptimizer.js** - 性能优化模块，整合缓存、Canvas优化和渐进式渲染
- **SliderManager.js** - 滑块控件管理模块，处理UI交互
- **Correction.js** - 图像校正模块，提供几何校正等功能

### 其他文件
- **compileLibraw.sh** - 编译libraw库的shell脚本
- **makefile** - 项目构建配置文件
- **libs/** - 包含编译好的库文件
- **includes/** - 包含项目依赖的头文件

## 许可协议

⚠️ 本项目禁止用于任何商业用途，仅供个人学习和非商业使用。

基于 LibRaw-Wasm 的开源许可协议进行分发和修改，二次开发成果请遵循相同的许可要求。

项目地址

```
https://github.com/ybouane/LibRaw-Wasm#
```

本地跑请用live server

## 联系方式

加入开发者交流群：暂时没有现在初始demo

有任何问题或建议，欢迎在 Issues 中提出。

------

让我们一起打造更好用的在线 RAW 修图工具！



导出图片 饱和度+20 