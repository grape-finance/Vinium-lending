import { task } from 'hardhat/config';
import { deployViniumProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';

task('full:data-provider', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    try {
      await localBRE.run('set-DRE');

      const addressesProvider = await getLendingPoolAddressesProvider('0x8FC2aA21e1963CE9C12F07fc27AFe7681Dc3969b');

      await deployViniumProtocolDataProvider(addressesProvider.address, verify);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
