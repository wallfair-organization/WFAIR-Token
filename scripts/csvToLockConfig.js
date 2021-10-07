/* eslint-disable no-console */
require('@babel/register');
require('@babel/polyfill');
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const Parse = require('papaparse');
const { ethers } = require('ethers');

function parseStrToNumStrict (source) {
  if (source === null) {
    return NaN;
  }

  if (source === undefined) {
    return NaN;
  }

  if (typeof source === 'number') {
    return source;
  }

  let transform = source.replace(/\s/g, '');
  transform = transform.replace(/,/g, '.');

  // we allow only digits dots and minus
  if (/[^.\-\d]/.test(transform)) {
    return NaN;
  }

  // we allow only one dot
  if ((transform.match(/\./g) || []).length > 1) {
    return NaN;
  }

  return parseFloat(transform);
}

function ensureAddress (address) {
  const addressTrimmed = address.trim();
  if (!ethers.utils.isAddress(addressTrimmed)) { throw new Error(`Address:${address} must be checksummed address!!`); }
  return addressTrimmed;
}

const optionDefinitions = [
  { name: 'network', type: String },
  { name: 'name', type: String },
  { name: 'csv', type: String },
  { name: 'tgetime', type: String },
  { name: 'fraction', type: Number },
  { name: 'period', type: Number },
  { name: 'delay', type: Number },
  { name: 'artifact', type: String, defaultValue: 'TokenLock' },
  { name: 'manager', type: String },
];

let options;
try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  console.log(`Invalid command line: ${e}`);
  console.log('Expected parameters:');
  console.log(optionDefinitions);
  console.log('Expected CSV format');
  console.log('Column 1: Name \'address\' value: address of the investor');
  console.log(
    'Column 2: Name \'amount\' value: amount of tokens to be unlocked',
  );
  throw e;
}

console.log('Loading CSV file and parsing');
const parsedCsv = Parse.parse(fs.readFileSync(options.csv, 'UTF-8'), { header: true });
if (parsedCsv.errors.length > 0) {
  throw parsedCsv.errors;
}
const stakes = parsedCsv.data.map(entry => ({
  address: entry.address,
  amount: entry.amount,
}));
console.log(options);

// verify TGE date
const tgetimestamp = Date.parse(options.tgetime);
if (Number.isNaN(tgetimestamp)) {
  throw new Error(`TGE Time ${options.tgetime} has invalid format`);
}
if (Number.isNaN(parseStrToNumStrict(options.fraction))) {
  throw new Error(`Fraction ${options.fraction}`);
}
if (Number.isNaN(parseStrToNumStrict(options.period))) {
  throw new Error(`Period ${options.period}`);
}
if (Number.isNaN(parseStrToNumStrict(options.delay))) {
  throw new Error(`Delay ${options.delay}`);
}
if (options.artifact !== 'LeaverTokenLock' && options.artifact !== 'TokenLock') {
  throw new Error(`Unknown artifact ${options.artifact}`);
}

// verify stakes
const amounts = [];
const addresses = [];
for (const stake of stakes) {
  ensureAddress(stake.address);
  const parsedAmount = parseStrToNumStrict(stake.amount);
  if (Number.isNaN(parsedAmount)) {
    throw new Error(`Investor ${stake.address} amount ${stake.amount} could not be parsed`);
  }
  addresses.push(stake.address);
  amounts.push(stake.amount);
}

const deployWallet = {
  TGETime: options.tgetime,
  Artifact: options.artifact,
  Manager: options.manager,
  lockRequests: [
    {
      addresses,
      amounts,
      initialReleaseFraction: options.fraction.toString(),
      vestingPeriod: options.period.toString(),
      cliffPeriod: '0',
      delay: options.delay.toString(),
    },
  ],
};

const path = `./scripts/${options.network}/deploy${options.name}Lock.config.json`;
fs.writeFileSync(path, JSON.stringify(deployWallet, null, 2), (err) => {
  console.error(err.message);
});