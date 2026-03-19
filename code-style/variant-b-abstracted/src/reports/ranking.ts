import { Row } from "../csv";
import { groupBy, sumGroups, topN } from "../aggregations";

export function generateRankingReport(rows: Row[]): object {
  const topProducts = topN(
    sumGroups(groupBy(rows, (r) => r["product"]), "amount"),
    5
  );

  const topRegions = topN(
    sumGroups(groupBy(rows, (r) => r["region"]), "amount"),
    5
  );

  const topSalespeople = topN(
    sumGroups(groupBy(rows, (r) => r["salesperson"]), "amount"),
    5
  );

  return {
    report: "ranking",
    topProducts,
    topRegions,
    topSalespeople,
  };
}
