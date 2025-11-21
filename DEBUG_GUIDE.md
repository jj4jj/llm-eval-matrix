# EvalMatrix 调试指南

## 🚀 一键启动开发环境

### 方法1: 批处理脚本 (推荐)
```bash
start_dev.bat
```

### 方法2: PowerShell脚本 (功能更强大)
```powershell
.\start_dev.ps1
```

### 方法3: 手动启动
```bash
# 启动后端 (端口8001)
cd backend
python main.py

# 启动前端 (端口5174)
npm run dev
```

## 📊 创建测试数据

### 一键生成测试数据
```powershell
.\create_test_data.ps1
```

然后复制输出的 JavaScript 代码到浏览器控制台执行。

### 手动创建测试数据
在浏览器控制台执行：
```javascript
// 创建测试模型
const testModels = [
  {
    "id": "gpt-3.5-turbo-test",
    "name": "GPT-3.5 Turbo (Test)",
    "provider": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-test-key",
    "modelId": "gpt-3.5-turbo",
    "maxConcurrency": 16
  }
];

// 创建测试数据集
const testDataset = {
  "id": "math-test-dataset",
  "name": "Math Questions Test",
  "createdAt": "2025-01-01T10:00:00Z",
  "items": [
    {"id": "1", "input": "What is 2+2?", "reference": "4"},
    {"id": "2", "input": "What is 5*3?", "reference": "15"}
  ]
};

// 创建测试运行记录
const testRun = {
  "id": "test-run-1",
  "configId": "test-config-1",
  "configSnapshot": {
    "id": "test-config-1",
    "name": "Test Evaluation Run",
    "datasetId": "math-test-dataset",
    "modelIds": ["gpt-3.5-turbo-test"],
    "metrics": ["EXACT_MATCH"],
    "systemPrompt": "You are a helpful assistant.",
    "judgeModelId": "",
    "customMetricCode": ""
  },
  "timestamp": "2025-01-01T12:00:00Z",
  "status": "running",
  "progress": 1,
  "total": 2,
  "results": [
    {
      "itemId": "1",
      "modelId": "gpt-3.5-turbo-test",
      "input": "What is 2+2?",
      "output": "4",
      "reference": "4",
      "scores": {"EXACT_MATCH": 1},
      "latencyMs": 1200
    }
  ]
};

// 保存到 localStorage
localStorage.setItem('models', JSON.stringify(testModels));
localStorage.setItem('datasets', JSON.stringify([testDataset]));
localStorage.setItem('runs', JSON.stringify([testRun]));

console.log('✅ Test data created successfully!');
alert('Test data created! Refresh the page to see results.');
```

## 🔍 常见问题排查

### 问题1: 评测结果页面空白
**症状**: 打开 `/results` 页面只有顶部菜单，内容区域空白

**解决方案**:
1. 首先创建测试数据（使用上面的脚本）
2. 检查浏览器控制台是否有错误
3. 确保 localStorage 中有数据：
   ```javascript
   console.log('Models:', localStorage.getItem('models'));
   console.log('Datasets:', localStorage.getItem('datasets'));
   console.log('Runs:', localStorage.getItem('runs'));
   ```

### 问题2: 并行执行不生效
**症状**: 评测进度没有显示并行执行效果

**解决方案**:
1. 检查模型配置中的 `maxConcurrency` 参数
2. 确保在 Models 页面设置了并行度（1-100）
3. 查看控制台日志确认并行执行器是否创建成功

### 问题3: 后端连接失败
**症状**: 前端显示 "Backend not reachable"

**解决方案**:
1. 检查后端是否运行在端口 8001: `http://localhost:8001/health`
2. 检查防火墙设置
3. 确保后端服务已正确启动

### 问题4: 端口冲突
**症状**: 启动时提示端口被占用

**解决方案**:
1. 使用脚本自动清理端口占用
2. 手动结束占用端口的进程
3. 修改配置文件中的端口号

## 📋 访问地址

- **前端应用**: http://localhost:5174
- **后端API**: http://localhost:8001/api
- **后端健康检查**: http://localhost:8001/health
- **数据集管理**: http://localhost:5174/datasets
- **模型配置**: http://localhost:5174/models
- **评测执行**: http://localhost:5174/evaluate
- **结果查看**: http://localhost:5174/results

## 🛠️ 调试工具

### 检查 localStorage 数据
```javascript
// 在浏览器控制台执行
console.log('Current localStorage data:');
console.log('Models:', JSON.parse(localStorage.getItem('models') || '[]'));
console.log('Datasets:', JSON.parse(localStorage.getItem('datasets') || '[]'));
console.log('Runs:', JSON.parse(localStorage.getItem('runs') || '[]'));
```

### 清除所有数据
```javascript
// 在浏览器控制台执行
localStorage.clear();
console.log('LocalStorage cleared!');
location.reload();
```

### 检查后端状态
```bash
# 检查后端健康状态
curl http://localhost:8001/health

# 检查后端数据
curl http://localhost:8001/api/models
curl http://localhost:8001/api/datasets
curl http://localhost:8001/api/runs
```

## 🎯 验证功能

### 验证并行执行功能
1. 在 Models 页面配置多个模型，设置不同的并行度
2. 创建包含多个问题的数据集
3. 运行评测并观察进度显示
4. 检查控制台日志中的并行执行信息

### 验证进度显示功能
1. 创建测试运行记录，设置 `status: "running"`
2. 访问 Results 页面
3. 应该看到：
   - 进度条显示
   - 旋转的加载图标
   - 实时进度更新
   - 状态信息（运行中/已完成/失败）

## 📞 技术支持

如果问题仍然存在，请提供以下信息：
1. 浏览器控制台错误日志
2. 前端和后端服务的启动日志
3. localStorage 中的数据快照
4. 访问的具体URL和错误现象