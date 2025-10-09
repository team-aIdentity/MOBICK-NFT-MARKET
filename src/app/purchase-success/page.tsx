"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function PurchaseSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [purchaseData, setPurchaseData] = useState<{
    nftId: string;
    txHash: string;
    price: string;
    gasFee: string;
    totalPaid: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // URL 파라미터에서 구매 정보 가져오기
    const nftId = searchParams.get("nftId");
    const txHash = searchParams.get("txHash");
    const price = searchParams.get("price");
    const gasFee = searchParams.get("gasFee");
    const totalPaid = searchParams.get("totalPaid");

    if (nftId && txHash) {
      setPurchaseData({
        nftId,
        txHash,
        price: price || "0.001",
        gasFee: gasFee || "0.0045",
        totalPaid: totalPaid || "0.0055",
        timestamp: new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      });
    }
  }, [searchParams]);

  const handleCopyTxHash = () => {
    if (purchaseData?.txHash) {
      navigator.clipboard.writeText(purchaseData.txHash);
      alert("트랜잭션 해시가 복사되었습니다!");
    }
  };

  const handleViewCollection = () => {
    router.push("/");
  };

  const handleSharePurchase = () => {
    if (navigator.share) {
      navigator.share({
        title: "NFT 구매 완료!",
        text: `NFT #${purchaseData?.nftId} 구매가 완료되었습니다!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("구매 정보 링크가 복사되었습니다!");
    }
  };

  const handleViewOnBasescan = () => {
    if (purchaseData?.txHash) {
      window.open(
        `https://sepolia.basescan.org/tx/${purchaseData.txHash}`,
        "_blank"
      );
    }
  };

  // NFT 정보 (실제로는 API에서 가져올 데이터)
  const nftInfo = {
    1: {
      name: "Abstract Genesis #001",
      collection: "Digital Art Collection",
      artist: "ArtistDAO",
      image: "🎨",
    },
    2: {
      name: "Cosmic Dreams #042",
      collection: "Space Art Series",
      artist: "SpaceCreator",
      image: "⭐",
    },
    3: {
      name: "MetaTool Access #127",
      collection: "Utility Collection",
      artist: "ToolDAO",
      image: "🔧",
    },
    4: {
      name: "Game Pass #003",
      collection: "Gaming Collection",
      artist: "GameStudio",
      image: "🎮",
    },
    5: {
      name: "Run2Earn Pass #089",
      collection: "Fitness Collection",
      artist: "FitnessDAO",
      image: "🏃",
    },
    6: {
      name: "Ocean Waves #156",
      collection: "Nature Collection",
      artist: "NatureArtist",
      image: "🌊",
    },
    7: {
      name: "VIP Access Key #203",
      collection: "Premium Collection",
      artist: "VIPDAO",
      image: "🗝️",
    },
    8: {
      name: "Art Mask #071",
      collection: "Theater Collection",
      artist: "TheaterDAO",
      image: "🎭",
    },
  };

  const currentNft =
    nftInfo[parseInt(purchaseData?.nftId || "1") as keyof typeof nftInfo] ||
    nftInfo[1];

  if (!purchaseData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            구매 정보를 불러오는 중...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Section */}
        <div className="text-center mb-12">
          {/* Checkmark Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-teal-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Title with Confetti */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎉</span>
              <h1 className="text-4xl font-bold text-gray-900">
                Purchase Successful!
              </h1>
              <span className="text-2xl">🎊</span>
            </div>
          </div>

          {/* Congratulatory Message */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Congratulations! You&apos;ve successfully purchased your NFT. The
            NFT has been transferred to your wallet.
          </p>
        </div>

        {/* Purchase Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Purchase Details
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-semibold">Confirmed</span>
            </div>
          </div>

          {/* NFT Information */}
          <div className="flex items-center space-x-6 mb-8">
            {/* NFT Thumbnail */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <div className="text-3xl">{currentNft.image}</div>
            </div>

            {/* NFT Details */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {currentNft.name}
              </h3>
              <p className="text-gray-600 mb-2">{currentNft.collection}</p>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {currentNft.artist.charAt(0)}
                  </span>
                </div>
                <span className="text-gray-700">by {currentNft.artist}</span>
              </div>
            </div>

            {/* Purchase Price */}
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Purchase Price</p>
              <p className="text-2xl font-bold text-gray-900">
                {purchaseData.price} SBMB
              </p>
              <p className="text-sm text-gray-500">
                ${(parseFloat(purchaseData.price) * 1700).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            {/* Transaction Hash */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Transaction Hash</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm text-gray-900">
                  {purchaseData.txHash.slice(0, 10)}...
                  {purchaseData.txHash.slice(-10)}
                </span>
                <button
                  onClick={handleCopyTxHash}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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

            {/* Gas Fee */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Gas Fee</span>
              <span className="font-semibold text-gray-900">
                {purchaseData.gasFee} SBMB
              </span>
            </div>

            {/* Total Paid */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Total Paid</span>
              <span className="font-bold text-lg text-gray-900">
                {purchaseData.totalPaid} SBMB
              </span>
            </div>

            {/* Confirmed At */}
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">Confirmed At</span>
              <span className="font-semibold text-gray-900">
                {purchaseData.timestamp}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* View My Collection */}
          <button
            onClick={handleViewCollection}
            className="bg-teal-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-600 transition-colors flex items-center justify-center space-x-3 shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>View My Collection</span>
          </button>

          {/* Share Purchase */}
          <button
            onClick={handleSharePurchase}
            className="bg-white text-teal-500 border-2 border-teal-500 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-50 transition-colors flex items-center justify-center space-x-3 shadow-lg"
          >
            <svg
              className="w-6 h-6"
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
            <span>Share Purchase</span>
          </button>

          {/* View on BaseScan */}
          <button
            onClick={handleViewOnBasescan}
            className="bg-white text-teal-500 border-2 border-teal-500 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-50 transition-colors flex items-center justify-center space-x-3 shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span>View on BaseScan</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchaseSuccessContent />
    </Suspense>
  );
}
