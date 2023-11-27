// SPDX-License-Identifier: MIT
pragma solidity 0.8.12;
pragma abicoder v2;

import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';
import {IERC4626} from '@openzeppelin/contracts/interfaces/IERC4626.sol';
import {ILendingPool} from '../interfaces/ILendingPool.sol';
import {ICreditDelegationToken} from '../interfaces/ICreditDelegationToken.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';
import {IWETH} from '../interfaces/IWETH.sol';

// import {SafeERC20} from '../dependencies/openzeppelin/contracts/SafeERC20.sol';

interface ILido {
  function submit(address referal) external payable returns (uint256 shareAmount);
}

contract Leverager {
  using SafeMath for uint256;
  // using SafeERC20 for IERC20;

  uint256 public constant BORROW_RATIO_DECIMALS = 4;

  /// @notice Lending Pool address
  ILendingPool public lendingPool;

  constructor(ILendingPool _lendingPool) {
    lendingPool = _lendingPool;
  }

  /**
   * @dev Returns the configuration of the reserve
   * @param asset The address of the underlying asset of the reserve
   * @return The configuration of the reserve
   **/
  function getConfiguration(address asset) external view returns (DataTypes.ReserveConfigurationMap memory) {
    return lendingPool.getConfiguration(asset);
  }

  /**
   * @dev Returns variable debt token address of asset
   * @param asset The address of the underlying asset of the reserve
   * @return varaiableDebtToken address of the asset
   **/
  function getVDebtToken(address asset) public view returns (address) {
    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(asset);
    return reserveData.variableVdTokenAddress;
  }

  /**
   * @dev Returns loan to value
   * @param asset The address of the underlying asset of the reserve
   * @return ltv of the asset
   **/
  function ltv(address asset) public view returns (uint256) {
    DataTypes.ReserveConfigurationMap memory conf = lendingPool.getConfiguration(asset);
    return conf.data % (2 ** 16);
  }

  /**
   * @dev Loop the deposit and borrow
   * deposit vaultAsset ( sDAI or sFrax ) to lending pool and borrow underlyingAsset ( dai or frax)
   * mint underlyingAsset to erc4626 vaultContract and redeem vaultAsset
   * @param amount for the initial deposit
   * @param interestRateMode stable or variable borrow mode
   * @param borrowRatio Ratio of tokens to borrow
   * @param loopCount Repeat count for loop
   **/
  function vaultLoop(
    address underlyingAsset,
    address vaultAsset,
    uint256 amount,
    uint256 interestRateMode,
    uint256 borrowRatio,
    uint256 loopCount
  ) external {
    uint16 referralCode = 0;
    IERC20(vaultAsset).transferFrom(msg.sender, address(this), amount);
    IERC20(vaultAsset).approve(address(lendingPool), type(uint256).max);

    lendingPool.deposit(vaultAsset, amount, msg.sender, referralCode);

    for (uint256 i = 0; i < loopCount; i += 1) {
      amount = amount.mul(borrowRatio).div(10 ** BORROW_RATIO_DECIMALS);
      lendingPool.borrow(underlyingAsset, amount, interestRateMode, referralCode, msg.sender);

      IERC4626(vaultAsset).deposit(amount, msg.sender);
      uint256 _maxRedeem = IERC4626(vaultAsset).maxRedeem(msg.sender);
      IERC4626(vaultAsset).redeem(_maxRedeem, msg.sender, msg.sender);

      lendingPool.deposit(vaultAsset, amount, msg.sender, referralCode);
    }
  }

  /**
   * @dev Loop the deposit and borrow
   * deposit shareAsset ( stETH ) to lending pool and borrow underlyingAsset ( ETH )
   * submit underlyingAsset to Lido Contract to get shareAsset
   * @param asset borrow ETH and submit Lido to get stETH
   * @param shareAsset deposit stETH to lendingPool and borrow ETH
   * @param amount for the initial deposit
   * @param interestRateMode stable or variable borrow mode
   * @param borrowRatio Ratio of tokens to borrow
   * @param loopCount Repeat count for loop
   **/

  function lidoLoop(
    address asset, // ETH
    address shareAsset, // stETH
    address lidoAddr,
    uint256 amount,
    uint256 interestRateMode,
    uint256 borrowRatio,
    uint256 loopCount
  ) external {
    uint16 referralCode = 0;
    IERC20(shareAsset).transferFrom(msg.sender, address(this), amount);

    lendingPool.deposit(shareAsset, amount, msg.sender, referralCode);

    for (uint256 i = 0; i < loopCount; i += 1) {
      amount = amount.mul(borrowRatio).div(10 ** BORROW_RATIO_DECIMALS);
      lendingPool.borrow(asset, amount, interestRateMode, referralCode, msg.sender);

      IWETH(asset).withdraw(amount);

      ILido(lidoAddr).submit{value: amount}(msg.sender);

      lendingPool.deposit(shareAsset, amount, msg.sender, referralCode);
    }
  }
}
