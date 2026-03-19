import { Row } from "../csv";
import { groupBy, sumBy, sumGroups } from "../aggregations";

export function generateRevenueReport(rows: Row[]): object {
  const totalRevenue = sumBy(rows, "amount");

  const byRegion = sumGroups(groupBy(rows, (r) => r["region"]), "amount");
  const byCategory = sumGroups(groupBy(rows, (r) => r["category"]), "amount");
  const byMonth = sumGroups(groupBy(rows, (r) => r["date"].substring(0, 7)), "amount");

  return {
    report: "revenue",
    totalRevenue,
    byRegion,
    byCategory,
    byMonth,
  };
}
