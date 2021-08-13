pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Limbo is IERC721Receiver {
    using Address for address;
    using Counters for Counters.Counter;

    mapping (uint256 => Auction) auctions;
    address payable public immutable owner;

    Counters.Counter private idSequence;

    struct Auction {
        uint256 auctionID;
        uint256 nftId;
        address nftContract;
        address payable borrower;

        bool isRunning;
        uint256 amountRepaid;
        uint256 duration;
        
        uint256 lowestPrice; //минимальная цена лота (def: ???, может быть 0)
        uint256 apy;       //ставка финансирования (def: AAVE.rate + %)
        uint256 tenor;       //срок на который происходит займ (def: 30/60/90 дней)
    }

    struct Bid {
        uint256 auctionID;
        uint256 price;
        address payable bidder;

    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    event CreatedNewAuction(address _contractId, address _owner, uint256 _tokenId);
    event StartedNewAuction(uint256 _auctionID, address _owner, uint256 _lowestPrice, uint256 _apy, uint256 _tenor);
    event NewHighestBid(uint256 _auctionID, address _bidder, uint256 _amount);
    event LoanRepaid(uint256 _auctionID, uint256 _amount);
    event LoanLiquidated(uint256 _auctionID);

    constructor(address _owner) {
        owner = payable(_owner);
    }

    function create(address _contractId, address _owner, uint256 _tokenId) internal {
        idSequence.increment();
        uint256 id = idSequence.current();
        
        auctions[id] = Auction(id, _tokenId, _contractId, payable(_owner), false, 0, 0, 0, 0, 0);
        emit CreatedNewAuction(_contractId, _owner, _tokenId);
    }

    function start(uint256 _auctionID, address _owner, uint256 _lowestPrice, uint256 _apy, uint256 _tenor) public {
        Auction memory a = auctions[_auctionID];
        
        require (a.nftContract != address(0), "No auction is found");
        
        IERC721 token = IERC721(a.nftContract);
        require(token.ownerOf(a.nftId) == address(this), "NFT is not transfered yet"); 
        
        a.lowestPrice = _lowestPrice;
        a.apy = _apy;
        a.tenor = _tenor;
        a.duration = 10000;
        a.isRunning = true;
        
        emit StartedNewAuction(_auctionID, _owner, _lowestPrice, _apy, _tenor);
    }

    function bid(uint _auctionID, uint _price) public payable {

        emit NewHighestBid(_auctionID, msg.sender, _price);
    }

    function repay(uint _auctionID) public payable {
        emit LoanRepaid(_auctionID, msg.value);
    }

    function liquidate(uint _auctionID) public {
        emit LoanLiquidated(_auctionID);
    }

    function stopAuction() public onlyOwner {

    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4) {
        require(msg.sender.isContract(), "Should be contract");

        IERC721 token = IERC721(msg.sender);
        require(token.supportsInterface(type(IERC721).interfaceId), "Should support IERC721 interface");

        create(msg.sender, from, tokenId);

        return 0x150b7a02;
    }
}