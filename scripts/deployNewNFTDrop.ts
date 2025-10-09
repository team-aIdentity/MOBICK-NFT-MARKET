import { createThirdwebClient } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { deployContract } from "thirdweb";

const client = createThirdwebClient({
  clientId: "7bdbc0d84b2e56262e8e603b301e0762",
});

async function deployNewNFTDrop() {
  try {
    console.log("🚀 thirdweb API로 NFT Drop 컨트랙트 자동 배포 중...");

    // thirdweb v5 SDK를 사용한 NFT Drop 배포
    console.log("📋 thirdweb v5 SDK로 NFT Drop 배포 시도...");

    // 방법 1: thirdweb v5 SDK 사용
    const { deployNFTDrop } = await import("thirdweb/extensions/prebuilts");

    const { contractAddress, transactionHash } = await deployNFTDrop({
      client,
      chain: baseSepolia,
      params: {
        name: "춘심이네 NFT Collection",
        symbol: "CHUNSIM",
        description: "춘심이네 NFT 컬렉션",
        image: "https://example.com/collection-image.png",
        claimConditions: [
          {
            startTime: new Date(),
            maxClaimableSupply: 1000,
            maxClaimablePerWallet: 10,
            price: "0",
            currency: "0x0000000000000000000000000000000000000000",
          },
        ],
      },
    });

    console.log("✅ NFT Drop 배포 완료!");
    console.log("📋 컨트랙트 주소:", contractAddress);
    console.log("📋 트랜잭션 해시:", transactionHash);

    console.log("\n🔧 다음 단계:");
    console.log(
      "1. src/lib/thirdweb.ts에서 NFT_CONTRACT_ADDRESS를 다음으로 변경:"
    );
    console.log(`   "${contractAddress}"`);
    console.log("2. 애플리케이션 재시작");
  } catch (error) {
    console.error("❌ API 배포 실패:", error);
    console.log("\n💡 대안 방법:");
    console.log("thirdweb 대시보드에서 수동으로 배포하세요:");
    console.log("1. https://thirdweb.com/dashboard 접속");
    console.log("2. 'Deploy new contract' 클릭");
    console.log("3. 'NFT Drop' 선택");
    console.log("4. Base Sepolia 네트워크 선택");
    console.log("5. Claim Conditions 설정");
  }
}

deployNewNFTDrop();
