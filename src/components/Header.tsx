"use client";

import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
  ConnectButton,
} from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { createWallet } from "thirdweb/wallets";
import { useState, useEffect } from "react";
import Link from "next/link";
import { client } from "@/lib/wallet";

// SBMB 토큰 주소 (베이스 세폴리아)
const SBMB_TOKEN_ADDRESS = "0x25C2F65Efe4624Cb1c009A4c0FD8540515Dbe71B";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const address = account?.address;

  // SBMB 토큰 잔액 상태
  const [sbmbBalance, setSbmbBalance] = useState<string>("0.000");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  // 안전한 단위 포맷터 (BigInt 사용)
  const formatTokenUnits = (
    rawStr: string,
    decimals: number,
    fractionDigits = 3
  ): string => {
    try {
      const raw = BigInt(rawStr);
      const base = BigInt(10) ** BigInt(decimals);
      const scale = BigInt(10) ** BigInt(fractionDigits);
      const scaled = (raw * scale) / base;
      const intPart = scaled / scale;
      const fracPart = scaled % scale;
      return `${intPart.toString()}.${fracPart
        .toString()
        .padStart(fractionDigits, "0")}`;
    } catch {
      return "0.000";
    }
  };

  // 토큰 decimals 가져오기
  useEffect(() => {
    const readDecimals = async () => {
      try {
        const tokenContract = getContract({
          client: client,
          chain: baseSepolia,
          address: SBMB_TOKEN_ADDRESS,
        });

        const d = await readContract({
          contract: tokenContract,
          method: "function decimals() view returns (uint8)",
          params: [],
        });
        const n = Number(d);
        if (!Number.isNaN(n) && n > 0 && n <= 36) {
          setTokenDecimals(n);
          console.log("토큰 decimals:", n);
        }
      } catch (error) {
        console.log("decimals 조회 실패, 기본 18 사용", error);
        setTokenDecimals(18);
      }
    };
    readDecimals();
  }, []);

  // SBMB 토큰 잔액 가져오기
  useEffect(() => {
    const fetchSBMBBalance = async () => {
      if (!address) return;

      try {
        const tokenContract = getContract({
          client: client,
          chain: baseSepolia,
          address: SBMB_TOKEN_ADDRESS,
        });

        const balance = await readContract({
          contract: tokenContract,
          method: "function balanceOf(address) view returns (uint256)",
          params: [address],
        });

        console.log("SBMB 잔액 조회 성공:", balance.toString());
        const formatted = formatTokenUnits(
          balance.toString(),
          tokenDecimals,
          3
        );
        setSbmbBalance(formatted);
      } catch (error) {
        console.error("SBMB 잔액 가져오기 실패:", error);
        setSbmbBalance("0.000");
      }
    };

    fetchSBMBBalance();
  }, [address, tokenDecimals]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-teal-600">춘심이네 NFT</h1>
            </div>
          </div>

          {/* 네비게이션 메뉴 (데스크톱) */}
          <nav className="hidden md:flex space-x-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-teal-50"
            >
              Home
            </Link>
            <Link
              href="/collection"
              className="text-gray-700 hover:text-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-teal-50"
            >
              My Collection
            </Link>
            <Link
              href="/mint"
              className="text-gray-700 hover:text-teal-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-teal-50"
            >
              Create Mint
            </Link>
          </nav>

          {/* 지갑 연결 버튼 */}
          <div className="flex items-center space-x-4">
            {address ? (
              <div className="flex items-center space-x-2">
                {/* 주소와 잔액 표시 */}
                <div className="flex items-center bg-white border border-teal-500 rounded-lg px-3 py-2">
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs font-bold">0x</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {sbmbBalance} SBMB
                    </span>
                  </div>
                </div>
                {/* 연결 해제 버튼 */}
                <button
                  onClick={async () => {
                    if (activeWallet) {
                      await disconnect(activeWallet);
                      setSbmbBalance("0.000");
                    }
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                  title="Disconnect"
                >
                  ✕
                </button>
              </div>
            ) : (
              <ConnectButton
                client={client}
                wallets={[createWallet("io.metamask")]}
                chain={baseSepolia}
                connectButton={{
                  label: "Connect Wallet",
                  className:
                    "!px-6 !py-2 !rounded-lg !font-semibold !bg-teal-500 !text-white hover:!bg-teal-600 !transition-colors",
                }}
              />
            )}

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-teal-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
            >
              <span className="sr-only">메뉴 열기</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/"
                className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-medium"
              >
                Home
              </Link>
              <Link
                href="/collection"
                className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-medium"
              >
                My Collection
              </Link>
              <Link
                href="/mint"
                className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-medium"
              >
                Create Mint
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
