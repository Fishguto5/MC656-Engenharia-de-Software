export interface DatabaseAdapter<TDatabase, TApp, TOptions = void> {
  fromDB(raw: TDatabase): TApp
  toDB(domain: TApp, options?: TOptions): TDatabase
}
