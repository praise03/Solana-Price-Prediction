import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, TransactionMessage, TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import { FC, useCallback } from 'react';
import { notify } from "../utils/notifications";
import { useState, useEffect } from 'react';
const dayjs = require('dayjs')

import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3, utils, setProvider } from "@coral-xyz/anchor"
import idl from "./price_prediction_market.json"
import { PricePredictionMarket } from "./price_prediction_market"

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const PROGRAM_ID = new PublicKey(idl.address);
// const predictionMarketPubKey = "4ug1oKrmFybQRGpgPdRczSLTpgeSN9qMRBSgiqVMqLNx";
const predictionMarketPubKey = "8R2AoBCTAapkgGezKh69eBQhW7cSfy6VgG1TwStWu5FG"
const connection = new Connection("https://api.devnet.solana.com");

export const PredictionMarket: FC = () => {
    const { connection } = useConnection();
    const ourWallet = useWallet();


    dayjs().format()
    var relativeTime = require("dayjs/plugin/relativeTime");
    dayjs.extend(relativeTime)

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        setProvider(provider)
        return provider
    }


    const anchProvider = getProvider()
    const program = new Program<PricePredictionMarket>(idl_object, anchProvider)
    const [predictions, setPredictions] = useState([]);
    const [newPredictionTitle, setNewPredictionTitle] = useState('');
    const [newPredictionEndTime, setNewPredictionEndTime] = useState('');
    const [newPredictionSolValue, setNewPredictionSolValue] = useState<number>();

    const createPredictionMarket = async () => {

        try {
            // const predictionMarketKeypair = web3.Keypair.generate();
            const [predictionMarketPDA, bump] = await PublicKey.findProgramAddressSync(
                [Buffer.from("predictionmarket"), anchProvider.wallet.publicKey.toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .initializePredictionMarket()
                .accounts({
                    predictionMarket: predictionMarketPDA,
                    signer: anchProvider.wallet.publicKey
                })
                .rpc();

            console.log("Transaction Signature:", tx);
            console.log("Prediction Market Address:", predictionMarketPDA.toString());



        } catch (error) {
            console.error("Error while getting banks: " + error)
        }
    }

    const ownerCreatePrediction = async () => {
        try {
            const predictionMarket = new PublicKey(predictionMarketPubKey);

            const predictionMarketAccount = await program.account.predictionMarket.fetch(predictionMarket);

            const predictionCount = predictionMarketAccount.predictionCount.toNumber();
            
            const end_time = (new Date().getTime() + (2 * 60 * 1000)) / 1000

            const [predictionPDA, bump] = await PublicKey.findProgramAddressSync(
                [
                    Buffer.from("prediction"), 
                    predictionMarket.toBuffer(),
                    new BN(predictionCount).toArrayLike(Buffer, "le", 8),
                ],
                program.programId
            );

            const tx = await program.methods
                .createPrediction(newPredictionTitle, new BN(end_time), new BN(newPredictionSolValue))
                .accounts({
                    predictionMarket: new PublicKey(predictionMarketPubKey),
                    prediction: predictionPDA,
                    signer: anchProvider.wallet.publicKey
                })
                .rpc();

                await fetchPredictions();

                alert("Prediction Created")
        } catch (error) {
            console.error("Error creating prediction:", error);
        }
    }

    async function fetchPredictions() {
        try {
            // Fetch all prediction accounts
            const predictions = await program.account.prediction.all([
                {
                    memcmp: {
                        offset: 8, // Skip the account discriminator
                        bytes: new PublicKey(predictionMarketPubKey).toBase58(), // Filter by prediction market address
                    },
                },
            ]);

            // const predictions = await program.account.prediction.all()

            console.log("Predictions:", predictions);
            return predictions.map((p) => ({
                publicKey: p.publicKey.toBase58(),
                account: p.account,
            }));
        } catch (error) {
            console.error("Error fetching predictions:", error);
        }
    }

    //helper function to get logs from the solana program (doesnt really work well)
    async function fetchTransactionLogs(txSignature) {
        const txDetails = await connection.getTransaction(txSignature, {
            commitment: "confirmed",
        });
    
        if (txDetails && txDetails.meta && txDetails.meta.logMessages) {
            const logs = txDetails.meta.logMessages || [];
            logs.forEach((log) => {
                if (log.includes("Program log: SOL / USD ") || log.includes("Program log: Bet placed by") ||
                     log.includes("Program log: Yaay") || log.includes("Program log: You Lost")) {
                    console.log("Program Message:", log.replace("Program log: ", ""));
                    const msg = log.replace("Program log: ", "")
                    alert(msg);
                }
            });
            console.log("Transaction Logs:", txDetails.meta.logMessages);
        } else {
            console.error("No logs found for transaction:", txSignature);
        }
    }

    async function placeBet(predictionAddress, outcome: boolean) {
        try {
            console.log(predictionAddress)
            const betKeypair = web3.Keypair.generate();
            const betAmount = new BN(0.1 * web3.LAMPORTS_PER_SOL)

            const [betPDA, bump] = await PublicKey.findProgramAddressSync(
                [Buffer.from("bet"), anchProvider.wallet.publicKey.toBuffer(),
                new PublicKey(predictionAddress).toBuffer()],
                program.programId
            );

            const tx = await program.methods
                .placeBet(outcome)
                .accounts({
                    prediction: predictionAddress,
                    bet: betPDA,
                    signer: anchProvider.wallet.publicKey
                })
                .rpc();

            fetchTransactionLogs(tx);
            await fetchPredictions()
        } catch (error) {
            console.error("Error placing bet:", error);
            throw error;
        }
    }

    async function determineOutcome(predictionAddress) {
        const sol_devnet = new web3.PublicKey("99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR")
        const chainlink_program = new web3.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny")
        try {

            const [betPDA] = await PublicKey.findProgramAddressSync(
                [Buffer.from("bet"), anchProvider.wallet.publicKey.toBuffer(), new PublicKey(predictionAddress).toBuffer()],
                program.programId
            );

            console.log(betPDA.toString())

            const tx = await program.methods
                .determineActualOutcome()
                .accounts({
                    prediction: predictionAddress,
                    bet: betPDA,
                    chainlinkFeed: sol_devnet,
                    chainlinkProgram: chainlink_program,
                    signer: anchProvider.wallet.publicKey
                })
                .rpc();

            console.log("Outcome determined successfully. Transaction Signature:", tx);
            await fetchTransactionLogs(tx)
            alert("Outcome determined successfully!");
        } catch (error) {
            console.error("Error determining outcome:", error);
            alert("Failed to determine outcome. Please try again.");
        }
    }

    async function getPrice() {
        const sol_devnet = new web3.PublicKey("99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR")
        const chainlink_program = new web3.PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny")
        try {
            const tx = await program.methods
                .execute()
                .accounts({
                    chainlinkFeed: sol_devnet,
                    chainlinkProgram: chainlink_program,

                })
                .rpc();

            console.log("Outcome determined successfully. Transaction Signature:", tx);
            fetchTransactionLogs(tx);
            // alert("Outcome determined successfully!");
        } catch (error) {
            console.error("Error determining outcome:", error);
            alert("Failed to determine outcome. Please try again.");
        }
    }


    useEffect(() => {
        async function loadPredictions() {
            const fetchedPredictions = await fetchPredictions();
            setPredictions(fetchedPredictions);
        }
        loadPredictions();
    }, []);

    return (
        <div className="justify-center">
            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={createPredictionMarket}
                >
                    <span className="block group-disabled:hidden" >
                        Get owner
                    </span>
                </button>
            </div>

            <h2 className='font-extrabold text-2xl p-4'>Predictions</h2>
            <div className='p-10 text-center flex flex-row space-x-8'>
               

                {predictions && predictions.map((prediction) => (
                    <div key={prediction.publicKey} className="w-full p-4 max-w-sm backdrop-blur-sm bg-white/20 hover:backdrop-blur-lg rounded-md">

                        <div className="flex flex-col items-center pb-10 w-max">
                            <img className="w-24 h-24 mb-3 rounded-full shadow-lg" src="https://images.unsplash.com/photo-1639843885527-43b098a9661a" alt="Coin image" />
                            <h5 className="mb-1 text-xl font-bold capitalize text-white font-medium  dark:text-white">{prediction.account.bet}</h5>
                            <p className='text-gray-300'>Ends: {dayjs(new Date(prediction.account.endTimestamp * 1000).toLocaleString()).fromNow()}</p>
                            {/* <span className="text-sm text-gray-500 dark:text-gray-400"></span> */}
                            <div className="flex flex-col space-y-4 mt-4 space-x-2 md:mt-6">
                                <button
                                    onClick={() => placeBet(prediction.publicKey, true)}
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-white flex items-center justify-between">
                                    <span className='flex-grow'>Yes</span>
                                    <span className=''>{prediction.account.yesCount.toString()}%</span>
                                </button>
                                <button
                                    onClick={() => placeBet(prediction.publicKey, false)}
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-white">
                                    <span className='flex-grow'>No</span>
                                    <span className=''>{prediction.account.noCount.toString()}%</span>
                                </button>

                                {Date.now() / 1000 > prediction.account.endTimestamp && (
                                    <button
                                        onClick={() => determineOutcome(prediction.publicKey)}
                                        className="group w-60 mt-8 w-1/2 place-self-center btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-white">
                                        <span className='flex-grow'>View Outcome</span>
                                    </button>
                                )}

                            </div>
                        </div>
                    </div>
                ))}

            </div>

            <div className='w-2/4 justify-center place-self-center'>
                <h2 className='text-xl font-bold'>Create Prediction (Admin Only)</h2>
                <div className="flex p-1">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border rounded-e-0 border-gray-300 border-e-0 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                        </svg>
                    </span>
                    <input onChange={(e) => setNewPredictionTitle(e.target.value)}
                    type="text" className="rounded-none rounded-e-lg bg-gray-50 border text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm border-gray-300 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Prediction Title"></input>
                </div>
                <div className="flex p-1">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border rounded-e-0 border-gray-300 border-e-0 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                        </svg>
                    </span>
                    <input onChange={(e) => setNewPredictionEndTime(e.target.value)}
                     type="text"  className="rounded-none rounded-e-lg bg-gray-50 border text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm border-gray-300 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Prediction End Timestamp in Unix e.g 1733187148"></input>
                </div>
                <div className="flex p-1">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border rounded-e-0 border-gray-300 border-e-0 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                        </svg>
                    </span>
                    <input  onChange={(e) => setNewPredictionSolValue(Number(e.target.value))}
                     type="number" className="rounded-none rounded-e-lg bg-gray-50 border text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm border-gray-300 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Sol Value e.g 250"></input>
                </div>
                <button
                    onClick={() => ownerCreatePrediction()}
                    className="group w-60 mt-8 w-1/2 place-self-center btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-white">
                    <span className='flex-grow'>Create Prediction</span>
                </button>
            </div>
            

        </div>
    );
};
