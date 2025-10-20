"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, readContract, sendTransaction } from "thirdweb";
import {
  NFT_CONTRACT,
  MARKETPLACE_CONTRACT,
  PAY_TOKEN_CONTRACT,
} from "@/lib/thirdweb";
import { convertIPFSUrl } from "@/utils/ipfs";
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
  const [isCancelling, setIsCancelling] = useState(false);

  // ⚡️ 극한 최적화: 2초 타임아웃
  const safeFetch = async (
    url: string,
    timeout = 2000 // 5초 → 2초로 단축!
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

  // NFT 구매 함수
  const handlePurchase = async () => {
    if (!nftData || !account || !nftData.price) {
      alert("구매 정보가 올바르지 않습니다.");
      return;
    }

    try {
      setIsPurchasing(true);
      console.log("🛒 NFT 구매 시작:", nftData.tokenId, nftData.price);

      // 1. 구매자 잔액 확인
      const priceInWei = BigInt(Math.floor(parseFloat(nftData.price) * 1e18));
      console.log("💰 구매 가격 (Wei):", priceInWei.toString());

      const balance = await readContract({
        contract: PAY_TOKEN_CONTRACT,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });

      console.log(
        "💵 구매자 SBMB 잔액:",
        (Number(balance) / 1e18).toFixed(2),
        "SBMB"
      );

      if (balance < priceInWei) {
        alert(
          `❌ SBMB 토큰이 부족합니다!\n\n` +
            `필요: ${nftData.price} SBMB\n` +
            `보유: ${(Number(balance) / 1e18).toFixed(2)} SBMB\n\n` +
            `SBMB 토큰을 충전해주세요.`
        );
        setIsPurchasing(false);
        return;
      }

      // 2. ERC20 토큰 승인 확인
      const allowance = await readContract({
        contract: PAY_TOKEN_CONTRACT,
        method: "function allowance(address,address) view returns (uint256)",
        params: [account.address, MARKETPLACE_CONTRACT.address],
      });
      console.log(
        "🔐 현재 승인 금액:",
        (Number(allowance) / 1e18).toFixed(2),
        "SBMB"
      );

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
      console.log("🎉 NFT 구매 완료!");

      // 4. 성공 알림 및 컬렉션 페이지로 이동
      alert(
        `🎉 NFT 구매가 완료되었습니다!\n\n` +
          `트랜잭션: ${purchaseResult.transactionHash}\n\n` +
          `내 컬렉션 페이지로 이동합니다...`
      );

      // 컬렉션 페이지로 리다이렉트 (구매한 NFT 확인)
      window.location.href = "/collection";
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

  // 리스팅 취소 함수
  const handleCancelListing = async () => {
    if (!nftData || !account || !nftData.listingId) {
      alert("취소할 리스팅 정보가 없습니다.");
      return;
    }

    if (
      !confirm(
        `정말로 판매를 취소하시겠습니까?\n\n현재 가격: ${nftData.price} SBMB`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      console.log("🗑️ 리스팅 취소 시작:", {
        listingId: nftData.listingId,
        tokenId: nftData.tokenId,
      });

      const cancelTransaction = prepareContractCall({
        contract: MARKETPLACE_CONTRACT,
        method: "function cancelListing(uint256 listingId)",
        params: [BigInt(nftData.listingId)],
      });

      const result = await sendTransaction({
        transaction: cancelTransaction,
        account,
      });

      console.log("✅ 리스팅 취소 완료:", result.transactionHash);

      alert(
        `🎉 판매가 취소되었습니다!\n\n트랜잭션: ${result.transactionHash}\n\n컬렉션 페이지로 이동합니다...`
      );

      window.location.href = "/collection";
    } catch (error) {
      console.error("❌ 리스팅 취소 실패:", error);
      alert(
        `판매 취소에 실패했습니다.\n\n오류: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    const fetchNFTData = async () => {
      if (!params.id) return;

      try {
        setIsLoading(true);
        setError(null);

        const tokenId = params.id as string;

        // ⚡ 극한 최적화 1: 블록체인 조회 병렬화 (tokenURI + owner 동시)
        const [tokenURIResult, owner] = await Promise.all([
          readContract({
            contract: NFT_CONTRACT,
            method: "function tokenURI(uint256) view returns (string)",
            params: [BigInt(tokenId)],
          }),
          readContract({
            contract: NFT_CONTRACT,
            method: "function ownerOf(uint256) view returns (address)",
            params: [BigInt(tokenId)],
          }),
        ]);

        if (!tokenURIResult || tokenURIResult.trim() === "") {
          throw new Error("TokenURI가 비어있습니다");
        }

        // 2. 메타데이터 가져오기 (여러 게이트웨이 시도)
        let metadata: NFTMetadata | null = null;
        const urlsToTry = [];

        if (tokenURIResult.startsWith("ipfs://")) {
          const ipfsHash = tokenURIResult.replace("ipfs://", "");
          // ⚡️ 가장 빠른 게이트웨이 3개만 (우선순위 순)
          urlsToTry.push(
            `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${ipfsHash}`, // 1순위: 커스텀
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // 2순위
            `https://ipfs.io/ipfs/${ipfsHash}` // 3순위
          );
        } else {
          urlsToTry.push(tokenURIResult);
        }

        // ⚡️ Promise.race: 가장 빠른 응답만 사용! (2초 타임아웃)
        try {
          const racePromise = Promise.race(
            urlsToTry.map((url) =>
              safeFetch(url, 2000).then((result) => {
                if (result.success) {
                  return { url, data: result.data };
                }
                throw new Error(`Failed: ${url}`);
              })
            )
          );

          const fastest = await racePromise;
          metadata = fastest.data as NFTMetadata;
        } catch {
          // 모든 게이트웨이 실패 시 기본값
          metadata = {
            name: `NFT #${tokenId}`,
            description: "메타데이터를 불러올 수 없습니다.",
            image: "🎨",
          };
        }

        // ⚡ 극한 최적화 2: 먼저 기본 NFT 데이터 표시, 리스팅은 나중에
        // 기본 NFT 데이터를 먼저 설정하여 즉시 렌더링
        const basicNftData: NFTData = {
          tokenId,
          contractAddress: NFT_CONTRACT.address,
          metadata: metadata
            ? {
                ...metadata,
                image: convertIPFSUrl(metadata.image), // IPFS URL을 HTTP로 변환
              }
            : null,
          owner,
          isListed: false,
          creator: "춘심이네",
          tokenURI: tokenURIResult,
        };

        setNftData(basicNftData); // 🚀 즉시 표시!
        setIsLoading(false); // 로딩 완료!

        // 4. 마켓플레이스 리스팅 정보는 백그라운드에서 조회
        let price: string | undefined;
        let isListed = false;
        let listingId: string | undefined;
        let sellerAddress = owner; // 기본값은 현재 소유자

        try {
          // totalListings로 개수 확인 후 개별 조회
          const totalListingsCount = await readContract({
            contract: MARKETPLACE_CONTRACT,
            method: "function totalListings() view returns (uint256)",
            params: [],
          });

          // ⚡️ 리스팅 조회 개수 증가 (100개까지)
          const maxListings = Math.min(Number(totalListingsCount), 100);

          const listingPromises = [];
          for (let i = 0; i < maxListings; i++) {
            listingPromises.push(
              readContract({
                contract: MARKETPLACE_CONTRACT,
                method:
                  "function getListing(uint256) view returns (uint256,uint256,uint256,uint256,uint128,uint128,address,address,address,uint8,uint8,bool)",
                params: [BigInt(i)],
              })
                .then((listing) => ({
                  index: i,
                  listing: listing as readonly [
                    bigint,
                    bigint,
                    bigint,
                    bigint,
                    bigint,
                    bigint,
                    string,
                    string,
                    string,
                    number,
                    number,
                    boolean
                  ],
                  success: true as const,
                }))
                .catch(() => ({
                  index: i,
                  success: false as const,
                }))
            );
          }

          const listingResults = await Promise.all(listingPromises);

          for (const result of listingResults) {
            if (!result.success) continue;

            // TypeScript 타입 가드
            if (!("listing" in result)) continue;

            const [
              _listingId,
              _tokenId,
              ,
              _pricePerToken,
              ,
              ,
              ,
              _assetContract,
              _tokenOwner,
              ,
              _status,
            ] = result.listing;

            console.log(
              `📋 리스팅 ${result.index}: tokenId=${_tokenId}, status=${_status}, ` +
                `seller=${_tokenOwner.slice(0, 10)}..., ` +
                `매칭=${
                  _tokenId.toString() === tokenId &&
                  _assetContract.toLowerCase() ===
                    NFT_CONTRACT.address.toLowerCase()
                }`
            );

            // 현재 NFT와 일치하는지 확인 + ACTIVE 상태만
            if (
              _tokenId.toString() === tokenId &&
              _assetContract.toLowerCase() ===
                NFT_CONTRACT.address.toLowerCase() &&
              _status === 1 // 1 = ACTIVE, 2 = COMPLETED, 3 = CANCELLED
            ) {
              listingId = _listingId.toString();
              price = (Number(_pricePerToken) / 1e18).toString();
              isListed = true;
              sellerAddress = _tokenOwner; // ⚡ 판매자 주소 저장
              console.log(
                `✅ ACTIVE 리스팅 발견! ID=${listingId}, 가격=${price} SBMB, seller=${sellerAddress}`
              );
              break;
            } else if (
              _tokenId.toString() === tokenId &&
              _assetContract.toLowerCase() ===
                NFT_CONTRACT.address.toLowerCase()
            ) {
              console.log(
                `⚠️ 리스팅 발견했으나 상태가 ACTIVE 아님: status=${_status}`
              );
            }
          }
          // 🚀 리스팅 정보가 있으면 NFT 데이터 업데이트
          if (isListed && price) {
            setNftData((prev) => ({
              ...prev!,
              price,
              isListed,
              listingId,
              creator: sellerAddress, // ⚡ 판매자 주소 업데이트
            }));
          }
        } catch {
          // 리스팅 조회 실패는 무시 (선택사항)
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다"
        );
        setIsLoading(false);
      }
    };

    fetchNFTData();
  }, [params.id]);

  // ⚡ 극한 최적화 3: 스켈레톤 UI - 즉시 렌더링!
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="grid md:grid-cols-2 gap-8 p-8">
                {/* 이미지 스켈레톤 */}
                <div className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>

                {/* 정보 스켈레톤 */}
                <div className="space-y-6">
                  <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-12 bg-green-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
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
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML =
                          '<span class="text-8xl">🎨</span>';
                      }
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
                  {nftData.isListed && nftData.creator !== nftData.owner && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Seller</span>
                      <span className="font-mono text-sm bg-teal-100 px-2 py-1 rounded text-teal-700">
                        {nftData.creator.slice(0, 6)}...
                        {nftData.creator.slice(-4)}
                      </span>
                    </div>
                  )}
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
                      <button
                        onClick={() => {
                          window.location.href = `/sell?tokenId=${nftData.tokenId}`;
                        }}
                        className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
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
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        List for Sale
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelListing}
                        disabled={isCancelling}
                        className={`flex-1 px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                          isCancelling
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                      >
                        {isCancelling ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            취소 중...
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Cancel Listing
                          </>
                        )}
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
