const { expect } = require("chai");

let entrance;
let exit;
let nft;
let nft2;
let erc20;

let sender, test, relay, owner;

// `beforeEach` will run before each test, re-deploying the contract every
// time. It receives a callback, which can be async.
beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    let Entrance = await ethers.getContractFactory("WormholeEntrance");
    let Exit = await ethers.getContractFactory("WormholeExit");
    let TestNFT = await ethers.getContractFactory("TestNFT");
    let TestNFTWithUri = await ethers.getContractFactory("TestNFTWithUri"); 
    
    let TestERC20 = await ethers.getContractFactory("TestERC20");

    [sender, test, relay, owner, ...addrs] = await ethers.getSigners();

    // To deploy our contract, we just have to call Token.deploy() and await
    // for it to be deployed(), which happens onces its transaction has been
    // mined.
    
    //address _relay, address[] memory _nfts, uint256[] memory _networks
    entrance = await Entrance.deploy(relay.address, [], [3, 4, 42]);
    exit = await Exit.deploy(relay.address);
    erc20 = await TestERC20.deploy("", "");
    
    nft = await TestNFT.deploy("Gagarin", "GG");
    nft2 = await TestNFTWithUri.deploy("Gagarin2", "GG2", "http://supernft.com/nifti_id?");
    await entrance.deployed();
    await entrance.deployed();   
    
});

describe("Create avatar test suit", function () {
    it("Create avatar successfully", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft.address, 42);
        
        //incrementAndGet(), _networkId, _nft, name, symbol
        await expect(receipt)
            .to.emit(entrance, 'AvatarReq')
            .withArgs(1, 42, nft.address, "Gagarin", "GG");
            
        receipt = await entrance.connect(relay).createAvatar(nft2.address, 42);

        await expect(receipt)
            .to.emit(entrance, 'AvatarReq')
            .withArgs(2, 42, nft2.address, "Gagarin2", "GG2");
    });

    it("Create avatar with wrong network", async function () {
        await expect(entrance.connect(relay).createAvatar(nft.address, 100))
            .to.be.revertedWith("'Network not supported'");
    });

    it("Create avatar with erc20 token", async function () {
        await expect(entrance.connect(relay).createAvatar(erc20.address, 42))
            .to.be.revertedWith("function selector was not recognized and there's no fallback function");
    });

    it("Create avatar with not contract", async function () {
        await expect(entrance.connect(relay).createAvatar(test.address, 42))
            .to.be.revertedWith("function call to a non-contract account");
    });
    
    it("Create avatar that already exists", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft.address, 42);
        
        await expect(entrance.connect(relay).createAvatar(nft.address, 42))
            .to.be.revertedWith("'Avatar already created'");
    });
});

describe("Portal nft test suit", function () {
    it("Portal nft successfully", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft.address, 42);
        
        await nft.mint(owner.address, 1);
        await nft.mint(owner.address, 2);
        
        await nft.connect(owner).approve(entrance.address, 2);
        //address _nft, uint256 _id, uint256 _networkId)
        receipt = await entrance.connect(owner).portal(nft.address, 2, 42);

        expect(await nft.ownerOf(2)).to.equal(entrance.address);
        
        //PortalReq(incrementAndGet(), _networkId, _nft, _id, tokenURI, msg.sender);
        await expect(receipt)
            .to.emit(entrance, 'PortalReq')
            .withArgs(2, 42, nft.address, 2, "", owner.address);
    })
    
    it("Portal nft successfully with uri", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft2.address, 42);
        
        await nft2.mint(owner.address);
        await nft2.mint(owner.address);
        
        await nft2.connect(owner).approve(entrance.address, 1);
        //address _nft, uint256 _id, uint256 _networkId)
        receipt = await entrance.connect(owner).portal(nft2.address, 1, 42);

        expect(await nft2.ownerOf(1)).to.equal(entrance.address);
        
        //PortalReq(incrementAndGet(), _networkId, _nft, _id, tokenURI, msg.sender);
        await expect(receipt)
            .to.emit(entrance, 'PortalReq')
            .withArgs(2, 42, nft2.address, 1, "http://supernft.com/nifti_id?1", owner.address);
    })    
    
    it("Portal nft for not supported contract", async function () {
        await nft.mint(owner.address, 1);

        await nft.connect(owner).approve(entrance.address, 1);
        
        await expect(entrance.connect(owner).portal(nft.address, 1, 42))
            .to.be.revertedWith("'Contract not supported'");
    })  
        
    it("Portal nft for not supported contract", async function () {
        await entrance.connect(relay).createAvatar(nft.address, 42);
        await nft.mint(owner.address, 1);

        await nft.connect(owner).approve(entrance.address, 1);
        
        await expect(entrance.connect(owner).portal(nft.address, 1, 100))
            .to.be.revertedWith("'Network not supported'");
    })  
    
    it("Portal nft not owner", async function () {
        await entrance.connect(relay).createAvatar(nft.address, 42);
        await nft.mint(owner.address, 1);

        await nft.connect(owner).approve(entrance.address, 1);
        
        await expect(entrance.connect(relay).portal(nft.address, 1, 42))
            .to.be.revertedWith("'Only nft owner can portal'");
    }) 
    
        
    it("Portal nft not approved", async function () {
        await entrance.connect(relay).createAvatar(nft.address, 42);
        await nft.mint(owner.address, 1);

        await expect(entrance.connect(owner).portal(nft.address, 1, 42))
            .to.be.revertedWith("'ERC721: transfer caller is not owner nor approved'");
    }) 
})

describe("Exit nft test suit", function () {
    it("Exit nft successfully", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft.address, 42);
        
        await nft.mint(owner.address, 1);
        await nft.mint(owner.address, 2);
        
        await nft.connect(owner).approve(entrance.address, 2);
        //address _nft, uint256 _id, uint256 _networkId)
        receipt = await entrance.connect(owner).portal(nft.address, 2, 42);

        //exitExec(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner) 
        receipt = await entrance.connect(relay).exitExec(1, nft.address, 2, owner.address);
        
        //ExitExec(_reqId, _nft, _nftId, _newOwner)
        expect(receipt).to.emit(entrance, 'ExitExec')
            .withArgs(1, nft.address, 2, owner.address);;
        expect(await nft.ownerOf(2)).to.equal(owner.address);
    })
    
    it("Exit not portalled token", async function () {
        let receipt = await entrance.connect(relay).createAvatar(nft.address, 42);
        
        await nft.mint(owner.address, 1);
        await nft.mint(owner.address, 2);
        
        await nft.connect(owner).approve(entrance.address, 2);

        //exitExec(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner) 
        await expect(entrance.connect(relay).exitExec(1, nft.address, 2, owner.address))
            .to.be.revertedWith("'Can't exit not portalled token'");
    })
    
    it("Exit not supported contract", async function () {
        
        await nft.mint(owner.address, 1);
        await nft.mint(owner.address, 2);
        
        await nft.connect(owner).approve(entrance.address, 2);

        //exitExec(uint256 _reqId, address _nft, uint256 _nftId, address _newOwner) 
        await expect(entrance.connect(relay).exitExec(1, nft.address, 2, owner.address))
            .to.be.revertedWith("'Contract not supported'");
    })
})








