'use strict';
let accounts, approvalState, imageFile, mintingEvent

(async () => {
    if (web3) {
        document.getElementById('resultbrowsers').textContent = 'web3 활성화 확인'
        if (web3.currentProvider.isMetaMask) {
            document.getElementById('resultbrowsers').textContent = 'metamask 활성화 확인'
            try {
                accounts = await ethereum.request({
                    method: "eth_requestAccounts"
                })
                document.getElementById('showAccount').textContent = ` ${accounts}`

                //web3
                window.web3 = new Web3(window.ethereum);

                mintingEvent = await new window.web3.eth.Contract(
                    abiobj,
                    contractAddress
                )

                //승인 상태조회
                getApprovalState()

                // 거래상태 변경하기
                // 거래상태 변경하기
                document.getElementById('btn_setApprovalForAll').addEventListener('click', setApprovalState)

                // 판매 등록 된 nft token list 호출
                getSaleNftList()
                
                // 상세보기 모달 창 데이터 업데이트
                $('#detailModal').on('show.bs.modal', setDetailModal)
                
            } catch (error) {
                document.getElementById('resultbrowsers').textContent = `메타마스크 로그인 필요 또는 스마트 컨트랙 상태 확인 필요 : ${error}`
            }
        } else {
            document.getElementById('resultbrowsers').textContent = '메타마스크 사용 불가'
        }
    } else {
        document.getElementById('resultbrowsers').textContent = 'web3를 찾을 수 없습니다.'
    }
})()

async function getApprovalState() {
    try {
        document.getElementById('resultbrowsers').textContent = `거래 승인 상태를 조회 중입니다.`
        console.log('거래 승인 상태를 조회')
        approvalState = await mintingEvent.methods.isApprovedForAll(accounts[0], contractAddress).call();
        console.log(`거래 승인 상태: ${approvalState}`)
        document.getElementById('btn_setApprovalForAll').textContent = approvalState ? "거래상태 : 거래가능" : "거래상태 : 거래중지"
        document.getElementById('resultbrowsers').textContent = `거래 승인 상태 조회를 완료하였습니다.`
    } catch (err) {
        document.getElementById('resultbrowsers').textContent = `거래 상태를 가져오는데 실패 하였습니다. \n${error}`

    }
}

async function setApprovalState() {
    try {
        document.getElementById('btn_setApprovalForAll').textContent = "변경 중"
        document.getElementById('resultbrowsers').textContent = "거래상태를 변경 중입니다."
        approvalState = !approvalState
        let result = await mintingEvent.methods.setApprovalForAll(contractAddress, approvalState).send({ from: accounts[0] })
        document.getElementById('resultbrowsers').textContent = `거래상태 변경을 완료하였습니다. ${result}`
        location.reload()
    } catch (err) {
        console.error("err:", err)
    }
}

async function getSaleNftList() {
    try {
        document.getElementById('resultbrowsers').textContent = `NFT 판매 목록을 조회 중입니다.`
        console.log('NFT 판매 목록을 조회 중입니다.')
        let nftList = await mintingEvent.methods.getSaleNftTokens().call()
        console.log('NFT 판매 목록 : ', nftList)
        document.getElementById('resultbrowsers').textContent = `NFT 판매 목록을 조회를 완료하였습니다.`

        let cnt = 1        
        nftList.map(async nft => {            
            try {                
                let nftInfo = ((await axios.get(`http://localhost:${proccess.env.PORT}/storage/read-metadata?key=${nft.nftTokenURI}`))).data                
                let htmlTag =
                    `<td>${cnt++}</td>
                        <td>${nft.nftTokenId}</td>
                        <td>${nftInfo.uploader}</td>
                        <td><img src=${nftInfo.image} width=100px/></td>
                        <td>${nft.price}</td>
                        <td>
                            <button type="button" class="btn btn-primary btn_float" data-bs-toggle="modal" data-bs-target="#detailModal" data-bs-param='${JSON.stringify(nftInfo)}'>상세보기</button>
                            <button type="button" class="btn btn-success btn_buy" data-bs-toggle="modal" onclick='buyNft(${nft.nftTokenId},${nft.price})'>구매하기</button>
                    </td>`                    
                let ele = document.createElement('tr')
                ele.id = nft.nftTokenId
                ele.innerHTML = htmlTag
                document.getElementById('dynamicTbody').append(ele)                                
            } catch (err) {
                console.error(err)
            }
        })

    } catch (err) {
        document.getElementById('resultbrowsers').textContent = `NFT 판매 목록을 조회를 실패하였습니다.`
        console.error(`NFT 판매 목록을 조회 : ${err}`)
    }
}

function setDetailModal(event){
    let nftInfo = JSON.parse(event.relatedTarget.getAttribute('data-bs-param'))                            
    document.getElementById('uploader').textContent = nftInfo.uploader
    document.getElementById('imgurl').setAttribute('src',`${nftInfo.image}`)
    document.getElementById('category').textContent = nftInfo.attributes[0].value
    document.getElementById('description').textContent = nftInfo.description
}

async function buyNft(nftTokenId,price) {
    let ownerAddress = await mintingEvent.methods.ownerOf(nftTokenId).call();
    console.log(ownerAddress.toLowerCase(), accounts[0]);

    if (ownerAddress.toLowerCase() == accounts[0]) {
        alert("제품 소유자는 구매할 수 없습니다.");        
    } else if (!approvalState) {
        alert("판매승인 상태를 변경하세요");        
    } else {
        let receiptObj = await mintingEvent.methods.buyNftToken(nftTokenId).send({ from: accounts[0], value: price });
        console.log(receiptObj);
        location.reload();
    }
}