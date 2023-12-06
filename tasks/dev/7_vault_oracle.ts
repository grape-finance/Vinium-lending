import { task } from 'hardhat/config';
import { deployVaultPriceOracle, deployWalletBalancerProvider } from '../../helpers/contracts-deployments';
import { ConfigNames, loadPoolConfig, getQuoteCurrency } from '../../helpers/configuration';
import { getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';

task('dev:vault-oracle', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify, vault, oracle }, localBRE) => {
    await localBRE.run('set-DRE');

    const vaultContract = '0xd8134205b0328f5676aaefb3b2a0dc15f4029d8c';
    const underlyingAssetPriceOracle = '0x0d79df66BE487753B02D015Fb622DED7f0E9798d';

    const viniumOracle = await deployVaultPriceOracle([vaultContract, underlyingAssetPriceOracle], verify);
    console.log('viniumOracle', viniumOracle.address);
  });

// sDAI oracle: 0x19021e5FBC32FDDC9D266a76dB90D14587c0c895
// sFrax oracle:
// stETH oracle:
