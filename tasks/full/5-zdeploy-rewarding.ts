import { task } from 'hardhat/config';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import {
  deployLendingPoolCollateralManager,
  deployWalletBalancerProvider,
  authorizeWETHGateway,
  deployUiPoolDataProviderV2,
  deployOFTToken,
  deployLiquidityZap,
  deployUniswapPoolHelper,
  deployLockZap,
  deployPriceProvider,
  deployLockerList,
  deployMultiFeeDistribution,
  deployMiddleFeeDistribution,
  deployChefIncentivesController,
  deployEligibilityDataProvider,
  deployLendingPoolAddressesProvider,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { exit } from 'process';
import { chainlinkAggregatorProxy, chainlinkEthUsdAggregatorProxy } from '../../helpers/constants';
import { ethers } from 'ethers';

task('full:deploy-incentive-controller', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const {
        OFTTokenAddress,
        OFTEndpoint,
        OFTTreasury,
        LiquidityZap,
        UniswapPoolHelper,
        LockZap,
        PriceProvider,
        LockerList,
        MultiFeeDistribution,
        MiddleFeeDistribution,
        EligibilityDataProvider,
        WETH,
        LendingPool,
        ViniumOracle,
        LendingPoolConfigurator,
        ChainlinkAggregator,
      } = poolConfig as ICommonConfiguration;

      let oftEndpoint = await getParamPerNetwork(OFTEndpoint, network);
      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);
      let wETH = await getParamPerNetwork(WETH, network);
      let lendingPool = await getParamPerNetwork(LendingPool, network);
      let lendingPoolConfigurator = await getParamPerNetwork(LendingPoolConfigurator, network);
      let viniumOracle = await getParamPerNetwork(ViniumOracle, network);
      let chainlinkAggregator = await getParamPerNetwork(ChainlinkAggregator, network);

      let oftTokenAddress = await getParamPerNetwork(OFTTokenAddress, network);
      if (!notFalsyOrZeroAddress(oftTokenAddress)) {
        const OFTTokenAddress = await deployOFTToken(
          ['ViniumOFT', 'ViniumOFT', oftEndpoint!, oftTreasury!, oftTreasury!, ethers.utils.parseEther('100000').toString()],
          verify
        );
        oftTokenAddress = OFTTokenAddress.address;
      }
      console.log('oftTokenAddress :>> ', oftTokenAddress);

      let liquidityZap = await getParamPerNetwork(LiquidityZap, network);
      if (!notFalsyOrZeroAddress(liquidityZap)) {
        const LiquidityZapAddress = await deployLiquidityZap(verify);
        liquidityZap = LiquidityZapAddress.address;
      }
      console.log('LiquidityZap :>> ', liquidityZap);

      let uniswapPoolHelper = await getParamPerNetwork(UniswapPoolHelper, network);
      if (!notFalsyOrZeroAddress(uniswapPoolHelper)) {
        const routerAddr = '0xEfF92A263d31888d860bD50809A8D171709b7b1c';
        const UniswapPoolHelper = await deployUniswapPoolHelper([oftTokenAddress!, wETH!, routerAddr, liquidityZap!], verify);
        uniswapPoolHelper = UniswapPoolHelper.address;
      }

      console.log('UniswapPoolHelper :>> ', uniswapPoolHelper);

      let lockZap = await getParamPerNetwork(LockZap, network);
      if (!notFalsyOrZeroAddress(lockZap)) {
        const _ethLPRatio = '5000';
        const _ACCEPTABLE_RATIO = '8500';
        const LockZap = await deployLockZap([uniswapPoolHelper!, lendingPool, wETH, oftTokenAddress!, _ethLPRatio, _ACCEPTABLE_RATIO], verify);
        lockZap = LockZap.address;
      }
      console.log('LockZap :>> ', lockZap);

      let priceProvider = await getParamPerNetwork(PriceProvider, network);
      if (!notFalsyOrZeroAddress(priceProvider)) {
        const PriceProvider = await deployPriceProvider([chainlinkAggregator['WETH'], uniswapPoolHelper!], verify);
        priceProvider = PriceProvider.address;
      }
      console.log('PriceProvider :>> ', priceProvider);

      let lockerList = await getParamPerNetwork(LockerList, network);
      if (!notFalsyOrZeroAddress(lockerList)) {
        const LockerList = await deployLockerList(verify);
        lockerList = LockerList.address;
      }
      console.log('LockerList :>> ', lockerList);

      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      if (!notFalsyOrZeroAddress(multiFeeDistribution)) {
        const MultiFeeDistribution = await deployMultiFeeDistribution(
          [oftTokenAddress!, lockZap!, oftTreasury!, lockerList!, priceProvider!, '604800', '86400', '7776000', '10000', '7776000'],
          verify
        );
        multiFeeDistribution = MultiFeeDistribution.address;
      }
      console.log('MultiFeeDistribution :>> ', multiFeeDistribution);

      let middleFeeDistribution = await getParamPerNetwork(MiddleFeeDistribution, network);
      if (!notFalsyOrZeroAddress(middleFeeDistribution)) {
        const MiddleFeeDistribution = await deployMiddleFeeDistribution([oftTokenAddress!, viniumOracle, multiFeeDistribution!], verify);
        multiFeeDistribution = MiddleFeeDistribution.address;
      }

      console.log('MiddleFeeDistribution :>> ', middleFeeDistribution);

      let eligibilityDataProvider = await getParamPerNetwork(EligibilityDataProvider, network);
      if (!notFalsyOrZeroAddress(eligibilityDataProvider)) {
        const EligibilityDataProvider = await deployEligibilityDataProvider([lendingPool, middleFeeDistribution!, priceProvider!], verify);
        eligibilityDataProvider = EligibilityDataProvider.address;
      }

      console.log('EligibilityDataProvider :>> ', eligibilityDataProvider);

      const IncentivesController = await deployChefIncentivesController(
        [lendingPoolConfigurator, eligibilityDataProvider!, middleFeeDistribution!, '2652320636000000000'],
        verify
      );

      console.log('IncentivesController :>> ', IncentivesController.address);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
