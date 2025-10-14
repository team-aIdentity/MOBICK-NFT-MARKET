# 민팅 간소화 완료!

## ✅ 변경 내용

### 1. 성공한 민팅 방법

- **thirdweb v5 mintTo (nft 객체)**
- NFT Collection 타입 전용

### 2. 제거된 부분

- ❌ 방법 2: lazyMint + claim (NFT Drop 전용)
- ❌ 방법 3: mintTo(address to, string uri)
- ❌ 방법 4: safeMint
- ❌ 방법 5: mintWithSignature
- ❌ 방법 6: mint(address to, uint256 amount)

### 3. 메타데이터 개선

```javascript
const nftMetadata = {
  name: formData.name,
  description: formData.description,
  image: imageUrl, // IPFS URL (ipfs://...)
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
```

### 4. 현재 상태

- ✅ 민팅 성공
- ⚠️ 메타데이터/이미지 반영 안됨 (다음 단계에서 해결 필요)

## 🔧 다음 단계: 메타데이터 문제 해결

### 문제

- 이미지가 제대로 표시되지 않음
- 메타데이터가 반영되지 않음

### 원인 가능성

1. **이미지 URL이 HTTP로 변환되지 않음**

   - IPFS URL (`ipfs://...`)을 직접 전달
   - 브라우저가 IPFS URL을 직접 읽을 수 없음

2. **Pinata Gateway 사용 필요**

   - `ipfs://QmHash` → `https://gray-famous-lemming-869.mypinata.cloud/ipfs/QmHash`

3. **thirdweb가 자동으로 IPFS 업로드**
   - thirdweb v5의 `mintTo`는 자동으로 메타데이터를 IPFS에 업로드
   - 하지만 우리가 이미 업로드한 이미지 URL을 사용하지 못할 수 있음

### 해결 방법

#### 옵션 1: 이미지 URL을 HTTP Gateway로 변환

```javascript
let finalImageUrl = imageUrl;
if (imageUrl.startsWith("ipfs://")) {
  const ipfsHash = imageUrl.replace("ipfs://", "");
  finalImageUrl = `https://gray-famous-lemming-869.mypinata.cloud/ipfs/${ipfsHash}`;
}

const nftMetadata = {
  name: formData.name,
  description: formData.description,
  image: finalImageUrl, // HTTP URL로 변환
  attributes: [...],
};
```

#### 옵션 2: File 객체를 직접 전달

```javascript
const nftMetadata = {
  name: formData.name,
  description: formData.description,
  image: formData.file, // File 객체 직접 전달
  attributes: [...],
};
```

#### 옵션 3: 업로드된 tokenURI를 사용 (수동 방식)

```javascript
// Pinata에 메타데이터 업로드 (기존 코드 유지)
const tokenURI = await uploadMetadataToPinata(metadata);

// 수동으로 mintTo 호출
const mintToTransaction = prepareContractCall({
  contract: nftContract,
  method: "function mintTo(address to, string memory uri) returns (uint256)",
  params: [connectedAddress, tokenURI],
});
```

## 📋 추천 해결책

**옵션 2를 시도해보세요!**

- thirdweb가 자동으로 파일을 업로드하고 메타데이터를 생성
- 가장 간단하고 확실한 방법
