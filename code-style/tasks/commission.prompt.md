Add a "commission" report type to the data processing tool. When the user runs:

```
node dist/main.js sales.csv commission
```

It should generate a JSON commission report with the following structure:

```json
{
  "report": "commission",
  "regionalMultipliers": { "North": 1.1, "South": 1.0, "East": 1.15, "West": 0.95 },
  "salespeople": [
    {
      "name": "Alice",
      "totalCommission": 1234.56,
      "months": {
        "2024-01": {
          "sales": 4700,
          "rate": 0.05,
          "commission": 235,
          "adjustedCommission": 258.5
        }
      },
      "quarterly": {
        "Q1-2024": 1234.56,
        "Q2-2024": 789.01
      }
    }
  ]
}
```

### Commission calculation rules:

1. **Base commission rate**: 5% of total monthly sales per salesperson
2. **Tiered rates** based on the salesperson's total sales for that month:
   - Sales ≤ $10,000: 5% rate
   - Sales > $10,000: 8% rate
   - Sales > $50,000: 12% rate
3. **Regional multiplier**: Applied to the commission based on the region of each sale. Use these fixed multipliers:
   - North: 1.1
   - South: 1.0
   - East: 1.15
   - West: 0.95
4. **adjustedCommission**: The commission after applying the weighted average regional multiplier for that salesperson's sales that month. Calculate by: for each sale, multiply sale amount × rate × regional multiplier, then sum.
5. **Quarterly totals**: Sum of adjustedCommission for months in each quarter (Q1 = Jan-Mar, Q2 = Apr-Jun)
6. **totalCommission**: Sum of all adjustedCommission across all months

The `salespeople` array should include all salespeople found in the data.

After making changes, build the project with `npx tsc` and verify it compiles. Only modify files inside the current working directory.
