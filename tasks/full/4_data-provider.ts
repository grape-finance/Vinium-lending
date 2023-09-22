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
        '0x3e07e121EbE2F2F0f18fF4E56418C121f92C4CA4'
      );

      await deployViniumProtocolDataProvider(addressesProvider.address, verify);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
