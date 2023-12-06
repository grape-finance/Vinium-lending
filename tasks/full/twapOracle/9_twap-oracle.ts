import { task } from 'hardhat/config';
import { deployLeverager, deployTwapOracleFactory, deployViniumProtocolDataProvider } from '../../../helpers/contracts-deployments';
import { exit } from 'process';
import { getFirstSigner, getLendingPoolAddressesProvider } from '../../../helpers/contracts-getters';
import { ConfigNames, loadPoolConfig } from '../../../helpers/configuration';
import { ICommonConfiguration, eNetwork } from '../../../helpers/types';
import { getParamPerNetwork } from '../../../helpers/contracts-helpers';
import { notFalsyOrZeroAddress } from '../../../helpers/misc-utils';

import { ethers } from 'ethers';

task('full:deploy-twap-oracle', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);

      // const { LendingPool, Leverager } = poolConfig as ICommonConfiguration;

      // let lendingPoolAddr = await getParamPerNetwork(LendingPool, network);
      // let leverager = await getParamPerNetwork(Leverager, network);

      // if (!notFalsyOrZeroAddress(leverager)) {
      const TwapOracleFactory = await deployTwapOracleFactory(verify);
      let twapOracleFactory = TwapOracleFactory.address;
      console.log('twapOracleFactory', twapOracleFactory);
      // }
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
