// src/services/ragApi.js

// API基础URL - 支持环境变量和默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://58.198.176.133:5000/api';

/**
 * RAG服务API类
 */
class RAGService {
  /**
   * 检查RAG服务健康状态
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        healthy: data.status === 'healthy',
        message: data.message
      };
    } catch (error) {
      console.error('❌ RAG健康检查失败:', error);
      return {
        healthy: false,
        message: `连接失败: ${error.message}`
      };
    }
  }

  /**
   * 发送问题到RAG服务
   * @param {string} prompt - 用户问题
   * @param {string} strategy - 检索策略 (merge/faiss/bm25/rerank)
   */
  async sendQuestion(prompt, strategy = 'merge') {
    try {
      console.log('🚀 发送问题到RAG服务:', prompt);

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          strategy
        }),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 收到RAG回答:', data);

      // 统一返回格式
      return {
        success: data.success || true,
        answer: data.answer || '暂无回答',
        strategy_used: data.strategy_used || strategy,
        confidence: data.confidence || 'unknown',
        faiss_score: data.faiss_score || 0,
        retrieved_docs_count: data.retrieved_docs_count || { faiss: 0, bm25: 0 },
        warning: data.warning || null,
        error: data.error || null
      };

    } catch (error) {
      console.error('❌ RAG API请求失败:', error);

      // 返回错误格式
      return {
        success: false,
        answer: '连接服务失败，请检查网络连接',
        error: error.message,
        strategy_used: strategy,
        confidence: 'error',
        faiss_score: 0,
        retrieved_docs_count: { faiss: 0, bm25: 0 }
      };
    }
  }

  /**
   * 获取可用的检索策略
   */
  async getStrategies() {
    try {
      const response = await fetch(`${API_BASE_URL}/strategies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const data = await response.json();
        return data.strategies;
      }
    } catch (error) {
      console.error('❌ 获取策略失败:', error);
    }

    // 返回默认策略
    return {
      'merge': '合并FAISS和BM25检索结果',
      'faiss': '仅使用FAISS向量检索',
      'bm25': '仅使用BM25关键词检索',
      'rerank': '使用重排序优化检索结果'
    };
  }

  /**
   * 测试API连接
   */
  async testConnection() {
    const health = await this.checkHealth();
    if (health.healthy) {
      try {
        const testResult = await this.sendQuestion('测试连接', 'merge');
        return {
          success: true,
          message: '连接测试成功',
          health,
          testResult
        };
      } catch (error) {
        return {
          success: false,
          message: '健康检查通过，但问答功能异常',
          health,
          error: error.message
        };
      }
    } else {
      return {
        success: false,
        message: '无法连接到RAG服务',
        health
      };
    }
  }
}

// 导出单例实例
const ragService = new RAGService();
export default ragService;

// 也可以导出类本身，如果需要创建多个实例
export { RAGService };
