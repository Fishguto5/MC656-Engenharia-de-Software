export interface DatabaseAdapter<TDatabase, TApp, TOptions = void, TRaw = TDatabase> {
  fromDB(raw: TRaw): TApp
  toDB(domain: TApp, options?: TOptions): TDatabase
}
