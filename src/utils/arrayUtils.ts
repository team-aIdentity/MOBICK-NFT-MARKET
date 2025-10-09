/**
 * 배열 유틸리티 함수들
 * tokens.includes 오류 방지를 위한 안전한 배열 처리
 */

/**
 * 안전한 배열 포함 확인
 * @param array 확인할 배열 또는 값
 * @param item 찾을 항목
 * @returns 포함 여부
 */
export function safeIncludes(array: any, item: any): boolean {
  // 배열 여부 확인
  if (!Array.isArray(array)) {
    console.warn(
      "safeIncludes: 첫 번째 인자가 배열이 아닙니다:",
      typeof array,
      array
    );
    return false;
  }

  return array.includes(item);
}

/**
 * 안전한 배열 길이 확인
 * @param array 확인할 배열 또는 값
 * @returns 배열 길이 (배열이 아니면 0)
 */
export function safeLength(array: any): number {
  if (!Array.isArray(array)) {
    console.warn(
      "safeLength: 첫 번째 인자가 배열이 아닙니다:",
      typeof array,
      array
    );
    return 0;
  }

  return array.length;
}

/**
 * 안전한 배열 접근
 * @param array 확인할 배열 또는 값
 * @param index 인덱스
 * @returns 해당 인덱스의 값 (없으면 undefined)
 */
export function safeGet(array: any, index: number): any {
  if (!Array.isArray(array)) {
    console.warn(
      "safeGet: 첫 번째 인자가 배열이 아닙니다:",
      typeof array,
      array
    );
    return undefined;
  }

  return array[index];
}

/**
 * 값이 배열인지 확인
 * @param value 확인할 값
 * @returns 배열 여부
 */
export function isArray(value: any): boolean {
  return Array.isArray(value);
}

/**
 * 배열 또는 기본값 반환
 * @param value 확인할 값
 * @param defaultValue 기본값
 * @returns 배열 또는 기본값
 */
export function ensureArray(value: any, defaultValue: any[] = []): any[] {
  return Array.isArray(value) ? value : defaultValue;
}
