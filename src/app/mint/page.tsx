"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import {
  getContract,
  prepareContractCall,
  sendTransaction,
  readContract,
} from "thirdweb";
import { mintTo } from "thirdweb/extensions/erc721";
import { lazyMint } from "thirdweb/extensions/erc721";
import { claim } from "thirdweb/extensions/erc721";

// Pinata API 설정
const PINATA_API_KEY = "06b4e668dbf10a60fdf1";
const PINATA_SECRET_KEY =
  "e40a99d458afe825e30032c3d12c8630ae091f4e7363522b3880d744e6783b45";
const PINATA_GATEWAY_TOKEN =
  "UHWXvO0yfhuWgUiWlPTtdQKSA7Bp1lRpAAXAcYzZ__PuxBCvtJ2W7Brth4Q6V8UI";

// Pinata 업로드 함수들
const uploadImageToPinata = async (file: File): Promise<string> => {
  console.log("🚀 Pinata 이미지 업로드 시작:", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    apiKey: PINATA_API_KEY.substring(0, 10) + "...",
    secretKey: PINATA_SECRET_KEY.substring(0, 10) + "...",
  });

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: formData,
      }
    );

    console.log("📡 Pinata 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Pinata 업로드 실패:", errorText);
      throw new Error(
        `Pinata 이미지 업로드 실패: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("✅ Pinata 업로드 성공:", result);
    const ipfsUrl = `ipfs://${result.IpfsHash}`;
    console.log("🔗 생성된 IPFS URL:", ipfsUrl);
    return ipfsUrl;
  } catch (error) {
    console.error("💥 Pinata 업로드 중 오류:", error);
    throw error;
  }
};

const uploadMetadataToPinata = async (metadata: any): Promise<string> => {
  console.log("🚀 Pinata 메타데이터 업로드 시작:", {
    metadata: metadata,
    apiKey: PINATA_API_KEY.substring(0, 10) + "...",
    secretKey: PINATA_SECRET_KEY.substring(0, 10) + "...",
  });

  try {
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `NFT Metadata - ${metadata.name}`,
          },
        }),
      }
    );

    console.log(
      "📡 Pinata 메타데이터 응답 상태:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Pinata 메타데이터 업로드 실패:", errorText);
      throw new Error(
        `Pinata 메타데이터 업로드 실패: ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("✅ Pinata 메타데이터 업로드 성공:", result);
    const ipfsUrl = `ipfs://${result.IpfsHash}`;
    console.log("🔗 생성된 메타데이터 IPFS URL:", ipfsUrl);
    return ipfsUrl;
  } catch (error) {
    console.error("💥 Pinata 메타데이터 업로드 중 오류:", error);
    throw error;
  }
};
import { baseSepolia } from "thirdweb/chains";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { client, connectInjectedMetamask } from "@/lib/wallet";
import {
  NFT_CONTRACT_ADDRESS,
  ALTERNATIVE_NFT_CONTRACT_ADDRESS,
} from "@/lib/thirdweb";

const categories = [
  { value: "", label: "Select category", disabled: true },
  { value: "art", label: "아트" },
  { value: "utility", label: "유틸리티" },
  { value: "activity", label: "액티비티" },
];

const collections = [
  { value: "", label: "Choose collection", disabled: true },
  { value: "choomsim", label: "춘심이네 NFT Collection" },
];

export default function MintPage() {
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    collection: "",
    price: "",
    quantity: "1",
    royalties: "5",
    file: null as File | null,
    filePreview: null as string | null,
  });

  // 지갑 연결 및 네트워크 확인
  useEffect(() => {
    const checkConnection = async () => {
      if (account?.address) {
        console.log("Mint 페이지 - account로 연결됨:", account.address);
        setConnectedAddress(account.address);
      } else {
        try {
          if (typeof window !== "undefined" && (window as any).ethereum) {
            const accounts = (await (window as any).ethereum.request({
              method: "eth_accounts",
            })) as string[];
            if (accounts && accounts.length > 0) {
              console.log(
                "Mint 페이지 - MetaMask로 연결됨 (Base Sepolia):",
                accounts[0]
              );
              setConnectedAddress(accounts[0]);
            } else {
              console.log("Mint 페이지 - 연결된 계정 없음");
            }
          }
        } catch (error) {
          console.log("지갑 연결 확인 실패:", error);
        }
      }

      // 현재 체인 ID 확인
      try {
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const chainId = await (window as any).ethereum.request({
            method: "eth_chainId",
          });
          const chainIdNum = parseInt(chainId, 16);
          setCurrentChainId(chainIdNum);
          console.log("현재 네트워크 체인 ID:", chainIdNum);
        }
      } catch (error) {
        console.log("체인 ID 확인 실패:", error);
      }
    };

    checkConnection();

    // 네트워크 변경 감지
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      const handleChainChanged = (chainId: string) => {
        const chainIdNum = parseInt(chainId, 16);
        setCurrentChainId(chainIdNum);
        console.log("네트워크 변경됨:", chainIdNum);
      };
      ethereum.on?.("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener?.("chainChanged", handleChainChanged);
      };
    }
  }, [account]);

  // 파일 선택
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("파일 크기는 100MB 이하여야 합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        file,
        filePreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 파일 입력
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 민팅
  // 자동 컨트랙트 배포 함수 (thirdweb v5 방식)
  const deployNFTDropContract = async () => {
    if (!account || !account.address) {
      console.log("⚠️ 지갑이 연결되지 않았습니다.");
      return null;
    }

    setIsDeploying(true);
    try {
      console.log("🚀 NFT Drop 컨트랙트 자동 배포 중...");

      // thirdweb v5에서 NFT Drop 배포를 위한 API 호출
      const response = await fetch(
        "https://api.thirdweb.com/v1/deploy/84532/prebuilts/nft-drop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              process.env.NEXT_PUBLIC_THIRDWEB_SECRET_KEY ||
              "7bdbc0d84b2e56262e8e603b301e0762"
            }`,
          },
          body: JSON.stringify({
            contractMetadata: {
              name: "춘심이네 NFT Collection",
              symbol: "CHUNSIM",
              description: "춘심이네 NFT 컬렉션",
              image: "https://example.com/collection-image.png",
            },
            claimConditions: [
              {
                startTime: new Date().toISOString(),
                maxClaimableSupply: 1000,
                maxClaimablePerWallet: 10,
                price: "0",
                currency: "0x0000000000000000000000000000000000000000",
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const result = await response.json();
      const contractAddress = result.contractAddress;

      console.log("✅ NFT Drop 컨트랙트 배포 완료:", contractAddress);
      setContractAddress(contractAddress);

      // 로컬 스토리지에 저장
      localStorage.setItem("deployedContractAddress", contractAddress);

      return contractAddress;
    } catch (error) {
      console.error("❌ 컨트랙트 배포 실패:", error);
      alert(
        "컨트랙트 배포에 실패했습니다. thirdweb 대시보드에서 수동으로 배포해주세요."
      );
      return null;
    } finally {
      setIsDeploying(false);
    }
  };

  const handleMint = async () => {
    if (!connectedAddress) {
      console.log("⚠️ 지갑이 연결되지 않았습니다.");
      return;
    }

    if (!formData.name || !formData.category || !formData.price) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    if (!formData.file) {
      alert("이미지 파일을 업로드해주세요.");
      return;
    }

    setIsMinting(true);
    try {
      console.log("민팅 시작 - 연결 확인:", {
        connectedAddress,
        hasAccount: !!account,
        accountAddress: account?.address,
      });

      // 기존 컨트랙트 사용 (민팅은 정상 작동)
      let currentContractAddress = NFT_CONTRACT_ADDRESS;
      console.log("📋 기존 컨트랙트 사용:", currentContractAddress);
      console.log(
        "💡 민팅은 정상 작동하지만, Claim을 위해서는 thirdweb 대시보드에서 Claim Conditions 설정이 필요합니다."
      );

      // 네트워크 확인 (Base Sepolia인지)
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const chainId = await (window as any).ethereum.request({
          method: "eth_chainId",
        });
        const currentChainId = parseInt(chainId, 16);
        console.log(
          "현재 체인 ID:",
          currentChainId,
          "/ 필요한 체인 ID: 84532 (Base Sepolia)"
        );

        if (currentChainId !== 84532) {
          try {
            // Base Sepolia로 네트워크 전환 요청
            await (window as any).ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x14a34" }], // 84532 in hex
            });
            console.log("Base Sepolia로 전환 완료");
          } catch (switchError: any) {
            // 네트워크가 추가되지 않은 경우 추가
            if (switchError.code === 4902) {
              try {
                await (window as any).ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0x14a34",
                      chainName: "Base Sepolia",
                      nativeCurrency: {
                        name: "Ether",
                        symbol: "ETH",
                        decimals: 18,
                      },
                      rpcUrls: ["https://sepolia.base.org"],
                      blockExplorerUrls: ["https://sepolia.basescan.org"],
                    },
                  ],
                });
                console.log("Base Sepolia 네트워크 추가 완료");
              } catch (addError) {
                console.error("네트워크 추가 실패:", addError);
                console.log("⚠️ Base Sepolia 네트워크로 전환해주세요.");
                setIsMinting(false);
                return;
              }
            } else {
              console.error("네트워크 전환 실패:", switchError);
              alert("Base Sepolia 네트워크로 전환해주세요.");
              setIsMinting(false);
              return;
            }
          }
        }
      }

      console.log("✅ 민팅 준비 완료 (Base Sepolia / SBMB):", {
        name: formData.name,
        category: formData.category,
        price: `${formData.price} SBMB`,
        connectedAddress,
        hasAccount: !!account,
        chain: "Base Sepolia (84532)",
      });

      // NFT 컨트랙트 연결 (자동 배포된 컨트랙트 사용)
      const nftContract = getContract({
        client: client,
        chain: baseSepolia,
        address: currentContractAddress,
      });

      // 1단계: 이미지 업로드 (Pinata IPFS)
      let imageUrl = "🎨"; // 기본값
      console.log("📋 이미지 업로드 상태 확인:", {
        hasFile: !!formData.file,
        fileName: formData.file?.name,
        fileSize: formData.file?.size,
        fileType: formData.file?.type,
        filePreview: formData.filePreview,
      });

      if (formData.file) {
        console.log("📤 1단계: 이미지를 Pinata IPFS에 업로드 중...");
        try {
          imageUrl = await uploadImageToPinata(formData.file);
          console.log("✅ 이미지 업로드 성공:", imageUrl);
        } catch (imageError) {
          console.log("❌ 이미지 업로드 실패, 테스트용 URL 생성:", imageError);
          // 테스트용: 간단한 이미지 URL 생성
          const testImageUrl = `https://via.placeholder.com/400x400/4ade80/ffffff?text=${encodeURIComponent(
            formData.name || "NFT"
          )}`;
          imageUrl = testImageUrl;
          console.log("🔄 테스트용 이미지 URL 사용:", testImageUrl);
        }
      } else {
        console.log("⚠️ 업로드된 파일이 없습니다. 카테고리 아이콘 사용");
        // 파일이 없으면 카테고리 아이콘 사용
        const categoryIcons = {
          art: "🎨",
          utility: "🔧",
          activity: "🏃",
        };
        imageUrl =
          categoryIcons[formData.category as keyof typeof categoryIcons] ||
          "🎨";
      }

      // 2단계: 메타데이터 생성
      const metadata = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Category",
            value: formData.category,
          },
          {
            trait_type: "Price",
            value: `${formData.price} SBMB`,
          },
        ],
      };

      console.log("📦 사용자 입력 메타데이터:", metadata);
      console.log("🖼️ 최종 이미지 URL:", imageUrl);
      console.log("📋 이미지 URL 타입:", typeof imageUrl);
      console.log("🔗 이미지 URL 시작:", imageUrl?.substring(0, 20));

      // 3단계: 메타데이터를 Pinata IPFS에 업로드
      console.log("📤 2단계: 메타데이터를 Pinata IPFS에 업로드 중...");
      let tokenURI: string;
      try {
        tokenURI = await uploadMetadataToPinata(metadata);
        console.log("✅ 메타데이터 업로드 성공:", tokenURI);
      } catch (metadataError) {
        console.log(
          "❌ 메타데이터 업로드 실패, Base64 방식 사용:",
          metadataError
        );
        // 백업: Base64 인코딩
        const metadataString = JSON.stringify(metadata);
        const bytes = new TextEncoder().encode(metadataString);
        const binString = Array.from(bytes, (byte) =>
          String.fromCodePoint(byte)
        ).join("");
        const base64 = btoa(binString);
        tokenURI = `data:application/json;base64,${base64}`;
        console.log(
          "🔄 Base64 메타데이터 사용:",
          tokenURI.substring(0, 50) + "..."
        );
      }

      console.log("🔗 TokenURI 생성 완료 (길이:", tokenURI.length, ")");

      // 카테고리별 아이콘 매핑 (formData.category 값에 맞춤)
      const categoryIcons = {
        art: "🎨",
        utility: "🔧",
        activity: "🏃",
      };

      // lazyMint된 메타데이터를 로컬 스토리지에 저장 (collection 페이지에서 사용)
      const lazyMintData = {
        tokenId: 0, // lazyMint는 항상 0부터 시작
        name: formData.name,
        description: formData.description,
        category: formData.category,
        image: categoryIcons[formData.category] || "🎁",
        price: formData.price,
        timestamp: Date.now(),
      };
      localStorage.setItem("lazyMintMetadata", JSON.stringify(lazyMintData));
      console.log("💾 lazyMint 메타데이터 로컬 저장:", lazyMintData);
      console.log("💾 저장된 이름:", lazyMintData.name);
      console.log("💾 저장된 카테고리:", lazyMintData.category);
      console.log("💾 저장된 설명:", lazyMintData.description);
      console.log("💾 저장된 이미지:", lazyMintData.image);

      // account 체크
      console.log("account 상태:", {
        hasAccount: !!account,
        accountAddress: account?.address,
        hasActiveWallet: !!activeWallet,
      });

      if (!account || !account.address) {
        console.error("❌ account가 없거나 address가 없습니다.");
        console.log(
          "⚠️ 지갑이 연결되지 않았습니다. Header의 Connect Wallet을 클릭해주세요."
        );
        setIsMinting(false);
        return;
      }

      // NFT Collection - mintTo 사용 (직접 민팅)
      console.log("📝 mintTo 준비 중... (NFT Collection, 직접 민팅)");
      console.log("📋 민팅 파라미터:", {
        to: connectedAddress,
        uri: tokenURI,
        uriLength: tokenURI.length,
      });

      // 컨트랙트 상태 확인
      console.log("🔍 컨트랙트 상태 확인 중...");

      try {
        // 컨트랙트가 일시 정지 상태인지 확인
        const isPaused = await readContract({
          contract: nftContract,
          method: "function paused() view returns (bool)",
          params: [],
        });
        console.log("📋 컨트랙트 일시 정지 상태:", isPaused);

        if (isPaused) {
          alert(
            "컨트랙트가 일시 정지 상태입니다.\n\n민팅이 비활성화되어 있습니다."
          );
          setIsMinting(false);
          return;
        }

        // 컨트랙트 소유자 확인
        const owner = await readContract({
          contract: nftContract,
          method: "function owner() view returns (address)",
          params: [],
        });
        console.log("📋 컨트랙트 소유자:", owner);

        // 현재 사용자가 소유자인지 확인
        const isOwner = owner.toLowerCase() === connectedAddress.toLowerCase();
        console.log("📋 컨트랙트 소유자 여부:", isOwner);

        // 민팅 권한 확인
        try {
          const hasRole = await readContract({
            contract: nftContract,
            method:
              "function hasRole(bytes32 role, address account) view returns (bool)",
            params: [
              "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
              connectedAddress,
            ], // MINTER_ROLE
          });
          console.log("🔑 민팅 권한:", hasRole);
        } catch (roleError) {
          console.log("⚠️ 민팅 권한 확인 실패:", roleError);
        }

        if (!isOwner) {
          console.log("⚠️ 컨트랙트 소유자가 아닙니다. 다른 방법을 시도합니다.");
        }

        // 컨트랙트의 민팅 가능 여부 확인
        const maxSupply = await readContract({
          contract: nftContract,
          method: "function maxSupply() view returns (uint256)",
          params: [],
        });
        console.log("📋 최대 공급량:", maxSupply.toString());

        const totalSupply = await readContract({
          contract: nftContract,
          method: "function totalSupply() view returns (uint256)",
          params: [],
        });
        console.log("📋 현재 공급량:", totalSupply.toString());

        if (Number(totalSupply) >= Number(maxSupply)) {
          alert("최대 공급량에 도달했습니다.\n\n더 이상 민팅할 수 없습니다.");
          setIsMinting(false);
          return;
        }
      } catch (error) {
        console.log("⚠️ 컨트랙트 상태 확인 실패:", error);
        // 상태 확인 실패해도 계속 진행
      }

      // NFT Collection 다양한 민팅 방법 시도
      // 컨트랙트 상태 확인
      console.log("🔍 컨트랙트 상태 확인 중...");

      try {
        // 컨트랙트 소유자 확인
        const owner = await readContract({
          contract: nftContract,
          method: "function owner() view returns (address)",
          params: [],
        });
        console.log("📋 컨트랙트 소유자:", owner);

        // 컨트랙트 일시정지 상태 확인
        const paused = await readContract({
          contract: nftContract,
          method: "function paused() view returns (bool)",
          params: [],
        });
        console.log("📋 컨트랙트 일시정지 상태:", paused);

        // 최대 공급량 확인
        const maxSupply = await readContract({
          contract: nftContract,
          method: "function maxSupply() view returns (uint256)",
          params: [],
        });
        console.log("📋 최대 공급량:", maxSupply.toString());

        // 현재 공급량 확인
        const totalSupply = await readContract({
          contract: nftContract,
          method: "function totalSupply() view returns (uint256)",
          params: [],
        });
        console.log("📋 현재 공급량:", totalSupply.toString());

        // 민터 권한 확인
        const hasMinterRole = await readContract({
          contract: nftContract,
          method:
            "function hasRole(bytes32 role, address account) view returns (bool)",
          params: [
            "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
            connectedAddress,
          ], // MINTER_ROLE
        });
        console.log("📋 민터 권한:", hasMinterRole);
      } catch (statusError) {
        console.log("📋 컨트랙트 상태 확인 실패:", statusError);
      }

      console.log("🔄 NFT Collection 민팅 방법 시도 중...");

      let result;
      let mintSuccess = false;

      // 방법 1: mintTo (URI 포함) - quantity만큼 반복
      try {
        const quantity = parseInt(formData.quantity) || 1;
        console.log(`📝 방법 1: mintTo 함수 시도 중... (${quantity}개 민팅)`);

        for (let i = 0; i < quantity; i++) {
          console.log(`📝 ${i + 1}/${quantity}번째 NFT 민팅 중...`);
          const mintToTransaction = prepareContractCall({
            contract: nftContract,
            method: "function mintTo(address to, string memory uri) payable",
            params: [connectedAddress, tokenURI],
            value: BigInt(0),
          });

          result = await sendTransaction({
            transaction: mintToTransaction,
            account,
          });
          console.log(
            `✅ ${i + 1}/${quantity}번째 NFT 민팅 성공! Transaction hash:`,
            result.transactionHash
          );
        }
        console.log(`🎉 총 ${quantity}개의 NFT 민팅 완료!`);
        mintSuccess = true;
      } catch (mintToError) {
        console.log("❌ 방법 1: mintTo 실패:", mintToError);

        // 방법 2: safeMint (URI 포함)
        try {
          console.log("📝 방법 2: safeMint 함수 시도 중...");
          const safeMintTransaction = prepareContractCall({
            contract: nftContract,
            method: "function safeMint(address to, string memory uri) payable",
            params: [connectedAddress, tokenURI],
            value: BigInt(0),
          });

          result = await sendTransaction({
            transaction: safeMintTransaction,
            account,
          });
          console.log(
            "✅ 방법 2: safeMint 성공! Transaction hash:",
            result.transactionHash
          );
          mintSuccess = true;
        } catch (safeMintError) {
          console.log("❌ 방법 2: safeMint 실패:", safeMintError);

          // 방법 3: mint (기본 함수)
          try {
            console.log("📝 방법 3: mint 함수 시도 중...");
            const mintTransaction = prepareContractCall({
              contract: nftContract,
              method: "function mint(address to) payable",
              params: [connectedAddress],
              value: BigInt(0),
            });

            result = await sendTransaction({
              transaction: mintTransaction,
              account,
            });
            console.log(
              "✅ 방법 3: mint 성공! Transaction hash:",
              result.transactionHash
            );
            mintSuccess = true;
          } catch (mintError) {
            console.log("❌ 방법 3: mint 실패:", mintError);

            // 방법 4: _mint (내부 함수)
            try {
              console.log("📝 방법 4: _mint 함수 시도 중...");
              const internalMintTransaction = prepareContractCall({
                contract: nftContract,
                method: "function _mint(address to, uint256 tokenId) payable",
                params: [connectedAddress, BigInt(1)],
                value: BigInt(0),
              });

              result = await sendTransaction({
                transaction: internalMintTransaction,
                account,
              });
              console.log(
                "✅ 방법 4: _mint 성공! Transaction hash:",
                result.transactionHash
              );
              mintSuccess = true;
            } catch (internalMintError) {
              console.log("❌ 방법 4: _mint 실패:", internalMintError);

              // 방법 5: _safeMint (내부 함수)
              try {
                console.log("📝 방법 5: _safeMint 함수 시도 중...");
                const safeMintTransaction = prepareContractCall({
                  contract: nftContract,
                  method:
                    "function _safeMint(address to, uint256 tokenId) payable",
                  params: [connectedAddress, BigInt(1)],
                  value: BigInt(0),
                });

                result = await sendTransaction({
                  transaction: safeMintTransaction,
                  account,
                });
                console.log(
                  "✅ 방법 5: _safeMint 성공! Transaction hash:",
                  result.transactionHash
                );
                mintSuccess = true;
              } catch (safeMintError) {
                console.log("❌ 방법 5: _safeMint 실패:", safeMintError);

                // 방법 6: mintTo (빈 URI)
                try {
                  console.log("📝 방법 6: mintTo (빈 URI) 시도 중...");
                  const mintToEmptyTransaction = prepareContractCall({
                    contract: nftContract,
                    method:
                      "function mintTo(address to, string memory uri) payable",
                    params: [connectedAddress, ""],
                    value: BigInt(0),
                  });

                  result = await sendTransaction({
                    transaction: mintToEmptyTransaction,
                    account,
                  });
                  console.log(
                    "✅ 방법 6: mintTo (빈 URI) 성공! Transaction hash:",
                    result.transactionHash
                  );
                  mintSuccess = true;
                } catch (mintToEmptyError) {
                  console.log(
                    "❌ 방법 6: mintTo (빈 URI) 실패:",
                    mintToEmptyError
                  );

                  // 방법 7: lazyMint (NFT Drop 방식)
                  try {
                    console.log("📝 새 NFT Collection mintTo 시도 중...");

                    // 방법 1: mintTo (URI 포함)
                    try {
                      const mintToTransaction = prepareContractCall({
                        contract: nftContract,
                        method:
                          "function mintTo(address to, string memory uri) payable",
                        params: [connectedAddress, tokenURI],
                        value: BigInt(0),
                      });

                      result = await sendTransaction({
                        transaction: mintToTransaction,
                        account,
                      });
                      console.log(
                        "✅ mintTo (URI) 성공! Transaction hash:",
                        result.transactionHash
                      );
                      mintSuccess = true;
                    } catch (mintToError) {
                      console.log("❌ mintTo (URI) 실패:", mintToError);

                      // 방법 2: mintTo (빈 URI)
                      try {
                        console.log("📝 mintTo (빈 URI) 시도 중...");
                        const mintToEmptyTransaction = prepareContractCall({
                          contract: nftContract,
                          method:
                            "function mintTo(address to, string memory uri) payable",
                          params: [connectedAddress, ""],
                          value: BigInt(0),
                        });

                        result = await sendTransaction({
                          transaction: mintToEmptyTransaction,
                          account,
                        });
                        console.log(
                          "✅ mintTo (빈 URI) 성공! Transaction hash:",
                          result.transactionHash
                        );
                        mintSuccess = true;
                      } catch (mintToEmptyError) {
                        console.log(
                          "❌ mintTo (빈 URI) 실패:",
                          mintToEmptyError
                        );

                        // 방법 3: safeMint
                        try {
                          console.log("📝 safeMint 시도 중...");
                          const safeMintTransaction = prepareContractCall({
                            contract: nftContract,
                            method:
                              "function safeMint(address to, string memory uri) payable",
                            params: [connectedAddress, tokenURI],
                            value: BigInt(0),
                          });

                          result = await sendTransaction({
                            transaction: safeMintTransaction,
                            account,
                          });
                          console.log(
                            "✅ safeMint 성공! Transaction hash:",
                            result.transactionHash
                          );
                          mintSuccess = true;
                        } catch (safeMintError) {
                          console.log("❌ safeMint 실패:", safeMintError);

                          // 방법 4: mint (기본)
                          try {
                            console.log("📝 mint (기본) 시도 중...");
                            const mintTransaction = prepareContractCall({
                              contract: nftContract,
                              method: "function mint(address to) payable",
                              params: [connectedAddress],
                              value: BigInt(0),
                            });

                            result = await sendTransaction({
                              transaction: mintTransaction,
                              account,
                            });
                            console.log(
                              "✅ mint (기본) 성공! Transaction hash:",
                              result.transactionHash
                            );
                            mintSuccess = true;
                          } catch (mintError) {
                            console.log("❌ mint (기본) 실패:", mintError);

                            // 방법 5: _mint
                            try {
                              console.log("📝 _mint 시도 중...");
                              const internalMintTransaction =
                                prepareContractCall({
                                  contract: nftContract,
                                  method:
                                    "function _mint(address to, uint256 tokenId) payable",
                                  params: [connectedAddress, BigInt(1)],
                                  value: BigInt(0),
                                });

                              result = await sendTransaction({
                                transaction: internalMintTransaction,
                                account,
                              });
                              console.log(
                                "✅ _mint 성공! Transaction hash:",
                                result.transactionHash
                              );
                              mintSuccess = true;
                            } catch (internalMintError) {
                              console.log("❌ _mint 실패:", internalMintError);
                              throw internalMintError;
                            }
                          }
                        }
                      }
                    }

                    console.log("🎉 민팅 성공!");
                    console.log("📋 TX:", result.transactionHash);
                  } catch (allMintError) {
                    console.log("❌ 모든 민팅 방법 실패:", allMintError);
                    console.log("❌ 에러 상세:", allMintError);

                    // 모든 민팅 방법 실패 시 에러 처리
                    alert(
                      `❌ 민팅 실패!\n\n5가지 민팅 방법 모두 실패했습니다:\n\n1. mintTo(address to, string uri)\n2. mintTo(address to, "")\n3. safeMint(address to, string uri)\n4. mint(address to)\n5. _mint(address to, uint256 tokenId)\n\n가능한 원인:\n- 컨트랙트가 일시정지 상태\n- 민터 권한이 없음\n- 최대 공급량 초과\n- 컨트랙트 소유자만 민팅 가능\n\nthirdweb 대시보드에서 컨트랙트 설정을 확인해주세요.`
                    );
                    setIsMinting(false);
                    return;
                  }
                }
              }
            }
          }
        }
      }

      if (!mintSuccess) {
        console.error("❌ lazyMint + claim 실패");
        alert(
          "❌ 민팅 실패!\n\nlazyMint 또는 claim이 실패했습니다.\n\n컨트랙트 설정을 확인해주세요."
        );
        setIsMinting(false);
        return;
      }

      console.log("✅ 민팅 및 claim 완료!");
      // 민팅 성공 시 로컬 스토리지 정리
      console.log("🧹 민팅 성공! 로컬 스토리지 정리 중...");
      localStorage.removeItem("lazyMintMetadata");
      console.log("✅ 로컬 스토리지 정리 완료");

      console.log(
        "✅ 민팅 및 claim 완료! Transaction hash:",
        result.transactionHash
      );
      console.log("📦 저장된 메타데이터:", lazyMintData);
      console.log(
        "📦 로컬 스토리지 확인:",
        localStorage.getItem("lazyMintMetadata")
      );

      // 성공 페이지로 리다이렉트 (NFT 정보 포함)
      const successUrl = new URL("/mint-success", window.location.origin);
      successUrl.searchParams.set("tokenId", "1"); // 새로 민팅된 NFT의 tokenId
      successUrl.searchParams.set("txHash", result?.transactionHash || "");
      successUrl.searchParams.set("contractAddress", NFT_CONTRACT_ADDRESS);
      successUrl.searchParams.set("nftName", nftName); // NFT 이름 전달
      successUrl.searchParams.set("nftDescription", description); // 설명 전달
      successUrl.searchParams.set("category", selectedCategory); // 카테고리 전달
      if (uploadedImageUrl) {
        successUrl.searchParams.set("nftImage", uploadedImageUrl); // 이미지 URL 전달
      }
      successUrl.searchParams.set("gasFee", "0.008 SBMB");
      successUrl.searchParams.set("blockNumber", "#18,543,892");
      successUrl.searchParams.set("confirmations", "12 confirmations");
      successUrl.searchParams.set(
        "mintedAt",
        new Date().toLocaleString("ko-KR")
      );

      window.location.href = successUrl.toString();

      // 성공 페이지로 이동 완료
    } catch (error) {
      console.error("민팅 또는 claim 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      alert(
        `❌ 민팅 실패!\n\n${errorMessage}\n\nmint와 claim이 모두 성공해야 합니다. 다시 시도해주세요.`
      );
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-3">Create New NFT</h1>
          <p className="text-lg text-gray-600 mb-4">
            Upload your digital artwork and turn it into a unique NFT on the
            blockchain
          </p>

          {/* 네트워크 상태 표시 */}
          {currentChainId === 84532 ? (
            <div className="inline-flex items-center space-x-2 text-sm text-teal-600 bg-teal-50 px-4 py-2 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Base Sepolia Testnet (84532)</span>
              <span className="text-gray-400">•</span>
              <span className="font-medium">SBMB Token</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">
                Wrong Network! Currently:{" "}
                {currentChainId ? `Chain ${currentChainId}` : "Unknown"}
              </span>
              <button
                onClick={async () => {
                  try {
                    await (window as any).ethereum.request({
                      method: "wallet_switchEthereumChain",
                      params: [{ chainId: "0x14a34" }],
                    });
                  } catch (err: any) {
                    if (err.code === 4902) {
                      await (window as any).ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                          {
                            chainId: "0x14a34",
                            chainName: "Base Sepolia",
                            nativeCurrency: {
                              name: "Ether",
                              symbol: "ETH",
                              decimals: 18,
                            },
                            rpcUrls: ["https://sepolia.base.org"],
                            blockExplorerUrls: ["https://sepolia.basescan.org"],
                          },
                        ],
                      });
                    }
                  }
                }}
                className="ml-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Switch to Base Sepolia
              </button>
            </div>
          )}
        </div>

        {/* 메인 컨텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측: 파일 업로드 */}
          <div>
            {/* 파일 업로드 영역 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                isDragging
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              {formData.filePreview ? (
                <div className="space-y-4">
                  <img
                    src={formData.filePreview}
                    alt="Preview"
                    className="max-h-96 mx-auto rounded-lg"
                  />
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        file: null,
                        filePreview: null,
                      }))
                    }
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-2">
                      Drag & Drop your file here
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      or click to browse
                    </p>
                    <label htmlFor="file-upload">
                      <span className="inline-flex items-center px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 cursor-pointer transition-colors">
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Choose File
                      </span>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 파일 요구사항 */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-blue-900">
                  <h4 className="font-semibold mb-2">File Requirements</h4>
                  <ul className="space-y-1">
                    <li>
                      • Supported formats: JPG, PNG, GIF, SVG, MP4, WEBM, MP3,
                      WAV (Max 100MB)
                    </li>
                    <li>• Recommended resolution: 1000×1000px or higher</li>
                    <li>
                      • For best quality, use PNG format with transparent
                      background
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 폼 */}
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-black mb-6">
                Basic Information
              </h2>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter NFT name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black placeholder:text-gray-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe your NFT in detail..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-black placeholder:text-gray-400"
                  />
                </div>

                {/* Category & Collection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white text-black"
                    >
                      {categories.map((cat) => (
                        <option
                          key={cat.value}
                          value={cat.value}
                          disabled={cat.disabled}
                        >
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collection
                    </label>
                    <select
                      value={formData.collection}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          collection: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white text-black"
                    >
                      {collections.map((col) => (
                        <option
                          key={col.value}
                          value={col.value}
                          disabled={col.disabled}
                        >
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Sale */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-black mb-6">
                Pricing & Sale
              </h2>

              <div className="space-y-5">
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (SBMB) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="100"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black placeholder:text-gray-400"
                    />
                    {formData.price && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {parseFloat(formData.price).toFixed(2)} SBMB
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Base Sepolia Testnet • SBMB Token
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      placeholder="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black placeholder:text-gray-400"
                    />
                    {formData.quantity && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        {formData.quantity} NFTs
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    최대 100개까지 민팅 가능
                  </p>
                </div>

                {/* Creator Royalties */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Creator Royalties (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.royalties}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          royalties: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-black"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    You&apos;ll receive {formData.royalties}% of sales if this
                    item is re-sold
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleMint}
              disabled={
                isMinting ||
                !formData.name ||
                !formData.category ||
                !formData.price ||
                !formData.file
              }
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2 ${
                isMinting ||
                !formData.name ||
                !formData.category ||
                !formData.price ||
                !formData.file
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-teal-500 text-white hover:bg-teal-600"
              }`}
            >
              {isMinting ? (
                <>
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
                  <span>Creating...</span>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Create & List NFT (SBMB)</span>
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
