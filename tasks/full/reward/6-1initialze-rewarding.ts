import { task } from 'hardhat/config';
import { getParamPerNetwork } from '../../../helpers/contracts-helpers';
import { loadPoolConfig, ConfigNames } from '../../../helpers/configuration';
import { getFirstSigner, getWETHGateway } from '../../../helpers/contracts-getters';
import { eNetwork, ICommonConfiguration } from '../../../helpers/types';
import { exit } from 'process';

import { MultiFeeDistributionFactory, ViniumOFTFactory } from '../../../types';
import { parseEther } from 'ethers/lib/utils';

task('full:initialize-rewarding', 'Deploy Incentive Controller')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const { OFTTokenAddress, OFTTreasury, MultiFeeDistribution, IncentivesController } = poolConfig as ICommonConfiguration;

      let oftTreasury = await getParamPerNetwork(OFTTreasury, network);
      let oftTokenAddress = await getParamPerNetwork(OFTTokenAddress, network);
      let multiFeeDistribution = await getParamPerNetwork(MultiFeeDistribution, network);
      let incentivesController = await getParamPerNetwork(IncentivesController, network);

      const OFTTokenContract = await ViniumOFTFactory.connect(oftTokenAddress!, await getFirstSigner());
      const MultiFeeDistributionContract = await MultiFeeDistributionFactory.connect(multiFeeDistribution!, await getFirstSigner());

      console.log('multiFeeDistribution :>> ', multiFeeDistribution);
      console.log('incentivesController :>> ', incentivesController);
      // await OFTTokenContract.setMinter(multiFeeDistribution!);
      // await MultiFeeDistributionContract.setMinters([oftTreasury!, incentivesController!]);
      // await MultiFeeDistributionContract.setIncentivesController(incentivesController!);

      // const user = await (await getFirstSigner()).getAddress();

      // const withdrawableBalance = await MultiFeeDistributionContract.withdrawableBalance(user!);
      // console.log('withdrawableBalance :>> ', withdrawableBalance.penaltyETHAmount);
      // await MultiFeeDistributionContract.exitEarly(user!, { value: withdrawableBalance.penaltyETHAmount });
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
