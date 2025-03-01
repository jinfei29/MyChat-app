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

  async chat(messages) {
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
          }))
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("文心一言API原始响应:", JSON.stringify(response.data, null, 2));

      if (response.data.error_code) {
        console.error("文心一言API返回错误:", response.data);
        throw new Error(response.data.error_msg || "API调用失败");
      }

      // 检查响应格式
      if (!response.data.result) {
        console.error("文心一言API响应格式异常:", response.data);
        throw new Error("API响应格式异常");
      }

      console.log("文心一言API响应成功，结果:", response.data.result);
      return response.data.result;
    } catch (error) {
      console.error("文心一言API调用失败:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error_msg || error.message || "API调用失败");
    }
  }
}

export const wenxin = new WenxinAPI(); 