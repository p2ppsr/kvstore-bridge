const bsv = require('bsv')

const KVSTORE_PROTOCOL_ADDR = '13vGYFqfJsFYaA3mheYgPKuishLG7sYDaE'
const KVSTORE_NUM_FIELDS = 3

const OP_CHECKSIG = 172
const FIELDS_OFFSET = 3

// Verify action is a valid action
function verifyAction(action) {
  if (typeof action === 'undefined') {
    throw new Error('tx is a required parameter!')
  }
  if (typeof action !== 'object') {
    throw new TypeError(`action must be an object, but ${typeof action} was given!`)
  }
  if (!Array.isArray(action.out) || action.out.length < 1) {
    throw new Error('action.out must be an array of transaction outputs!')
  }
  if (!Array.isArray(action.in) || action.in.length < 1) {
    throw new Error('action.in must be an array of transaction inputs!')
  }
}

// Use ECDSA to verify signature
function verifySignature(out) {
  try {
    const contains_char = (string, char) => (string.indexOf(char) > -1)
    let fields = Object.entries(out)
      .filter(([key, _]) => (
        contains_char(key, 'b') &&
        Number(key.slice(1)) >= FIELDS_OFFSET-1 &&
        Number(key.slice(1)) < FIELDS_OFFSET+KVSTORE_NUM_FIELDS-1)
      )
      .map(([_, value]) =>
        (value.op)
          ? Buffer.from((value.op-80).toString(16).padStart(2,'0'), 'hex')
          : Buffer.from(value, 'base64')
      )
    return bsv.crypto.ECDSA.verify(
      bsv.crypto.Hash.sha256(Buffer.concat(fields)),
      bsv.crypto.Signature.fromString(out[`h${FIELDS_OFFSET+KVSTORE_NUM_FIELDS-1}`]),
      bsv.PublicKey.fromString(out.h0)
    )
  } catch(err) {
    return false
  }
}

module.exports = async (state, action) => {
  try {
    console.log(`[+] ${action.tx.h}`)

    // Verify action is a valid action
    verifyAction(action)

    // Delete any token associated with each input
    for (const input of action.in) {
      let tokenToDelete = input.e.h + Number(input.e.i)
        .toString(16).padStart(8, '0')
      await state.delete({
        collection: 'kvstore',
        find: { _id: tokenToDelete }
      })
    }

    // Tokens associated with each output are created
    for (const output of action.out) {
      if (
        !output.b1 ||
        output.b1.op !== OP_CHECKSIG ||
        output.s2 !== KVSTORE_PROTOCOL_ADDR ||
        output[`s${FIELDS_OFFSET+KVSTORE_NUM_FIELDS-1}`] === undefined
      ) {
        continue // Non-KVSTORE outputs are skipped
      }

      // Use ECDSA to verify signature
      const has_valid_signature = verifySignature(output)
      if (!has_valid_signature) {
        console.error(
          `[!] Token in output #${output.i} has an invalid signature`
        )
        continue
      }

      // Build incoming token
      let currentOutpoint = action.tx.h + Number(output.i)
        .toString(16).padStart(8, '0')
      const token = {
        publicKey: output.b0,       // Public Key
        _id:       currentOutpoint, // Current Outpoint, 32-byte TXID + 4 byte Vout

        protectedKey: output.b3, // Encrypted KVStore key
        value:        output.s4, // KVStore value

        signature: output[`b${FIELDS_OFFSET+KVSTORE_NUM_FIELDS-1}`], // A signature from the public key over fields
        token: {
          ...action.envelope,
          lockingScript: new bsv.Transaction(action.envelope.rawTx)
            .outputs[output.i].script.toHex(),
          txid: action.tx.h,
          outputIndex: output.i,
          outputAmount: output.e.v
        }
      }

      await state.create({
        collection: 'kvstore',
        data: token
      })
    }

  } catch (e) {
    console.error(`[!] ${action.tx.h}`)
    console.error(e)
  }
}
