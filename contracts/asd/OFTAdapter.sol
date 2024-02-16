pragma solidity ^0.8.22;

import {OFTAdapter as LZAdapter} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFTAdapter.sol";

contract OFTAdapter is LZAdapter {
    constructor(address _token, address _lzEndpoint, address _delegate) LZAdapter(_token, _lzEndpoint, _delegate) {}
}
