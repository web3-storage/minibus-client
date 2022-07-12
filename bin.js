#!/usr/bin/env node

import fs from 'fs'
import sade from 'sade'
import Conf from 'conf'
import enquirer from 'enquirer'
import ora from 'ora'
import util from 'util'
import { CID } from 'multiformats/cid'
import { CarIndexedReader } from '@ipld/car'
import numeral from 'numeral'
import fetch from '@web-std/fetch'
import Queue from 'p-queue'
import { Minibus } from './index.js'

const ENDPOINT = 'https://minibus.web3.storage'
const BLOCK_PUT_CONCURRENCY = 10

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))

const config = new Conf({
  projectName: 'minibus',
  projectVersion: pkg.version,
  configFileMode: 0o600
})

function getClient () {
  const api = config.get('api') || ENDPOINT
  const token = config.get('token')
  if (!token) {
    console.log('! run `minibus token` to set an API token to use')
    process.exit(-1)
  }
  const endpoint = new URL(api)
  const headers = { Authorization: `Basic ${token}` }
  return new Minibus({ endpoint, headers, fetch })
}

const cli = sade('minibus')

cli
  .version(pkg.version)
  .example('get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy')
  .example('put-car path/to/file.car')

cli.command('token')
  .option('--api', `URL for the Minibus API. Default: ${ENDPOINT}`)
  .option('--delete', 'Delete your saved token')
  .describe('Save an API token to use for all requests.')
  .action(async ({ delete: del, token, api = ENDPOINT }) => {
    if (del) {
      config.delete('token')
      config.delete('api')
      console.log('🚌 API token deleted')
      return
    }

    const url = new URL(api)
    if (!token) {
      const response = await enquirer.prompt({
        type: 'input',
        name: 'token',
        message: `Paste your API token for ${url.hostname}`
      })
      token = response.token
    }
    config.set('token', token)
    config.set('api', api)
    console.log('🚌 API token saved')
  })

cli.command('put-car <path>')
  .describe('Upload blocks from a CAR file to Minibus.')
  .action(async (path) => {
    const client = getClient()
    const spinner = ora('Reading CAR').start()
    const carReader = await CarIndexedReader.fromFile(path)
    const roots = await carReader.getRoots()
    if (roots.length > 1) {
      spinner.fail(`Cannot add CAR file with multiple roots. ${path} contains mulitple roots.`)
      process.exit(1)
    }
    if (roots.length < 1) {
      spinner.fail(`CAR must have a root CID. ${path} has no roots.`)
      process.exit(1)
    }
    spinner.stopAndPersist({ symbol: '#', text: roots[0].toString() })
    let totalBlocks = 0
    spinner.start('Indexing blocks')
    for await (const _ of carReader.cids()) { // eslint-disable-line no-unused-vars
      totalBlocks++
    }
    const queue = new Queue({ concurrency: BLOCK_PUT_CONCURRENCY })
    let blockCount = 0
    for await (const block of carReader.blocks()) {
      const blockNum = blockCount++
      queue.add(async () => {
        spinner.text = `Storing block (${numeral(blockNum).format('0,0')}/${numeral(totalBlocks).format('0,0')}) ${block.cid}`
        await client.put(block.cid, block.bytes)
      })
    }
    await queue.onEmpty()
    spinner.stopAndPersist({ symbol: '🚌', text: `Stored ${numeral(totalBlocks).format('0,0')} blocks` })
  })

cli.command('get <cid>')
  .describe('Fetch a block from Minibus')
  .option('-p, --pretty', 'Attempt to format the data in a visually pleasing manner.')
  .option('-o, --output', 'The path to write the block data to.')
  .example('get bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy -o block.bin')
  .action(async (cid, opts) => {
    const client = getClient()
    const data = await client.get(CID.parse(cid))
    if (data == null) {
      if (opts.pretty) console.log(`⚠️ Block not found: ${cid}`)
      process.exit(-1)
    }
    if (opts.pretty) {
      return console.log(util.inspect(data))
    }
    if (opts.output) {
      return await fs.promises.writeFile(opts.output, data)
    }
    process.stdout.write(data)
  })

cli.parse(process.argv)
