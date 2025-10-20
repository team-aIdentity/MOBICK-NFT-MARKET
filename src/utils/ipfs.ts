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
      "NbYiVKRZkFdUvICDdjVwSnCYigS5_qBQPnL-ow5oou-0kGOUbTCoyp5Cwyx_jg8m";
    return `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${hash}?pinataGatewayToken=${gatewayToken}`;
  }
  return ipfsUrl;
}
