'use strict';

const READER = new FileReader()
const IPFS_URL = "https://ipfs.io/ipfs/"
const IPFS_API_URL = "ipfs.infura.io"
const ipfs = window.IpfsApi(IPFS_API_URL, "5001", { protocol: "https" }) // Connect to IPFS
const MODE = 'S3' // S3 or IPFS
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

                document.getElementById('uploadfile').addEventListener('change', handleSelected)

                //승인 상태조회
                getApprovalState()

                // 거래상태 변경하기
                document.getElementById('btn_setApprovalForAll').addEventListener('click', setApprovalState)

            } catch (error) {
                console.error(`error msg: ${error}`);
                document.getElementById('resultbrowsers').textContent = '메타마스크 로그인 필요 또는 스마트 컨트랙 상태 확인 필요'
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
        document.getElementById('resultbrowsers').textContent = `거래 상태를 가져오는데 실패 하였습니다. \n${err}`

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

function handleEvent(event) {    
    document.querySelector('.event-log').textContent = document.querySelector('.event-log').textContent + `${event.type}: ${event.loaded} bytes transferred\n`;    
    if (event.type === "load") {        
        document.querySelector('.preview').setAttribute('src', READER.result);
    }

}
function addListeners(reader) {
    reader.addEventListener('loadstart', handleEvent);
    reader.addEventListener('load', handleEvent);
    reader.addEventListener('loadend', handleEvent);
    reader.addEventListener('progress', handleEvent);
    reader.addEventListener('error', handleEvent);
    reader.addEventListener('abort', handleEvent);
}

function handleSelected(e) {    
    document.querySelector('.event-log').textContent = '';
    const selectedFile = document.getElementById('uploadfile').files[0]    
    if (selectedFile) {
        addListeners(READER)
        READER.readAsDataURL(selectedFile)                
    }
}

function uploadIPFS() {
    if (document.getElementById('uploadfile').value == "") {
        alert('민팅 할 이미지를 선택해 주세요')
        document.getElementById('uploadfile').focus()
    } else {
        let formdata = new FormData()
        const file = document.getElementById('uploadfile')     
        
        formdata.append("file", file.files[0])        
        formdata.append("fileName", file.files[0].name)
        axios.post('/ipfs/upload/file', formdata, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })
        .then (res => {            
            if(res.status  == 200 && res.data.hash) {
                document.getElementById('ipfs_file_url').textContent = res.data.imgURL
               logPrint(`ipfs file url : ${res.data.hash}`)
            }            
        })
        .catch(err => {
            console.error(err)
        })        
    }
}

function uploadS3() {
    if (document.getElementById('uploadfile').value == "") {
        alert('민팅 할 이미지를 선택해 주세요')
        document.getElementById('uploadfile').focus()
    } else {
        let formdata = new FormData()
        const file = document.getElementById('uploadfile')     
        
        formdata.append("uploadfile", file.files[0])        
        
        axios.post('http://13.125.100.97/storage/upload-image', formdata, {
            headers: {
                "Content-Type": "multipart/form-data;charset=UTF-8"
            }
        })
        .then (res => {                        
            document.getElementById('s3_file_url').textContent = res.data.location
           logPrint(`[Successfully uploading image to s3]`)
            Object.keys(res.data).map(key => {
               logPrint(`${key} : ${res.data[key]}`,1)
            })            
        })
        .catch(err => {
            console.error(err)
        })        
    }
}

function minting() {
    document.getElementById('bnt_mint').textContent = '민팅 중(메타마스크에서 서명하세요)'
    document.getElementById('bnt_mint').disabled = true
    let uploader = document.getElementById('uploader').value
    let img_url = MODE == 'IPFS' ? document.getElementById('ipfs_file_url').textContent : document.getElementById('s3_file_url').textContent   
    let description = document.getElementById('description').value
    let category = document.getElementById('category')
    let category_val = category.options[category.selectedIndex].value
    
    if (!localStorage.getItem("blockChainNetwork")) {
        alert("네트워크를 선택해주세요!");
        return false;
    }
    if (uploader == "") {
        alert("발행자를 입력해주세요");
        $("#name").focus();
        return false;
    }
    
    if (!img_url) {
        alert("대표이미지를 업로드해주세요");
        $("#uploadfile").focus();
        return false;
    }

    if (!category_val) {
        alert("카테고리를 선택하세요!");
        $("#category").focus();
        return false;
    }

    if (description == "") {
        alert("description을 입력해주세요");
        $("#description").focus();
        return false;
    }
    let metadata = {
        uploader,
        attributes: [{
            trait_type: "category", value: category_val
        }],
        description,
        image: img_url
    }
    
    axios({
        url : '/storage/upload-metadata',
        method: 'post',        
        data : metadata
    })
    .then (res => {            
        if(res.status  == 201) {      
            if(MODE == 'IPFS') {
               logPrint(`image Hash : ${document.getElementById('ipfs_file_url').textContent} \nipfs meta url : ${res.data.metaURL}`)
            }else {
               logPrint(`[Successfully uploading metadata to s3]`)
                Object.keys(res.data).map(key => {
                   logPrint(`${key} : ${res.data[key]}`,1)
                })                
            }            
            setMint(res.data.key)            
        }else {
           logPrint(`[failed uploading metadata to s3]`)
        }            
    })
    .catch(err => {
       logPrint(`[failed uploading metadata to s3] : ${err}`)        
    })  
}

async function setMint(metaURL) {    
    if (mintingEvent != null) {
        try {
            var accounts = await web3.eth.getAccounts();
            console.log("accounts : ", accounts)
            var receiptObj = await mintingEvent.methods.mintNFT(metaURL).send({ from: accounts[0] });

            console.log("receiptObj : ", receiptObj);
           logPrint(`[민팅완료]\t${JSON.stringify(receiptObj)}`)
        } catch (error) {
            console.log(error);
           logPrint(`[민팅실패]\t${JSON.stringify(error)}`)
        }
        document.getElementById('bnt_mint').textContent = '민팅 하기'
        document.getElementById('bnt_mint').disabled = false
    }
}

function logPrint(msg, depth = 0){
    let indent = ''
    for(let i = 0; i < depth; i ++){
        indent += '\t'
    }
    document.getElementById('resultbox').textContent += `\n${indent}${msg}`
}
// html script 로드 후 실행
window.addEventListener('DOMContentLoaded', function () {
    console.log("DOMContentLoaded")
})
// 모두 로드 된 후 실행
window.onload = () => {
    console.log("window.onload")
}
