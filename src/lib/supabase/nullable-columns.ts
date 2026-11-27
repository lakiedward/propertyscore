export type NullableColumns<Row, Column extends keyof Row> = Omit<Row, Column> & {
  [Key in Column]: Row[Key] | null;
};
