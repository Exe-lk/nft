import Navbar from "./Navbar";
import { useParams } from 'react-router-dom';
import MarketplaceJSON from "../Marketplace.json";
import axios from "axios";
import { useState, useEffect } from "react";
import { GetIpfsUrlFromPinata } from "../utils";
import { useNavigate } from "react-router-dom";

export default function NFTPage(props) {
    const { tokenId } = useParams(); 
    const [data, updateData] = useState({});
    const [dataFetched, updateDataFetched] = useState(false);
    const [message, updateMessage] = useState("");
    const [currAddress, updateCurrAddress] = useState("0x");
    const [newPrice, setNewPrice] = useState("");


    useEffect(() => {
        if (!dataFetched && tokenId) {
            getNFTData(tokenId);
        }
    }, [dataFetched, tokenId]);

    useEffect(() => {
        if (dataFetched && data) {
            console.log("NFT Data:", data);
            console.log("Currently Listed:", data.currentlyListed);
            console.log("Owner:", data.owner);
            console.log("Seller:", data.seller);
            console.log("Current Address:", currAddress);
        }
    }, [dataFetched, data, currAddress]);

    async function getNFTData(tokenId) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const addr = await signer.getAddress();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
    
            const listedToken = await contract.getListedTokenForId(tokenId);
    
            if (!listedToken.currentlyListed) {
                console.log("NFT is not for sale.");
            }
    
            let tokenURI = await contract.tokenURI(tokenId);
            tokenURI = GetIpfsUrlFromPinata(tokenURI);
            let meta = await axios.get(tokenURI);
            meta = meta.data;
    
            let item = {
                price: ethers.utils.formatUnits(listedToken.price, 'ether'),
                tokenId: tokenId,
                seller: listedToken.seller,
                owner: listedToken.owner,
                image: meta.image,
                name: meta.name,
                description: meta.description,
                currentlyListed: listedToken.currentlyListed, // ✅ Store this
            };
    
            updateData(item);
            updateDataFetched(true);
            updateCurrAddress(addr);
        } catch (e) {
            console.error("Error fetching NFT data:", e);
        }
    }
    
    

    async function buyNFT(tokenId) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);
            const salePrice = ethers.utils.parseUnits(data.price, 'ether');

            updateMessage("Buying the NFT... Please Wait (Upto 5 mins)");
            let transaction = await contract.executeSale(tokenId, { value: salePrice });
            await transaction.wait();

            alert('You successfully bought the NFT!');
            updateMessage("");
        } catch (e) {
            alert("Upload Error" + e);
        }
    }

    async function updateNFTPrice(tokenId, newPrice) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

            let transaction = await contract.updateTokenPrice(tokenId, ethers.utils.parseUnits(newPrice, 'ether'));
            await transaction.wait();
    
            alert('NFT price updated successfully!');
            getNFTData(tokenId);
            
        } catch (e) {
            alert("Error updating price: " + e);
            console.error(e);
        }
    }
    

    async function deleteNFT(tokenId) {
        try {
            const ethers = require("ethers");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            let contract = new ethers.Contract(MarketplaceJSON.address, MarketplaceJSON.abi, signer);

            let transaction = await contract.deleteToken(tokenId);
            await transaction.wait();
    
            alert('NFT deleted successfully!');
    
            updateData({});
            updateDataFetched(false);
            window.location.replace("/");
        } catch (e) {
            alert("Error deleting NFT: " + e.message);
            console.error("Error:", e);
        }
    }
    

    return (
        <div style={{ "minHeight": "100vh" }}>
            <Navbar />
            <div className="flex ml-20 mt-20">
            {dataFetched && data ? (
                data.image ? (
                    <img src={data.image} alt={data.name} />
                ) : (
                    <p>NFT not found or deleted.</p>
                )
            ) : (
                <p>Loading...</p>
            )}

                <div className="text-xl ml-20 space-y-8 text-white shadow-2xl rounded-lg border-2 p-5">
                    {data ? (
                        <>
                            <div>Name: {data.name}</div>
                            <div>Description: {data.description}</div>
                            <div>Price: <span>{data.price + " ETH"}</span></div>
                            <div>Owner: <span className="text-sm">{data.owner}</span></div>
                            <div>Seller: <span className="text-sm">{data.seller}</span></div>
                            <div>
                            {dataFetched && data ? (
                                currAddress.toLowerCase() === data.owner.toLowerCase() ||
                                currAddress.toLowerCase() === data.seller.toLowerCase() ? (
                                    <>
                                        <div className="text-emerald-700">You are the owner of this NFT</div>
                                        <input
                                            type="number"
                                            className="text-black"
                                            placeholder="New Price"
                                            onChange={(e) => setNewPrice(e.target.value)}
                                        />
                                        <button
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm"
                                            onClick={() => updateNFTPrice(tokenId, newPrice)}
                                        >
                                            Update Price
                                        </button>
                                        <button
                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
                                            onClick={() => deleteNFT(tokenId)}
                                        >
                                            Delete NFT
                                        </button>
                                    </>
                                ) : data.currentlyListed ? (
                                    <button
                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm"
                                        onClick={() => buyNFT(tokenId, data.price)}
                                    >
                                        Buy for {data.price} ETH
                                    </button>
                                ) : (
                                    <div className="text-gray-500">Not for sale</div>
                                )
                            ) : (
                                <p>Loading...</p>
                            )}

                            </div>
                        </>
                    ) : (
                        <p>NFT not found or deleted.</p>
                    )}
                    <div className="text-green text-center mt-3">{message}</div>
                </div>
            </div>
        </div>
    );
}
