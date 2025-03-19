export const MOXIE_USER_PORTFOLIOS_QUERY = (filterConditions: string[]) => `
      query GetPortfolioInfo {
        MoxieUserPortfolios(
          input: {filter: {${filterConditions.join(", ")}}}
        ) {
          MoxieUserPortfolio {
            fanTokenSymbol
            fanTokenName
            fanTokenAddress
            totalLockedAmount
            totalUnlockedAmount
            totalTvl
            walletAddresses
            currentPrice
            lockedTvl
            unlockedTvl
          }
        }
      }
    `;