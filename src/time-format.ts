export function relativeSessionTime(value?: string) {
  if (!value) {
    return "";
  }

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "";
  }

  const diff = Math.max(0, Date.now() - time);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} 天前`;
  }

  return new Date(time).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}
