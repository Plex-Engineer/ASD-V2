pragma solidity ^0.8.22;

import {OFT as LZOFT} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

contract OFT is LZOFT {
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, address _delegate) LZOFT(_name, _symbol, _lzEndpoint, _delegate) {}
}
