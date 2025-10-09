/**
 * 안전한 배열 사용 예시
 * tokens.includes 오류 방지 방법들
 */

import {
  safeIncludes,
  safeLength,
  safeGet,
  isArray,
  ensureArray,
} from "@/utils/arrayUtils";

// 예시 1: 기본 배열 확인
export function Example1() {
  const tokens = ["0x123", "0x456", "0x789"];

  // ❌ 위험한 방법
  // if (tokens.includes("0x123")) { ... }

  // ✅ 안전한 방법
  if (safeIncludes(tokens, "0x123")) {
    console.log("토큰이 포함되어 있습니다");
  }
}

// 예시 2: thirdweb 훅 반환값 처리
export function Example2() {
  // thirdweb 훅에서 반환된 데이터
  const nftData = { nfts: ["nft1", "nft2"] }; // 객체
  const tokenData = ["token1", "token2"]; // 배열

  // ❌ 잘못된 방법
  // if (nftData.includes("nft1")) { ... } // nftData는 객체

  // ✅ 올바른 방법
  if (safeIncludes(nftData.nfts, "nft1")) {
    console.log("NFT가 포함되어 있습니다");
  }

  if (safeIncludes(tokenData, "token1")) {
    console.log("토큰이 포함되어 있습니다");
  }
}

// 예시 3: 동적 데이터 처리
export function Example3(data: any) {
  // 데이터가 배열인지 확인
  if (isArray(data)) {
    console.log("배열 길이:", safeLength(data));
    console.log("첫 번째 항목:", safeGet(data, 0));
  } else {
    console.log("데이터가 배열이 아닙니다:", typeof data);
  }

  // 안전한 배열 보장
  const safeArray = ensureArray(data, []);
  console.log("안전한 배열:", safeArray);
}

// 예시 4: 조건부 배열 처리
export function Example4(tokens: any) {
  // 배열 여부 확인 후 처리
  if (Array.isArray(tokens)) {
    if (tokens.includes("0x123")) {
      console.log("토큰이 포함되어 있습니다");
    }
  } else {
    console.log("tokens가 배열이 아닙니다:", typeof tokens);
  }
}

// 예시 5: 에러 처리
export function Example5(tokens: any) {
  try {
    if (Array.isArray(tokens) && tokens.includes("0x123")) {
      console.log("토큰이 포함되어 있습니다");
    } else {
      console.log("토큰이 포함되어 있지 않거나 배열이 아닙니다");
    }
  } catch (error) {
    console.error("배열 처리 중 오류:", error);
  }
}
