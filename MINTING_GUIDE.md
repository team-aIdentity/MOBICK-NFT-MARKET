# 🔧 민팅 문제 해결 가이드

## ❌ "Execution Reverted" 에러 해결 방법

### 1️⃣ thirdweb 대시보드에서 권한 추가하기

#### 방법 A: 민터 역할 추가 (권장)

1. **thirdweb 대시보드 접속**: https://thirdweb.com/base-sepolia-testnet/0x6a11ea016398cE10058971ec777073Bbe20770dd
2. **Permissions 탭 클릭**
3. **"Add Member"** 버튼 클릭
4. **Role 선택**: "Minter" 선택
5. **Address 입력**: 현재 사용 중인 지갑 주소 입력
6. **저장** 후 민팅 재시도

#### 방법 B: 컨트랙트 소유자 계정으로 민팅

1. MetaMask에서 컨트랙트 배포 시 사용한 계정으로 전환
2. 민팅 페이지 새로고침
3. 민팅 시도

### 2️⃣ 컨트랙트 일시정지 상태 확인

1. **thirdweb 대시보드 접속**
2. **Settings 탭 클릭**
3. **"Contract Status"** 확인
4. **일시정지 상태면 "Unpause"** 클릭

### 3️⃣ 최대 공급량 확인

1. **thirdweb 대시보드 접속**
2. **Settings 탭 클릭**
3. **"Max Supply" 확인**
4. **현재 공급량이 최대치에 도달했는지 확인**
5. **필요시 maxSupply 증가**

---

## 🔍 브라우저 콘솔 확인 방법

1. **브라우저 개발자 도구 열기**: `F12` 또는 `Cmd+Option+I`
2. **Console 탭 선택**
3. **다음 로그 확인**:
   ```
   📊 컨트랙트 진단 결과: {
     paused: false/true,
     owner: "0x...",
     isOwner: false/true,
     hasMinterRole: false/true,
     maxSupply: "...",
     totalSupply: "...",
     isMaxSupplyReached: false/true
   }
   ```

---

## ✅ 권한 확인 체크리스트

- [ ] 현재 계정이 컨트랙트 소유자인가?
- [ ] 현재 계정이 민터 역할을 가지고 있는가?
- [ ] 컨트랙트가 일시정지 상태가 아닌가?
- [ ] 최대 공급량에 도달하지 않았는가?
- [ ] Base Sepolia 네트워크에 연결되어 있는가?
- [ ] 가스비(ETH)가 충분한가?

---

## 🚀 빠른 해결 방법

### 방법 1: thirdweb CLI로 민터 추가

```bash
npx thirdweb@latest deploy
```

1. 컨트랙트 주소 선택: `0x6a11ea016398cE10058971ec777073Bbe20770dd`
2. "Permissions" 메뉴 선택
3. "Grant Minter Role" 선택
4. 현재 지갑 주소 입력

### 방법 2: Etherscan에서 직접 권한 추가

1. **Base Sepolia Etherscan 접속**: https://sepolia.basescan.org/address/0x6a11ea016398cE10058971ec777073Bbe20770dd
2. **"Contract" 탭 → "Write Contract"** 클릭
3. **"Connect Wallet"** (컨트랙트 소유자 계정으로)
4. **`grantRole` 함수 찾기**
5. **Parameters 입력**:
   - `role`: `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6`
   - `account`: `민터로 추가할 지갑 주소`
6. **"Write"** 클릭하여 트랜잭션 전송

### 방법 3: 새 컨트랙트 배포

현재 컨트랙트에 권한 문제가 계속되면:

1. thirdweb 대시보드에서 새 NFT Collection 배포
2. `.env.local` 파일의 `NEXT_PUBLIC_NFT_COLLECTION_ADDRESS` 업데이트
3. 배포 시 사용한 계정으로 민팅 시도

---

## 📞 추가 지원

여전히 문제가 해결되지 않으면 다음 정보를 제공해주세요:

1. 브라우저 콘솔의 "📊 컨트랙트 진단 결과" 전체 내용
2. 현재 사용 중인 지갑 주소
3. 컨트랙트 배포 시 사용한 지갑 주소
