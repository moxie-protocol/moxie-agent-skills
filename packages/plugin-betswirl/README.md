# BetSwirl Plugin for Moxie

## Overview

The BetSwirl plugin is designed to integrate with the [Moxie Protocol](https://moxie.xyz) to provide betting functionalities of the [BetSwirl](https://www.betswirl.com) platform. This plugin allows **Moxie agents to place bets** on various games and **retrieve bets** information using predefined actions.

## Description

The BetSwirl plugin offers a seamless way to interact with the BetSwirl betting platform through the Moxie Protocol. It includes actions for placing bets on games and retrieving bets information. The plugin ensures that all interactions are validated and processed securely, providing agents with a reliable betting experience.

## Actions

### Coin Toss Action

The `coinTossAction` allows agents to place a bet on a [Coin Toss](https://www.betswirl.com/casino/coin-toss). Agents can specify the amount to bet, the side of the coin (heads or tails), and the token to use for the bet (by default the chain gas token). The action validates the inputs, ensures the bet amount is within the allowed limits, and processes the bet on the BetSwirl platform.

**Example Usage:**

- `Bet 0.01 ETH on heads`
- `Double or nothing 0.5 on heads` will use the chain gas token to wager.

### Roulette Action

The `rouletteAction` allows agents to place a bet on a [Roulette](https://www.betswirl.com/casino/roulette). Agents can specify the amount to bet, the numbers on which to bet (from 0 to 36), and the token to use for the bet (by default the chain gas token). The action validates the inputs, ensures the bet amount is within the allowed limits, and processes the bet on the BetSwirl platform.

**Example Usage:**

- `Bet 0.01 ETH on 7, 8, 32 and 10`

### Dice Action

The `diceAction` allows agents to place a bet on a [Dice](https://www.betswirl.com/casino/dice). Agents can specify the amount to bet, the number on which to bet (from 1 to 99), and the token to use for the bet (by default the chain gas token). The action validates the inputs, ensures the bet amount is within the allowed limits, and processes the bet on the BetSwirl platform.

**Example Usage:**

- `Bet 0.01 ETH on 18`
- `Bet 0.01 ETH above 68`

### Get Bets Action

The `getBetsAction` allows agents to retrieve a list of bets placed, a specific bettor on a particular game could be optionally provided. Users can specify the bettor's address, the game type, and the token address. The action fetches the bet information from the BetSwirl platform and returns a formatted list of bets.

**Example Usage:**
- `Get bets` will show the agent's last bets.
- `Get coin-toss bets of 0x057BcBF736DADD774A8A45A185c1697F4cF7517D` will show the last Coin Toss bets of the provided address.

## Providers

These providers ensure that the list of available games and tokens is always up-to-date and readily available on the actions, improving the user experience by reducing wait times and network load.

### Casino Games Provider

The `casinoGamesProvider` is responsible for fetching and providing the list of available casino games. It utilizes caching to improve performance and reduce the number of network requests.

### Casino Tokens Provider

The `casinoTokensProvider` is responsible for fetching and providing the list of available casino tokens. Similar to the games provider, it uses caching to enhance performance.
