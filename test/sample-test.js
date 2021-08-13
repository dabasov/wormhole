const { expect } = require("chai");

let limbo;
let sender;
let nft;
let test;
let owner;
let addrs;

// `beforeEach` will run before each test, re-deploying the contract every
// time. It receives a callback, which can be async.
beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    let Limbo = await ethers.getContractFactory("Limbo");
    let TestNFT = await ethers.getContractFactory("TestNFT");
    [sender, test, owner, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    limbo = await Limbo.deploy(owner.address);
    nft = await TestNFT.deploy("Gagarin", "GG");
    await limbo.deployed();
});

describe("Limbo", function () {
    it("Revert on start auction not from NFT", async function () {

        await expect(limbo.onERC721Received(nft.address, sender.address, 7, []))
            .to.be.revertedWith("Should be contract");

    });

    it("Should emit start auction on NFT transfer", async function () {

        await nft.mint(owner.address, 1);
        let receipt = await nft.connect(owner)['safeTransferFrom(address,address,uint256)'](owner.address, limbo.address, 1);

        await expect(receipt)
            .to.emit(limbo, 'CreatedNewAuction')
            .withArgs(nft.address, owner.address, 1);
    });

    it("Revert on not belonging nft auction start", async function () {

        await nft.mint(owner.address, 1);
        await nft.connect(owner).forwardToReceiver(limbo.address, 1);

        await expect(limbo.start(1, owner.address, 100, 10, 60))
            .to.be.revertedWith("NFT is not transfered yet'");
    });

    it("Revert not found auction", async function () {

        await nft.mint(owner.address, 1);
        await nft.connect(owner).forwardToReceiver(limbo.address, 1);

        await expect(limbo.start(2, owner.address, 100, 10, 60))
            .to.be.revertedWith("No auction is found");
    });


    it("Start auction", async function () {

        await nft.mint(owner.address, 1);
        await nft.connect(owner)['safeTransferFrom(address,address,uint256)'](owner.address, limbo.address, 1);
        let receipt = await limbo.connect(owner).start(1, owner.address, 100, 10, 60);

       await expect(receipt)
            .to.emit(limbo, 'StartedNewAuction')
            .withArgs(1, owner.address, 100, 10, 60);
    });
});
