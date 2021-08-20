    // We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const TokenC = await ethers.getContractFactory("TestNFT");
  const token = await TokenC.deploy("Gagarin", "GAGA");
  
  await token.mint(deployer.address, 1);
  await token.mint(deployer.address, 2);
  await token.mint(deployer.address, 3);
  await token.mint(deployer.address, 4);
  
    //    constructor(address _relay, address[] memory _nfts, uint256[] memory _networks) {
  
  const GatewayC = await ethers.getContractFactory("Gateway");
  const gateway = await GatewayC.deploy(deployer.address, [token.address], [101]);
    
  console.log("Contracts deployed");

  await token.approve(gateway.address, 2)
  console.log("CApproved to: ", gateway.address);

  const receipt = await gateway.lock(token.address, 2, 101)
  
  console.log("Locked");

  console.log("Token address:", token.address);
  console.log("Gateway address:", gateway.address);
  console.log("Receipt:", receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
