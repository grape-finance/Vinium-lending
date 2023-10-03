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
import { MultiFeeDistributionFactory } from '../../types';

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
        IncentivesController,
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

      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      if (!notFalsyOrZeroAddress(multiFeeDistribution)) {
        const MultiFeeDistribution = await deployMultiFeeDistribution([oftTokenAddress!], verify);
        multiFeeDistribution = MultiFeeDistribution.address;
      }
      console.log('MultiFeeDistribution :>> ', multiFeeDistribution);

      let incentivesController = await getParamPerNetwork(IncentivesController, network);
      if (!notFalsyOrZeroAddress(incentivesController)) {
        const IncentivesController = await deployChefIncentivesController(
          [ethers.utils.parseEther('1'), lendingPoolConfigurator!, multiFeeDistribution!, ethers.utils.parseEther('400000000')],
          verify
        );
        incentivesController = IncentivesController.address;
      }
      console.log('incentivesController :>> ', incentivesController);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
