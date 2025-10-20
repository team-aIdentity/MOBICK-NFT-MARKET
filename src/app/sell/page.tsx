"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";
import {
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
} from "thirdweb";
import { decimals } from "thirdweb/extensions/erc20";
import { toUnits } from "thirdweb/utils";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import {
  NFT_CONTRACT_ADDRESS,
  MARKETPLACE_CONTRACT_ADDRESS,
  ALTERNATIVE_MARKETPLACE_CONTRACT_ADDRESS,
  PAY_TOKEN_CONTRACT_ADDRESS,
} from "@/lib/thirdweb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { convertIPFSUrl } from "@/utils/ipfs";

function SellPageContent() {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");
  const account = useActiveAccount();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [nft, setNft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isListing, setIsListing] = useState(false);
  const [saleType, setSaleType] = useState<"fixed" | "auction">("fixed");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDuration, setListingDuration] = useState("6");
  const [existingListing, setExistingListing] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 지갑 연결 상태 확인
  useEffect(() => {
    if (account?.address) {
      setConnectedAddress(account.address);
    }
  }, [account]);

  // NFT 데이터 가져오기
  useEffect(() => {
    const fetchNFT = async () => {
      if (!tokenId || !connectedAddress) {
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

        // tokenId가 0인 경우 (아직 claim되지 않은 NFT) 처리
        if (tokenId === "0") {
          console.log(
            "⚠️ 아직 claim되지 않은 NFT입니다. 먼저 NFT를 claim해주세요."
          );
          alert(
            "아직 claim되지 않은 NFT입니다.\n\n먼저 My Collection에서 NFT를 claim해주세요."
          );
          window.location.href = "/collection";
          setIsLoading(false);
          return;
        }

        // NFT 소유자 확인
        console.log("🔍 NFT 소유자 확인 중...", {
          tokenId,
          connectedAddress,
          contractAddress: NFT_CONTRACT_ADDRESS,
        });

        try {
          const owner = await readContract({
            contract: nftContract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [BigInt(tokenId)],
          });

          console.log("📋 소유자 정보:", {
            owner: owner,
            connectedAddress: connectedAddress,
            ownerLower: owner.toLowerCase(),
            connectedLower: connectedAddress.toLowerCase(),
            isOwner: owner.toLowerCase() === connectedAddress.toLowerCase(),
          });

          if (owner.toLowerCase() !== connectedAddress.toLowerCase()) {
            console.error("❌ 소유자 불일치:", {
              owner: owner,
              connectedAddress: connectedAddress,
            });
            alert(
              `이 NFT의 소유자가 아닙니다.\n\nNFT 소유자: ${owner}\n연결된 지갑: ${connectedAddress}`
            );
            setIsLoading(false);
            return;
          }

          console.log("✅ 소유자 확인 완료");
        } catch (error) {
          console.error("❌ NFT 조회 실패:", error);
          alert(
            `NFT를 조회할 수 없습니다.\n\nToken ID: ${tokenId}\n오류: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          setIsLoading(false);
          return;
        }

        // 블록체인에서 실제 메타데이터 조회
        console.log("📝 TokenURI 조회 시작...");

        let tokenURI = "";
        let metadata = null;

        try {
          const tokenURIResult = await readContract({
            contract: nftContract,
            method: "function tokenURI(uint256 tokenId) view returns (string)",
            params: [BigInt(tokenId)],
          });

          tokenURI = tokenURIResult;
          console.log("📦 TokenURI 조회 완료:", tokenURI);

          // 메타데이터 가져오기
          if (tokenURI && tokenURI.trim() !== "") {
            let urlsToTry = [];

            if (tokenURI.startsWith("ipfs://")) {
              const ipfsHash = tokenURI.replace("ipfs://", "");
              console.log("📝 IPFS 해시:", ipfsHash);
              urlsToTry = [
                `https://ipfs.io/ipfs/${ipfsHash}`, // thirdweb 기본
                `https://${ipfsHash}.ipfs.nftstorage.link`, // NFT Storage
                `https://azure-eldest-ermine-229.mypinata.cloud/ipfs/${ipfsHash}`, // Pinata 커스텀
                `https://gateway.pinata.cloud/ipfs/${ipfsHash}`, // Pinata 공식
                `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`, // Cloudflare
              ];
            } else {
              urlsToTry = [tokenURI];
            }

            console.log(
              "🔄 메타데이터 로딩 시도 중... (총 " +
                urlsToTry.length +
                "개 게이트웨이)"
            );

            for (let i = 0; i < urlsToTry.length; i++) {
              const url = urlsToTry[i];
              console.log(`📝 ${i + 1}/${urlsToTry.length} 시도: ${url}`);

              try {
                const response = await fetch(url);
                if (response.ok) {
                  metadata = await response.json();
                  console.log(`✅ ${i + 1}/${urlsToTry.length} 성공!`);
                  console.log("📦 로드된 메타데이터:", metadata);
                  break;
                } else {
                  console.log(
                    `❌ ${i + 1}/${urlsToTry.length} 실패: HTTP ${
                      response.status
                    }`
                  );
                }
              } catch (error) {
                console.log(`❌ ${i + 1}/${urlsToTry.length} 실패:`, error);
              }
            }

            if (!metadata) {
              console.log("❌ 모든 게이트웨이에서 메타데이터 로드 실패");
            }
          } else {
            console.log("⚠️ TokenURI가 비어있습니다");
          }
        } catch (error) {
          console.error("❌ TokenURI 조회 실패:", error);
        }

        // 이미지 URL 처리 (다중 게이트웨이 지원)
        let imageUrl = "🎨";
        let imageGateways = [];

        if (metadata?.image) {
          console.log("🖼️ 메타데이터 이미지:", metadata.image);

          if (metadata.image.startsWith("ipfs://")) {
            imageUrl = convertIPFSUrl(metadata.image); // ⚡ IPFS URL 변환
          } else if (
            metadata.image.startsWith("http://") ||
            metadata.image.startsWith("https://")
          ) {
            imageUrl = metadata.image;
            imageGateways = [metadata.image];
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
        console.log("📝 Name:", metadata?.name || `NFT #${tokenId}`);
        console.log(
          "📝 Description:",
          metadata?.description || "No description"
        );
        console.log("🖼️ Image URL:", imageUrl);
        console.log("📋 Category:", metadata?.category || "art");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        const nftData = {
          id: Number(tokenId),
          name: metadata?.name || `NFT #${tokenId}`,
          collection: metadata?.collection || "NFT Collection",
          image: imageUrl,
          category: metadata?.category || "art",
          description: metadata?.description || "No description available",
          price: "0",
          creator: "Creator",
          contractAddress: NFT_CONTRACT_ADDRESS,
          tokenStandard: "ERC-721",
          blockchain: "BASE",
          tokenURI: tokenURI,
          metadata: metadata,
          imageGateways: imageGateways || [],
        };

        setNft(nftData);

        // ⚡ 기존 리스팅 확인
        console.log("🔍 기존 리스팅 확인 중...");
        const marketplaceContract = getContract({
          client,
          chain: baseSepolia,
          address: MARKETPLACE_CONTRACT_ADDRESS,
        });

        try {
          const totalListingsCount = await readContract({
            contract: marketplaceContract,
            method: "function totalListings() view returns (uint256)",
            params: [],
          });

          console.log("📊 전체 리스팅 개수:", totalListingsCount.toString());

          // 모든 리스팅 확인하여 현재 NFT의 ACTIVE 리스팅 찾기
          for (let i = 0; i < Number(totalListingsCount); i++) {
            try {
              const listing = await readContract({
                contract: marketplaceContract,
                method:
                  "function getListing(uint256) view returns (uint256,uint256,uint256,uint256,uint128,uint128,address,address,address,uint8,uint8,bool)",
                params: [BigInt(i)],
              });

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

              // 현재 NFT이고 ACTIVE 상태인 리스팅 찾기
              if (
                _status === 1 &&
                _assetContract.toLowerCase() ===
                  NFT_CONTRACT_ADDRESS.toLowerCase() &&
                Number(_tokenId) === Number(tokenId)
              ) {
                console.log(
                  `✅ 기존 ACTIVE 리스팅 발견! listingId=${i}, tokenId=${_tokenId}, price=${(
                    Number(_pricePerToken) / 1e18
                  ).toFixed(2)} SBMB`
                );
                setExistingListing({
                  listingId: i,
                  tokenId: Number(_tokenId),
                  price: (Number(_pricePerToken) / 1e18).toString(),
                  status: _status,
                });
                break;
              }
            } catch (error) {
              console.log(`리스팅 ${i} 조회 실패:`, error);
            }
          }
        } catch (error) {
          console.log("⚠️ 리스팅 확인 실패:", error);
        }
      } catch (error) {
        console.error("NFT 조회 실패:", error);
        alert("NFT 정보를 가져오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNFT();
  }, [tokenId, connectedAddress]);

  // 판매 취소 함수
  const handleCancelListing = async () => {
    if (!account || !existingListing) {
      alert("취소할 리스팅이 없습니다.");
      return;
    }

    if (
      !confirm(
        `정말로 판매를 취소하시겠습니까?\n\n현재 가격: ${existingListing.price} SBMB`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      console.log("🗑️ 리스팅 취소 시작:", {
        listingId: existingListing.listingId,
        tokenId: existingListing.tokenId,
      });

      const marketplaceContract = getContract({
        client,
        chain: baseSepolia,
        address: MARKETPLACE_CONTRACT_ADDRESS,
      });

      // cancelListing 트랜잭션 준비
      const cancelTransaction = prepareContractCall({
        contract: marketplaceContract,
        method: "function cancelListing(uint256 listingId)",
        params: [BigInt(existingListing.listingId)],
      });

      console.log("✅ 취소 트랜잭션 준비 완료");

      const result = await sendTransaction({
        transaction: cancelTransaction,
        account,
      });

      console.log("✅ 리스팅 취소 완료:", result.transactionHash);

      alert(
        `🎉 판매가 취소되었습니다!\n\n트랜잭션: ${result.transactionHash}\n\n이제 새로운 가격으로 다시 판매할 수 있습니다.`
      );

      // 기존 리스팅 정보 초기화
      setExistingListing(null);
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

  const handleListForSale = async () => {
    if (!account || !account.address || !nft) {
      alert("지갑을 연결해주세요.");
      return;
    }

    // ⚡ 기존 리스팅 확인
    if (existingListing) {
      alert(
        `⚠️ 이 NFT는 이미 판매 중입니다!\n\n` +
          `현재 가격: ${existingListing.price} SBMB\n\n` +
          `가격을 변경하려면 먼저 "판매 취소" 버튼을 눌러\n` +
          `기존 판매를 취소한 후 다시 등록해주세요.`
      );
      return;
    }

    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      alert("올바른 가격을 입력해주세요.");
      return;
    }

    setIsListing(true);
    try {
      console.log("📝 NFT 판매 리스팅 시작:", {
        tokenId: nft.id,
        price: listingPrice,
        saleType,
        accountAddress: account.address,
      });

      // NFT 컨트랙트 연결
      const nftContract = getContract({
        client,
        chain: baseSepolia,
        address: NFT_CONTRACT_ADDRESS,
      });

      // 마켓플레이스 컨트랙트 연결
      const marketplaceContract = getContract({
        client,
        chain: baseSepolia,
        address: MARKETPLACE_CONTRACT_ADDRESS,
      });

      // 1. NFT 소유권 및 승인 상태 확인
      console.log("🔍 NFT 소유권 및 승인 상태 확인 중...");

      // NFT 소유권 확인
      const ownerResult = await readContract({
        contract: nftContract,
        method: "function ownerOf(uint256 tokenId) view returns (address)",
        params: [BigInt(nft.id)],
      });

      console.log("NFT 소유자:", ownerResult);
      console.log("현재 계정:", account.address);

      if (ownerResult.toLowerCase() !== account.address.toLowerCase()) {
        throw new Error("이 NFT의 소유자가 아닙니다.");
      }

      // 기존 승인 상태 확인
      const isApprovedResult = await readContract({
        contract: nftContract,
        method:
          "function isApprovedForAll(address owner, address operator) view returns (bool)",
        params: [account.address, MARKETPLACE_CONTRACT_ADDRESS],
      });

      console.log("기존 승인 상태:", isApprovedResult);

      // 승인이 필요한 경우에만 승인 설정
      if (!isApprovedResult) {
        console.log("🔐 NFT 컨트랙트 승인 설정 중...");
        const approveTransaction = prepareContractCall({
          contract: nftContract,
          method: "function setApprovalForAll(address operator, bool approved)",
          params: [MARKETPLACE_CONTRACT_ADDRESS, true],
        });

        await sendTransaction({
          transaction: approveTransaction,
          account,
        });
        console.log("✅ 승인 설정 완료");
      } else {
        console.log("✅ 이미 승인됨");
      }

      // 2. Marketplace 컨트랙트 상태 확인
      console.log("🔍 Marketplace 컨트랙트 상태 확인 중...");

      try {
        // Marketplace 컨트랙트가 일시정지 상태인지 확인
        const isPausedResult = await readContract({
          contract: marketplaceContract,
          method: "function paused() view returns (bool)",
          params: [],
        });
        console.log("Marketplace 일시정지 상태:", isPausedResult);

        if (isPausedResult) {
          throw new Error("Marketplace가 일시정지 상태입니다.");
        }
      } catch (error) {
        console.log("paused() 함수가 없거나 확인 불가:", error);
      }

      // Marketplace 컨트랙트의 권한 확인
      try {
        const hasRoleResult = await readContract({
          contract: marketplaceContract,
          method:
            "function hasRole(bytes32 role, address account) view returns (bool)",
          params: [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            account.address,
          ],
        });
        console.log("Marketplace 권한 상태:", hasRoleResult);
      } catch (error) {
        console.log("hasRole() 함수가 없거나 확인 불가:", error);
      }

      // 3. 마켓플레이스에 리스팅 생성
      console.log("📝 마켓플레이스 리스팅 생성 중...");
      const priceInWei = BigInt(parseFloat(listingPrice) * 1e18);
      const durationInSeconds = BigInt(
        parseInt(listingDuration) * 30 * 24 * 60 * 60
      ); // 개월을 초로 변환

      console.log("리스팅 파라미터:", {
        assetContract: NFT_CONTRACT_ADDRESS,
        tokenId: nft.id,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + Number(durationInSeconds),
        quantity: 1,
        currency: PAY_TOKEN_CONTRACT_ADDRESS,
        pricePerToken: Number(priceInWei),
      });

      // thirdweb SDK 헬퍼 함수로 리스팅 생성
      console.log("📝 thirdweb SDK 헬퍼로 리스팅 생성 중...");

      // 1) 결제 토큰 소수점 정확히 읽기
      const erc20Contract = getContract({
        client: client,
        chain: baseSepolia,
        address: PAY_TOKEN_CONTRACT_ADDRESS,
      });

      const tokenDecimals = await decimals({ contract: erc20Contract });
      const pricePerToken = toUnits(listingPrice, tokenDecimals);

      console.log("토큰 소수점:", tokenDecimals);
      console.log("가격 (온체인 단위):", pricePerToken);

      // 2) 수동으로 리스팅 트랜잭션 생성 (createListing 오류 회피)
      console.log("🔍 리스팅 파라미터 확인:");
      console.log("assetContract:", NFT_CONTRACT_ADDRESS);
      console.log("tokenId:", BigInt(nft.id));
      console.log("quantity:", BigInt(1));
      console.log("currency:", PAY_TOKEN_CONTRACT_ADDRESS);
      console.log("pricePerToken:", pricePerToken);

      const startTime = BigInt(Math.floor(Date.now() / 1000));
      const endTime = startTime + durationInSeconds;

      console.log("startTime:", startTime);
      console.log("endTime:", endTime);

      // DirectListingsLogic의 createListing 함수 직접 호출
      const listingTransaction = prepareContractCall({
        contract: marketplaceContract,
        method:
          "function createListing((address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved) params) returns (uint256 listingId)",
        params: [
          {
            assetContract: NFT_CONTRACT_ADDRESS,
            tokenId: BigInt(nft.id),
            quantity: BigInt(1),
            currency: PAY_TOKEN_CONTRACT_ADDRESS,
            pricePerToken: pricePerToken,
            startTimestamp: startTime,
            endTimestamp: endTime,
            reserved: false,
          },
        ],
      });

      console.log("✅ 리스팅 트랜잭션 준비 완료");

      const result = await sendTransaction({
        transaction: listingTransaction,
        account,
      });

      console.log("✅ 리스팅 완료:", result.transactionHash);
      console.log("📝 리스팅 정보:", {
        nftId: nft.id,
        tokenId: BigInt(nft.id),
        price: listingPrice,
        transactionHash: result.transactionHash,
      });

      // 로컬스토리지에 판매 정보 저장
      const listingKey = `listing_${nft.id}`;
      const listingData = {
        tokenId: nft.id,
        price: listingPrice,
        duration: listingDuration,
        timestamp: Date.now(),
        transactionHash: result.transactionHash,
      };
      localStorage.setItem(listingKey, JSON.stringify(listingData));
      console.log("💾 판매 정보 저장 완료:", listingKey, listingData);

      alert(
        `🎉 NFT가 성공적으로 판매 리스팅되었습니다!\n\nNFT ID: ${nft.id}\n가격: ${listingPrice} SBMB\nTx: ${result.transactionHash}\n\nMy Collection에서 확인하세요!`
      );

      // My Collection 페이지로 이동
      window.location.href = "/collection";
    } catch (error) {
      console.error("리스팅 실패:", error);
      alert(
        `리스팅 중 오류가 발생했습니다:\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsListing(false);
    }
  };

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
              NFT를 판매하려면 먼저 지갑을 연결해주세요.
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
              <span className="text-lg">NFT 정보를 불러오는 중...</span>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              NFT를 찾을 수 없습니다
            </h2>
            <p className="text-gray-600">
              해당 NFT가 존재하지 않거나 소유하지 않은 NFT입니다.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 수수료 계산
  const price = parseFloat(listingPrice) || 0;
  const creatorRoyalty = price * 0.05; // 5%
  const platformFee = price * 0.025; // 2.5%
  const earnings = price - creatorRoyalty - platformFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            List NFT for Sale
          </h1>
          <p className="text-xl text-gray-600">
            Set your price and list your NFT on the marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* 왼쪽: NFT 정보 */}
          <div className="space-y-6">
            {/* NFT 이미지 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                {nft.image &&
                (nft.image.startsWith("http://") ||
                  nft.image.startsWith("https://")) ? (
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("🖼️ 이미지 로드 실패:", nft.image);
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML =
                          '<span class="text-8xl">🎨</span>';
                      }
                    }}
                    onLoad={() => {
                      console.log("✅ 이미지 로드 성공:", nft.image);
                    }}
                  />
                ) : (
                  <span className="text-8xl">{nft.image || "🎨"}</span>
                )}
              </div>
            </div>

            {/* NFT 정보 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{nft.name}</h2>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                  Owned
                </span>
              </div>
              <p className="text-gray-600 mb-4">{nft.collection}</p>

              {/* 크리에이터 정보 */}
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                  {nft.creator.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Created by {nft.creator}
                  </p>
                  <p className="text-xs text-green-600 font-semibold">
                    Verified Creator
                  </p>
                </div>
              </div>

              {/* 속성 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Properties
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Category: {nft.category}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    Style: {nft.category}
                  </span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                    Rarity: Common
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Edition: 1/1
                  </span>
                </div>
              </div>

              {/* 구매 이력 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Purchase History
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Purchased for {nft.price} SBMB
                        </p>
                        <p className="text-xs text-gray-600">
                          from {nft.creator} on{" "}
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT 스펙 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  NFT Specifications
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Contract Address
                    </span>
                    <div className="flex items-center">
                      <span className="text-sm font-mono text-gray-900">
                        {nft.contractAddress.slice(0, 6)}...
                        {nft.contractAddress.slice(-4)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(nft.contractAddress);
                          alert("컨트랙트 주소가 복사되었습니다!");
                        }}
                        className="ml-2 text-gray-400 hover:text-gray-600"
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
                      {nft.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Token Standard
                    </span>
                    <span className="text-sm text-gray-900">
                      {nft.tokenStandard}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Blockchain</span>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                      <span className="text-sm text-gray-900">
                        {nft.blockchain}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 판매 설정 */}
          <div className="space-y-6">
            {/* 가격 설정 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Set Your Price
              </h3>
              <p className="text-gray-600 mb-6">
                Choose how you'd like to sell this item.
              </p>

              {/* 판매 유형 */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => setSaleType("fixed")}
                  className={`w-full p-4 rounded-lg border-2 transition-colors ${
                    saleType === "fixed"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-teal-600"
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
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Fixed Price
                        </p>
                        <p className="text-sm text-gray-600">
                          Sell at a fixed price
                        </p>
                      </div>
                    </div>
                    {saleType === "fixed" && (
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSaleType("auction")}
                  className={`w-full p-4 rounded-lg border-2 transition-colors ${
                    saleType === "auction"
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Timed Auction
                        </p>
                        <p className="text-sm text-gray-600">
                          Auction to the highest bidder
                        </p>
                      </div>
                    </div>
                    {saleType === "auction" && (
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              {/* 가격 입력 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-500 font-medium">SBMB</span>
                  </div>
                </div>
              </div>

              {/* 제안 가격 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Suggested Pricing
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setListingPrice("2.1")}
                    className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">
                        Floor Price: 2.1 SBMB
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        Use
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setListingPrice("2.5")}
                    className="w-full p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-800">
                        Your Purchase Price: 2.5 SBMB
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        Use
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setListingPrice("2.2")}
                    className="w-full p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-800">
                        Highest Offer: 2.2 SBMB
                      </span>
                      <span className="text-xs text-orange-600 font-medium">
                        Use
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 수수료 및 수익 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Fees & Earnings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Listing Price</span>
                  <span className="font-semibold text-gray-900">
                    {listingPrice || "0"} SBMB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Creator Royalty (5%)</span>
                  <span className="text-red-600">
                    - {creatorRoyalty.toFixed(2)} SBMB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Platform Fee (2.5%)</span>
                  <span className="text-red-600">
                    - {platformFee.toFixed(2)} SBMB
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">
                      Your Earnings
                    </span>
                    <span className="font-bold text-green-600">
                      {earnings.toFixed(2)} SBMB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 리스팅 기간 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Listing Duration
              </h3>
              <select
                value={listingDuration}
                onChange={(e) => setListingDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
              <p className="text-sm text-gray-600 mt-2">
                Your listing will automatically expire on{" "}
                {new Date(
                  Date.now() +
                    parseInt(listingDuration) * 30 * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
                .
              </p>
            </div>

            {/* 기존 리스팅 정보 표시 */}
            {existingListing && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <h3 className="font-bold text-yellow-900">
                    이미 판매 중입니다
                  </h3>
                </div>
                <p className="text-yellow-800 mb-3">
                  이 NFT는 현재 <strong>{existingListing.price} SBMB</strong>에
                  판매 중입니다.
                  <br />
                  가격을 변경하려면 먼저 판매를 취소해주세요.
                </p>
                <button
                  onClick={handleCancelListing}
                  disabled={isCancelling}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    isCancelling
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  {isCancelling ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
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
                      <span>취소 중...</span>
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
                      <span>판매 취소</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 판매하기 버튼 */}
            <button
              onClick={handleListForSale}
              disabled={isListing || !listingPrice || !!existingListing}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2 ${
                isListing || !listingPrice || !!existingListing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600"
              }`}
            >
              {isListing ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
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
                  <span>Listing...</span>
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span>
                    {existingListing ? "판매 중 (취소 필요)" : "List for Sale"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SellPage() {
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
      <SellPageContent />
    </Suspense>
  );
}
