"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import { NFT_CONTRACT_ADDRESS } from "@/lib/thirdweb";
import { convertIPFSUrl } from "@/utils/ipfs";

// 안전한 fetch 함수
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

export default function NFTGrid() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [nfts, setNfts] = useState<
    {
      id: number;
      name: string;
      collection: string;
      price: string;
      image: string;
      creator: string;
      category: string;
      categoryColor: string;
      tokenId: number;
      tokenURI: string;
      metadata: unknown;
      fetchSuccess: boolean;
    }[]
  >([]);
  const [displayedNFTs, setDisplayedNFTs] = useState<typeof nfts>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const account = useActiveAccount();

  // Marketplace 리스팅된 NFT만 가져오기
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setIsLoading(true);

        // Marketplace 컨트랙트 연결 (최신 주소 사용)
        const MARKETPLACE_ADDRESS =
          process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
          "0xd2D48B584902260DB216D66508148D25a7b0ef6a";

        const marketplaceContract = getContract({
          client: client,
          chain: baseSepolia,
          address: MARKETPLACE_ADDRESS,
        });

        console.log("🏪 Marketplace에서 리스팅된 NFT 조회 중...");
        console.log("📍 Marketplace 주소:", MARKETPLACE_ADDRESS);

        const formattedNFTs = [];

        // NFT 컨트랙트 연결
        const nftContract = getContract({
          client: client,
          chain: baseSepolia,
          address: NFT_CONTRACT_ADDRESS,
        });

        // NFT 총 발행 개수 확인
        let totalNFTs = 0;
        try {
          const totalSupplyResult = await readContract({
            contract: nftContract,
            method: "function totalSupply() view returns (uint256)",
            params: [],
          });
          totalNFTs = parseInt(totalSupplyResult.toString());
        } catch (error) {
          console.log("totalSupply 조회 실패:", error);
          totalNFTs = 10;
        }

        // ⚡ 온체인에서 ACTIVE 리스팅만 조회
        // totalListings 조회
        const totalListingsCount = await readContract({
          contract: marketplaceContract,
          method: "function totalListings() view returns (uint256)",
          params: [],
        });

        console.log("📊 전체 리스팅 개수:", totalListingsCount.toString());

        const maxListingsToCheck = Math.min(Number(totalListingsCount), 100);
        console.log("🔍 조회할 리스팅 개수:", maxListingsToCheck);

        for (let i = 0; i < maxListingsToCheck; i++) {
          try {
            // 각 리스팅 상태 조회
            const listing = await readContract({
              contract: marketplaceContract,
              method:
                "function getListing(uint256) view returns (uint256,uint256,uint256,uint256,uint128,uint128,address,address,address,uint8,uint8,bool)",
              params: [BigInt(i)],
            });

            const [
              _listingId,
              tokenId,
              ,
              _pricePerToken,
              ,
              ,
              ,
              _assetContract,
              _tokenOwner,
              ,
              _status,
            ] = listing;

            console.log(
              `📋 리스팅 ${i}: tokenId=${tokenId}, status=${_status}, ` +
                `contract=${_assetContract.slice(0, 10)}..., price=${(
                  Number(_pricePerToken) / 1e18
                ).toFixed(2)} SBMB`
            );

            // ACTIVE 상태(1)이고, 우리 NFT 컨트랙트인 경우만
            if (_status !== 1) {
              console.log(
                `⏭️  리스팅 ${i} 스킵: status=${_status} (1=ACTIVE, 2=COMPLETED, 3=CANCELLED)`
              );
              continue;
            }

            if (
              _assetContract.toLowerCase() !==
              NFT_CONTRACT_ADDRESS.toLowerCase()
            ) {
              console.log(`⏭️  리스팅 ${i} 스킵: 다른 컨트랙트`);
              continue;
            }

            console.log(
              `✅ 리스팅 ${i} ACTIVE! tokenId=${tokenId}, seller=${_tokenOwner}`
            );

            const listingPrice = (Number(_pricePerToken) / 1e18).toString();
            const sellerAddress = _tokenOwner;

            // NFT가 실제로 존재하는지 확인
            try {
              await readContract({
                contract: nftContract,
                method:
                  "function ownerOf(uint256 tokenId) view returns (address)",
                params: [BigInt(tokenId)],
              });
            } catch {
              // NFT가 존재하지 않으면 스킵
              console.log(`⏭️  리스팅 ${i} 스킵: NFT가 존재하지 않음`);
              continue;
            }

            const tokenURIResult = await readContract({
              contract: nftContract,
              method:
                "function tokenURI(uint256 tokenId) view returns (string)",
              params: [BigInt(tokenId)],
            });

            let metadata = null;
            let fetchSuccess = false;

            console.log(`🔍 NFT #${tokenId} tokenURI:`, tokenURIResult);

            if (tokenURIResult && tokenURIResult.trim() !== "") {
              let urlsToTry = [];

              if (tokenURIResult.startsWith("ipfs://")) {
                const ipfsHash = tokenURIResult.replace("ipfs://", "");
                urlsToTry = [
                  `https://ipfs.io/ipfs/${ipfsHash}`, // thirdweb 기본
                  `https://${ipfsHash}.ipfs.nftstorage.link`, // NFT Storage
                  `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`, // Cloudflare
                  `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${ipfsHash}`, // Pinata 커스텀
                ];
              } else {
                urlsToTry = [tokenURIResult];
              }

              for (const url of urlsToTry) {
                console.log(`📡 NFT #${tokenId} 메타데이터 시도:`, url);
                const result = await safeFetch(url, 10000); // 타임아웃 10초로 증가
                if (result.success) {
                  metadata = result.data;
                  fetchSuccess = true;
                  console.log(`✅ NFT #${tokenId} 메타데이터 성공:`, metadata);
                  console.log(`📝 NFT #${tokenId} 이름:`, metadata?.name);
                  break;
                } else {
                  console.log(
                    `❌ NFT #${tokenId} 메타데이터 실패:`,
                    result.error
                  );
                }
              }
            }

            // 메타데이터 조회 실패 시 재시도 (한 번 더)
            if (
              !fetchSuccess &&
              tokenURIResult &&
              tokenURIResult.startsWith("ipfs://")
            ) {
              console.log(`🔄 NFT #${tokenId} 메타데이터 재시도...`);
              const ipfsHash = tokenURIResult.replace("ipfs://", "");
              const retryUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              console.log(`📡 NFT #${tokenId} 재시도 URL:`, retryUrl);
              const retryResult = await safeFetch(retryUrl, 15000);
              if (retryResult.success) {
                metadata = retryResult.data;
                fetchSuccess = true;
                console.log(`✅ NFT #${tokenId} 재시도 성공:`, metadata);
                console.log(`📝 NFT #${tokenId} 이름:`, metadata?.name);
              }
            }

            if (!fetchSuccess) {
              console.log(
                `⚠️ NFT #${tokenId} 메타데이터 조회 실패 - 기본 이름 사용`
              );
            }

            // 메타데이터 가져오기 실패 시에도 기본 정보로 NFT 표시
            console.log(
              `➕ NFT 추가: listingId=${i}, tokenId=${tokenId}, 가격=${listingPrice} SBMB, seller=${sellerAddress}`
            );
            formattedNFTs.push({
              id: Number(tokenId), // tokenId를 id로 사용
              name:
                metadata &&
                typeof metadata === "object" &&
                "name" in metadata &&
                typeof metadata.name === "string"
                  ? metadata.name
                  : `NFT #${tokenId}`,
              collection: "NFT Collection",
              price: `${listingPrice} SBMB`,
              image:
                metadata &&
                typeof metadata === "object" &&
                "image" in metadata &&
                typeof metadata.image === "string"
                  ? convertIPFSUrl(metadata.image) // ⚡ IPFS URL 변환
                  : "🎨",
              creator: sellerAddress, // ⚡ 판매자 지갑 주소
              category: "아트",
              categoryColor: "bg-green-500",
              tokenId: Number(tokenId),
              tokenURI: tokenURIResult,
              metadata: metadata,
              fetchSuccess: fetchSuccess,
            });
          } catch (error) {
            console.error(
              `Listing #${i} (tokenId=${tokenId}) 가져오기 실패:`,
              error
            );
          }
        }

        console.log("✅ 조회된 NFT 개수:", formattedNFTs.length);
        console.log("📋 NFT 데이터:", formattedNFTs);
        setNfts(formattedNFTs);
        // 초기 4개만 표시
        setDisplayedNFTs(formattedNFTs.slice(0, 4));
      } catch (error) {
        console.error("NFT 가져오기 실패:", error);
        setNfts([]); // 에러 시 빈 배열
        setDisplayedNFTs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  // 카테고리별 필터링
  const filteredNFTs =
    selectedCategory === "전체"
      ? displayedNFTs
      : displayedNFTs.filter((nft) => nft.category === selectedCategory);

  // Load More 버튼 핸들러
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    const currentCount = displayedNFTs.length;
    const nextBatch = nfts.slice(currentCount, currentCount + 4);
    setDisplayedNFTs([...displayedNFTs, ...nextBatch]);
    setIsLoadingMore(false);
  };

  // 더 로드할 NFT가 있는지 확인
  const hasMoreNFTs = displayedNFTs.length < nfts.length;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            판매 중인 NFT
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            현재 Marketplace에서 판매 중인 NFT들
          </p>

          {/* 로딩 상태 표시 */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2 text-teal-600">
                <svg
                  className="animate-spin h-5 w-5"
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
                <span>NFT를 불러오는 중...</span>
              </div>
            </div>
          )}

          {/* 카테고리 탭과 정렬 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* 카테고리 탭 */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedCategory("전체")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "전체"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedCategory("아트")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "아트"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                아트
              </button>
              <button
                onClick={() => setSelectedCategory("유틸리티")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "유틸리티"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                유틸리티
              </button>
              <button
                onClick={() => setSelectedCategory("액티비티")}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === "액티비티"
                    ? "bg-teal-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                액티비티
              </button>
            </div>

            {/* 정렬 옵션 */}
            <div className="flex items-center space-x-4">
              <select className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm">
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Recently Added</option>
                <option>Most Popular</option>
              </select>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* NFT 그리드 */}
        {filteredNFTs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {filteredNFTs.map((nft) => (
              <Link
                key={nft.id}
                href={`/nft/${nft.id}`}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 block"
                onClick={() => {
                  console.log("🔗 NFT 클릭:", nft.id, `/nft/${nft.id}`);
                }}
              >
                {/* NFT 이미지 */}
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {nft.image &&
                  (nft.image.startsWith("http://") ||
                    nft.image.startsWith("https://")) ? (
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(
                          "🖼️ NFTGrid 이미지 로드 실패:",
                          nft.image
                        );
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerHTML =
                            '<span class="text-6xl">🎨</span>';
                        }
                      }}
                      onLoad={() => {
                        console.log("✅ NFTGrid 이미지 로드 성공:", nft.image);
                      }}
                    />
                  ) : (
                    <span className="text-6xl">{nft.image || "🎨"}</span>
                  )}
                  {/* 카테고리 태그 */}
                  <div
                    className={`absolute top-3 right-3 px-2 py-1 rounded-full text-white text-xs font-medium ${nft.categoryColor}`}
                  >
                    {nft.category}
                  </div>
                </div>

                {/* NFT 정보 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {nft.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{nft.collection}</p>

                  {/* 판매자 정보 */}
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                      {nft.creator.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5">Seller</p>
                      <p className="text-xs font-mono text-gray-700 truncate">
                        {nft.creator.slice(0, 6)}...{nft.creator.slice(-4)}
                      </p>
                    </div>
                  </div>

                  {/* 가격 정보 */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {nft.price}
                      </p>
                    </div>
                  </div>

                  {/* Place Bid 버튼 */}
                  <button className="w-full bg-teal-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-teal-600 transition-colors">
                    Place Bid
                  </button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {nfts.length === 0
                ? "현재 판매 중인 NFT가 없습니다"
                : `"${selectedCategory}" 카테고리에 판매 중인 NFT가 없습니다`}
            </h3>
            <p className="text-gray-600 mb-4">
              {nfts.length === 0
                ? "NFT를 민팅하고 판매해보세요!"
                : "다른 카테고리를 선택하거나 전체를 확인해보세요."}
            </p>
            {nfts.length > 0 && (
              <button
                onClick={() => setSelectedCategory("전체")}
                className="bg-teal-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-600 transition-colors"
              >
                전체 보기
              </button>
            )}
          </div>
        )}

        {/* Load More 버튼 */}
        {hasMoreNFTs && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="border-2 border-teal-500 text-teal-500 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors flex items-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
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
                  Loading...
                </>
              ) : (
                <>
                  Load More NFTs
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
