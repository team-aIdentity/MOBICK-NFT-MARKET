# NFT 마켓플레이스 🎨

thirdweb을 사용하여 구축한 현대적인 NFT 마켓플레이스입니다. 사용자는 지갑을 연결하여 NFT를 탐색, 구매, 판매할 수 있습니다.

## 주요 기능

- 🔗 **지갑 연결**: MetaMask, WalletConnect 등 다양한 지갑 지원
- 🖼️ **NFT 탐색**: 아름다운 UI로 NFT 컬렉션 탐색
- 💰 **구매/판매**: 블록체인에서 직접 NFT 거래
- 📱 **반응형 디자인**: 모바일과 데스크톱 모두 지원
- 🎨 **모던 UI**: Tailwind CSS로 구현된 세련된 디자인

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Web3**: thirdweb SDK
- **Blockchain**: Ethereum, Polygon, Base, Arbitrum

## 시작하기

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd choonsimnfttest
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 정보를 추가하세요:

```bash
# .env.local
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here

# 배포된 컨트랙트 주소들
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_ERC20_ADDRESS=0x...
```

### 3. thirdweb 설정

1. [thirdweb 대시보드](https://thirdweb.com/dashboard)에 접속
2. 새 프로젝트 생성
3. Client ID 복사하여 환경 변수에 설정

### 4. 컨트랙트 주소 설정

1. thirdweb에서 배포한 ERC721 NFT 컬렉션 주소를 복사
2. NFT Market v3 마켓플레이스 주소를 복사
3. ERC20 토큰 주소를 복사 (선택사항)
4. ContractIntegration.tsx 파일에서 주소들을 업데이트하거나 환경 변수 사용

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 메인 페이지
│   ├── providers.tsx       # thirdweb Provider 설정
│   └── globals.css         # 글로벌 스타일
└── components/
    ├── Header.tsx          # 헤더 컴포넌트
    ├── Hero.tsx            # 히어로 섹션
    ├── NFTGrid.tsx         # NFT 그리드
    ├── NFTMarketplace.tsx  # 실제 마켓플레이스 기능
    └── Footer.tsx          # 푸터 컴포넌트
```

## 사용 방법

### NFT 탐색

- 메인 페이지에서 다양한 NFT 컬렉션을 탐색할 수 있습니다
- 카테고리별 필터링 기능을 제공합니다

### 지갑 연결

- 상단의 "지갑 연결" 버튼을 클릭하여 MetaMask 등 지갑을 연결합니다
- 연결 후 NFT 구매 및 판매 기능을 사용할 수 있습니다

### NFT 구매

- 원하는 NFT 카드의 "구매하기" 버튼을 클릭합니다
- 지갑에서 거래를 승인하면 구매가 완료됩니다

### NFT 판매

- "내 NFT 판매하기" 섹션에서 NFT 컨트랙트 주소와 토큰 ID를 입력합니다
- 판매 가격을 설정하고 "판매 등록" 버튼을 클릭합니다

## 배포

### Vercel 배포 (권장)

1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 다른 플랫폼

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 주의사항

- 실제 마켓플레이스 컨트랙트 주소를 설정해야 합니다
- 테스트넷에서 먼저 테스트하는 것을 권장합니다
- 가스비를 충분히 확보해두세요

## 라이선스

MIT License

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
