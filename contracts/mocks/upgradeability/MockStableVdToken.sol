// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.12;

import {StableVdToken} from '../../protocol/tokenization/StableVdToken.sol';

contract MockStableVdToken is StableVdToken {
  function getRevision() internal pure override returns (uint256) {
    return 0x2;
  }
}
