"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  getContract,
  readContract,
  prepareContractCall,
  sendTransaction,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "@/lib/wallet";
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  NFT_CONTRACT_ADDRESS,
} from "@/lib/thirdweb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CancelAllListingsPage() {
  const account = useActiveAccount();
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()} - ${message}`,
    ]);
    console.log(message);
  };

  // 모든 ACTIVE 리스팅 조회
  const fetchActiveListings = async () => {
    if (!account?.address) {
      alert("지갑을 먼저 연결해주세요!");
      return;
    }

    setIsLoading(true);
    setLogs([]);
    addLog("🔍 ACTIVE 리스팅 조회 시작...");

    try {
      const marketplaceContract = getContract({
        client,
        chain: baseSepolia,
        address: MARKETPLACE_CONTRACT_ADDRESS,
      });

      // 전체 리스팅 개수 확인
      const totalListingsCount = await readContract({
        contract: marketplaceContract,
        method: "function totalListings() view returns (uint256)",
        params: [],
      });

      addLog(`📊 전체 리스팅 개수: ${totalListingsCount.toString()}`);

      const activeListings = [];

      // 모든 리스팅 확인
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
            _tokenOwner,
            ,
            _status,
          ] = listing;

          // ACTIVE 상태(1)이고 본인 소유이며 NFT 컨트랙트가 일치하는 리스팅
          if (
            _status === 1 &&
            _tokenOwner.toLowerCase() === account.address.toLowerCase() &&
            _assetContract.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
          ) {
            const price = (Number(_pricePerToken) / 1e18).toFixed(2);
            activeListings.push({
              listingId: i,
              tokenId: Number(_tokenId),
              price,
              owner: _tokenOwner,
            });
            addLog(`✅ 리스팅 ${i}: tokenId=${_tokenId}, price=${price} SBMB`);
          }
        } catch (error) {
          // 조회 실패는 무시
        }
      }

      addLog(`\n📋 본인 소유 ACTIVE 리스팅: ${activeListings.length}개 발견`);
      setListings(activeListings);
    } catch (error) {
      addLog(
        `❌ 오류 발생: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 모든 리스팅 취소
  const cancelAllListings = async () => {
    if (!account) {
      alert("지갑을 먼저 연결해주세요!");
      return;
    }

    if (listings.length === 0) {
      alert("취소할 리스팅이 없습니다!");
      return;
    }

    if (
      !confirm(
        `정말로 ${listings.length}개의 모든 리스팅을 취소하시겠습니까?\n\n` +
          `이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setCancelledCount(0);
    addLog(`\n🗑️  ${listings.length}개 리스팅 취소 시작...\n`);

    const marketplaceContract = getContract({
      client,
      chain: baseSepolia,
      address: MARKETPLACE_CONTRACT_ADDRESS,
    });

    let successCount = 0;
    let failCount = 0;

    for (const listing of listings) {
      try {
        addLog(
          `🗑️  리스팅 ${listing.listingId} 취소 중... (tokenId=${listing.tokenId}, price=${listing.price} SBMB)`
        );

        const cancelTransaction = prepareContractCall({
          contract: marketplaceContract,
          method: "function cancelListing(uint256 listingId)",
          params: [BigInt(listing.listingId)],
        });

        const result = await sendTransaction({
          transaction: cancelTransaction,
          account,
        });

        addLog(
          `✅ 리스팅 ${listing.listingId} 취소 완료! TX: ${result.transactionHash}`
        );
        successCount++;
        setCancelledCount(successCount);

        // 트랜잭션 간 딜레이 (블록체인 부하 방지)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        addLog(
          `❌ 리스팅 ${listing.listingId} 취소 실패: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        failCount++;
      }
    }

    addLog(`\n🎉 작업 완료!`);
    addLog(`✅ 성공: ${successCount}개`);
    addLog(`❌ 실패: ${failCount}개`);

    setIsCancelling(false);

    if (successCount > 0) {
      alert(
        `🎉 리스팅 취소 완료!\n\n` +
          `✅ 성공: ${successCount}개\n` +
          `❌ 실패: ${failCount}개\n\n` +
          `페이지를 새로고침합니다.`
      );
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🗑️ 리스팅 일괄 취소
            </h1>
            <p className="text-gray-600">
              본인 소유의 모든 ACTIVE 리스팅을 한 번에 취소할 수 있습니다.
            </p>
          </div>

          {/* 지갑 연결 확인 */}
          {!account?.address ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-yellow-800 font-medium">
                지갑을 먼저 연결해주세요!
              </p>
            </div>
          ) : (
            <>
              {/* 계정 정보 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">연결된 지갑</p>
                <p className="font-mono text-gray-900">
                  {account.address.slice(0, 10)}...{account.address.slice(-8)}
                </p>
              </div>

              {/* 조회 버튼 */}
              <button
                onClick={fetchActiveListings}
                disabled={isLoading || isCancelling}
                className={`w-full mb-6 py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  isLoading || isCancelling
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {isLoading ? (
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
                    <span>조회 중...</span>
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>내 리스팅 조회하기</span>
                  </>
                )}
              </button>

              {/* 리스팅 목록 */}
              {listings.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    📋 발견된 리스팅 ({listings.length}개)
                  </h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {listings.map((listing) => (
                      <div
                        key={listing.listingId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            NFT #{listing.tokenId}
                          </span>
                          <span className="text-gray-500 mx-2">•</span>
                          <span className="text-teal-600 font-semibold">
                            {listing.price} SBMB
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Listing #{listing.listingId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 일괄 취소 버튼 */}
              {listings.length > 0 && (
                <button
                  onClick={cancelAllListings}
                  disabled={isCancelling}
                  className={`w-full mb-6 py-4 px-6 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center space-x-2 ${
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
                      <span>
                        취소 중... ({cancelledCount}/{listings.length})
                      </span>
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>모든 리스팅 취소하기 ({listings.length}개)</span>
                    </>
                  )}
                </button>
              )}

              {/* 로그 */}
              {logs.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-y-auto max-h-96">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    📝 실행 로그
                  </h3>
                  <div className="font-mono text-xs space-y-1">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`${
                          log.includes("✅")
                            ? "text-green-400"
                            : log.includes("❌")
                            ? "text-red-400"
                            : log.includes("🗑️")
                            ? "text-yellow-400"
                            : "text-gray-400"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 안내 */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  ℹ️ 사용 방법
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>"내 리스팅 조회하기" 버튼 클릭</li>
                  <li>조회된 리스팅 목록 확인</li>
                  <li>"모든 리스팅 취소하기" 버튼 클릭</li>
                  <li>각 트랜잭션 승인 (MetaMask)</li>
                  <li>완료!</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

