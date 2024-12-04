[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/wFAkMYEB)
![School of Solana](https://github.com/Ackee-Blockchain/school-of-solana/blob/master/.banner/banner.png?raw=true)


# **Prediction Market on Solana**

## **Overview**
The **Prediction Market** is a decentralized application (dApp) built on the Solana blockchain, enabling users to create and participate in predictions on various outcomes. Users can place bets on "Yes" or "No" outcomes using **SOL**, and rewards are distributed to winners based on the final result.

The current version supports placing bets based on **$SOL price predictions**.

This project uses **Chainlink price feeds** to fetch the real-time price of Solana's native token ($SOL). Predictions can be made on the price at a future time.

---

## **Live Demo**
🚀 **[View the Live Demo](https://solana-price-prediction.vercel.app/)**

Note: The Demo contains a Prediction Market Initialized by me so no one else can really test it out fully.
To create a new Prediction Market, simply enable the **Create Prediction Market** button then execute it,
it should console log the created market's account. Then add the address to **PredictionMarket.tsx L-17**.
Now you can use the Create Prediction section to create new predictions that users can interact with. ( We're working on better UX :) ).

```bash
   // replace this part with your newly created Prediction Market Address
   const predictionMarketPubKey = "xxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## **Features**
- **Create Prediction**  
   Allows the owner of the prediction market to create unique predictions with customizable questions, end times, and SOL stakes.

- **Place Bet**  
   Users can bet SOL on either "Yes" or "No" outcomes for an active prediction.

- **View Predictions**  
   Displays a list of active and completed predictions, including their outcomes.

- **Determine Outcome and Reward Distribution**  
   Rewards are distributed to winners based on the correctness of their bet.

---

## **Instructions to Build and Test Locally**

### **Setup**
#### **Requirements**
- **Rust**: [Install Rust](https://www.rust-lang.org/tools/install)  
  Make sure to use the stable version:
  ```bash
  rustup default stable
  ```

- **Solana**: [Install Solana](https://docs.solana.com/cli/install-solana-cli-tools)
    - Use v1.18.18
    - After you have Solana-CLI installed, you can switch between versions using:
    ```bash
    solana-install init 1.18.18
    ```

- **Anchor**: [Install Anchor](https://www.anchor-lang.com/docs/installation)
    - Use v0.30.1
    - After you have Anchor installed, you can switch between versions using:
    ```bash
    avm use 0.30.1
    ```

- **Yarn**: [Install Yarn](https://classic.yarnpkg.com/lang/en/docs/cli/link/)

---

## For the Anchor Project


```bash
cd anchor_project
cd price-prediction-market
anchor build
anchor deploy

// Make sure your Cargo.toml is configured to Devnet
```

---
## For the Frontend

```bash
cd frontend
cd dapp-scaffold-main
yarn install
yarn dev

// you should have a localhost server started at this point
```

## Usage
### 1. Deploy the Prediction Market
- After deploying the program, initialize a PredictionMarket by calling the initializePredictionMarket function.

### 2. Create Predictions
- Fill out the Create Prediction form with valid parameters and click Create Prediction.
- After receiving a success message, your prediction will be automatically fetched and displayed. If not, refresh the page to view it.
### 3. Place Bets
- Choose an active prediction and place your bets with a hardcoded deposit of 0.1 SOL for either "Yes" or "No".
### 4. Determine Outcomes
- Once the prediction ends, a View Outcome button will appear.
- Click the button to determine if your bet was correct.
  - Correct Bet: You receive a reward of 0.2 SOL.
  - Incorrect Bet: You’ll see a "You Lost" message.

---
## License
### **This project is open-source and available under the MIT License.**














