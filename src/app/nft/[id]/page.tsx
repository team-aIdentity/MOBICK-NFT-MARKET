"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, readContract, sendTransaction } from "thirdweb";
import { useActiveWallet } from "thirdweb/react";
import {
  NFT_CONTRACT,
  MARKETPLACE_CONTRACT,
  PAY_TOKEN_CONTRACT,
} from "@/lib/thirdweb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface NFTData {
  tokenId: string;
  contractAddress: string;
  metadata: NFTMetadata | null;
  owner: string;
  price?: string;
  isListed: boolean;
  creator: string;
  tokenURI: string;
  listingId?: string; // 마켓플레이스 리스팅 ID
}

export default function NFTDetailPage() {
  const params = useParams();
  const account = useActiveAccount();
  const address = account?.address;
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 안전한 fetch 함수 (CORS 문제 해결)
  const safeFetch = async (
    url: string,
    timeout = 10000
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);
      return { success: false, error: String(error) };
    }
  };

  // IPFS URL을 HTTP URL로 변환
  const convertIPFSUrl = (ipfsUrl: string): string => {
    if (ipfsUrl.startsWith("ipfs://")) {
      const hash = ipfsUrl.replace("ipfs://", "");
      return `https://ipfs.io/ipfs/${hash}`;
    }
    return ipfsUrl;
  };

  // NFT 구매 함수
  const handlePurchase = async () => {
    if (!nftData || !account || !nftData.price) {
      alert("구매 정보가 올바르지 않습니다.");
      return;
    }

    try {
      setIsPurchasing(true);
      console.log("🛒 NFT 구매 시작:", nftData.tokenId, nftData.price);

      // 1. ERC20 토큰 승인 확인
      const priceInWei = BigInt(Math.floor(parseFloat(nftData.price) * 1e18));
      console.log("💰 구매 가격 (Wei):", priceInWei.toString());

      const allowance = await readContract({
        contract: PAY_TOKEN_CONTRACT,
        method: "function allowance(address,address) view returns (uint256)",
        params: [account.address, MARKETPLACE_CONTRACT.address],
      });
      console.log("🔐 현재 승인 금액:", allowance.toString());

      // 2. 승인 금액이 부족한 경우 승인 요청
      if (allowance < priceInWei) {
        console.log("📝 ERC20 토큰 승인 필요");

        const approveCall = prepareContractCall({
          contract: PAY_TOKEN_CONTRACT,
          method: "function approve(address,uint256) returns (bool)",
          params: [MARKETPLACE_CONTRACT.address, priceInWei],
        });

        const approveResult = await sendTransaction({
          transaction: approveCall,
          account: account,
        });

        console.log("✅ 승인 트랜잭션:", approveResult.transactionHash);

        // 승인 트랜잭션 완료 대기
        await approveResult.result;
        console.log("✅ ERC20 토큰 승인 완료");
      }

      // 3. NFT 구매 실행 (Extension을 통한 구매)
      console.log("🛒 NFT 구매 트랜잭션 실행");

      // Extension 기반 마켓플레이스는 getImplementationForFunction을 통해
      // 실제 구현 주소를 찾아야 하지만, Thirdweb v5 SDK는 자동으로 처리합니다.

      // 리스팅 ID가 없으면 구매 불가
      if (!nftData.listingId) {
        alert(
          "❌ 리스팅 ID를 찾을 수 없습니다.\n이 NFT는 현재 판매 중이 아닙니다."
        );
        return;
      }

      const purchaseCall = prepareContractCall({
        contract: MARKETPLACE_CONTRACT,
        method:
          "function buyFromListing(uint256,address,uint256,address,uint256)",
        params: [
          BigInt(nftData.listingId), // _listingId
          account.address, // _buyFor
          BigInt(1), // _quantity
          PAY_TOKEN_CONTRACT.address, // _currency
          priceInWei, // _expectedTotalPrice
        ],
      });

      const purchaseResult = await sendTransaction({
        transaction: purchaseCall,
        account: account,
      });

      console.log("✅ 구매 트랜잭션:", purchaseResult.transactionHash);

      // 구매 트랜잭션 완료 대기
      await purchaseResult.result;
      console.log("🎉 NFT 구매 완료!");

      // 4. 성공 알림 및 페이지 새로고침
      alert(
        `🎉 NFT 구매가 완료되었습니다!\n트랜잭션: ${purchaseResult.transactionHash}`
      );

      // NFT 데이터 새로고침
      window.location.reload();
    } catch (error) {
      console.error("❌ NFT 구매 실패:", error);

      let errorMessage = "구매 중 오류가 발생했습니다.";
      if (error instanceof Error) {
        if (error.message.includes("insufficient")) {
          errorMessage = "SBMB 토큰 잔액이 부족합니다.";
        } else if (error.message.includes("allowance")) {
          errorMessage = "토큰 승인에 실패했습니다.";
        } else if (error.message.includes("price")) {
          errorMessage = "가격이 변경되었습니다. 페이지를 새로고침해주세요.";
        } else {
          errorMessage = error.message;
        }
      }

      alert(`❌ 구매 실패\n${errorMessage}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  useEffect(() => {
    const fetchNFTData = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const tokenId = params.id as string;
        console.log("🔍 NFT 상세 정보 조회 시작:", tokenId);

        // 1. TokenURI 가져오기
        const tokenURIResult = await readContract({
          contract: NFT_CONTRACT,
          method: "function tokenURI(uint256) view returns (string)",
          params: [BigInt(tokenId)],
        });
        console.log("📡 TokenURI:", tokenURIResult);

        if (!tokenURIResult || tokenURIResult.trim() === "") {
          throw new Error("TokenURI가 비어있습니다");
        }

        // 2. 메타데이터 가져오기 (여러 게이트웨이 시도)
        let metadata: NFTMetadata | null = null;
        const urlsToTry = [];

        if (tokenURIResult.startsWith("ipfs://")) {
          const ipfsHash = tokenURIResult.replace("ipfs://", "");
          console.log("🔗 IPFS 해시:", ipfsHash);
          urlsToTry.push(
            // 기본 IPFS 게이트웨이들
            `https://ipfs.io/ipfs/${ipfsHash}`,
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            `https://dweb.link/ipfs/${ipfsHash}`,

            // NFT Storage 게이트웨이 (소문자)
            `https://${ipfsHash.toLowerCase()}.ipfs.nftstorage.link`,

            // Cloudflare IPFS
            `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,

            // IPFS Public Gateway
            `https://ipfs.fleek.co/ipfs/${ipfsHash}`,

            // 추가 게이트웨이들
            `https://ipfs.eth.aragon.network/ipfs/${ipfsHash}`,
            `https://ipfs.io/ipfs/${ipfsHash}`,

            // 사용자 커스텀 Pinata (마지막에 시도)
            `https://gray-famous-lemming-869.mypinata.cloud/ipfs/${ipfsHash}`
          );
        } else {
          urlsToTry.push(tokenURIResult);
        }

        console.log("📋 시도할 URL 목록:", urlsToTry);

        // 🚀 병렬 처리: 모든 게이트웨이를 동시에 시도하고 가장 빠른 것 사용
        const fetchPromises = urlsToTry.map((url, index) =>
          safeFetch(url, 5000) // 5초 타임아웃 (병렬이므로 짧게)
            .then((result) => ({
              url,
              index,
              result,
            }))
        );

        // Promise.race 대신 Promise.allSettled로 모든 결과 확인
        const results = await Promise.allSettled(fetchPromises);

        for (const promiseResult of results) {
          if (
            promiseResult.status === "fulfilled" &&
            promiseResult.value.result.success
          ) {
            metadata = promiseResult.value.result.data as NFTMetadata;
            console.log(
              "✅ 메타데이터 성공 (게이트웨이):",
              promiseResult.value.url
            );
            console.log("✅ 메타데이터:", metadata);
            break;
          }
        }

        if (!metadata) {
          console.log("❌ 모든 메타데이터 게이트웨이 실패");
          console.log("📋 시도한 URL들:", urlsToTry);

          // 기본 메타데이터로 대체
          metadata = {
            name: `춘심이네 NFT #${tokenId}`,
            description: "춘심이네 NFT 컬렉션의 특별한 작품입니다.",
            image: "🎨",
          };
          console.log("🔄 기본 메타데이터 사용:", metadata);
        }

        // 3. 소유자 정보 가져오기
        const owner = await readContract({
          contract: NFT_CONTRACT,
          method: "function ownerOf(uint256) view returns (address)",
          params: [BigInt(tokenId)],
        });
        console.log("👤 소유자:", owner);

        // 4. 마켓플레이스에서 리스팅 정보 확인
        let price: string | undefined;
        let isListed = false;
        let listingId: string | undefined;

        try {
          // totalListings로 개수 확인 후 개별 조회
          console.log("📋 마켓플레이스 리스팅 조회 중...");

          const totalListingsCount = await readContract({
            contract: MARKETPLACE_CONTRACT,
            method: "function totalListings() view returns (uint256)",
            params: [],
          });

          console.log("📋 전체 리스팅 개수:", totalListingsCount.toString());

          // 🚀 병렬 처리: 최대 10개 리스팅만 동시 조회
          const maxListings = Math.min(Number(totalListingsCount), 10);

          const listingPromises = [];
          for (let i = 0; i < maxListings; i++) {
            listingPromises.push(
              readContract({
                contract: MARKETPLACE_CONTRACT,
                method:
                  "function getListing(uint256) view returns (uint256,uint256,uint256,uint256,uint128,uint128,address,address,address,uint8,uint8,bool)",
                params: [BigInt(i)],
              })
                .then((listing) => ({ index: i, listing, success: true }))
                .catch((error) => ({ index: i, error, success: false }))
            );
          }

          const listingResults = await Promise.all(listingPromises);

          for (const result of listingResults) {
            if (!result.success) continue;

            const [
              _listingId,
              _tokenId,
              _quantity,
              _pricePerToken,
              _startTimestamp,
              _endTimestamp,
              _listingCreator,
              _assetContract,
              _currency,
              _tokenType,
              _status,
              _reserved,
            ] = result.listing;

            console.log(
              `📋 리스팅 ${result.index}: tokenId=${_tokenId}, status=${_status}`
            );

            // 현재 NFT와 일치하는지 확인
            if (
              _tokenId.toString() === tokenId &&
              _assetContract.toLowerCase() ===
                NFT_CONTRACT.address.toLowerCase() &&
              _status === 1 // ACTIVE
            ) {
              listingId = _listingId.toString();
              price = (Number(_pricePerToken) / 1e18).toString();
              isListed = true;
              console.log("💰 리스팅 발견!");
              console.log("   - 리스팅 ID:", listingId);
              console.log("   - 가격:", price, "SBMB");
              console.log("   - 판매자:", _listingCreator);
              break;
            }
          }

          if (!isListed) {
            console.log("📋 이 NFT는 현재 판매 중이 아닙니다.");
          }
        } catch (error) {
          console.log("⚠️ 리스팅 정보 조회 실패:", error);
        }

        // 5. NFT 데이터 구성
        const nftData: NFTData = {
          tokenId,
          contractAddress: NFT_CONTRACT.address,
          metadata: {
            ...metadata,
            image: convertIPFSUrl(metadata.image),
          },
          owner,
          price,
          isListed,
          creator: "춘심이네",
          tokenURI: tokenURIResult,
          listingId, // 마켓플레이스 리스팅 ID 추가
        };

        setNftData(nftData);
        console.log("✅ NFT 데이터 구성 완료:", nftData);
      } catch (error) {
        console.error("❌ NFT 데이터 조회 실패:", error);
        setError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTData();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">NFT 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            NFT를 찾을 수 없습니다
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (!nftData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">🎨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            NFT 정보가 없습니다
          </h1>
          <p className="text-gray-600">
            이 NFT는 존재하지 않거나 삭제되었습니다.
          </p>
        </div>
      </div>
    );
  }

  const isOwner =
    address && address.toLowerCase() === nftData.owner.toLowerCase();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 좌측: NFT 이미지 */}
            <div className="space-y-4">
              {/* 메인 이미지 */}
              <div className="relative aspect-square bg-gray-100 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
                {nftData.metadata?.image &&
                (nftData.metadata.image.startsWith("http://") ||
                  nftData.metadata.image.startsWith("https://")) ? (
                  <img
                    src={nftData.metadata.image}
                    alt={nftData.metadata.name || "NFT"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(
                        "🖼️ 이미지 로드 실패:",
                        nftData.metadata?.image
                      );
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML =
                          '<span class="text-8xl">🎨</span>';
                      }
                    }}
                    onLoad={() => {
                      console.log(
                        "✅ 이미지 로드 성공:",
                        nftData.metadata?.image
                      );
                    }}
                  />
                ) : (
                  <span className="text-8xl">🎨</span>
                )}
              </div>

              {/* 액션 버튼들 */}
              <div className="flex gap-3">
                <button className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
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
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                  Full Screen
                </button>
                <button className="flex-1 bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download HD
                </button>
              </div>
            </div>

            {/* 우측: NFT 정보 */}
            <div className="space-y-6">
              {/* 제목 및 컬렉션 */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {nftData.metadata?.name || `춘심이네 NFT #${nftData.tokenId}`}
                </h1>
                <p className="text-gray-600 mb-3">춘심이네 NFT Collection</p>
                <div className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Art
                  </span>
                  {isOwner && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
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
                    </span>
                  )}
                </div>
              </div>

              {/* 설명 */}
              {nftData.metadata?.description && (
                <div>
                  <p className="text-gray-700 leading-relaxed">
                    {nftData.metadata.description}
                  </p>
                </div>
              )}

              {/* 현재 상태 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Current Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Owned</span>
                    </span>
                  </div>
                  {nftData.price && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Price</span>
                      <span className="font-bold text-lg text-green-600">
                        {nftData.price} SBMB
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Owner</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {nftData.owner.slice(0, 6)}...{nftData.owner.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 기술적 세부사항 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Technical Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {nftData.contractAddress.slice(0, 6)}...
                        {nftData.contractAddress.slice(-4)}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
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
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Token ID</span>
                    <span className="font-mono">{nftData.tokenId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Token Standard</span>
                    <span>ERC-721</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Blockchain</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      BASE SEPOLIA
                    </span>
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex gap-4">
                {isOwner ? (
                  <>
                    {!nftData.isListed ? (
                      <button className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
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
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        List for Sale
                      </button>
                    ) : (
                      <button className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cancel Listing
                      </button>
                    )}
                    <button className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
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
                      Transfer
                    </button>
                  </>
                ) : nftData.isListed && nftData.price ? (
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing || !address}
                    className={`flex-1 px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      isPurchasing || !address
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                  >
                    {isPurchasing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        구매 중...
                      </>
                    ) : (
                      <>
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
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
                          />
                        </svg>
                        Buy for {nftData.price} SBMB
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex-1 bg-gray-100 text-gray-500 px-6 py-3 rounded-xl text-center">
                    Not for Sale
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
