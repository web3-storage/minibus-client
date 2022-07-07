# minibus client

[![Build](https://github.com/web3-storage/minibus-client/actions/workflows/build.yml/badge.svg)](https://github.com/alanshaw/miniswap/actions/workflows/build.yml)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Minibus API client and CLI tool.

## Install

```
npm install @web3-storage/minibus
```

## Usage

```js
import { Minibus } from '@web3-storage/minibus'
import { fromString } from 'uint8arrays'
import { sha256 } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import fetch from '@web-std/fetch'

const minibus = new Minibus({
  endpoint: `https://minibus.web3.storage`,
  headers: { Authorization: `Basic ${token}` },
  fetch
})

const data = fromString(`TEST DATA ${Date.now()}`)
const hash = await sha256.digest(data)
const cid = CID.create(1, raw.code, hash)

await minibus.put(cid, data)

const dataOrUndefined = await minibus.get(cid)
if (!dataOrUndefined) throw new Error('not found')
```

## Contributing

Feel free to join in. All welcome. [Open an issue](https://github.com/web3-storage/minibus-client/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/minibus-client/blob/main/LICENSE.md)
