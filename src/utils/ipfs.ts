/**
 * IPFS URL을 HTTP URL로 변환하는 유틸리티 함수
 * @param ipfsUrl - IPFS URL (ipfs://... 형식)
 * @returns HTTP URL
 */
export function convertIPFSUrl(ipfsUrl: string): string {
  if (!ipfsUrl) return "";
  if (ipfsUrl.startsWith("ipfs://")) {
    const hash = ipfsUrl.replace("ipfs://", "");
    // 커스텀 Pinata 게이트웨이 사용 (토큰 포함)
    const gatewayToken =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN ||
      "UHWXvO0yfhuWgUiWlPTtdQKSA7Bp1lRpAAXAcYzZ__PuxBCvtJ2W7Brth4Q6V8UI";
    return `https://gray-famous-lemming-869.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${gatewayToken}`;
  }
  return ipfsUrl;
}
