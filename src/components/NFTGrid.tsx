"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import { NFT_CONTRACT_ADDRESS } from "@/lib/thirdweb";

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
      headers: {
        Accept: "application/json, */*",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
      cache: "no-store",
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
      usdPrice: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const account = useActiveAccount();

  // Marketplace 리스팅된 NFT만 가져오기
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setIsLoading(true);

        // Marketplace 컨트랙트 연결
        const marketplaceContract = getContract({
          client: client,
          chain: baseSepolia,
          address: "0x738c8706366681f143FD3a18Eb477183041c6B59", // Marketplace V3 주소
        });

        console.log("🏪 Marketplace에서 리스팅된 NFT 조회 중...");

        const formattedNFTs = [];

        // NFT 컨트랙트 연결
        const nftContract = getContract({
          client: client,
          chain: baseSepolia,
          address: NFT_CONTRACT_ADDRESS,
        });

        // Marketplace에서 전체 리스팅 개수 확인
        let totalListings = 0;
        try {
          const totalListingsResult = await readContract({
            contract: marketplaceContract,
            method: "function totalListings() view returns (uint256)",
            params: [],
          });
          totalListings = parseInt(totalListingsResult.toString());
          console.log("전체 리스팅 개수:", totalListings);
        } catch (error) {
          console.log("totalListings 조회 실패, 기본값 사용:", error);
          totalListings = 100; // 기본값으로 100개까지 확인
        }

        // 각 리스팅을 개별적으로 확인 (최대 100개까지)
        const maxListings = Math.min(totalListings, 100);

        for (let listingId = 0; listingId < maxListings; listingId++) {
          let tokenId = 0; // catch 블록에서도 접근 가능하도록 선언
          try {
            // Marketplace에서 리스팅 정보 확인
            const listingResult = await readContract({
              contract: marketplaceContract,
              method:
                "function getListing(uint256 _listingId) view returns (tuple(address assetContract, uint256 tokenId, address lister, uint256 quantity, address currency, uint256 pricePerToken, uint256 startTimestamp, uint256 endTimestamp, bool isReservedListing, uint256 reservedBuyer, uint256 status))",
              params: [BigInt(listingId)],
            });

            if (!listingResult || listingResult.length === 0) {
              console.log(`⏭️ Listing #${listingId} 없음 - 건너뛰기`);
              continue;
            }

            const assetContract = listingResult[0];
            tokenId = parseInt(listingResult[1].toString()); // 스코프 외부 변수에 할당
            const status = listingResult[10]; // status 필드

            // NFT 컨트랙트가 일치하지 않으면 건너뛰기
            if (
              assetContract.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase()
            ) {
              console.log(`⏭️ Listing #${listingId} 다른 컨트랙트 - 건너뛰기`);
              continue;
            }

            // Active 상태가 아니면 건너뛰기
            if (status.toString() !== "1") {
              console.log(`⏭️ Listing #${listingId} 비활성 상태 - 건너뛰기`);
              continue;
            }

            const listingPrice = listingResult[5].toString(); // pricePerToken
            console.log(
              `✅ Listing #${listingId} - NFT #${tokenId} 리스팅됨 - 가격: ${listingPrice}`
            );

            const i = tokenId; // 이미 parseInt로 변환됨

            const tokenURIResult = await readContract({
              contract: nftContract,
              method:
                "function tokenURI(uint256 tokenId) view returns (string)",
              params: [BigInt(i)],
            });
            console.log(`NFT #${i} TokenURI:`, tokenURIResult);

            let metadata = null;
            let fetchSuccess = false;

            if (tokenURIResult && tokenURIResult.trim() !== "") {
              // URL 준비
              let urlsToTry = [];

              if (tokenURIResult.startsWith("ipfs://")) {
                const ipfsHash = tokenURIResult.replace("ipfs://", "");
                urlsToTry = [
                  `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                  `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                  `https://dweb.link/ipfs/${ipfsHash}`,
                  `https://ipfs.io/ipfs/${ipfsHash}`,
                ];
              } else {
                urlsToTry = [tokenURIResult];
              }

              console.log(`NFT #${i} 시도할 URL들:`, urlsToTry);

              // 각 URL을 순차적으로 시도
              for (const url of urlsToTry) {
                console.log(`NFT #${i} URL 시도:`, url);
                const result = await safeFetch(url, 10000);

                if (result.success) {
                  metadata = result.data;
                  fetchSuccess = true;
                  console.log(`NFT #${i} 메타데이터 성공 (${url}):`, metadata);
                  break;
                } else {
                  console.log(`NFT #${i} URL 실패 (${url}):`, result.error);
                }
              }

              if (!fetchSuccess) {
                console.warn(`NFT #${i} 모든 URL 시도 실패`);
              }
            } else {
              console.warn(
                `NFT #${i}의 TokenURI가 비어있거나 유효하지 않습니다.`
              );
            }

            // 메타데이터 가져오기 실패 시에도 기본 정보로 NFT 표시
            formattedNFTs.push({
              id: i,
              name:
                metadata &&
                typeof metadata === "object" &&
                "name" in metadata &&
                typeof metadata.name === "string"
                  ? metadata.name
                  : `춘심이네 NFT #${i}`,
              collection: "춘심이네 NFT Collection",
              price: `${(parseInt(listingPrice) / 1e18).toFixed(0)} SBMB`, // Marketplace 가격 사용
              usdPrice: "$1.70",
              image:
                metadata &&
                typeof metadata === "object" &&
                "image" in metadata &&
                typeof metadata.image === "string"
                  ? metadata.image
                  : "🎨",
              creator: "춘심이네",
              category: "아트",
              categoryColor: "bg-green-500",
              tokenId: i,
              tokenURI: tokenURIResult,
              metadata: metadata,
              fetchSuccess: fetchSuccess,
            });
          } catch (error) {
            console.error(
              `Listing #${listingId} (NFT #${tokenId}) 가져오기 실패:`,
              error
            );
          }
        }

        setNfts(formattedNFTs);
        console.log("포맷된 NFT들:", formattedNFTs);
      } catch (error) {
        console.error("NFT 가져오기 실패:", error);

        // 에러 시 기본 데이터 사용
        const defaultNfts = [
          {
            id: 1,
            name: "춘심이네 NFT #1",
            collection: "춘심이네 NFT Collection",
            price: "100 SBMB",
            usdPrice: "$1.70",
            image: "🎨",
            creator: "춘심이네",
            category: "아트",
            categoryColor: "bg-green-500",
            tokenId: 1,
            tokenURI: "",
            metadata: null,
            fetchSuccess: false,
          },
        ];

        setNfts(defaultNfts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  // 카테고리별 필터링
  const filteredNFTs =
    selectedCategory === "전체"
      ? nfts
      : nfts.filter((nft) => nft.category === selectedCategory);

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
              >
                {/* NFT 이미지 */}
                <div className="relative aspect-square bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <div className="text-6xl">{nft.image}</div>
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

                  {/* 크리에이터 정보 */}
                  <div className="flex items-center mb-4">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                      {nft.creator.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{nft.creator}</span>
                  </div>

                  {/* 가격 정보 */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {nft.price}
                      </p>
                      <p className="text-sm text-gray-500">{nft.usdPrice}</p>
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
        <div className="text-center">
          <button className="border-2 border-teal-500 text-teal-500 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors flex items-center mx-auto">
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
          </button>
        </div>
      </div>
    </section>
  );
}
