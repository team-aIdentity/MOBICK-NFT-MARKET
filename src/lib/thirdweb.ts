import { getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

// 클라이언트 설정
export const client = createThirdwebClient({
  clientId:
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
    "2be3d5da6304165f5243bf4a3fe35aad",
});

// Base Sepolia 체인
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  rpc: "https://sepolia.base.org",
});

// 컨트랙트 주소들 (환경변수에서 가져오기)
export const NFT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS ||
  "0x8C9ecbA1e2540d4733c19b8e2F6d213a7248592a"; // ERC721 NFT Collection

export const MARKETPLACE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
  "0xd2D48B584902260DB216D66508148D25a7b0ef6a"; // NFT Market v3

export const PAY_TOKEN_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_ERC20_ADDRESS ||
  "0xFD422282408204B877bc4a56b3265d4f7b6d94D1"; // ERC20 토큰

// 컨트랙트 객체들
export const NFT_CONTRACT = getContract({
  client,
  chain: baseSepolia,
  address: NFT_CONTRACT_ADDRESS,
});

export const MARKETPLACE_CONTRACT = getContract({
  client,
  chain: baseSepolia,
  address: MARKETPLACE_CONTRACT_ADDRESS,
});

export const PAY_TOKEN_CONTRACT = getContract({
  client,
  chain: baseSepolia,
  address: PAY_TOKEN_CONTRACT_ADDRESS,
});

// Base Sepolia 체인 ID
export const CHAIN_ID = 84532; // Base Sepolia 테스트넷
