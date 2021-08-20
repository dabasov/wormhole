pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract WormholeEntrance is IERC721Receiver {
    using Counters for Counters.Counter;
    Counters.Counter private idSequence;
    
    mapping (address => uint256) nfts;
    mapping (uint256 => uint256) networks; //supported networks

    address payable public immutable relay;

    event PortalReq(uint256 _reqId, uint256 _networkId, address _nft, uint256 _nftId, string _tokenURI, address _oldOwner);
    event AvatarReq(uint256 _reqId, uint256 _networkId, address _nft, string _name, string _symbol);

    event ExitExec(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner);

    modifier onlyRelay() {
        require(msg.sender == relay);
        _;
    }
    
    modifier supported(address _nft) {
        require(nfts[_nft] == 1, "Contract not supported");
        _;
    }
        
    modifier supportedNetwork(uint256 _networkId) {
        require(networks[_networkId] == 1, "Network not supported");
        _;
    }
    
    constructor(address _relay, address[] memory _nfts, uint256[] memory _networks) {
        relay = payable(_relay);
        
        for(uint i=0; i<_nfts.length; i++){
            nfts[_nfts[i]] = 1;
        }
        
        for(uint i=0; i<_networks.length; i++){
            networks[_networks[i]] = 1;
        }
    }

    function portal(address _nft, uint256 _id, uint256 _networkId) public 
                                    supported(_nft) supportedNetwork(_networkId) {
        IERC721 nft = IERC721(_nft);
        require(nft.ownerOf(_id) == msg.sender, "Only nft owner can portal");
                
        nft.safeTransferFrom(msg.sender, address(this), _id, "");
        
        string memory tokenURI = "";
        IERC165 token = IERC165(_nft);
        if (token.supportsInterface(type(IERC721Metadata).interfaceId)) {
            IERC721Metadata metadata = IERC721Metadata(_nft);
            tokenURI = metadata.tokenURI(_id);
        }
        
        emit PortalReq(incrementAndGet(), _networkId, _nft, _id, tokenURI, msg.sender);
    }

    //ExitReq(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner);
    function exitExec(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner) public onlyRelay supported(_nft) {
                
        IERC721 nft = IERC721(_nft);
        address owner = nft.ownerOf(_nftId);
        require(owner == address(this), "Can't exit not portalled token");
        
        nft.safeTransferFrom(address(this), _newOwner, _nftId, "");
        
        emit ExitExec(_reqId, _nft, _nftId, _newOwner);
    }
    
    function createAvatar(address _nft, uint256 _networkId) public onlyRelay  supportedNetwork(_networkId) {
        require(nfts[_nft] == 0, "Avatar already created");

        IERC165 token = IERC165(_nft);
            require(token.supportsInterface(type(IERC721).interfaceId), "Should support IERC721 interface");
        
        string memory name = "";
        string memory symbol = "";
        if (token.supportsInterface(type(IERC721Metadata).interfaceId)) {
            IERC721Metadata metadata = IERC721Metadata(_nft);
            name = metadata.name();
            symbol = metadata.symbol();
        }
        
        nfts[_nft] = 1;
        
        emit AvatarReq(incrementAndGet(), _networkId, _nft, name, symbol);
    }    

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4) {
        require(nfts[msg.sender] == 1, "Should be supported token");
        
        IERC165 token = IERC165(msg.sender);
        require(token.supportsInterface(type(IERC721).interfaceId), "Should support IERC721 interface");

        return 0x150b7a02;
    }
    
    function incrementAndGet() internal returns (uint256) {
        idSequence.increment();
        return idSequence.current();
    }
}