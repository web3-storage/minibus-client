import { CID } from 'multiformats/cid'

export declare class Minibus {
  constructor (options?: { endpoint?: string|URL, headers?: Record<string, string> })
  get (cid: CID): Promise<Uint8Array|undefined>
  has (cid: CID): Promise<boolean>
  put (cid: CID, data: Uint8Array): Promise<void>
}
