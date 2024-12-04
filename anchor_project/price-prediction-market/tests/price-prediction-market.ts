import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PricePredictionMarket } from "../target/types/price_prediction_market";
import { assert } from "chai";
import { it } from "mocha";

describe("price-prediction-market", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PricePredictionMarket as Program<PricePredictionMarket>;

  // const COUNTER = "BzTgSg1iKGAqKNrqNFRwETeC7V5DwnDKDodyjuz6qoVL";
  // const owner_account = anchor.web3.Keypair.fromSecretKey(secretKeyArray);
  const owner_prediction_market = anchor.web3.Keypair.generate()
  const first_prediction = anchor.web3.Keypair.generate()
  const alice_account = anchor.web3.Keypair.generate()
  const alice_bet = anchor.web3.Keypair.generate();

  const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
  const endTime = currentTime + 60 * 1; // Add 1 minute (in seconds)

  // console.log("pk is", COUNTER.publicKey.toString());

  it("Initializes Prediction Market", async () => {
    await airdrop(provider.connection, owner_account.publicKey);

    await program.methods
      .initializePredictionMarket()
      .accounts({
        predictionMarket: owner_prediction_market.publicKey,
        signer: owner_account.publicKey
      })
      .signers([owner_prediction_market])
      .rpc({ commitment: "confirmed" });

      const market_data = await program.account.predictionMarket.fetch(owner_prediction_market.publicKey);
      assert.strictEqual(market_data.owner.toString(), owner_account.publicKey.toString());
  });

  it("initializes Prediction", async() => {

    const question = "Will team A win the game?";

      await program.methods
      .createPrediction(question, new anchor.BN(endTime))
      .accounts({
        predictionMarket: owner_prediction_market.publicKey,
        prediction: first_prediction.publicKey,
        signer: owner_account.publicKey
      })
      .signers([first_prediction])
      .rpc({commitment: "confirmed"});

      const market_data = await program.account.prediction.fetch(first_prediction.publicKey);
      assert.strictEqual(market_data.bet.toString(), question);
      assert.strictEqual(market_data.noCount.toNumber(), 0)
      assert.strictEqual(market_data.yesCount.toNumber(), 0)
      assert.strictEqual(market_data.endTimestamp.toNumber(), endTime)
  })

  it("allows user bet on an outcome", async() => {
    await airdrop(provider.connection, alice_account.publicKey);

    const guess = true;
    const amount = new anchor.BN(100);

    await program.methods.placeBet(guess, amount)
    .accounts({
      prediction: first_prediction.publicKey,
      bet: alice_bet.publicKey,
      signer: alice_account.publicKey
    })
    .signers([alice_account, alice_bet])
    .rpc({commitment: "confirmed"})

    const market_data = await program.account.prediction.fetch(first_prediction.publicKey);
    assert.strictEqual(market_data.yesCount.toNumber(), 1)
  })

  it("determines prediction outcome", async () => {

    await advanceTime(provider, 600);

    await program.methods.determineActualOutcome()
    .accounts({
      prediction: first_prediction.publicKey,
      bet: alice_bet.publicKey,
      signer: alice_account.publicKey
    })
    .signers([alice_account])
    .rpc({commitment: "confirmed"})

    const market_data = await program.account.prediction.fetch(first_prediction.publicKey);
    // assert.ok(market_data.actualOutcome.isSome); // Outcome should be set
    assert.equal(market_data.actualOutcome, true);
  })

  it("gets sol price",async () => {
    //tests were not working anymore at this point since i switched to devnet, proceeded to testing on frontend
    const sol_devnet = new anchor.web3.PublicKey("99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR")
    const chainlink_program =new anchor.web3.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny")
    await program.methods.execute()
    .accounts({
      chainlinkFeed: sol_devnet,
      chainlinkProgram: chainlink_program
    })
    .signers([alice_account]) // Sign the transaction with the payer
    .rpc({commitment: "confirmed"});
  })

});

async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}

async function advanceTime(provider, seconds) {
  // Get the current slot
  const currentSlot = await provider.connection.getSlot();

  // Get the current block time
  const currentBlockTime = await provider.connection.getBlockTime(currentSlot);
  if (currentBlockTime === null) {
    throw new Error("Failed to fetch current block time. Ensure the test validator is running.");
  }
}
