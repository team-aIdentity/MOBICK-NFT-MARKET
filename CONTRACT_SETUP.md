# 컨트랙트 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# thirdweb Client ID (이미 설정됨)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=7bdbc0d84b2e56262e8e603b301e0762

# 배포된 컨트랙트 주소들
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x8105eFcC2EbA928abd7c86199341d111E99ccD7E
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xFf69ecaD8eae2e9177d6e753B566341B3a2dd9cd
NEXT_PUBLIC_ERC20_ADDRESS=0x0F45059bdec805fB2cf530A800168bEFb66fBaDE
```

## 2. thirdweb Client ID 얻기

1. [thirdweb 대시보드](https://thirdweb.com/dashboard)에 접속
2. 새 프로젝트 생성
3. Settings > API Keys에서 Client ID 복사
4. `.env.local` 파일에 추가

## 3. 컨트랙트 주소 설정

### ERC721 NFT 컬렉션 주소

- thirdweb 대시보드에서 배포한 NFT 컬렉션의 주소를 복사
- `NEXT_PUBLIC_NFT_COLLECTION_ADDRESS`에 설정

### NFT Market v3 마켓플레이스 주소

- thirdweb 대시보드에서 배포한 마켓플레이스 컨트랙트 주소를 복사
- `NEXT_PUBLIC_MARKETPLACE_ADDRESS`에 설정

### ERC20 토큰 주소 (선택사항)

- ERC20 토큰을 배포했다면 해당 주소를 복사
- `NEXT_PUBLIC_ERC20_ADDRESS`에 설정

## 4. ContractIntegration.tsx 업데이트

환경 변수를 사용하도록 컴포넌트를 업데이트하세요:

```typescript
const NFT_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS || "0x...";
const MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x...";
const ERC20_ADDRESS = process.env.NEXT_PUBLIC_ERC20_ADDRESS || "0x...";
```

## 5. 개발 서버 실행

```bash
npm run dev
```

## 6. 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 지갑 연결 (MetaMask 등)
3. 컨트랙트 통합 대시보드에서 기능 테스트:
   - NFT 민팅
   - 마켓플레이스에서 NFT 구매
   - 내 NFT 리스팅

## 문제 해결

### Magic Link 오류

현재 Magic Link 관련 의존성 문제가 있습니다. 이는 thirdweb의 일부 기능과 관련된 것으로, 기본 지갑 연결 기능은 정상적으로 작동합니다.

### 컨트랙트 주소 오류

- 주소가 올바른지 확인
- 해당 네트워크(Polygon)에 배포되었는지 확인
- 컨트랙트가 활성화되어 있는지 확인

### 지갑 연결 문제

- MetaMask가 설치되어 있는지 확인
- 올바른 네트워크에 연결되어 있는지 확인
- 충분한 가스비가 있는지 확인
