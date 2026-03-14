import { Account } from "../../models/Account";

export interface AccountUseCase {
  createAccount(name: string, email: string): Account;
  getAccount(id: string): Account;
  deposit(id: string, amount: number): Account;
  withdraw(id: string, amount: number): Account;
}
