use anchor_lang::prelude::*;
use chainlink_solana as chainlink;

declare_id!("A83FGFK76LfLQTESqJJ1B2FGTU86PbbbxCXS7ibAw7r3");

#[account]
pub struct Decimal {
    pub value: i128,
    pub decimals: u32,
}

impl Decimal {
    pub fn new(value: i128, decimals: u32) -> Self {
        Decimal { value, decimals }
    }

    pub fn to_f64(&self) -> f64 {
        self.value as f64 / 10f64.powi(self.decimals as i32)
    }
}

impl std::fmt::Display for Decimal {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut scaled_val = self.value.to_string();
        if scaled_val.len() <= self.decimals as usize {
            scaled_val.insert_str(
                0,
                &vec!["0"; self.decimals as usize - scaled_val.len()].join(""),
            );
            scaled_val.insert_str(0, "0.");
        } else {
            scaled_val.insert(scaled_val.len() - self.decimals as usize, '.');
        }
        f.write_str(&scaled_val)
    }
}

#[program]
pub mod price_prediction_market {
    use super::*;

    pub fn initialize_prediction_market(ctx: Context<InitializePredictionMarket>) -> Result<()> {
        let prediction_market = &mut ctx.accounts.prediction_market;
        prediction_market.owner = ctx.accounts.signer.key();
        Ok(())
    }

    pub fn create_prediction(
        ctx: Context<CreatePrediction>,
        bet: String,
        end_timestamp: i64,
        sol_value: u64
    ) -> Result<()> {
        let prediction_market = &mut ctx.accounts.prediction_market;

        // Manual ownership check
        require!(
            prediction_market.owner == ctx.accounts.signer.key(),
            CustomError::OnlyOwner
        );

        prediction_market.prediction_count += 1;
        let prediction_id = prediction_market.prediction_count;
    

        let prediction = &mut ctx.accounts.prediction;

        // Set prediction data
        prediction.prediction_market = ctx.accounts.prediction_market.key();
        prediction.owner = ctx.accounts.signer.key();
        prediction.prediction_id = prediction_id;
        prediction.bet = bet;
        prediction.end_timestamp = end_timestamp;
        prediction.yes_count = 0;
        prediction.no_count = 0;
        prediction.sol_value = sol_value;

        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, outcome: bool) -> Result<()> {
        let prediction = &mut ctx.accounts.prediction;
        
        //for now every bet costs 0.1 sol (hardcoded, i don't have much devnet sol to test)
        let amount = 100000000;

        // Ensure prediction is still active
        require!(
            Clock::get()?.unix_timestamp < prediction.end_timestamp,
            CustomError::PredictionEnded
        );

        //transfer sol from user to prediction account
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.signer.key(),
            &prediction.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.signer.to_account_info(),
                prediction.to_account_info(),
            ],
        )?;

        let bet = &mut ctx.accounts.bet;
        bet.user = ctx.accounts.signer.key();
        bet.prediction = prediction.key();
        bet.outcome = outcome; // true = "yes", false = "no"
        bet.amount = amount;
        bet.concluded = false;

        // Update total bets for the chosen outcome
        if outcome {
            prediction.yes_count += 1;
        } else {
            prediction.no_count += 1;
        }

        msg!(
            "Bet placed by {} on '{}' outcome: {} ({} lamports)",
            ctx.accounts.signer.key(),
            prediction.bet,
            if outcome { "yes" } else { "no" },
            amount
        );

        Ok(())
    }

    pub fn determine_actual_outcome(ctx: Context<DetermineActualOutcome>) -> Result<()> {
        let prediction = &mut ctx.accounts.prediction; // Access the shared Prediction account
        let bet = &mut ctx.accounts.bet; // Access the user's Bet account
        let real_time_sol_price;

        let reward = 200000000; // 0.2 sol hardcoded.

        // Validate that the Bet is associated with this Prediction
        require!(
            bet.prediction == prediction.key(),
            CustomError::PredictionBetMismatch
        );

        require!(!bet.concluded, CustomError::BetConcluded);

        // Ensure the end_time has passed (commented out for testing)
        require!(
            Clock::get()?.unix_timestamp > prediction.end_timestamp,
            CustomError::PredictionPending
        );

        // Ensure the outcome has not already been set, then set if it hasn't
        if prediction.actual_outcome.is_none() {
            //for now we set to true by default, for testing on localhost
            // prediction.actual_outcome = Some(true);
            
            //Logic to fetch $SOL price form chainlink, tried using pyth but I couldnt figure it out
            //WIll be upgraded so prediction maker can input any price feed and create predictions
            //for any token
            let round = chainlink::latest_round_data(
                ctx.accounts.chainlink_program.to_account_info(),
                ctx.accounts.chainlink_feed.to_account_info(),
            )?;
    
            let decimals = chainlink::decimals(
                ctx.accounts.chainlink_program.to_account_info(),
                ctx.accounts.chainlink_feed.to_account_info(),
            )?;
            // write the latest price to the program output
            real_time_sol_price = Decimal::new(round.answer, u32::from(decimals));

            let price_to_i64 = real_time_sol_price.to_f64() as u64;

            //For now, it works in a "Is current sol price greater than amount specified in prediction"
            //so predictions should be structured that way
            //i.e Q: Is sol going to exceed $230 by EOD. Sol value should be entered as $230
            //Then after time passes, real time sol value will be fetched and checked if > 230
            //Making outcome true if greater and false if lesser.
            //for BET: Yes==True, No==False
            //I.e if a user votes NO, they do not believe SOL will exceed 230 then if outcome is determined and
            //it evaluates to false. Their bet becomes passes and they get 0.2 sol
            if price_to_i64 > prediction.sol_value{
                prediction.actual_outcome = Some(true);
            }else {
                prediction.actual_outcome = Some(false);
            }
            
            msg!("SOL/USD price is {}", price_to_i64);
        }

        //now to check if user's bet was correct
        let actual_outcome = prediction.actual_outcome.ok_or(CustomError::PredictionPending)?;
        let bet_correct = bet.outcome == actual_outcome;

        if bet_correct {
            msg!("Yaay");
            **ctx.accounts.prediction.to_account_info().try_borrow_mut_lamports()? -= reward;
            **ctx.accounts.signer.to_account_info().try_borrow_mut_lamports()? += reward;
        }else{
            msg!("You lost");
        }

        //prevent double claiming
        bet.concluded = true;


        Ok(())
    }


    //helper function to check if price feed is online for debugging
    pub fn execute(ctx: Context<Execute>) -> Result<()>  {
        let round = chainlink::latest_round_data(
            ctx.accounts.chainlink_program.to_account_info(),
            ctx.accounts.chainlink_feed.to_account_info(),
        )?;

        let description = chainlink::description(
            ctx.accounts.chainlink_program.to_account_info(),
            ctx.accounts.chainlink_feed.to_account_info(),
        )?;

        let decimals = chainlink::decimals(
            ctx.accounts.chainlink_program.to_account_info(),
            ctx.accounts.chainlink_feed.to_account_info(),
        )?;
        
        // write the latest price to the program output
        let decimal_print = Decimal::new(round.answer, u32::from(decimals));

        let price_to_f64 = decimal_print.to_f64() as i64;
        msg!("{} price is {}", description, price_to_f64);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePredictionMarket<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8,
        seeds=[b"predictionmarket", signer.key().as_ref()],
        bump
    )]
    pub prediction_market: Account<'info, PredictionMarket>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct PredictionMarket {
    pub owner: Pubkey,
    pub prediction_count: u64,
}

#[account]
pub struct Prediction {
    pub prediction_market: Pubkey, // Our prediction market
    pub owner: Pubkey,             // Owner of the prediction (market owner by default)
    pub prediction_id: u64,        //unique ID for each prediction
    pub bet: String,               // Prediction
    pub end_timestamp: i64,        // Prediction end time
    pub yes_count: u64,            // Total count for "yes"
    pub no_count: u64,             // Total count for "no"
    pub sol_value: u64,            //sol value to be compared with
    pub actual_outcome: Option<bool>,
}

//seed is derived from out single prediction market and the prediction count which can be likened to ID
#[derive(Accounts)]
pub struct CreatePrediction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub prediction_market: Account<'info, PredictionMarket>,
    #[account(init, payer = signer, space = 8 + 32 + 32 + 8 + 128 + 8 + 8 + 8 + 8 + 1, 
                seeds = [b"prediction", prediction_market.key().as_ref(), &prediction_market.prediction_count.to_le_bytes()], bump)]
    pub prediction: Account<'info, Prediction>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Bet {
    pub user: Pubkey, 
    pub prediction: Pubkey,
    pub outcome: bool,
    pub amount: u64,
    pub concluded: bool,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub prediction: Account<'info, Prediction>,
    #[account(init, payer = signer, space = 8 + 32 + 32 + 1 + 8 + 1, seeds=[b"bet", signer.key().as_ref(), prediction.key().as_ref()],
    bump)] // Example space for bet
    pub bet: Account<'info, Bet>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DetermineActualOutcome<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, // The user calling this function

    #[account(mut)]
    pub prediction: Account<'info, Prediction>, // Shared Prediction account

    #[account(mut)]
    pub bet: Account<'info, Bet>, // User's Bet account

    /// CHECK: We're reading data from this chainlink feed account
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: The Chainlink program library
    pub chainlink_program: AccountInfo<'info>
}

#[derive(Accounts)]
pub struct Execute<'info> {
    /// CHECK: We're reading data from this chainlink feed account
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: This is the Chainlink program library
    pub chainlink_program: AccountInfo<'info>
}

#[error_code]
pub enum CustomError {
    #[msg("OnlyOwner: Only the owner can call this function.")]
    OnlyOwner,
    #[msg("Prediction has ended.")]
    PredictionEnded,
    #[msg("Prediction has not ended.")]
    PredictionPending,
    #[msg("Bet Account Does Not Match Prediction.")]
    PredictionBetMismatch,
    #[msg("Bet has been concluded")]
    BetConcluded,
}
