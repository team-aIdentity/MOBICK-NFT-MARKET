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
import { NFT_CONTRACT_ADDRESS } from "@/lib/thirdweb";

export default function CollectionPage() {
  const account = useActiveAccount();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [nfts, setNfts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

        const nftContract = getContract({
          client,
          chain: baseSepolia,
          address: NFT_CONTRACT_ADDRESS,
        });

        // NFT Drop - lazyMint된 NFT 조회
        try {
          console.log("🔍 컨트랙트 주소:", NFT_CONTRACT_ADDRESS);
          console.log("🔍 연결된 지갑:", connectedAddress);

          // 1. 전체 발행된 NFT 개수 확인 (totalSupply)
          const totalSupply = await readContract({
            contract: nftContract,
            method: "function totalSupply() view returns (uint256)",
            params: [],
          });

          // 2. 실제 소유한 NFT 개수 확인 (balanceOf)
          const balance = await readContract({
            contract: nftContract,
            method: "function balanceOf(address owner) view returns (uint256)",
            params: [connectedAddress],
          });

          console.log("📊 NFT Collection 상태:", {
            totalSupply: totalSupply.toString(),
            balance: balance.toString(),
            totalMinted: Number(totalSupply),
            owned: Number(balance),
            connectedAddress: connectedAddress,
            contractAddress: NFT_CONTRACT_ADDRESS,
          });

          // 디버깅: 컨트랙트 상태 확인
          try {
            const contractOwner = await readContract({
              contract: nftContract,
              method: "function owner() view returns (address)",
              params: [],
            });
            console.log("📋 컨트랙트 소유자:", contractOwner);
          } catch (ownerError) {
            console.log("📋 컨트랙트 소유자 조회 실패:", ownerError);
          }

          const totalMinted = Number(totalSupply);
          const ownedCount = Number(balance);
          const ownedNFTs = [];

          console.log(
            `📦 전체 발행된 NFT: ${totalMinted}개, 실제 소유: ${ownedCount}개`
          );

          // 로컬 스토리지 상태도 확인
          const localMetadata = localStorage.getItem("lazyMintMetadata");
          console.log("📦 로컬 스토리지 상태:", {
            hasMetadata: !!localMetadata,
            metadata: localMetadata ? JSON.parse(localMetadata) : null,
          });

          // 로컬 스토리지에서 최신 메타데이터 조회 (실제 소유한 NFT가 없을 때만 사용)
          const storedMetadata = localStorage.getItem("lazyMintMetadata");

          // 카테고리 아이콘 매핑
          const categoryIcons = {
            art: "🎨",
            utility: "🔧",
            activity: "🏃",
          };

          // 실제 소유한 NFT가 있는 경우
          if (ownedCount > 0) {
            console.log(`✅ 실제 소유한 NFT: ${ownedCount}개`);
            console.log(`📋 컨트랙트 주소: ${NFT_CONTRACT_ADDRESS}`);
            console.log(`📋 연결된 주소: ${connectedAddress}`);

            // 실제 소유한 NFT가 있으면 로컬 스토리지 정리 (claim이 완료되었으므로)
            localStorage.removeItem("lazyMintMetadata");
            console.log(
              "🧹 실제 소유한 NFT가 있으므로 로컬 스토리지 정리 완료"
            );

            // 소유한 NFT의 tokenId 조회 및 데이터 구성
            console.log(`🔄 ${ownedCount}개의 NFT 조회 시작...`);
            for (let i = 0; i < ownedCount; i++) {
              try {
                console.log(`📝 NFT #${i} 조회 중...`);
                const tokenId = await readContract({
                  contract: nftContract,
                  method:
                    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
                  params: [connectedAddress, BigInt(i)],
                });

                console.log(
                  `✅ 소유한 NFT #${i}: tokenId = ${tokenId.toString()}`
                );

                // tokenURI 조회
                let tokenURI = "";
                try {
                  tokenURI = await readContract({
                    contract: nftContract,
                    method:
                      "function tokenURI(uint256 tokenId) view returns (string)",
                    params: [BigInt(Number(tokenId))],
                  });
                  console.log(`📝 NFT #${tokenId} TokenURI:`, tokenURI);
                } catch (uriError) {
                  console.log(
                    `📝 NFT #${tokenId} TokenURI 조회 실패:`,
                    uriError
                  );
                }

                // 메타데이터 가져오기
                let metadata = null;
                if (tokenURI) {
                  try {
                    // IPFS URL인 경우 여러 게이트웨이 시도
                    let response;
                    if (tokenURI.startsWith("ipfs://")) {
                      const ipfsHash = tokenURI.replace("ipfs://", "");
                      const gateways = [
                        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                        `https://gateway.pinata.cloud/ipfs/${ipfsHash}?pinataGatewayToken=UHWXvO0yfhuWgUiWlPTtdQKSA7Bp1lRpAAXAcYzZ__PuxBCvtJ2W7Brth4Q6V8UI`,
                        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                        `https://dweb.link/ipfs/${ipfsHash}`,
                        `https://ipfs.io/ipfs/${ipfsHash}`,
                        `https://gateway.ipfs.io/ipfs/${ipfsHash}`,
                      ];

                      let success = false;
                      for (const gateway of gateways) {
                        try {
                          console.log(
                            `📝 NFT #${tokenId} IPFS 시도: ${gateway}`
                          );
                          response = await fetch(gateway, {
                            cache: "no-store",
                            headers: {
                              Accept: "application/json",
                            },
                          });
                          if (response.ok) {
                            console.log(
                              `✅ NFT #${tokenId} IPFS 성공: ${gateway}`
                            );
                            success = true;
                            break;
                          }
                        } catch (gatewayError) {
                          console.log(
                            `❌ NFT #${tokenId} IPFS 실패: ${gateway}`,
                            gatewayError
                          );
                        }
                      }

                      if (!success) {
                        throw new Error("모든 IPFS 게이트웨이 실패");
                      }
                    } else {
                      // 일반 URL인 경우
                      response = await fetch(tokenURI, {
                        cache: "no-store",
                      });
                    }

                    metadata = await response.json();
                    console.log(`📝 NFT #${tokenId} 메타데이터:`, metadata);
                  } catch (metaError) {
                    console.log(
                      `📝 NFT #${tokenId} 메타데이터 가져오기 실패:`,
                      metaError
                    );
                  }
                }

                // 이미지 URL 처리
                let imageUrl = metadata?.image || "🎁";
                console.log(`🖼️ NFT #${tokenId} 원본 이미지:`, metadata?.image);
                console.log(`🖼️ NFT #${tokenId} 메타데이터 전체:`, metadata);

                if (metadata?.image && metadata.image.startsWith("ipfs://")) {
                  const ipfsHash = metadata.image.replace("ipfs://", "");
                  // Pinata 게이트웨이 + API 키 사용
                  imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}?pinataGatewayToken=UHWXvO0yfhuWgUiWlPTtdQKSA7Bp1lRpAAXAcYzZ__PuxBCvtJ2W7Brth4Q6V8UI`;
                  console.log(
                    `🖼️ NFT #${tokenId} IPFS 이미지 URL: ${imageUrl}`
                  );
                } else if (
                  metadata?.image &&
                  !metadata.image.startsWith("ipfs://")
                ) {
                  // IPFS가 아닌 일반 URL인 경우
                  imageUrl = metadata.image;
                  console.log(
                    `🖼️ NFT #${tokenId} 일반 이미지 URL: ${imageUrl}`
                  );
                } else {
                  // 이미지가 없는 경우 카테고리 아이콘 사용
                  const categoryIcons = {
                    art: "🎨",
                    utility: "🔧",
                    activity: "🏃",
                  };
                  imageUrl =
                    categoryIcons[
                      metadata?.category as keyof typeof categoryIcons
                    ] || "🎁";
                  console.log(
                    `🖼️ NFT #${tokenId} 카테고리 아이콘: ${imageUrl}`
                  );
                }

                console.log(`🖼️ NFT #${tokenId} 최종 이미지 URL: ${imageUrl}`);

                // Marketplace에서 판매 정보 확인
                let listingPrice = "0";
                let isListed = false;
                try {
                  // 로컬스토리지에서 판매 정보 확인
                  const listingKey = `listing_${tokenId}`;
                  const storedListing = localStorage.getItem(listingKey);
                  if (storedListing) {
                    const listing = JSON.parse(storedListing);
                    listingPrice = listing.price;
                    isListed = true;
                  }
                } catch (err) {
                  console.log(`NFT #${tokenId} 판매 정보 조회 실패:`, err);
                }

                const nftData = {
                  id: Number(tokenId), // 실제 tokenId
                  tokenId: Number(tokenId), // 실제 tokenId 저장
                  name: metadata?.name || `춘심이네 NFT #${tokenId}`,
                  collection: "춘심이네 NFT Collection",
                  image: imageUrl,
                  category: metadata?.category || "art",
                  description: metadata?.description || "춘심이네 NFT",
                  price: isListed ? `${listingPrice} SBMB` : "미등록",
                  creator: "춘심이네",
                  isListed: isListed,
                };

                ownedNFTs.push(nftData);
                console.log(`✅ NFT #${tokenId} 생성 완료:`, nftData);
                console.log(`📊 현재 ownedNFTs 배열 길이: ${ownedNFTs.length}`);
                console.log(
                  `🖼️ NFT #${tokenId} 이미지 URL 확인:`,
                  nftData.image
                );
              } catch (error) {
                console.log(`NFT #${i} 조회 실패:`, error);
              }
            }

            // 실제 소유한 NFT가 있으면 로컬 스토리지 로직 건너뛰기
            console.log(
              `🎉 최종 결과: ${ownedNFTs.length}개의 NFT를 찾았습니다!`
            );
            console.log("📋 최종 소유한 NFT 목록:", ownedNFTs);
            setNfts(ownedNFTs);
            console.log("✅ NFT 데이터 설정 완료");
            return;
          } else {
            console.log("⚠️ 실제 소유한 NFT가 없습니다.");
            console.log(`📋 컨트랙트 주소: ${NFT_CONTRACT_ADDRESS}`);
            console.log(`📋 연결된 주소: ${connectedAddress}`);
            console.log(
              `📋 totalSupply: ${totalMinted}, balance: ${ownedCount}`
            );

            // 로컬 스토리지에 데이터가 있으면 표시 (아직 claim되지 않은 상태)
            if (storedMetadata) {
              console.log(
                "📦 로컬 스토리지에 민팅 데이터가 있습니다:",
                storedMetadata
              );
              console.log(
                "⚠️ 로컬 스토리지에 데이터가 남아있습니다. claim이 완료되지 않았을 수 있습니다."
              );
              console.log("🔍 실제 소유한 NFT가 있는지 다시 확인 중...");

              // 실제 소유한 NFT가 있다면 로컬 스토리지 무시
              if (ownedCount > 0) {
                console.log(
                  "✅ 실제 소유한 NFT가 있습니다. 로컬 스토리지 무시하고 실제 NFT만 표시합니다."
                );
                // 로컬 스토리지 정리 (claim이 완료되었으므로)
                localStorage.removeItem("lazyMintMetadata");
                console.log("🧹 로컬 스토리지 정리 완료");
                return; // 로컬 스토리지 데이터 무시
              }
              try {
                const metadata = JSON.parse(storedMetadata);
                const categoryIcons = {
                  art: "🎨",
                  utility: "🔧",
                  activity: "🏃",
                };

                const tempNFT = {
                  id: 0,
                  tokenId: 0, // lazyMint된 NFT는 아직 claim되지 않음
                  name: metadata?.name || "민팅된 NFT (Claim 필요)",
                  collection: "춘심이네 NFT Collection",
                  image:
                    metadata?.image ||
                    categoryIcons[metadata?.category] ||
                    "🎁",
                  category: metadata?.category || "art",
                  description: metadata?.description || "Claim이 필요한 NFT",
                  price: metadata?.price || "0",
                  creator: "춘심이네",
                  needsClaim: true, // claim이 필요한 NFT 표시
                };

                console.log("🖼️ lazyMint NFT 이미지 설정:", {
                  metadataImage: metadata?.image,
                  category: metadata?.category,
                  categoryIcon: categoryIcons[metadata?.category],
                  finalImage: tempNFT.image,
                });

                ownedNFTs.push(tempNFT);
                console.log("📦 lazyMint NFT 표시:", tempNFT);
              } catch (e) {
                console.log("로컬 스토리지 파싱 실패:", e);
              }
            } else {
              console.log(
                "✅ 로컬 스토리지가 비어있습니다. claim이 완료되었거나 아직 민팅하지 않았습니다."
              );
            }
          }

          setNfts(ownedNFTs);
          console.log("최종 소유한 NFT:", ownedNFTs);
        } catch (error) {
          console.log("NFT 조회 실패:", error);
          setNfts([]);
        }
      } catch (error) {
        console.log("NFT 조회 실패:", error);
        setNfts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFTs();
  }, [connectedAddress]);

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
        {nfts.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <Link
                key={nft.id}
                href={`/my-nft/${nft.id}`}
                className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                onClick={() => {
                  console.log("🔍 NFT 클릭:", {
                    id: nft.id,
                    tokenId: nft.tokenId,
                    name: nft.name,
                    href: `/my-nft/${nft.id}`,
                  });
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
                            const isHidden = menu.classList.contains("hidden");

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
                              if (top + menuHeight > window.innerHeight - 10) {
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
                            });
                            window.location.href = `/sell?tokenId=${
                              nft.tokenId || nft.id
                            }`;
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
                              d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V2a1 1 0 011-1h8z"
                            />
                          </svg>
                          <span>판매하기</span>
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
                  <p className="text-sm text-gray-600 mb-4">{nft.collection}</p>
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
        )}
      </main>

      <Footer />
    </div>
  );
}
