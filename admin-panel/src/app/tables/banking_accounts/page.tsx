import { redirect } from "next/navigation";

export default function BankingOldRedirect() {
  redirect("/tables/bank_accounts_new");
}
