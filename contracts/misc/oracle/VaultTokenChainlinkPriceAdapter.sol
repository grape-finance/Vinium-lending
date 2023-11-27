// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;

import {IChainlinkAggregator} from '../../interfaces/IChainlinkAggregator.sol';
import {IERC4626} from '../../interfaces/IERC4626.sol';

contract VaultTokenChainlinkPriceAdapter {
  /// @notice the asset with the price oracle
  IERC4626 public immutable vaultAsset;

  /// @notice chainlink aggregator with price in base asset
  IChainlinkAggregator public immutable underlyingAssetPriceOracleAggregator;

  constructor(address _vaultAsset, address _underlyingAssetPriceOracleAggregator) {
    require(address(_underlyingAssetPriceOracleAggregator) != address(0), 'invalid aggregator');

    vaultAsset = IERC4626(_vaultAsset);
    underlyingAssetPriceOracleAggregator = IChainlinkAggregator(_underlyingAssetPriceOracleAggregator);
  }

  function decimals() external view returns (uint8) {
    return underlyingAssetPriceOracleAggregator.decimals();
  }

  function latestAnswer() external view returns (int256) {
    return (underlyingAssetPriceOracleAggregator.latestAnswer() * int256(vaultAsset.convertToShares(1e18))) / 1e18;
  }
}
