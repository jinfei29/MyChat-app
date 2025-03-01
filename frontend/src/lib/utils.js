export const formatMessageTime = (timestamp) => {
  const messageDate = new Date(timestamp);
  const now = new Date();

  // 计算时间差（毫秒）
  const timeDiff = now - messageDate;
  const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  // 格式化时间部分
  const hours = messageDate.getHours().toString().padStart(2, '0');
  const minutes = messageDate.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  // 如果是今天的消息
  if (dayDiff === 0) {
    return time;
  }

  // 如果是昨天的消息
  if (dayDiff === 1) {
    return `昨天 ${time}`;
  }

  // 如果是本周的消息
  if (dayDiff < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${weekdays[messageDate.getDay()]} ${time}`;
  }

  // 如果是本年的消息
  if (messageDate.getFullYear() === now.getFullYear()) {
    const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
    const day = messageDate.getDate().toString().padStart(2, '0');
    return `${month}月${day}日 ${time}`;
  }

  // 如果是更早的消息
  const year = messageDate.getFullYear();
  const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
  const day = messageDate.getDate().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${time}`;
};
