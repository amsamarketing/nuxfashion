
export const getErr = (e: any): string => {
  const msg = e?.response?.data?.message;
  if (!msg) return e?.message || 'Request failed';
  return Array.isArray(msg) ? msg.join(', ') : String(msg);
};
