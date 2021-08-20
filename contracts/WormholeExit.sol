pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "contracts/AvatarNFT.sol";

contract WormholeExit {
    using Counters for Counters.Counter;
        
    mapping (address => address) avatars;
    mapping (address => address) avatarsReverse;
    
    Counters.Counter private idSequence;
    address payable public immutable relay;

    event ExitReq(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner);
    event PortalExec(uint256 _reqId, address _nft, uint256 _nftId, string _tokenURI, address _oldOwner);
    event AvatarExec(uint256 _reqId, address _nft, address _avatar);
    
    modifier onlyRelay() {
        require(msg.sender == relay);
        _;
    }
    
    constructor(address _relay) {
        relay = payable(_relay);
    }

    function portalExec(uint256 _reqId, address _nft, uint256 _nftId, string memory _tokenURI, address _oldOwner) public {
        require(avatars[_nft] != address(0), "No avatar created");

        AvatarNFT avatar = AvatarNFT(avatars[_nft]);

        avatar.mint(_oldOwner, _nftId, _tokenURI);
        
        emit PortalExec(_reqId, _nft, _nftId, _tokenURI, _oldOwner);
    }

    function exitReq(address _avatar, uint256 _nftId) public {
        address nft = avatarsReverse[_avatar];
        require(nft != address(0), "No avatar existed");
        
        AvatarNFT avatar = AvatarNFT(_avatar);
        address owner = avatar.ownerOf(_nftId);
        
        require(owner == msg.sender, "Canexit only owned tokens");
        
        avatar.burn(_nftId);
        
        emit ExitReq(incrementAndGet(), nft, _nftId, owner);
    }
    
    function createAvatarExec(uint256 _reqId, address _nft, string memory _name, string memory _symbol) public onlyRelay {
        require(avatars[_nft] == address(0), "Avatar already created");
        
        AvatarNFT avatar = new AvatarNFT(_name, bytes(_symbol).length > 0 ? string(abi.encodePacked("a", _symbol)) : "");
        avatars[_nft] = address(avatar);
        avatarsReverse[address(avatar)] = _nft;
        
        emit AvatarExec(_reqId, _nft, address(avatar));
    }
    
    function incrementAndGet() internal returns (uint256) {
        idSequence.increment();
        return idSequence.current();
    }
    
}