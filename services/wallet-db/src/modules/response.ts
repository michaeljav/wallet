export function ok<T>(data: T, message = 'OK') {
  return { success: true, code: 0, message, data };
}
export function fail(message = 'FAIL', code = -1, details?: any) {
  return { success: false, code, message, details };
}
