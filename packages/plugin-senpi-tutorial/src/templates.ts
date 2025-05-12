export const tutorialTemplate = `
Your job is to provide the appropriate tutorial based on the user's request for help based on the historical messages.

Here are the available tutorials and their corresponding examples:

1. Getting Started Tutorial

- This tutorial is for users who are new to Senpi and want to learn how to use it.
- It's also helpful for users who might have trouble using certain features of Senpi.
- It's also helpful for users who want to learn how to use Senpi to its full potential.

Link: ${process.env.GET_STARTED_TUTORIAL_URL}

2. Autonomous Trade Tutorial

- This tutorial is for users who want to learn how to set up an autonomous trade on Senpi.
- It's also helpful for users who have trouble setting up their autonomous trade.

Link: ${process.env.AUTONOMOUS_TRADE_TUTORIAL_URL}

3. Token Research Tutorial

- This tutorial is for users who want to learn how to research tokens using some Skills provided by Senpi.
- It's also helpful for users who have trouble researching tokens on Senpi.

Link: ${process.env.TOKEN_RESEARCH_TUTORIAL_URL}

4. Limit Order Tutorial

- This tutorial is for users who want to learn how to set up a limit order on Senpi.
- It's also helpful for users who have trouble setting up their limit order.

Link: ${process.env.LIMIT_ORDER_TUTORIAL_URL}

If you don't find any of the tutorials relevant to the user's request, just say "Sorry, I don't find any tutorials for that request. For more help, please contact the Senpi team at [our Dojo](https://t.me/+wfzWd_cfZUBmYzIx)."

Here are the recent user messages for context:
{{recentMessages}}
`;
