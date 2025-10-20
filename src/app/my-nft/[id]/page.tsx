"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import {
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import { NFT_CONTRACT_ADDRESS } from "@/lib/thirdweb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { convertIPFSUrl } from "@/utils/ipfs";

export default function MyNFTDetailPage() {
  const params = useParams();
  const nftId = parseInt(params.id as string);
  const account = useActiveAccount();
  const [nft, setNft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);

  // URL에서 컨트랙트 주소 가져오기 (없으면 기본값 사용)
  const contractAddress =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("contract") ||
        NFT_CONTRACT_ADDRESS
      : NFT_CONTRACT_ADDRESS;

  // 안전한 fetch 함수 (CORS 문제 해결)
  const safeFetch = async (
    url: string,
    timeout = 10000
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        return { success: false, error: "빈 응답" };
      }

      const data = JSON.parse(responseText);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  };

  // NFT 데이터 가져오기
  useEffect(() => {
    const fetchNFT = async () => {
      try {
        setIsLoading(true);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔍 My NFT 상세 페이지 - NFT 조회 시작");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋 NFT ID (URL에서):", nftId);
        console.log("📝 Contract Address:", contractAddress);
        console.log("👤 현재 계정:", account?.address);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const nftContract = getContract({
          client: client,
          chain: baseSepolia,
          address: contractAddress,
        });

        // 먼저 NFT 소유권 확인
        const owner = await readContract({
          contract: nftContract,
          method: "function ownerOf(uint256 tokenId) view returns (address)",
          params: [BigInt(nftId)],
        });

        console.log("🔍 NFT 소유자:", owner);
        console.log("🔍 현재 계정:", account?.address);

        if (account && owner.toLowerCase() !== account.address.toLowerCase()) {
          console.error("❌ 이 NFT의 소유자가 아닙니다");
          setNft(null);
          setIsLoading(false);
          return;
        }

        // tokenURI 가져오기
        const tokenURIResult = await readContract({
          contract: nftContract,
          method: "function tokenURI(uint256 tokenId) view returns (string)",
          params: [BigInt(nftId)],
        });

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📦 TokenURI 조회 완료:", tokenURIResult);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        let metadata = null;
        let fetchSuccess = false;

        if (tokenURIResult && tokenURIResult.trim() !== "") {
          let urlsToTry = [];

          if (tokenURIResult.startsWith("ipfs://")) {
            const ipfsHash = tokenURIResult.replace("ipfs://", "");
            console.log("📝 IPFS 해시:", ipfsHash);
            urlsToTry = [
              `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${ipfsHash}`, // ⚡ Pinata 커스텀 (1순위)
              `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Pinata 공식
              `https://ipfs.io/ipfs/${ipfsHash}`, // ipfs.io
            ];
          } else {
            urlsToTry = [tokenURIResult];
          }

          console.log(
            "🔄 메타데이터 로딩 시도 중... (총 " +
              urlsToTry.length +
              "개 게이트웨이)"
          );

          for (let i = 0; i < urlsToTry.length; i++) {
            const url = urlsToTry[i];
            console.log(`📝 ${i + 1}/${urlsToTry.length} 시도: ${url}`);

            const result = await safeFetch(url, 10000);
            if (result.success) {
              metadata = result.data;
              fetchSuccess = true;
              console.log(`✅ ${i + 1}/${urlsToTry.length} 성공!`);
              console.log("📦 로드된 메타데이터:", metadata);
              break;
            } else {
              console.log(
                `❌ ${i + 1}/${urlsToTry.length} 실패:`,
                result.error
              );
            }
          }

          if (!fetchSuccess) {
            console.log("❌ 모든 게이트웨이에서 메타데이터 로드 실패");
          }
        } else {
          console.log("⚠️ TokenURI가 비어있습니다");
        }

        // 이미지 URL 처리 (다중 게이트웨이)
        let imageUrl = "🎨";
        if (metadata?.image) {
          console.log("🖼️ 메타데이터 이미지:", metadata.image);

          if (metadata.image.startsWith("ipfs://")) {
            imageUrl = convertIPFSUrl(metadata.image); // ⚡ IPFS URL 변환
          } else if (
            metadata.image.startsWith("http://") ||
            metadata.image.startsWith("https://")
          ) {
            imageUrl = metadata.image;
            console.log("🖼️ HTTP 이미지 사용:", imageUrl);
          } else {
            imageUrl = metadata.image; // 이모지 등
            console.log("🖼️ 기타 이미지 사용:", imageUrl);
          }
        } else {
          console.log("⚠️ 메타데이터에 이미지 없음, 기본값 사용");
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📦 최종 NFT 데이터 구성:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📝 Name:", metadata?.name || `NFT #${nftId}`);
        console.log(
          "📝 Description:",
          metadata?.description || "No description"
        );
        console.log("🖼️ Image URL:", imageUrl);
        console.log("📋 Category:", metadata?.category || "art");
        console.log("✅ 메타데이터 로드 성공:", fetchSuccess);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const formattedNFT = {
          id: nftId,
          name: metadata?.name || `NFT #${nftId}`,
          collection: metadata?.collection || "NFT Collection",
          description: metadata?.description || "No description available",
          image: imageUrl,
          category: metadata?.category || "art",
          creator: metadata?.creator || owner,
          contractAddress: contractAddress,
          tokenId: nftId.toString(),
          tokenStandard: "ERC-721",
          tokenURI: tokenURIResult,
          metadata: metadata,
          fetchSuccess: fetchSuccess,
        };

        console.log("📦 최종 formattedNFT:", formattedNFT);
        setNft(formattedNFT);
      } catch (error) {
        console.error("NFT 가져오기 실패:", error);
        setNft(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (nftId && account) {
      fetchNFT();
    } else {
      console.log("🔍 NFT ID 또는 계정이 없음:", {
        nftId,
        account: account?.address,
      });
      setIsLoading(false);
    }
  }, [nftId, account]);

  // 전송 함수
  const handleTransfer = async (recipientAddress: string) => {
    if (!account?.address) {
      alert("지갑이 연결되지 않았습니다.");
      return;
    }

    try {
      setIsTransferring(true);
      console.log(`📤 NFT #${nftId} 전송 시작:`, {
        from: account.address,
        to: recipientAddress,
        tokenId: nftId,
      });

      const nftContract = getContract({
        client: client,
        chain: baseSepolia,
        address: NFT_CONTRACT_ADDRESS,
      });

      const transferTx = prepareContractCall({
        contract: nftContract,
        method:
          "function safeTransferFrom(address from, address to, uint256 tokenId)",
        params: [account.address, recipientAddress, BigInt(nftId)],
      });

      const result = await sendTransaction({
        transaction: transferTx,
        account: account,
      });

      console.log("✅ NFT 전송 성공:", result);
      alert(`NFT #${nftId}이(가) ${recipientAddress}로 전송되었습니다!`);

      // My Collection으로 돌아가기
      window.location.href = "/collection";
    } catch (error) {
      console.error("❌ NFT 전송 실패:", error);
      alert(`NFT 전송 실패: ${error}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label}이(가) 복사되었습니다!`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-teal-600 mb-4">
              <svg
                className="animate-spin h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-lg">NFT 정보를 불러오는 중...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              NFT를 찾을 수 없습니다
            </h1>
            <p className="text-gray-600 mb-4">
              NFT ID: {nftId} | 계정: {account?.address?.slice(0, 6)}...
              {account?.address?.slice(-4)}
            </p>
            <p className="text-gray-600 mb-6">
              요청하신 NFT가 존재하지 않거나 소유자가 아닙니다.
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-gray-500">
            <span className="hover:text-teal-500 cursor-pointer">
              My Collection
            </span>
            <svg
              className="w-4 h-4 mx-3 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-gray-900 font-medium">{nft.name}</span>
          </nav>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
          {/* Left Panel - NFT Image */}
          <div className="space-y-6">
            <div className="relative aspect-square bg-gray-100 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
              {nft.image && nft.image.startsWith("http") ? (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-9xl filter drop-shadow-lg">
                  {nft.image}
                </div>
              )}
              {/* 소유자 뱃지 */}
              <div className="absolute top-6 right-6 bg-green-500 text-white rounded-full px-3 py-1 text-sm font-semibold flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                You Own This
              </div>
            </div>

            {/* Image Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                High Resolution Image
              </span>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                  Full Screen
                </button>
                <button className="flex items-center gap-2 bg-teal-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download HD
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - NFT Details */}
          <div className="space-y-8">
            {/* NFT Title and Overview */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {nft.name}
              </h1>
              <p className="text-lg text-gray-600 mb-4">{nft.collection}</p>

              {/* Tags */}
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-teal-500 text-white rounded-full text-sm font-medium">
                  {nft.category}
                </span>
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  You Own This
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed">{nft.description}</p>
            </div>

            {/* Creator Information */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Creator Information
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {nft.creator.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{nft.creator}</p>
                  <p className="text-sm text-gray-600">
                    Professional digital artist
                  </p>
                </div>
                <span className="px-2 py-1 bg-teal-500 text-white rounded-full text-xs font-medium flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Items Created</span>
                  <p className="font-semibold">347 Items</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Volume</span>
                  <p className="font-semibold">1.2K SBMB</p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    Owned
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Acquired Date</span>
                  <span className="font-medium">December 10, 2023</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Purchase Price</span>
                  <span className="font-medium">2.5 SBMB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Floor Price</span>
                  <span className="font-medium">2.8 SBMB</span>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Technical Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">View on BaseScan</span>
                  <a
                    href={`https://sepolia.basescan.org/address/${nft.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    View on BaseScan
                    <span>↗</span>
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Contract Address</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {nft.contractAddress}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(nft.contractAddress, "컨트랙트 주소")
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token ID</span>
                  <span className="font-medium">{nft.tokenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Standard</span>
                  <span className="font-medium">{nft.tokenStandard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
                    <span className="font-medium">BASE MAINNET</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metadata</span>
                  <a
                    href={nft.tokenURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    IPFS
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activity History
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Purchased</p>
                    <p className="text-sm text-gray-600">
                      From {nft.creator} • 2.5 SBMB • Dec 10, 2023
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Transferred</p>
                    <p className="text-sm text-gray-600">
                      To your wallet • - • Dec 10, 2023
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Minted</p>
                    <p className="text-sm text-gray-600">
                      By {nft.creator} • - • Dec 5, 2023
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const recipientAddress = prompt("받을 주소를 입력하세요:");
                  if (recipientAddress) {
                    handleTransfer(recipientAddress);
                  }
                }}
                disabled={isTransferring}
                className="flex-1 flex items-center justify-center gap-3 bg-teal-500 text-white py-4 px-6 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                {isTransferring ? "전송 중..." : "Transfer"}
              </button>
              <button
                onClick={() =>
                  (window.location.href = `/sell?tokenId=${nft.id}`)
                }
                className="flex-1 flex items-center justify-center gap-3 bg-white text-teal-600 border-2 border-teal-500 py-4 px-6 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8z"
                  />
                </svg>
                List for Sale
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
