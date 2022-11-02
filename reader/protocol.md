# KVStore Protocol
The KVStore provides an un-permissioned key-value storage and retrieval system that interfaces with your Babbage identity.

## Blockchain Data Protocol

PUSHDATA | Field
---------|---------------------------------
0        | `<pubkey>`
1        | `OP_CHECKSIG`
2        | Bitcom Protocol Namespace Address (\`13vGYFqfJsFYaA3mheYgPKuishLG7sYDaE\`)
3        | Encrypted KVStore key
4        | KVStore value
5        | A signature from the field 0 public key over fields 2-15
...      | `OP_DROP` / `OP_2DROP` — Drop fields 2-5 from the stack.
