import { base58btc } from 'multiformats/bases/base58'

export class Minibus {
  /**
   * @param {Object} [options]
   * @param {string|URL} [options.endpoint]
   * @param {Record<string, string>} [options.headers]
   * @param {typeof fetch} [options.fetch]
   */
  constructor ({ endpoint, headers, fetch } = {}) {
    this.endpoint = endpoint || 'https://minibus.web3.storage'
    this.headers = headers || {}
    this.fetch = fetch || globalThis.fetch
  }

  /** @param {import('multiformats').CID} cid */
  async get (cid) {
    const url = new URL(base58btc.encode(cid.multihash.bytes), this.endpoint)
    const res = await this.fetch(url, { headers: this.headers })
    if (res.status === 404) return // not found
    if (!res.ok) {
      throw new Error(`failed to get ${cid}: server responded with status: ${res.status}`)
    }
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

  /** @param {import('multiformats').CID} cid */
  async has (cid) {
    const url = new URL(base58btc.encode(cid.multihash.bytes), this.endpoint)
    const res = await this.fetch(url, {
      method: 'HEAD',
      headers: this.headers
    })
    return res.ok
  }

  /**
   * @param {import('multiformats').CID} cid
   * @param {Uint8Array} data
   */
  async put (cid, data) {
    const url = new URL('/', this.endpoint)
    const res = await this.fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: data
    })
    if (!res.ok) {
      console.log('data:', await res.text())
      throw new Error(`failed to put ${cid}: server responded with status: ${res.status}`)
    }
  }
}
