"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BuyButton from "@/components/BuyButton";
import { NFT_CONTRACT_ADDRESS } from "@/lib/thirdweb";

// NFT 데이터 (실제로는 API에서 가져올 데이터)
const nftData = {
  1: {
    id: 1,
    name: "Abstract Genesis #001",
    collection: "Digital Art Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🎨",
    creator: "ArtistDAO",
    category: "아트",
    categoryColor: "bg-green-500",
    description:
      "A unique digital art piece featuring abstract geometric patterns with vibrant colors. This NFT represents the first edition in the Genesis collection, combining traditional art techniques with modern digital aesthetics. Created with cutting-edge AI technology and refined by master digital artists.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "1",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+5.2%",
    priceChange24h: "24h change",
    listedBy: "ArtistDAO",
    listedTime: "2 hours ago",
    listedPrice: "2.5 SBMB",
  },
  2: {
    id: 2,
    name: "Cosmic Dreams #042",
    collection: "Space Art Series",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "⭐",
    creator: "SpaceCreator",
    category: "아트",
    categoryColor: "bg-green-500",
    description:
      "A mesmerizing digital artwork capturing the beauty of cosmic phenomena. This NFT features stunning space imagery with vibrant nebula colors and celestial bodies, representing humanity's fascination with the universe.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "2",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+3.8%",
    priceChange24h: "24h change",
    listedBy: "SpaceCreator",
    listedTime: "1 hour ago",
    listedPrice: "1.8 ETH",
  },
  3: {
    id: 3,
    name: "MetaTool Access #127",
    collection: "Utility Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🔧",
    creator: "ToolDAO",
    category: "유틸리티",
    categoryColor: "bg-orange-500",
    description:
      "A utility NFT that grants access to exclusive MetaTools platform features. Holders can access premium tools, early features, and participate in governance decisions within the ToolDAO ecosystem.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "3",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+7.2%",
    priceChange24h: "24h change",
    listedBy: "ToolDAO",
    listedTime: "3 hours ago",
    listedPrice: "3.2 ETH",
  },
  4: {
    id: 4,
    name: "Game Pass #003",
    collection: "Gaming Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🎮",
    creator: "GameStudio",
    category: "액티비티",
    categoryColor: "bg-purple-500",
    description:
      "Exclusive gaming NFT that unlocks premium game content, special characters, and bonus rewards. Perfect for gaming enthusiasts who want to enhance their gaming experience with unique digital assets.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "4",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+2.1%",
    priceChange24h: "24h change",
    listedBy: "GameStudio",
    listedTime: "4 hours ago",
    listedPrice: "5.7 ETH",
  },
  5: {
    id: 5,
    name: "Run2Earn Pass #089",
    collection: "Fitness Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🏃",
    creator: "FitnessDAO",
    category: "액티비티",
    categoryColor: "bg-purple-500",
    description:
      "Revolutionary fitness NFT that gamifies exercise and rewards users with tokens for physical activity. Track your fitness journey, earn rewards, and join a community of health-conscious individuals.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "5",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+4.5%",
    priceChange24h: "24h change",
    listedBy: "FitnessDAO",
    listedTime: "5 hours ago",
    listedPrice: "4.1 ETH",
  },
  6: {
    id: 6,
    name: "Ocean Waves #156",
    collection: "Nature Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🌊",
    creator: "NatureArtist",
    category: "아트",
    categoryColor: "bg-green-500",
    description:
      "A serene digital artwork capturing the eternal dance of ocean waves. This NFT brings the calming essence of the sea into the digital realm, perfect for meditation and relaxation spaces.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "6",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+1.9%",
    priceChange24h: "24h change",
    listedBy: "NatureArtist",
    listedTime: "6 hours ago",
    listedPrice: "2.9 ETH",
  },
  7: {
    id: 7,
    name: "VIP Access Key #203",
    collection: "Premium Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🗝️",
    creator: "VIPDAO",
    category: "유틸리티",
    categoryColor: "bg-orange-500",
    description:
      "Premium access NFT that unlocks VIP benefits across multiple platforms. Holders enjoy exclusive events, early access to new features, and premium customer support in the VIP ecosystem.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "7",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+6.8%",
    priceChange24h: "24h change",
    listedBy: "VIPDAO",
    listedTime: "7 hours ago",
    listedPrice: "6.5 ETH",
  },
  8: {
    id: 8,
    name: "Art Mask #071",
    collection: "Theater Collection",
    price: "0.001 SBMB",
    usdPrice: "$1.70",
    image: "🎭",
    creator: "TheaterDAO",
    category: "아트",
    categoryColor: "bg-green-500",
    description:
      "A theatrical NFT representing the art of performance and expression. This digital mask embodies the spirit of theater, drama, and artistic storytelling in the digital age.",
    contractAddress: "0x8467d0A3C2d71dd0ef9E4869A71096324C420803",
    tokenId: "8",
    tokenStandard: "ERC-721",
    creatorRoyalties: "5%",
    priceChange: "+3.2%",
    priceChange24h: "24h change",
    listedBy: "TheaterDAO",
    listedTime: "8 hours ago",
    listedPrice: "1.4 ETH",
  },
};

const relatedNFTs = [
  { id: 2, name: "Genesis #002", price: "0.001 ETH", image: "⭐" },
  { id: 3, name: "Genesis #003", price: "0.001 ETH", image: "🔧" },
  { id: 4, name: "Genesis #004", price: "0.001 ETH", image: "🎮" },
  { id: 5, name: "Genesis #005", price: "0.001 ETH", image: "🏃" },
];

export default function NFTDetailPage() {
  const params = useParams();
  const nftId = parseInt(params.id as string);
  const account = useActiveAccount();
  const address = account?.address;
  const [nft, setNft] = useState<{
    id: number;
    name: string;
    collection: string;
    price: string;
    usdPrice: string;
    image: string;
    creator: string;
    category: string;
    categoryColor: string;
    description: string;
    contractAddress: string;
    tokenId: string;
    tokenStandard: string;
    creatorRoyalties: string;
    priceChange: string;
    priceChange24h: string;
    listedBy: string;
    listedTime: string;
    listedPrice: string;
    tokenURI: string;
    metadata: unknown;
    fetchSuccess: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // 안전한 fetch 함수 (NFTGrid.tsx와 동일)
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

  // 실제 NFT 데이터 가져오기 (webthird v5 사용)
  useEffect(() => {
    const fetchNFT = async () => {
      try {
        setIsLoading(true);

        // webthird v5 컨트랙트 인스턴스 생성
        const nftContract = getContract({
          client: client,
          chain: baseSepolia,
          address: NFT_CONTRACT_ADDRESS,
        });

        // 특정 NFT 가져오기 - tokenURI 함수 사용 (readContract 사용)
        const tokenURIResult = await readContract({
          contract: nftContract,
          method: "function tokenURI(uint256 tokenId) view returns (string)",
          params: [BigInt(nftId)],
        });
        console.log("Token URI:", tokenURIResult);

        // 메타데이터 가져오기 (IPFS URL에서)
        let metadata = null;
        let fetchSuccess = false;

        if (tokenURIResult && tokenURIResult.trim() !== "") {
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

          console.log(`NFT #${nftId} 시도할 URL들:`, urlsToTry);

          for (const url of urlsToTry) {
            console.log(`NFT #${nftId} URL 시도:`, url);
            const result = await safeFetch(url, 10000);

            if (result.success) {
              metadata = result.data;
              fetchSuccess = true;
              console.log(`NFT #${nftId} 메타데이터 성공 (${url}):`, metadata);
              break;
            } else {
              console.log(`NFT #${nftId} URL 실패 (${url}):`, result.error);
            }
          }

          if (!fetchSuccess) {
            console.warn(`NFT #${nftId} 모든 URL 시도 실패`);
          }
        } else {
          console.warn(
            `NFT #${nftId}의 TokenURI가 비어있거나 유효하지 않습니다.`
          );
        }

        if (tokenURIResult || metadata) {
          // NFT 데이터 변환
          const formattedNFT = {
            id: nftId,
            name:
              metadata &&
              typeof metadata === "object" &&
              "name" in metadata &&
              typeof metadata.name === "string"
                ? metadata.name
                : `춘심이네 NFT #${nftId}`,
            collection: "춘심이네 NFT Collection",
            price: "100 SBMB",
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
            description:
              metadata &&
              typeof metadata === "object" &&
              "description" in metadata &&
              typeof metadata.description === "string"
                ? metadata.description
                : "춘심이네에서 발행한 특별한 NFT입니다.",
            contractAddress: NFT_CONTRACT_ADDRESS,
            tokenId: nftId.toString(),
            tokenStandard: "ERC-721",
            creatorRoyalties: "5%",
            priceChange: "+5.2%",
            priceChange24h: "24h change",
            listedBy: "춘심이네",
            listedTime: "방금 전",
            listedPrice: "100 SBMB",
            tokenURI: tokenURIResult,
            metadata: metadata,
            fetchSuccess: fetchSuccess,
          };

          setNft(formattedNFT);
        } else {
          // 기본 데이터 사용
          const defaultNFT = nftData[nftId as keyof typeof nftData];
          if (defaultNFT) {
            setNft({
              ...defaultNFT,
              tokenURI: "",
              metadata: null,
              fetchSuccess: false,
            });
          } else {
            setNft(null);
          }
        }
      } catch (error) {
        console.error("NFT 가져오기 실패:", error);
        // 기본 데이터 사용
        const defaultNFT = nftData[nftId as keyof typeof nftData];
        if (defaultNFT) {
          setNft({
            ...defaultNFT,
            tokenURI: "",
            metadata: null,
            fetchSuccess: false,
          });
        } else {
          setNft(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFT();
  }, [nftId]);

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
            <p className="text-gray-600">요청하신 NFT가 존재하지 않습니다.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(nft.contractAddress);
    alert("주소가 복사되었습니다!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-gray-500">
            <span className="hover:text-teal-500 cursor-pointer transition-colors">
              {nft.collection}
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
            <div className="relative aspect-square bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <div className="text-9xl filter drop-shadow-lg">{nft.image}</div>
              {/* NFT Badge */}
              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                NFT #{nft.tokenId}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                <span>Share</span>
              </button>
              <button className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
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
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>Favorite</span>
              </button>
            </div>
          </div>

          {/* Right Panel - NFT Details */}
          <div className="space-y-8">
            {/* Collection and Title */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-lg font-medium text-gray-600">
                  {nft.collection}
                </span>
                <div className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full flex items-center space-x-1 font-semibold">
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
                  <span>Verified</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {nft.name}
              </h1>

              {/* Tags */}
              <div className="flex space-x-2 mb-6">
                <span
                  className={`px-3 py-1 rounded-full text-white text-sm font-medium ${nft.categoryColor}`}
                >
                  {nft.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-red-500 text-white text-sm font-medium">
                  Limited
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed">{nft.description}</p>

            {/* Current Price */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-semibold text-gray-700">
                  Current Price
                </span>
                <div className="flex items-center space-x-2 text-emerald-600">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold">
                    {nft.priceChange}
                  </span>
                  <span className="text-xs text-gray-500">
                    {nft.priceChange24h}
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {nft.price}
                </div>
                <div className="text-xl text-gray-600">{nft.usdPrice} USD</div>
              </div>
              <BuyButton
                listingId={nft.tokenId.toString()}
                buyerAddress={address || ""}
                priceStr="100"
                className="w-full bg-teal-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2"
              />
            </div>

            {/* NFT Details */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <button
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors rounded-2xl"
              >
                <span className="text-lg font-semibold text-gray-900">
                  NFT Details
                </span>
                <svg
                  className={`w-6 h-6 text-gray-500 transition-transform ${
                    isDetailsExpanded ? "rotate-180" : ""
                  }`}
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
              {isDetailsExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Contract Address
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-900">
                        {nft.contractAddress}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="text-gray-400 hover:text-gray-600"
                      >
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
                    <span className="text-sm text-gray-600">Token ID</span>
                    <span className="text-sm font-mono text-gray-900">
                      {nft.tokenId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Token Standard
                    </span>
                    <span className="text-sm font-mono text-gray-900">
                      {nft.tokenStandard}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Creator</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {nft.creator.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {nft.creator}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Creator Royalties
                    </span>
                    <span className="text-sm text-gray-900">
                      {nft.creatorRoyalties}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Price History & Activity */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  Price History & Activity
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    isHistoryExpanded ? "rotate-180" : ""
                  }`}
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
              {isHistoryExpanded && (
                <div className="px-4 pb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
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
                      <span className="text-sm text-gray-900">
                        Listed for {nft.listedPrice} by {nft.listedBy}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {nft.listedTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* More from this collection */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              More from this collection
            </h2>
            <button className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedNFTs.map((relatedNFT) => (
              <div
                key={relatedNFT.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 cursor-pointer group"
              >
                <div className="relative aspect-square bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                  <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
                    {relatedNFT.image}
                  </div>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-semibold text-gray-800">
                    #{relatedNFT.id}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                    {relatedNFT.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900">
                      {relatedNFT.price}
                    </p>
                    <span className="text-sm text-gray-500">$1.70</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
