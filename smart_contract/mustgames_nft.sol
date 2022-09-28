// SPDX-License-Identifier:MIT
pragma solidity ^0.8.7;

// 오픈 재플린 라이브러리 
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

//ERC721 : 중복이 되지 않는 token id 값을 생성(순차토큰 발행순 +1 (x))  
contract MinNftToken is ERC721Enumerable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // 생성자, 변수 2개를 받아서 이름과 심볼 생성
    constructor() ERC721("iki", "jquery_symbol"){} // 고정 생성
    // constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {} 
    
    mapping(uint => string) public tokenURIs; // uint형 숫자를 받으면 string 리턴

    // ERC721 spec에 있는 함수여서 override 해야함.
    function tokenURI(uint _tokenId) override public view returns(string memory) {
        return tokenURIs[_tokenId]; 
    }

    // minting 함수
    function mintNFT(string memory _tokenURI) public returns (uint256) {
        _tokenIds.increment();// token id는 호출 될 때마다 가 증가 되어야 함.
        
        uint256 tokenId = _tokenIds.current(); // 현재 값으로 id 생성
        tokenURIs[tokenId] = _tokenURI; // mapping에 현재 id로 토큰(민팅 URI 할당)

        _mint(msg.sender, tokenId); // 민팅함수 사용. msg.sender : 메타 마스크를 이용하여 민팅한 계좌주소.(owner), 민팅 아이디 사용

        return tokenId;        
    }


    struct NftTokenData {
        uint256 nftTokenId;
        string  nftTokenURI;
        uint price ;        
    }

    function getNftTokens(address _nftTokenOwner) view public returns (NftTokenData[] memory) {
        uint256 balanceLength = balanceOf(_nftTokenOwner); // balanceOf : 지갑의 주소를 이용해서 해당 owner가 몇개의 토큰(민팅 이미지)를 가지고 있는지 확인 가능
        // require(balanceLength != 0, "Owner did not have token."); // 값이 없을 때 처리

        NftTokenData[] memory nftTokenData = new NftTokenData[](balanceLength);
        for(uint256 i = 0; i < balanceLength; i++) {
            uint256 nftTokenId = tokenOfOwnerByIndex(_nftTokenOwner, i);
            string memory nftTokenURI = tokenURI(nftTokenId);
            uint tokenPrice = getNftTokenPrice(nftTokenId);
            nftTokenData[i] = NftTokenData(nftTokenId, nftTokenURI, tokenPrice);
        }
        return nftTokenData;
    }

    //판매 등록
    mapping(uint256 => uint256) public nftTokenPrices;
    uint256[] public onSaleNftTokenArray;

    function setSaleNftToken(uint256 _tokenId, uint256 _price) public {
        address nftTokenOwner = ownerOf(_tokenId);

        require(nftTokenOwner == msg.sender, "Caller is not nft token owner.");
        require(_price > 0, "Price is zero or lower.");
        require(nftTokenPrices[_tokenId] == 0, "This nft token is already on sale.");
        require(isApprovedForAll(nftTokenOwner, address(this)), "nft token owner did not approve token.");

        nftTokenPrices[_tokenId] = _price;
        onSaleNftTokenArray.push(_tokenId); //판매중인 nft list

    }

    // 판매리스트
    function getSaleNftTokens() public view returns (NftTokenData[] memory ){
        uint[] memory onSaleNftToken = getSaleNftToken();
        NftTokenData[] memory onSaleNftTokens = new NftTokenData[](onSaleNftToken.length);

        for(uint i = 0; i < onSaleNftToken.length; i ++){
            uint tokenId = onSaleNftToken[i];
            uint tokenPrice = getNftTokenPrice(tokenId);
            onSaleNftTokens[i] = NftTokenData(tokenId, tokenURI(tokenId), tokenPrice) ;
        }

        return onSaleNftTokens;

    }


    function getSaleNftToken() view public returns (uint[] memory ){
        return onSaleNftTokenArray ;
    }


    function getNftTokenPrice(uint256 _tokenId) view public returns(uint256){
        return nftTokenPrices[_tokenId];
    }

    //구매함수
    function buyNftToken(uint256 _tokenId) public payable {
        uint256 price = nftTokenPrices[_tokenId];
        address nftTokenOwner = ownerOf(_tokenId);

        require(price > 0, "nft token not sale.");
        require(price  <= msg.value, "caller sent lower than price.");
        require(nftTokenOwner != msg.sender,"caller is nft token owner.");
        require(isApprovedForAll(nftTokenOwner, address(this)), "nft token owner did not approve token.");


        payable(nftTokenOwner).transfer(msg.value);

        IERC721(address(this)).safeTransferFrom(nftTokenOwner, msg.sender, _tokenId); // IERC721(Contract address)


        //판매 리스트에서 삭제
        removeToken(_tokenId);        

    }

    function burn( uint256 _tokenId) public{
        address addr_owner = ownerOf(_tokenId); 
        require( addr_owner == msg.sender, "msg.sender is not the owner of the token"); // 오너만 지울 수 있도록
        _burn(_tokenId); // 토큰(민팅 이미지)삭제
        removeToken(_tokenId); // 판매 리스트에서도 삭제
    }

    function removeToken(uint256 _tokenId) private {
                
        nftTokenPrices[_tokenId] = 0; // 금액을 0으로 업데이트

        for(uint256 i = 0; i<onSaleNftTokenArray.length; i ++){
            if(nftTokenPrices[onSaleNftTokenArray[i]] ==0){ // 금액이 0일 것을 찾음
                onSaleNftTokenArray[i] = onSaleNftTokenArray[onSaleNftTokenArray.length -1] ; // 0인 것을 마지막으로 이동
                onSaleNftTokenArray.pop(); // 마지막 값을 제거
            }
        }
    }   
}

// * 초기화 시 아래 호출 필요
// setApprovalForAll = contract address / true
