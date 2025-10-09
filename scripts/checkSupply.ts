import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

// 프로젝트 내 설정을 그대로 사용
const NFT_CONTRACT_ADDRESS = "0x8467d0A3C2d71dd0ef9E4869A71096324C420803";
const CLIENT_ID =
  process.env.THIRDWEB_CLIENT_ID || "7bdbc0d84b2e56262e8e603b301e0762";

async function main() {
  const client = createThirdwebClient({ clientId: CLIENT_ID });
  const nft = getContract({
    client,
    chain: baseSepolia,
    address: NFT_CONTRACT_ADDRESS,
  });

  try {
    // totalSupply 시도
    console.log("totalSupply 조회 중...");
    const totalSupply = await readContract({
      contract: nft,
      method: "totalSupply",
      params: [],
    });
    console.log("✅ totalSupply:", totalSupply.toString());
  } catch (error) {
    console.log("❌ totalSupply 실패:", error.message);

    // tokenURI(1) 시도
    try {
      console.log("tokenURI(1) 조회 중...");
      const tokenURI = await readContract({
        contract: nft,
        method: "tokenURI",
        params: [1],
      });
      console.log("✅ tokenURI(1):", tokenURI);
    } catch (error2) {
      console.log("❌ tokenURI(1) 실패:", error2.message);

      // ownerOf(1) 시도
      try {
        console.log("ownerOf(1) 조회 중...");
        const owner = await readContract({
          contract: nft,
          method: "ownerOf",
          params: [1],
        });
        console.log("✅ ownerOf(1):", owner);
      } catch (error3) {
        console.log("❌ ownerOf(1) 실패:", error3.message);
        console.log("결론: 아직 발행된 NFT가 없습니다.");
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
