"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { convertIPFSUrl } from "@/utils/ipfs";

function MintSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [nftData, setNftData] = useState<any>(null);
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    // URL 파라미터에서 데이터 가져오기
    const tokenId = searchParams.get("tokenId");
    const txHash = searchParams.get("txHash");
    const contractAddress = searchParams.get("contractAddress");
    const nftName = searchParams.get("nftName");
    const nftDescription = searchParams.get("nftDescription");
    const nftImage = searchParams.get("nftImage");
    const category = searchParams.get("category");
    const gasFee = searchParams.get("gasFee");
    const blockNumber = searchParams.get("blockNumber");
    const confirmations = searchParams.get("confirmations");
    const mintedAt = searchParams.get("mintedAt");

    // 카테고리별 기본 이미지
    const categoryIcons = {
      art: "🎨",
      utility: "🔧",
      activity: "🏃",
    };

    if (tokenId && txHash) {
      // ⚡ 이미지 URL 처리 (이미 HTTP로 변환되어 전달됨)
      const finalImage =
        nftImage ||
        categoryIcons[category as keyof typeof categoryIcons] ||
        "🎨";

      console.log("🖼️ 민팅 성공 페이지 이미지:", finalImage);

      setNftData({
        tokenId,
        name: nftName || `춘심이네 NFT #${tokenId}`,
        collection: "춘심이네 NFT Collection",
        image: finalImage,
        description: nftDescription || "",
        category: category || "art",
        creator: "춘심이네",
      });

      // SSR/CSR 불일치 방지를 위해 날짜는 한 번만 고정
      const stableMintedAt = mintedAt || new Date().toISOString();

      setTransactionData({
        txHash,
        contractAddress: contractAddress || "0x8f4a2b...8e2c5f",
        gasFee: gasFee || "0.008 ETH",
        blockNumber: blockNumber || "#18,543,892",
        confirmations: confirmations || "12 confirmations",
        mintedAt: stableMintedAt,
      });
    }
  }, [searchParams]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}이(가) 복사되었습니다!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      <Header />

      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 성공 메시지 */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                NFT Minted Successfully!
              </h1>
              <p className="text-lg text-black max-w-2xl mx-auto">
                Congratulations! Your NFT has been successfully created and
                minted on the blockchain. It's now part of your collection and
                ready to be shared with the world.
              </p>
            </div>
          </div>

          {/* NFT 카드 */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            {/* 카드 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your New NFT</h2>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-600 font-medium">Minted</span>
              </div>
            </div>

            {/* NFT 정보 */}
            <div className="flex gap-6 mb-8">
              {/* NFT 이미지 */}
              <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {nftData?.image &&
                (nftData.image.startsWith("http://") ||
                  nftData.image.startsWith("https://")) ? (
                  <img
                    src={nftData.image}
                    alt={nftData?.name || "NFT"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("🖼️ 이미지 로드 실패:", nftData.image);
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML =
                          '<span class="text-4xl">🎨</span>';
                      }
                    }}
                    onLoad={() => {
                      console.log("✅ 이미지 로드 성공:", nftData.image);
                    }}
                  />
                ) : (
                  <span className="text-4xl">{nftData?.image || "🎨"}</span>
                )}
              </div>

              {/* NFT 기본 정보 */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {nftData?.name || "춘심이네 NFT"}
                </h3>
                <p className="text-black mb-4">
                  {nftData?.collection || "춘심이네 NFT Collection"}
                </p>
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  <span>You Created by You</span>
                </div>
              </div>
            </div>

            {/* 민팅 상세 정보 */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* 민팅 상세 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Minting Details
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-black">Token ID</span>
                    <span className="font-medium">
                      #{nftData?.tokenId || "1"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Blockchain</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="font-medium">BASE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {transactionData?.contractAddress ||
                          "0x8f4a2b...8e2c5f"}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            transactionData?.contractAddress ||
                              "0x8f4a2b...8e2c5f",
                            "컨트랙트 주소"
                          )
                        }
                        className="text-gray-500 hover:text-gray-700"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Gas Fee Paid</span>
                    <span className="font-medium">
                      {transactionData?.gasFee || "0.008 ETH"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 블록체인 트랜잭션 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Blockchain Transaction
                  </h4>
                  <a
                    href={`https://sepolia.basescan.org/tx/${transactionData?.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    View on BaseScan
                    <span>↗</span>
                  </a>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-black">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {transactionData?.txHash?.substring(0, 20)}...
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            transactionData?.txHash || "",
                            "트랜잭션 해시"
                          )
                        }
                        className="text-gray-500 hover:text-gray-700"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Block Number</span>
                    <span className="font-medium">
                      {transactionData?.blockNumber || "#18,543,892"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Confirmations</span>
                    <span className="text-blue-600 font-medium">
                      {transactionData?.confirmations || "12 confirmations"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">Minted At</span>
                    <span className="font-medium">
                      {transactionData?.mintedAt
                        ? new Date(transactionData.mintedAt).toLocaleString(
                            "ko-KR"
                          )
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/collection"
              className="flex items-center gap-3 bg-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              <span>📁</span>
              View My Collection
            </Link>
            <Link
              href={`/sell?tokenId=${nftData?.tokenId}`}
              className="flex items-center gap-3 bg-white text-green-600 border-2 border-green-500 px-8 py-4 rounded-xl font-semibold hover:bg-green-50 transition-colors"
            >
              <span>🏷️</span>
              List for Sale
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function MintSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <MintSuccessContent />
    </Suspense>
  );
}
