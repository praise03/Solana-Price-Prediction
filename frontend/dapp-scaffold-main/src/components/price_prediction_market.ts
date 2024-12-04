/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/price_prediction_market.json`.
 */
export type PricePredictionMarket = {
  "address": "A83FGFK76LfLQTESqJJ1B2FGTU86PbbbxCXS7ibAw7r3",
  "metadata": {
    "name": "pricePredictionMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createPrediction",
      "discriminator": [
        186,
        30,
        192,
        149,
        194,
        124,
        119,
        37
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "predictionMarket",
          "writable": true
        },
        {
          "name": "prediction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  101,
                  100,
                  105,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "predictionMarket"
              },
              {
                "kind": "account",
                "path": "prediction_market.prediction_count",
                "account": "predictionMarket"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bet",
          "type": "string"
        },
        {
          "name": "endTimestamp",
          "type": "i64"
        },
        {
          "name": "solValue",
          "type": "u64"
        }
      ]
    },
    {
      "name": "determineActualOutcome",
      "discriminator": [
        64,
        169,
        230,
        124,
        115,
        230,
        212,
        151
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "chainlinkFeed"
        },
        {
          "name": "chainlinkProgram"
        }
      ],
      "args": []
    },
    {
      "name": "execute",
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "chainlinkFeed"
        },
        {
          "name": "chainlinkProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initializePredictionMarket",
      "discriminator": [
        248,
        70,
        198,
        224,
        224,
        105,
        125,
        195
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "predictionMarket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  101,
                  100,
                  105,
                  99,
                  116,
                  105,
                  111,
                  110,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeBet",
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "prediction"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bet",
      "discriminator": [
        147,
        23,
        35,
        59,
        15,
        75,
        155,
        32
      ]
    },
    {
      "name": "prediction",
      "discriminator": [
        98,
        127,
        141,
        187,
        218,
        33,
        8,
        14
      ]
    },
    {
      "name": "predictionMarket",
      "discriminator": [
        117,
        150,
        97,
        152,
        119,
        58,
        51,
        58
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "onlyOwner",
      "msg": "OnlyOwner: Only the owner can call this function."
    },
    {
      "code": 6001,
      "name": "predictionEnded",
      "msg": "Prediction has ended."
    },
    {
      "code": 6002,
      "name": "predictionPending",
      "msg": "Prediction has not ended."
    },
    {
      "code": 6003,
      "name": "predictionBetMismatch",
      "msg": "Bet Account Does Not Match Prediction."
    },
    {
      "code": 6004,
      "name": "betConcluded",
      "msg": "Bet has been concluded"
    }
  ],
  "types": [
    {
      "name": "bet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "prediction",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "concluded",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "prediction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "predictionMarket",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "predictionId",
            "type": "u64"
          },
          {
            "name": "bet",
            "type": "string"
          },
          {
            "name": "endTimestamp",
            "type": "i64"
          },
          {
            "name": "yesCount",
            "type": "u64"
          },
          {
            "name": "noCount",
            "type": "u64"
          },
          {
            "name": "solValue",
            "type": "u64"
          },
          {
            "name": "actualOutcome",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "predictionMarket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "predictionCount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
