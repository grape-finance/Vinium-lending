import { task } from 'hardhat/config';
import { deployVaultPriceOracle, deployWalletBalancerProvider } from '../../helpers/contracts-deployments';
import { ConfigNames, loadPoolConfig, getQuoteCurrency } from '../../helpers/configuration';
import { getLendingPoolAddressesProvider } from '../../helpers/contracts-getters';

task('dev:vault-oracle', 'Initialize lending pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('vault', 'Vault Asset Address')
  .addParam('oracle', 'Underlying Asset Chainlink Oracle Aggregator')
  .setAction(async ({ verify, vault, oracle }, localBRE) => {
    await localBRE.run('set-DRE');

    const viniumOracle = await deployVaultPriceOracle([vault, oracle], verify);
    console.log('viniumOracle', viniumOracle);

    await deployWalletBalancerProvider(verify);
  });
