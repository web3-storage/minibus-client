import test from 'ava'
import http from 'http'
import { fromString, toString, concat, equals } from 'uint8arrays'
import { sha256 } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import fetch from '@web-std/fetch'
import { Minibus } from './index.js'

test.beforeEach(async t => {
  /** @type {http.RequestListener} */
  let handler

  const server = http.createServer((req, res) => {
    if (!handler) {
      res.statusCode = 500
      res.write('missing handler')
      return res.end()
    }
    return handler(req, res)
  })
  const address = await new Promise(resolve => {
    server.listen(null, () => resolve(server.address()))
  })

  t.context.setHandler = h => { handler = h }
  t.context.server = server
  t.context.endpoint = `http://127.0.0.1:${address.port}`
})

test.afterEach(t => t.context.server.close())

test('should put a block', async t => {
  const data = fromString(`TEST DATA ${Date.now()}`)
  const hash = await sha256.digest(data)
  const cid = CID.create(1, raw.code, hash)

  /** @type {string} */
  let reqUrl
  /** @type {string} */
  let reqMethod
  /** @type {Uint8Array} */
  let reqData

  t.context.setHandler(/** @type {http.RequestListener} */ async (req, res) => {
    reqUrl = req.url
    reqMethod = req.method
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    reqData = concat(chunks)
    res.end()
  })

  const client = new Minibus({ endpoint: t.context.endpoint, fetch })

  await t.notThrowsAsync(() => client.put(cid, data))

  t.truthy(reqUrl)
  t.is(reqUrl, '/')
  t.is(reqMethod, 'POST')
  t.truthy(reqData)
  t.is(toString(reqData), toString(data))
})

test('should get a block', async t => {
  const data = fromString(`TEST DATA ${Date.now()}`)
  const hash = await sha256.digest(data)
  const cid = CID.create(1, raw.code, hash)

  t.context.setHandler(/** @type {http.RequestListener} */ async (req, res) => {
    if (equals(CID.parse(req.url.slice(1)).multihash, cid.multihash)) {
      res.write(data)
      return res.end()
    }
    res.statusCode = 404
    res.end()
  })

  const client = new Minibus({ endpoint: t.context.endpoint, fetch })

  const result = await client.get(cid)
  t.truthy(result)
  t.true(equals(result, data))
})

test('should return undefined when block not found', async t => {
  t.context.setHandler(/** @type {http.RequestListener} */ async (req, res) => {
    res.statusCode = 404
    res.end()
  })
  const client = new Minibus({ endpoint: t.context.endpoint, fetch })
  const cid = CID.parse('bafybeiaavppux4mtydrzqvsptp573atks3qj26bnhx7mcne4wbvvze43b4')
  const result = await client.get(cid)
  t.is(result, undefined)
})
