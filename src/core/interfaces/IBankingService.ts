import { BankingLoginResponse, SoldeDTO, AccountNumber, TransferRequest, TransferResponse, AccountValidationResponse } from '../../types';

/**
 * Interface pour le service bancaire
 * Définit le contrat pour toutes les opérations bancaires
 */
export interface IBankingService {
  /**
   * Authentifier un utilisateur avec son PIN
   */
  loginWithPin(phoneNumber: string, pin: string): Promise<BankingLoginResponse>;

  /**
   * Obtenir le solde d'un compte
   */
  getAccountBalance(accountNumber: string): Promise<SoldeDTO>;

  /**
   * Obtenir les informations d'un compte
   */
  getAccountInfo(accountNumber: string): Promise<any>;

  /**
   * Obtenir l'historique d'un compte
   */
  getAccountHistory(accountNumber: string, numberOfTransactions?: number): Promise<any>;

  /**
   * Formater les comptes pour l'affichage
   */
  formatAccountsForWhatsApp(accounts: AccountNumber[]): string;

  /**
   * Formater le solde pour l'affichage
   */
  formatBalanceForWhatsApp(balance: SoldeDTO, accountNumber: string): string;

  /**
   * Créer un message de sélection de compte
   */
  createAccountSelectionMessage(accounts: AccountNumber[], action: string): any;

  /**
   * Valider l'existence d'un compte bénéficiaire
   */
  validateReceiverAccount(accountNumber: string): Promise<AccountValidationResponse>;

  /**
   * Effectuer un transfert intra-bancaire
   */
  doTransfer(transferRequest: TransferRequest): Promise<TransferResponse>;
}