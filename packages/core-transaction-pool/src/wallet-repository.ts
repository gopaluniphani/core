import { app, Contracts, Container } from "@arkecosystem/core-kernel";
import { Wallets } from "@arkecosystem/core-state";
import { Handlers } from "@arkecosystem/core-transactions";
import { Identities, Interfaces } from "@arkecosystem/crypto";
import clonedeep from "lodash.clonedeep";

// todo: review the implementation
export class WalletRepository extends Wallets.WalletRepository {
    public constructor() {
        super();

        const databaseWalletRepository: Contracts.State.WalletRepository = app.get<any>(
            Container.Identifiers.DatabaseService,
        ).walletRepository;
        const indexes: string[] = databaseWalletRepository.getIndexNames();
        for (const index of indexes) {
            if (this.indexes[index]) {
                continue;
            }

            this.registerIndex(index, databaseWalletRepository.getIndex(index).indexer);
        }
    }

    public findByAddress(address: string): Contracts.State.Wallet {
        if (address && !this.hasByAddress(address)) {
            this.reindex(
                clonedeep(app.get<any>(Container.Identifiers.DatabaseService).walletRepository.findByAddress(address)),
            );
        }

        return this.findByIndex(Contracts.State.WalletIndexes.Addresses, address);
    }

    public forget(publicKey: string): void {
        this.forgetByPublicKey(publicKey);
        this.forgetByAddress(Identities.Address.fromPublicKey(publicKey));
    }

    public async throwIfCannotBeApplied(transaction: Interfaces.ITransaction): Promise<void> {
        const sender: Contracts.State.Wallet = this.findByPublicKey(transaction.data.senderPublicKey);
        const handler: Handlers.TransactionHandler = await app
            .get<any>("transactionHandlerRegistry")
            .get(transaction.type, transaction.typeGroup);
        return handler.throwIfCannotBeApplied(
            transaction,
            sender,
            app.get<any>(Container.Identifiers.DatabaseService).walletRepository,
        );
    }

    public async revertTransactionForSender(transaction: Interfaces.ITransaction): Promise<void> {
        const handler: Handlers.TransactionHandler = await app
            .get<any>("transactionHandlerRegistry")
            .get(transaction.type, transaction.typeGroup);
        return handler.revertForSender(transaction, this);
    }
}
