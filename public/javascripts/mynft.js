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
                document.getElementById('btn_setApprovalForAll').addEventListener('click', setApprovalState)

                // nft token list 호출
                getNftList()
                
                // 상세보기 모달 창 데이터 업데이트
                $('#detailModal').on('show.bs.modal', setDetailModal)

                // 판매하기 모달 창 데이터 업데이트
                $('#saleModal').on('show.bs.modal', setSaleModal)
                

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
function setNetwork() {
    let selectNetwork = document.getElementById('selectNetwork')
    let blockChainNetwork = selectNetwork.options[selectNetwork.selectedIndex].value        
    if (!blockChainNetwork) {
        alert("네트워크를 선택해주세요!");
      } else {
        localStorage["blockChainNetwork"] = blockChainNetwork;
      }
}

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

async function getNftList() {
    try {
        document.getElementById('resultbrowsers').textContent = `NFT 목록을 조회 중입니다.`
        console.log('NFT 목록을 조회 중입니다.')
        let nftList = await mintingEvent.methods.getNftTokens(accounts[0]).call()
        console.log('NFT 목록 : ', nftList)
        document.getElementById('resultbrowsers').textContent = `NFT 목록을 조회를 완료하였습니다.`

        let cnt = 1        
        nftList.map(async nft => {            
            try {                
                let nftInfo = ((await axios({
                    method:'get',
                    url:`http://localhost:5501/storage/read-metadata`,
                    params: {
                        key : nft.nftTokenURI
                    }
                }))).data                
                let htmlTag =
                    `<td>${cnt++}</td>
                        <td>${nft.nftTokenId}</td>
                        <td>${nftInfo.uploader}</td>
                        <td><img src=${nftInfo.image} width=100px/></td>
                        <td>${nft.price}</td>
                        <td>
                            <button type="button" class="btn btn-primary btn_float" data-bs-toggle="modal" data-bs-target="#detailModal" data-bs-param='${JSON.stringify(nftInfo)}'>상세보기</button>
                            <button type="button" class="btn btn-success btn_sale" data-bs-toggle="modal" data-bs-target="#saleModal" data-bs-param='${nft.nftTokenId}'>판매하기</button>
                            <button type="button" class="btn btn-danger btn_burn" data-val="${nft.nftTokenId}" onclick='deleteNft(${nft.nftTokenId})'>삭제하기</button>
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
        document.getElementById('resultbrowsers').textContent = `NFT 목록을 조회를 실패하였습니다.`
        console.error(`NFT 목록을 조회 : ${err}`)
    }
}

function setDetailModal(event){
    let nftInfo = JSON.parse(event.relatedTarget.getAttribute('data-bs-param'))                            
    document.getElementById('uploader').textContent = nftInfo.uploader
    document.getElementById('imgurl').setAttribute('src',`${nftInfo.image}`)
    document.getElementById('category').textContent = nftInfo.attributes[0].value
    document.getElementById('description').textContent = nftInfo.description
}

function setSaleModal(event) {
    let tokenId = JSON.parse(event.relatedTarget.getAttribute('data-bs-param'))                            
    document.querySelector('.btn_onSaleSubmit').addEventListener('click', async () => {
        let price = document.getElementById('price').value
        let ownerAddress = await mintingEvent.methods.ownerOf(tokenId).call()
        console.log(`NFT Owner Address : ${ownerAddress}`)
        console.log(`input price : ${price}`)
        console.log(`login account : ${accounts[0]}`)
        if(ownerAddress.toLowerCase() != accounts[0]) {
            alert("제품 소유자만 판매등록할 수 있습니다.")
            return
        }

        if (!approvalState) {
            alert("판매승인 상태를 변경하세요");
            return
        }
        let receiptObj = await mintingEvent.methods.setSaleNftToken(tokenId, price).send({ from: accounts[0], gas: 3000000 });
        console.log(receiptObj);

        location.reload();
    })
}

async function deleteNft(nftTokenId){
    if (confirm('삭제하시면 복구할수 없습니다. \n 정말로 삭제하시겠습니까??')) {		
		var receiptObj = await mintingEvent.methods.burn(nftTokenId).send({ from: accounts[0] })
		console.log(receiptObj)

        document.getElementById(nftTokenId).remove()
	}
}