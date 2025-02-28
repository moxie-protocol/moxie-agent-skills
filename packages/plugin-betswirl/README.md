# BetSwirl Plugin for Moxie

## Overview

The BetSwirl plugin is designed to integrate with the [Moxie Protocol](https://moxie.xyz) to provide betting functionalities of the [BetSwirl](https://www.betswirl.com) platform. This plugin allows **Moxie agents to place bets** on various games and **retrieve bets** information using predefined actions.

## Description

The BetSwirl plugin offers a seamless way to interact with the BetSwirl betting platform through the Moxie Protocol. It includes actions for placing bets on games and retrieving bets information. The plugin ensures that all interactions are validated and processed securely, providing agents with a reliable betting experience.

## Actions

### Coin Toss Action

The `coinTossAction` allows agents to place a bet on a Coin Toss. Agents can specify the amount to bet, the side of the coin (heads or tails), and the token to use for the bet (by default the chain gas token). The action validates the inputs, ensures the bet amount is within the allowed limits, and processes the bet on the BetSwirl platform.

**Example Usage:**

- `Bet 0.01 ETH on heads`
- `Double or nothing 0.5 on heads` will use the chain gas token to wager.

### Get Bets Action

The `getBetsAction` allows agents to retrieve a list of bets placed, a specific bettor on a particular game could be optionally provided. Users can specify the bettor's address, the game type, and the token address. The action fetches the bet information from the BetSwirl platform and returns a formatted list of bets.

**Example Usage:**
- `Get bets` will show the agent's last bets.
- `Get coin-toss bets of 0x057BcBF736DADD774A8A45A185c1697F4cF7517D` will show the last Coin Toss bets of the provided address.
