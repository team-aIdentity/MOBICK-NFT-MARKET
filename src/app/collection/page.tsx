"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { client } from "@/lib/wallet";
import {
  NFT_CONTRACT_ADDRESS,
  MARKETPLACE_CONTRACT_ADDRESS,
} from "@/lib/thirdweb";
import { convertIPFSUrl } from "@/utils/ipfs";

// 제외할 NFT 메타데이터 URI 목록
const EXCLUDED_TOKEN_URIS = [
  "ipfs://Qme56Ptujbdx9AuaeqAxaNphKPx4QdgQ35ofZkybdzNxmL",
];

// 여러 NFT 컨트랙트 주소들 (현재는 기본 컨트랙트만 사용)
const NFT_CONTRACT_ADDRESSES = [
  NFT_CONTRACT_ADDRESS, // 기본 컨트랙트 0x8C9ecbA1e2540d4733c19b8e2F6d213a7248592a
  // 다른 컨트랙트 주소를 추가하려면 여기에 추가하세요
];

export default function CollectionPage() {
  const account = useActiveAccount();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [nfts, setNfts] = useState<any[]>([]);
  const [displayedNFTs, setDisplayedNFTs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 지갑 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      if (account?.address) {
        setConnectedAddress(account.address);
        return;
      }

      try {
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const accounts = (await (window as any).ethereum.request({
            method: "eth_accounts",
          })) as string[];
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0]);
          }
        }
      } catch (error) {
        console.log("지갑 연결 확인 실패:", error);
      }
    };

    checkConnection();
  }, [account]);

  // 페이지 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[id^="nft-menu-"]') &&
        !target.closest('button[class*="text-gray-400"]')
      ) {
        document.querySelectorAll('[id^="nft-menu-"]').forEach((menu) => {
          menu.classList.add("hidden");
        });
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // NFT 전송 함수
  const handleTransfer = async (tokenId: number, recipientAddress: string) => {
    if (!account?.address) {
      alert("지갑이 연결되지 않았습니다.");
      return;
    }

    try {
      console.log(`📤 NFT #${tokenId} 전송 시작:`, {
        from: account.address,
        to: recipientAddress,
        tokenId: tokenId,
      });

      // NFT 컨트랙트 연결
      const nftContract = getContract({
        client: client,
        chain: baseSepolia,
        address: NFT_CONTRACT_ADDRESS,
      });

      // 전송 트랜잭션 준비
      const transferTx = prepareContractCall({
        contract: nftContract,
        method:
          "function safeTransferFrom(address from, address to, uint256 tokenId)",
        params: [account.address, recipientAddress, BigInt(tokenId)],
      });

      // 트랜잭션 실행
      const result = await sendTransaction({
        transaction: transferTx,
        account: account,
      });

      console.log("✅ NFT 전송 성공:", result);
      alert(`NFT #${tokenId}이(가) ${recipientAddress}로 전송되었습니다!`);

      // 페이지 새로고침
      window.location.reload();
    } catch (error) {
      console.error("❌ NFT 전송 실패:", error);
      alert(`NFT 전송 실패: ${error}`);
    }
  };

  // NFT 데이터 가져오기 (NFT Drop - lazyMint된 NFT)
  useEffect(() => {
    const fetchNFTs = async () => {
      console.log("📦 NFT Collection 데이터 확인 중...");

      // URL에 timestamp가 있으면 강제 새로고침
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("t")) {
        console.log("🔄 강제 새로고침 감지, 데이터 다시 로드 중...");
      }

      if (!connectedAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 로컬 스토리지 더미 데이터 정리
        const storedMetadata = localStorage.getItem("lazyMintMetadata");
        if (storedMetadata) {
          console.log("🧹 로컬 스토리지 더미 데이터 발견, 정리 중...");
          localStorage.removeItem("lazyMintMetadata");
          console.log("✅ 로컬 스토리지 더미 데이터 정리 완료");
        }

        // 카테고리 아이콘 매핑
        const categoryIcons = {
          art: "🎨",
          utility: "🔧",
          activity: "🏃",
        };

        // 모든 컨트랙트에서 NFT 조회
        console.log(
          "🔍 여러 컨트랙트에서 NFT 조회 시작:",
          NFT_CONTRACT_ADDRESSES
        );
        console.log("🔍 연결된 지갑:", connectedAddress);

        const allOwnedNFTs = [];

        // 각 컨트랙트별로 NFT 조회
        for (const contractAddress of NFT_CONTRACT_ADDRESSES) {
          try {
            console.log(`\n📋 컨트랙트 조회 중: ${contractAddress}`);
            console.log(`🔍 연결된 지갑 주소: ${connectedAddress}`);
            console.log(`🔍 체인: ${baseSepolia.name} (${baseSepolia.id})`);

            const nftContract = getContract({
              client,
              chain: baseSepolia,
              address: contractAddress,
            });

            // 1. 전체 발행된 NFT 개수 확인 (totalSupply)
            console.log(
              `📊 컨트랙트 ${contractAddress} totalSupply 조회 중...`
            );
            const totalSupply = await readContract({
              contract: nftContract,
              method: "function totalSupply() view returns (uint256)",
              params: [],
            });
            console.log(`📊 totalSupply 결과: ${totalSupply.toString()}`);

            // 2. 실제 소유한 NFT 개수 확인 (balanceOf)
            console.log(`📊 컨트랙트 ${contractAddress} balanceOf 조회 중...`);
            const balance = await readContract({
              contract: nftContract,
              method:
                "function balanceOf(address owner) view returns (uint256)",
              params: [connectedAddress],
            });
            console.log(`📊 balanceOf 결과: ${balance.toString()}`);

            const totalMinted = Number(totalSupply);
            const ownedCount = Number(balance);

            console.log(`📊 컨트랙트 ${contractAddress} 상태:`, {
              totalSupply: totalSupply.toString(),
              balance: balance.toString(),
              totalMinted,
              owned: ownedCount,
            });

            // 실제 소유한 NFT가 있는 경우
            if (ownedCount > 0) {
              console.log(
                `✅ 컨트랙트 ${contractAddress}에서 ${ownedCount}개 NFT 발견`
              );

              // 소유한 NFT의 tokenId 조회 및 데이터 구성 (Pinata 전용 + 병렬 처리)
              console.log(
                `🔄 컨트랙트 ${contractAddress}에서 ${ownedCount}개의 NFT 조회 시작...`
              );

              // 1단계: 모든 tokenId를 병렬로 조회
              const tokenIdPromises = Array.from(
                { length: ownedCount },
                (_, i) =>
                  readContract({
                    contract: nftContract,
                    method:
                      "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
                    params: [connectedAddress, BigInt(i)],
                  })
              );

              const tokenIds = await Promise.all(tokenIdPromises);
              console.log(
                `✅ 모든 tokenId 조회 완료:`,
                tokenIds.map((id) => id.toString())
              );

              // 2단계: 모든 tokenURI를 병렬로 조회
              const tokenURIPromises = tokenIds.map((tokenId) =>
                readContract({
                  contract: nftContract,
                  method:
                    "function tokenURI(uint256 tokenId) view returns (string)",
                  params: [BigInt(Number(tokenId))],
                }).catch((error) => {
                  console.log(`📝 NFT #${tokenId} TokenURI 조회 실패:`, error);
                  return "";
                })
              );

              const tokenURIs = await Promise.all(tokenURIPromises);
              console.log(`✅ 모든 tokenURI 조회 완료`);

              // 3단계: 메타데이터 병렬 가져오기 (CORS 문제 해결)
              const fetchWithTimeout = async (
                url: string,
                timeoutMs: number = 8000
              ) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(
                  () => controller.abort(),
                  timeoutMs
                );

                try {
                  const response = await fetch(url, {
                    signal: controller.signal,
                  });

                  clearTimeout(timeoutId);

                  if (!response.ok) {
                    throw new Error(
                      `HTTP ${response.status}: ${response.statusText}`
                    );
                  }

                  return await response.json();
                } catch (error) {
                  clearTimeout(timeoutId);
                  throw error;
                }
              };

              const metadataPromises = tokenURIs.map(
                async (tokenURI, index) => {
                  const tokenId = tokenIds[index];
                  console.log(
                    `📝 NFT #${tokenId} 메타데이터 조회 시작, TokenURI: ${tokenURI}`
                  );

                  if (!tokenURI) {
                    console.log(`❌ NFT #${tokenId} TokenURI가 비어있음`);
                    return null;
                  }

                  try {
                    if (tokenURI.startsWith("ipfs://")) {
                      const ipfsHash = tokenURI.replace("ipfs://", "");
                      console.log(`📝 NFT #${tokenId} IPFS 해시: ${ipfsHash}`);

                      // ⚡ 빠른 게이트웨이만 사용
                      const gateways = [
                        `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${ipfsHash}`, // Pinata 커스텀 (1순위)
                        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Pinata 공식
                        `https://ipfs.io/ipfs/${ipfsHash}`, // ipfs.io
                      ];

                      for (const gateway of gateways) {
                        try {
                          console.log(`📝 NFT #${tokenId} 시도: ${gateway}`);
                          const metadata = await fetchWithTimeout(gateway);
                          console.log(`✅ NFT #${tokenId} 성공: ${gateway}`);
                          return metadata;
                        } catch (error) {
                          console.log(`❌ NFT #${tokenId} 실패: ${gateway}`);
                          continue; // 다음 게이트웨이 시도
                        }
                      }

                      console.log(`❌ NFT #${tokenId} 모든 게이트웨이 실패`);
                      return null;
                    } else {
                      // 일반 URL인 경우
                      console.log(
                        `📝 NFT #${tokenId} 일반 URL 시도: ${tokenURI}`
                      );
                      try {
                        const metadata = await fetchWithTimeout(tokenURI);
                        console.log(`✅ NFT #${tokenId} 일반 URL 성공`);
                        return metadata;
                      } catch (urlError) {
                        console.log(
                          `❌ NFT #${tokenId} 일반 URL 실패:`,
                          urlError
                        );
                        return null;
                      }
                    }
                  } catch (metaError) {
                    console.error(
                      `❌ NFT #${tokenId} 메타데이터 가져오기 실패:`,
                      metaError
                    );
                    return null;
                  }
                }
              );

              const metadatas = await Promise.all(metadataPromises);
              console.log(`✅ 모든 메타데이터 로드 완료`);
              console.log(
                `📊 메타데이터 결과:`,
                metadatas.map((meta, i) => ({
                  tokenId: tokenIds[i].toString(),
                  hasMetadata: !!meta,
                  metadata: meta,
                }))
              );

              // 4단계: 마켓플레이스에서 ACTIVE 리스팅 확인 (병렬 처리)
              console.log("🏪 마켓플레이스 리스팅 상태 확인 중...");
              const marketplaceContract = getContract({
                client,
                chain: baseSepolia,
                address: MARKETPLACE_CONTRACT_ADDRESS,
              });

              const totalListingsCount = await readContract({
                contract: marketplaceContract,
                method: "function totalListings() view returns (uint256)",
                params: [],
              });

              console.log(
                "📊 전체 리스팅 개수:",
                totalListingsCount.toString()
              );

              // 리스팅 상태를 tokenId로 매핑 (병렬 조회)
              const listingStatusMap = new Map<
                number,
                { price: string; listingId: number }
              >();

              const listingPromises = [];
              for (
                let i = 0;
                i < Math.min(Number(totalListingsCount), 50);
                i++
              ) {
                listingPromises.push(
                  readContract({
                    contract: marketplaceContract,
                    method:
                      "function getListing(uint256) view returns (uint256,uint256,uint256,uint256,uint128,uint128,address,address,address,uint8,uint8,bool)",
                    params: [BigInt(i)],
                  })
                    .then((listing) => {
                      const [
                        _listingId,
                        _tokenId,
                        ,
                        _pricePerToken,
                        ,
                        ,
                        ,
                        _assetContract,
                        ,
                        ,
                        _status,
                      ] = listing;

                      // ACTIVE 상태이고 현재 컨트랙트의 NFT인 경우
                      if (
                        _status === 1 &&
                        _assetContract.toLowerCase() ===
                          contractAddress.toLowerCase()
                      ) {
                        const price = (
                          Number(_pricePerToken) / 1e18
                        ).toString();
                        listingStatusMap.set(Number(_tokenId), {
                          price,
                          listingId: i,
                        });
                        console.log(
                          `📋 리스팅 ${i}: tokenId=${_tokenId}, price=${price} SBMB, status=ACTIVE`
                        );
                      }
                    })
                    .catch(() => {
                      // 리스팅 조회 실패는 무시
                    })
                );
              }

              await Promise.all(listingPromises);
              console.log(
                `✅ 리스팅 상태 확인 완료, ${listingStatusMap.size}개 ACTIVE 리스팅 발견`
              );

              // 5단계: NFT 데이터 구성
              const categoryIcons = {
                art: "🎨",
                utility: "🔧",
                activity: "🏃",
              };

              for (let i = 0; i < ownedCount; i++) {
                const tokenId = tokenIds[i];
                const metadata = metadatas[i];

                console.log(`🔄 NFT #${tokenId} 데이터 구성 시작...`);
                console.log(`📝 NFT #${tokenId} 메타데이터:`, metadata);

                // 이미지 URL 처리 (다중 게이트웨이 지원)
                let imageUrl = "🎁"; // 기본값

                if (metadata?.image) {
                  console.log(
                    `🖼️ NFT #${tokenId} 메타데이터 이미지:`,
                    metadata.image
                  );

                  if (metadata.image.startsWith("ipfs://")) {
                    imageUrl = convertIPFSUrl(metadata.image); // ⚡ IPFS URL 변환
                  } else if (
                    metadata.image.startsWith("http://") ||
                    metadata.image.startsWith("https://")
                  ) {
                    // HTTP URL인 경우 그대로 사용
                    imageUrl = metadata.image;
                    console.log(`🖼️ NFT #${tokenId} HTTP 이미지: ${imageUrl}`);
                  } else {
                    // 상대 경로나 기타 형식인 경우
                    imageUrl = metadata.image;
                    console.log(`🖼️ NFT #${tokenId} 기타 이미지: ${imageUrl}`);
                  }
                } else {
                  // 메타데이터에 이미지가 없는 경우 카테고리 아이콘 사용
                  console.log(`⚠️ NFT #${tokenId} 메타데이터에 이미지 없음`);
                  imageUrl =
                    categoryIcons[
                      metadata?.category as keyof typeof categoryIcons
                    ] || "🎁";
                  console.log(
                    `🖼️ NFT #${tokenId} 카테고리 아이콘 사용: ${imageUrl}`
                  );
                }

                // ⚡ 리스팅 상태 확인
                const listingInfo = listingStatusMap.get(Number(tokenId));
                let listingPrice = "0";
                let isListed = false;

                if (listingInfo) {
                  listingPrice = listingInfo.price;
                  isListed = true;
                  console.log(
                    `✅ NFT #${tokenId} 판매 중: ${listingPrice} SBMB (listingId=${listingInfo.listingId})`
                  );
                } else {
                  console.log(`📝 NFT #${tokenId} 판매 안 함`);
                }

                const nftData = {
                  id: Number(tokenId),
                  tokenId: Number(tokenId),
                  name: metadata?.name || `NFT #${tokenId}`,
                  collection: `NFT Collection (${contractAddress.slice(
                    0,
                    6
                  )}...)`,
                  image: imageUrl,
                  category: metadata?.category || "art",
                  description: metadata?.description || "NFT",
                  price: isListed ? `${listingPrice} SBMB` : "미등록",
                  creator: "Creator",
                  isListed: isListed,
                  contractAddress: contractAddress, // 컨트랙트 주소 추가
                };

                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log(
                  `✅ 컨트랙트 ${contractAddress.slice(
                    0,
                    6
                  )}... NFT #${tokenId} 데이터 구성 완료!`
                );
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("📋 NFT ID:", nftData.id);
                console.log("📋 Token ID:", nftData.tokenId);
                console.log("📝 Name:", nftData.name);
                console.log("📝 Description:", nftData.description);
                console.log("🖼️ Image:", nftData.image);
                console.log("📦 전체 데이터:", nftData);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                allOwnedNFTs.push(nftData);
              }

              console.log(
                `🎉 컨트랙트 ${contractAddress}에서 ${ownedCount}개 NFT 조회 완료`
              );
            } else {
              console.log(`⚠️ 컨트랙트 ${contractAddress}에서 소유한 NFT 없음`);
            }
          } catch (contractError) {
            console.error(
              `❌ 컨트랙트 ${contractAddress} 조회 실패:`,
              contractError
            );
            console.error(`❌ 에러 상세:`, {
              message:
                contractError instanceof Error
                  ? contractError.message
                  : "Unknown error",
              stack:
                contractError instanceof Error
                  ? contractError.stack
                  : undefined,
              contractAddress,
              connectedAddress,
              chain: baseSepolia.name,
            });
          }
        }

        // 모든 컨트랙트에서 조회한 NFT들을 설정
        console.log(
          `🎉 전체 결과: ${allOwnedNFTs.length}개의 NFT를 찾았습니다!`
        );
        console.log("📋 최종 소유한 NFT 목록:", allOwnedNFTs);
        setNfts(allOwnedNFTs);
        // 초기 4개만 표시
        setDisplayedNFTs(allOwnedNFTs.slice(0, 4));
        console.log("✅ 모든 NFT 데이터 설정 완료");
      } catch (error) {
        console.log("NFT 조회 실패:", error);
        setNfts([]);
        setDisplayedNFTs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [connectedAddress]);

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

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              지갑 연결이 필요합니다
            </h2>
            <p className="text-gray-600">
              NFT 컬렉션을 보려면 먼저 지갑을 연결해주세요.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="inline-flex items-center space-x-2 text-teal-600">
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
              <span className="text-lg">NFT를 불러오는 중...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {connectedAddress?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Collection
              </h1>
              <p className="text-gray-600 mb-2">
                {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{nfts.length} NFTs</span>
                <span>•</span>
                <span>Base Sepolia</span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
          {[
            { id: "all", label: "All" },
            { id: "owned", label: "Owned" },
            { id: "created", label: "Created" },
            { id: "favorited", label: "Favorited" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-teal-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* NFT 그리드 */}
        {displayedNFTs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              아직 NFT가 없습니다
            </h3>
            <p className="text-gray-600 mb-6">첫 번째 NFT를 민팅해보세요!</p>
            <Link
              href="/mint"
              className="inline-flex items-center px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Mint
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedNFTs.map((nft) => (
                <Link
                  key={`${nft.contractAddress}-${nft.id}`}
                  href={`/my-nft/${nft.tokenId}?contract=${nft.contractAddress}`}
                  className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                  onClick={() => {
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("🔍 NFT 클릭!");
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("📋 NFT ID:", nft.id);
                    console.log("📋 Token ID:", nft.tokenId);
                    console.log("📝 Name:", nft.name);
                    console.log("📝 Contract:", nft.contractAddress);
                    console.log(
                      "🔗 Href:",
                      `/my-nft/${nft.tokenId}?contract=${nft.contractAddress}`
                    );
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  }}
                >
                  <div className="aspect-square bg-white border border-gray-200 flex items-center justify-center relative overflow-hidden">
                    {nft.image && nft.image.startsWith("http") ? (
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                        onLoad={() => {
                          console.log(`✅ 이미지 로드 성공: ${nft.image}`);
                        }}
                        onError={(e) => {
                          console.log(`❌ 이미지 로드 실패: ${nft.image}`);
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display =
                            "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="text-6xl absolute inset-0 flex items-center justify-center bg-gray-100"
                      style={{
                        display:
                          nft.image && nft.image.startsWith("http")
                            ? "none"
                            : "flex",
                      }}
                    >
                      {nft.image}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {nft.name}
                        </h3>
                        {nft.isListed && (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            판매 중
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // 다른 모든 메뉴 닫기
                            document
                              .querySelectorAll('[id^="nft-menu-"]')
                              .forEach((menu) => {
                                if (menu.id !== `nft-menu-${nft.id}`) {
                                  menu.classList.add("hidden");
                                }
                              });

                            // 현재 메뉴 토글
                            const menu = document.getElementById(
                              `nft-menu-${nft.id}`
                            );
                            if (menu) {
                              const isHidden =
                                menu.classList.contains("hidden");

                              if (isHidden) {
                                // 메뉴 위치 계산
                                const buttonRect =
                                  e.currentTarget.getBoundingClientRect();
                                const menuWidth = 160; // min-w-[160px]
                                const menuHeight = 80; // 예상 높이

                                let left = buttonRect.right - menuWidth;
                                let top = buttonRect.bottom + 4;

                                // 화면 오른쪽 경계 체크
                                if (left < 10) {
                                  left = buttonRect.left - menuWidth;
                                }

                                // 화면 아래쪽 경계 체크
                                if (
                                  top + menuHeight >
                                  window.innerHeight - 10
                                ) {
                                  top = buttonRect.top - menuHeight - 4;
                                }

                                menu.style.left = `${left}px`;
                                menu.style.top = `${top}px`;
                                menu.classList.remove("hidden");
                              } else {
                                menu.classList.add("hidden");
                              }
                            }
                          }}
                          className="text-gray-400 hover:text-gray-600 relative z-10"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {/* 더보기 메뉴 */}
                        <div
                          id={`nft-menu-${nft.id}`}
                          className="hidden fixed bg-white border border-gray-200 rounded-lg shadow-2xl py-2 min-w-[160px]"
                          style={{
                            zIndex: 9999,
                            position: "fixed",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              console.log("🔗 판매 페이지로 이동:", {
                                nftId: nft.id,
                                tokenId: nft.tokenId,
                                nftName: nft.name,
                                isListed: nft.isListed,
                              });
                              window.location.href = `/sell?tokenId=${
                                nft.tokenId || nft.id
                              }`;
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 ${
                              nft.isListed
                                ? "text-red-600 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              {nft.isListed ? (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              ) : (
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8z"
                                />
                              )}
                            </svg>
                            <span>
                              {nft.isListed ? "판매 취소" : "판매하기"}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // 전송하기 기능 구현
                              const recipientAddress =
                                prompt("받을 주소를 입력하세요:");
                              if (recipientAddress) {
                                handleTransfer(nft.tokenId, recipientAddress);
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                            <span>전송하기</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const contractAddress = NFT_CONTRACT_ADDRESS;
                              navigator.clipboard.writeText(contractAddress);
                              alert(
                                `NFT 컨트랙트 주소가 복사되었습니다!\n${contractAddress}`
                              );
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
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
                            <span>컨트랙트 주소 복사</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {nft.collection}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-bold text-gray-900">
                          {nft.price}
                        </p>
                      </div>
                      {nft.needsClaim && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            try {
                              const nftContract = getContract({
                                client,
                                chain: baseSepolia,
                                address: NFT_CONTRACT_ADDRESS,
                              });

                              const claimTransaction = prepareContractCall({
                                contract: nftContract,
                                method:
                                  "function claim(address _receiver, uint256 _quantity) payable",
                                params: [connectedAddress, BigInt(1)],
                                value: BigInt(0),
                              });

                              const result = await sendTransaction({
                                transaction: claimTransaction,
                                account: account!,
                              });

                              console.log(
                                "✅ Claim 성공! Transaction hash:",
                                result.transactionHash
                              );
                              alert(
                                `🎉 NFT가 성공적으로 claim되었습니다!\n\nTx: ${result.transactionHash}`
                              );

                              // 페이지 새로고침
                              window.location.reload();
                            } catch (error) {
                              console.error("❌ Claim 실패:", error);
                              alert(
                                `Claim 실패: ${
                                  error instanceof Error
                                    ? error.message
                                    : String(error)
                                }`
                              );
                            }
                          }}
                          className="px-3 py-1 bg-teal-500 text-white text-xs rounded-lg hover:bg-teal-600 transition-colors"
                        >
                          Claim
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Load More 버튼 */}
            {hasMoreNFTs && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="border-2 border-teal-500 text-teal-500 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
