export default {
  beforeUpdate() { throw new Error('XP ledger rows are immutable; append a reversal or adjustment entry instead'); },
  beforeDelete() { throw new Error('XP ledger rows are immutable; append a reversal or adjustment entry instead'); },
};
