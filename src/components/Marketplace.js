import Navbar from "./Navbar";
import NFTTile from "./NFTTile";
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { GetIpfsUrlFromPinata } from "../utils";
import Swal from "sweetalert2";

export default function Marketplace() {
const sampleData = [
    {
        "name": "NFT#1",
        "description": "Top NFT 1",
        "website":"http://axieinfinity.io",
        "image":"https://coffee-faithful-dragon-756.mypinata.cloud/files/bafybeihcxzlqmefvvtutogifcxzwfvimzxcudjtvr4pjk2jpmwoezk6tia?X-Algorithm=PINATA1&X-Date=1735191906&X-Expires=30&X-Method=GET&X-Signature=3f9495d9e801b1cb7766560935d54b4eb444d5ca3d3aff353044043ad73e6f8c",
        "price":"0.03ETH",
        "currentlySelling":"True",
        "address":"0xe81Bf5A757CB4f7F82a2F23b1e59bE45c33c5b13",
    },
    {
        "name": "NFT#2",
        "description": "Top NFT 2",
        "website":"http://axieinfinity.io",
        "image":"https://coffee-faithful-dragon-756.mypinata.cloud/files/bafkreift6p5bkwyyhv6dptt5zlbfwthrkz6cx3dqkcp5loipwi26pv243y?X-Algorithm=PINATA1&X-Date=1735199134&X-Expires=30&X-Method=GET&X-Signature=f68e0f3fdbf4a27dd7e83cd6d6a393b7789541b1767467826fa1df0eee3d95a4",
        "price":"0.03ETH",
        "currentlySelling":"True",
        "address":"0xe81Bf5A757C4f7F82a2F23b1e59bE45c33c5b13",
    },
    {
        "name": "NFT#3",
        "description": "Top NFT 3",
        "website":"http://axieinfinity.io",
        "image":"https://coffee-faithful-dragon-756.mypinata.cloud/files/bafkreia42ygggjbdv52njrbxto4xuqoy5gvvedxvka5yx5fu4uiwbgguby?X-Algorithm=PINATA1&X-Date=1735199154&X-Expires=30&X-Method=GET&X-Signature=3ab542113a8743ed9bc16fbc5c9660215320b716ad0ebf286c273bc791195bb9",
        "price":"0.03ETH",
        "currentlySelling":"True",
        "address":"0xe81Bf5A757C4f7F82a2F23b1e59bE45c33c5b13",
    },
];
const [data, updateData] = useState(sampleData);
const [dataFetched, updateFetched] = useState(false);

useEffect(() => {
  if (window.ethereum) {
    window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
      if (chainId !== '0xaa36a7') {
        addSepoliaNetwork();
      }
    });
  }
}, []);

async function getAllNFTs() {
    const ethers = require("ethers");
    //After adding your Hardhat network to your metamask, this code will get providers and signers
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    //Pull the deployed contract instance
    let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer)
    //create an NFT Token
    let transaction = await contract.getAllNFTs()

    //Fetch all the details of every NFT from the contract and display
    const items = await Promise.all(transaction.map(async i => {
        var tokenURI = await contract.tokenURI(i.tokenId);
        console.log("getting this tokenUri", tokenURI);
        tokenURI = GetIpfsUrlFromPinata(tokenURI);
        let meta = await axios.get(tokenURI);
        meta = meta.data;

        let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
        let item = {
            price,
            tokenId: i.tokenId.toNumber(),
            seller: i.seller,
            owner: i.owner,
            image: meta.image,
            name: meta.name,
            description: meta.description,
        }
        return item;
    }))

    updateFetched(true);
    updateData(items);
}

async function addSepoliaNetwork() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['eth-sepolia.g.alchemy.com/v2/JQXySHrW-z2dvh7rRKRzqW5PE0IBWajl'],
          blockExplorerUrls: ['sepolia.etherscan.io']
        }]
      });
      console.log('Sepolia network added');
    } catch (error) {
      console.error('Failed to add network', error);
    }
  } else {
    console.error('MetaMask is not installed');
  }
}

if(!dataFetched)
    getAllNFTs();

return (
<div style={{ backgroundColor: "#0B2E33" , minHeight: "100vh"}}>
<Navbar></Navbar>
        <div className="flex flex-col place-items-center mt-20">
            <div className="md:text-xl font-bold text-white">
                Top NFTs
            </div>
            <div className="flex mt-5 justify-between flex-wrap max-w-screen-xl text-center">
                {data.map((value, index) => {
                    return <NFTTile data={value} key={index}></NFTTile>;
                })}
            </div>
        </div>            
    </div>
);

}