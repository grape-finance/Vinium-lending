import { task } from 'hardhat/config';
import { deployViniumProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';

task('full:data-provider', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    try {
      await localBRE.run('set-DRE');

      const addressesProvider = await getLendingPoolAddressesProvider(
        '0x7a6Aaf62a3112a928598101fAC0bFB9B03D9Ab11'
      );

      await deployViniumProtocolDataProvider(addressesProvider.address, verify);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
