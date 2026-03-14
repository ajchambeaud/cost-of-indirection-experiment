export interface DailyTransferRepository {
  getDailyTotal(accountId: string, date: string): number;
  addToDaily(accountId: string, date: string, amount: number): void;
}
