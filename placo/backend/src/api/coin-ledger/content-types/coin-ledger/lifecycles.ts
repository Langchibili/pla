export default {
  beforeUpdate() { throw new Error('Coin ledger rows are immutable; append a compensating reversal entry instead'); },
  beforeDelete() { throw new Error('Coin ledger rows are immutable; append a compensating reversal entry instead'); },
};
