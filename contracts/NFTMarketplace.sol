//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTMarketplace is ERC721URIStorage {

    using Counters for Counters.Counter;
    //_tokenIds variable has the most recent minted tokenId
    Counters.Counter private _tokenIds;
    //Keeps track of the number of items sold on the marketplace
    Counters.Counter private _itemsSold;
    //owner is the contract address that created the smart contract
    address payable owner;
    //The fee charged by the marketplace to be allowed to list an NFT
    uint256 listPrice = 0.01 ether;

    //The structure to store info about a listed token
    struct ListedToken {
        uint256 tokenId;
        address payable owner;
        address payable seller;
        uint256 price;
        bool currentlyListed;
    }

    //the event emitted when a token is successfully listed
    event TokenListedSuccess (
        uint256 indexed tokenId,
        address owner,
        address seller,
        uint256 price,
        bool currentlyListed
    );

    //This mapping maps tokenId to token info and is helpful when retrieving details about a tokenId
    mapping(uint256 => ListedToken) private  idToListedToken;

    constructor() ERC721("NFTMarketplace", "NFTM") {
        owner = payable(msg.sender);
    }

    function updateListPrice(uint256 _listPrice) public payable {
        require(owner == msg.sender, "Only owner can update listing price");
        listPrice = _listPrice;
    }

    function getListPrice() public view returns (uint256) {
        return listPrice;
    }

    function getLatestIdToListedToken() public view returns (ListedToken memory) {
        uint256 currentTokenId = _tokenIds.current();
        return idToListedToken[currentTokenId];
    }

    function getListedTokenForId(uint256 tokenId) public view returns (ListedToken memory) {
        return idToListedToken[tokenId];
    }

    function getCurrentToken() public view returns (uint256) {
        return _tokenIds.current();
    }

    //The first time a token is created, it is listed here
    function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
        //Increment the tokenId counter, which is keeping track of the number of minted NFTs
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        //Mint the NFT with tokenId newTokenId to the address who called createToken
        _safeMint(msg.sender, newTokenId);

        //Map the tokenId to the tokenURI (which is an IPFS URL with the NFT metadata)
        _setTokenURI(newTokenId, tokenURI);

        //Helper function to update Global variables and emit an event
        createListedToken(newTokenId, price);

        return newTokenId;
    }

    function createListedToken(uint256 tokenId, uint256 price) private {
        //Make sure the sender sent enough ETH to pay for listing
        require(msg.value == listPrice, "Hopefully sending the correct price");
        //Just sanity check
        require(price > 0, "Make sure the price isn't negative");

        //Update the mapping of tokenId's to Token details, useful for retrieval functions
        idToListedToken[tokenId] = ListedToken(
            tokenId,
            payable(address(this)),
            payable(msg.sender),
            price,
            true
        );

        _transfer(msg.sender, address(this), tokenId);
        //Emit the event for successful transfer. The frontend parses this message and updates the end user
        emit TokenListedSuccess(
            tokenId,
            address(this),
            msg.sender,
            price,
            true
        );
    }
    
    //This will return all the NFTs currently listed to be sold on the marketplace
    function getAllNFTs() public view returns (ListedToken[] memory) {
        uint nftCount = _tokenIds.current();
        ListedToken[] memory tokens = new ListedToken[](nftCount);
        uint currentIndex = 0;
        uint currentId;
        //at the moment currentlyListed is true for all, if it becomes false in the future we will 
        //filter out currentlyListed == false over here
        for(uint i=0;i<nftCount;i++)
        {
            currentId = i + 1;
            ListedToken storage currentItem = idToListedToken[currentId];
            tokens[currentIndex] = currentItem;
            currentIndex += 1;
        }
        //the array 'tokens' has the list of all NFTs in the marketplace
        return tokens;
    }
    
    //Returns all the NFTs that the current user is owner or seller in
    function getMyNFTs() public view returns (ListedToken[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        // Count the number of NFTs that are owned or sold by the user and are still listed
        for(uint i = 0; i < totalItemCount; i++) {
            if((idToListedToken[i+1].owner == msg.sender || idToListedToken[i+1].seller == msg.sender) && idToListedToken[i+1].currentlyListed) {
                itemCount += 1;
            }
        }

        // Create an array and store the NFTs that are currently listed
        ListedToken[] memory items = new ListedToken[](itemCount);
        for(uint i = 0; i < totalItemCount; i++) {
            if((idToListedToken[i+1].owner == msg.sender || idToListedToken[i+1].seller == msg.sender) && idToListedToken[i+1].currentlyListed) {
                uint currentId = i + 1;
                ListedToken storage currentItem = idToListedToken[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }


    function executeSale(uint256 tokenId) public payable {
        uint price = idToListedToken[tokenId].price;
        address seller = idToListedToken[tokenId].seller;
        
        require(msg.value == price, "Please submit the asking price to complete the purchase");
        require(idToListedToken[tokenId].currentlyListed, "This NFT is not listed for sale");

        // Update the NFT ownership
        idToListedToken[tokenId].currentlyListed = false; 
        idToListedToken[tokenId].owner = payable(msg.sender); 
        idToListedToken[tokenId].seller = payable(address(0)); 
        _itemsSold.increment();

        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);
        
        // Transfer listing fee to marketplace owner
        payable(owner).transfer(listPrice);

        // Transfer sale proceeds to the seller
        payable(seller).transfer(msg.value);
    }



    function updateTokenPrice(uint256 tokenId, uint256 newPrice) public {
        require(idToListedToken[tokenId].seller == msg.sender, "Only the seller can update the price");
        require(newPrice > 0, "Price must be greater than zero");
        idToListedToken[tokenId].price = newPrice;
    }

    function deleteToken(uint256 tokenId) public {
        require(idToListedToken[tokenId].seller == msg.sender, "Only the seller can delete the token");
        require(idToListedToken[tokenId].currentlyListed == true, "Token is not listed");
        require(ownerOf(tokenId) == address(this), "Contract does not own this token");

        // Mark the token as no longer listed
        idToListedToken[tokenId].currentlyListed = false;

        // Transfer NFT back to the seller
        _transfer(address(this), msg.sender, tokenId);

        // Emit an event for the unlisting
        emit TokenListedSuccess(tokenId, msg.sender, msg.sender, 0, false);
    }

}
