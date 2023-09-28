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
  deployBaseOracle,
  deployUniV2TwapOracle,
} from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { exit } from 'process';
import { chainlinkAggregatorProxy, chainlinkEthUsdAggregatorProxy } from '../../helpers/constants';
import { ethers } from 'ethers';
import {
  LendingPoolConfiguratorFactory,
  LockZapFactory,
  LockerListFactory,
  MultiFeeDistributionFactory,
  PriceProviderFactory,
  UniswapPoolHelperFactory,
  ViniumOFTFactory,
  WETH9Factory,
} from '../../types';

task('full:initialize-incentive-controller', 'Deploy Incentive Controller')
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
        BaseOracle,
        UniV2TwapOracle,
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
      let liquidityZap = await getParamPerNetwork(LiquidityZap, network);
      let uniswapPoolHelper = await getParamPerNetwork(UniswapPoolHelper, network);
      let lockZap = await getParamPerNetwork(LockZap, network);
      let baseOracle = await getParamPerNetwork(BaseOracle, network);
      let uniV2TwapOracle = await getParamPerNetwork(UniV2TwapOracle, network);
      let priceProvider = await getParamPerNetwork(PriceProvider, network);
      let lockerList = await getParamPerNetwork(LockerList, network);
      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      let middleFeeDistribution = await getParamPerNetwork(MiddleFeeDistribution, network);
      let eligibilityDataProvider = await getParamPerNetwork(EligibilityDataProvider, network);
      let incentivesController = await getParamPerNetwork(IncentivesController, network);

      const oftTokenContract = await ViniumOFTFactory.connect(oftTokenAddress!, await getFirstSigner());
      const wethTokenContract = await WETH9Factory.connect(wETH!, await getFirstSigner());

      await oftTokenContract.setPriceProvider(priceProvider!);

      // oftTokenContract.transfer(uniswapPoolHelper!, ethers.utils.parseEther('1'));
      // wethTokenContract.transfer(uniswapPoolHelper!, ethers.utils.parseEther('0.001'));

      const uniswapPoolHelperContract = await UniswapPoolHelperFactory.connect(uniswapPoolHelper!, await getFirstSigner());
      await uniswapPoolHelperContract.initializePool();
      await uniswapPoolHelperContract.setLockZap(lockZap!);
      await uniswapPoolHelperContract.transferOwnership(lockZap!);

      console.log('lockZap :>> ', lockZap);
      const lockZapContract = await LockZapFactory.connect(lockZap!, await getFirstSigner());

      await lockZapContract.setPriceProvider(priceProvider!);
      await lockZapContract.setMfd(multiFeeDistribution!);

      let lpTokenAddr = await uniswapPoolHelperContract.lpTokenAddr();
      if (!notFalsyOrZeroAddress(uniV2TwapOracle)) {
        const UniV2TwapOracle = await deployUniV2TwapOracle([lpTokenAddr, oftTokenAddress!, chainlinkAggregator['WETH'], '60', '120', true], verify);
        uniV2TwapOracle = UniV2TwapOracle.address;
      }
      console.log('uniV2TwapOracle :>> ', uniV2TwapOracle);

      const priceProviderContract = await PriceProviderFactory.connect(priceProvider!, await getFirstSigner());
      await priceProviderContract.setOracle(uniV2TwapOracle!);
      console.log('priceProvider :>> ', priceProvider);

      const LockerListContract = await LockerListFactory.connect(lockerList!, await getFirstSigner());
      await LockerListContract.transferOwnership(middleFeeDistribution!);

      const MultiFeeDistributionContract = await MultiFeeDistributionFactory.connect(multiFeeDistribution!, await getFirstSigner());

      await MultiFeeDistributionContract.setMinters([oftTreasury!, middleFeeDistribution!]);
      await MultiFeeDistributionContract.transferOwnership(middleFeeDistribution!);

      // const LendingPoolConfiguratorContract = await LendingPoolConfiguratorFactory.connect(lendingPoolConfigurator, await getFirstSigner());
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
