#!/usr/bin/env node

import program from 'commander';
import path from 'path';
import fs from 'fs';
import logger, { setupLogger } from '../logger';
import SnapShotter from '../snapshotter';
import getScreenshots from '../getScreenshots';
import updateBaselineShots from '../updateBaselineShots';
import { generateLocalReport, generateRemoteReport } from '../generateReport';
import { uploadRemoteKeys } from '../remoteActions';
import {
  createBucket,
  createComparisons,
  createDirectories,
  clearDirectories,
  fetchRemoteComparisonImages
} from '../comparisonActions';
import validateConfig from '../configValidator';
import Reporter from '../reporter';

setupLogger();

function handleError(err) {
  logger.error(
    'run',
    '☠️️️️️️️ ☠️ ️️️️️️☠️️️️️️️ ☠️️️️️️️ ☠️️️️️️️ ☠️️️ ERROR FOUND ☠️️️️️️️ ☠️️️️️️️ ☠️️️️️️️ ☠️️️️️️️ ☠️️️️️️️ ☠️️️'
  );
  console.error(err);
  process.exitCode = 1;
  process.exit();
}

program
  .version('0.0.1')
  .command('snap')
  .option(
    '-b, --browser [browser]',
    'Select the browser to run your tests on. E.G. chrome, firefox, etc.'
  )
  .option('c, --config [config]', 'Path to your config')
  .option('r, --remote', 'Upload new baseline to remote storage')
  .action(async options => {
    try {
      const config = require(path.resolve(options.config)); // eslint-disable-line import/no-dynamic-require

      if (options.browser) config.browser = options.browser;

      validateConfig(config, options.remote);

      logger.info('run', 'Getting snapshots... 📸 ');
      await createDirectories(fs, config);
      await createBucket(config);
      await getScreenshots(SnapShotter, config);
      if (options.remote) await uploadRemoteKeys('latest', config);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('update-baseline')
  .option(
    '-b, --browser [browser]',
    'Select the browser to run your tests on. E.G. chrome, firefox, etc.'
  )
  .option('c, --config [config]', 'Path to your config')
  .option('r, --remote', 'Upload new baseline to remote storage')
  .action(async options => {
    try {
      const config = require(path.resolve(options.config)); // eslint-disable-line import/no-dynamic-require

      if (options.browser) config.browser = options.browser;

      validateConfig(config, options.remote);

      createDirectories(fs, config);
      await updateBaselineShots(fs, config).catch(error => {
        logger.error('run', error);
      });
      if (options.remote) await uploadRemoteKeys('baseline', config);
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('compare')
  .option(
    '-b, --browser [browser]',
    'Select the browser to run your tests on. E.G. chrome, firefox, etc.'
  )
  .option('c, --config [config]', 'Path to your config')
  .option('r, --remote', 'Upload new baseline to remote storage')
  .action(async options => {
    try {
      const config = require(path.resolve(options.config)); // eslint-disable-line import/no-dynamic-require

      if (options.browser) config.browser = options.browser;
      config.remote = options.remote;
      validateConfig(config, config.remote);

      createDirectories(fs, config);
      clearDirectories(fs, config);
      await createBucket(config);
      await fetchRemoteComparisonImages(config);
      await createComparisons(fs, config);

      if (Reporter.state.failed.count) {
        const generateReport = config.remote
          ? generateRemoteReport
          : generateLocalReport;

        generateReport(config);

        process.exitCode = 1;
      } else {
        process.exitCode = 0;
      }
    } catch (err) {
      handleError(err);
    }
  });

program.parse(process.argv);
