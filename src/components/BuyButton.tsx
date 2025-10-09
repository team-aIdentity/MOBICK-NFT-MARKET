"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  PAY_TOKEN_CONTRACT_ADDRESS,
} from "@/lib/thirdweb";

interface BuyButtonProps {
  listingId: string;
  buyerAddress: string;
  priceStr: string;
  className?: string;
}

export default function BuyButton({
  listingId,
  buyerAddress,
  priceStr,
  className,
}: BuyButtonProps) {
  const [isBuying, setIsBuying] = useState(false);
  const account = useActiveAccount();

  const handleBuy = async () => {
    if (!account || !account.address) {
      alert("지갑을 연결해주세요.");
      return;
    }

    if (!buyerAddress) {
      alert("구매자 주소가 필요합니다.");
      return;
    }

    setIsBuying(true);
    try {
      console.log("🛒 NFT 구매 시작:", {
        listingId,
        buyerAddress,
        priceStr,
        accountAddress: account.address,
      });

      // 마켓플레이스 컨트랙트 연결
      const marketplaceContract = getContract({
        client,
        chain: baseSepolia,
        address: MARKETPLACE_CONTRACT_ADDRESS,
      });

      // SBMB 토큰 주소 사용 (현재는 직접 사용)

      // 가격을 Wei로 변환
      const priceInWei = BigInt(parseFloat(priceStr) * 1e18);

      // 구매 트랜잭션 준비
      const transaction = prepareContractCall({
        contract: marketplaceContract,
        method:
          "function buyFromListing(uint256 _listingId, address _buyFor, uint256 _quantity, address _currency, uint256 _expectedTotalPrice) payable",
        params: [
          BigInt(listingId),
          buyerAddress,
          BigInt(1), // 수량
          PAY_TOKEN_CONTRACT_ADDRESS, // SBMB 토큰
          priceInWei, // 예상 총 가격
        ],
        value: BigInt(0),
      });

      console.log("📝 구매 트랜잭션 전송 중...");
      const result = await sendTransaction({
        transaction,
        account,
      });

      console.log("✅ 구매 완료:", result.transactionHash);
      alert(`🎉 NFT 구매가 완료되었습니다!\n\nTx: ${result.transactionHash}`);
    } catch (error) {
      console.error("구매 실패:", error);
      alert(
        `구매 중 오류가 발생했습니다:\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <button
      onClick={handleBuy}
      disabled={isBuying || !account}
      className={
        className ||
        `w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          isBuying || !account
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-teal-500 text-white hover:bg-teal-600"
        }`
      }
    >
      {isBuying ? "구매 중..." : `구매하기 - ${priceStr} SBMB`}
    </button>
  );
}
