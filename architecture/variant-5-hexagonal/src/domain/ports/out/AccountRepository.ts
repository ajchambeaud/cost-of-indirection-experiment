import { Account } from "../../models/Account";

export interface AccountRepository {
  create(name: string, email: string): Account;
  findById(id: string): Account | undefined;
  findByEmail(email: string): Account | undefined;
  updateBalance(id: string, newBalance: number): void;
  incrementBalance(id: string, amount: number): void;
  decrementBalance(id: string, amount: number): void;
}
