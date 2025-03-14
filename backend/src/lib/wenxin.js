import axios from 'axios';

class WenxinAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      console.log("正在获取文心一言访问令牌...");
      console.log("API Key:", process.env.BAIDU_API_KEY ? "已设置" : "未设置");
      console.log("Secret Key:", process.env.BAIDU_SECRET_KEY ? "已设置" : "未设置");

      const response = await axios.get(
        'https://aip.baidubce.com/oauth/2.0/token',
        {
          params: {
            grant_type: 'client_credentials',
            client_id: process.env.BAIDU_API_KEY,
            client_secret: process.env.BAIDU_SECRET_KEY
          }
        }
      );

      if (!response.data.access_token) {
        throw new Error("获取访问令牌失败：响应中没有access_token");
      }

      this.accessToken = response.data.access_token;
      this.tokenExpireTime = now + 29 * 24 * 60 * 60 * 1000;
      console.log("成功获取访问令牌");
      return this.accessToken;
    } catch (error) {
      console.error("获取访问令牌失败:", error.response?.data || error.message);
      throw error;
    }
  }

  async chat(messages, onChunk) {
    try {
      const accessToken = await this.getAccessToken();
      console.log("准备发送消息到文心一言API");
      console.log("发送的消息内容:", JSON.stringify(messages, null, 2));

      const response = await axios.post(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${accessToken}`,
        {
          messages: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
            content: msg.content
          })),
          stream: true // 启用流式输出
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          responseType: 'stream' // 设置响应类型为流
        }
      );

      let fullResponse = '';
      
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          try {
            // 将 Buffer 转换为字符串
            const lines = chunk.toString().split('\n');
            
            // 处理每一行数据
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6); // 移除 'data: ' 前缀
                if (jsonStr.trim()) {
                  const data = JSON.parse(jsonStr);
                  if (data.result) {
                    fullResponse += data.result;
                    // 调用回调函数发送数据块
                    onChunk && onChunk(data);
                  }
                }
              }
            });
          } catch (error) {
            console.error('处理数据块时出错:', error);
          }
        });

        response.data.on('end', () => {
          console.log("流式响应完成，完整响应:", fullResponse);
          resolve(fullResponse);
        });

        response.data.on('error', (error) => {
          console.error("流式响应出错:", error);
          reject(error);
        });
      });

    } catch (error) {
      console.error("文心一言API调用失败:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error_msg || error.message || "API调用失败");
    }
  }
}

export const wenxin = new WenxinAPI(); 