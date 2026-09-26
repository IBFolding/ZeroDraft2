// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IMixTape {
    function publishTape(uint32 editionSize, uint96 price, uint16 royaltyBps, uint8 rights, string calldata uri)
        external
        returns (uint256);
}

/// @dev Test double: a creator contract that refuses ETH, used to prove one bad
///      receiver cannot block anyone else's mints or withdrawals.
contract RejectingReceiver {
    function publish(address mixtape, uint32 editionSize, uint96 price, uint16 royaltyBps) external {
        IMixTape(mixtape).publishTape(editionSize, price, royaltyBps, 0, "");
    }

    receive() external payable {
        revert("no thanks");
    }
}
