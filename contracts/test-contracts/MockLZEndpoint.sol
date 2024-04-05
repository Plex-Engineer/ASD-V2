pragma solidity ^0.8.20;

interface ILayerZeroComposer {
    function lzCompose(address _from, bytes32 _guid, bytes calldata _message, address _executor, bytes calldata _extraData) external payable;
}

contract MockLZEndpoint {
    function lzCompose(address _from, address _to, bytes32 _guid, uint16 _index, bytes calldata _message, bytes calldata _extraData) external payable {
        ILayerZeroComposer(_to).lzCompose{value: msg.value}(_from, _guid, _message, msg.sender, _extraData);
    }
}
