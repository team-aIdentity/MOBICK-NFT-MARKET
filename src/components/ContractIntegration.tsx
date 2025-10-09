"use client";

import {
  useContract,
  useContractRead,
  useAddress,
  useConnectionStatus,
  useSDK,
} from "@thirdweb-dev/react";

// 베이스 메인넷 배포된 컨트랙트 주소들
const NFT_COLLECTION_ADDRESS = "0x8467d0A3C2d71dd0ef9E4869A71096324C420803"; // 베이스 메인넷 NFT DROP 주소

export default function ContractIntegration() {
  const address = useAddress();
  const connectionStatus = useConnectionStatus();
  const sdk = useSDK();

  // 컨트랙트 인스턴스 생성 (Base Sepolia)
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS);

  // NFT 컬렉션 정보 가져오기
  const { data: collectionName } = useContractRead(nftContract, "name");
  const { data: collectionSymbol } = useContractRead(nftContract, "symbol");
  const { data: totalSupply } = useContractRead(nftContract, "totalSupply");

  // NFT 민팅 처리 (실제 thirdweb SDK 사용)
  const handleMintNFT = async () => {
    if (!address || !sdk) {
      alert("먼저 지갑을 연결해주세요.");
      return;
    }

    try {
      // NFT 컬렉션 컨트랙트 가져오기 (Base Sepolia)
      const nftContract = await sdk.getContract(
        NFT_COLLECTION_ADDRESS,
        "nft-collection"
      );

      // NFT 민팅
      const tx = await nftContract.call("mintTo", [
        address, // 민팅할 주소
        "https://ipfs.io/ipfs/QmYourMetadataHashHere/metadata.json", // 메타데이터 URI
      ]);

      console.log("NFT minted:", tx);
      alert("NFT가 성공적으로 민팅되었습니다!");
    } catch (error) {
      console.error("민팅 실패:", error);
      alert(
        "민팅 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  if (connectionStatus === "connecting") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">지갑 연결 중...</div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">지갑을 연결해주세요</h2>
        <p className="text-gray-600">
          컨트랙트와 상호작용하려면 지갑 연결이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          컨트랙트 통합 대시보드
        </h2>
        <p className="text-gray-600">
          배포된 NFT 컬렉션과 마켓플레이스와 상호작용하세요.
        </p>
      </div>

      {/* 컬렉션 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">NFT 컬렉션 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">컬렉션 이름</p>
            <p className="text-lg font-semibold">
              {collectionName || "로딩 중..."}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">심볼</p>
            <p className="text-lg font-semibold">
              {collectionSymbol || "로딩 중..."}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">총 공급량</p>
            <p className="text-lg font-semibold">
              {totalSupply?.toString() || "로딩 중..."}
            </p>
          </div>
        </div>
      </div>

      {/* NFT 민팅 */}
      <div className="bg-green-50 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">NFT 민팅</h3>
        <p className="text-gray-600 mb-4">
          새로운 NFT를 민팅하여 컬렉션에 추가하세요.
        </p>
        <button
          onClick={handleMintNFT}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          NFT 민팅하기
        </button>
      </div>

      {/* 사용 가이드 */}
      <div className="mt-8 bg-yellow-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
          설정 가이드
        </h3>
        <ul className="text-yellow-800 space-y-2">
          <li>
            • ContractIntegration.tsx 파일에서 컨트랙트 주소를 실제 주소로
            교체하세요.
          </li>
          <li>• .env.local 파일에 thirdweb Client ID를 설정하세요.</li>
          <li>• NFT 이미지 메타데이터 URI를 설정하세요.</li>
          <li>• 테스트넷에서 먼저 테스트하는 것을 권장합니다.</li>
        </ul>
      </div>
    </div>
  );
}
